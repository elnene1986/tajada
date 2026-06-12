import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Alert, ActivityIndicator, ScrollView } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { parseFile, formatLabel, sourceLabel } from '../parsers';
import { saveSession } from '../utils/storage';
import { getRules, applyRules } from '../utils/rules';
import { suggestForTransactions } from '../utils/categorizer';
import { fmtCents } from '../utils/money';
import { colors } from '../theme';
import { t } from '../i18n';

function uid() { return 'xxxx-xxxx-xxxx'.replace(/x/g, function() { return ((Math.random()*16)|0).toString(16); }); }
// Money formatter — takes integer cents.
var fmt = fmtCents;

// Helper: income / expense totals (in cents) for a transaction list.
// Integer addition — no float drift across hundreds of imported rows.
function totalsFor(transactions) {
  var inc = 0, exp = 0;
  for (var i = 0; i < transactions.length; i++) {
    var t = transactions[i];
    if (t.type === 'credit') inc += t.amountCents; else exp += t.amountCents;
  }
  return { income: inc, expenses: exp };
}

// Only statement-style files belong in SplitLedger. Anything else
// (photos, PDFs, Word/Excel/Pages/Numbers, etc.) gets filtered out.
var ALLOWED_EXTS = ['csv', 'ofx', 'qfx', 'tsv'];
function getExt(name) {
  var dot = (name || '').lastIndexOf('.');
  return dot === -1 ? '' : name.slice(dot + 1).toLowerCase();
}

