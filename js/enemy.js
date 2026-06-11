// ============================================================
//  enemy.js  ─  敵クラス・AIロジック
// ============================================================

import { BASE_CRIT_RATE, BASE_CRIT_MULTI } from './constants.js';

// -------------------------------------------------------
// 敵マスタ
// -------------------------------------------------------
export const ENEMY_DEFS = [
  // ── 初期（F1〜3）──────────────────────────────────
  {
    id: 'slime',     name: 'スライム',    icon: '🟢',
    hp: 15, atk: 4,  def: 0, exp: 8,  goldMin: 3,  goldMax: 8,
    minFloor: 1, maxFloor: 8,
    special: 'dissolve',    // アイテムを溶かす
    ai: 'normal', speed: 1,
    desc: '酸でアイテムを溶かすことがある。',
  },
  {
    id: 'bat',       name: 'コウモリ',    icon: '🦇',
    hp: 12, atk: 5,  def: 1, exp: 10, goldMin: 2,  goldMax: 6,
    minFloor: 1, maxFloor: 10,
    special: 'double_attack',
    ai: 'fast', speed: 2,
    desc: '1ターンに2回攻撃する。',
  },
  {
    id: 'goblin',    name: 'ゴブリン',    icon: '👺',
    hp: 18, atk: 6,  def: 1, exp: 12, goldMin: 5,  goldMax: 15,
    minFloor: 1, maxFloor: 12,
    special: 'steal',       // アイテムを盗む
    ai: 'normal', speed: 1,
    desc: 'アイテムを盗んで逃げることがある。',
  },
  // ── 中盤（F4〜10）─────────────────────────────────
  {
    id: 'mage',      name: '魔道士',      icon: '🧙',
    hp: 22, atk: 8,  def: 2, exp: 20, goldMin: 8,  goldMax: 20,
    minFloor: 4, maxFloor: 15,
    special: 'magic_bolt',  // 直線上に魔法を放つ
    ai: 'ranged', speed: 1,
    desc: '離れた位置から魔法弾を放つ。',
  },
  {
    id: 'statue',    name: '石像兵',      icon: '🗿',
    hp: 40, atk: 7,  def: 8, exp: 25, goldMin: 10, goldMax: 25,
    minFloor: 5, maxFloor: 20,
    special: null,
    ai: 'slow', speed: 1,
    desc: '高い防御力を持つ。鈍足。',
  },
  {
    id: 'poison_frog', name: '毒ガエル',  icon: '🐸',
    hp: 25, atk: 9,  def: 2, exp: 22, goldMin: 5,  goldMax: 12,
    minFloor: 5, maxFloor: 15,
    special: 'poison',
    ai: 'normal', speed: 1,
    desc: '攻撃が当たると毒になる。',
  },
  {
    id: 'thief_bird', name: '盗賊鳥',     icon: '🦅',
    hp: 20, atk: 8,  def: 3, exp: 18, goldMin: 0,  goldMax: 0,
    minFloor: 6, maxFloor: 18,
    special: 'gold_steal',  // ゴールドを盗む
    ai: 'fast', speed: 2,
    desc: 'ゴールドを盗んで飛び去ることがある。',
  },
  // ── 終盤（F11〜19）────────────────────────────────
  {
    id: 'dark_knight', name: '暗黒騎士',  icon: '🧟',
    hp: 55, atk: 14, def: 8, exp: 45, goldMin: 15, goldMax: 40,
    minFloor: 11, maxFloor: 20,
    special: 'life_drain',
    ai: 'normal', speed: 1,
    desc: '攻撃でHPを吸収する。',
  },
  {
    id: 'witch',     name: '魔女',        icon: '🧝',
    hp: 35, atk: 12, def: 3, exp: 40, goldMin: 20, goldMax: 50,
    minFloor: 12, maxFloor: 20,
    special: 'curse_equip',
    ai: 'ranged', speed: 1,
    desc: '装備品を呪う呪文を使う。',
  },
  // ── ボス ──────────────────────────────────────────
  {
    id: 'boss_garmu', name: '魔将ガルム',  icon: '👹',
    hp: 120, atk: 18, def: 10, exp: 200, goldMin: 100, goldMax: 200,
    minFloor: 5, maxFloor: 5, isBoss: true,
    special: 'summon_minion',
    ai: 'boss', speed: 1,
    desc: '配下のモンスターを召喚する。',
  },
  {
    id: 'boss_dragon', name: '水龍',       icon: '🐉',
    hp: 200, atk: 22, def: 12, exp: 400, goldMin: 200, goldMax: 350,
    minFloor: 10, maxFloor: 10, isBoss: true,
    special: 'flood',
    ai: 'boss', speed: 1,
    desc: '水を噴き出し周囲のタイルを水面に変える。',
  },
  {
    id: 'boss_reaper', name: '死神',       icon: '💀',
    hp: 180, atk: 28, def: 8, exp: 600, goldMin: 300, goldMax: 500,
    minFloor: 15, maxFloor: 15, isBoss: true,
    special: 'death_mark',
    ai: 'boss', speed: 1,
    desc: '死の刻印を付与する。3ターン後に即死。',
  },
  {
    id: 'boss_final', name: '混沌の王',    icon: '☠️',
    hp: 350, atk: 35, def: 15, exp: 1000, goldMin: 500, goldMax: 1000,
    minFloor: 20, maxFloor: 20, isBoss: true,
    special: 'chaos_aura',
    ai: 'boss', speed: 1,
    desc: '全ての属性攻撃を使いこなす最終ボス。',
  },
];

