// Tajada strings (Spanish).
//
// Usage in screens:
//
//   import { t } from '../i18n';
//   <Text>{t('home.uploadCta')}</Text>
//   Alert.alert(t('home.deleteTitle'), t('home.deleteBody', { name: x, count: n }));
//
// `t(key, params)` looks the key up in es.json and fills any
// {placeholders} from `params`. A missing key returns the key itself,
// so a gap is visible in the UI rather than crashing.

import es from './es.json';

export function t(key, params) {
  var value = es[key];
  if (value == null) return key;
  if (params) {
    Object.keys(params).forEach(function(p) {
      value = value.split('{' + p + '}').join(String(params[p]));
    });
  }
  return value;
}

export default { t: t };
