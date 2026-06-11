// ============================================================
//  save.js  ─  LocalStorage による永続データ管理
// ============================================================

const SAVE_KEY = 'roguelike2_save';

const DEFAULT_SAVE = {
  soulFragments: 0,
  gachaCount:    0,       // 天井カウント
  ownedBlessings: [],     // 所持加護IDリスト（重複あり = 枚数）
  blessingSlots:  2,      // 加護スロット数（初期2）
  selectedBlessings: [],  // 今回選択した加護IDリスト
  
  // 村システム用
  bankGold: 0,            // 銀行に預けているお金
  storage: [],            // 倉庫に預けているアイテムリスト
  playerGold: 0,          // プレイヤーが現在所持しているお金
  playerInventory: [],    // プレイヤーが現在所持しているアイテムリスト
  shopInventory: null,    // お店のラインナップ

  stats: {
    totalRuns:   0,
    maxFloor:    0,
    totalKills:  0,
    totalGacha:  0,
    clears:      0,
  },
  achievements: {},       // { id: true } 解除済み実績
};

export function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return structuredClone(DEFAULT_SAVE);
    const data = JSON.parse(raw);
    // 旧バージョン対応：不足フィールドをデフォルト値で補完
    return deepMerge(structuredClone(DEFAULT_SAVE), data);
  } catch (e) {
    console.warn('セーブデータ読み込み失敗:', e);
    return structuredClone(DEFAULT_SAVE);
  }
}

export function writeSave(data) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('セーブデータ書き込み失敗:', e);
  }
}

export function deleteSave() {
  localStorage.removeItem(SAVE_KEY);
}

// -------------------------------------------------------
// 魂片操作
// -------------------------------------------------------
export function addSoulFragments(saveData, amount) {
  saveData.soulFragments = Math.max(0, (saveData.soulFragments || 0) + amount);
  writeSave(saveData);
}

export function spendSoulFragments(saveData, amount) {
  if (saveData.soulFragments < amount) return false;
  saveData.soulFragments -= amount;
  writeSave(saveData);
  return true;
}

// -------------------------------------------------------
// 実績チェック
// -------------------------------------------------------
const ACHIEVEMENTS = [
  { id: 'first_run',    label: '初めての冒険',    reward: 100,  check: (s) => s.totalRuns >= 1 },
  { id: 'floor_5',      label: '5Fに到達',         reward: 200,  check: (s) => s.maxFloor >= 5 },
  { id: 'floor_10',     label: '10Fに到達',        reward: 300,  check: (s) => s.maxFloor >= 10 },
  { id: 'floor_15',     label: '15Fに到達',        reward: 500,  check: (s) => s.maxFloor >= 15 },
  { id: 'clear',        label: '初クリア！',       reward: 1000, check: (s) => s.clears >= 1 },
  { id: 'kill_100',     label: '討伐数100体',      reward: 200,  check: (s) => s.totalKills >= 100 },
  { id: 'gacha_10',     label: 'ガチャ10連初回',   reward: 0,    check: (s) => s.totalGacha >= 10 },
];

/**
 * 実績チェックを行い、新たに解除された実績と獲得魂片を返す
 * @returns {{ newAchievements: Array, totalReward: number }}
 */
export function checkAchievements(saveData) {
  const newAchievements = [];
  let totalReward = 0;

  for (const ach of ACHIEVEMENTS) {
    if (!saveData.achievements[ach.id] && ach.check(saveData.stats)) {
      saveData.achievements[ach.id] = true;
      newAchievements.push(ach);
      totalReward += ach.reward;
    }
  }

  if (newAchievements.length > 0) {
    saveData.soulFragments = (saveData.soulFragments || 0) + totalReward;
    writeSave(saveData);
  }

  return { newAchievements, totalReward };
}

export function getAllAchievements() {
  return ACHIEVEMENTS;
}

// -------------------------------------------------------
// ユーティリティ
// -------------------------------------------------------
function deepMerge(target, source) {
  for (const key of Object.keys(source)) {
    if (
      source[key] !== null &&
      typeof source[key] === 'object' &&
      !Array.isArray(source[key]) &&
      key in target
    ) {
      deepMerge(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}
