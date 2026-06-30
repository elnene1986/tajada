// Quarterly estimated-tax reminders — on-device local notifications.
//
// WHY THIS EXISTS:
// Self-employed creators owe federal income + SE tax in four estimated
// installments through the year, not just in April. Miss them and the
// IRS charges an underpayment penalty — and nobody tells a first-time
// creator the dates exist. Tajada schedules LOCAL notifications (no push
// server, no tokens, nothing leaves the device) a little ahead of each
// deadline, with the amount the set-aside estimator suggests per quarter.
//
// SCOPE / HONESTY:
// The per-quarter figure is the user's current set-aside estimate ÷ 4 —
// a reasonable nudge, not a filed 1040-ES. The copy says "estimación".
//
// PLATFORM NOTE:
// expo-notifications local scheduling works in a development/production
// build. In Expo Go the permission + toggle flow runs, but delivery is
// best verified in a dev build. All calls are wrapped so a failure
// (Expo Go limitation, denied permission) degrades gracefully instead
// of crashing the screen.

import * as FileSystem from 'expo-file-system/legacy';
import * as Notifications from 'expo-notifications';
import { writeAtomic } from './fsAtomic';
import { fmtCents } from './money';
import { t } from '../i18n';

// Show scheduled reminders even if the app happens to be foregrounded
// when one fires. No sound/badge — a quiet banner is enough.
Notifications.setNotificationHandler({
  handleNotification: async function() {
    return {
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    };
  },
});

var PREFS_FILE = FileSystem.documentDirectory + 'tajada_reminders.json';
var NOTIFY_HOUR = 9; // 9:00 AM local on the due date

// Spanish month names — RN's Intl support is patchy on Android (same
// reason money.js formats by hand), so we don't rely on toLocaleString.
var MONTHS_ES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

// ─── Due-date math ────────────────────────────────────────────────
//
// Federal estimated-tax installment due dates. The statutory dates are
// the 15th; when the 15th is a weekend/holiday the IRS shifts to the
// next business day. We schedule on the statutory date and word the
// copy as "alrededor del" so we're never wrong by a day in the user's
// favor. Q4 of a tax year is due in January of the following year.
export function quarterlyDueDates(taxYear) {
  return [
    { quarter: 1, date: new Date(taxYear, 3, 15) },      // Apr 15
    { quarter: 2, date: new Date(taxYear, 5, 15) },      // Jun 15
    { quarter: 3, date: new Date(taxYear, 8, 15) },      // Sep 15
    { quarter: 4, date: new Date(taxYear + 1, 0, 15) },  // Jan 15 next yr
  ];
}

// The next up-to-four installment dates strictly after `from`, sorted
// soonest-first. Spans the year boundary so a user enabling reminders
// in December still gets the upcoming January (Q4) and April (Q1).
export function upcomingDueDates(from) {
  var ref = from || new Date();
  var y = ref.getFullYear();
  var all = quarterlyDueDates(y).concat(quarterlyDueDates(y + 1));
  return all
    .filter(function(d) { return d.date.getTime() > ref.getTime(); })
    .sort(function(a, b) { return a.date.getTime() - b.date.getTime(); })
    .slice(0, 4);
}

export function nextDueDate(from) {
  var u = upcomingDueDates(from);
  return u.length ? u[0] : null;
}

// "15 de junio de 2026"
export function formatDueDate(date) {
  if (!date) return '';
  return date.getDate() + ' de ' + MONTHS_ES[date.getMonth()] + ' de ' + date.getFullYear();
}

// ─── Permission ───────────────────────────────────────────────────
async function ensurePermission() {
  try {
    var current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    // iOS provisional authorization (status 3) still lets us deliver.
    if (current.ios && current.ios.status === 3) return true;
    var asked = await Notifications.requestPermissionsAsync();
    return !!asked.granted;
  } catch (e) {
    return false;
  }
}

// ─── Enable / disable ─────────────────────────────────────────────
//
// enableReminders(perQuarterCents) schedules one local notification at
// 9 AM local on each upcoming installment date, carrying the suggested
// per-quarter amount. Persists the prefs so the UI can reflect state.
// Returns { ok, reason?, scheduled }.
export async function enableReminders(perQuarterCents) {
  var granted = await ensurePermission();
  if (!granted) return { ok: false, reason: 'denied', scheduled: [] };

  try {
    // Tajada schedules no other notifications, so clearing all is safe
    // and keeps us from stacking duplicates on repeated toggles.
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (e) { /* non-fatal */ }

  var due = upcomingDueDates(new Date());
  var scheduled = [];
  for (var i = 0; i < due.length; i++) {
    var d = due[i];
    var fireAt = new Date(d.date.getFullYear(), d.date.getMonth(), d.date.getDate(), NOTIFY_HOUR, 0, 0);
    if (fireAt.getTime() <= Date.now()) continue;
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: t('reminders.notifTitle'),
          body: t('reminders.notifBody', {
            q: d.quarter,
            date: formatDueDate(d.date),
            amount: fmtCents(perQuarterCents),
          }),
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fireAt },
      });
      scheduled.push(fireAt.toISOString());
    } catch (e) { /* skip this one, keep the rest */ }
  }

  var prefs = {
    enabled: true,
    perQuarterCents: perQuarterCents,
    scheduledFor: scheduled,
    updatedAt: new Date().toISOString(),
  };
  try { await writeAtomic(PREFS_FILE, JSON.stringify(prefs)); } catch (e) { /* in-memory stands */ }
  return { ok: true, scheduled: scheduled };
}

export async function disableReminders() {
  try { await Notifications.cancelAllScheduledNotificationsAsync(); } catch (e) { /* non-fatal */ }
  try { await writeAtomic(PREFS_FILE, JSON.stringify({ enabled: false, perQuarterCents: 0, scheduledFor: [] })); } catch (e) {}
  return { ok: true };
}

export async function getReminderPrefs() {
  try {
    var info = await FileSystem.getInfoAsync(PREFS_FILE);
    if (!info.exists) return { enabled: false, perQuarterCents: 0, scheduledFor: [] };
    var p = JSON.parse(await FileSystem.readAsStringAsync(PREFS_FILE));
    return {
      enabled: !!p.enabled,
      perQuarterCents: Number.isFinite(p.perQuarterCents) ? p.perQuarterCents : 0,
      scheduledFor: Array.isArray(p.scheduledFor) ? p.scheduledFor : [],
    };
  } catch (e) {
    return { enabled: false, perQuarterCents: 0, scheduledFor: [] };
  }
}
