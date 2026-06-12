// ============================================================
//  items.js  ─  アイテム定義・効果処理
// ============================================================

import { ITEM_TYPE, INVENTORY_MAX } from './constants.js';

// -------------------------------------------------------
// アイテムマスタ
// -------------------------------------------------------

// ── 武器 ─────────────────────────────────────────────
const WEAPONS = [
  { id: 'w_iron_sword',   name: '鉄の剣',    atk: 5,  weight: 50, special: null,           desc: '無骨な鉄製の剣。' },
  { id: 'w_flame_blade',  name: '炎刀',       atk: 7,  weight: 20, special: 'burn',          desc: '攻撃時に火炎属性を付与する。' },
  { id: 'w_swift_blade',  name: '疾風の刃',   atk: 4,  weight: 15, special: 'swift',         desc: '攻撃が外れない。' },
  { id: 'w_rusty_sword',  name: '錆びた剣',   atk: 2,  weight: 60, special: null,           desc: '手入れが悪い剣。しかし研げば…？' },
  { id: 'w_thunder_fist', name: '雷拳',       atk: 9,  weight: 8,  special: 'paralyze',     desc: '当たると稀に敵を麻痺させる。' },
  { id: 'w_holy_sword',   name: '聖剣カルマ', atk: 12, weight: 3,  special: 'holy',          desc: '神話の剣。アンデッドに特効。' },
  { id: 'w_drain_sword',  name: '妖刀',       atk: 6,  weight: 10, special: 'drain',         desc: '与えたダメージの一部を回復する。' },
  { id: 'w_ice_blade',    name: '氷の剣',     atk: 6,  weight: 15, special: 'freeze',        desc: '敵を鈍足にすることがある。' },
  { id: 'w_gold_sword',   name: '金の剣',     atk: 3,  weight: 20, special: 'rust_proof',    desc: '絶対にサビない。' },
  { id: 'w_sleep_sword',  name: '眠りの剣',   atk: 4,  weight: 10, special: 'sleep_hit',     desc: '敵を眠らせることがある。' },
];

// ── 防具 ─────────────────────────────────────────────
const ARMORS = [
  { id: 'a_leather',    name: '革の盾',     def: 3,  weight: 50, special: null,        desc: '基本的な防具。' },
  { id: 'a_iron',       name: '鉄の盾',     def: 6,  weight: 30, special: null,        desc: '重いが頑丈。' },
  { id: 'a_reflect',    name: '反射の盾',   def: 4,  weight: 15, special: 'reflect',   desc: '魔法攻撃を15%反射する。' },
  { id: 'a_growth',     name: '成長の盾',   def: 1,  weight: 20, special: 'growth',    desc: '経験を積むほど防御力が上がる。' },
  { id: 'a_thorns',     name: '茨の盾',     def: 5,  weight: 10, special: 'thorns',    desc: '攻撃を受けたとき敵にも2ダメージ。' },
  { id: 'a_holy',       name: '聖盾アルゴ', def: 10, weight: 3,  special: 'holy_guard', desc: '全ての呪いを1回無効化する。' },
  { id: 'a_evade',      name: '見切りの盾', def: 2,  weight: 15, special: 'evade',     desc: '敵の攻撃を避けやすくなる。' },
  { id: 'a_heavy',      name: '重装の盾',   def: 12, weight: 10, special: 'heavy',     desc: '防御は高いが満腹度が減りやすい。' },
  { id: 'a_anti_theft', name: '盗みよけの盾',def: 4,  weight: 15, special: 'anti_theft',desc: 'アイテムやお金を盗まれない。' },
  { id: 'a_plated',     name: 'メッキの盾', def: 5,  weight: 20, special: 'rust_proof',desc: '絶対にサビない。' },
];

