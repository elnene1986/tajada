// Creator-specific Schedule C-aligned categories.
//
// Income categories apply to credit-type transactions (money in).
// Expense categories apply to debit-type transactions (money out).
//
// `key` is the stable id — used by rules, storage, and defaults, and is
// NEVER translated. `label` and the `schedC` hint are localized at
// module load via the active brand's language (see src/i18n). The
// Schedule C line numbers stay constant across languages; only the
// descriptions are translated, since the IRS form itself is English.

import { t } from '../i18n';

export const CREATOR_INCOME_CATEGORIES = [
  { key: 'platform_payouts', label: t('category.platform_payouts'), schedC: t('category.platform_payouts.schedC') },
  { key: 'tips_donations',   label: t('category.tips_donations'),   schedC: t('category.tips_donations.schedC') },
  { key: 'sponsorships',     label: t('category.sponsorships'),     schedC: t('category.sponsorships.schedC') },
  { key: 'merch_sales',      label: t('category.merch_sales'),      schedC: t('category.merch_sales.schedC') },
  { key: 'licensing',        label: t('category.licensing'),        schedC: t('category.licensing.schedC') },
  { key: 'other_income',     label: t('category.other_income'),     schedC: t('category.other_income.schedC') },
];

export const CREATOR_EXPENSE_CATEGORIES = [
  { key: 'platform_fees',    label: t('category.platform_fees'),    schedC: t('category.platform_fees.schedC') },
  { key: 'content_prod',     label: t('category.content_prod'),     schedC: t('category.content_prod.schedC') },
  { key: 'software_subs',    label: t('category.software_subs'),    schedC: t('category.software_subs.schedC') },
  { key: 'equipment',        label: t('category.equipment'),        schedC: t('category.equipment.schedC') },
  { key: 'home_studio',      label: t('category.home_studio'),      schedC: t('category.home_studio.schedC') },
  { key: 'travel_shoots',    label: t('category.travel_shoots'),    schedC: t('category.travel_shoots.schedC') },
  { key: 'promotion',        label: t('category.promotion'),        schedC: t('category.promotion.schedC') },
  { key: 'pro_services',     label: t('category.pro_services'),     schedC: t('category.pro_services.schedC') },
  { key: 'other_expense',    label: t('category.other_expense'),    schedC: t('category.other_expense.schedC') },
];

// Quick lookup by key.
var _byKey = {};
CREATOR_INCOME_CATEGORIES.forEach(function(c) { _byKey[c.key] = c; });
CREATOR_EXPENSE_CATEGORIES.forEach(function(c) { _byKey[c.key] = c; });

export function categoryByKey(key) {
  return _byKey[key] || null;
}

export function categoriesForType(type) {
  return type === 'credit' ? CREATOR_INCOME_CATEGORIES : CREATOR_EXPENSE_CATEGORIES;
}

export function categoryLabel(key) {
  var c = _byKey[key];
  return c ? c.label : t('category.uncategorized');
}

// Default suggestion given a transaction type. Users can override.
export function defaultCategoryKey(type) {
  return type === 'credit' ? 'platform_payouts' : 'other_expense';
}

// Short, plain-language "what belongs here / is this deductible?" tip
// for a category, shown at classification time. The educational value
// is the point: most creators leave deductions on the table because
// they don't realize ordinary purchases (ring lights, editing software,
// a co-working day pass) are ordinary-and-necessary business expenses.
// Keyed by the stable category key; returns '' if there's no tip so the
// UI can render nothing.
export function categoryTip(key) {
  if (!key) return '';
  var v = t('catTip.' + key);
  // t() returns the key itself when missing — treat that as "no tip".
  return v === 'catTip.' + key ? '' : v;
}
