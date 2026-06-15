// ============================================================
//  constants.js  ─  ゲーム全体の定数定義
// ============================================================

// タイル種別
export const TILE = {
  WALL:    0,
  FLOOR:   1,
  CORRIDOR:2,
  STAIRS:  3,
  DOOR:    4,
  WATER:   5,
  TRAP:    6,

  // 村用のタイル
  NPC_STORAGE: 10,
  NPC_BANK:    11,
  NPC_SHOP:    12,
  NPC_SHRINE:  13,
  DUNGEON_GATE: 14,
  VILLAGE_FLOOR: 15,
  VILLAGE_WALL: 16,
};

// タイル描画設定
export const TILE_COLOR = {
  [TILE.WALL]:     '#1a1a2e',
  [TILE.FLOOR]:    '#2a2a3e',
  [TILE.CORRIDOR]: '#252535',
  [TILE.STAIRS]:   '#c9a96e',
  [TILE.DOOR]:     '#8b6914',
  [TILE.WATER]:    '#1a3a5e',
  [TILE.TRAP]:     '#5e1a1a',
};

export const TILE_CHAR = {
  [TILE.WALL]:     '█',
  [TILE.FLOOR]:    '·',
  [TILE.CORRIDOR]: '·',
  [TILE.STAIRS]:   '▼',
  [TILE.DOOR]:     '+',
  [TILE.WATER]:    '~',
  [TILE.TRAP]:     '^',
};

// タイルサイズ（px）
export const TILE_SIZE = 32;
export const MAP_WIDTH  = 45;
export const MAP_HEIGHT = 30;

// 視野半径
export const VIEW_RADIUS = 5;

// 方向ベクトル
export const DIR = {
  UP:         { dx:  0, dy: -1 },
  DOWN:       { dx:  0, dy:  1 },
  LEFT:       { dx: -1, dy:  0 },
  RIGHT:      { dx:  1, dy:  0 },
  UP_LEFT:    { dx: -1, dy: -1 },
  UP_RIGHT:   { dx:  1, dy: -1 },
  DOWN_LEFT:  { dx: -1, dy:  1 },
  DOWN_RIGHT: { dx:  1, dy:  1 },
};

// アイテム種別
export const ITEM_TYPE = {
  WEAPON:  'weapon',
  ARMOR:   'armor',
  GRASS:   'grass',
  SCROLL:  'scroll',
  FOOD:    'food',
  POT:     'pot',
  GOLD:    'gold',
};

// アイテムレアリティ
export const RARITY = {
  COMMON:    1,
  RARE:      2,
  SUPER_RARE:3,
  ULTRA_RARE:4,
};

export const RARITY_COLOR = {
  [RARITY.COMMON]:     '#aaaaaa',
  [RARITY.RARE]:       '#4488ff',
  [RARITY.SUPER_RARE]: '#cc44ff',
  [RARITY.ULTRA_RARE]: '#ffd700',
};

export const RARITY_NAME = {
  [RARITY.COMMON]:     '★1',
  [RARITY.RARE]:       '★2',
  [RARITY.SUPER_RARE]: '★3',
  [RARITY.ULTRA_RARE]: '★4',
};

// ガチャ確率（合計100）
export const GACHA_RATE = {
  [RARITY.COMMON]:     40,
  [RARITY.RARE]:       35,
  [RARITY.SUPER_RARE]: 20,
  [RARITY.ULTRA_RARE]: 5,
};

// 天井（この連数でURが確定）
export const GACHA_PITY = 50;

// ガチャコスト
export const GACHA_COST_SINGLE = 100;
export const GACHA_COST_TEN    = 900;

// 加護スロット拡張コスト
export const SLOT_UNLOCK_COST = [1000, 3000]; // 3枠目, 4枠目

// 昇華に必要な枚数
export const SUBLIMATION_COUNT = 3;

// ゲームステート
export const GAME_STATE = {
  VILLAGE:    'village',
  DUNGEON:    'dungeon',
  INVENTORY:  'inventory',
  GAME_OVER:  'game_over',
  CLEAR:      'clear',
};

// ダンジョン設定
export const DUNGEON_MAX_FLOOR = 15;
export const BOSS_FLOORS = [15];

// 戦闘定数
export const BASE_CRIT_RATE  = 0.05;   // 5%
export const BASE_CRIT_MULTI = 1.5;

// 満腹度
export const HUNGER_TICK = 20; // この行動数ごとに満腹度-1
export const HUNGER_DAMAGE_TICK = 10; // 満腹度0のとき、この行動数ごとにHP-1

// 経験値テーブル（レベルアップに必要な累計Exp）
export const EXP_TABLE = [
  0, 10, 30, 60, 100, 150, 220, 310, 420, 550, 700, 900, 1150, 1450, 1800, 2200, 2650, 3200, 3800, 4500, 5300
];

// インベントリ最大数
export const INVENTORY_MAX = 20;

// キーコード
export const KEYS = {
  UP:        ['ArrowUp',    'w', 'k'],
  DOWN:      ['ArrowDown',  's', 'j'],
  LEFT:      ['ArrowLeft',  'a', 'h'],
  RIGHT:     ['ArrowRight', 'd', 'l'],
  UP_LEFT:   ['q', 'y'],
  UP_RIGHT:  ['e', 'u'],
  DOWN_LEFT: ['z', 'b'],
  DOWN_RIGHT:['c', 'n'],
  WAIT:      [' ', '.', 'Enter'],
  PICK_UP:   ['g'],
  INVENTORY: ['i'],
  STAIRS:    ['>', '＞', 'Enter'],
};

// 魂片（魂片獲得係数）
export const SOUL_PER_FLOOR = 10;     // 死亡時：到達F × この値
export const SOUL_BOSS_KILL = 100;    // ボス撃破ボーナス
export const SOUL_CLEAR     = 500;    // クリアボーナス
