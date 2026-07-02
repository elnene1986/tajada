// Share screen (brief 09) — shown when the user taps "Enviar a tu
// preparador". Instead of dumping a bare file into the share sheet, it
// frames the hand-off: brief-03 voice, a preview of what's included, and
// the pre-written message the user can send alongside the PDF. Confirming
// runs the PDF export + native share sheet (owned by SummaryScreen).
//
// Note: expo-sharing shares the file only — it can't embed a text body —
// so the suggested message is shown here for the user to paste into
// WhatsApp/email. The PDF footer (summary.pdfPreparerAttribution) is what
// actually carries the brand into the preparer's inbox.

import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../theme';
import { t } from '../i18n';

export default function ShareSheet({ visible, year, onConfirm, onCancel, onDismiss }) {
  return (
    // onDismiss (iOS) fires after the Modal has fully left the screen —
    // the caller uses it to present the native share sheet, which iOS
    // refuses to do while this Modal is still up.
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel} onDismiss={onDismiss}>
      <View style={s.scrim}>
        <View style={s.sheet}>
          <Text style={s.title}>{t('share.title')}</Text>
          <Text style={s.subtitle}>{t('share.subtitle')}</Text>

          <Text style={s.included}>{t('share.included', { year: year })}</Text>

          <Text style={s.msgLabel}>{t('share.messageLabel')}</Text>
          <View style={s.msgBox}>
            <Text style={s.msgText}>{t('share.message', { year: year })}</Text>
          </View>

          <TouchableOpacity style={s.cta} onPress={onConfirm} activeOpacity={0.85}>
            <Text style={s.ctaText}>{t('share.cta')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.cancel} onPress={onCancel}>
            <Text style={s.cancelText}>{t('common.cancel')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

var s = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: colors.scrim, justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.screenBg, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 34 },
  title: { fontSize: 22, fontWeight: '700', color: colors.textPrimary, letterSpacing: -0.4 },
  subtitle: { fontSize: 15, color: colors.textSecondary, marginTop: 4 },
  included: { fontSize: 13, color: colors.textFaint, marginTop: 16, lineHeight: 19 },
  msgLabel: { fontSize: 10, color: colors.heroTextLabel, letterSpacing: 1, textTransform: 'uppercase', marginTop: 20, marginBottom: 6 },
  msgBox: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 14 },
  msgText: { fontSize: 14, color: colors.textPrimary, fontStyle: 'italic' },
  cta: { backgroundColor: colors.accent, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 24 },
  ctaText: { fontSize: 16, fontWeight: '600', color: colors.accentText },
  cancel: { paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  cancelText: { fontSize: 14, color: colors.textFaint },
});