// ── 草 ───────────────────────────────────────────────
const GRASSES = [
  { id: 'g_heal',      name: '薬草',       unknownName: '青い草',   weight: 40, effect: { type: 'heal',     amount: 30  }, desc: 'HPを30回復する。' },
  { id: 'g_full',      name: '満腹草',     unknownName: '緑の草',   weight: 30, effect: { type: 'hunger',   amount: 50  }, desc: '満腹度を50回復する。' },
  { id: 'g_strength',  name: '力の草',     unknownName: '赤い草',   weight: 20, effect: { type: 'atk_up',   amount: 3   }, desc: '攻撃力が永続+3される。' },
  { id: 'g_dragon',    name: '竜の血',     unknownName: '紫の草',   weight: 8,  effect: { type: 'hp_max',   amount: 20  }, desc: 'HP最大値が+20される。' },
  { id: 'g_poison',    name: '毒草',       unknownName: '黒い草',   weight: 25, effect: { type: 'poison',   duration: 5 }, desc: '飲むと毒になる。投げると敵を毒にする。' },
  { id: 'g_sleep',     name: '眠り草',     unknownName: '白い草',   weight: 20, effect: { type: 'sleep',    duration: 3 }, desc: '投げた相手を眠らせる。飲むと自分が眠る。' },
  { id: 'g_identify',  name: '識別草',     unknownName: '橙の草',   weight: 10, effect: { type: 'identify'            }, desc: '持ち物の中のアイテムを1つ識別する。' },
  { id: 'g_warp',      name: '転移草',     unknownName: '透明な草', weight: 15, effect: { type: 'warp'                }, desc: 'ランダムな場所にワープする。' },
  { id: 'g_revive',    name: '復活の草',   unknownName: '光る草',   weight: 5,  effect: { type: 'revive'              }, desc: '持っていると倒れた時に自動で復活する。' },
  { id: 'g_full_heal', name: '命の草',     unknownName: '金色の草', weight: 8,  effect: { type: 'full_heal',amount: 5   }, desc: 'HPを全回復し、最大値も少し上がる。' },
];

// ── 巻物 ─────────────────────────────────────────────
const SCROLLS = [
  { id: 's_id_all',    name: '識別の巻物',   unknownName: '古びた巻物',  weight: 25, effect: { type: 'id_all'             }, desc: '全アイテムを識別する。' },
  { id: 's_map',       name: '地図の巻物',   unknownName: '黄ばんだ巻物', weight: 20, effect: { type: 'map'                }, desc: '現在のフロアの全体マップを開示する。' },
  { id: 's_curse',     name: '呪いの巻物',   unknownName: 'ボロい巻物',  weight: 20, effect: { type: 'curse'               }, desc: '装備品の1つを呪う。' },
  { id: 's_remove',    name: '呪い解除の巻物', unknownName: '赤い巻物',  weight: 15, effect: { type: 'remove_curse'        }, desc: '呪われた装備を解除する。' },
  { id: 's_enhance',   name: '強化の巻物',   unknownName: '金の巻物',    weight: 8,  effect: { type: 'enhance',  amount: 3 }, desc: '装備中の武器か防具を強化する。' },
  { id: 's_warp_all',  name: '混乱の巻物',   unknownName: '青い巻物',    weight: 15, effect: { type: 'warp_enemy'         }, desc: '全ての敵をフロア内にワープさせる。' },
  { id: 's_monster',   name: '召喚の巻物',   unknownName: '黒い巻物',    weight: 10, effect: { type: 'summon'              }, desc: '周囲に敵を召喚する。' },
  { id: 's_plating',   name: 'メッキの巻物', unknownName: '銀の巻物',    weight: 10, effect: { type: 'plating'             }, desc: '装備品にサビないコーティングを施す。' },
  { id: 's_room_dmg',  name: '真空斬りの巻物',unknownName: '鋭い巻物',    weight: 12, effect: { type: 'room_damage', dmg: 30}, desc: '部屋にいるすべての敵にダメージ。' },
  { id: 's_room_sleep',name: '睡眠の巻物',   unknownName: '白い巻物',    weight: 12, effect: { type: 'room_sleep', dur: 5  }, desc: '部屋にいるすべての敵を眠らせる。' },
];

// ── 食料 ─────────────────────────────────────────────
const FOODS = [
  { id: 'f_onigiri',   name: 'おにぎり',       hunger: 50,  weight: 60, desc: '定番の携帯食料。満腹度+50。' },
  { id: 'f_bread',     name: '堅パン',          hunger: 30,  weight: 80, desc: '硬くて食べにくいが長持ち。満腹度+30。' },
  { id: 'f_meat',      name: '焼き肉',          hunger: 70,  weight: 20, desc: '香ばしい肉。満腹度+70。' },
  { id: 'f_big_onigiri',name: '大きなおにぎり', hunger: 100, weight: 15, desc: '特大サイズ。満腹度+100。' },
];

