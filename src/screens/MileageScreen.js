// Mileage tracker screen — Schedule C Line 9 (Car and truck).
//
// Layout:
//   [Year selector pills]
//   [Summary card — total miles + deduction at the current IRS rate]
//   [+ Agregar viaje button → expands to inline form]
//   [List of entries, sorted by date desc]
//
// Date input is a plain TextInput (MM/DD/YYYY) with a "Hoy" quick-fill
// button. We deliberately don't add @react-native-community/datetimepicker
// — it's another native module and the rest of the app is happy with
// text-entered dates in the same format.

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, Switch, Alert,
  StyleSheet, SafeAreaView, Platform, ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  getMileageState, saveMileageEntry, deleteMileageEntry,
  setRatePerMile, totalMiles, totalDeduction, entriesForYear,
} from '../utils/mileage';
import { colors } from '../theme';
import { t } from '../i18n';

function fmtMoney(n) {
  return '$' + Number(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
function fmtMiles(n) {
  // Integer for whole numbers, otherwise 1-decimal — matches how
  // people actually report mileage.
  var v = Number(n) || 0;
  return v === Math.floor(v) ? String(v) : v.toFixed(1);
}
function todayString() {
  var d = new Date();
  var pad = function(x) { return x < 10 ? '0' + x : '' + x; };
  return pad(d.getMonth() + 1) + '/' + pad(d.getDate()) + '/' + d.getFullYear();
}

function defaultYears() {
  // Last three years, with current year first. Keeps the picker
  // small enough to fit in one row on any phone.
  var y = new Date().getFullYear();
  return [y, y - 1, y - 2];
}

export default function MileageScreen() {
  var [entries, setEntries] = useState([]);
  var [rate, setRate] = useState(0.70);
  var [year, setYear] = useState(new Date().getFullYear());

  // Form state
  var [formOpen, setFormOpen] = useState(false);
  var [date, setDate] = useState(todayString());
  var [miles, setMiles] = useState('');
  var [purpose, setPurpose] = useState('');
  var [roundTrip, setRoundTrip] = useState(false);
  var [editingId, setEditingId] = useState(null);
  var [formError, setFormError] = useState('');

  // Rate editor
  var [rateInput, setRateInput] = useState('0.70');

  useFocusEffect(useCallback(function() {
    (async function() {
      var state = await getMileageState();
      setEntries(state.entries);
      setRate(state.ratePerMile);
      setRateInput(String(state.ratePerMile));
    })();
  }, []));

  var visibleEntries = entriesForYear(entries, year);
  var yearMiles = totalMiles(visibleEntries);
  var yearDeduction = totalDeduction(visibleEntries, rate);

  var resetForm = function() {
    setDate(todayString());
    setMiles('');
    setPurpose('');
    setRoundTrip(false);
    setEditingId(null);
    setFormError('');
  };

  var save = async function() {
    setFormError('');
    if (!date || !miles || !purpose) {
      setFormError(t('mileage.errIncomplete'));
      return;
    }
    var n = Number(String(miles).replace(',', '.'));
    if (!isFinite(n) || n <= 0) {
      setFormError(t('mileage.errInvalidMiles'));
      return;
    }
    try {
      await saveMileageEntry({
        id: editingId,
        date: date,
        miles: n,
        purpose: purpose,
        roundTrip: roundTrip,
      });
      var state = await getMileageState();
      setEntries(state.entries);
      resetForm();
      setFormOpen(false);
    } catch (e) {
      setFormError(e.message || t('common.unknownError'));
    }
  };

  var startEdit = function(entry) {
    setEditingId(entry.id);
    setDate(entry.date);
    setMiles(String(entry.miles));
    setPurpose(entry.purpose);
    setRoundTrip(!!entry.roundTrip);
    setFormOpen(true);
    setFormError('');
  };

  var confirmDelete = function(entry) {
    Alert.alert(
      t('mileage.deleteTitle'),
      t('mileage.deleteBody', { purpose: entry.purpose }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.delete'), style: 'destructive', onPress: async function() {
          await deleteMileageEntry(entry.id);
          var state = await getMileageState();
          setEntries(state.entries);
        }},
      ],
    );
  };

  var saveRate = async function() {
    var n = Number(String(rateInput).replace(',', '.'));
    if (!isFinite(n) || n <= 0) {
      Alert.alert(t('common.error'), t('mileage.errInvalidRate'));
      return;
    }
    var saved = await setRatePerMile(n);
    setRate(saved);
    Alert.alert(t('common.done'), t('mileage.rateSaved', { rate: saved.toFixed(3) }));
  };

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 60 }}>
        <View style={s.padded}>
          <Text style={s.title}>{t('mileage.title')}</Text>
          <Text style={s.subtitle}>{t('mileage.subtitle')}</Text>
        </View>

        {/* Year picker — last 3 years */}
        <View style={s.yearRow}>
          {defaultYears().map(function(y) {
            var active = y === year;
            return (
              <TouchableOpacity
                key={y}
                style={[s.yearChip, active && s.yearChipActive]}
                onPress={function() { setYear(y); }}
              >
                <Text style={[s.yearChipTxt, active && s.yearChipTxtActive]}>{y}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Year summary */}
        <View style={s.summaryCard}>
          <View style={s.summaryCol}>
            <Text style={s.summaryLabel}>{t('mileage.totalMiles')}</Text>
            <Text style={s.summaryVal}>{fmtMiles(yearMiles)}</Text>
          </View>
          <View style={s.summaryDiv} />
          <View style={s.summaryCol}>
            <Text style={s.summaryLabel}>{t('mileage.deduction')}</Text>
            <Text style={[s.summaryVal, { color: colors.income }]}>{fmtMoney(yearDeduction)}</Text>
            <Text style={s.summarySub}>{t('mileage.atRate', { rate: rate.toFixed(3) })}</Text>
          </View>
        </View>

        {/* Add / Edit form */}
        <View style={s.padded}>
          {!formOpen ? (
            <TouchableOpacity style={s.addBtn} onPress={function() { setFormOpen(true); }}>
              <Text style={s.addBtnTxt}>{t('mileage.addBtn')}</Text>
            </TouchableOpacity>
          ) : (
            <View style={s.form}>
              <Text style={s.formTitle}>
                {editingId ? t('mileage.editingTitle') : t('mileage.newTripTitle')}
              </Text>

              <Text style={s.fieldLabel}>{t('mileage.fieldDate')}</Text>
              <View style={s.dateRow}>
                <TextInput
                  style={[s.input, { flex: 1 }]}
                  value={date}
                  onChangeText={setDate}
                  placeholder="MM/DD/YYYY"
                  placeholderTextColor={colors.textFaint}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity style={s.dateTodayBtn} onPress={function() { setDate(todayString()); }}>
                  <Text style={s.dateTodayTxt}>{t('mileage.todayBtn')}</Text>
                </TouchableOpacity>
              </View>

              <Text style={s.fieldLabel}>{t('mileage.fieldMiles')}</Text>
              <TextInput
                style={s.input}
                value={miles}
                onChangeText={setMiles}
                placeholder={t('mileage.milesPlaceholder')}
                placeholderTextColor={colors.textFaint}
                keyboardType="decimal-pad"
              />

              <Text style={s.fieldLabel}>{t('mileage.fieldPurpose')}</Text>
              <TextInput
                style={s.input}
                value={purpose}
                onChangeText={setPurpose}
                placeholder={t('mileage.purposePlaceholder')}
                placeholderTextColor={colors.textFaint}
                maxLength={120}
              />
              <Text style={s.fieldHint}>{t('mileage.purposeHint')}</Text>

              <View style={s.toggleRow}>
                <Text style={s.toggleLabel}>{t('mileage.roundTrip')}</Text>
                <Switch
                  value={roundTrip}
                  onValueChange={setRoundTrip}
                  trackColor={{ true: colors.accent, false: colors.cardBorder }}
                  thumbColor={Platform.OS === 'android' ? (roundTrip ? colors.accentText : colors.card) : undefined}
                />
              </View>
              <Text style={s.fieldHint}>{t('mileage.roundTripHint')}</Text>

              {formError ? (
                <View style={s.errorBox}><Text style={s.errorTxt}>{formError}</Text></View>
              ) : null}

              <View style={s.formActions}>
                <TouchableOpacity style={s.formCancel} onPress={function() { resetForm(); setFormOpen(false); }}>
                  <Text style={s.formCancelTxt}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.formSave} onPress={save}>
                  <Text style={s.formSaveTxt}>{editingId ? t('common.done') : t('mileage.saveBtn')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* List */}
        {visibleEntries.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyTitle}>{t('mileage.emptyTitle', { year: year })}</Text>
            <Text style={s.emptyBody}>{t('mileage.emptyBody')}</Text>
          </View>
        ) : (
          <View style={{ paddingHorizontal: 16 }}>
            <Text style={s.listLabel}>{t('mileage.entriesLabel', { count: visibleEntries.length })}</Text>
            <FlatList
              scrollEnabled={false}
              data={visibleEntries}
              keyExtractor={function(item) { return item.id; }}
              renderItem={function(ref) {
                var item = ref.item;
                var eff = item.roundTrip ? item.miles * 2 : item.miles;
                return (
                  <TouchableOpacity style={s.entry} onPress={function() { startEdit(item); }} onLongPress={function() { confirmDelete(item); }}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.entryPurpose} numberOfLines={1}>{item.purpose}</Text>
                      <View style={s.entryMetaRow}>
                        <Text style={s.entryDate}>{item.date}</Text>
                        {item.roundTrip && (
                          <View style={s.rtBadge}><Text style={s.rtBadgeTxt}>{t('mileage.rtBadge')}</Text></View>
                        )}
                      </View>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={s.entryMiles}>{fmtMiles(eff)} mi</Text>
                      <Text style={s.entryAmt}>{fmtMoney(eff * rate)}</Text>
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
            <Text style={s.listHint}>{t('mileage.listHint')}</Text>
          </View>
        )}

        {/* Rate editor */}
        <View style={s.rateCard}>
          <Text style={s.rateTitle}>{t('mileage.rateTitle')}</Text>
          <Text style={s.rateBody}>{t('mileage.rateBody')}</Text>
          <View style={s.rateRow}>
            <Text style={s.rateDollar}>$</Text>
            <TextInput
              style={s.rateInput}
              value={rateInput}
              onChangeText={setRateInput}
              keyboardType="decimal-pad"
              maxLength={6}
            />
            <Text style={s.ratePerMi}>{t('mileage.perMile')}</Text>
            <TouchableOpacity style={s.rateSaveBtn} onPress={saveRate}>
              <Text style={s.rateSaveTxt}>{t('common.done')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

var s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.screenBg },
  padded: { paddingHorizontal: 20, paddingTop: 16 },

  title: { fontSize: 22, fontWeight: '700', color: colors.textPrimary },
  subtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 4, marginBottom: 16, lineHeight: 18 },

  yearRow: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 12 },
  yearChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder, marginRight: 6 },
  yearChipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  yearChipTxt: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
  yearChipTxtActive: { color: colors.accentText },

  summaryCard: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: 12, marginHorizontal: 20, padding: 16, borderWidth: 1, borderColor: colors.cardBorder, marginBottom: 16 },
  summaryCol: { flex: 1, alignItems: 'center' },
  summaryDiv: { width: 1, backgroundColor: colors.cardBorder, marginHorizontal: 12 },
  summaryLabel: { fontSize: 10, color: colors.textFaint, textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: '600', marginBottom: 4 },
  summaryVal: { fontSize: 22, fontWeight: '700', color: colors.textPrimary },
  summarySub: { fontSize: 10, color: colors.textFaint, marginTop: 2 },

  addBtn: { backgroundColor: colors.accent, borderRadius: 12, padding: 14, alignItems: 'center' },
  addBtnTxt: { fontSize: 14, fontWeight: '700', color: colors.accentText },

  form: { backgroundColor: colors.card, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: colors.cardBorder },
  formTitle: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, marginBottom: 14 },
  fieldLabel: { fontSize: 11, color: colors.textFaint, textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: '700', marginBottom: 6, marginTop: 8 },
  input: { backgroundColor: colors.screenBg, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 8, paddingHorizontal: 12, paddingVertical: Platform.OS === 'ios' ? 11 : 8, fontSize: 14, color: colors.textPrimary },
  dateRow: { flexDirection: 'row', alignItems: 'center' },
  dateTodayBtn: { marginLeft: 6, backgroundColor: colors.chipBg, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8 },
  dateTodayTxt: { fontSize: 12, color: colors.accent, fontWeight: '600' },
  fieldHint: { fontSize: 10, color: colors.textFaint, marginTop: 4, lineHeight: 13 },

  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, paddingVertical: 4 },
  toggleLabel: { fontSize: 13, color: colors.textPrimary, fontWeight: '600' },

  errorBox: { backgroundColor: colors.expenseBg, borderRadius: 8, padding: 10, marginTop: 10, borderWidth: 1, borderColor: colors.expenseBorder },
  errorTxt: { fontSize: 12, color: colors.expenseLabel },

  formActions: { flexDirection: 'row', marginTop: 16 },
  formCancel: { flex: 1, paddingVertical: 12, alignItems: 'center', backgroundColor: colors.chipBg, borderRadius: 8, marginRight: 6 },
  formCancelTxt: { fontSize: 13, color: colors.textSecondary, fontWeight: '600' },
  formSave: { flex: 2, paddingVertical: 12, alignItems: 'center', backgroundColor: colors.accent, borderRadius: 8 },
  formSaveTxt: { fontSize: 13, color: colors.accentText, fontWeight: '700' },

  empty: { alignItems: 'center', paddingHorizontal: 30, marginTop: 30, marginBottom: 20 },
  emptyTitle: { fontSize: 14, color: colors.textSecondary, fontWeight: '600' },
  emptyBody: { fontSize: 12, color: colors.textFaint, marginTop: 6, textAlign: 'center', lineHeight: 17 },

  listLabel: { fontSize: 10, color: colors.textFaint, textTransform: 'uppercase', letterSpacing: 1, fontWeight: '700', marginBottom: 8, marginTop: 20 },
  entry: { flexDirection: 'row', backgroundColor: colors.card, padding: 12, marginBottom: 6, borderRadius: 8, borderWidth: 1, borderColor: colors.cardBorder, alignItems: 'center' },
  entryPurpose: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
  entryMetaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  entryDate: { fontSize: 11, color: colors.textFaint, marginRight: 6 },
  rtBadge: { backgroundColor: colors.infoBg, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 3 },
  rtBadgeTxt: { fontSize: 9, color: colors.infoText, fontWeight: '700' },
  entryMiles: { fontSize: 13, fontWeight: '700', color: colors.textPrimary },
  entryAmt: { fontSize: 11, color: colors.income, fontWeight: '600', marginTop: 2 },
  listHint: { fontSize: 10, color: colors.textFaint, textAlign: 'center', marginTop: 8, fontStyle: 'italic' },

  rateCard: { backgroundColor: colors.card, marginHorizontal: 20, marginTop: 20, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: colors.cardBorder },
  rateTitle: { fontSize: 12, color: colors.textFaint, textTransform: 'uppercase', letterSpacing: 1, fontWeight: '700', marginBottom: 4 },
  rateBody: { fontSize: 11, color: colors.textSecondary, lineHeight: 15, marginBottom: 10 },
  rateRow: { flexDirection: 'row', alignItems: 'center' },
  rateDollar: { fontSize: 14, color: colors.textPrimary, fontWeight: '600', marginRight: 2 },
  rateInput: { backgroundColor: colors.screenBg, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 6, paddingHorizontal: 8, paddingVertical: Platform.OS === 'ios' ? 6 : 4, fontSize: 14, color: colors.textPrimary, width: 70 },
  ratePerMi: { fontSize: 11, color: colors.textFaint, marginLeft: 6, flex: 1 },
  rateSaveBtn: { backgroundColor: colors.accent, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6 },
  rateSaveTxt: { fontSize: 12, color: colors.accentText, fontWeight: '700' },
});