export default function ImportScreen({ navigation, route }) {
  var source = (route.params && route.params.source) || t('import.defaultSource');
  var [loading, setLoading] = useState(false);
  var [files, setFiles] = useState([]);
  var [errorMsg, setErrorMsg] = useState('');

  // Previous behaviour auto-advanced to Review after 800ms. For the
  // creator pivot we deliberately stop auto-navigating and let the
  // user sanity-check parsed totals before proceeding — this is the
  // "parse reconciliation" step. Users tap Start sorting explicitly.

  var totalTxns = files.reduce(function(sum, f) { return sum + f.transactions.length; }, 0);
  var overall = files.reduce(function(acc, f) {
    var tot = totalsFor(f.transactions);
    return { income: acc.income + tot.income, expenses: acc.expenses + tot.expenses };
  }, { income: 0, expenses: 0 });
  var totalAuto = files.reduce(function(n, f) { return n + (f.autoCount || 0); }, 0);

  var pickFiles = async function() {
    setErrorMsg('');
    try {
      var result = await DocumentPicker.getDocumentAsync({
        // Hint to the OS picker which types we accept. Some platforms
        // ignore this (especially Android), so we re-filter below.
        type: [
          'text/csv',
          'text/comma-separated-values',
          'application/csv',
          'text/x-csv',
          'application/x-csv',
          'text/tab-separated-values',
          'application/x-ofx',
          'application/vnd.intu.qfx',
          'application/vnd.intu.qbo',
        ],
        copyToCacheDirectory: true,
        multiple: true,
      });
      if (result.canceled) return;

      setLoading(true);
      var newFiles = [];
      var skipped = [];

      // Load rules once per batch. Applied to every parsed file so the
      // user lands in Review with known merchants already classified.
      var rules = await getRules();

      for (var i = 0; i < result.assets.length; i++) {
        var file = result.assets[i];
        var ext = getExt(file.name);
        if (ALLOWED_EXTS.indexOf(ext) === -1) {
          // Not a statement-style file (likely a photo or foreign doc).
          // Drop it silently from the list and report at the end.
          skipped.push(file.name);
          continue;
        }
        try {
          var content = await FileSystem.readAsStringAsync(file.uri, { encoding: FileSystem.EncodingType.UTF8 });
          var parseResult = parseFile(content, file.name);
          var ruleResult = applyRules(parseResult.transactions, rules);
          // Deterministic category suggestions for expenses no rule
          // covered — pre-fills the Review modal's category picker.
          var suggested = suggestForTransactions(ruleResult.transactions);
          ruleResult = { transactions: suggested.transactions, appliedCount: ruleResult.appliedCount };
          var tot = totalsFor(ruleResult.transactions);
          newFiles.push({
            id: uid(),
            name: file.name,
            format: parseResult.format,
            source: parseResult.source,
            transactions: ruleResult.transactions,
            count: ruleResult.transactions.length,
            income: tot.income,
            expenses: tot.expenses,
            autoCount: ruleResult.appliedCount,
          });
        } catch (err) {
          newFiles.push({
            id: uid(),
            name: file.name,
            format: 'error',
            source: '',
            transactions: [],
            count: 0,
            income: 0,
            expenses: 0,
            autoCount: 0,
            error: err.message || 'Could not read file',
          });
        }
      }

      setFiles(function(prev) { return prev.concat(newFiles); });
      setLoading(false);

      if (skipped.length > 0) {
        var preview = skipped.slice(0, 3).join(', ') + (skipped.length > 3 ? t('import.andMore', { count: skipped.length - 3 }) : '');
        setErrorMsg(t(skipped.length === 1 ? 'import.skippedOne' : 'import.skippedMany', { count: skipped.length, preview: preview }));
      }
    } catch (err) {
      setLoading(false);
      setErrorMsg(t('import.errorPrefix', { msg: err.message || t('common.unknownError') }));
    }
  };

  var removeFile = function(fileId) {
    setFiles(function(prev) { return prev.filter(function(f) { return f.id !== fileId; }); });
  };

  var startSorting = async function() {
    var allTxns = [];
    var sources = [];
    var seenKeys = new Set();

    files.forEach(function(f) {
      if (f.transactions.length === 0) return;
      if (sources.indexOf(f.source) === -1) sources.push(f.source);
      f.transactions.forEach(function(t) {
        var key = t.date + '|' + t.amountCents + '|' + t.description.toLowerCase();
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          allTxns.push(t);
        }
      });
    });

    if (allTxns.length === 0) {
      Alert.alert(t('common.noTransactions'), t('import.noTxnBody'));
      return;
    }

    try {
      // Build session display name. Translate the source keys via
      // sourceLabel() so the session title reads in Spanish even though
      // the underlying source field stays a stable English key.
      var sourceNames = sources.map(sourceLabel);
      var session = {
        id: uid(),
        name: sourceNames.length > 1
          ? sourceNames.join(' + ') + t('review.combinedSuffix')
          : sourceNames[0] + ' — ' + files[0].name,
        source: sources.join(', '),
        format: 'multiple',
        transactions: allTxns,
        totalCount: allTxns.length,
        excludedCount: 0,
        status: 'in_progress',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await saveSession(session);
      navigation.replace('Review', { sessionId: session.id });
    } catch (err) {
      Alert.alert(t('common.error'), t('import.saveError', { msg: err.message || t('common.unknown') }));
    }
  };

  return (
    <SafeAreaView style={s.container}>
      <Text style={s.title}>{source}</Text>
      <Text style={s.subtitle}>{t('import.subtitle')}</Text>

      {/* Upload button */}
      <TouchableOpacity style={s.dropZone} onPress={pickFiles} activeOpacity={0.85}>
        {loading ? <ActivityIndicator size="large" color={colors.accent} /> : (
          <>
            <View style={s.dropIconCircle}>
              <Text style={s.dropIcon}>+</Text>
            </View>
            <Text style={s.dropTitle}>{files.length === 0 ? t('import.dropEmpty') : t('import.dropMore')}</Text>
            <Text style={s.dropSub}>{t('import.dropSub')}</Text>
          </>
        )}
      </TouchableOpacity>

      {errorMsg ? (
        <View style={s.errorBox}><Text style={s.errorText}>{errorMsg}</Text></View>
      ) : null}

      {/* Empty-state helper — fills the page until the first file lands:
          which sources work, and the privacy promise pinned at the bottom. */}
      {files.length === 0 && !loading && (
        <View style={s.helper}>
          <Text style={s.sourcesLabel}>{t('import.sourcesLabel')}</Text>
          <View style={s.chipWrap}>
            {['Chase', 'Bank of America', 'Capital One', 'Stripe', 'PayPal', 'Venmo', 'Patreon', 'Substack'].map(function(name) {
              return (
                <View key={name} style={s.sourceChip}>
                  <Text style={s.sourceChipTxt}>{name}</Text>
                </View>
              );
            })}
          </View>
          <View style={{ flex: 1 }} />
          <Text style={s.privacyNote}>{t('import.privacyNote')}</Text>
        </View>
      )}

      {/* File list */}
      {files.length > 0 && (
        <View style={s.fileList}>
          <Text style={s.fileListLabel}>{t('import.filesLabel', { count: files.length })}</Text>
          {files.map(function(f) {
            return (
              <View key={f.id} style={[s.fileCard, f.error && s.fileCardError]}>
                <View style={[s.fileIcon, { backgroundColor: f.error ? colors.expenseBg : colors.incomeBg }]}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: f.error ? colors.expenseDeep : colors.income }}>
                    {f.error ? '!' : '✓'}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.fileName} numberOfLines={1}>{f.name}</Text>
                  {f.error ? (
                    <Text style={s.fileError}>{f.error}</Text>
                  ) : (
                    <>
                      <Text style={s.fileMeta}>
                        {t('import.fileMeta', { format: formatLabel(f.format), count: f.count })}
                      </Text>
                      {/* Reconciliation hint: show parsed totals so the
                          user can eyeball them against their real
                          statement before committing to the sort. */}
                      <View style={s.reconRow}>
                        <Text style={s.reconIn}>+{fmt(f.income)}</Text>
                        <Text style={s.reconOut}>-{fmt(f.expenses)}</Text>
                        {f.autoCount > 0 && <Text style={s.reconAuto}>{t('import.autoBadge', { count: f.autoCount })}</Text>}
                      </View>
                    </>
                  )}
                </View>
                <TouchableOpacity onPress={function() { removeFile(f.id); }} style={s.removeBtn}>
                  <Text style={s.removeTxt}>✕</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      )}

      {/* Summary + Start.
          The recon card makes the user's implicit question explicit:
          "did you read my statement correctly?" If the parsed totals
          don't match what their bank showed, they bail here instead
          of after an hour of tapping. */}
      {totalTxns > 0 && (
        <View style={s.bottomArea}>
          <View style={s.reconCard}>
            <Text style={s.reconTitle}>{t('import.reconTitle')}</Text>
            <View style={s.reconGrid}>
              <View style={s.reconCell}>
                <Text style={s.reconLabel}>{t('import.rowsParsed')}</Text>
                <Text style={s.reconVal}>{totalTxns}</Text>
              </View>
              <View style={s.reconCell}>
                <Text style={s.reconLabel}>{t('common.income')}</Text>
                <Text style={[s.reconVal, { color: colors.incomeDeep }]}>{fmt(overall.income)}</Text>
              </View>
              <View style={s.reconCell}>
                <Text style={s.reconLabel}>{t('common.expenses')}</Text>
                <Text style={[s.reconVal, { color: colors.expenseDeep }]}>{fmt(overall.expenses)}</Text>
              </View>
            </View>
            {totalAuto > 0 && (
              <Text style={s.reconAutoLine}>{t('import.autoClassified', { count: totalAuto })}</Text>
            )}
            <Text style={s.reconHint}>{t('import.reconHint')}</Text>
          </View>
          <TouchableOpacity style={s.startBtn} onPress={startSorting}>
            <Text style={s.startText}>{t('import.startBtn')}</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

var s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.screenBg, paddingHorizontal: 20, paddingTop: 12 },
  title: { fontSize: 24, fontWeight: '700', color: colors.textPrimary, letterSpacing: -0.4 },
  subtitle: { fontSize: 13, color: colors.textFaint, marginTop: 4, marginBottom: 24 },
  dropZone: {
    backgroundColor: colors.card,
    borderRadius: 18,
    paddingVertical: 36,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    shadowColor: colors.textPrimary,
    shadowOpacity: 0.07,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  dropIconCircle: { width: 54, height: 54, borderRadius: 27, backgroundColor: colors.incomeBg, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  dropIcon: { fontSize: 28, color: colors.accent, fontWeight: '300', marginTop: -2 },
  dropTitle: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  dropSub: { fontSize: 12, color: colors.textFaint, marginTop: 5 },
  helper: { flex: 1, paddingBottom: 28 },
  sourcesLabel: { fontSize: 10, color: colors.textFaint, letterSpacing: 1.5, textTransform: 'uppercase', textAlign: 'center', marginTop: 8, marginBottom: 12 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  sourceChip: { backgroundColor: colors.chipBg, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6, margin: 4 },
  sourceChipTxt: { fontSize: 11, color: colors.textSecondary, fontWeight: '500' },
  privacyNote: { fontSize: 11, color: colors.textFaint, textAlign: 'center', lineHeight: 17, paddingHorizontal: 24 },
  errorBox: { backgroundColor: colors.expenseBg, borderRadius: 8, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: colors.expenseBorder },
  errorText: { fontSize: 12, color: colors.expenseLabel },
  fileList: { marginBottom: 16 },
  fileListLabel: { fontSize: 11, color: colors.textFaint, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  fileCard: { backgroundColor: colors.card, borderRadius: 10, padding: 12, marginBottom: 6, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.cardBorder },
  fileCardError: { borderColor: colors.expenseBorder },
  fileIcon: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  fileName: { fontSize: 13, fontWeight: '500', color: colors.textPrimary },
  fileMeta: { fontSize: 11, color: colors.income, marginTop: 2 },
  fileError: { fontSize: 11, color: colors.expenseDeep, marginTop: 2 },
  removeBtn: { padding: 8 },
  removeTxt: { fontSize: 14, color: colors.textFaint },
  bottomArea: { marginTop: 8 },
  reconCard: { backgroundColor: colors.card, borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: colors.cardBorder },
  reconTitle: { fontSize: 13, fontWeight: '600', color: colors.textPrimary, marginBottom: 10 },
  reconGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  reconCell: { flex: 1, alignItems: 'center' },
  reconLabel: { fontSize: 10, color: colors.textFaint, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 3, fontWeight: '600' },
  reconVal: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  reconAutoLine: { fontSize: 11, color: colors.ruleText, backgroundColor: colors.ruleBg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, textAlign: 'center', marginTop: 6, overflow: 'hidden' },
  reconHint: { fontSize: 11, color: colors.textFaint, marginTop: 8, lineHeight: 16 },
  reconRow: { flexDirection: 'row', marginTop: 4, alignItems: 'center' },
  reconIn: { fontSize: 10, color: colors.incomeDeep, fontWeight: '600', marginRight: 8 },
  reconOut: { fontSize: 10, color: colors.expenseDeep, fontWeight: '600', marginRight: 8 },
  reconAuto: { fontSize: 10, color: colors.ruleText, backgroundColor: colors.ruleBg, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 3, overflow: 'hidden', fontWeight: '600' },
  startBtn: { backgroundColor: colors.accent, borderRadius: 12, padding: 16, alignItems: 'center' },
  startText: { fontSize: 15, fontWeight: '600', color: colors.accentText },
});
