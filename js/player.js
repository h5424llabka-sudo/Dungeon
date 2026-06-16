// ============================================================
//  player.js  ─  プレイヤークラス
// ============================================================

import {
  EXP_TABLE, INVENTORY_MAX, HUNGER_TICK, HUNGER_DAMAGE_TICK,
  BASE_CRIT_RATE, BASE_CRIT_MULTI, VIEW_RADIUS,
} from './constants.js';
import { getBlessingById } from './gacha.js';

export class Player {
  constructor(selectedBlessingIds = []) {
    // ── 基本ステータス ──────────────────────
    this.hpMax     = 15;
    this.hp        = 15;
    this.baseAtk   = 5;
    this.baseDef   = 0;
    this.level     = 1;
    this.exp       = 0;
    this.hunger    = 100;
    this.hungerMax = 100;
    this.gold      = 0;

    this.x = 0;
    this.y = 0;
    this.direction = 'DOWN'; // 'UP', 'DOWN', 'LEFT', 'RIGHT'
    this.animState = 0;      // 0, 1, 2, 1...

    // ── 装備・インベントリ ─────────────────
    this.weapon    = null;
    this.armor     = null;
    this.inventory = [];

    // ── 状態異常 ────────────────────────────
    this.statuses = {}; // { poison: 3, sleep: 2, ... } (残りターン数)

    // ── ターンカウント（満腹度管理用）───────
    this.turnCount         = 0;
    this.hungerTick        = HUNGER_TICK;
    this.hungerDamageTick  = HUNGER_DAMAGE_TICK;
    this._lastHungerTurn   = 0;
    this._lastHungerDmgTurn= 0;

    // ── 視野半径 ────────────────────────────
    this.viewRadius = VIEW_RADIUS;

    // ── 加護 ────────────────────────────────
    this.blessingIds     = selectedBlessingIds;
    this.blessingEffects = {};
    this._deathResistUsed = false;
    this._regenCounter   = 0;
    this._inheritedEquip = null; // 記憶継承

    this._applyBlessings();
  }

  // -------------------------------------------------------
  //  加護の適用
  // -------------------------------------------------------
  _applyBlessings() {
    const eff = {};

    for (const id of this.blessingIds) {
      const b = getBlessingById(id);
      if (!b) continue;
      const e = b.effect;

      switch (e.type) {
        case 'hunger_max':
          this.hungerMax += e.amount;
          this.hunger    += e.amount;
          break;
        case 'view_radius':
          this.viewRadius += e.amount;
          break;
        case 'crit_rate':
          eff.critRate = (eff.critRate || 0) + e.amount;
          break;
        case 'grass_power':
          eff.grassPower = (eff.grassPower ?? 1) * e.multiply;
          break;
        case 'gold_drop':
          eff.goldDrop = (eff.goldDrop ?? 1) * e.multiply;
          break;
        case 'equip_exp':
          eff.equipExp = (eff.equipExp ?? 1) * e.multiply;
          break;
        case 'trap_rate':
          eff.trapRate = (eff.trapRate ?? 1) * e.multiply;
          break;
        case 'death_resist':
          eff.deathResist = e.count;
          break;
        case 'shop_steal':
          eff.shopSteal = e.chance;
          break;
        case 'hp_regen':
          eff.hpRegen = { interval: e.interval, amount: e.amount };
          break;
        case 'drop_rate':
          eff.dropRate = (eff.dropRate || 0) + e.amount;
          break;
        case 'floor_buff':
          eff.floorBuff = { interval: e.interval, amount: e.amount };
          break;
        case 'revive':
          eff.revive = e.chance;
          break;
        case 'inherit_equip':
          eff.inheritEquip = true;
          break;
        case 'start_food':
          eff.startFood = (eff.startFood || 0) + e.amount;
          break;
        case 'start_gold':
          this.gold += e.amount;
          break;
      }
    }

    this.blessingEffects = eff;
  }

  // -------------------------------------------------------
  //  計算値（装備込み）
  // -------------------------------------------------------
  get atk() {
    let a = this.baseAtk + (this.weapon ? (this.weapon.atk + (this.weapon.bonus || 0)) : 0);
    return a;
  }

  get def() {
    let d = this.baseDef + (this.armor ? (this.armor.def + (this.armor.bonus || 0)) : 0);
    return d;
  }

  get critRate() {
    return BASE_CRIT_RATE + (this.blessingEffects.critRate || 0);
  }

