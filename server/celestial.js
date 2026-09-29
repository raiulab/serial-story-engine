const SYNODIC_MONTH_DAYS = 29.530588853;
const REFERENCE_NEW_MOON_UTC = Date.parse('2000-01-06T18:14:00Z');

const MOON_PHASES = [
  { key: 'new_moon', name: '新月', symbol: '●', theme: '静けさ、種、まだ形にならない意志' },
  { key: 'waxing_crescent', name: '三日月', symbol: '◔', theme: '兆し、試み、かすかな前進' },
  { key: 'first_quarter', name: '上弦', symbol: '◐', theme: '選択、摩擦、行動への移行' },
  { key: 'waxing_gibbous', name: '十三夜', symbol: '◕', theme: '成熟、調整、満ちていく緊張' },
  { key: 'full_moon', name: '満月', symbol: '○', theme: '照明、顕現、感情の頂点' },
  { key: 'waning_gibbous', name: '寝待月', symbol: '◕', theme: '分かち合い、理解、余韻' },
  { key: 'last_quarter', name: '下弦', symbol: '◑', theme: '見直し、手放し、方向転換' },
  { key: 'waning_crescent', name: '有明月', symbol: '◔', theme: '休息、統合、次の周期への準備' }
];

const LUNAR_QUARTERS = [
  { key: 'new_to_first', label: '新月〜上弦', theme: '種を置き、兆しを行動へ移し始める' },
  { key: 'first_to_full', label: '上弦〜満月', theme: '摩擦と選択を育て、顕現へ向けて緊張を満たす' },
  { key: 'full_to_last', label: '満月〜下弦', theme: '表面化したものの余波を受け取り、意味を組み替える' },
  { key: 'last_to_new', label: '下弦〜新月', theme: '手放しと統合を進め、次の種のための余白を作る' }
];

const parseDateAtJstNoon = (dateString) => {
  const safeDate = /^\d{4}-\d{2}-\d{2}$/.test(dateString || '')
    ? dateString
    : new Date().toISOString().slice(0, 10);
  return new Date(`${safeDate}T12:00:00+09:00`);
};

export const getMoonContext = (dateString) => {
  const date = parseDateAtJstNoon(dateString);
  const elapsedDays = (date.getTime() - REFERENCE_NEW_MOON_UTC) / 86400000;
  const age = ((elapsedDays % SYNODIC_MONTH_DAYS) + SYNODIC_MONTH_DAYS) % SYNODIC_MONTH_DAYS;
  const fraction = age / SYNODIC_MONTH_DAYS;
  const phaseIndex = Math.floor(((fraction + 1 / 16) % 1) * 8);
  const phase = MOON_PHASES[phaseIndex];

  return {
    ...phase,
    age: Number(age.toFixed(1)),
    illumination: Number(((1 - Math.cos(2 * Math.PI * fraction)) / 2 * 100).toFixed(0)),
    lunationNumber: Math.floor(elapsedDays / SYNODIC_MONTH_DAYS),
    approximate: true
  };
};

export const getLunarQuarterContext = (dateString) => {
  const moon = getMoonContext(dateString);
  const fraction = moon.age / SYNODIC_MONTH_DAYS;
  const quarterIndex = Math.min(Math.floor(fraction * 4), 3);
  const quarter = LUNAR_QUARTERS[quarterIndex];
  const progress = (fraction * 4) - quarterIndex;
  return {
    ...quarter,
    index: quarterIndex,
    cycleId: `${moon.lunationNumber}:${quarterIndex}`,
    progress: Number((progress * 100).toFixed(0)),
    daysRemaining: Number(((1 - progress) * SYNODIC_MONTH_DAYS / 4).toFixed(1))
  };
};

const getSolarSign = (month, day) => {
  const md = month * 100 + day;
  if (md >= 321 && md <= 419) return ['牡羊座', '始まり、衝動、勇気'];
  if (md >= 420 && md <= 520) return ['牡牛座', '感覚、持続、身体性'];
  if (md >= 521 && md <= 621) return ['双子座', '言葉、移動、二面性'];
  if (md >= 622 && md <= 722) return ['蟹座', '記憶、居場所、守るもの'];
  if (md >= 723 && md <= 822) return ['獅子座', '表現、誇り、創造する心'];
  if (md >= 823 && md <= 922) return ['乙女座', '観察、整えること、小さな働き'];
  if (md >= 923 && md <= 1023) return ['天秤座', '関係、均衡、鏡としての他者'];
  if (md >= 1024 && md <= 1122) return ['蠍座', '深層、変容、隠された結びつき'];
  if (md >= 1123 && md <= 1221) return ['射手座', '探求、遠方、意味への旅'];
  if (md >= 1222 || md <= 119) return ['山羊座', '時間、責任、積み重ね'];
  if (md >= 120 && md <= 218) return ['水瓶座', '境界を越える視点、共同体、未来'];
  return ['魚座', '夢、共感、溶け合う境界'];
};

export const getSolarContext = (dateString) => {
  const date = parseDateAtJstNoon(dateString);
  const [name, theme] = getSolarSign(date.getMonth() + 1, date.getDate());
  return { name, theme, system: 'tropical_sun_sign' };
};

export const getCelestialContext = (dateString) => ({
  moon: getMoonContext(dateString),
  sun: getSolarContext(dateString)
});
