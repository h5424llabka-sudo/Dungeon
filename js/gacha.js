// ============================================================
//  gacha.js  ─  ガチャロジック・加護データ
// ============================================================

import {
  RARITY, GACHA_RATE, GACHA_PITY,
  GACHA_COST_SINGLE, GACHA_COST_TEN,
  SUBLIMATION_COUNT,
} from './constants.js';
import { writeSave } from './save.js';

// -------------------------------------------------------
// 加護（かご）マスタデータ
// -------------------------------------------------------
export const BLESSINGS = [
  // ── ★1 コモン ────────────────────────────────────
  {
    id: 'b_food_start',
    name: '旅人の靴',
    rarity: RARITY.COMMON,
    desc: 'ダンジョン開始時に食料を1個持てる。',
    icon: '🥾',
    effect: { type: 'start_food', amount: 1 },
  },
  {
    id: 'b_hunger_max',
    name: '頑丈な腹',
    rarity: RARITY.COMMON,
    desc: '満腹度の最大値が+20になる。',
    icon: '🍱',
    effect: { type: 'hunger_max', amount: 20 },
  },
  {
    id: 'b_trap_detect',
    name: '慎重な足',
    rarity: RARITY.COMMON,
    desc: '罠を踏む確率が40%低下する。',
    icon: '👣',
    effect: { type: 'trap_rate', multiply: 0.6 },
  },
  {
    id: 'b_gold_up',
    name: '商人の目利き',
    rarity: RARITY.COMMON,
    desc: '所持金の初期値が+50G。',
    icon: '💰',
    effect: { type: 'start_gold', amount: 50 },
  },

  // ── ★2 レア ─────────────────────────────────────
  {
    id: 'b_weapon_exp',
    name: '鍛冶の血',
    rarity: RARITY.RARE,
    desc: '武器・防具の経験値獲得量が1.2倍になる。',
    icon: '⚒️',
    effect: { type: 'equip_exp', multiply: 1.2 },
  },
  {
    id: 'b_gold_drop',
    name: '幸運の右手',
    rarity: RARITY.RARE,
    desc: '敵が落とすゴールドが+15%増加する。',
    icon: '🤚',
    effect: { type: 'gold_drop', multiply: 1.15 },
  },
  {
    id: 'b_grass_boost',
    name: '薬師の知恵',
    rarity: RARITY.RARE,
    desc: '草アイテムの効果量が+25%増加する。',
    icon: '🌿',
    effect: { type: 'grass_power', multiply: 1.25 },
  },
  {
    id: 'b_view_up',
    name: '夜目の術',
    rarity: RARITY.RARE,
    desc: '視野半径が+2マス広がる。',
    icon: '👁️',
    effect: { type: 'view_radius', amount: 2 },
  },
  {
    id: 'b_crit_up',
    name: '剣聖の境地',
    rarity: RARITY.RARE,
    desc: 'クリティカル率が+10%上昇する。',
    icon: '⚔️',
    effect: { type: 'crit_rate', amount: 0.10 },
  },

  // ── ★3 スーパーレア ─────────────────────────────
  {
    id: 'b_undying',
    name: '不屈の魂',
    rarity: RARITY.SUPER_RARE,
    desc: '1ダンジョン中1回、致死ダメージをHP1で耐える。',
    icon: '💪',
    effect: { type: 'death_resist', count: 1 },
  },
  {
    id: 'b_steal',
    name: '盗賊の指先',
    rarity: RARITY.SUPER_RARE,
    desc: '店のアイテムを稀に（確率5%）無料で入手できる。',
    icon: '🤏',
    effect: { type: 'shop_steal', chance: 0.05 },
  },
  {
    id: 'b_hp_regen',
    name: '生命の流れ',
    rarity: RARITY.SUPER_RARE,
    desc: '20ターンごとにHP+3自然回復する。',
    icon: '💚',
    effect: { type: 'hp_regen', interval: 20, amount: 3 },
  },
  {
    id: 'b_double_drop',
    name: '豊穣の祈り',
    rarity: RARITY.SUPER_RARE,
    desc: 'アイテムドロップ確率が+20%増加する。',
    icon: '✨',
    effect: { type: 'drop_rate', amount: 0.20 },
  },

  // ── ★4 ウルトラレア ─────────────────────────────
  {
    id: 'b_dragon_vein',
    name: '龍脈の覚醒',
    rarity: RARITY.ULTRA_RARE,
    desc: '5Fごとに攻撃力・防御力・HP最大値のいずれかが+5される。',
    icon: '🐉',
    effect: { type: 'floor_buff', interval: 5, amount: 5 },
  },
  {
    id: 'b_death_pact',
    name: '死神の加護',
    rarity: RARITY.ULTRA_RARE,
    desc: '死亡時33%の確率で復活する（アイテムは消滅）。',
    icon: '💀',
    effect: { type: 'revive', chance: 0.33 },
  },
  {
    id: 'b_memory',
    name: '記憶継承',
    rarity: RARITY.ULTRA_RARE,
    desc: '前回死亡時に装備していた武器または防具を1つ持ち込める。',
    icon: '🔮',
    effect: { type: 'inherit_equip' },
  },
];