  // -------------------------------------------------------
  //  状態異常
  // -------------------------------------------------------
  addStatus(name, duration) {
    this.statuses[name] = Math.max(this.statuses[name] || 0, duration);
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

  // -------------------------------------------------------
  //  経験値・レベルアップ
  // -------------------------------------------------------
  addExp(amount) {
    this.exp += amount;
    const msgs = [];

    // 成長の盾
    if (this.armor && this.armor.special === 'growth') {
      this.armor._growthExp = (this.armor._growthExp || 0) + amount;
      while (this.armor._growthExp >= 50) {
        this.armor._growthExp -= 50;
        this.armor.bonus = (this.armor.bonus || 0) + 1;
        msgs.push(`${this.armor.name}が成長し、強化値が+1された！`);
      }
    }

    while (this.level < EXP_TABLE.length - 1 &&
           this.exp >= EXP_TABLE[this.level]) {
      this.level++;
      const hpGain = 4 + Math.floor(Math.random() * 3);
      this.hpMax += hpGain;
      this.hp     = this.hpMax;
      this.baseDef += 0;
      msgs.push(`レベルアップ！ Lv${this.level}になった。HP最大値+${hpGain}。`);
    }

    return msgs;
  }

  nextExpNeeded() {
    if (this.level >= EXP_TABLE.length - 1) return 0;
    return EXP_TABLE[this.level] - this.exp;
  }

  // -------------------------------------------------------
  //  ターン処理（満腹度・リジェネ等）
  // -------------------------------------------------------
  onTurnEnd(floor) {
    const msgs = [];
    this.turnCount++;

    // 状態異常ティック
    this.tickStatuses();

    // 毒ダメージ
    if (this.hasStatus('poison')) {
      this.hp -= 2;
      msgs.push('毒のダメージ！ HP-2。');
    }

    // 満腹度減少
    let currentHungerTick = this.hungerTick;
    if (this.armor?.special === 'heavy') currentHungerTick = Math.max(1, Math.floor(currentHungerTick * 0.5));
    if (this.turnCount - this._lastHungerTurn >= currentHungerTick) {
      this._lastHungerTurn = this.turnCount;
      this.hunger = Math.max(0, this.hunger - 1);
      if (this.hunger === 0) msgs.push('お腹が空いている…');
    }

    // 空腹ダメージ
    if (this.hunger === 0 && this.turnCount - this._lastHungerDmgTurn >= this.hungerDamageTick) {
      this._lastHungerDmgTurn = this.turnCount;
      this.hp -= 1;
      msgs.push('空腹でHPが減っている…');
    }

    // 自然回復（空腹でない場合）
    if (this.hunger > 0 && this.hp > 0 && this.hp < this.hpMax && !this.hasStatus('poison')) {
      // 一律で2ターン（2歩）ごとに1回復
      if (this.turnCount % 2 === 0) {
        this.hp = Math.min(this.hpMax, this.hp + 1);
      }
    }

    // HP自然回復（加護：生命の流れ）
    if (this.blessingEffects.hpRegen) {
      const regen = this.blessingEffects.hpRegen;
      this._regenCounter++;
      if (this._regenCounter >= regen.interval) {
        this._regenCounter = 0;
        this.hp = Math.min(this.hpMax, this.hp + regen.amount);
        msgs.push(`生命の流れでHP+${regen.amount}回復。`);
      }
    }

    // フロアバフ（加護：龍脈の覚醒）
    if (this.blessingEffects.floorBuff) {
      const fb = this.blessingEffects.floorBuff;
      if (this.turnCount % (fb.interval * 30) === 0) { // 約30ターンをフロアティックとして代用
        const roll = Math.floor(Math.random() * 3);
        if      (roll === 0) { this.baseAtk += fb.amount; msgs.push(`龍脈の覚醒！攻撃力+${fb.amount}。`); }
        else if (roll === 1) { this.baseDef += fb.amount; msgs.push(`龍脈の覚醒！防御力+${fb.amount}。`); }
        else { this.hpMax += fb.amount; this.hp += fb.amount; msgs.push(`龍脈の覚醒！HP最大値+${fb.amount}。`); }
      }
    }

    return msgs;
  }

  // -------------------------------------------------------
  //  ダメージ受け
  // -------------------------------------------------------
  takeDamage(dmg) {
    if (this.armor?.special === 'evade' && Math.random() < 0.2) {
      return { actual: 0, deathResist: false, evaded: true };
    }
    const actual = Math.max(1, dmg - this.def);
    this.hp -= actual;

    // 不屈の魂
    if (this.hp <= 0 && !this._deathResistUsed && this.blessingEffects.deathResist) {
      this.hp = 1;
      this._deathResistUsed = true;
      return { actual, deathResist: true };
    }

    return { actual, deathResist: false };
  }

  // -------------------------------------------------------
  //  攻撃力計算
  // -------------------------------------------------------
  calcAttack() {
    const isCrit = Math.random() < this.critRate;
    const base   = this.atk + Math.floor(Math.random() * (this.atk * 0.3 + 1));
    return { damage: isCrit ? Math.floor(base * BASE_CRIT_MULTI) : base, isCrit };
  }

  // -------------------------------------------------------
  //  死亡チェック
  // -------------------------------------------------------
  isDead() { return this.hp <= 0; }

  // -------------------------------------------------------
  //  シリアライズ（記憶継承用）
  // -------------------------------------------------------
  getEquipSnapshot() {
    return {
      weapon: this.weapon ? { ...this.weapon } : null,
      armor:  this.armor  ? { ...this.armor  } : null,
    };
  }
}
