// ============================================================
//  enemy.js  ─  敵クラス・AIロジック
// ============================================================

import { BASE_CRIT_RATE, BASE_CRIT_MULTI } from './constants.js';

// -------------------------------------------------------
// 敵マスタ
// -------------------------------------------------------
export const ENEMY_DEFS = [
  // --- 無能力系統 (9種) ---
  // 1. スライム
  { id: 'slime1', name: 'スライム',       icon: '🟢', hp: 10, atk: 3, def: 0, exp: 1, goldMin: 2, goldMax: 5, minFloor: 1, maxFloor: 4, special: null, ai: 'normal', speed: 1, desc: '普通のぷるぷるしたモンスター。' },
  { id: 'slime2', name: 'スライムベス',   icon: '🔴', hp: 20, atk: 5, def: 1, exp: 3, goldMin: 5, goldMax: 10, minFloor: 4, maxFloor: 9, special: null, ai: 'normal', speed: 1, desc: '少し強くなった赤いスライム。' },
  { id: 'slime3', name: 'キングスライム', icon: '👑', hp: 40, atk: 12, def: 4, exp: 12, goldMin: 15, goldMax: 30, minFloor: 9, maxFloor: 15, special: null, ai: 'normal', speed: 1, desc: '巨大なスライムの王。' },

  // 2. コウモリ
  { id: 'bat1', name: 'コウモリ',         icon: '🦇', hp: 8, atk: 4, def: 0, exp: 2, goldMin: 1, goldMax: 3, minFloor: 1, maxFloor: 4, special: null, ai: 'normal', speed: 1, desc: '暗闇に潜むコウモリ。' },
  { id: 'bat2', name: '大コウモリ',       icon: '🦇', hp: 18, atk: 7, def: 1, exp: 4, goldMin: 4, goldMax: 8, minFloor: 5, maxFloor: 10, special: null, ai: 'normal', speed: 1, desc: '大きく育ったコウモリ。' },
  { id: 'bat3', name: 'ヴァンパイアバット', icon: '🦇', hp: 35, atk: 14, def: 3, exp: 14, goldMin: 10, goldMax: 20, minFloor: 10, maxFloor: 15, special: null, ai: 'normal', speed: 1, desc: '血を求める凶暴なコウモリ。' },

  // 3. ゴブリン
  { id: 'goblin1', name: 'ゴブリン',       icon: '👺', hp: 12, atk: 4, def: 1, exp: 2, goldMin: 3, goldMax: 8, minFloor: 1, maxFloor: 5, special: null, ai: 'normal', speed: 1, desc: 'ずる賢い小鬼。' },
  { id: 'goblin2', name: 'ホブゴブリン',   icon: '👺', hp: 25, atk: 8, def: 2, exp: 5, goldMin: 8, goldMax: 15, minFloor: 5, maxFloor: 11, special: null, ai: 'normal', speed: 1, desc: '逞しくなった小鬼の戦士。' },
  { id: 'goblin3', name: 'ゴブリンキング', icon: '👹', hp: 50, atk: 16, def: 5, exp: 16, goldMin: 20, goldMax: 40, minFloor: 11, maxFloor: 15, special: null, ai: 'normal', speed: 1, desc: '小鬼たちを束ねる王。' },

  // 4. オーク
  { id: 'orc1', name: 'オーク',           icon: '🐗', hp: 16, atk: 5, def: 1, exp: 3, goldMin: 4, goldMax: 10, minFloor: 2, maxFloor: 6, special: null, ai: 'normal', speed: 1, desc: '豚の顔をした魔物。' },
  { id: 'orc2', name: 'オーク戦士',       icon: '🐗', hp: 30, atk: 10, def: 3, exp: 7, goldMin: 10, goldMax: 20, minFloor: 6, maxFloor: 12, special: null, ai: 'normal', speed: 1, desc: '武装したオーク。' },
  { id: 'orc3', name: 'オーク大将',       icon: '🐗', hp: 60, atk: 18, def: 6, exp: 18, goldMin: 25, goldMax: 50, minFloor: 12, maxFloor: 15, special: null, ai: 'normal', speed: 1, desc: 'オークの群れを率いる大将。' },

  // 5. ゴーレム
  { id: 'golem1', name: 'ゴーレム',       icon: '🗿', hp: 20, atk: 4, def: 4, exp: 4, goldMin: 0, goldMax: 5, minFloor: 3, maxFloor: 7, special: null, ai: 'normal', speed: 1, desc: '泥でできた人形。' },
  { id: 'golem2', name: 'ストーンゴーレム', icon: '🗿', hp: 45, atk: 8, def: 8, exp: 9, goldMin: 0, goldMax: 10, minFloor: 7, maxFloor: 13, special: null, ai: 'normal', speed: 1, desc: '岩で作られた強固な人形。' },
  { id: 'golem3', name: 'アイアンゴーレム', icon: '🗿', hp: 80, atk: 15, def: 12, exp: 22, goldMin: 0, goldMax: 20, minFloor: 13, maxFloor: 15, special: null, ai: 'normal', speed: 1, desc: '鉄壁の防御を誇る鋼の人形。' },

  // 6. ウルフ
  { id: 'wolf1', name: 'ウルフ',           icon: '🐺', hp: 12, atk: 5, def: 0, exp: 2, goldMin: 0, goldMax: 0, minFloor: 2, maxFloor: 6, special: null, ai: 'fast', speed: 2, desc: '素早く動く狼。' },
  { id: 'wolf2', name: 'ダイアウルフ',     icon: '🐺', hp: 24, atk: 9, def: 1, exp: 5, goldMin: 0, goldMax: 0, minFloor: 6, maxFloor: 11, special: null, ai: 'fast', speed: 2, desc: '大きく凶暴な狼。' },
  { id: 'wolf3', name: 'フェンリル',       icon: '🐺', hp: 45, atk: 15, def: 3, exp: 15, goldMin: 0, goldMax: 0, minFloor: 11, maxFloor: 15, special: null, ai: 'fast', speed: 2, desc: '魔力を持った神狼。' },

  // 7. スケルトン
  { id: 'skel1', name: 'スケルトン',       icon: '💀', hp: 14, atk: 6, def: 1, exp: 3, goldMin: 1, goldMax: 3, minFloor: 3, maxFloor: 8, special: null, ai: 'normal', speed: 1, desc: '動く骸骨。' },
  { id: 'skel2', name: 'スケルトンナイト', icon: '💀', hp: 28, atk: 11, def: 4, exp: 7, goldMin: 5, goldMax: 10, minFloor: 8, maxFloor: 13, special: null, ai: 'normal', speed: 1, desc: '生前の武装を纏う骸骨戦士。' },
  { id: 'skel3', name: 'スケルトンロード', icon: '💀', hp: 55, atk: 17, def: 7, exp: 17, goldMin: 15, goldMax: 30, minFloor: 13, maxFloor: 15, special: null, ai: 'normal', speed: 1, desc: '骸骨を統べる不死の王。' },

  // 8. ヘビ
  { id: 'snake1', name: '大蛇',             icon: '🐍', hp: 15, atk: 5, def: 1, exp: 3, goldMin: 0, goldMax: 0, minFloor: 4, maxFloor: 9, special: null, ai: 'normal', speed: 1, desc: '巨大な蛇。' },
  { id: 'snake2', name: 'ポイズンスネーク', icon: '🐍', hp: 30, atk: 10, def: 2, exp: 6, goldMin: 0, goldMax: 0, minFloor: 8, maxFloor: 13, special: null, ai: 'normal', speed: 1, desc: '鮮やかな色をした蛇。' },
  { id: 'snake3', name: 'バジリスク',       icon: '🐍', hp: 55, atk: 16, def: 5, exp: 16, goldMin: 0, goldMax: 0, minFloor: 12, maxFloor: 15, special: null, ai: 'normal', speed: 1, desc: '睨みつける魔眼を持つ蛇。' },

  // 9. 騎士
  { id: 'knight1', name: '騎士',           icon: '🤺', hp: 18, atk: 6, def: 3, exp: 4, goldMin: 10, goldMax: 20, minFloor: 4, maxFloor: 9, special: null, ai: 'normal', speed: 1, desc: '名もなき騎士。' },
  { id: 'knight2', name: '鎧騎士',         icon: '🛡️', hp: 35, atk: 12, def: 6, exp: 9, goldMin: 20, goldMax: 40, minFloor: 9, maxFloor: 14, special: null, ai: 'normal', speed: 1, desc: '重い鎧に身を包む。' },
  { id: 'knight3', name: 'リビングアーマー', icon: '⚔️', hp: 65, atk: 18, def: 10, exp: 20, goldMin: 30, goldMax: 60, minFloor: 14, maxFloor: 15, special: null, ai: 'normal', speed: 1, desc: '魂が宿った呪いの鎧。' },

  // --- 特殊能力系統 (6種) ---
  // 10. 泥棒系 (steal_item/steal_gold)
  { id: 'thief1', name: '泥棒鳥',         icon: '🦅', hp: 10, atk: 3, def: 0, exp: 2, goldMin: 0, goldMax: 0, minFloor: 2, maxFloor: 7, special: 'steal_gold', ai: 'fast', speed: 2, desc: 'お金を盗んで逃げる。' },
  { id: 'thief2', name: '盗賊鳥',         icon: '🦅', hp: 20, atk: 6, def: 1, exp: 5, goldMin: 0, goldMax: 0, minFloor: 7, maxFloor: 12, special: 'steal_item', ai: 'fast', speed: 2, desc: 'アイテムを盗んで逃げる。' },
  { id: 'thief3', name: '怪盗鳥',         icon: '🦅', hp: 40, atk: 10, def: 2, exp: 12, goldMin: 0, goldMax: 0, minFloor: 12, maxFloor: 15, special: 'steal_item', ai: 'fast', speed: 2, desc: '大事なアイテムを盗んで逃げる。' },

  // 11. 魔法系 (magic_bolt)
  { id: 'mage1', name: '魔道士',         icon: '🧙', hp: 12, atk: 5, def: 1, exp: 3, goldMin: 5, goldMax: 10, minFloor: 3, maxFloor: 8, special: 'magic_bolt', ai: 'ranged', speed: 1, desc: '遠距離から魔法を撃つ。' },
  { id: 'mage2', name: '大魔道士',       icon: '🧙', hp: 25, atk: 10, def: 2, exp: 7, goldMin: 15, goldMax: 25, minFloor: 8, maxFloor: 13, special: 'magic_bolt', ai: 'ranged', speed: 1, desc: '強力な魔法を撃つ。' },
  { id: 'mage3', name: 'アークメイジ',   icon: '🧙‍♂️', hp: 50, atk: 18, def: 4, exp: 16, goldMin: 30, goldMax: 50, minFloor: 13, maxFloor: 15, special: 'magic_bolt', ai: 'ranged', speed: 1, desc: '極大魔法を操る大魔道。' },

  // 12. 毒系 (poison)
  { id: 'poison1', name: '毒ガエル',       icon: '🐸', hp: 12, atk: 4, def: 1, exp: 2, goldMin: 0, goldMax: 0, minFloor: 3, maxFloor: 8, special: 'poison', ai: 'normal', speed: 1, desc: '攻撃時に毒を与える。' },
  { id: 'poison2', name: '猛毒ガエル',     icon: '🐸', hp: 24, atk: 8, def: 2, exp: 5, goldMin: 0, goldMax: 0, minFloor: 8, maxFloor: 13, special: 'poison', ai: 'normal', speed: 1, desc: '攻撃時に猛毒を与える。' },
  { id: 'poison3', name: '劇毒ガエル',     icon: '🐸', hp: 45, atk: 14, def: 4, exp: 14, goldMin: 0, goldMax: 0, minFloor: 13, maxFloor: 15, special: 'poison', ai: 'normal', speed: 1, desc: '触れるだけで危険な劇毒を持つ。' },

  // 13. 吸血系 (life_drain)
  { id: 'vamp1', name: 'ゾンビ',         icon: '🧟', hp: 18, atk: 6, def: 1, exp: 4, goldMin: 2, goldMax: 5, minFloor: 4, maxFloor: 9, special: 'life_drain', ai: 'normal', speed: 1, desc: 'HPを吸収する。' },
  { id: 'vamp2', name: 'グール',         icon: '🧟', hp: 35, atk: 11, def: 3, exp: 8, goldMin: 5, goldMax: 12, minFloor: 9, maxFloor: 14, special: 'life_drain', ai: 'normal', speed: 1, desc: '与えたダメージで回復する。' },
  { id: 'vamp3', name: 'ヴァンパイア',   icon: '🧛', hp: 65, atk: 16, def: 6, exp: 18, goldMin: 20, goldMax: 40, minFloor: 14, maxFloor: 15, special: 'life_drain', ai: 'normal', speed: 1, desc: '血を吸い尽くす吸血鬼。' },

  // 14. 溶解系 (dissolve)
  { id: 'melt1', name: 'アメーバ',       icon: '🦠', hp: 14, atk: 4, def: 1, exp: 3, goldMin: 0, goldMax: 0, minFloor: 5, maxFloor: 10, special: 'dissolve', ai: 'normal', speed: 1, desc: '装備品の強化値を下げる。' },
  { id: 'melt2', name: 'アシッドゼリー', icon: '🦠', hp: 28, atk: 9, def: 2, exp: 7, goldMin: 0, goldMax: 0, minFloor: 10, maxFloor: 14, special: 'dissolve', ai: 'normal', speed: 1, desc: '装備を強く溶かす。' },
  { id: 'melt3', name: 'メルトスライム', icon: '🦠', hp: 55, atk: 15, def: 5, exp: 16, goldMin: 0, goldMax: 0, minFloor: 14, maxFloor: 15, special: 'dissolve', ai: 'normal', speed: 1, desc: '全てを溶かす恐ろしい粘液。' },

  // 15. 倍速系 (double_attack)
  { id: 'mantis1', name: 'キラーマンティス', icon: '🦗', hp: 15, atk: 5, def: 1, exp: 4, goldMin: 2, goldMax: 6, minFloor: 6, maxFloor: 11, special: 'double_attack', ai: 'fast', speed: 2, desc: '1ターンに2回攻撃する。' },
  { id: 'mantis2', name: 'デスマンティス',   icon: '🦗', hp: 30, atk: 10, def: 3, exp: 9, goldMin: 5, goldMax: 15, minFloor: 11, maxFloor: 14, special: 'double_attack', ai: 'fast', speed: 2, desc: '素早い連撃を繰り出す。' },
  { id: 'mantis3', name: 'ジェノサイド',     icon: '🦗', hp: 60, atk: 16, def: 6, exp: 20, goldMin: 15, goldMax: 30, minFloor: 14, maxFloor: 15, special: 'double_attack', ai: 'fast', speed: 2, desc: '目にも止まらぬ速さで切り刻む。' },

  // ── ボス ──────────────────────────────────────────
  {
    id: 'boss_garmu', name: '魔将ガルム',  icon: '👹',
    hp: 150, atk: 25, def: 10, exp: 100, goldMin: 200, goldMax: 300,
    minFloor: 15, maxFloor: 15, isBoss: true,
    special: 'summon_minion',
    ai: 'boss', speed: 1,
    desc: '配下のモンスターを召喚する魔将。',
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
   * @param {object[]} rooms
   * @returns {{ type: string, dx?: number, dy?: number, ... }}
   */
  decideAction(player, tiles, enemies, rooms = null) {
    if (this.isDead()) return { type: 'none' };
    if (this.hasStatus('sleep') || this.hasStatus('stun')) {
      this.tickStatuses();
      return { type: 'wait', reason: 'status' };
    }
    this.tickStatuses();

    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const distChebyshev = Math.max(Math.abs(dx), Math.abs(dy));

    // 索敵（アグロ）判定
    if (!this.isAlerted) {
      let inSameRoom = false;
      if (rooms) {
        const playerRoom = rooms.find(r => player.x >= r.x && player.x < r.x + r.w && player.y >= r.y && player.y < r.y + r.h);
        if (playerRoom) {
          const enemyInRoom = this.x >= playerRoom.x && this.x < playerRoom.x + playerRoom.w && this.y >= playerRoom.y && this.y < playerRoom.y + playerRoom.h;
          if (enemyInRoom) inSameRoom = true;
        }
      }

      // 同部屋にいる、もしくは通路で一定距離(4以下)に近づいた場合に発見
      if (inSameRoom || distChebyshev <= 4) {
        this.isAlerted = true;
      }
    }

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
      case 'steal_item':
        if (dist <= 1.5) return { type: 'steal_item', target: player };
        break;
      case 'steal_gold':
        if (dist <= 1.5) return { type: 'steal_gold', target: player };
        break;
      case 'life_drain':
        if (dist <= 1.5) return { type: 'life_drain', target: player };
        break;
      case 'dissolve':
        if (dist <= 1.5) return { type: 'dissolve', target: player };
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
  takeDamage(dmg, isSwift = false) {
    if (!isSwift && Math.random() < 0.1) {
      return 0; // 0 means evaded
    }
    const actual = Math.max(1, dmg - this.baseDef);
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