// フロアに応じた出現敵リストを取得
export function getEnemyPoolForFloor(floor) {
  return ENEMY_DEFS.filter(e =>
    !e.isBoss && e.minFloor <= floor && e.maxFloor >= floor
  );
}

export function getBossForFloor(floor) {
  return ENEMY_DEFS.find(e => e.isBoss && e.minFloor === floor) || null;
}

// -------------------------------------------------------
// 敵インスタンス
// -------------------------------------------------------
let _enemyIdCounter = 0;

export class Enemy {
  constructor(def, x, y, floor) {
    this.uid       = ++_enemyIdCounter;
    this.id        = def.id;
    this.name      = def.name;
    this.icon      = def.icon;
    this.isBoss    = def.isBoss || false;

    // フロアに応じてスケール
    const scale   = 1 + (floor - 1) * 0.1;
    this.hpMax    = Math.floor(def.hp  * scale);
    this.hp       = this.hpMax;
    this.baseAtk  = Math.floor(def.atk * scale);
    this.baseDef  = def.def;
    this.exp      = def.exp;
    this.goldMin  = def.goldMin;
    this.goldMax  = def.goldMax;
    this.special  = def.special;
    this.ai       = def.ai;
    this.speed    = def.speed;

    this.x = x;
    this.y = y;
    this.direction = 'DOWN';
    this.animState = 0;

    // AI状態
    this.alertTurn   = 0;    // 何ターン追跡中か
    this.isAlerted   = false;
    this.stolenItem  = null; // 盗んだアイテム
    this.hasFled     = false;

    // 状態異常
    this.statuses = {};

    // 特殊クールダウン
    this.specialCooldown = 0;
  }

  // -------------------------------------------------------
  //  AI行動
  // -------------------------------------------------------
  /**
   * 1ターン分のAI行動を計算して返す
   * @param {object} player
   * @param {number[][]} tiles
   * @param {Enemy[]} enemies
   * @returns {{ type: string, dx?: number, dy?: number, ... }}
   */
  decideAction(player, tiles, enemies) {
    if (this.isDead()) return { type: 'none' };
    if (this.hasStatus('sleep') || this.hasStatus('stun')) {
      this.tickStatuses();
      return { type: 'wait', reason: 'status' };
    }
    this.tickStatuses();

    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const distChebyshev = Math.max(Math.abs(dx), Math.abs(dy));
    const distManhattan = Math.abs(dx) + Math.abs(dy);

    // 視野範囲内でアラート
    if (distChebyshev <= 6 && !this.isAlerted) this.isAlerted = true;
    if (!this.isAlerted) return { type: 'idle' };

    if (this.specialCooldown > 0) this.specialCooldown--;

    // 特殊行動
    if (this.specialCooldown === 0 && this.special) {
      const specialAct = this._trySpecial(player, distChebyshev);
      if (specialAct) {
        this.specialCooldown = 3;
        return specialAct;
      }
    }

    // 通常移動・攻撃
    if (distChebyshev <= 1) {
      // 隣接 → 攻撃
      return { type: 'attack', target: player };
    }

    // 接近
    const move = this._moveToward(player, tiles, enemies);
    return move || { type: 'idle' };
  }

