import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../theme';
import BrandLogo from './BrandLogo';
import { t } from '../i18n';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error: error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={s.container}>
          <BrandLogo style={s.logoRow} />
          <Text style={s.title}>{t('error.title')}</Text>
          <Text style={s.sub}>{t('error.body')}</Text>
          <TouchableOpacity style={s.btn} onPress={function() { this.setState({ hasError: false, error: null }); }.bind(this)}>
            <Text style={s.btnTxt}>{t('error.retry')}</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

var s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.heroBg, alignItems: 'center', justifyContent: 'center', padding: 32 },
  logoRow: { marginBottom: 24 },
  title: { fontSize: 22, fontWeight: '600', color: colors.heroText, marginBottom: 8 },
  sub: { fontSize: 14, color: colors.heroTextMuted, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  btn: { backgroundColor: colors.accent, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 40 },
  btnTxt: { fontSize: 15, fontWeight: '600', color: colors.accentText },
});