// ── 壺 ───────────────────────────────────────────────
const POTS = [
  { id: 'p_storage',  name: '保管の壺',   unknownName: '丸い壺',  capacity: 5, type: 'storage', desc: 'アイテムを最大5個収納できる。' },
  { id: 'p_id',       name: '識別の壺',   unknownName: '細い壺',  capacity: 3, type: 'identify', desc: '入れたアイテムを識別する。' },
  { id: 'p_merge',    name: '合成の壺',   unknownName: '重い壺',  capacity: 4, type: 'merge',   desc: '武器同士・盾同士を合成して強化する。' },
  { id: 'p_curse',    name: '呪いの壺',   unknownName: '黒い壺',  capacity: 3, type: 'curse',   desc: '入れたアイテムが呪われる。' },
  { id: 'p_soul',     name: '魂の壺',     unknownName: '光る壺',  capacity: 1, type: 'soul',    desc: '割ると魂片150を得る。' },
  { id: 'p_heal',     name: '回復の壺',   unknownName: '白い壺',  capacity: 3, type: 'heal',    desc: '使うとHPが大きく回復する。' },
  { id: 'p_change',   name: '変化の壺',   unknownName: '歪な壺',  capacity: 4, type: 'change',  desc: '入れたアイテムが別のアイテムに変化する。' },
  { id: 'p_enhance',  name: '強化の壺',   unknownName: '固い壺',  capacity: 3, type: 'enhance', desc: '入れた装備の強化値が階層移動で上がる。' },
  { id: 'p_weaken',   name: '弱化の壺',   unknownName: '脆い壺',  capacity: 3, type: 'weaken',  desc: '入れた装備の強化値が階層移動で下がる。' },
  { id: 'p_bottomless',name:'底抜けの壺', unknownName: '軽い壺',  capacity: 3, type: 'bottomless',desc: '入れたアイテムが消滅してしまう。' },
];

// -------------------------------------------------------
// アイテム生成
// -------------------------------------------------------

let _identifiedMap = {}; // { unknownName: true } 識別済み記録（1ダンジョン内）
let _unknownNames  = {}; // { id: unknownName } ランダム割り当て

export function resetIdentification() {
  _identifiedMap = {};
  _unknownNames  = {};

  // 草・巻物・杖・壺のランダム名称をシャッフル割り当て
  const shuffle = arr => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const assignUnknown = (items) => {
    const names = shuffle(items.map(i => i.unknownName));
    items.forEach((item, idx) => {
      _unknownNames[item.id] = names[idx];
    });
  };
  assignUnknown(GRASSES);
  assignUnknown(SCROLLS);
  assignUnknown(POTS);
}

export function identifyItem(id) {
  _identifiedMap[id] = true;
}

export function isIdentified(id) {
  return !!_identifiedMap[id];
}

export function getDisplayName(item) {
  if (item.identified) return item.name;
  if (item.type === ITEM_TYPE.WEAPON || item.type === ITEM_TYPE.ARMOR || item.type === ITEM_TYPE.FOOD || item.type === ITEM_TYPE.GOLD) {
    return item.name;
  }
  if (isIdentified(item.id)) return item.name;
  return _unknownNames[item.id] || item.name;
}

/**
 * フロア番号に応じてランダムなアイテムを1つ生成する
 */
export function createRandomItem(floor) {
  const typeRoll = Math.random();
  let type;
  if      (typeRoll < 0.10) type = ITEM_TYPE.WEAPON;
  else if (typeRoll < 0.20) type = ITEM_TYPE.ARMOR;
  else if (typeRoll < 0.40) type = ITEM_TYPE.GRASS;
  else if (typeRoll < 0.60) type = ITEM_TYPE.SCROLL;
  else if (typeRoll < 0.80) type = ITEM_TYPE.FOOD;
  else if (typeRoll < 0.95) type = ITEM_TYPE.POT;
  else                       type = ITEM_TYPE.GOLD;

  return createItemByType(type, floor);
}

function weighted(list) {
  const total = list.reduce((s, x) => s + (x.weight ?? 1), 0);
  let r = Math.random() * total;
  for (const x of list) {
    r -= (x.weight ?? 1);
    if (r <= 0) return x;
  }
  return list[list.length - 1];
}

