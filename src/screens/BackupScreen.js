// Encrypted backup + restore screen.
//
// Two flows live here:
//   CREATE  → user enters a passphrase (+ confirm + optional hint),
//             we encrypt all on-device state, write the envelope file
//             to the cache directory, and hand it off to expo-sharing
//             so the user picks where it goes (iCloud Drive, Google
//             Drive, email, AirDrop, anywhere). We never see the file
//             after that — it lives only where the user puts it.
//   RESTORE → user picks the backup file with DocumentPicker, enters
//             the passphrase, we decrypt and bulk-replace local state
//             after explicit confirmation.
//
// The two flows share a screen instead of being separate routes
// because they share the same passphrase input widget and the same
// strength/validation feedback — splitting would just duplicate code.

import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView,
  ScrollView, ActivityIndicator, Alert, Platform,
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { getSessions, setAllSessions } from '../utils/storage';
import { getRules, setAllRules } from '../utils/rules';
import {
  createBackup, restoreBackup, inspectBackup,
  validatePassphrase, passphraseStrength, MIN_PASSPHRASE_LENGTH,
} from '../utils/backup';
import { recordBackupSuccess } from '../utils/backupMeta';
import { colors } from '../theme';
import { t } from '../i18n';

function todayFilename() {
  var d = new Date();
  var pad = function(n) { return n < 10 ? '0' + n : '' + n; };
  return 'tajada-respaldo-' + d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + '.tajada.json';
}

// Map raw error keys (thrown by backup.js / restoreBackup) to the
// localized message we should show the user. Centralized so the
// screen's render logic stays readable.
function localizeError(err) {
  var msg = (err && err.message) || '';
  if (msg === 'not_a_tajada_backup') return t('backup.errNotBackup');
  if (msg === 'wrong_passphrase_or_corrupted') return t('backup.errWrongPass');
  if (msg === 'unsupported_schema_version') return t('backup.errFormat');
  if (msg === 'invalid_backup_file' || msg === 'invalid_backup_contents') return t('backup.errInvalidFile');
  if (msg === 'passphrase_too_short') return t('backup.passTooShort', { min: MIN_PASSPHRASE_LENGTH });
  if (msg === 'passphrase_required') return t('backup.passTooShort', { min: MIN_PASSPHRASE_LENGTH });
  return msg || t('common.unknownError');
}

