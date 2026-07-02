import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, ScrollView, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getSessions, deleteSession } from '../utils/storage';
import { readBackupMeta, daysSince } from '../utils/backupMeta';
import { getMileageState, totalMiles, totalDeduction, entriesForYear } from '../utils/mileage';
import { deductionTotals, EFFECTIVE_RATE } from '../utils/deductions';
import { getSettings } from '../utils/settings';
import { fmtCents } from '../utils/money';
import { colors } from '../theme';
import brand from '../brand';
import BrandLogo from '../components/BrandLogo';
import { t } from '../i18n';

// Pick the freshness phrase. Returns { label, stale } so the link can
// shift color when the backup is more than two weeks old.
function backupFreshness(lastBackupAt) {
  var d = daysSince(lastBackupAt);
  if (d === null) return { label: t('home.backupNever'), stale: true };
  if (d === 0) return { label: t('home.backupToday'),    stale: false };
  if (d === 1) return { label: t('home.backupYesterday'), stale: false };
  if (d >= 14) return { label: t('home.backupStale', { days: d }), stale: true };
  return { label: t('home.backupDaysAgo', { days: d }), stale: false };
}

export default function HomeScreen({ navigation }) {
  var [sessions, setSessions] = useState([]);
  var [editing, setEditing] = useState(false);
  var [backupMeta, setBackupMeta] = useState({ lastBackupAt: null });
  var [mileageSummary, setMileageSummary] = useState({ miles: 0, deduction: 0, count: 0 });
  // Effective rate for the counter's savings estimate — user-adjustable
  // in Settings (brief B3). Defaults to EFFECTIVE_RATE until loaded.
  var [effectiveRate, setEffectiveRate] = useState(EFFECTIVE_RATE);

  useFocusEffect(useCallback(function() {
    getSessions().then(setSessions);
    readBackupMeta().then(setBackupMeta);
    getSettings().then(function(cfg) { setEffectiveRate(cfg.effectiveRate); });
    // Load the current year's mileage summary so the Home pill can
    // show a live "120 mi · $84.00" hint instead of just a label.
    (async function() {
      try {
        var st = await getMileageState();
        var thisYear = new Date().getFullYear();
        var yearEntries = entriesForYear(st.entries, thisYear);
        setMileageSummary({
          miles: totalMiles(yearEntries),
          deduction: totalDeduction(yearEntries, st.ratePerMile),
          count: yearEntries.length,
        });
      } catch (e) { /* non-fatal */ }
    })();
    setEditing(false);
  }, []));

  var freshness = backupFreshness(backupMeta.lastBackupAt);

  // Brief 06 — the "deducciones potenciales" hero number. Derived from
  // the sessions already loaded; no extra storage read. Hidden entirely
  // when there's nothing marked negocio yet (a $0 hero reads as broken).
  var deductions = deductionTotals(sessions, effectiveRate);
  var showCounter = deductions.deductionsCents > 0;

  var showCounterDetail = function() {
    Alert.alert(
      t('counter.detailTitle'),
      t('counter.disclaimer', {
        deductions: fmtCents(deductions.deductionsCents),
        savings: fmtCents(deductions.estimatedSavingsCents),
        rate: Math.round(effectiveRate * 100),
      }),
      [{ text: t('common.done') }]
    );
  };

  // Format a money number consistently with the rest of Home.
  var fmtMoney = function(n) { return '$' + Number(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ','); };
  var fmtMiles = function(n) { return n === Math.floor(n) ? String(n) : n.toFixed(1); };

  var confirmDelete = function(session) {
    Alert.alert(
      t('home.deleteTitle'),
      t('home.deleteBody', { name: session.name, count: session.totalCount }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.delete'), style: 'destructive', onPress: function() {
          deleteSession(session.id).then(function(updated) {
            setSessions(updated);
            if (updated.length === 0) setEditing(false);
          });
        }},
      ]
    );
  };

  var clearAll = function() {
    Alert.alert(
      t('home.clearTitle'),
      t('home.clearBody', { count: sessions.length }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('home.clearConfirm'), style: 'destructive', onPress: function() {
          Promise.all(sessions.map(function(s) { return deleteSession(s.id); })).then(function() {
            setSessions([]);
            setEditing(false);
          });
        }},
      ]
    );
  };

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />

      {/* Settings — the home for adjustable rate + info/links (brief B3).
          Kept as a quiet top-right affordance so it doesn't compete with
          the hero. */}
      <TouchableOpacity style={s.settingsBtn} onPress={function() { navigation.navigate('Settings'); }} activeOpacity={0.7}>
        <Text style={s.settingsBtnTxt}>{t('home.settingsLink')}</Text>
      </TouchableOpacity>

      {/* Logo */}
      <View style={s.header}>
        <BrandLogo size={56} style={s.logoRow} />
        <Text style={[s.brand, { fontWeight: '700' }]}>{brand.displayName}</Text>
        {brand.subBrand ? <Text style={s.subBrand}>{brand.subBrand}</Text> : null}
        <Text style={s.tagline}>{brand.tagline}</Text>
      </View>

      {/* Privacy badge */}
      <View style={s.privacyBadge}>
        <Text style={s.privacyText}>{t('home.privacy')}</Text>
      </View>

      {/* Brief 06 — deducciones potenciales counter. The hero number:
          the big total does the emotional work, the subtitle keeps it
          honest. Tap for the math + the "no es asesoría fiscal" line. */}
      {showCounter && (
        <TouchableOpacity style={s.counterCard} onPress={showCounterDetail} activeOpacity={0.85}>
          <Text style={s.counterHeadline}>
            {t('counter.headline', { amount: fmtCents(deductions.deductionsCents) })}
          </Text>
          <Text style={s.counterSubtitle}>
            {t('counter.subtitle', { amount: fmtCents(deductions.estimatedSavingsCents) })}
          </Text>
        </TouchableOpacity>
      )}

      {/* Secondary affordances — backup + mileage. Both are
          per-creator-tax-prep tools that don't belong inside the
          import flow but should be one tap from Home. Side-by-side
          pills so they don't dominate the layout. */}
      <View style={s.secondaryRow}>
        <TouchableOpacity style={s.secondaryPill} onPress={function() { navigation.navigate('Mileage'); }}>
          <Text style={s.secondaryPillTitle}>{t('home.mileageLink')}</Text>
          <Text style={s.secondaryPillSub}>
            {mileageSummary.count === 0
              ? t('home.mileageEmpty')
              : t('home.mileageMiles', { miles: fmtMiles(mileageSummary.miles), deduction: fmtMoney(mileageSummary.deduction) })}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.secondaryPill} onPress={function() { navigation.navigate('Backup'); }}>
          <Text style={s.secondaryPillTitle}>{t('home.backupLink')}</Text>
          <Text style={[s.secondaryPillSub, freshness.stale && s.secondaryPillSubStale]}>{freshness.label}</Text>
        </TouchableOpacity>
      </View>

      {/* CTA */}
      <TouchableOpacity style={s.cta} onPress={function() { navigation.navigate('Import'); }}>
        <Text style={s.ctaTitle}>{t('home.uploadCta')}</Text>
        <Text style={s.ctaSub}>{t('home.uploadSub')}</Text>
      </TouchableOpacity>

      {/* Sessions */}
      {sessions.length > 0 && (
        <View style={{ flex: 1, width: '100%', marginTop: 20 }}>
          <View style={s.sectionRow}>
            <Text style={s.sectionLabel}>{t('home.recentLabel')}</Text>
            <TouchableOpacity onPress={function() { setEditing(!editing); }}>
              <Text style={s.editBtn}>{editing ? t('common.done') : t('home.edit')}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {sessions.map(function(item) {
              return (
                <View key={item.id} style={s.sessionCard}>
                  {editing && (
                    <TouchableOpacity style={s.deleteCircle} onPress={function() { confirmDelete(item); }}>
                      <Text style={s.deleteIcon}>−</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}
                    onPress={function() { if (!editing) navigation.navigate('Review', { sessionId: item.id }); }}
                    activeOpacity={editing ? 1 : 0.7}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={s.sessionName}>{item.name}</Text>
                      <Text style={s.sessionMeta}>
                        {t('home.txnCount', { count: item.totalCount })}{item.excludedCount > 0 ? t('home.excludedSuffix', { count: item.excludedCount }) : ''}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 10, fontWeight: '600', color: item.status === 'done' ? colors.income : colors.warning }}>
                      {item.status === 'done' ? t('home.statusDone') : t('home.statusInProgress')}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}
            {editing && (
              <TouchableOpacity style={s.clearAllBtn} onPress={clearAll}>
                <Text style={s.clearAllTxt}>{t('home.clearTitle')}</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      )}

      {sessions.length === 0 && (
        <View style={s.empty}>
          <Text style={s.howLabel}>{t('home.howLabel')}</Text>
          {[1, 2, 3].map(function(n) {
            return (
              <View key={n} style={s.stepRow}>
                <View style={s.stepNum}>
                  <Text style={s.stepNumTxt}>{n}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.stepTitle}>{t('home.step' + n + 'Title')}</Text>
                  <Text style={s.stepSub}>{t('home.step' + n + 'Sub')}</Text>
                </View>
              </View>
            );
          })}
          <Text style={s.emptyText}>{t('home.emptyBody')}</Text>
        </View>
      )}
    </View>
  );
}

var s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.heroBg, paddingHorizontal: 20, paddingTop: 64, alignItems: 'center' },
  settingsBtn: { position: 'absolute', top: 52, right: 18, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, backgroundColor: colors.heroChip, zIndex: 10 },
  settingsBtnTxt: { fontSize: 11, color: colors.heroTextMuted, fontWeight: '600', letterSpacing: 0.3 },
  header: { alignItems: 'center', marginBottom: 18 },
  logoRow: { marginBottom: 14 },
  brand: { fontSize: 34, color: colors.heroText, letterSpacing: -0.8 },
  subBrand: { fontSize: 13, color: colors.heroTextMuted, marginTop: 2, letterSpacing: 0.3, fontStyle: 'italic' },
  tagline: { fontSize: 11, color: colors.heroTextLabel, marginTop: 8, letterSpacing: 2 },
  privacyBadge: { backgroundColor: colors.heroChip, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, marginBottom: 16 },
  privacyText: { fontSize: 11, color: colors.heroTextFaint },
  // Saffron/gold brand tokens — gold means negocio (the counter is money
  // the app found by marking things business). Deliberately NOT the
  // income family; this is a hero, not a ledger row.
  counterCard: { width: '100%', backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.accent, borderRadius: 14, paddingVertical: 16, paddingHorizontal: 16, marginBottom: 16, alignItems: 'center' },
  // Headline is incomeStrong (deep gold-brown) — saffron accent fails
  // contrast as text on the card (2.33:1). The saffron stays on the
  // border so the brand accent still reads. Both are gold-family.
  counterHeadline: { fontSize: 22, fontWeight: '700', color: colors.incomeStrong, textAlign: 'center', letterSpacing: -0.4 },
  counterSubtitle: { fontSize: 12, color: colors.heroTextMuted, marginTop: 4, textAlign: 'center' },
  secondaryRow: { flexDirection: 'row', marginBottom: 16, width: '100%', paddingHorizontal: 4 },
  secondaryPill: { flex: 1, backgroundColor: colors.heroChip, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 10, marginHorizontal: 4, alignItems: 'center' },
  secondaryPillTitle: { fontSize: 10, color: colors.heroTextLabel, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  secondaryPillSub: { fontSize: 10, color: colors.heroTextDim, marginTop: 2 },
  secondaryPillSubStale: { color: colors.warning, fontWeight: '700' },
  cta: { backgroundColor: colors.accent, borderRadius: 12, padding: 18, alignItems: 'center', width: '100%' },
  ctaTitle: { fontSize: 16, fontWeight: '600', color: colors.accentText },
  ctaSub: { fontSize: 11, color: colors.heroCtaSub, marginTop: 4 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sectionLabel: { fontSize: 10, color: colors.heroTextLabel, letterSpacing: 1, textTransform: 'uppercase' },
  editBtn: { fontSize: 13, color: colors.accent, fontWeight: '500' },
  sessionCard: { backgroundColor: colors.heroChip, borderRadius: 10, padding: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center' },
  deleteCircle: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  deleteIcon: { color: colors.dangerText, fontSize: 16, fontWeight: '700', marginTop: -1 },
  sessionName: { fontSize: 13, fontWeight: '500', color: colors.heroText },
  sessionMeta: { fontSize: 10, color: colors.heroTextFaint, marginTop: 2 },
  clearAllBtn: { borderWidth: 1.5, borderColor: colors.danger, borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 8, marginBottom: 20 },
  clearAllTxt: { fontSize: 14, fontWeight: '600', color: colors.danger },
  empty: { flex: 1, width: '100%', justifyContent: 'center', paddingHorizontal: 4, paddingBottom: 24 },
  howLabel: { fontSize: 10, color: colors.heroTextLabel, letterSpacing: 1.5, textTransform: 'uppercase', textAlign: 'center', marginBottom: 16 },
  stepRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.heroChip, borderRadius: 12, padding: 14, marginBottom: 10 },
  stepNum: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  stepNumTxt: { fontSize: 13, fontWeight: '700', color: colors.accentText },
  stepTitle: { fontSize: 14, fontWeight: '600', color: colors.heroText },
  stepSub: { fontSize: 11, color: colors.heroTextDim, marginTop: 2 },
  emptyText: { fontSize: 12, color: colors.heroTextDim, textAlign: 'center', marginTop: 14, lineHeight: 18, paddingHorizontal: 12 },
});