export function createItemByType(type, floor = 1) {
  floor = floor || 1;
  switch (type) {
    case ITEM_TYPE.WEAPON: {
      const base = weighted(WEAPONS);
      const bonus = Math.floor(floor / 3); // フロアが深いほど強化値+
      return { ...base, type, bonus, identified: true, cursed: false, quantity: 1 };
    }
    case ITEM_TYPE.ARMOR: {
      const base = weighted(ARMORS);
      const bonus = Math.floor(floor / 3);
      return { ...base, type, bonus, identified: true, cursed: false, quantity: 1 };
    }
    case ITEM_TYPE.GRASS: {
      const base = weighted(GRASSES);
      return { ...base, type, identified: true, quantity: 1 };
    }
    case ITEM_TYPE.SCROLL: {
      const base = weighted(SCROLLS);
      return { ...base, type, identified: true, quantity: 1 };
    }

    case ITEM_TYPE.FOOD: {
      const base = weighted(FOODS);
      return { ...base, type, identified: true, quantity: 1 };
    }
    case ITEM_TYPE.POT: {
      const base = weighted(POTS);
      return { ...base, type, identified: true, contents: [], quantity: 1 };
    }
    case ITEM_TYPE.GOLD: {
      const amount = (5 + Math.floor(Math.random() * 20)) * floor;
      return { id: 'gold', name: 'ゴールド', type: ITEM_TYPE.GOLD, amount, identified: true, quantity: 1 };
    }
    default:
      return null;
  }
}

// -------------------------------------------------------
// アイテム効果処理
// -------------------------------------------------------

/**
 * アイテムを使用する（草を飲む / 食料を食べる / 巻物を読む）
 * @param {object} item
 * @param {object} player
 * @param {object} gameCtx - { floor, addMessage, dungeon, enemies }
 * @returns {string} ログメッセージ
 */
export function useItem(item, player, gameCtx) {
  identifyItem(item.id);
  item.identified = true;

  const { addMessage } = gameCtx;

  switch (item.type) {
    case ITEM_TYPE.GRASS:    return applyGrassEffect(item, player, gameCtx);
    case ITEM_TYPE.SCROLL:   return applyScrollEffect(item, player, gameCtx);
    case ITEM_TYPE.FOOD: {
      const gain = Math.round((item.hunger || 30) * (player.blessingEffects?.hungerMax ? 1 : 1));
      player.hunger = Math.min(player.hungerMax, player.hunger + gain);
      if (item.hp) player.hp = Math.min(player.hpMax, player.hp + item.hp);
      return `${item.name}を食べた。満腹度+${gain}。`;
    }
    default:
      return 'このアイテムはここでは使えない。';
  }
}

function applyGrassEffect(item, player, gameCtx) {
  const eff = item.effect;
  const multi = player.blessingEffects?.grassPower ?? 1;

  switch (eff.type) {
    case 'heal': {
      const amount = Math.round((eff.amount || 30) * multi);
      player.hp = Math.min(player.hpMax, player.hp + amount);
      return `薬草を飲んだ。HP+${amount}。`;
    }
    case 'hunger': {
      const amount = Math.round((eff.amount || 50) * multi);
      player.hunger = Math.min(player.hungerMax, player.hunger + amount);
      return `満腹草を飲んだ。満腹度+${amount}。`;
    }
    case 'atk_up': {
      const amount = Math.round((eff.amount || 3) * multi);
      player.baseAtk += amount;
      return `力の草を飲んだ。攻撃力が+${amount}増加した。`;
    }
    case 'hp_max': {
      const amount = Math.round((eff.amount || 20) * multi);
      player.hpMax += amount;
      player.hp    += amount;
      return `竜の血を飲んだ。HP最大値+${amount}。`;
    }
    case 'poison':
      player.addStatus('poison', eff.duration || 5);
      return `毒草を飲んだ。毒状態になった。`;
    case 'sleep':
      player.addStatus('sleep', eff.duration || 3);
      return `眠り草を飲んだ。眠ってしまった。`;
    case 'identify': {
      const unid = player.inventory.find(i => !i.identified);
      if (unid) { identifyItem(unid.id); unid.identified = true; return `${unid.name}を識別した！`; }
      return '識別できるものがなかった。';
    }
    case 'warp': {
      const pos = gameCtx.getRandomFloor();
      player.x = pos.x; player.y = pos.y;
      return 'ワープした！';
    }
    case 'revive':
      return '今は何も起きないようだ。（倒れた時に自動で効果が発動する）';
    case 'full_heal': {
      const hpGain = player.hpMax - player.hp;
      player.hp = player.hpMax;
      const mGain = eff.amount || 5;
      player.hpMax += mGain;
      player.hp += mGain;
      return `命の草を飲んだ。HPが全回復し、最大値が+${mGain}された！`;
    }
    default: return '不思議な感覚がした。';
  }
}