// IDからデータを引くマップ
export const BLESSING_MAP = Object.fromEntries(BLESSINGS.map(b => [b.id, b]));

// -------------------------------------------------------
// 抽選ロジック
// -------------------------------------------------------

/**
 * レアリティを確率に基づいて決定する
 * @param {number} pityCount - 現在の天井カウント
 * @returns {number} RARITY値
 */
function rollRarity(pityCount) {
  if (pityCount >= GACHA_PITY - 1) return RARITY.ULTRA_RARE;

  const rand = Math.random() * 100;
  let cumulative = 0;
  const order = [RARITY.ULTRA_RARE, RARITY.SUPER_RARE, RARITY.RARE, RARITY.COMMON];

  for (const rarity of order) {
    cumulative += GACHA_RATE[rarity];
    if (rand < cumulative) return rarity;
  }
  return RARITY.COMMON;
}

/**
 * 指定レアリティの加護からランダムに1つ選ぶ
 * @param {number} rarity
 * @returns {object} 加護データ
 */
function pickBlessingByRarity(rarity) {
  const pool = BLESSINGS.filter(b => b.rarity === rarity);
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * 1回ガチャを引く（内部処理）
 * @param {object} saveData
 * @returns {{ blessing: object, isNew: boolean, rarity: number }}
 */
function pullOnce(saveData) {
  const rarity  = rollRarity(saveData.gachaCount);
  const blessing = pickBlessingByRarity(rarity);

  // 天井カウント更新
  if (rarity === RARITY.ULTRA_RARE) {
    saveData.gachaCount = 0;
  } else {
    saveData.gachaCount = (saveData.gachaCount || 0) + 1;
  }

  // 所持リストに追加
  saveData.ownedBlessings = saveData.ownedBlessings || [];
  const isNew = !saveData.ownedBlessings.includes(blessing.id);
  saveData.ownedBlessings.push(blessing.id);

  // 統計
  saveData.stats.totalGacha = (saveData.stats.totalGacha || 0) + 1;

  return { blessing, isNew, rarity };
}

/**
 * 単発ガチャを引く
 * @param {object} saveData
 * @returns {{ success: boolean, result?: object, error?: string }}
 */
export function pullSingle(saveData) {
  if (saveData.soulFragments < GACHA_COST_SINGLE) {
    return { success: false, error: '魂片が足りません' };
  }
  saveData.soulFragments -= GACHA_COST_SINGLE;
  const result = pullOnce(saveData);
  writeSave(saveData);
  return { success: true, results: [result] };
}

/**
 * 10連ガチャを引く（★2以上1枚確定）
 * @param {object} saveData
 * @returns {{ success: boolean, results?: Array, error?: string }}
 */
export function pullTen(saveData) {
  if (saveData.soulFragments < GACHA_COST_TEN) {
    return { success: false, error: '魂片が足りません' };
  }
  saveData.soulFragments -= GACHA_COST_TEN;

  const results = [];
  let hasRarePlus = false;

  for (let i = 0; i < 10; i++) {
    if (i === 9 && !hasRarePlus) {
      // 最後の1枚を★2以上確定にする
      const guaranteedRarity = rollRarityMin(RARITY.RARE, saveData.gachaCount);
      const blessing = pickBlessingByRarity(guaranteedRarity);
      if (guaranteedRarity === RARITY.ULTRA_RARE) saveData.gachaCount = 0;
      else saveData.gachaCount++;
      saveData.ownedBlessings.push(blessing.id);
      saveData.stats.totalGacha++;
      results.push({ blessing, isNew: false, rarity: guaranteedRarity });
    } else {
      const r = pullOnce(saveData);
      if (r.rarity >= RARITY.RARE) hasRarePlus = true;
      results.push(r);
    }
  }

  writeSave(saveData);
  return { success: true, results };
}

function rollRarityMin(minRarity, pityCount) {
  if (pityCount >= GACHA_PITY - 1) return RARITY.ULTRA_RARE;
  const rand = Math.random() * 100;
  let cumulative = 0;
  const order = [RARITY.ULTRA_RARE, RARITY.SUPER_RARE, RARITY.RARE];

  for (const rarity of order) {
    if (rarity < minRarity) continue;
    cumulative += GACHA_RATE[rarity];
    if (rand < cumulative) return rarity;
  }
  return minRarity;
}

// -------------------------------------------------------
// 昇華（Sublimation）
// -------------------------------------------------------

/**
 * 指定IDの加護を昇華できるか確認
 * @returns {{ canSublimate: boolean, count: number, upgraded?: object }}
 */
export function checkSublimation(saveData, blessingId) {
  const owned = saveData.ownedBlessings || [];
  const count = owned.filter(id => id === blessingId).length;
  const canSublimate = count >= SUBLIMATION_COUNT;
  const base = BLESSING_MAP[blessingId];
  if (!base) return { canSublimate: false, count: 0 };

  return { canSublimate, count, base };
}

/**
 * 昇華を実行する（同じ加護×3 → 上位版）
 * 上位版はIDに '_plus' を付与して動的生成
 */
export function doSublimation(saveData, blessingId) {
  const { canSublimate } = checkSublimation(saveData, blessingId);
  if (!canSublimate) return { success: false, error: '枚数が足りません' };

  // 3枚消費
  let removed = 0;
  saveData.ownedBlessings = saveData.ownedBlessings.filter(id => {
    if (id === blessingId && removed < SUBLIMATION_COUNT) {
      removed++;
      return false;
    }
    return true;
  });

  const upgradedId = blessingId + '_plus';
  saveData.ownedBlessings.push(upgradedId);
  writeSave(saveData);

  const base = BLESSING_MAP[blessingId];
  return {
    success: true,
    upgraded: createUpgradedBlessing(base),
  };
}

/**
 * 上位版加護データを動的生成（元データから強化）
 */
export function createUpgradedBlessing(base) {
  const eff = { ...base.effect };
  // amount / multiply を1.5倍、chance を1.5倍（上限0.9）
  if (eff.amount  !== undefined) eff.amount   = Math.round(eff.amount  * 1.5);
  if (eff.multiply !== undefined) eff.multiply = Math.min(2.0, +(eff.multiply * 1.3).toFixed(2));
  if (eff.chance  !== undefined) eff.chance   = Math.min(0.9, eff.chance * 1.5);

  return {
    id:     base.id + '_plus',
    name:   base.name + '＋',
    rarity: Math.min(RARITY.ULTRA_RARE, base.rarity + 1),
    desc:   base.desc + '（昇華強化済み）',
    icon:   base.icon,
    effect: eff,
    isUpgraded: true,
  };
}

/**
 * IDから加護データを取得（昇華版も対応）
 */
export function getBlessingById(id) {
  if (BLESSING_MAP[id]) return BLESSING_MAP[id];
  if (id.endsWith('_plus')) {
    const baseId = id.replace('_plus', '');
    const base = BLESSING_MAP[baseId];
    if (base) return createUpgradedBlessing(base);
  }
  return null;
}

/**
 * 所持加護一覧（重複を枚数でまとめる）
 */
export function getOwnedBlessingsSummary(saveData) {
  const counts = {};
  for (const id of (saveData.ownedBlessings || [])) {
    counts[id] = (counts[id] || 0) + 1;
  }
  return Object.entries(counts).map(([id, count]) => ({
    data: getBlessingById(id),
    count,
    id,
  })).filter(x => x.data);
}
