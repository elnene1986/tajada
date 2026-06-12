import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, FlatList, StatusBar, ScrollView } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { seedRules } from '../utils/rules';
import { seedsForSelections } from '../utils/platformSeeds';
import { colors } from '../theme';
import brand from '../brand';
import BrandLogo from '../components/BrandLogo';
import { t } from '../i18n';

var width = Dimensions.get('window').width;

// Creator-tailored intro slides. Slide 0 is a warm empathy hook — no
// interaction, just the personal "I built this because I know the pain"
// note that mirrors the landing page voice. Slides 1–3 are the
// functional walkthrough. The fifth slide is interactive — it both
// explains the feature (platform-aware merchant rules) and gathers the
// data we need to seed those rules. Keeps the user in one continuous
// flow instead of bouncing out to a settings screen.
var slides = [
  {
    title: t('onboarding.introTitle'),
    sub: t('onboarding.introSub', { brand: brand.displayName }),
    graphic: 'welcome',
  },
  {
    title: t('onboarding.slide1Title'),
    sub: t('onboarding.slide1Sub', { brand: brand.displayName }),
    graphic: 'upload',
  },
  {
    title: t('onboarding.slide2Title'),
    sub: t('onboarding.slide2Sub', { brand: brand.displayName }),
    graphic: 'toggle',
  },
  {
    title: t('onboarding.slide3Title'),
    sub: t('onboarding.slide3Sub'),
    graphic: 'export',
  },
  {
    title: t('onboarding.slide4Title'),
    sub: t('onboarding.slide4Sub', { brand: brand.displayName }),
    graphic: 'platforms',
  },
];

// Platforms the user can choose. Keys here must match the keys
// in platformSeeds.PLATFORM_SEEDS so the rule seeding can look them
// up directly. Brand-name labels stay in their native casing; the
// two descriptive buckets (gigwork, courses) pull their Spanish
// labels from i18n.
var PLATFORM_OPTIONS = [
  { key: 'onlyfans', label: 'OnlyFans' },
  { key: 'fanvue',   label: 'Fanvue / Fansly' },
  { key: 'patreon',  label: 'Patreon' },
  { key: 'substack', label: 'Substack' },
  { key: 'twitch',   label: 'Twitch' },
  { key: 'youtube',  label: 'YouTube' },
  { key: 'tiktok',   label: 'TikTok' },
  { key: 'podcast',  label: 'Podcast' },
  { key: 'etsy',     label: 'Etsy' },
  { key: 'kofi',     label: 'Ko-fi' },
  { key: 'gumroad',  label: 'Gumroad / Stan' },
  { key: 'whop',     label: 'Whop' },
  { key: 'cameo',    label: 'Cameo' },
  { key: 'courses',  label: t('onboarding.platform.courses') },
  { key: 'gigwork',  label: t('onboarding.platform.gigwork') },
];