export default function BackupScreen({ navigation }) {
  // ── Backup-side state ──
  var [pass, setPass] = useState('');
  var [passConfirm, setPassConfirm] = useState('');
  var [hint, setHint] = useState('');
  var [showPass, setShowPass] = useState(false);
  var [busy, setBusy] = useState(false);
  var [error, setError] = useState('');

  // ── Restore-side state ──
  var [restorePass, setRestorePass] = useState('');
  var [restoreBusy, setRestoreBusy] = useState(false);
  var [restoreError, setRestoreError] = useState('');
  var [pendingRestore, setPendingRestore] = useState(null); // { envelopeJson, meta }

  var strength = passphraseStrength(pass);

  // ── CREATE ────────────────────────────────────────────────────
  var doCreate = async function() {
    setError('');
    var check = validatePassphrase(pass);
    if (!check.ok) {
      setError(t('backup.passTooShort', { min: MIN_PASSPHRASE_LENGTH }));
      return;
    }
    if (pass !== passConfirm) {
      setError(t('backup.passMismatch'));
      return;
    }
    setBusy(true);
    try {
      // Gather all on-device state in one snapshot. The hint is
      // stored in the envelope (cleartext) so the user can see it
      // when they're trying to remember the passphrase.
      var state = {
        sessions: await getSessions(),
        rules: await getRules(),
        hint: hint ? String(hint).slice(0, 80) : undefined,
      };
      var envelope = await createBackup(state, pass);

      // Write to cache (not documentDirectory) so iOS can clean it
      // up after the share completes. The user's actual backup
      // lives wherever they save it via the share sheet.
      var filename = todayFilename();
      var path = FileSystem.cacheDirectory + filename;
      try { await FileSystem.deleteAsync(path, { idempotent: true }); } catch (e) {}
      await FileSystem.writeAsStringAsync(path, envelope);

      var canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        setBusy(false);
        Alert.alert(t('common.error'), t('backup.errShareUnavailable'));
        return;
      }
      // Clear the form before sharing so if the user re-enters the
      // screen post-share they're not staring at their old passphrase.
      setPass('');
      setPassConfirm('');
      setHint('');
      setBusy(false);
      // Record success BEFORE sharing — if the user cancels the share
      // sheet the encrypted file still exists locally and counts as
      // "backed up." The user can re-share it later from their cloud.
      await recordBackupSuccess();
      await Sharing.shareAsync(path, {
        mimeType: 'application/json',
        dialogTitle: t('backup.shareDialogTitle'),
        UTI: 'public.json',
      });
    } catch (err) {
      setBusy(false);
      setError(localizeError(err));
    }
  };

  // ── RESTORE: pick file ────────────────────────────────────────
  var pickBackup = async function() {
    setRestoreError('');
    setPendingRestore(null);
    try {
      var result = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'public.json', '*/*'],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled) return;
      var asset = result.assets[0];
      var content = await FileSystem.readAsStringAsync(asset.uri);
      // Pre-flight: confirm it's a Tajada backup before asking for
      // the passphrase. inspectBackup throws with a specific reason.
      var meta = inspectBackup(content);
      setPendingRestore({ envelopeJson: content, meta: meta, fileName: asset.name });
    } catch (err) {
      setRestoreError(localizeError(err));
    }
  };

  // ── RESTORE: decrypt + apply ──────────────────────────────────
  var doRestore = async function() {
    if (!pendingRestore) return;
    setRestoreError('');
    if (!restorePass) {
      setRestoreError(t('backup.passTooShort', { min: MIN_PASSPHRASE_LENGTH }));
      return;
    }
    setRestoreBusy(true);
    try {
      var state = await restoreBackup(pendingRestore.envelopeJson, restorePass);
      var sessions = Array.isArray(state.sessions) ? state.sessions : [];
      var rules = (state.rules && typeof state.rules === 'object') ? state.rules : {};

      // Confirmation step: explicit, blocking, with the actual counts
      // so the user can't accidentally clobber the wrong account's data.
      setRestoreBusy(false);
      Alert.alert(
        t('backup.confirmReplaceTitle'),
        t('backup.confirmReplaceBody', {
          sessions: sessions.length,
          rules: Object.keys(rules).length,
        }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('backup.confirmReplaceConfirm'), style: 'destructive', onPress: async function() {
            try {
              await setAllSessions(sessions);
              await setAllRules(rules);
              setRestorePass('');
              setPendingRestore(null);
              Alert.alert(
                t('backup.restoredTitle'),
                t('backup.restoredBody', { sessions: sessions.length, rules: Object.keys(rules).length }),
                [{ text: t('common.done'), onPress: function() {
                  // Navigate home so the new sessions list appears.
                  if (navigation && navigation.popToTop) navigation.popToTop();
                }}],
              );
            } catch (e) {
              setRestoreError(localizeError(e));
            }
          }},
        ],
      );
    } catch (err) {
      setRestoreBusy(false);
      setRestoreError(localizeError(err));
    }
  };

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
        <Text style={s.title}>{t('backup.title')}</Text>
        <Text style={s.subtitle}>{t('backup.subtitle')}</Text>

        {/* Privacy callout — sets expectations about the zero-knowledge model. */}
        <View style={s.privacyCard}>
          <Text style={s.privacyHead}>{t('backup.privacyHeadline')}</Text>
          <Text style={s.privacyBody}>{t('backup.privacyBody')}</Text>
        </View>

        {/* ── CREATE BACKUP ───────────────────────────────────── */}
        <Text style={s.sectionLabel}>{t('backup.sectionCreate')}</Text>

        <View style={s.passRow}>
          <TextInput
            style={s.input}
            value={pass}
            onChangeText={setPass}
            placeholder={t('backup.passPlaceholder', { min: MIN_PASSPHRASE_LENGTH })}
            placeholderTextColor={colors.textFaint}
            secureTextEntry={!showPass}
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            editable={!busy}
          />
          <TouchableOpacity style={s.showBtn} onPress={function() { setShowPass(!showPass); }}>
            <Text style={s.showBtnTxt}>{showPass ? t('backup.passHide') : t('backup.passShow')}</Text>
          </TouchableOpacity>
        </View>

        {/* Strength meter — visual nudge, not a gate. */}
        {pass.length > 0 && (
          <View style={s.strengthRow}>
            <View style={s.strengthTrack}>
              <View style={[s.strengthFill, {
                width: ((strength + 1) * 20) + '%',
                backgroundColor: strength <= 1 ? colors.expense : strength === 2 ? colors.warning : colors.income,
              }]} />
            </View>
            <Text style={s.strengthLabel}>{t('backup.strength.' + strength)}</Text>
          </View>
        )}

        <TextInput
          style={[s.input, { marginTop: 10 }]}
          value={passConfirm}
          onChangeText={setPassConfirm}
          placeholder={t('backup.passConfirmLabel')}
          placeholderTextColor={colors.textFaint}
          secureTextEntry={!showPass}
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          editable={!busy}
        />

        <TextInput
          style={[s.input, { marginTop: 10 }]}
          value={hint}
          onChangeText={setHint}
          placeholder={t('backup.passHintPlaceholder')}
          placeholderTextColor={colors.textFaint}
          maxLength={80}
          editable={!busy}
        />
        <Text style={s.hintNote}>{t('backup.passHintNote')}</Text>

        <Text style={s.warn}>{t('backup.passLost')}</Text>

        {error ? <View style={s.errorBox}><Text style={s.errorTxt}>{error}</Text></View> : null}

        <TouchableOpacity
          style={[s.primaryBtn, busy && s.btnDisabled]}
          onPress={doCreate}
          disabled={busy}
        >
          {busy ? <ActivityIndicator color={colors.accentText} /> :
            <Text style={s.primaryBtnTxt}>{t('backup.createBtn')}</Text>}
        </TouchableOpacity>

        {/* ── RESTORE ─────────────────────────────────────────── */}
        <View style={s.divider} />
        <Text style={s.sectionLabel}>{t('backup.sectionRestore')}</Text>

        <TouchableOpacity style={s.secondaryBtn} onPress={pickBackup} disabled={restoreBusy}>
          <Text style={s.secondaryBtnTxt}>
            {pendingRestore ? pendingRestore.fileName : t('backup.restoreBtn')}
          </Text>
        </TouchableOpacity>

        {pendingRestore && (
          <>
            {pendingRestore.meta.hint ? (
              <Text style={s.hintFromFile}>
                {t('backup.passHintFromFile', { hint: pendingRestore.meta.hint })}
              </Text>
            ) : null}

            <TextInput
              style={[s.input, { marginTop: 10 }]}
              value={restorePass}
              onChangeText={setRestorePass}
              placeholder={t('backup.passLabel')}
              placeholderTextColor={colors.textFaint}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
              editable={!restoreBusy}
            />

            <TouchableOpacity
              style={[s.primaryBtn, { marginTop: 10 }, restoreBusy && s.btnDisabled]}
              onPress={doRestore}
              disabled={restoreBusy}
            >
              {restoreBusy ? <ActivityIndicator color={colors.accentText} /> :
                <Text style={s.primaryBtnTxt}>{t('backup.restoringBtn').replace('...', '') || t('backup.restoreBtn')}</Text>}
            </TouchableOpacity>
          </>
        )}

        {restoreError ? <View style={s.errorBox}><Text style={s.errorTxt}>{restoreError}</Text></View> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

var s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.screenBg },
  title: { fontSize: 22, fontWeight: '700', color: colors.textPrimary },
  subtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 6, marginBottom: 18, lineHeight: 18 },

  privacyCard: { backgroundColor: colors.infoBg, borderRadius: 10, padding: 14, marginBottom: 20, borderWidth: 1, borderColor: colors.cardBorder },
  privacyHead: { fontSize: 12, fontWeight: '700', color: colors.infoText, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
  privacyBody: { fontSize: 12, color: colors.textSecondary, lineHeight: 17 },

  sectionLabel: { fontSize: 11, color: colors.textFaint, textTransform: 'uppercase', letterSpacing: 1, fontWeight: '700', marginTop: 4, marginBottom: 10 },

  passRow: { flexDirection: 'row', alignItems: 'center' },
  input: { flex: 1, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 8, paddingHorizontal: 12, paddingVertical: Platform.OS === 'ios' ? 12 : 8, fontSize: 14, color: colors.textPrimary },
  showBtn: { paddingHorizontal: 10, paddingVertical: 10, marginLeft: 6 },
  showBtnTxt: { fontSize: 12, color: colors.accent, fontWeight: '600' },

  strengthRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  strengthTrack: { flex: 1, height: 4, backgroundColor: colors.cardBorder, borderRadius: 2, overflow: 'hidden' },
  strengthFill: { height: 4, borderRadius: 2 },
  strengthLabel: { fontSize: 10, color: colors.textFaint, marginLeft: 8, width: 70, textAlign: 'right', fontWeight: '600' },

  hintNote: { fontSize: 10, color: colors.textFaint, marginTop: 4, lineHeight: 14 },

  warn: { fontSize: 11, color: colors.expenseLabel, marginTop: 14, fontWeight: '600', lineHeight: 15 },

  errorBox: { backgroundColor: colors.expenseBg, borderRadius: 8, padding: 10, marginTop: 12, borderWidth: 1, borderColor: colors.expenseBorder },
  errorTxt: { fontSize: 12, color: colors.expenseLabel },

  primaryBtn: { backgroundColor: colors.accent, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 14 },
  primaryBtnTxt: { fontSize: 14, fontWeight: '700', color: colors.accentText },
  btnDisabled: { opacity: 0.6 },

  secondaryBtn: { backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.accent, borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  secondaryBtnTxt: { fontSize: 14, fontWeight: '600', color: colors.accent },

  hintFromFile: { fontSize: 12, color: colors.textSecondary, marginTop: 10, fontStyle: 'italic' },

  divider: { height: 1, backgroundColor: colors.cardBorder, marginVertical: 24 },
});
