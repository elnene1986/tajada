// DisclaimerModal — one-time first-launch tax-advice disclaimer.
//
// Shown once after onboarding (or on first launch for users who already
// completed onboarding before this modal was introduced). The user must
// tap "Entendido" to proceed; the app writes `disclaimer_seen.flag` so
// it never appears again. No skip, no dismiss-by-backdrop — acceptance
// is required to reduce liability exposure.

import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing, radii, fontSizes, fontWeights } from '../theme';
import { t } from '../i18n';

export default function DisclaimerModal({ visible, onAccept }) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.card}>

          <View style={styles.iconWrap}>
            <Text style={styles.icon}>📋</Text>
          </View>

          <Text style={styles.title}>{t('disclaimer.title')}</Text>

          <Text style={styles.body}>
            {t('disclaimer.bodyPre')}
            <Text style={styles.bold}>{t('disclaimer.bodyBold')}</Text>
            {t('disclaimer.bodyPost')}
          </Text>

          <TouchableOpacity
            style={styles.btn}
            onPress={onAccept}
            activeOpacity={0.85}
          >
            <Text style={styles.btnText}>{t('disclaimer.cta')}</Text>
          </TouchableOpacity>

        </View>
      </View>
    </Modal>
  );
}

var styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(20,16,12,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    padding: spacing.xxl,
    width: '100%',
    maxWidth: 380,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  iconWrap: {
    marginBottom: spacing.md,
  },
  icon: {
    fontSize: 28,
  },
  title: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  body: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.xxl,
  },
  bold: {
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
  },
  btn: {
    backgroundColor: colors.strongBtn,
    borderRadius: radii.pill,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  btnText: {
    color: colors.strongBtnText,
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold,
    letterSpacing: 0.3,
  },
});
