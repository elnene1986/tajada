// Bank export guide — brief 12. Renders the guides in src/data/bankGuides.js.
//
// Two states in one screen (no second route needed): a grid of bank
// names, and — once one is picked — its numbered steps with a back link.
// The screen is a dumb renderer; all copy lives in es.json so updating a
// stale guide never touches this file. Every guide ends with the same
// privacy reassurance line (brief 12's whole point: turn the manual step
// into a privacy feature, not a chore).

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { BANK_GUIDES } from '../data/bankGuides';
import { colors } from '../theme';
import { t } from '../i18n';

// Render a step string with **bold** segments (the button/menu names the
// user must find). Splitting on ** yields alternating plain/bold spans —
// odd indices are the emphasized ones. Keeps the guides as plain-string
// data while still bolding the load-bearing words (brief 12).
function renderRich(str) {
  return String(str).split('**').map(function(seg, i) {
    if (seg === '') return null;
    return i % 2 === 1
      ? <Text key={i} style={s.bold}>{seg}</Text>
      : <Text key={i}>{seg}</Text>;
  });
}

export default function BankGuideScreen() {
  var [selectedId, setSelectedId] = useState(null);
  var guide = selectedId
    ? BANK_GUIDES.find(function(g) { return g.id === selectedId; })
    : null;

  // Grid state — pick a bank.
  if (!guide) {
    return (
      <SafeAreaView style={s.container}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
          <Text style={s.subtitle}>{t('bankGuide.subtitle')}</Text>
          <View style={s.grid}>
            {BANK_GUIDES.map(function(g) {
              return (
                <TouchableOpacity key={g.id} style={s.bankCard} onPress={function() { setSelectedId(g.id); }} activeOpacity={0.8}>
                  <Text style={s.bankName}>{g.name}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Detail state — numbered steps for the chosen bank.
  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <TouchableOpacity onPress={function() { setSelectedId(null); }} activeOpacity={0.7}>
          <Text style={s.backLink}>{t('bankGuide.backToList')}</Text>
        </TouchableOpacity>

        <Text style={s.guideName}>{guide.name}</Text>

        <View style={s.steps}>
          {guide.steps.map(function(key, i) {
            return (
              <View key={key} style={s.stepRow}>
                <View style={s.stepNum}><Text style={s.stepNumTxt}>{i + 1}</Text></View>
                <Text style={s.stepTxt}>{renderRich(t(key))}</Text>
              </View>
            );
          })}
        </View>

        <View style={s.privacyBox}>
          <Text style={s.privacyTxt}>{t('bankGuide.privacyNote')}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

var s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.screenBg },
  subtitle: { fontSize: 14, color: colors.textSecondary, lineHeight: 20, marginBottom: 18 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  bankCard: { width: '48%', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 12, paddingVertical: 18, paddingHorizontal: 14, marginBottom: 12, alignItems: 'center', justifyContent: 'center' },
  bankName: { fontSize: 14, fontWeight: '600', color: colors.textPrimary, textAlign: 'center' },
  backLink: { fontSize: 13, color: colors.accent, fontWeight: '600', marginBottom: 14 },
  guideName: { fontSize: 22, fontWeight: '700', color: colors.textPrimary, letterSpacing: -0.4, marginBottom: 18 },
  steps: { marginBottom: 8 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  stepNum: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  stepNumTxt: { fontSize: 13, fontWeight: '700', color: colors.accentText },
  stepTxt: { flex: 1, fontSize: 14, color: colors.textPrimary, lineHeight: 21, marginTop: 2 },
  bold: { fontWeight: '700' },
  privacyBox: { backgroundColor: colors.incomeBg, borderRadius: 10, padding: 14, marginTop: 12 },
  privacyTxt: { fontSize: 12.5, color: colors.income, lineHeight: 18, fontWeight: '500' },
});
