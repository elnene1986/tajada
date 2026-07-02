import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, TouchableOpacity, FlatList, TextInput, StyleSheet, SafeAreaView, Modal, Animated, Alert, ScrollView, Image } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { getSessions, saveSession } from '../utils/storage';
import { parseFile, sourceLabel } from '../parsers';
import { merchantKey, saveRule, getRules, applyRules } from '../utils/rules';
import { suggestForTransactions } from '../utils/categorizer';
import { classifyImport } from '../utils/importGuard';
import { categoriesForType, defaultCategoryKey, categoryLabel, categoryTip } from '../utils/categories';
import { captureReceipt, pickReceipt, deleteReceiptFile } from '../utils/receipts';
import { fmtCents, fmtCentsK } from '../utils/money';
import { colors } from '../theme';
import { t } from '../i18n';

// Money formatters take integer cents — see src/utils/money.js. Local
// aliases so the existing fmt(...) / fmtK(...) call sites need no
// renaming, only the input field changes from .amount → .amountCents.
var fmt = fmtCents;
var fmtK = fmtCentsK;
function pd(d) { var p = d.split('/'); return new Date(2000+parseInt(p[2]||'25'), parseInt(p[0])-1, parseInt(p[1])); }
function uid() { return 'xxxx-xxxx-xxxx'.replace(/x/g, function() { return ((Math.random()*16)|0).toString(16); }); }

var GENERIC = ['paypal withdrawal','check deposit','check deposit (mobile)','merchant transaction','monthly interest paid',
  'venmo transfer received','venmo payment sent','deposit from venmo cashout','atm withdrawal','debit card purchase',
  'instant transfer','standard transfer','direct deposit','wire transfer','ach payment','pos purchase','online payment'];

