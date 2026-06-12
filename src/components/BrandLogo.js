// BrandLogo — the Tajada mark: an ink rounded square with a saffron
// folded corner (the "tajada" — a slice taken from the whole).
//
// Built from two border-triangles over the square:
//   1. a `bg`-colored triangle that cuts the top-right corner away,
//   2. a saffron flap along the same diagonal — the fold.
//
// Props:
//   size  — glyph width/height in px (default 56)
//   bg    — the color behind the glyph, used for the corner cut
//           (default colors.heroBg; pass the screen bg if different)
//   style — outer spacing (e.g. margin)

import React from 'react';
import { View } from 'react-native';
import { colors } from '../theme';

export default function BrandLogo({ style, size, bg }) {
  var w = size || 56;
  var fold = Math.round(w * 0.34);
  var radius = Math.round(w * 0.24);
  var cut = bg || colors.heroBg;

  return (
    <View style={[{ width: w, height: w }, style]}>
      {/* ink square */}
      <View style={{ width: w, height: w, borderRadius: radius, backgroundColor: colors.heroText }} />
      {/* corner cut — hides the square's top-right corner */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: 0,
          height: 0,
          borderTopWidth: fold,
          borderTopColor: cut,
          borderLeftWidth: fold,
          borderLeftColor: 'transparent',
        }}
      />
      {/* the fold — saffron flap along the diagonal */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: 0,
          height: 0,
          borderBottomWidth: fold,
          borderBottomColor: colors.accent,
          borderRightWidth: fold,
          borderRightColor: 'transparent',
        }}
      />
    </View>
  );
}
