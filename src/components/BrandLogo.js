// BrandLogo — the Tajada mark: an ink rounded square with a saffron
// corner wedge. A View-based approximation of the v.02 brand glyph;
// for a pixel-exact mark, swap in react-native-svg or a PNG asset.
// Pass `style` for outer spacing (e.g. margin).

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors } from '../theme';

export default function BrandLogo({ style }) {
  return (
    <View style={[s.glyphWrap, style]}>
      <View style={s.glyphSquare} />
      <View style={s.glyphWedge} />
    </View>
  );
}

var s = StyleSheet.create({
  glyphWrap: { width: 42, height: 40, alignItems: 'center', justifyContent: 'center' },
  glyphSquare: { width: 36, height: 36, borderRadius: 9, backgroundColor: colors.heroText },
  glyphWedge: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 0,
    height: 0,
    borderTopWidth: 15,
    borderTopColor: colors.accent,
    borderLeftWidth: 15,
    borderLeftColor: 'transparent',
  },
});
