
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { colors } from '../theme';
import { t } from '../i18n';

const SOURCES = [
  { key: 'Bank', label: t('source.bank.label'), sub: t('source.bank.sub') },
  { key: 'Credit Card', label: t('source.card.label'), sub: t('source.card.sub') },
  { key: 'Venmo', label: t('source.venmo.label'), sub: t('source.venmo.sub') },
  { key: 'PayPal', label: t('source.paypal.label'), sub: t('source.paypal.sub') },
  { key: 'Other', label: t('source.other.label'), sub: t('source.other.sub') },
];

export default function SourcePickerScreen({ navigation }) {
  return (
    <SafeAreaView style={s.container}>
      <Text style={s.title}>{t('source.title')}</Text>
      <Text style={s.subtitle}>{t('source.subtitle')}</Text>
      {SOURCES.map(src => (
        <TouchableOpacity key={src.key} style={s.card}
          onPress={() => navigation.navigate('Import', { source: src.key })}>
          <Text style={s.cardLabel}>{src.label}</Text>
          <Text style={s.cardSub}>{src.sub}</Text>
        </TouchableOpacity>
      ))}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.screenBg, paddingHorizontal: 20, paddingTop: 16 },
  title: { fontSize: 22, fontWeight: '600', color: colors.textPrimary },
  subtitle: { fontSize: 13, color: colors.textFaint, marginBottom: 20, marginTop: 4 },
  card: { backgroundColor: colors.card, borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: colors.cardBorder },
  cardLabel: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  cardSub: { fontSize: 11, color: colors.textFaint, marginTop: 2 },
});
