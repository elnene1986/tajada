// Paywall modal — shown when the user taps "Export PDF" or "Export
// CSV" without an unlocked purchase. Wraps the IAP provider + unlock
// persistence so callers (SummaryScreen) just need to render this and
// pass an `onUnlocked` callback.
//
// Visual contract:
//   - DEV builds where the IAP provider is the dev stub: show a
//     "MODO DESARROLLO" banner so anyone QA-ing in Expo Go knows the
//     purchase isn't real, but keep the buttons functional.
//   - PROD builds where the real provider failed to init (sandbox
//     down, user signed out, etc., so getProvider() fell back to the
//     stub): treat as a store-unavailable error. The purchase and
//     restore buttons are HIDDEN — replaced by a "Reintentar" button
//     that resets the cached provider so the next attempt re-tries
//     the real one. This is what prevents the stub from silently
//     granting free unlocks in production if StoreKit has a hiccup.

import React, { useEffect, useState } from 'react';
import {
  View, Text, Modal, TouchableOpacity, ActivityIndicator,
  StyleSheet, ScrollView, Linking,
} from 'react-native';
import { getProvider, resetProvider, PRODUCT_ID_FULL_EXPORT } from '../utils/iap';
import { recordPurchase } from '../utils/unlock';
import { colors } from '../theme';
import { t } from '../i18n';

var SAMPLE_EXPORT_URL = 'https://elnene1986.github.io/tajada/sample-export.html';

