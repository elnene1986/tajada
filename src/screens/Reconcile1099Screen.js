// 1099-K reconciliation screen.
//
// Layout:
//   [Explainer]
//   [Comparison card — recorded income vs total 1099-K gross vs delta]
//   [Verdict banner — "covered" (green) or "shortfall" (amber)]
//   [+ Agregar un 1099-K → inline form: issuer + gross]
//   [List of 1099-K entries]
//
// The recorded-income figure is passed in from the Summary screen
// (route.params.recordedIncomeCents) so the comparison reflects the
// session the user came from. Everything else lives in tajada_1099k.json.

import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, Alert,
  StyleSheet, SafeAreaView, Platform, ScrollView, Keyboard,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  get1099Entries, save1099Entry, delete1099Entry, reconcile,
} from '../utils/reconcile1099';
import { fmtCents, parseToCents, formatAmountInput } from '../utils/money';
import { colors } from '../theme';
import { t } from '../i18n';

export default function Reconcile1099Screen({ route }) {
  var recordedIncomeCents = (route && route.params && route.params.recordedIncomeCents) || 0;

  var [entries, setEntries] = useState([]);

  // Form state
  var [formOpen, setFormOpen] = useState(false);
  var [issuer, setIssuer] = useState('');
  var [gross, setGross] = useState('');
  var [editingId, setEditingId] = useState(null);
  var [formError, setFormError] = useState('');

  // Lets the "Next" key on the issuer field jump straight to the amount.
  var grossRef = useRef(null);

  useFocusEffect(useCallback(function() {
    (async function() {
      setEntries(await get1099Entries());
    })();
  }, []));

  var rec = reconcile(recordedIncomeCents, entries);

  var resetForm = function() {
    setIssuer('');
    setGross('');
    setEditingId(null);
    setFormError('');
  };

  var save = async function() {
    setFormError('');
    var cents = parseToCents(gross);
    if (!issuer.trim() || !gross.trim()) {
      setFormError(t('reconcile.errIncomplete'));
      return;
    }
    if (!Number.isFinite(cents) || cents <= 0) {
      setFormError(t('reconcile.errInvalidAmount'));
      return;
    }
    try {
      await save1099Entry({ id: editingId, issuer: issuer, grossCents: cents });
      setEntries(await get1099Entries());
      resetForm();
      setFormOpen(false);
    } catch (e) {
      setFormError(e.message || t('common.unknownError'));
    }
  };

  var startEdit = function(entry) {
    setEditingId(entry.id);
    setIssuer(entry.issuer);
    setGross(formatAmountInput((entry.grossCents / 100).toFixed(2)));
    setFormOpen(true);
    setFormError('');
  };

  var confirmDelete = function(entry) {
    Alert.alert(
      t('reconcile.deleteTitle'),
      t('reconcile.deleteBody', { issuer: entry.issuer }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.delete'), style: 'destructive', onPress: async function() {
          await delete1099Entry(entry.id);
          setEntries(await get1099Entries());
        }},
      ],
    );
  };

  var hasEntries = entries.length > 0;

  return (
    <SafeAreaView style={s.container}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 60 }}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets={true}
        contentInsetAdjustmentBehavior="automatic"
      >
        <View style={s.padded}>
          <Text style={s.title}>{t('reconcile.title')}</Text>
          <Text style={s.subtitle}>{t('reconcile.subtitle')}</Text>
        </View>

        {/* Comparison card */}
        <View style={s.compareCard}>
          <View style={s.compareRow}>
            <Text style={s.compareLabel}>{t('reconcile.recordedLabel')}</Text>
            <Text style={s.compareVal}>{fmtCents(rec.recordedCents)}</Text>
          </View>
          <Text style={s.recordedNote}>{t('reconcile.recordedNote')}</Text>
          <View style={[s.compareRow, { marginTop: 10 }]}>
            <Text style={s.compareLabel}>{t('reconcile.grossLabel')}</Text>
            <Text style={s.compareVal}>{fmtCents(rec.grossCents)}</Text>
          </View>
          <View style={s.compareDivider} />
          <View style={s.compareRow}>
            <Text style={[s.compareLabel, { fontWeight: '700', color: colors.textPrimary }]}>{t('reconcile.deltaLabel')}</Text>
            <Text style={[s.compareVal, { color: rec.covered ? colors.income : colors.expense }]}>
              {rec.deltaCents < 0 ? '-' : ''}{fmtCents(rec.deltaCents)}
            </Text>
          </View>
        </View>

        {/* Verdict banner — only meaningful once a 1099-K is entered */}
        {hasEntries ? (
          rec.covered ? (
            <View style={[s.verdict, s.verdictOk]}>
              <Text style={[s.verdictTitle, { color: colors.incomeLabel }]}>{t('reconcile.coveredTitle')}</Text>
              <Text style={s.verdictBody}>{t('reconcile.coveredBody')}</Text>
            </View>
          ) : (
            <View style={[s.verdict, s.verdictWarn]}>
              <Text style={[s.verdictTitle, { color: colors.expenseLabel }]}>{t('reconcile.shortfallTitle', { amount: fmtCents(rec.deltaCents) })}</Text>
              <Text style={s.verdictBody}>{t('reconcile.shortfallBody')}</Text>
            </View>
          )
        ) : (
          <View style={s.explainerBox}>
            <Text style={s.explainerTxt}>{t('reconcile.explainer')}</Text>
          </View>
        )}

        {/* Add / edit form */}
        <View style={s.padded}>
          {!formOpen ? (
            <TouchableOpacity style={s.addBtn} onPress={function() { setFormOpen(true); }}>
              <Text style={s.addBtnTxt}>{t('reconcile.addBtn')}</Text>
            </TouchableOpacity>
          ) : (
            <View style={s.form}>
              <Text style={s.formTitle}>{editingId ? t('reconcile.editingTitle') : t('reconcile.newTitle')}</Text>

              <Text style={s.fieldLabel}>{t('reconcile.fieldIssuer')}</Text>
              <TextInput
                style={s.input}
                value={issuer}
                onChangeText={setIssuer}
                placeholder={t('reconcile.issuerPlaceholder')}
                placeholderTextColor={colors.textFaint}
                maxLength={60}
                autoCapitalize="words"
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={function() { if (grossRef.current) grossRef.current.focus(); }}
              />

              <Text style={s.fieldLabel}>{t('reconcile.fieldGross')}</Text>
              <View style={s.amountRow}>
                <TextInput
                  ref={grossRef}
                  style={[s.input, { flex: 1 }]}
                  value={gross}
                  onChangeText={function(txt) { setGross(formatAmountInput(txt)); }}
                  placeholder={t('reconcile.grossPlaceholder')}
                  placeholderTextColor={colors.textFaint}
                  keyboardType="decimal-pad"
                />
                <TouchableOpacity style={s.doneBtn} onPress={function() { Keyboard.dismiss(); }}>
                  <Text style={s.doneBtnTxt}>{t('common.done')}</Text>
                </TouchableOpacity>
              </View>

              {formError ? (
                <View style={s.errorBox}><Text style={s.errorTxt}>{formError}</Text></View>
              ) : null}

              <View style={s.formActions}>
                <TouchableOpacity style={s.formCancel} onPress={function() { resetForm(); setFormOpen(false); }}>
                  <Text style={s.formCancelTxt}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.formSave} onPress={save}>
                  <Text style={s.formSaveTxt}>{editingId ? t('common.done') : t('reconcile.saveBtn')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* List */}
        {!hasEntries ? (
          <View style={s.empty}>
            <Text style={s.emptyTitle}>{t('reconcile.emptyTitle')}</Text>
            <Text style={s.emptyBody}>{t('reconcile.emptyBody')}</Text>
          </View>
        ) : (
          <View style={{ paddingHorizontal: 16 }}>
            <Text style={s.listLabel}>{t('reconcile.entriesLabel', { count: entries.length })}</Text>
            <FlatList
              scrollEnabled={false}
              data={entries}
              keyExtractor={function(item) { return item.id; }}
              renderItem={function(ref) {
                var item = ref.item;
                return (
                  <TouchableOpacity style={s.entry} onPress={function() { startEdit(item); }} onLongPress={function() { confirmDelete(item); }}>
                    <Text style={s.entryIssuer} numberOfLines={1}>{item.issuer}</Text>
                    <Text style={s.entryAmt}>{fmtCents(item.grossCents)}</Text>
                  </TouchableOpacity>
                );
              }}
            />
            <Text style={s.listHint}>{t('reconcile.listHint')}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

var s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.screenBg },
  padded: { paddingHorizontal: 20, paddingTop: 16 },
  title: { fontSize: 22, fontWeight: '700', color: colors.textPrimary },
  subtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 4, marginBottom: 16, lineHeight: 18 },

  compareCard: { backgroundColor: colors.card, borderRadius: 12, marginHorizontal: 20, padding: 16, borderWidth: 1, borderColor: colors.cardBorder, marginBottom: 12 },
  compareRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  compareLabel: { fontSize: 13, color: colors.textSecondary },
  compareVal: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  recordedNote: { fontSize: 10, color: colors.textFaint, marginTop: 2 },
  compareDivider: { height: 1, backgroundColor: colors.cardBorder, marginVertical: 10 },

  verdict: { marginHorizontal: 20, padding: 14, borderRadius: 10, borderWidth: 1, marginBottom: 12 },
  verdictOk: { backgroundColor: colors.incomeBg, borderColor: colors.incomeBorder },
  verdictWarn: { backgroundColor: colors.expenseBg, borderColor: colors.expenseBorder },
  verdictTitle: { fontSize: 13, fontWeight: '700', marginBottom: 4 },
  verdictBody: { fontSize: 12, color: colors.textSecondary, lineHeight: 17 },

  explainerBox: { marginHorizontal: 20, padding: 14, borderRadius: 10, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder, marginBottom: 12 },
  explainerTxt: { fontSize: 12, color: colors.textSecondary, lineHeight: 17 },

  addBtn: { backgroundColor: colors.accent, borderRadius: 12, padding: 14, alignItems: 'center' },
  addBtnTxt: { fontSize: 14, fontWeight: '700', color: colors.accentText },

  form: { backgroundColor: colors.card, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: colors.cardBorder },
  formTitle: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, marginBottom: 14 },
  fieldLabel: { fontSize: 11, color: colors.textFaint, textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: '700', marginBottom: 6, marginTop: 8 },
  input: { backgroundColor: colors.screenBg, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 8, paddingHorizontal: 12, paddingVertical: Platform.OS === 'ios' ? 11 : 8, fontSize: 14, color: colors.textPrimary },

  errorBox: { backgroundColor: colors.expenseBg, borderRadius: 8, padding: 10, marginTop: 10, borderWidth: 1, borderColor: colors.expenseBorder },
  errorTxt: { fontSize: 12, color: colors.expenseLabel },

  formActions: { flexDirection: 'row', marginTop: 16 },
  formCancel: { flex: 1, paddingVertical: 12, alignItems: 'center', backgroundColor: colors.chipBg, borderRadius: 8, marginRight: 6 },
  formCancelTxt: { fontSize: 13, color: colors.textSecondary, fontWeight: '600' },
  formSave: { flex: 2, paddingVertical: 12, alignItems: 'center', backgroundColor: colors.accent, borderRadius: 8 },
  formSaveTxt: { fontSize: 13, color: colors.accentText, fontWeight: '700' },

  empty: { alignItems: 'center', paddingHorizontal: 30, marginTop: 24, marginBottom: 20 },
  emptyTitle: { fontSize: 14, color: colors.textSecondary, fontWeight: '600' },
  emptyBody: { fontSize: 12, color: colors.textFaint, marginTop: 6, textAlign: 'center', lineHeight: 17 },

  listLabel: { fontSize: 10, color: colors.textFaint, textTransform: 'uppercase', letterSpacing: 1, fontWeight: '700', marginBottom: 8, marginTop: 20 },
  entry: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.card, padding: 14, marginBottom: 6, borderRadius: 8, borderWidth: 1, borderColor: colors.cardBorder },
  entryIssuer: { fontSize: 14, fontWeight: '600', color: colors.textPrimary, flex: 1, paddingRight: 10 },
  entryAmt: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  listHint: { fontSize: 10, color: colors.textFaint, textAlign: 'center', marginTop: 8, fontStyle: 'italic' },

  amountRow: { flexDirection: 'row', alignItems: 'center' },
  doneBtn: { marginLeft: 6, backgroundColor: colors.chipBg, paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 12 : 9, borderRadius: 8 },
  doneBtnTxt: { fontSize: 13, color: colors.accent, fontWeight: '700' },
});
