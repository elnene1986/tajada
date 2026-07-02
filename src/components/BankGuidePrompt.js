// Shared "learn how to export your file" affordance (brief 12). Two
// surfaces present it so they read as one visual language — soft gold
// with a saffron accent:
//   • Import screen empty state — the full card (icon + title + subtitle).
//   • Home "Cómo funciona" step 1 — the compact row, an inset inside the
//     step card where the first-import anxiety actually lives.
// `compact` picks the row form; `style` lets the caller add layout margins
// without baking them into the shared look.

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../theme';

export default function BankGuidePrompt({ title, subtitle, onPress, compact, style }) {
  if (compact) {
    return (
      <TouchableOpacity style={[s.row, style]} onPress={onPress} activeOpacity={0.8}>
        <Text style={s.rowTxt}>{title}</Text>
      </TouchableOpacity>
    );
  }
  return (
    <TouchableOpacity style={[s.card, style]} onPress={onPress} activeOpacity={0.85}>
      <View style={s.icon}><Text style={s.iconTxt}>?</Text></View>
      <View style={{ flex: 1 }}>
        <Text style={s.title}>{title}</Text>
        {subtitle ? <Text style={s.sub}>{subtitle}</Text> : null}
      </View>
      <Text style={s.chevron}>›</Text>
    </TouchableOpacity>
  );
}

var s = StyleSheet.create({
  // Full card — Import empty state.
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.incomeBg, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 14 },
  icon: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  iconTxt: { fontSize: 18, fontWeight: '800', color: colors.accentText, marginTop: -1 },
  title: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  sub: { fontSize: 12, color: colors.textSecondary, marginTop: 2, lineHeight: 16 },
  chevron: { fontSize: 20, color: colors.incomeDeep, marginLeft: 8 },
  // Compact row — inset inside the Home step-1 card. Same soft gold, but
  // a single tappable line rather than a standalone card.
  row: { backgroundColor: colors.incomeBg, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 10, marginTop: 10 },
  rowTxt: { fontSize: 12.5, fontWeight: '700', color: colors.incomeStrong },
});