export default function Paywall({ visible, onUnlocked, onCancel }) {
  var [loading, setLoading] = useState(true);
  var [busy, setBusy] = useState(false);
  var [error, setError] = useState('');
  var [price, setPrice] = useState(null);
  var [isStub, setIsStub] = useState(false);
  // True iff the real IAP provider failed to load in a production
  // build (i.e., the stub is active but __DEV__ is false). When this
  // is true the purchase + restore buttons are hidden and replaced
  // with a "store unavailable" message and a retry button.
  var [storeUnavailable, setStoreUnavailable] = useState(false);
  // Incremented to force the load effect to re-run after a retry.
  var [reloadKey, setReloadKey] = useState(0);

  // Load products when the modal opens (or when retry is tapped).
  // Cached on the provider so re-opening is cheap.
  useEffect(function() {
    if (!visible) return;
    var cancelled = false;
    setError('');
    setStoreUnavailable(false);
    setLoading(true);
    (async function() {
      try {
        var provider = await getProvider();
        if (cancelled) return;
        var stub = !!provider.isStub;
        setIsStub(stub);
        // If the stub is active in a production build, the real
        // store couldn't be reached — bail out before showing a
        // purchase CTA. The stub would otherwise silently return
        // success and grant a free unlock.
        if (stub && !__DEV__) {
          setStoreUnavailable(true);
          setLoading(false);
          return;
        }
        var products = await provider.getProducts();
        if (cancelled) return;
        var p = products.find(function(x) { return x.productId === PRODUCT_ID_FULL_EXPORT; })
             || products[0];
        setPrice(p ? p.localizedPrice : '$14.99');
        setLoading(false);
      } catch (e) {
        if (cancelled) return;
        setLoading(false);
        setError(t('paywall.errLoad'));
      }
    })();
    return function() { cancelled = true; };
  }, [visible, reloadKey]);

  // Tear down the cached provider and re-trigger the load effect.
  // Used by the "Reintentar" button when storeUnavailable is set —
  // gives the user a clean retry without forcing them to close and
  // reopen the modal.
  var doRetry = function() {
    resetProvider();
    setError('');
    setReloadKey(function(k) { return k + 1; });
  };

  var doPurchase = async function() {
    setError('');
    setBusy(true);
    try {
      var provider = await getProvider();
      // Defense-in-depth: the UI already hides the purchase button when
      // storeUnavailable is set, but if anything slips through (race
      // condition, future refactor that drops the gate), refuse to
      // record a stub "purchase" in a production build.
      if (provider.isStub && !__DEV__) {
        setBusy(false);
        setStoreUnavailable(true);
        return;
      }
      var purchase = await provider.purchase(PRODUCT_ID_FULL_EXPORT);
      await recordPurchase(purchase, provider.isStub ? 'dev' : 'purchase');
      setBusy(false);
      if (onUnlocked) onUnlocked();
    } catch (e) {
      setBusy(false);
      // Apple/Google return E_USER_CANCELLED when the user dismisses
      // the StoreKit / Play Billing sheet — that isn't an error to
      // surface, just close quietly.
      var code = (e && (e.code || e.message)) || '';
      if (/cancel/i.test(code)) return;
      setError(t('paywall.errPurchase'));
    }
  };

  var doRestore = async function() {
    setError('');
    setBusy(true);
    try {
      var provider = await getProvider();
      var restored = await provider.restorePurchases();
      var match = (restored || []).find(function(p) {
        return p.productId === PRODUCT_ID_FULL_EXPORT;
      });
      if (!match) {
        setBusy(false);
        setError(t('paywall.errNothingToRestore'));
        return;
      }
      await recordPurchase(match, 'restore');
      setBusy(false);
      if (onUnlocked) onUnlocked();
    } catch (e) {
      setBusy(false);
      setError(t('paywall.errRestore'));
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <View style={s.overlay}>
        <View style={s.sheet}>
          <ScrollView contentContainerStyle={{ paddingBottom: 20 }} showsVerticalScrollIndicator={false}>

            {/* Dev-mode banner — only shown in actual __DEV__ builds when
                the stub is active (Expo Go testing). In production the
                stub being active means the real store failed to load,
                which is handled by the storeUnavailable block below. */}
            {isStub && !storeUnavailable && !loading && (
              <View style={s.devBanner}>
                <Text style={s.devBannerTxt}>{t('paywall.devBanner')}</Text>
              </View>
            )}

            <View style={s.handle} />

            <Text style={s.title}>{t('paywall.title')}</Text>
            <Text style={s.subtitle}>{t('paywall.subtitle')}</Text>

            {/* Feature list — what the unlock actually buys. Spelled out
                so the user knows it's not a subscription. */}
            <View style={s.featureList}>
              <Feature label={t('paywall.feature.pdf')} />
              <Feature label={t('paywall.feature.csv')} />
              <Feature label={t('paywall.feature.oneTime')} />
              <Feature label={t('paywall.feature.allSessions')} />
            </View>

            {/* Sample preview link — lets the user see exactly what they're
                buying before committing. Opens GitHub Pages hosted sample. */}
            <TouchableOpacity
              style={s.sampleLink}
              onPress={function() { Linking.openURL(SAMPLE_EXPORT_URL); }}
            >
              <Text style={s.sampleLinkTxt}>{t('paywall.seeExample')}</Text>
            </TouchableOpacity>

            {/* Price block */}
            <View style={s.priceBlock}>
              {loading
                ? <ActivityIndicator color={colors.accent} />
                : <Text style={s.priceTxt}>{storeUnavailable ? '—' : price}</Text>}
              <Text style={s.priceSub}>{t('paywall.priceSub')}</Text>
            </View>

            {error ? (
              <View style={s.errorBox}>
                <Text style={s.errorTxt}>{error}</Text>
              </View>
            ) : null}

            {/* Production store-unavailable state. Replaces purchase +
                restore with a clear message and a retry button. Prevents
                the dev stub from silently fronting as a real purchase
                when StoreKit / Play Billing fails to initialize. */}
            {storeUnavailable ? (
              <View>
                <View style={s.unavailableBox}>
                  <Text style={s.unavailableTitle}>{t('paywall.storeUnavailableTitle')}</Text>
                  <Text style={s.unavailableBody}>{t('paywall.storeUnavailableBody')}</Text>
                </View>
                <TouchableOpacity
                  style={s.primaryBtn}
                  onPress={doRetry}
                  disabled={busy}
                >
                  <Text style={s.primaryBtnTxt}>{t('paywall.retry')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.cancelBtn} onPress={onCancel} disabled={busy}>
                  <Text style={s.cancelBtnTxt}>{t('common.cancel')}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                <TouchableOpacity
                  style={[s.primaryBtn, (busy || loading) && s.btnDisabled]}
                  onPress={doPurchase}
                  disabled={busy || loading}
                >
                  {busy ? <ActivityIndicator color={colors.accentText} /> :
                    <Text style={s.primaryBtnTxt}>{t('paywall.buy')}</Text>}
                </TouchableOpacity>

                <TouchableOpacity
                  style={s.secondaryBtn}
                  onPress={doRestore}
                  disabled={busy || loading}
                >
                  <Text style={s.secondaryBtnTxt}>{t('paywall.restore')}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={s.cancelBtn} onPress={onCancel} disabled={busy}>
                  <Text style={s.cancelBtnTxt}>{t('common.cancel')}</Text>
                </TouchableOpacity>

                <Text style={s.fineprint}>{t('paywall.fineprint')}</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function Feature({ label }) {
  return (
    <View style={s.featureRow}>
      <Text style={s.featureCheck}>✓</Text>
      <Text style={s.featureTxt}>{label}</Text>
    </View>
  );
}

var s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: colors.scrim, justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 24, paddingTop: 14, paddingBottom: 32, maxHeight: '90%' },

  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.cardBorder, alignSelf: 'center', marginBottom: 16 },

  devBanner: { backgroundColor: colors.warning, borderRadius: 6, paddingVertical: 6, paddingHorizontal: 10, marginBottom: 12, alignItems: 'center' },
  devBannerTxt: { fontSize: 10, fontWeight: '700', color: colors.dangerText, letterSpacing: 0.8, textTransform: 'uppercase' },

  title: { fontSize: 20, fontWeight: '700', color: colors.textPrimary, textAlign: 'center' },
  subtitle: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', marginTop: 6, marginBottom: 18, lineHeight: 18 },

  featureList: { marginBottom: 20 },
  featureRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  featureCheck: { fontSize: 14, color: colors.income, fontWeight: '700', width: 20, marginTop: 1 },
  featureTxt: { flex: 1, fontSize: 13, color: colors.textPrimary, lineHeight: 18 },

  sampleLink: { alignItems: 'center', paddingVertical: 10, marginBottom: 4 },
  sampleLinkTxt: { fontSize: 13, color: colors.accent, fontWeight: '600', textDecorationLine: 'underline' },

  priceBlock: { alignItems: 'center', backgroundColor: colors.infoBg, borderRadius: 10, padding: 16, marginBottom: 16 },
  priceTxt: { fontSize: 32, fontWeight: '800', color: colors.textPrimary },
  priceSub: { fontSize: 11, color: colors.textSecondary, marginTop: 4 },

  errorBox: { backgroundColor: colors.expenseBg, borderRadius: 8, padding: 10, marginBottom: 12, borderWidth: 1, borderColor: colors.expenseBorder },
  errorTxt: { fontSize: 12, color: colors.expenseLabel },

  // Production store-unavailable state — shown when the real IAP
  // provider failed to load and the stub is active in a non-DEV build.
  unavailableBox: { backgroundColor: colors.expenseBg, borderRadius: 10, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: colors.expenseBorder },
  unavailableTitle: { fontSize: 14, fontWeight: '700', color: colors.expenseLabel, marginBottom: 6 },
  unavailableBody: { fontSize: 12.5, color: colors.expenseLabel, lineHeight: 18 },

  primaryBtn: { backgroundColor: colors.accent, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginBottom: 8 },
  primaryBtnTxt: { fontSize: 15, fontWeight: '700', color: colors.accentText },
  btnDisabled: { opacity: 0.5 },

  secondaryBtn: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginBottom: 8 },
  secondaryBtnTxt: { fontSize: 14, fontWeight: '600', color: colors.accent },

  cancelBtn: { paddingVertical: 12, alignItems: 'center' },
  cancelBtnTxt: { fontSize: 13, color: colors.textFaint, fontWeight: '500' },

  fineprint: { fontSize: 10, color: colors.textFaint, textAlign: 'center', marginTop: 12, lineHeight: 14 },
});
