import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Alert, ScrollView } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { getSessions, saveSession } from '../utils/storage';
import { categoryByKey } from '../utils/categories';
import { sourceLabel } from '../parsers';
import { isUnlocked } from '../utils/unlock';
import { getMileageState, totalMiles, totalDeduction, entriesForYear } from '../utils/mileage';
import Paywall from '../components/Paywall';
import { colors } from '../theme';
import brand from '../brand';
// `t` is the transactions array in this screen, so the i18n helper is
// imported under the alias `tr`.
import { t as tr } from '../i18n';

function fmt(n) { return '$' + Math.abs(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }

// Group a list of transactions by their creator category. Returns
// an array of { key, label, schedC, total, count } sorted descending
// by total. Uncategorized rows collapse into a single bucket so the
// PDF never hides them.
function groupByCategory(transactions) {
  var buckets = {};
  transactions.forEach(function(t) {
    var key = t.category || 'uncategorized';
    if (!buckets[key]) {
      var meta = categoryByKey(t.category);
      buckets[key] = {
        key: key,
        label: meta ? meta.label : tr('category.uncategorized'),
        schedC: meta ? meta.schedC : '',
        total: 0,
        count: 0,
      };
    }
    buckets[key].total += t.amount;
    buckets[key].count += 1;
  });
  return Object.keys(buckets).map(function(k) { return buckets[k]; })
    .sort(function(a, b) { return b.total - a.total; });
}

export default function SummaryScreen({ navigation, route }) {
  var sessionId = route.params.sessionId;
  var [session, setSession] = useState(null);

  // Paywall state. `pendingExport` remembers which export the user
  // initiated so we can re-trigger it after a successful purchase
  // without making them tap the button again.
  var [paywallOpen, setPaywallOpen] = useState(false);
  var pendingExport = useRef(null);

  // Mileage deduction — Schedule C Line 9. Loaded once per session
  // view, scoped to the current tax year. Surfaced both on-screen
  // and inside the exported PDF.
  var [mileage, setMileage] = useState({ miles: 0, deduction: 0, count: 0, rate: 0.70, year: new Date().getFullYear() });

  useEffect(function() { load(); }, [sessionId]);
  var load = async function() {
    var all = await getSessions();
    setSession(all.find(function(x) { return x.id === sessionId; }) || null);
    // Load the mileage for this session's tax year. Treat the
    // session as a single-year artifact for now; multi-year sessions
    // would need year-bucketing, which we can add when we have a
    // user who needs it.
    try {
      var st = await getMileageState();
      var year = new Date().getFullYear(); // matches taxYear used below
      var yearEntries = entriesForYear(st.entries, year);
      setMileage({
        miles: totalMiles(yearEntries),
        deduction: totalDeduction(yearEntries, st.ratePerMile),
        count: yearEntries.length,
        rate: st.ratePerMile,
        year: year,
      });
    } catch (e) { /* non-fatal */ }
  };

  // Gate helper. Pattern: every export function wraps its real body
  // in a check via this. If unlocked, run immediately. If not, stash
  // a re-run callback in pendingExport and open the paywall.
  var withUnlock = async function(action) {
    var unlocked = await isUnlocked();
    if (unlocked) { action(); return; }
    pendingExport.current = action;
    setPaywallOpen(true);
  };

  var onPaywallUnlocked = function() {
    setPaywallOpen(false);
    var fn = pendingExport.current;
    pendingExport.current = null;
    // Brief defer so the modal animation finishes before the share
    // sheet is presented (otherwise iOS occasionally swallows the
    // share sheet because two modals try to mount in the same tick).
    if (fn) setTimeout(fn, 250);
  };

  var onPaywallCancel = function() {
    setPaywallOpen(false);
    pendingExport.current = null;
  };

  if (!session) return null;
  var t = session.transactions;
  var bInc = t.filter(function(x) { return x.type === 'credit' && x.isBusiness; });
  var bExp = t.filter(function(x) { return x.type === 'debit' && x.isBusiness; });
  var totInc = bInc.reduce(function(s,x) { return s+x.amount; }, 0);
  var totExp = bExp.reduce(function(s,x) { return s+x.amount; }, 0);
  var net = totInc - totExp;
  var exInc = t.filter(function(x) { return x.type === 'credit' && !x.isBusiness; }).reduce(function(s,x) { return s+x.amount; }, 0);
  var exExp = t.filter(function(x) { return x.type === 'debit' && !x.isBusiness; }).reduce(function(s,x) { return s+x.amount; }, 0);
  var taxYear = '2025';

  var sources = [];
  var seenSrc = {};
  t.forEach(function(x) { if (!seenSrc[x.source]) { seenSrc[x.source] = true; sources.push(x.source); } });

  var bySource = sources.map(function(src) {
    var stxns = t.filter(function(x) { return x.source === src; });
    return {
      source: src,
      total: stxns.length,
      bizInc: stxns.filter(function(x) { return x.type === 'credit' && x.isBusiness; }).reduce(function(s,x) { return s+x.amount; }, 0),
      bizExp: stxns.filter(function(x) { return x.type === 'debit' && x.isBusiness; }).reduce(function(s,x) { return s+x.amount; }, 0),
    };
  });

  var exportPDF = async function() {
    var today = new Date();
    var dateStr = (today.getMonth()+1) + '/' + today.getDate() + '/' + today.getFullYear();

    var incRows = bInc.map(function(x) {
      return '<tr><td class="td">' + x.date + '</td><td class="td">' + x.description + '</td><td class="td" style="color:#888">' + sourceLabel(x.source) + '</td><td class="td amt" style="color:#059669">+' + fmt(x.amount) + '</td></tr>';
    }).join('');

    var expRows = bExp.map(function(x) {
      return '<tr><td class="td">' + x.date + '</td><td class="td">' + x.description + '</td><td class="td" style="color:#888">' + sourceLabel(x.source) + '</td><td class="td amt" style="color:#DC2626">-' + fmt(x.amount) + '</td></tr>';
    }).join('');

    // Category breakdown — the creator-specific addition. Each row
    // totals one category and shows its Schedule C line reference so
    // a user or their preparer can transcribe directly to the return.
    var incGroups = groupByCategory(bInc);
    var expGroups = groupByCategory(bExp);

    function groupRowsHtml(groups, color) {
      return groups.map(function(g) {
        return '<tr>'
          + '<td class="td" style="font-weight:600">' + g.label + '</td>'
          + '<td class="td" style="color:#888;font-size:10px">' + (g.schedC || '') + '</td>'
          + '<td class="td" style="color:#666;text-align:right">' + tr('summary.pdfTxnSuffix', { count: g.count }) + '</td>'
          + '<td class="td amt" style="color:' + color + '">' + fmt(g.total) + '</td>'
          + '</tr>';
      }).join('');
    }
    var incGroupRows = groupRowsHtml(incGroups, '#059669');
    var expGroupRows = groupRowsHtml(expGroups, '#DC2626');

    // Brand mark + wordmark for the PDF header — Tajada wedge glyph
    // + lowercase wordmark. (The SplitLedger-era dual-brand branch
    // was removed after the fork; src/brand/index.js now only exports
    // the Tajada brand.)
    // NOTE: the PDF body's data colors (income green / expense red)
    // are still literal hex; re-theming them for Tajada is a
    // follow-up, best done after the placeholder palette gets design
    // review.
    var brandMark = '<svg width="50" height="46" viewBox="0 0 240 220" style="vertical-align:middle;margin-right:14px">'
      + '<path d="M 32 18 L 132 18 L 198 84 L 198 188 A 32 32 0 0 1 166 220 L 32 220 A 32 32 0 0 1 0 188 L 0 50 A 32 32 0 0 1 32 18 Z" fill="#14100C"/>'
      + '<path d="M 148 0 L 232 0 A 8 8 0 0 1 240 8 L 240 60 Z" fill="#C99A2C"/>'
      + '</svg>';
    var brandWordmark = '<span style="font-size:32px;color:#14100C;font-weight:700;letter-spacing:-1px;vertical-align:middle">' + brand.displayName.toLowerCase() + '</span>';

    var html = '<html><head><meta charset="utf-8"><style>'
      // Force print engines to honor our pill fill colors instead of
      // stripping backgrounds for ink-saving. Without this, blue/green
      // pills can come out hollow on some PDF renderers.
      + '* { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }'
      + 'body { font-family: Helvetica, Arial, sans-serif; color: #111; padding: 0; margin: 0; }'
      + '.hdr { padding: 28px 32px; margin: 0; }'
      + '.hdr svg { vertical-align: middle; margin-right: 10px; }'
      + '.body { padding: 24px 32px; }'
      + '.cards { margin-bottom: 20px; }'
      + '.cards td { border-radius: 8px; padding: 14px 16px; text-align: center; }'
      + '.cards h4 { font-size: 9px; letter-spacing: 1px; margin: 0 0 4px; font-weight: bold; }'
      + '.cards p { font-size: 22px; font-weight: bold; margin: 0; }'
      + '.sec { font-size: 14px; font-weight: bold; margin: 24px 0 8px; padding-bottom: 6px; border-bottom: 2px solid #0B1D36; }'
      + '.th { padding: 6px 10px; font-size: 9px; color: #999; font-weight: bold; letter-spacing: 0.5px; text-align: left; border-bottom: 2px solid #DDD; }'
      + '.th-r { text-align: right; }'
      + '.td { padding: 6px 10px; font-size: 11px; border-bottom: 1px solid #EEE; }'
      + '.amt { text-align: right; font-weight: bold; }'
      + '.tot td { padding: 8px 10px; font-weight: bold; font-size: 12px; border-top: 2px solid #111; }'
      + '.ex { border: 1px solid #EEE; border-radius: 8px; padding: 12px 14px; margin: 16px 0; }'
      + '.ex h4 { font-size: 9px; color: #999; letter-spacing: 1px; margin: 0 0 6px; font-weight: bold; }'
      + '.ex-row { font-size: 11px; color: #666; margin-bottom: 3px; }'
      + '.sign td { width: 33%; padding-top: 4px; font-size: 9px; color: #999; border-top: 1px solid #CCC; }'
      + '.foot { margin-top: 32px; padding-top: 12px; border-top: 1px solid #DDD; font-size: 9px; color: #999; }'
      + '</style></head><body>'

      // Header — light theme so the PDF reads cleanly even when the
      // print engine strips background colors. Dashes are thicker and
      // use a dark slate gray, matching the "SplitLedger" text so the
      // mark reads as one cohesive unit. Logo is sized up so the
      // dashes don't disappear into sub-pixel anti-aliasing.
      + '<table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;border-bottom:1px solid #E2E8F0"><tr><td style="padding:28px 32px;background-color:#FFFFFF">'
      + brandMark
      + brandWordmark
      + '<div style="color:#94A3B8;font-size:10px;letter-spacing:1.5px;margin-top:10px;font-weight:600">' + tr('summary.pdfReportLabel', { year: taxYear }) + '</div>'
      + '</td></tr></table>'
      + '</div>'

      + '<div class="body">'

      // Summary cards
      + '<table class="cards" cellpadding="0" cellspacing="8" style="width:100%"><tr>'
      + '<td style="background-color:#ECFDF5;width:33%"><h4 style="color:#065F46">' + tr('summary.pdfBizIncome') + '</h4><p style="color:#059669">' + fmt(totInc) + '</p></td>'
      + '<td style="background-color:#FEF2F2;width:33%"><h4 style="color:#991B1B">' + tr('summary.pdfBizExpenses') + '</h4><p style="color:#DC2626">' + fmt(totExp) + '</p></td>'
      + '<td style="background-color:#EFF6FF;width:33%"><h4 style="color:#1E40AF">' + tr('summary.pdfNetProfit') + '</h4><p style="color:' + (net >= 0 ? '#2563EB' : '#DC2626') + '">' + (net < 0 ? '-' : '') + fmt(Math.abs(net)) + '</p></td>'
      + '</tr></table>'

      // Excluded
      + '<div class="ex"><h4>' + tr('summary.pdfExcludedHeader') + '</h4>'
      + '<div class="ex-row">' + tr('summary.pdfPersonalIncome', { amount: fmt(exInc), count: t.filter(function(x) { return x.type === 'credit' && !x.isBusiness; }).length }) + '</div>'
      + '<div class="ex-row">' + tr('summary.pdfPersonalExpenses', { amount: fmt(exExp), count: t.filter(function(x) { return x.type === 'debit' && !x.isBusiness; }).length }) + '</div>'
      + '</div>'

      // Mileage — Schedule C Line 9. Only render if the user actually
      // logged trips this year; an empty section in the PDF would
      // just be noise.
      + (mileage.count > 0 ? (
          '<div class="sec">' + tr('summary.mileageSectionTitle') + '</div>'
          + '<div class="ex">'
          + '<div class="ex-row" style="font-size:13px;color:#111;font-weight:600">'
          + tr('summary.mileageLine', { miles: String(mileage.miles), rate: mileage.rate.toFixed(3), deduction: fmt(mileage.deduction) })
          + '</div>'
          + '<div class="ex-row" style="margin-top:6px">'
          + tr('summary.mileageNote', { count: mileage.count, year: mileage.year })
          + '</div>'
          + '</div>'
        ) : '')

      // Schedule C-ready category breakdown
      + (incGroups.length > 0 ? (
          '<div class="sec">' + tr('summary.pdfIncomeByCategory') + '</div>'
          + '<table cellpadding="0" cellspacing="0" style="width:100%">'
          + '<tr><th class="th">' + tr('summary.pdfColCategory') + '</th><th class="th">' + tr('summary.pdfColSchedC') + '</th><th class="th" style="text-align:right">' + tr('summary.pdfColCount') + '</th><th class="th th-r">' + tr('summary.pdfColTotal') + '</th></tr>'
          + incGroupRows
          + '<tr class="tot"><td></td><td></td><td class="amt" style="color:#999;font-size:11px;font-weight:normal">' + tr('summary.pdfTotalIncome') + '</td><td class="amt" style="color:#059669">+' + fmt(totInc) + '</td></tr>'
          + '</table>'
        ) : '')
      + (expGroups.length > 0 ? (
          '<div class="sec">' + tr('summary.pdfExpensesByCategory') + '</div>'
          + '<table cellpadding="0" cellspacing="0" style="width:100%">'
          + '<tr><th class="th">' + tr('summary.pdfColCategory') + '</th><th class="th">' + tr('summary.pdfColSchedC') + '</th><th class="th" style="text-align:right">' + tr('summary.pdfColCount') + '</th><th class="th th-r">' + tr('summary.pdfColTotal') + '</th></tr>'
          + expGroupRows
          + '<tr class="tot"><td></td><td></td><td class="amt" style="color:#999;font-size:11px;font-weight:normal">' + tr('summary.pdfTotalExpenses') + '</td><td class="amt" style="color:#DC2626">-' + fmt(totExp) + '</td></tr>'
          + '</table>'
        ) : '')

      // Income table
      + '<div class="sec">' + tr('summary.pdfIncomeDetail', { count: bInc.length }) + '</div>'
      + '<table cellpadding="0" cellspacing="0" style="width:100%"><tr><th class="th">' + tr('summary.pdfColDate') + '</th><th class="th">' + tr('summary.pdfColDesc') + '</th><th class="th">' + tr('summary.pdfColSource') + '</th><th class="th th-r">' + tr('summary.pdfColAmount') + '</th></tr>'
      + incRows
      + '<tr class="tot"><td></td><td></td><td class="amt" style="color:#999;font-size:11px;font-weight:normal">' + tr('summary.pdfTotalIncome') + '</td><td class="amt" style="color:#059669">+' + fmt(totInc) + '</td></tr>'
      + '</table>'

      // Expenses table
      + '<div class="sec">' + tr('summary.pdfExpensesDetail', { count: bExp.length }) + '</div>'
      + '<table cellpadding="0" cellspacing="0" style="width:100%"><tr><th class="th">' + tr('summary.pdfColDate') + '</th><th class="th">' + tr('summary.pdfColDesc') + '</th><th class="th">' + tr('summary.pdfColSource') + '</th><th class="th th-r">' + tr('summary.pdfColAmount') + '</th></tr>'
      + expRows
      + '<tr class="tot"><td></td><td></td><td class="amt" style="color:#999;font-size:11px;font-weight:normal">' + tr('summary.pdfTotalExpenses') + '</td><td class="amt" style="color:#DC2626">-' + fmt(totExp) + '</td></tr>'
      + '</table>'

      // Signature
      + '<table style="width:100%;margin-top:50px" cellpadding="0" cellspacing="16"><tr>'
      + '<td class="sign">' + tr('summary.pdfSignReviewer') + '</td>'
      + '<td class="sign">' + tr('summary.pdfSignDate') + '</td>'
      + '<td class="sign">' + tr('summary.pdfSignPreparer') + '</td>'
      + '</tr></table>'

      // Footer
      + '<div class="foot">'
      + tr('summary.pdfFooter', { brand: brand.displayName, date: dateStr, total: t.length, biz: bInc.length + bExp.length }) + '<br>'
      + tr('summary.pdfDisclaimer')
      + '</div>'

      + '</div></body></html>';

    try {
      var fileName = brand.displayName + '_' + taxYear + '.pdf';
      var filePath = FileSystem.cacheDirectory + fileName;
      try { await FileSystem.deleteAsync(filePath, { idempotent: true }); } catch(e) {}
      var result = await Print.printToFileAsync({ html: html, base64: false });
      await FileSystem.moveAsync({ from: result.uri, to: filePath });
      await Sharing.shareAsync(filePath, { mimeType: 'application/pdf', dialogTitle: brand.displayName + ' ' + taxYear + ' Tax Report' });
    } catch (e) {
      try {
        var fallback = await Print.printToFileAsync({ html: html });
        await Sharing.shareAsync(fallback.uri, { mimeType: 'application/pdf' });
      } catch (e2) {
        Alert.alert(tr('common.error'), tr('summary.pdfError', { msg: e2.message || '' }));
      }
    }
  };

  var exportCSV = async function() {
    var biz = t.filter(function(x) { return x.isBusiness; });
    var csv = tr('summary.csvHeader') + '\n' + biz.map(function(x) {
      return '"' + x.date + '","' + x.description.replace(/"/g,'""') + '","' + sourceLabel(x.source) + '","' + x.type + '","' + (x.type==='debit'?'-':'') + x.amount.toFixed(2) + '"';
    }).join('\n');
    var csvName = brand.displayName + '_' + taxYear + '.csv';
    var csvPath = FileSystem.cacheDirectory + csvName;
    try {
      try { await FileSystem.deleteAsync(csvPath, { idempotent: true }); } catch(e) {}
      await FileSystem.writeAsStringAsync(csvPath, csv);
      await Sharing.shareAsync(csvPath, { mimeType: 'text/csv', dialogTitle: brand.displayName + ' ' + taxYear + ' Transactions' });
    } catch (e) {
      Alert.alert(tr('common.error'), tr('summary.csvError', { msg: e.message || '' }));
    }
  };

  var markDone = async function() {
    var u = Object.assign({}, session, { status: 'done', updatedAt: new Date().toISOString() });
    await saveSession(u);
    setSession(u);
  };

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
        <Text style={s.title}>{tr('summary.title')}</Text>
        <Text style={s.sub}>{tr('summary.sub', { name: session.name, count: t.length })}</Text>

        <View style={s.hero}>
          <Text style={s.heroLabel}>{tr('summary.netLabel')}</Text>
          <Text style={[s.heroVal, { color: net >= 0 ? colors.income : colors.expense }]}>{net < 0 ? '-' : ''}{fmt(Math.abs(net))}</Text>
          <Text style={s.heroSub}>{tr('summary.bizTxns', { count: bInc.length + bExp.length })}</Text>
        </View>

        <View style={s.gridRow}>
          <View style={[s.gridCard, { borderColor: colors.incomeBorder }]}>
            <Text style={[s.gridLabel, { color: colors.incomeLabel }]}>{tr('summary.bizIncome')}</Text>
            <Text style={[s.gridVal, { color: colors.income }]}>{fmt(totInc)}</Text>
            <Text style={s.gridSub}>{tr('home.txnCount', { count: bInc.length })}</Text>
          </View>
          <View style={[s.gridCard, { borderColor: colors.expenseBorder }]}>
            <Text style={[s.gridLabel, { color: colors.expenseLabel }]}>{tr('summary.bizExpenses')}</Text>
            <Text style={[s.gridVal, { color: colors.expense }]}>{fmt(totExp)}</Text>
            <Text style={s.gridSub}>{tr('home.txnCount', { count: bExp.length })}</Text>
          </View>
        </View>

        {bySource.length > 1 && (
          <View style={s.sourceCard}>
            <Text style={s.sourceTitle}>{tr('summary.bySource')}</Text>
            {bySource.map(function(src) {
              return (
                <View key={src.source} style={s.sourceRow}>
                  <Text style={s.sourceName}>{sourceLabel(src.source)}</Text>
                  <Text style={s.sourceCount}>{tr('summary.txnsShort', { count: src.total })}</Text>
                  <Text style={[s.sourceAmt, { color: colors.income }]}>{fmt(src.bizInc)}</Text>
                  <Text style={[s.sourceAmt, { color: colors.expense }]}>{fmt(src.bizExp)}</Text>
                </View>
              );
            })}
          </View>
        )}

        <View style={s.exCard}>
          <Text style={s.exTitle}>{tr('summary.excludedTitle')}</Text>
          <View style={s.exRow}><Text style={s.exLabel}>{tr('summary.incomeRemoved')}</Text><Text style={s.exVal}>{fmt(exInc)}</Text></View>
          <View style={s.exRow}><Text style={s.exLabel}>{tr('summary.expensesRemoved')}</Text><Text style={s.exVal}>{fmt(exExp)}</Text></View>
        </View>

        {/* Mileage callout — only shown when the user has logged trips
            for this tax year. The on-screen card mirrors the PDF
            section so what the user sees is what they export. */}
        {mileage.count > 0 && (
          <View style={s.mileageCard}>
            <Text style={s.mileageTitle}>{tr('summary.mileageSectionTitle')}</Text>
            <Text style={s.mileageLine}>
              {tr('summary.mileageLine', {
                miles: String(mileage.miles),
                rate: mileage.rate.toFixed(3),
                deduction: fmt(mileage.deduction),
              })}
            </Text>
            <Text style={s.mileageNote}>
              {tr('summary.mileageNote', { count: mileage.count, year: mileage.year })}
            </Text>
          </View>
        )}

        <View style={s.exportRow}>
          <TouchableOpacity style={s.pdfBtn} onPress={function() { withUnlock(exportPDF); }}>
            <Text style={[s.exportTxt, { color: colors.accentText }]}>{tr('summary.exportPdf')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.csvBtn} onPress={function() { withUnlock(exportCSV); }}>
            <Text style={[s.exportTxt, { color: colors.strongBtnText }]}>{tr('summary.exportCsv')}</Text>
          </TouchableOpacity>
        </View>

        {session.status !== 'done' && (
          <TouchableOpacity style={s.doneBtn} onPress={markDone}><Text style={[s.exportTxt, { color: colors.accentText }]}>{tr('summary.markDone')}</Text></TouchableOpacity>
        )}
      </ScrollView>

      {/* One-time IAP paywall — gates both export buttons. After a
          successful purchase / restore, the pending export re-fires
          automatically so the user doesn't have to tap again. */}
      <Paywall
        visible={paywallOpen}
        onUnlocked={onPaywallUnlocked}
        onCancel={onPaywallCancel}
      />
    </SafeAreaView>
  );
}

var s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.screenBg },
  title: { fontSize: 22, fontWeight: '600', color: colors.textPrimary },
  sub: { fontSize: 13, color: colors.textFaint, marginTop: 4, marginBottom: 20 },
  hero: { backgroundColor: colors.heroBg, borderRadius: 16, padding: 20, alignItems: 'center', marginBottom: 16 },
  heroLabel: { fontSize: 9, color: colors.heroTextFaint, textTransform: 'uppercase', letterSpacing: 1 },
  heroVal: { fontSize: 32, fontWeight: '700', marginTop: 4 },
  heroSub: { fontSize: 11, color: colors.heroTextLabel, marginTop: 4 },
  gridRow: { flexDirection: 'row', marginBottom: 12 },
  gridCard: { flex: 1, backgroundColor: colors.card, borderRadius: 8, padding: 12, alignItems: 'center', borderWidth: 1, marginHorizontal: 4 },
  gridLabel: { fontSize: 9, fontWeight: '600', textTransform: 'uppercase' },
  gridVal: { fontSize: 18, fontWeight: '700', marginTop: 2 },
  gridSub: { fontSize: 11, color: colors.textFaint, marginTop: 2 },
  sourceCard: { backgroundColor: colors.card, borderRadius: 8, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: colors.cardBorder },
  sourceTitle: { fontSize: 9, color: colors.textFaint, textTransform: 'uppercase', marginBottom: 8, letterSpacing: 1 },
  sourceRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  sourceName: { flex: 2, fontSize: 13, fontWeight: '500', color: colors.textPrimary },
  sourceCount: { flex: 1, fontSize: 11, color: colors.textFaint, textAlign: 'center' },
  sourceAmt: { flex: 1, fontSize: 11, fontWeight: '600', textAlign: 'right' },
  exCard: { backgroundColor: colors.card, borderRadius: 8, padding: 12, marginBottom: 20, borderWidth: 1, borderColor: colors.cardBorder },
  exTitle: { fontSize: 9, color: colors.textFaint, textTransform: 'uppercase', marginBottom: 8 },
  exRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  exLabel: { fontSize: 13, color: colors.textSecondary },
  exVal: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  mileageCard: { backgroundColor: colors.incomeBg, borderRadius: 8, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: colors.incomeBorder },
  mileageTitle: { fontSize: 10, color: colors.incomeLabel, textTransform: 'uppercase', letterSpacing: 1, fontWeight: '700', marginBottom: 6 },
  mileageLine: { fontSize: 14, color: colors.textPrimary, fontWeight: '700' },
  mileageNote: { fontSize: 11, color: colors.textSecondary, marginTop: 4, lineHeight: 15 },
  exportRow: { flexDirection: 'row', marginBottom: 8 },
  pdfBtn: { flex: 1, backgroundColor: colors.accent, borderRadius: 8, padding: 14, alignItems: 'center', marginRight: 4 },
  csvBtn: { flex: 1, backgroundColor: colors.strongBtn, borderRadius: 8, padding: 14, alignItems: 'center', marginLeft: 4 },
  exportTxt: { fontSize: 13, fontWeight: '600' },
  doneBtn: { backgroundColor: colors.income, borderRadius: 8, padding: 14, alignItems: 'center' },
});
