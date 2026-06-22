// Tajada brand definition (Spanish). Re-exported by src/brand/index.js.
// `colors` is the token set that src/theme/index.js exposes.

export default {
  id: 'tajada',
  displayName: 'Tajada',
  subBrand: '', // no "for Creators" sub-brand line in the Tajada system
  tagline: 'Tu tajada. Limpia, contada, tuya.',

  // Which mark <BrandLogo /> renders (Phase 4) — saffron wedge glyph.
  logoVariant: 'tajada',

  // Identity used by app.config.js (Phase 2). New, separate store entry.
  bundleId: 'com.tajada.app',
  scheme: 'tajada',

  // UI language for this build. Tajada is Spanish-only — no toggle.
  locale: 'es',

  supportEmail: 'tajada.soporte@gmail.com',

  // ===================================================================
  // PLACEHOLDER PALETTE — DESIGN REVIEW NEEDED
  // -------------------------------------------------------------------
  // The Tajada v.02 brand kit defines only 3 colors (paper / ink /
  // saffron). The app's working screens need ~30 functional colors
  // (income vs expense vs excluded, five badge styles, status, etc.).
  // The hero/identity tokens below are real brand values. Everything
  // from `income` downward is a best-effort warm-palette PLACEHOLDER
  // and should be reviewed by a designer before Tajada ships.
  // SplitLedger's values are unaffected — see splitledger.js.
  // ===================================================================
  colors: {
    // — Hero surface — Tajada's landing / onboarding / error are light paper.
    heroBg:        '#F2E9D8', // paper
    heroText:      '#14100C', // ink
    heroTextMuted: '#4A3F32', // ink-soft
    heroTextFaint: '#8A7C66', // ink-faint
    heroTextLabel: '#8A7C66', // ink-faint
    heroTextDim:   '#A89A80', // faded ink
    heroCtaSub:    '#4A3F32', // ink-soft (sits on the saffron CTA)
    heroChip:      'rgba(20,16,12,0.05)',

    // — Working light surfaces.
    screenBg:      '#F2E9D8', // paper
    card:          '#F9F3E4', // paper-card
    cardBorder:    '#D4C9AE', // rule
    chipBg:        '#E8DDC4', // paper-deep

    // — Text on light surfaces.
    textPrimary:   '#14100C', // ink
    textSecondary: '#4A3F32', // ink-soft
    textFaint:     '#8A7C66', // ink-faint
    neutralStrong: '#2A2218',
    neutralMid:    '#4A3F32',

    // — Primary accent. Tajada has no blue; info maps to warm neutral.
    accent:        '#C99A2C', // saffron
    accentSoft:    '#DAB152', // saffron-soft
    accentText:    '#14100C', // ink — legible on saffron
    infoBg:        '#E8DDC4', // PLACEHOLDER
    infoText:      '#4A3F32', // PLACEHOLDER
    profitDeep:    '#14100C', // PLACEHOLDER

    // — Strong dark UI (tabs, primary dark buttons) — dark in BOTH brands.
    strongBtn:     '#14100C', // ink
    strongBtnText: '#F2E9D8', // paper

    // — Income — business credit. PLACEHOLDER (saffron family).
    income:        '#C99A2C',
    incomeDeep:    '#A87E1F',
    incomeStrong:  '#6E5414',
    incomeLabel:   '#8A6A1A',
    incomeBg:      '#F3E7C9',
    incomeBgSoft:  '#F6EED6',
    incomeBorder:  '#DFC98C',
    incomeCheck:   '#C99A2C',

    // — Expense — business debit. PLACEHOLDER (warm brick family).
    expense:       '#B3402E',
    expenseDeep:   '#8F3324',
    expenseLabel:  '#6E2A1F',
    expenseBg:     '#F0DDD6',
    expenseBorder: '#DFB9AC',

    // — Expense rows in Review's expenses tab. PLACEHOLDER (sienna family).
    expenseTab:       '#A85A2E',
    expenseTabStrong: '#7E4322',
    expenseTabBg:     '#EFE0D2',
    expenseTabBorder: '#D9BE9F',

    // — Excluded / personal (greyed out). PLACEHOLDER.
    excludedBg:     '#E8DDC4',
    excludedBorder: '#D4C9AE',
    excludedCheck:  '#A89A80',
    excludedText:   '#8A7C66',

    // — Badges. PLACEHOLDER.
    recurringBg:   '#E8DDC4',
    recurringText: '#4A3F32',
    categoryBg:    '#EDE4D0',
    categoryText:  '#6E5414',
    ruleBg:        '#F3E7C9',
    ruleText:      '#8A6A1A',

    // — Status. PLACEHOLDER — Tajada brand defines no warning/error color.
    warning:    '#B5862A',
    danger:     '#B3402E',
    dangerText: '#FFFFFF',

    // — Toast / scrim.
    toastBg:   '#14100C', // ink
    toastText: '#F2E9D8', // paper
    scrim:     'rgba(0,0,0,0.5)',
  },
};