// NOTE: the Graphic components below are bespoke marketing illustrations
// (mock file badges, the toggle demo, the mini PDF preview). All fills are
// brand tokens — saffron family for income/business, brick/sienna family
// for expenses, warm greys for excluded — matching the working screens.
function Graphic({ type, selections, toggleSelection }) {
  if (type === 'welcome') {
    // The first slide carries the emotional hook ("Sé lo estresante que es…").
    // The illustration should be calm and branded — the visual opposite of
    // tax-season anxiety. The Tajada folded-corner mark anchors it, with a
    // thin saffron rule and a small "PARA CREADORES" badge below for context.
    return (
      <View style={g.welcomeBox}>
        <BrandLogo size={92} style={g.welcomeMark} />
        <View style={g.welcomeRule} />
        <View style={g.welcomeBadge}>
          <Text style={g.welcomeBadgeTxt}>{t('onboarding.introBadge')}</Text>
        </View>
      </View>
    );
  }
  if (type === 'upload') {
    return (
      <View style={g.box}>
        <View style={g.card}>
          <View style={[g.filePill, { backgroundColor: colors.incomeBg }]}><Text style={[g.fileLabel, { color: colors.incomeLabel }]}>CSV</Text></View>
          <Text style={g.fileName}>Pagos_Patreon.csv</Text>
        </View>
        <View style={g.card}>
          <View style={[g.filePill, { backgroundColor: colors.chipBg }]}><Text style={[g.fileLabel, { color: colors.textSecondary }]}>CSV</Text></View>
          <Text style={g.fileName}>Stripe_2025.csv</Text>
        </View>
        <View style={g.card}>
          <View style={[g.filePill, { backgroundColor: colors.expenseTabBg }]}><Text style={[g.fileLabel, { color: colors.expenseTabStrong }]}>OFX</Text></View>
          <Text style={g.fileName}>Banco_2025.ofx</Text>
        </View>
        <View style={g.arrow}><Text style={g.arrowTxt}>↓</Text></View>
        <View style={g.appBadge}>
          <View style={[g.miniPill, { backgroundColor: colors.accent }]} />
          <View style={g.miniDash}>
            <View style={g.miniDashDot} />
            <View style={g.miniDashDot} />
            <View style={g.miniDashDot} />
          </View>
          <View style={[g.miniPill, { backgroundColor: colors.income }]} />
        </View>
      </View>
    );
  }
  if (type === 'toggle') {
    return (
      <View style={g.box}>
        <View style={g.txnRow}>
          <View style={[g.check, { backgroundColor: colors.incomeCheck }]}><Text style={g.checkTxt}>✓</Text></View>
          <Text style={g.txnName}>Patreon Inc</Text>
          <View style={g.recBadge}><Text style={g.recTxt}>↻ 12x</Text></View>
          <Text style={[g.txnAmt, { color: colors.incomeDeep }]}>$940</Text>
        </View>
        <View style={g.txnRow}>
          <View style={[g.check, { backgroundColor: colors.expenseTab }]}><Text style={g.checkTxt}>✓</Text></View>
          <Text style={g.txnName}>Adobe Creative Cloud</Text>
          <View style={g.recBadge}><Text style={g.recTxt}>↻ 12x</Text></View>
          <Text style={[g.txnAmt, { color: colors.expenseTabStrong }]}>$54.99</Text>
        </View>
        <View style={[g.txnRow, { opacity: 0.45 }]}>
          <View style={[g.check, { backgroundColor: colors.excludedCheck }]}><Text style={g.checkTxt}>✕</Text></View>
          <Text style={[g.txnName, { textDecorationLine: 'line-through', color: colors.excludedText }]}>Netflix</Text>
          <Text style={[g.txnAmt, { color: colors.excludedCheck }]}>$17</Text>
        </View>
        <View style={g.txnRow}>
          <View style={[g.check, { backgroundColor: colors.expenseTab }]}><Text style={g.checkTxt}>✓</Text></View>
          <Text style={g.txnName}>Stripe Payments</Text>
          <View style={g.recBadge}><Text style={g.recTxt}>↻ 34x</Text></View>
          <Text style={[g.txnAmt, { color: colors.expenseTabStrong }]}>$82</Text>
        </View>
      </View>
    );
  }
  if (type === 'export') {
    return (
      <View style={g.box}>
        <View style={g.pdfPreview}>
          <View style={g.pdfHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={[g.miniPill, { backgroundColor: colors.accent }]} />
              <View style={g.miniDash}>
                <View style={g.miniDashDot} />
                <View style={g.miniDashDot} />
                <View style={g.miniDashDot} />
              </View>
              <View style={[g.miniPill, { backgroundColor: colors.income }]} />
              <Text style={g.pdfBrand}> {brand.displayName}</Text>
            </View>
          </View>
          <View style={g.pdfBody}>
            <View style={g.pdfRow}><Text style={g.pdfLabel}>Pagos de plataformas</Text><Text style={[g.pdfVal, { color: colors.incomeDeep }]}>$18,420</Text></View>
            <View style={g.pdfRow}><Text style={g.pdfLabel}>Comisiones</Text><Text style={[g.pdfVal, { color: colors.expenseDeep }]}>$2,104</Text></View>
            <View style={g.pdfRow}><Text style={g.pdfLabel}>Software y suscripciones</Text><Text style={[g.pdfVal, { color: colors.expenseDeep }]}>$1,284</Text></View>
            <View style={g.pdfRow}><Text style={g.pdfLabel}>Equipo</Text><Text style={[g.pdfVal, { color: colors.expenseDeep }]}>$2,800</Text></View>
            <View style={[g.pdfRow, { borderTopWidth: 1, borderTopColor: colors.cardBorder, paddingTop: 6 }]}><Text style={[g.pdfLabel, { fontWeight: '700' }]}>Ganancia neta</Text><Text style={[g.pdfVal, { color: colors.profitDeep, fontWeight: '700' }]}>$12,232</Text></View>
          </View>
        </View>
        <Text style={g.pdfFileName}>{'Listo para el Anexo C · ' + brand.displayName + '_2025.pdf'}</Text>
      </View>
    );
  }
  if (type === 'platforms') {
    return (
      <View style={g.platformBox}>
        {PLATFORM_OPTIONS.map(function(opt) {
          var active = selections.indexOf(opt.key) !== -1;
          return (
            <TouchableOpacity
              key={opt.key}
              style={[g.platformChip, active && g.platformChipActive]}
              onPress={function() { toggleSelection(opt.key); }}
              activeOpacity={0.7}
            >
              <Text style={[g.platformChipTxt, active && g.platformChipTxtActive]}>{opt.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }
  return null;
}

var g = StyleSheet.create({
  // Welcome / empathy slide — calm anchor visual.
  welcomeBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 12 },
  welcomeMark: { marginBottom: 24 },
  welcomeRule: { width: 48, height: 2, backgroundColor: colors.accent, borderRadius: 1, marginBottom: 18 },
  welcomeBadge: {
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: colors.heroChip,
  },
  welcomeBadgeTxt: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    color: colors.heroTextMuted,
  },

  box: { alignItems: 'center', paddingHorizontal: 30 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.heroChip, borderRadius: 10, padding: 12, marginBottom: 8, width: '100%' },
  filePill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, marginRight: 10 },
  fileLabel: { fontSize: 10, fontWeight: '700' },
  fileName: { fontSize: 13, color: colors.heroText, fontWeight: '500' },
  arrow: { marginVertical: 8 },
  arrowTxt: { fontSize: 24, color: colors.heroTextDim },
  appBadge: { flexDirection: 'row', backgroundColor: colors.heroChip, borderRadius: 12, padding: 10 },
  miniPill: { width: 10, height: 20, borderRadius: 3 },
  miniDash: { height: 22, justifyContent: 'center', alignItems: 'center', marginHorizontal: 2 },
  miniDashDot: { width: 1, height: 3, backgroundColor: colors.heroTextLabel, marginVertical: 0.5, borderRadius: 1 },
  txnRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.heroChip, borderRadius: 10, padding: 12, marginBottom: 6, width: '100%' },
  check: { width: 20, height: 20, borderRadius: 5, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  checkTxt: { color: colors.dangerText, fontSize: 11, fontWeight: '700' },
  txnName: { flex: 1, fontSize: 13, color: colors.heroText, fontWeight: '500' },
  txnAmt: { fontSize: 14, fontWeight: '700' },
  recBadge: { backgroundColor: colors.recurringBg, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4, marginRight: 8 },
  recTxt: { fontSize: 8, fontWeight: '700', color: colors.recurringText },
  pdfPreview: { width: '100%', backgroundColor: colors.heroChip, borderRadius: 12, overflow: 'hidden' },
  pdfHeader: { backgroundColor: colors.heroBg, padding: 12, borderWidth: 1, borderColor: colors.heroChip, borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  pdfBrand: { fontSize: 12, color: colors.heroText, fontWeight: '600' },
  pdfBody: { padding: 14 },
  pdfRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  pdfLabel: { fontSize: 12, color: colors.heroCtaSub },
  pdfVal: { fontSize: 12, fontWeight: '600' },
  pdfFileName: { fontSize: 11, color: colors.heroTextDim, marginTop: 8 },
  platformBox: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', paddingHorizontal: 20 },
  platformChip: { backgroundColor: colors.heroChip, borderWidth: 1, borderColor: colors.heroChip, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, margin: 4 },
  platformChipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  platformChipTxt: { fontSize: 13, color: colors.heroCtaSub, fontWeight: '500' },
  platformChipTxtActive: { color: colors.accentText, fontWeight: '700' },
});

var FLAG_FILE = FileSystem.documentDirectory + 'onboarding_done.flag';

export async function hasSeenOnboarding() {
  try {
    var info = await FileSystem.getInfoAsync(FLAG_FILE);
    return info.exists;
  } catch (e) {
    return false;
  }
}

export async function markOnboardingDone() {
  await FileSystem.writeAsStringAsync(FLAG_FILE, 'done');
}

export default function OnboardingScreen({ onDone }) {
  var [current, setCurrent] = useState(0);
  var [selections, setSelections] = useState([]);
  var flatRef = useRef(null);

  var toggleSelection = function(key) {
    setSelections(function(prev) {
      if (prev.indexOf(key) !== -1) {
        return prev.filter(function(k) { return k !== key; });
      }
      return prev.concat([key]);
    });
  };

  // On finish: seed merchant rules from the user's platform picks
  // (plus the universal seeds that apply to everyone), then mark
  // onboarding complete. Fire-and-forget — if seeding fails the user
  // still gets into the app and can classify manually.
  var finish = async function() {
    try {
      var seeds = seedsForSelections(selections);
      await seedRules(seeds);
    } catch (e) { /* non-fatal */ }
    await markOnboardingDone();
    onDone();
  };

  var goNext = function() {
    if (current < slides.length - 1) {
      flatRef.current.scrollToIndex({ index: current + 1, animated: true });
      setCurrent(current + 1);
    } else {
      finish();
    }
  };

  var onScroll = function(e) {
    var idx = Math.round(e.nativeEvent.contentOffset.x / width);
    setCurrent(idx);
  };

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />

      <FlatList
        ref={flatRef}
        data={slides}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        keyExtractor={function(item, i) { return '' + i; }}
        renderItem={function(ref) {
          var item = ref.item;
          return (
            <View style={[s.slide, { width: width }]}>
              <View style={s.graphicArea}>
                <Graphic type={item.graphic} selections={selections} toggleSelection={toggleSelection} />
              </View>
              <Text style={s.slideTitle}>{item.title}</Text>
              <Text style={s.slideSub}>{item.sub}</Text>
            </View>
          );
        }}
      />

      <View style={s.bottom}>
        <View style={s.dots}>
          {slides.map(function(_, i) {
            return (
              <View key={i} style={[s.dot, current === i && s.dotActive]} />
            );
          })}
        </View>

        <TouchableOpacity style={s.nextBtn} onPress={goNext}>
          <Text style={s.nextTxt}>
            {current === slides.length - 1
              ? (selections.length > 0 ? t(selections.length > 1 ? 'onboarding.seedStartMany' : 'onboarding.seedStartOne', { count: selections.length }) : t('onboarding.skipStart'))
              : t('onboarding.next')}
          </Text>
        </TouchableOpacity>

        {current < slides.length - 1 && (
          <TouchableOpacity style={s.skipBtn} onPress={finish}>
            <Text style={s.skipTxt}>{t('onboarding.skip')}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

var s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.heroBg },
  slide: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  graphicArea: { width: '100%', marginBottom: 40 },
  slideTitle: { fontSize: 26, fontWeight: '700', color: colors.heroText, textAlign: 'center', letterSpacing: -0.5, lineHeight: 34 },
  slideSub: { fontSize: 15, color: colors.heroTextMuted, textAlign: 'center', marginTop: 12, lineHeight: 22 },
  bottom: { paddingHorizontal: 32, paddingBottom: 50, alignItems: 'center' },
  dots: { flexDirection: 'row', marginBottom: 24 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.heroTextDim, marginHorizontal: 4 },
  dotActive: { backgroundColor: colors.accent, width: 24 },
  nextBtn: { backgroundColor: colors.accent, borderRadius: 14, paddingVertical: 16, width: '100%', alignItems: 'center' },
  nextTxt: { fontSize: 16, fontWeight: '600', color: colors.accentText },
  skipBtn: { marginTop: 16 },
  skipTxt: { fontSize: 14, color: colors.heroTextLabel },
});
