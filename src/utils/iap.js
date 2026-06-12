// In-app purchase abstraction.
//
// PROBLEM: react-native-iap is a NATIVE module. Importing it at the
// top of a JS file means Metro tries to wire its native bridge at
// bundle time. That works in EAS Build (where the native side is
// linked into the binary), but Expo Go has no way to link arbitrary
// native modules — so importing it crashes the dev workflow.
//
// SOLUTION: dynamic require inside a try/catch. If the require fails
// or initConnection throws, we fall back to a stub provider that
// exposes the same interface and lets the user "simulate" a purchase
// (with a clearly-labeled DEV banner). That way Pablo can iterate on
// the rest of the app in Expo Go without rebuilding the dev client
// after every JS change.
//
// PROVIDER INTERFACE:
//   init()              → opens connection, fetches products
//   getProducts()       → [{ productId, localizedPrice, currency, ... }]
//   purchase(productId) → Promise<{ productId, transactionId, transactionDate, transactionReceipt }>
//   restorePurchases()  → Promise<Array<purchase>>  (purchases the user already owns)
//   dispose()           → close the store connection
//   isStub              → true iff this is the dev-mode stub (UI can show a banner)

import { Platform } from 'react-native';

// ─── Product IDs ──────────────────────────────────────────────────
//
// Same ID on both stores so cross-platform code can reference one
// constant. iOS: configure as a Non-Consumable in App Store Connect.
// Android: configure as a Managed in-app product (one-time) in Play
// Console.

export var PRODUCT_ID_FULL_EXPORT = 'com.tajada.app.full_export';

// All product IDs we want to surface — currently just the one.
var ALL_PRODUCT_IDS = [PRODUCT_ID_FULL_EXPORT];

// ─── Provider selection ──────────────────────────────────────────
//
// `_provider` is the singleton — set lazily on first call to
// getProvider(). Once chosen (real or stub), we keep it for the
// rest of the session so we don't try-require on every export.

var _provider = null;

export async function getProvider() {
  if (_provider) return _provider;
  // Try the real provider first.
  var real = await tryLoadReal();
  if (real) { _provider = real; return _provider; }
  // Fall back to the stub.
  _provider = makeStubProvider();
  return _provider;
}

// Tear down the cached provider so the next call to getProvider()
// re-runs the try-real-then-fall-back-to-stub sequence. Used by:
//   - The Paywall "Reintentar" button, when the real provider failed
//     to init (e.g. network outage at modal open) and the user wants
//     to try again without closing the modal.
//   - Tests, when a fixture wants to start from a clean slate.
// Named without the "ForTesting" suffix because the production retry
// path also uses it.
export function resetProvider() { _provider = null; }

// Back-compat alias — older code may still import the testing-named
// version. Safe to delete once nothing references it.
export var resetProviderForTesting = resetProvider;

async function tryLoadReal() {
  var RNIap;
  try {
    // Dynamic require so Expo Go doesn't try to resolve the native
    // side at bundle load. `require` (not import) keeps this lazy.
    RNIap = require('react-native-iap');
  } catch (e) {
    return null;
  }
  try {
    var provider = makeRealProvider(RNIap);
    await provider.init();
    return provider;
  } catch (e) {
    // Initialization failed — probably running in Expo Go even
    // though react-native-iap was installed, or the store
    // connection refused for unrelated reasons. Either way, the
    // stub is the safer fallback so the rest of the app still works.
    return null;
  }
}

// ─── Real provider (react-native-iap wrapper) ─────────────────────
function makeRealProvider(RNIap) {
  var initialized = false;
  var cachedProducts = null;

  return {
    isStub: false,
    init: async function() {
      if (initialized) return;
      await RNIap.initConnection();
      initialized = true;
    },
    getProducts: async function() {
      if (cachedProducts) return cachedProducts;
      // Non-consumable / managed product — same call on both stores
      // for one-time purchases.
      var products = await RNIap.getProducts({ skus: ALL_PRODUCT_IDS });
      cachedProducts = products.map(normalizeProduct);
      return cachedProducts;
    },
    purchase: async function(productId) {
      // requestPurchase resolves with the purchase event; on iOS we
      // also need to finishTransaction on the result. On Android,
      // consume/acknowledge is needed for consumables — not for our
      // non-consumable, but finishTransaction handles both.
      var result;
      if (Platform.OS === 'ios') {
        result = await RNIap.requestPurchase({ sku: productId });
      } else {
        result = await RNIap.requestPurchase({ skus: [productId] });
      }
      // requestPurchase returns either a single purchase or an array
      // depending on platform — normalize to a single object.
      var purchase = Array.isArray(result) ? result[0] : result;
      try {
        await RNIap.finishTransaction({ purchase: purchase, isConsumable: false });
      } catch (e) { /* non-fatal — Apple may auto-finish */ }
      return normalizePurchase(purchase);
    },
    restorePurchases: async function() {
      var available = await RNIap.getAvailablePurchases();
      return (available || [])
        .filter(function(p) { return ALL_PRODUCT_IDS.indexOf(p.productId) !== -1; })
        .map(normalizePurchase);
    },
    dispose: async function() {
      if (!initialized) return;
      try { await RNIap.endConnection(); } catch (e) {}
      initialized = false;
    },
  };
}

// react-native-iap product / purchase shapes differ subtly across
// versions and platforms — these normalizers smooth the difference
// so consumers (Paywall, unlock.js) see a stable shape.
function normalizeProduct(p) {
  return {
    productId: p.productId,
    title: p.title || p.localizedTitle || 'Tajada',
    description: p.description || '',
    localizedPrice: p.localizedPrice || (p.priceString) || '',
    currency: p.currency || 'USD',
    priceAmountMicros: p.priceAmountMicros || null,
  };
}

function normalizePurchase(p) {
  return {
    productId: p.productId,
    transactionId: p.transactionId || p.purchaseToken || null,
    transactionDate: p.transactionDate || Date.now(),
    transactionReceipt: p.transactionReceipt || null,
  };
}

// ─── Stub provider (Expo Go / dev) ────────────────────────────────
//
// Implements the same interface but returns canned data and prompts
// the user via a synthetic alert flow on "purchase." The UI shows a
// "MODO DESARROLLO" banner when this provider is active so it's
// unambiguous that no real money will move.

function makeStubProvider() {
  return {
    isStub: true,
    init: async function() { /* no-op */ },
    getProducts: async function() {
      return [{
        productId: PRODUCT_ID_FULL_EXPORT,
        title: 'Tajada — exportaciones',
        description: 'Stub product (dev)',
        localizedPrice: '$14.99',
        currency: 'USD',
        priceAmountMicros: 14990000,
      }];
    },
    purchase: async function(productId) {
      // Simulate a successful purchase. In production this would
      // require user interaction with the StoreKit / Play Billing
      // sheet; here we just return a fake transaction immediately.
      // The Paywall surfaces a DEV banner so this can't be confused
      // for the real flow.
      return {
        productId: productId,
        transactionId: 'dev-stub-' + Date.now(),
        transactionDate: Date.now(),
        transactionReceipt: null,
      };
    },
    restorePurchases: async function() {
      // Nothing to restore in dev — actual restore is only meaningful
      // when there's a real store account behind the request.
      return [];
    },
    dispose: async function() { /* no-op */ },
  };
}
