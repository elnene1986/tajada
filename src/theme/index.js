// SplitLedger / Tajada theme.
//
// `colors` is the ACTIVE BRAND's token set — it switches automatically
// between the SplitLedger and Tajada builds (see src/brand/). Everything
// else here (type, spacing, radii) is brand-agnostic and shared.
//
// Screens import from here and reference tokens by name — never hardcode
// hex. To retheme either brand, edit its file in src/brand/, not here.

import brand from '../brand';

export const colors = brand.colors;

export const fonts = {
  regular: 'System',
  medium: 'System',
  semibold: 'System',
  mono: 'SpaceMono',
};

export const fontSizes = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 18,
  xl: 22,
  xxl: 28,
  hero: 32,
};

export const fontWeights = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const radii = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  pill: 100,
  card: 14,
};

export default {
  colors,
  fonts,
  fontSizes,
  fontWeights,
  spacing,
  radii,
};
