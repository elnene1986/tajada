import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, ScrollView, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getSessions, deleteSession } from '../utils/storage';
import { readBackupMeta, daysSince } from '../utils/backupMeta';
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

  useFocusEffect(useCallback(function() {
    getSessions().then(setSessions);
    readBackupMeta().then(setBackupMeta);
    setEditing(false);
  }, []));

  var freshness = backupFreshness(backupMeta.lastBackupAt);

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

      {/* Logo */}
      <View style={s.header}>
        <BrandLogo style={s.logoRow} />
        <Text style={[s.brand, { fontWeight: '700' }]}>{brand.displayName}</Text>
        {brand.subBrand ? <Text style={s.subBrand}>{brand.subBrand}</Text> : null}
        <Text style={s.tagline}>{brand.tagline}</Text>
      </View>

      {/* Privacy badge */}
      <View style={s.privacyBadge}>
        <Text style={s.privacyText}>{t('home.privacy')}</Text>
      </View>

      {/* Backup affordance — sits next to the privacy badge because the
          two ideas are linked: "your data stays on your phone" needs
          "and here's how to not lose it if you drop the phone".
          The freshness line shifts color when the backup is stale
          (>=14 days) so the nudge is visible without being loud. */}
      <TouchableOpacity style={s.backupLink} onPress={function() { navigation.navigate('Backup'); }}>
        <Text style={s.backupLinkText}>{t('home.backupLink')}</Text>
        <Text style={[s.backupFresh, freshness.stale && s.backupFreshStale]}>{freshness.label}</Text>
      </TouchableOpacity>

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
          <Text style={s.emptyTitle}>{t('home.emptyTitle')}</Text>
          <Text style={s.emptyText}>{t('home.emptyBody')}</Text>
        </View>
      )}
    </View>
  );
}

var s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.heroBg, paddingHorizontal: 20, paddingTop: 80, alignItems: 'center' },
  header: { alignItems: 'center', marginBottom: 16 },
  logoRow: { marginBottom: 12 },
  brand: { fontSize: 28, color: colors.heroText, letterSpacing: -0.8 },
  subBrand: { fontSize: 13, color: colors.heroTextMuted, marginTop: 2, letterSpacing: 0.3, fontStyle: 'italic' },
  tagline: { fontSize: 10, color: colors.heroTextLabel, marginTop: 6, letterSpacing: 1.5 },
  privacyBadge: { backgroundColor: colors.heroChip, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, marginBottom: 8 },
  privacyText: { fontSize: 11, color: colors.heroTextFaint },
  backupLink: { paddingVertical: 4, paddingHorizontal: 10, marginBottom: 16, alignItems: 'center' },
  backupLinkText: { fontSize: 10, color: colors.heroTextLabel, fontWeight: '600', letterSpacing: 0.4 },
  backupFresh: { fontSize: 9, color: colors.heroTextDim, marginTop: 2 },
  backupFreshStale: { color: colors.warning, fontWeight: '600' },
  cta: { backgroundColor: colors.accent, borderRadius: 12, padding: 16, alignItems: 'center', width: '100%' },
  ctaTitle: { fontSize: 15, fontWeight: '600', color: colors.accentText },
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
  empty: { alignItems: 'center', marginTop: 60 },
  emptyTitle: { fontSize: 15, fontWeight: '500', color: colors.heroTextFaint },
  emptyText: { fontSize: 13, color: colors.heroTextDim, textAlign: 'center', marginTop: 8 },
});