function applyScrollEffect(item, player, gameCtx) {
  const eff = item.effect;
  switch (eff.type) {
    case 'id_all':
      for (const inv of player.inventory) { identifyItem(inv.id); inv.identified = true; }
      return '全アイテムを識別した！';
    case 'map':
      gameCtx.revealMap();
      return 'フロア全体の地図を入手した。';
    case 'curse':
      if (player.weapon) { player.weapon.cursed = true; return '装備品が呪われた…'; }
      if (player.armor)  { player.armor.cursed  = true; return '装備品が呪われた…'; }
      return '呪いは空を切った。';
    case 'remove_curse':
      if (player.weapon) player.weapon.cursed = false;
      if (player.armor)  player.armor.cursed  = false;
      return '呪いが解除された！';
    case 'enhance': {
      const target = player.weapon || player.armor;
      if (target) { target.bonus = (target.bonus || 0) + (eff.amount || 3); return `${target.name}が+${eff.amount}強化された！`; }
      return '強化できる装備がなかった。';
    }
    case 'warp_enemy':
      gameCtx.warpAllEnemies();
      return '敵がバラバラに飛び散った！';
    case 'summon':
      gameCtx.summonEnemies(3);
      return '敵が召喚された！';
    case 'plating': {
      let plated = false;
      if (player.weapon) { player.weapon.rust_proof = true; plated = true; }
      if (player.armor) { player.armor.rust_proof = true; plated = true; }
      if (plated) return '装備品がサビないようにメッキされた！';
      return 'メッキする装備がなかった。';
    }
    case 'room_damage': {
      if (!gameCtx.enemies || gameCtx.enemies.length === 0) return '誰もいなかった。';
      let hit = 0;
      gameCtx.enemies.forEach(e => {
        if (!e.isDead() && gameCtx.isInSameRoom && gameCtx.isInSameRoom(player, e)) {
          e.hp -= eff.dmg || 30;
          hit++;
        }
      });
      return hit > 0 ? `部屋にいる敵にダメージを与えた！` : '効果がなかった。';
    }
    case 'room_sleep': {
      if (!gameCtx.enemies || gameCtx.enemies.length === 0) return '誰もいなかった。';
      let hit = 0;
      gameCtx.enemies.forEach(e => {
        if (!e.isDead() && gameCtx.isInSameRoom && gameCtx.isInSameRoom(player, e)) {
          e.addStatus('sleep', eff.dur || 5);
          hit++;
        }
      });
      return hit > 0 ? `部屋の敵が眠りについた！` : '効果がなかった。';
    }
    default: return '何かが起きた気がした。';
  }
}



// -------------------------------------------------------
// インベントリ操作
// -------------------------------------------------------
export function canAddToInventory(player) {
  return player.inventory.length < INVENTORY_MAX;
}

export function addToInventory(player, item) {
  if (!canAddToInventory(player)) return false;
  player.inventory.push(item);
  return true;
}

export function removeFromInventory(player, index) {
  return player.inventory.splice(index, 1)[0];
}

/**
 * 武器・防具を装備する
 */
export function equipItem(player, invIndex) {
  const item = player.inventory[invIndex];
  if (!item) return '存在しないアイテムだ。';

  if (item.type === ITEM_TYPE.WEAPON) {
    if (player.weapon?.cursed) return '呪われていて外せない！';
    if (player.weapon) player.inventory.push(player.weapon);
    player.weapon = removeFromInventory(player, invIndex);
    return `${player.weapon.name}を装備した。`;
  }
  if (item.type === ITEM_TYPE.ARMOR) {
    if (player.armor?.cursed) return '呪われていて外せない！';
    if (player.armor) player.inventory.push(player.armor);
    player.armor = removeFromInventory(player, invIndex);
    return `${player.armor.name}を装備した。`;
  }
  return 'この種類のアイテムは装備できない。';
}
