// Settings screen — decision B3. A deliberately minimal home for the
// prefs later briefs need a place to live (07/10/11 all want a row and
// none existed). v1 ships exactly two things:
//
//   1. Effective tax rate for the "deducciones potenciales" counter
//      (brief 06) — three presets, persisted, with the estimate/not-
//      advice disclaimer.
//   2. An info section — app version, links to the privacy/support
//      pages, and a shortcut into the existing encrypted-backup screen.
//
// Nothing speculative. Rows get added here as briefs land.

import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Linking } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Constants from 'expo-constants';
import { getSettings, setEffectiveRate } from '../utils/settings';
import { RATE_PRESETS } from '../utils/deductions';
import { PRIVACY_URL, SUPPORT_URL } from '../config/links';
import { colors } from '../theme';
import { t } from '../i18n';

function pct(rate) { return Math.round(rate * 100); }

export default function SettingsScreen({ navigation }) {
  var [rate, setRate] = useState(null);

  useFocusEffect(useCallback(function() {
    getSettings().then(function(s) { setRate(s.effectiveRate); });
  }, []));

  var chooseRate = function(preset) {
    setRate(preset); // optimistic — the write is fire-and-forget below
    setEffectiveRate(preset);
  };

  var version = (Constants.expoConfig && Constants.expoConfig.version)
    || (Constants.manifest && Constants.manifest.version)
    || '1.0.0';

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>

        {/* Effective-rate section — feeds the Home counter's savings
            estimate. Persisted immediately on tap. */}
        <Text style={s.sectionLabel}>{t('settings.rateTitle')}</Text>
        <Text style={s.sectionSub}>{t('settings.rateSub')}</Text>

        <View style={s.rateRow}>
          {RATE_PRESETS.map(function(preset) {
            var selected = rate !== null && Math.abs(rate - preset) < 0.0001;
            return (
              <TouchableOpacity
                key={preset}
                style={[s.rateChip, selected && s.rateChipOn]}
                onPress={function() { chooseRate(preset); }}
                activeOpacity={0.85}
              >
                <Text style={[s.rateChipTxt, selected && s.rateChipTxtOn]}>{pct(preset)}%</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={s.disclaimer}>{t('settings.rateDisclaimer')}</Text>

        {/* Info section — version, public pages, backup shortcut. */}
        <Text style={[s.sectionLabel, { marginTop: 32 }]}>{t('settings.infoTitle')}</Text>

        <TouchableOpacity style={s.infoRow} onPress={function() { navigation.navigate('Backup'); }} activeOpacity={0.7}>
          <Text style={s.infoRowText}>{t('settings.backupLink')}</Text>
          <Text style={s.infoRowChevron}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.infoRow} onPress={function() { Linking.openURL(PRIVACY_URL); }} activeOpacity={0.7}>
          <Text style={s.infoRowText}>{t('settings.privacyLink')}</Text>
          <Text style={s.infoRowChevron}>↗</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.infoRow} onPress={function() { Linking.openURL(SUPPORT_URL); }} activeOpacity={0.7}>
          <Text style={s.infoRowText}>{t('settings.supportLink')}</Text>
          <Text style={s.infoRowChevron}>↗</Text>
        </TouchableOpacity>

        <Text style={s.version}>{t('settings.version', { version: version })}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

var s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.screenBg },
  sectionLabel: { fontSize: 10, color: colors.textFaint, letterSpacing: 1, textTransform: 'uppercase', fontWeight: '700', marginBottom: 6 },
  sectionSub: { fontSize: 13, color: colors.textSecondary, lineHeight: 18, marginBottom: 14 },
  rateRow: { flexDirection: 'row', marginBottom: 12 },
  rateChip: { flex: 1, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginHorizontal: 4 },
  rateChipOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  rateChipTxt: { fontSize: 16, fontWeight: '700', color: colors.textSecondary },
  rateChipTxtOn: { color: colors.accentText },
  disclaimer: { fontSize: 11, color: colors.textFaint, lineHeight: 16 },
  infoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 10, paddingVertical: 14, paddingHorizontal: 14, marginBottom: 8 },
  infoRowText: { fontSize: 14, color: colors.textPrimary, fontWeight: '500' },
  infoRowChevron: { fontSize: 16, color: colors.textFaint },
  version: { fontSize: 11, color: colors.textFaint, textAlign: 'center', marginTop: 18 },
});