function recKey(d) {
  return d.toLowerCase().replace(/\d{1,2}\/\d{1,2}\/?\d{0,4}/g,'').replace(/\$[\d,.]+/g,'')
    .replace(/#\w+/g,'').replace(/mm[\w]+/gi,'').replace(/- walgreens.*$/i,'- walgreens')
    .replace(/bpf_dss_\S+/gi,'').replace(/\s+/g,' ').trim();
}

function isSpecific(d) {
  var k = recKey(d);
  for (var i = 0; i < GENERIC.length; i++) {
    var g = GENERIC[i];
    if (k.includes(g) || g.includes(k)) { if (k.replace(g,'').trim().length < 4) return false; }
  }
  return k.length >= 8;
}

export default function ReviewScreen({ navigation, route }) {
  var sessionId = route.params.sessionId;
  var [session, setSession] = useState(null);
  var [txns, setTxns] = useState([]);
  var [tab, setTab] = useState('income');
  var [search, setSearch] = useState('');
  var [modal, setModal] = useState(null);
  var [receiptView, setReceiptView] = useState(null);
  var [undo, setUndo] = useState(null);
  var [adding, setAdding] = useState(false);
  var undoOp = useRef(new Animated.Value(0)).current;
  var undoT = useRef(null);

  useEffect(function() { load(); }, [sessionId]);
  useEffect(function() {
    if (undo) {
      Animated.timing(undoOp, { toValue: 1, duration: 200, useNativeDriver: true }).start();
      if (undoT.current) clearTimeout(undoT.current);
      undoT.current = setTimeout(function() { Animated.timing(undoOp, { toValue: 0, duration: 200, useNativeDriver: true }).start(function() { setUndo(null); }); }, 5000);
    }
    return function() { if (undoT.current) clearTimeout(undoT.current); };
  }, [undo]);

  var load = async function() {
    var all = await getSessions();
    var found = all.find(function(x) { return x.id === sessionId; });
    if (found) { setSession(found); setTxns(found.transactions); }
  };

  var save = async function(updated) {
    if (!session) return;
    var u = Object.assign({}, session, {
      transactions: updated,
      excludedCount: updated.filter(function(t) { return !t.isBusiness; }).length,
      totalCount: updated.length,
      updatedAt: new Date().toISOString(),
    });
    setSession(u);
    await saveSession(u);
  };

  // ─── ADD ANOTHER FILE ──────────────────────
  var addAnotherFile = async function() {
    setAdding(true);
    try {
      var result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
      if (result.canceled) { setAdding(false); return; }
      var file = result.assets[0];
      var content = await FileSystem.readAsStringAsync(file.uri, { encoding: FileSystem.EncodingType.UTF8 });
      var parseResult = parseFile(content, file.name);

      if (parseResult.transactions.length === 0) {
        setAdding(false);
        Alert.alert(t('common.noTransactions'), t('review.noTxnBody', { name: file.name }));
        return;
      }

      // Auto-apply saved merchant rules to the freshly parsed rows
      // before the dedupe/merge step. This means a user who already
      // trained "Stripe → business / platform_fees" never sees those
      // rows unclassified again.
      var rules = await getRules();
      var applied = applyRules(parseResult.transactions, rules);
      // Category suggestions for expenses no rule covered — same pass
      // ImportScreen runs, so merged files behave identically.
      applied = { transactions: suggestForTransactions(applied.transactions).transactions };

      // Duplicate-import guard — compare against every existing session
      // (same date|amount|description key used everywhere), then merge
      // only genuinely new rows.
      var sessions = await getSessions();
      var guard = classifyImport(applied.transactions, sessions);

      if (guard.status === 'all_duplicate') {
        setAdding(false);
        Alert.alert(
          t('import.dupAllTitle'),
          guard.matchSessionName
            ? t('import.dupAllBody', { name: guard.matchSessionName })
            : t('import.dupAllBodyNoName'),
          [{ text: t('common.ok') }]
        );
        return;
      }

      var proceed = async function() {
        var newTxns = guard.newTxns;
        // Count auto-classified rows for the undo toast message.
        var autoCount = newTxns.filter(function(t) { return t.ruleApplied; }).length;
        var snap = txns.slice();
        var merged = txns.concat(newTxns);
        setTxns(merged);

        // Update session name to show multiple sources. sourceLabel()
        // translates the stable English source keys into Spanish.
        var sources = [];
        var seen = {};
        merged.forEach(function(t) { if (!seen[t.source]) { seen[t.source] = true; sources.push(t.source); } });
        var newSession = Object.assign({}, session, {
          name: sources.map(sourceLabel).join(' + ') + t('review.combinedSuffix'),
          transactions: merged,
          totalCount: merged.length,
          excludedCount: merged.filter(function(t) { return !t.isBusiness; }).length,
          updatedAt: new Date().toISOString(),
        });
        setSession(newSession);
        try {
          await saveSession(newSession);
        } catch (e) {
          Alert.alert(t('common.error'), t('review.addFileError', { msg: e.message || t('common.unknown') }));
        }
        setUndo({ prev: snap, label: file.name, count: newTxns.length, autoCount: autoCount, isMerge: true });
      };

      setAdding(false);

      if (guard.status === 'partial') {
        Alert.alert(
          t('import.dupPartialTitle'),
          t('import.dupPartialBody', { newCount: guard.newCount, dupCount: guard.duplicateCount }),
          [{ text: t('common.ok'), onPress: proceed }]
        );
        return;
      }

      // No overlap — merge normally.
      proceed();
    } catch (err) {
      setAdding(false);
      Alert.alert(t('common.error'), t('review.addFileError', { msg: err.message || t('common.unknown') }));
    }
  };

  var recMap = useMemo(function() {
    var m = {};
    txns.forEach(function(t) { if (!isSpecific(t.description)) return; var k = recKey(t.description); m[k] = (m[k]||0)+1; });
    return m;
  }, [txns]);

  var getSimilar = function(t) { if (!isSpecific(t.description)) return []; var k = recKey(t.description); return txns.filter(function(x) { return x.id !== t.id && recKey(x.description) === k; }); };
  var getRecCount = function(t) { if (!isSpecific(t.description)) return 1; return recMap[recKey(t.description)] || 1; };

  // `cat` carries the chosen category for business classifications; personal
  // classifications clear the category. We also stamp `ruleApplied: false`
  // on any transaction the user explicitly re-classifies so the UI can
  // stop showing the "auto-classified" hint once they've overridden it.
  var apply = function(ids, val, cat) {
    var st = new Set(ids);
    var u = txns.map(function(t) {
      if (!st.has(t.id)) return t;
      return Object.assign({}, t, {
        isBusiness: val,
        category: val ? (cat || t.category || t.suggestedCategory || defaultCategoryKey(t.type)) : null,
        ruleApplied: false,
      });
    });
    setTxns(u); save(u);
  };

  // ─── Receipt photos ──────────────────────────────────────────────
  // A receipt attaches to a single transaction (audit substantiation).
  // Separate from classify: the small 📎 button on each row opens these
  // options; the chosen image is copied to the app's private dir and its
  // local URI stored on the transaction as `receiptUri`.
  var setReceiptOnTxn = function(id, uri) {
    var u = txns.map(function(t) { return t.id === id ? Object.assign({}, t, { receiptUri: uri }) : t; });
    setTxns(u); save(u);
  };

  var handleReceiptResult = function(item, r) {
    if (r.ok) {
      if (item.receiptUri) deleteReceiptFile(item.receiptUri); // replacing
      setReceiptOnTxn(item.id, r.uri);
    } else if (r.reason === 'denied') {
      Alert.alert(t('receipt.deniedTitle'), t('receipt.deniedBody'));
    } else if (r.reason === 'error') {
      Alert.alert(t('receipt.errorTitle'), r.message || t('common.unknownError'));
    }
    // 'canceled' → no-op
  };

  var doCapture = async function(item) { handleReceiptResult(item, await captureReceipt(item.id)); };
  var doPick = async function(item) { handleReceiptResult(item, await pickReceipt(item.id)); };

  var chooseSource = function(item) {
    Alert.alert(t('receipt.optionsTitle'), t('receipt.optionsBody'), [
      { text: t('receipt.take'), onPress: function() { doCapture(item); } },
      { text: t('receipt.choose'), onPress: function() { doPick(item); } },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  };

  var removeReceipt = function(item) {
    Alert.alert(t('receipt.removeTitle'), t('receipt.removeBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: function() {
        deleteReceiptFile(item.receiptUri);
        setReceiptOnTxn(item.id, null);
      } },
    ]);
  };

  var openReceiptOptions = function(item) {
    if (item.receiptUri) {
      Alert.alert(t('receipt.optionsTitle'), t('receipt.optionsBodyAttached'), [
        { text: t('receipt.view'), onPress: function() { setReceiptView(item.receiptUri); } },
        { text: t('receipt.replace'), onPress: function() { chooseSource(item); } },
        { text: t('receipt.remove'), style: 'destructive', onPress: function() { removeReceipt(item); } },
        { text: t('common.cancel'), style: 'cancel' },
      ]);
    } else {
      chooseSource(item);
    }
  };

  var toggle = function(t) {
    var nv = !t.isBusiness;
    var sim = getSimilar(t);
    // Priority: explicit category > import-time suggestion > type default.
    var defaultCat = nv ? (t.category || t.suggestedCategory || defaultCategoryKey(t.type)) : null;
    if (sim.length > 0) {
      setModal({ txn: t, count: sim.length, nv: nv, category: defaultCat });
    } else {
      setUndo({ prev: txns.slice(), label: t.description.slice(0,30), count: 1 });
      apply([t.id], nv, defaultCat);
      // Persist a rule for this merchant so the next import auto-classifies.
      saveRule(merchantKey(t.description), nv, defaultCat, 'manual');
    }
  };

  var bulkChoice = function(all) {
    if (!modal) return;
    var snap = txns.slice();
    var cat = modal.nv ? modal.category : null;
    if (all) {
      var sim = getSimilar(modal.txn);
      var ids = [modal.txn.id].concat(sim.map(function(x) { return x.id; }));
      apply(ids, modal.nv, cat);
      setUndo({ prev: snap, label: modal.txn.description.slice(0,30), count: ids.length });
    } else {
      apply([modal.txn.id], modal.nv, cat);
      setUndo({ prev: snap, label: modal.txn.description.slice(0,30), count: 1 });
    }
    // Persist rule whether it was a bulk apply or a single tap — the
    // merchant still teaches us the same thing.
    saveRule(merchantKey(modal.txn.description), modal.nv, cat, 'manual');
    setModal(null);
  };

  var doUndo = function() { if (!undo) return; setTxns(undo.prev); save(undo.prev); Animated.timing(undoOp, { toValue: 0, duration: 150, useNativeDriver: true }).start(function() { setUndo(null); }); };

  var inc = txns.filter(function(t) { return t.type === 'credit'; });
  var exp = txns.filter(function(t) { return t.type === 'debit'; });
  var list = tab === 'income' ? inc : exp;
  var filtered = useMemo(function() {
    var r = list;
    if (search) { var q = search.toLowerCase(); r = r.filter(function(t) { return t.description.toLowerCase().includes(q); }); }
    return r.sort(function(a,b) { return pd(b.date) - pd(a.date); });
  }, [list, search]);

  var bizInc = inc.filter(function(t) { return t.isBusiness; }).reduce(function(s,t) { return s+t.amountCents; }, 0);
  var bizExp = exp.filter(function(t) { return t.isBusiness; }).reduce(function(s,t) { return s+t.amountCents; }, 0);

  // Get unique sources for badges
  var sources = [];
  var seenSrc = {};
  txns.forEach(function(t) { if (!seenSrc[t.source]) { seenSrc[t.source] = true; sources.push(t.source); } });

  if (!session) return null;

  return (
    <SafeAreaView style={s.container}>
      {/* Source badges */}
      {sources.length > 1 && (
        <View style={s.sourceRow}>
          {sources.map(function(src) {
            var count = txns.filter(function(t) { return t.source === src; }).length;
            return (
              <View key={src} style={s.sourcePill}>
                <Text style={s.sourcePillTxt}>{sourceLabel(src)} ({count})</Text>
              </View>
            );
          })}
        </View>
      )}

      {/* Summary cards */}
      <View style={s.summaryRow}>
        <View style={[s.sCard, { backgroundColor: colors.incomeBg }]}><Text style={[s.sLabel, { color: colors.incomeLabel }]}>{t('common.income')}</Text><Text style={[s.sVal, { color: colors.income }]}>{fmtK(bizInc)}</Text></View>
        <View style={[s.sCard, { backgroundColor: colors.expenseBg }]}><Text style={[s.sLabel, { color: colors.expenseLabel }]}>{t('common.expenses')}</Text><Text style={[s.sVal, { color: colors.expense }]}>{fmtK(bizExp)}</Text></View>
        <View style={[s.sCard, { backgroundColor: colors.infoBg }]}><Text style={[s.sLabel, { color: colors.infoText }]}>{t('review.profit')}</Text><Text style={[s.sVal, { color: colors.accent }]}>{fmtK(bizInc-bizExp)}</Text></View>
      </View>

      {/* Tabs */}
      <View style={s.tabRow}>
        {['income','expenses'].map(function(tabKey) {
          return (
            <TouchableOpacity key={tabKey} style={[s.tabBtn, tab===tabKey && s.tabActive]} onPress={function() { setTab(tabKey); }}>
              <Text style={[s.tabTxt, tab===tabKey && { color: colors.strongBtnText }]}>{tabKey==='income' ? t('review.tabIncome', { count: inc.length }) : t('review.tabExpenses', { count: exp.length })}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Search */}
      <TextInput style={s.search} placeholder={t('review.searchPlaceholder')} placeholderTextColor={colors.textFaint} value={search} onChangeText={setSearch} />

      <Text style={s.info}>{t('review.markedInfo', { biz: filtered.filter(function(x) { return x.isBusiness; }).length, total: filtered.length })}</Text>

      {/* Transaction list */}
      <FlatList data={filtered} keyExtractor={function(i) { return i.id; }} contentContainerStyle={{ paddingBottom: 140 }}
        renderItem={function(ref) {
          var item = ref.item;
          var rc = getRecCount(item);
          return (
            <TouchableOpacity style={[s.txn, { backgroundColor: item.isBusiness ? (tab==='income' ? colors.incomeBgSoft : colors.expenseTabBg) : colors.excludedBg, borderColor: item.isBusiness ? (tab==='income' ? colors.incomeBorder : colors.expenseTabBorder) : colors.excludedBorder, opacity: item.isBusiness ? 1 : 0.5 }]} onPress={function() { toggle(item); }}>
              <View style={[s.check, { backgroundColor: item.isBusiness ? (tab==='income' ? colors.incomeCheck : colors.expenseTab) : colors.excludedCheck }]}>
                <Text style={s.checkTxt}>{item.isBusiness ? '✓' : '✕'}</Text>
              </View>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={[s.txnDesc, !item.isBusiness && { textDecorationLine: 'line-through', color: colors.excludedText }]} numberOfLines={1}>{item.description}</Text>
                <View style={s.metaRow}>
                  <Text style={s.txnDate}>{item.date}</Text>
                  <View style={s.srcBadge}><Text style={s.srcTxt}>{sourceLabel(item.source)}</Text></View>
                  {rc > 1 && <View style={s.recBadge}><Text style={s.recTxt}>↻ {rc}x</Text></View>}
                  {item.isBusiness && item.category && (
                    <View style={s.catBadge}><Text style={s.catBadgeTxt}>{categoryLabel(item.category)}</Text></View>
                  )}
                  {item.ruleApplied && (
                    <View style={s.ruleBadge}><Text style={s.ruleBadgeTxt}>{t('review.autoBadge')}</Text></View>
                  )}
                </View>
              </View>
              <TouchableOpacity
                style={[s.receiptBtn, item.receiptUri && s.receiptBtnOn]}
                onPress={function() { openReceiptOptions(item); }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={[s.receiptBtnTxt, item.receiptUri && s.receiptBtnTxtOn]}>📎</Text>
              </TouchableOpacity>
              <Text style={[s.txnAmt, { color: item.isBusiness ? (tab==='income' ? colors.incomeStrong : colors.expenseTabStrong) : colors.excludedCheck }]}>{fmt(item.amountCents)}</Text>
            </TouchableOpacity>
          );
        }}
      />

      {/* Bottom bar */}
      <View style={s.bottomBar}>
        <View style={s.bottomRow}>
          <TouchableOpacity style={s.addBtn} onPress={addAnotherFile} disabled={adding}>
            <Text style={s.addBtnTxt}>{adding ? t('review.adding') : t('review.addFile')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.summaryBtn} onPress={function() { navigation.navigate('Summary', { sessionId: sessionId }); }}>
            <Text style={s.summaryBtnTxt}>{t('review.viewSummary')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Receipt viewer */}
      <Modal visible={!!receiptView} transparent animationType="fade" onRequestClose={function() { setReceiptView(null); }}>
        <TouchableOpacity style={s.receiptOverlay} activeOpacity={1} onPress={function() { setReceiptView(null); }}>
          {receiptView ? (
            <Image source={{ uri: receiptView }} style={s.receiptImage} resizeMode="contain" />
          ) : null}
          <Text style={s.receiptClose}>{t('common.done')}</Text>
        </TouchableOpacity>
      </Modal>

      {/* Bulk modal */}
      <Modal visible={!!modal} transparent animationType="fade" onRequestClose={function() { setModal(null); }}>
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={function() { setModal(null); }}>
          <View style={s.sheet}>
            <View style={s.handle} />
            <Text style={s.sheetTitle}>{modal && modal.nv === false ? t('review.markPersonal') : t('review.markBusiness')}</Text>
            <Text style={s.sheetDesc}>{t('review.similarFound', { count: (modal ? modal.count : 0)+1 })}</Text>

            {/* Category picker — only when marking business. We show
                chips horizontally; tapping one updates the modal's
                pending category, which flows through to bulkChoice(). */}
            {modal && modal.nv && (
              <View style={s.catSection}>
                <Text style={s.catLabel}>{t('review.category')}</Text>
                {/* Suggestion provenance — shown while the pre-selected
                    chip is still the import-time suggestion; disappears
                    as soon as the user picks a different one. */}
                {modal.txn.suggestedCategory
                  && !modal.txn.category
                  && modal.category === modal.txn.suggestedCategory && (
                  <Text style={s.catSuggestHint}>
                    {t('review.suggestedHint', { reason: modal.txn.suggestedReason || '' })}
                  </Text>
                )}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.catRow}>
                  {categoriesForType(modal.txn.type).map(function(c) {
                    var active = modal.category === c.key;
                    return (
                      <TouchableOpacity
                        key={c.key}
                        style={[s.catChip, active && s.catChipActive]}
                        onPress={function() { setModal(Object.assign({}, modal, { category: c.key })); }}
                      >
                        <Text style={[s.catChipTxt, active && s.catChipTxtActive]}>{c.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
                {/* Inline deductible tip — explains what belongs in the
                    selected category. Educational: helps creators catch
                    deductions they'd otherwise miss. */}
                {categoryTip(modal.category) ? (
                  <Text style={s.catTip}>{categoryTip(modal.category)}</Text>
                ) : null}
              </View>
            )}

            <TouchableOpacity style={s.sheetPrimary} onPress={function() { bulkChoice(true); }}>
              <Text style={s.sheetPrimaryTxt}>{t('review.applyAll', { count: (modal ? modal.count : 0)+1 })}</Text>
              <Text style={s.sheetPrimarySub}>{t('review.applyAllSub', { count: modal ? modal.count : 0 })}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.sheetSecondary} onPress={function() { bulkChoice(false); }}>
              <Text style={s.sheetSecondaryTxt}>{t('review.justThis')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Undo toast */}
      {undo && (
        <Animated.View style={[s.undoToast, { opacity: undoOp }]}>
          <Text style={s.undoTxt} numberOfLines={1}>{undo.isMerge ? (t('review.undoAdded', { count: undo.count, label: undo.label }) + (undo.autoCount > 0 ? t('review.undoAutoSuffix', { count: undo.autoCount }) : '')) : undo.count > 1 ? t('review.undoChangedMany', { count: undo.count }) : t('review.undoChangedOne', { label: undo.label })}</Text>
          <TouchableOpacity onPress={doUndo} style={s.undoBtn}><Text style={s.undoBtnTxt}>{t('review.undo')}</Text></TouchableOpacity>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

var s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.screenBg },
  sourceRow: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 8, flexWrap: 'wrap' },
  sourcePill: { backgroundColor: colors.infoBg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginRight: 6, marginBottom: 6 },
  sourcePillTxt: { fontSize: 11, fontWeight: '600', color: colors.infoText },
  summaryRow: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 8, marginBottom: 10 },
  sCard: { flex: 1, borderRadius: 8, padding: 10, alignItems: 'center', marginHorizontal: 3 },
  sLabel: { fontSize: 9, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  sVal: { fontSize: 18, fontWeight: '700', marginTop: 2 },
  tabRow: { flexDirection: 'row', marginHorizontal: 16, borderRadius: 8, overflow: 'hidden', borderWidth: 2, borderColor: colors.strongBtn, marginBottom: 8 },
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  tabActive: { backgroundColor: colors.strongBtn },
  tabTxt: { fontSize: 13, fontWeight: '600', color: colors.strongBtn },
  search: { marginHorizontal: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: colors.textPrimary, marginBottom: 6 },
  info: { fontSize: 11, color: colors.textFaint, marginHorizontal: 20, marginBottom: 6 },
  txn: { flexDirection: 'row', alignItems: 'center', padding: 10, marginHorizontal: 16, marginBottom: 4, borderRadius: 8, borderWidth: 1 },
  check: { width: 22, height: 22, borderRadius: 6, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  checkTxt: { color: colors.dangerText, fontSize: 12, fontWeight: '700' },
  txnDesc: { fontSize: 13, fontWeight: '500', color: colors.textPrimary },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  txnDate: { fontSize: 11, color: colors.textFaint, marginRight: 6 },
  srcBadge: { backgroundColor: colors.infoBg, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, marginRight: 4 },
  srcTxt: { fontSize: 9, fontWeight: '600', color: colors.infoText },
  recBadge: { backgroundColor: colors.recurringBg, paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 },
  recTxt: { fontSize: 8, fontWeight: '600', color: colors.recurringText },
  catBadge: { backgroundColor: colors.categoryBg, paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4, marginLeft: 4 },
  catBadgeTxt: { fontSize: 8, fontWeight: '600', color: colors.categoryText },
  ruleBadge: { backgroundColor: colors.ruleBg, paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4, marginLeft: 4 },
  ruleBadgeTxt: { fontSize: 8, fontWeight: '700', color: colors.ruleText, textTransform: 'uppercase', letterSpacing: 0.3 },
  catSection: { marginBottom: 16 },
  catLabel: { fontSize: 11, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, fontWeight: '600' },
  catSuggestHint: { fontSize: 11, color: colors.ruleText, backgroundColor: colors.ruleBg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, marginBottom: 8, overflow: 'hidden', alignSelf: 'flex-start' },
  catTip: { fontSize: 12, color: colors.textSecondary, lineHeight: 17, marginTop: 10 },
  receiptBtn: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginRight: 8, backgroundColor: colors.chipBg, borderWidth: 1, borderColor: colors.cardBorder },
  receiptBtnOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  receiptBtnTxt: { fontSize: 14, opacity: 0.5 },
  receiptBtnTxtOn: { opacity: 1 },
  receiptOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  receiptImage: { width: '100%', height: '82%' },
  receiptClose: { color: '#FFFFFF', fontSize: 15, fontWeight: '700', marginTop: 18, padding: 8 },
  catRow: { paddingRight: 8 },
  catChip: { backgroundColor: colors.chipBg, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8, marginRight: 6, borderWidth: 1, borderColor: colors.cardBorder },
  catChipActive: { backgroundColor: colors.infoBg, borderColor: colors.accent },
  catChipTxt: { fontSize: 12, color: colors.neutralMid, fontWeight: '500' },
  catChipTxtActive: { color: colors.infoText, fontWeight: '600' },
  txnAmt: { fontSize: 14, fontWeight: '700' },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, paddingBottom: 32, backgroundColor: colors.screenBg },
  bottomRow: { flexDirection: 'row' },
  addBtn: { backgroundColor: colors.card, borderRadius: 8, padding: 14, alignItems: 'center', marginRight: 8, borderWidth: 1.5, borderColor: colors.accent, flex: 1 },
  addBtnTxt: { fontSize: 14, fontWeight: '600', color: colors.accent },
  summaryBtn: { backgroundColor: colors.strongBtn, borderRadius: 8, padding: 14, alignItems: 'center', flex: 2 },
  summaryBtnTxt: { fontSize: 14, fontWeight: '600', color: colors.strongBtnText },
  overlay: { flex: 1, backgroundColor: colors.scrim, justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.cardBorder, alignSelf: 'center', marginBottom: 20 },
  sheetTitle: { fontSize: 18, fontWeight: '600', color: colors.textPrimary, marginBottom: 6 },
  sheetDesc: { fontSize: 13, color: colors.textSecondary, marginBottom: 20 },
  sheetPrimary: { backgroundColor: colors.accent, borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 8 },
  sheetPrimaryTxt: { fontSize: 15, fontWeight: '600', color: colors.accentText },
  sheetPrimarySub: { fontSize: 11, color: colors.heroCtaSub, marginTop: 2 },
  sheetSecondary: { backgroundColor: colors.chipBg, borderRadius: 12, padding: 14, alignItems: 'center' },
  sheetSecondaryTxt: { fontSize: 15, fontWeight: '500', color: colors.neutralStrong },
  undoToast: { position: 'absolute', bottom: 90, left: 16, right: 16, backgroundColor: colors.toastBg, borderRadius: 8, paddingVertical: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' },
  undoTxt: { flex: 1, fontSize: 13, color: colors.toastText },
  undoBtn: { backgroundColor: colors.accent, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 6 },
  undoBtnTxt: { fontSize: 13, fontWeight: '600', color: colors.accentText },
});