  _trySpecial(player, dist) {
    switch (this.special) {
      case 'double_attack':
        if (dist <= 1.5) return { type: 'double_attack', target: player };
        break;
      case 'magic_bolt':
        if (dist <= 5)   return { type: 'magic_bolt', target: player, dmg: Math.floor(this.baseAtk * 0.8) };
        break;
      case 'poison':
        if (dist <= 1.5) return { type: 'poison_attack', target: player, duration: 4 };
        break;
      case 'steal':
        if (dist <= 1.5) return { type: 'steal_item', target: player };
        break;
      case 'gold_steal':
        if (dist <= 1.5) return { type: 'steal_gold', target: player };
        break;
      case 'life_drain':
        if (dist <= 1.5) return { type: 'life_drain', target: player };
        break;
      case 'summon_minion':
        return { type: 'summon_minion', count: 2 };
      case 'flood':
        return { type: 'flood' };
      case 'death_mark':
        if (dist <= 3) return { type: 'death_mark', target: player, duration: 3 };
        break;
      case 'chaos_aura':
        return { type: 'chaos_aura', target: player };
    }
    return null;
  }

  _moveToward(player, tiles, enemies) {
    // グリーディな移動（敵の位置を避けながら）
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const stepX = dx === 0 ? 0 : dx > 0 ? 1 : -1;
    const stepY = dy === 0 ? 0 : dy > 0 ? 1 : -1;

    const candidates = [
      { x: this.x + stepX, y: this.y + stepY },
      { x: this.x + stepX, y: this.y },
      { x: this.x,         y: this.y + stepY },
    ];

    for (const { x, y } of candidates) {
      if (!this._isBlocked(x, y, tiles, enemies, player)) {
        return { type: 'move', nx: x, ny: y };
      }
    }
    return null;
  }

  _isBlocked(x, y, tiles, enemies, player) {
    if (x < 0 || y < 0) return true;
    const t = tiles[y]?.[x];
    if (t === undefined || t === 0) return true; // WALL
    if (enemies.some(e => e.x === x && e.y === y && !e.isDead())) return true;
    if (player && player.x === x && player.y === y) return true;
    return false;
  }

  // -------------------------------------------------------
  //  ダメージ・状態異常
  // -------------------------------------------------------
  takeDamage(amount) {
    const actual = Math.max(1, amount - this.baseDef);
    this.hp = Math.max(0, this.hp - actual);
    return actual;
  }

  addStatus(name, duration) {
    this.statuses[name] = Math.max(this.statuses[name] || 0, duration);
    this.isAlerted = true;
  }

  hasStatus(name) {
    return (this.statuses[name] || 0) > 0;
  }

  tickStatuses() {
    for (const key of Object.keys(this.statuses)) {
      if (this.statuses[key] > 0) this.statuses[key]--;
      if (this.statuses[key] <= 0) delete this.statuses[key];
    }
  }

  isDead() { return this.hp <= 0; }

  // -------------------------------------------------------
  //  ドロップ
  // -------------------------------------------------------
  dropGold(goldDropMultiplier = 1) {
    if (this.goldMax === 0) return 0;
    const base = this.goldMin + Math.floor(Math.random() * (this.goldMax - this.goldMin + 1));
    return Math.floor(base * goldDropMultiplier);
  }

  calcAttack() {
    const isCrit = Math.random() < BASE_CRIT_RATE;
    const base   = this.baseAtk + Math.floor(Math.random() * Math.max(1, this.baseAtk * 0.3));
    return {
      damage: isCrit ? Math.floor(base * BASE_CRIT_MULTI) : base,
      isCrit,
    };
  }
}

/**
 * フロアに応じた敵を生成する
 */
export function spawnEnemy(x, y, floor, isBoss = false) {
  let def;
  if (isBoss) {
    def = getBossForFloor(floor);
    if (!def) def = ENEMY_DEFS[0]; // フォールバック
  } else {
    const pool = getEnemyPoolForFloor(floor);
    if (!pool.length) return null;
    def = pool[Math.floor(Math.random() * pool.length)];
  }
  return new Enemy(def, x, y, floor);
}
