// The one screenshot-able moment (brief 06): a clean year-summary card a
// creator can post to their story — "lo que Tajada me encontró este año."
// Rendered off-screen by HomeScreen and captured with react-native-view-shot,
// then shared via expo-sharing.
//
// LIGHT THEME ONLY (brief 06). This is a shared artifact — it must read
// the same in anyone's feed regardless of the sender's app theme. So the
// palette is PINNED to the Tajada light (paper/ink/saffron) values rather
// than pulled from `colors`, which will flip when brief 11 (dark mode)
// lands. Do NOT swap these for theme tokens.
//
// "Potenciales" and "(est.)" are load-bearing (brief 06 compliance): the
// card shows a number the USER produced by marking things negocio, never
// a promised refund. The disclaimer line stays on the card.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { fmtCents } from '../utils/money';
import { t } from '../i18n';

// Pinned light palette — see header. Sourced from src/brand/tajada.js.
var L = {
  paper: '#F2E9D8',
  card: '#F9F3E4',
  border: '#D4C9AE',
  ink: '#14100C',
  inkSoft: '#4A3F32',
  inkFaint: '#8A7C66',
  saffron: '#C99A2C',
  gold: '#A87E1F',
  goldDeep: '#6E5414',
};

// Fixed width so the captured image is consistent across devices.
export var SHARE_CARD_WIDTH = 340;

export default function ShareSummaryCard({ year, deductionsCents, savingsCents, ratePct, categories, brandName }) {
  return (
    <View style={s.card}>
      <Text style={s.brand}>{brandName}</Text>
      <Text style={s.yearLabel}>{t('shareCard.yearLabel', { year: year })}</Text>

      <Text style={s.bigNumber}>{fmtCents(deductionsCents)}</Text>
      <Text style={s.bigLabel}>{t('shareCard.deductionsLabel')}</Text>

      <View style={s.savingsPill}>
        <Text style={s.savingsTxt}>{t('shareCard.savings', { amount: fmtCents(savingsCents), rate: ratePct })}</Text>
      </View>

      {categories && categories.length > 0 && (
        <View style={s.catBlock}>
          <Text style={s.catHeader}>{t('shareCard.topLabel')}</Text>
          {categories.map(function(c, i) {
            return (
              <View key={i} style={s.catRow}>
                <Text style={s.catName} numberOfLines={1}>{c.label}</Text>
                <Text style={s.catAmount}>{fmtCents(c.deductionsCents)}</Text>
              </View>
            );
          })}
        </View>
      )}

      <Text style={s.disclaimer}>{t('shareCard.disclaimer')}</Text>
    </View>
  );
}

var s = StyleSheet.create({
  card: { width: SHARE_CARD_WIDTH, backgroundColor: L.paper, borderRadius: 20, padding: 26, borderWidth: 1, borderColor: L.border },
  brand: { fontSize: 20, fontWeight: '700', color: L.ink, letterSpacing: -0.4 },
  yearLabel: { fontSize: 11, color: L.inkFaint, letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 2, marginBottom: 22 },
  bigNumber: { fontSize: 40, fontWeight: '800', color: L.goldDeep, letterSpacing: -1 },
  bigLabel: { fontSize: 14, color: L.inkSoft, marginTop: 2 },
  savingsPill: { alignSelf: 'flex-start', backgroundColor: L.card, borderWidth: 1, borderColor: L.saffron, borderRadius: 20, paddingVertical: 7, paddingHorizontal: 13, marginTop: 16 },
  savingsTxt: { fontSize: 13, color: L.gold, fontWeight: '600' },
  catBlock: { marginTop: 24 },
  catHeader: { fontSize: 10, color: L.inkFaint, letterSpacing: 1, textTransform: 'uppercase', fontWeight: '700', marginBottom: 10 },
  catRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  catName: { flex: 1, fontSize: 14, color: L.ink, marginRight: 12 },
  catAmount: { fontSize: 14, color: L.inkSoft, fontWeight: '600' },
  disclaimer: { fontSize: 10, color: L.inkFaint, lineHeight: 15, marginTop: 22 },
});
