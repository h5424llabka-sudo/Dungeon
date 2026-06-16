// ============================================================
//  game.js  ─  ゲームループ・ターン管理・戦闘処理
// ============================================================

import { TILE, KEYS, DUNGEON_MAX_FLOOR, BOSS_FLOORS, SOUL_PER_FLOOR, SOUL_BOSS_KILL, SOUL_CLEAR, ITEM_TYPE } from './constants.js';
import { Player } from './player.js';
import { generateFloor, computeFOV, isWalkable } from './dungeon.js';
import { spawnEnemy } from './enemy.js';
import { createRandomItem, resetIdentification, addToInventory, canAddToInventory, useItem, equipItem, getDisplayName, identifyItem, applyGrassEffect } from './items.js';
import { Renderer } from './renderer.js';
import { addSoulFragments, checkAchievements, writeSave } from './save.js';
import { getBlessingById } from './gacha.js';

export class Game {
  constructor(saveData, selectedBlessingIds, canvas, onGameOver, onClear, initialInventory, initialGold) {
    this.saveData  = saveData;
    this.canvas    = canvas;
    this.renderer  = new Renderer(canvas);
    this.onGameOver = onGameOver;
    this.onClear    = onClear;

    // メッセージログ
    this.messages = [];

    // フロア情報
    this.floor     = 1;
    this.floorData = null;
    this.tiles     = null;
    this.enemies   = [];
    this.floorItems = [];
    this.visibleSet  = new Set();
    this.exploredSet = new Set();

    // マップ全開示フラグ
    this._mapRevealed = false;

    // プレイヤー生成
    this.player = new Player(selectedBlessingIds);
    this.player.inventory = [...(initialInventory || [])];
    this.player.gold = initialGold || 0;
    this._applyStartBlessings();

    // キー入力状態
    this._keys = {};
    this._inputQueue = [];
    this._processing = false;

    // アニメーション
    this._rafId = null;

    // 初期フロア生成
    this._loadFloor(1);

    // キーイベント登録
    this._onKeyDown = (e) => this._handleKey(e);
    window.addEventListener('keydown', this._onKeyDown);

    // 描画ループ開始
    this._startRenderLoop();
  }

  destroy() {
    window.removeEventListener('keydown', this._onKeyDown);
    if (this._rafId) cancelAnimationFrame(this._rafId);
  }

  // -------------------------------------------------------
  //  フロア生成
  // -------------------------------------------------------
  _loadFloor(floorNum) {
    this.floor = floorNum;
    resetIdentification();

    const data = generateFloor(floorNum);
    this.floorData   = data;
    this.tiles       = data.tiles;
    this.visibleSet  = new Set();
    this.exploredSet = new Set();
    this._mapRevealed = false;

    // プレイヤー配置
    this.player.x = data.playerStart.x;
    this.player.y = data.playerStart.y;

    // 敵スポーン
    this.enemies = [];
    for (const spawn of data.enemySpawns) {
      const enemy = spawnEnemy(spawn.x, spawn.y, floorNum, spawn.isBoss || false);
      if (enemy) this.enemies.push(enemy);
    }

    // アイテムスポーン
    this.floorItems = [];
    for (const pos of data.itemSpawns) {
      const item = createRandomItem(floorNum);
      if (item) this.floorItems.push({ ...item, x: pos.x, y: pos.y });
    }

    // 記憶継承（★4加護）：初回フロアのみ
    if (floorNum === 1 && this.player.blessingEffects.inheritEquip) {
      const snap = this.saveData.lastEquipSnapshot;
      if (snap?.weapon) { this.player.weapon = snap.weapon; }
      else if (snap?.armor) { this.player.armor = snap.armor; }
    }

    this._updateFOV();
    this.addMessage(`── ${floorNum}F ──`);

    if (BOSS_FLOORS.includes(floorNum)) {
      this.addMessage(`⚠ ボスが潜んでいる気配がする…`);
    }
  }

  _applyStartBlessings() {
    // 開始食料（旅人の靴）
    if (this.player.blessingEffects.startFood) {
      for (let i = 0; i < this.player.blessingEffects.startFood; i++) {
        const food = createItemByType(ITEM_TYPE.FOOD, 1);
        addToInventory(this.player, food);
      }
    }
  }

  // -------------------------------------------------------
  //  FOV更新
  // -------------------------------------------------------
  _updateFOV() {
    this.visibleSet = computeFOV(
      this.tiles, this.player.x, this.player.y, this.player.viewRadius, this.floorData?.rooms
    );
    for (const key of this.visibleSet) {
      this.exploredSet.add(key);
    }
  }

  // -------------------------------------------------------
  //  メッセージ
  // -------------------------------------------------------
  addMessage(text, color = null) {
    this.messages.push({ text, color, time: Date.now() });
    if (this.messages.length > 100) this.messages.shift();
    // UIコールバック
    if (this.onMessage) this.onMessage(text, color);
  }

  // -------------------------------------------------------
  //  キー入力
  // -------------------------------------------------------
  _handleKey(e) {
    if (this._processing) return;
    const key = e.key;
    const lKey = key.toLowerCase();

    const dirMap = [
      { dir: 'UP',         keys: KEYS.UP         },
      { dir: 'DOWN',       keys: KEYS.DOWN        },
      { dir: 'LEFT',       keys: KEYS.LEFT        },
      { dir: 'RIGHT',      keys: KEYS.RIGHT       },
      { dir: 'UP_LEFT',    keys: KEYS.UP_LEFT     },
      { dir: 'UP_RIGHT',   keys: KEYS.UP_RIGHT    },
      { dir: 'DOWN_LEFT',  keys: KEYS.DOWN_LEFT   },
      { dir: 'DOWN_RIGHT', keys: KEYS.DOWN_RIGHT  },
    ];

    for (const { dir, keys } of dirMap) {
      if (keys.includes(key) || keys.includes(lKey)) {
        e.preventDefault();
        this._queueAction({ type: 'move', dir });
        return;
      }
    }

    if (KEYS.WAIT.includes(key) || KEYS.WAIT.includes(lKey)) {
      e.preventDefault();
      if (this.tiles[this.player.y][this.player.x] === TILE.STAIRS) {
        this._queueAction({ type: 'stairs' });
      } else {
        this._queueAction({ type: 'wait' });
      }
      return;
    }
    if (KEYS.PICK_UP.includes(key) || KEYS.PICK_UP.includes(lKey)) {
      e.preventDefault();
      this._queueAction({ type: 'pickup' });
    }
    if (KEYS.STAIRS.includes(key)) {
      e.preventDefault();
      this._queueAction({ type: 'stairs' });
    }
  }

  _queueAction(action) {
    this._inputQueue.push(action);
    if (!this._processing) this._processNext();
  }

  async _processNext() {
    if (this._inputQueue.length === 0) return;
    this._processing = true;
    const action = this._inputQueue.shift();
    await this._doPlayerAction(action);
    this._processing = false;
    if (this._inputQueue.length > 0) this._processNext();
  }

  // -------------------------------------------------------
  //  プレイヤーアクション処理
  // -------------------------------------------------------
  _DIR_VECTORS = {
    UP:         {dx:  0, dy: -1},
    DOWN:       {dx:  0, dy:  1},
    LEFT:       {dx: -1, dy:  0},
    RIGHT:      {dx:  1, dy:  0},
    UP_LEFT:    {dx: -1, dy: -1},
    UP_RIGHT:   {dx:  1, dy: -1},
    DOWN_LEFT:  {dx: -1, dy:  1},
    DOWN_RIGHT: {dx:  1, dy:  1},
  };

  async _doPlayerAction(action) {
    if (this.player.hasStatus('sleep')) {
      this.addMessage('眠っていて動けない…');
      await this._endPlayerTurn();
      return;
    }

    switch (action.type) {
      case 'move':    await this._actionMove(action.dir);   break;
      case 'wait':    this.addMessage('待機した。');   break;
      case 'pickup':  this._actionPickup();            break;
      case 'stairs':  await this._actionStairs();            return; // フロア遷移はターン消費後に処理
      case 'use_item':     this._actionUseItem(action.index);   break;
      case 'equip_item':   this._actionEquipItem(action.index); break;
      case 'drop_item':    this._actionDropItem(action.index);  break;
      case 'put_item':     this._actionPutItem(action.potIndex, action.itemIndex); break;
      case 'takeout_item': this._actionTakeOutItem(action.potIndex, action.contentIndex); break;
      case 'throw_item':   await this._actionThrowItem(action.index); break;
      case 'break_pot':    this._actionBreakPot(action.index); break;
    }

    await this._endPlayerTurn();
  }

  async _actionMove(dir) {
    const { dx, dy } = this._DIR_VECTORS[dir];
    const nx = this.player.x + dx;
    const ny = this.player.y + dy;

    // 向きの更新
    if (dx < 0) this.player.direction = 'LEFT';
    else if (dx > 0) this.player.direction = 'RIGHT';
    else if (dy < 0) this.player.direction = 'UP';
    else if (dy > 0) this.player.direction = 'DOWN';

    // 敵への攻撃チェック
    const target = this.enemies.find(e => e.x === nx && e.y === ny && !e.isDead());
    if (target) {
      await this._playerAttack(target);
      return;
    }

    // 移動
    if (!isWalkable(this.tiles, nx, ny)) {
      this.addMessage('そこには進めない。');
      return;
    }

    this.player.x = nx;
    this.player.y = ny;
    this.player.animState = (this.player.animState + 1) % 4; // 0,1,2,3...


    // 罠チェック
    if (this.tiles[ny][nx] === TILE.TRAP) {
      const trapRate = this.player.blessingEffects.trapRate ?? 1;
      if (Math.random() < trapRate) {
        this._triggerTrap(nx, ny);
      } else {
        this.addMessage('罠を回避した！（加護の効果）');
      }
    }

    // アイテム自動拾い通知
    const floorItem = this.floorItems.find(i => i.x === nx && i.y === ny);
    if (floorItem) {
      if (floorItem.type === ITEM_TYPE.GOLD || (floorItem.type === ITEM_TYPE.POT && floorItem.potType === 'soul')) {
        this._actionPickup();
      } else if (canAddToInventory(this.player)) {
        this._actionPickup();
      } else {
        this.addMessage(`${getDisplayName(floorItem)}が落ちている。持ち物がいっぱいだ。`);
      }
    }

    this._updateFOV();
  }

  async _playerAttack(target) {
    this.player.attackTarget = { x: target.x, y: target.y, time: Date.now(), duration: 150 };
    let { damage, isCrit } = this.player.calcAttack();

    // 聖剣カルマ特効
    if (this.player.weapon?.special === 'holy' && (target.id.startsWith('skel') || target.id.startsWith('vamp'))) {
      damage = Math.floor(damage * 1.5);
    }

    const isSwift = this.player.weapon?.special === 'swift';
    const actual = target.takeDamage(damage, isSwift);

    if (actual === 0) {
      this.addMessage(`${target.name}に避けられた！`);
      this.renderer.addFloatText(target.x, target.y, 'MISS', '#cccccc');
      await new Promise(r => setTimeout(r, 150));
      return;
    }

    const critStr = isCrit ? '【会心！】' : '';
    this.addMessage(`${target.name}に${actual}ダメージ！${critStr}`);
    
    // 敵へのダメージ数値（白〜黄色）
    this.renderer.addFloatText(target.x, target.y, actual.toString(), isCrit ? '#ffff55' : '#ffffff');

    // 武器特殊効果
    if (this.player.weapon?.special === 'burn') {
      target.addStatus('burn', 3);
      this.addMessage('炎をまとった一撃！');
    }
    if (this.player.weapon?.special === 'paralyze' && Math.random() < 0.2) {
      target.addStatus('stun', 2);
      this.addMessage(`${target.name}が麻痺した！`);
    }
    if (this.player.weapon?.special === 'drain') {
      const heal = Math.max(1, Math.floor(actual / 3));
      this.player.hp = Math.min(this.player.hpMax, this.player.hp + heal);
      this.addMessage(`妖刀がHPを${heal}吸収した！`, '#44ff44');
    }
    if (this.player.weapon?.special === 'freeze' && Math.random() < 0.2) {
      target.addStatus('slow', 3);
      this.addMessage(`${target.name}の動きが鈍った！`);
    }
    if (this.player.weapon?.special === 'sleep_hit' && Math.random() < 0.2) {
      target.addStatus('sleep', 3);
      this.addMessage(`${target.name}が眠った！`);
    }

    if (target.isDead()) {
      this._onEnemyKilled(target);
    }
    await new Promise(r => setTimeout(r, 150));
  }

  _onEnemyKilled(enemy) {
    this.addMessage(`${enemy.name}を倒した！`);
    const expMsgs = this.player.addExp(enemy.exp);
    expMsgs.forEach(m => this.addMessage(m, '#ffd700'));

    const goldMult = this.player.blessingEffects.goldDrop ?? 1;
    const gold = enemy.dropGold(goldMult);
    if (gold > 0) {
      this.player.gold += gold;
      this.addMessage(`${gold}Gを得た。`);
    }

    // ドロップアイテム
    const baseDropRate = 0.25 + (this.player.blessingEffects.dropRate ?? 0);
    if (enemy.isBoss || Math.random() < baseDropRate) {
      const item = createRandomItem(this.floor);
      if (item) {
        this.floorItems.push({ ...item, x: enemy.x, y: enemy.y });
        this.addMessage(`${getDisplayName(item)}が落ちた！`);
      }
    }

    // ボス撃破：魂片ボーナス
    if (enemy.isBoss) {
      addSoulFragments(this.saveData, SOUL_BOSS_KILL);
      this.addMessage(`✦ ボス撃破！魂片+${SOUL_BOSS_KILL}`, '#ffd700');
    }

    // 統計
    this.saveData.stats.totalKills = (this.saveData.stats.totalKills || 0) + 1;
  }

  _triggerTrap(x, y) {
    const types = ['damage', 'hunger', 'warp', 'poison'];
    const type  = types[Math.floor(Math.random() * types.length)];
    switch (type) {
      case 'damage':
        this.player.hp -= 10;
        this.addMessage('ダメージ罠！ HP-10。');
        this.renderer.addFloatText(this.player.x, this.player.y, '10', '#ff4444');
        break;
      case 'hunger':
        this.player.hunger = Math.max(0, this.player.hunger - 30);
        this.addMessage('空腹罠！ 満腹度-30。');
        break;
      case 'warp': {
        const pos = this._getRandomFloor();
        this.player.x = pos.x; this.player.y = pos.y;
        this.addMessage('ワープ罠！ 飛ばされた。');
        this._updateFOV();
        break;
      }
      case 'poison':
        this.player.addStatus('poison', 5);
        this.addMessage('毒罠！ 毒状態になった。');
        break;
    }
    // 罠を消去
    this.tiles[y][x] = TILE.FLOOR;
  }

  _actionPickup() {
    const idx = this.floorItems.findIndex(i => i.x === this.player.x && i.y === this.player.y);
    if (idx < 0) { this.addMessage('ここには何もない。'); return; }

    const item = this.floorItems[idx];

    if (item.type === ITEM_TYPE.GOLD) {
      this.player.gold += item.amount;
      this.addMessage(`${item.amount}Gを拾った。`);
      this.floorItems.splice(idx, 1);
      return;
    }

    // 魂の壺
    if (item.type === ITEM_TYPE.POT && item.potType === 'soul') {
      addSoulFragments(this.saveData, 150);
      this.addMessage('魂の壺を割った！ 魂片+150', '#ffd700');
      this.floorItems.splice(idx, 1);
      return;
    }

    if (!canAddToInventory(this.player)) {
      this.addMessage('持ち物がいっぱいだ。');
      return;
    }

    addToInventory(this.player, item);
    this.addMessage(`${getDisplayName(item)}を拾った。`);
    this.floorItems.splice(idx, 1);
  }

  async _actionStairs() {
    if (this.tiles[this.player.y][this.player.x] !== TILE.STAIRS) {
      this.addMessage('ここに階段はない。');
      await this._endPlayerTurn();
      return;
    }

    if (this.floor >= DUNGEON_MAX_FLOOR) {
      this._gameComplete();
      return;
    }

    const msgs = this.player.onTurnEnd(this.floor);
    msgs.forEach(m => this.addMessage(m));
    if (this.player.isDead()) {
      this._gameOver();
      return;
    }

    // 強化の壺・弱化の壺の効果
    for (const item of this.player.inventory) {
      if (item.type === ITEM_TYPE.POT && item.contents) {
        if (item.potType === 'enhance') {
          item.contents.forEach(c => {
            if (c.type === ITEM_TYPE.WEAPON || c.type === ITEM_TYPE.ARMOR) c.bonus = (c.bonus || 0) + 1;
          });
        } else if (item.potType === 'weaken') {
          item.contents.forEach(c => {
            if (c.type === ITEM_TYPE.WEAPON || c.type === ITEM_TYPE.ARMOR) c.bonus = (c.bonus || 0) - 1;
          });
        }
      }
    }

    this._loadFloor(this.floor + 1);
  }

  // -------------------------------------------------------
  // 外部からのアクション要求（UIなどから）
  // -------------------------------------------------------
  externalUseItem(index) {
    this._queueAction({ type: 'use_item', index });
  }

  externalEquipItem(index) {
    this._queueAction({ type: 'equip_item', index });
  }

  externalDropItem(index) {
    this._queueAction({ type: 'drop_item', index });
  }

  externalPutItem(potIndex, itemIndex) {
    this._queueAction({ type: 'put_item', potIndex, itemIndex });
  }

  externalTakeOutItem(potIndex, contentIndex) {
    this._queueAction({ type: 'takeout_item', potIndex, contentIndex });
  }

  externalThrowItem(index) {
    this._queueAction({ type: 'throw_item', index });
  }

  externalBreakPot(index) {
    this._queueAction({ type: 'break_pot', index });
  }

  _actionUseItem(index) {
    const item = this.player.inventory[index];
    if (!item) return;

    const ctx = {
      floor:         this.floor,
      addMessage:    (m) => this.addMessage(m),
      getRandomFloor:() => this._getRandomFloor(),
      revealMap:     () => { this._mapRevealed = true; },
      warpAllEnemies:() => {
        for (const e of this.enemies) {
          if (!e.isDead()) {
            const pos = this._getRandomFloor();
            e.x = pos.x; e.y = pos.y;
          }
        }
      },
      summonEnemies: (n) => {
        for (let i = 0; i < n; i++) {
          const pos = this._getNearbyFloor(this.player.x, this.player.y, 3);
          if (pos) {
            const e = spawnEnemy(pos.x, pos.y, this.floor);
            if (e) this.enemies.push(e);
          }
        }
      },
      enemies: this.enemies,
      isInSameRoom: (a, b) => {
        if (!this.floorData?.rooms) return false;
        const ra = this.floorData.rooms.find(r => a.x >= r.x && a.x < r.x + r.w && a.y >= r.y && a.y < r.y + r.h);
        if (!ra) return false;
        return (b.x >= ra.x && b.x < ra.x + ra.w && b.y >= ra.y && b.y < ra.y + ra.h);
      }
    };

    const msg = useItem(item, this.player, ctx);
    this.addMessage(msg);

    // 使用後にインベントリから削除（草・巻物・食料）
    if ([ITEM_TYPE.GRASS, ITEM_TYPE.SCROLL, ITEM_TYPE.FOOD].includes(item.type)) {
      this.player.inventory.splice(index, 1);
    }
  }

  _actionEquipItem(index) {
    const msg = equipItem(this.player, index);
    this.addMessage(msg);
  }

  _actionDropItem(index) {
    const item = this.player.inventory[index];
    if (!item) return;
    
    // 足元に置く（すでにアイテムがあれば置けない）
    const existing = this.floorItems.find(i => i.x === this.player.x && i.y === this.player.y);
    if (existing) {
      this.addMessage('足元には既にアイテムがある。');
      return;
    }

    const dropItem = this.player.inventory.splice(index, 1)[0];
    dropItem.x = this.player.x;
    dropItem.y = this.player.y;
    this.floorItems.push(dropItem);
    this.addMessage(`${getDisplayName(dropItem)}を置いた。`);
  }

  _actionPutItem(potIndex, itemIndex) {
    const pot = this.player.inventory[potIndex];
    const item = this.player.inventory[itemIndex];
    if (!pot || !item || pot.type !== ITEM_TYPE.POT) return;

    if (!pot.contents) pot.contents = [];
    if (pot.contents.length >= pot.capacity) {
      this.addMessage('壺はもういっぱいだ。');
      return;
    }

    pot.contents.push(item);
    
    // index補正 (itemIndexがpotIndexより前ならpotIndexがずれることはないが、popで削除されるから気をつける必要はない)
    // 但し、配列から消すのでspliceを使う。
    this.player.inventory.splice(itemIndex, 1);

    this.addMessage(`${getDisplayName(item)}を${getDisplayName(pot)}に入れた。`);

    if (pot.potType === 'identify') {
      identifyItem(item.id);
      item.identified = true;
      this.addMessage(`${getDisplayName(item)}を識別した！`);
    } else if (pot.potType === 'bottomless') {
      pot.contents.pop(); // 消滅
      this.addMessage(`${getDisplayName(item)}は消滅してしまった…`);
    } else if (pot.potType === 'curse') {
      if (this.player.armor?.special === 'holy_guard') {
        this.player.armor.special = null;
        this.addMessage('聖盾アルゴが呪いを防いで輝きを失った！');
      } else {
        item.cursed = true;
        this.addMessage(`${getDisplayName(item)}は呪われてしまった！`);
      }
    } else if (pot.potType === 'merge') {
      // 合成処理
      const bases = pot.contents.filter(c => c !== item);
      const base = bases.length > 0 ? bases[bases.length - 1] : null;
      if (base && base.type === item.type && (base.type === ITEM_TYPE.WEAPON || base.type === ITEM_TYPE.ARMOR)) {
        base.bonus = (base.bonus || 0) + (item.bonus || 0);
        pot.contents.pop(); // 合成素材を消去
        pot.capacity = Math.max(1, (pot.capacity || 0) - 1); // 容量を減らす
        this.addMessage(`${base.name}の強化値が吸収された！`);
      }
    } else if (pot.potType === 'change') {
      // 変化処理
      const newItem = createRandomItem(this.floor);
      if (newItem) {
        pot.contents.pop();
        pot.contents.push(newItem);
        this.addMessage(`入れたアイテムが別のものに変化した！`);
      }
    }
  }

  _actionTakeOutItem(potIndex, contentIndex) {
    const pot = this.player.inventory[potIndex];
    if (!pot || pot.type !== ITEM_TYPE.POT || pot.potType !== 'storage') return;

    if (!canAddToInventory(this.player)) {
      this.addMessage('持ち物がいっぱいだ。');
      return;
    }

    const item = pot.contents.splice(contentIndex, 1)[0];
    addToInventory(this.player, item);
    this.addMessage(`${getDisplayName(pot)}から${getDisplayName(item)}を取り出した。`);
  }

  async _actionThrowItem(index) {
    const item = this.player.inventory[index];
    if (!item) return;
    this.player.inventory.splice(index, 1);
    this.addMessage(`${getDisplayName(item)}を投げた！`);

    // Calculate trajectory
    const dx = this.player.direction === 'RIGHT' ? 1 : this.player.direction === 'LEFT' ? -1 : 0;
    const dy = this.player.direction === 'DOWN' ? 1 : this.player.direction === 'UP' ? -1 : 0;
    
    let x = this.player.x;
    let y = this.player.y;
    let targetEnemy = null;

    for (let i = 0; i < 10; i++) {
      const nx = x + dx;
      const ny = y + dy;
      if (this.tiles[ny][nx] === TILE.WALL) break; // hits wall
      x = nx;
      y = ny;
      targetEnemy = this.enemies.find(e => e.x === x && e.y === y && !e.isDead());
      if (targetEnemy) break;
    }

    if (targetEnemy) {
      if (item.type === ITEM_TYPE.GRASS) {
        this.addMessage(`${targetEnemy.name}に${getDisplayName(item)}が当たった！`);
        const msg = applyGrassEffect(item, targetEnemy, this);
        if(msg) this.addMessage(msg);
      } else if (item.type === ITEM_TYPE.POT) {
        this.addMessage(`${targetEnemy.name}に${getDisplayName(item)}が当たって割れた！`);
        targetEnemy.takeDamage(10, true);
        this.renderer.addFloatText(x, y, '10', '#ffffff');
      } else {
        const dmg = item.type === ITEM_TYPE.WEAPON ? 5 : 2;
        this.addMessage(`${targetEnemy.name}に${getDisplayName(item)}が当たった！`);
        targetEnemy.takeDamage(dmg, true);
        this.renderer.addFloatText(x, y, dmg.toString(), '#ffffff');
      }
      if (targetEnemy.isDead()) this._onEnemyKilled(targetEnemy);
    } else {
      this.addMessage(`${getDisplayName(item)}は地面に落ちた。`);
      if (item.type === ITEM_TYPE.POT) {
        this.addMessage(`${getDisplayName(item)}は割れてしまった！`);
        if (item.potType === 'soul') {
          addSoulFragments(this.saveData, 150);
          this.addMessage('魂片+150', '#ffd700');
        } else if (item.contents && item.contents.length > 0) {
          item.contents.forEach(c => {
             this.floorItems.push({ ...c, x, y });
             this.addMessage(`中から${getDisplayName(c)}が出てきた。`);
          });
        }
      } else {
        this.floorItems.push({ ...item, x, y });
      }
    }
  }

  _actionBreakPot(index) {
    const item = this.player.inventory[index];
    if (!item || item.type !== ITEM_TYPE.POT) return;
    this.player.inventory.splice(index, 1);
    this.addMessage(`${getDisplayName(item)}を足元で割った！`);
    if (item.potType === 'soul') {
      addSoulFragments(this.saveData, 150);
      this.addMessage('魂片+150', '#ffd700');
    } else if (item.contents && item.contents.length > 0) {
      item.contents.forEach(c => {
         this.floorItems.push({ ...c, x: this.player.x, y: this.player.y });
         this.addMessage(`中から${getDisplayName(c)}が出てきた。`);
      });
    }
  }

  // -------------------------------------------------------
  //  敵ターン処理
  // -------------------------------------------------------
  async _enemyTurn() {
    for (const enemy of this.enemies) {
      if (enemy.isDead()) continue;

      const action = enemy.decideAction(this.player, this.tiles, this.enemies, this.floorData?.rooms);
      await this._resolveEnemyAction(enemy, action);

      // プレイヤーが死んでいたら即終了
      if (this.player.isDead()) {
        this._gameOver();
        return;
      }
    }
    // 死んだ敵を削除
    this.enemies = this.enemies.filter(e => !e.isDead());
  }

  async _resolveEnemyAction(enemy, action) {
    switch (action.type) {
      case 'move':
        const dx = action.nx - enemy.x;
        const dy = action.ny - enemy.y;
        if (dx < 0) enemy.direction = 'LEFT';
        else if (dx > 0) enemy.direction = 'RIGHT';
        else if (dy < 0) enemy.direction = 'UP';
        else if (dy > 0) enemy.direction = 'DOWN';
        enemy.x = action.nx;
        enemy.y = action.ny;
        enemy.animState = (enemy.animState + 1) % 4;
        break;

      case 'attack':
      case 'double_attack': {
        const times = action.type === 'double_attack' ? 2 : 1;
        for (let i = 0; i < times; i++) {
          enemy.attackTarget = { x: this.player.x, y: this.player.y, time: Date.now(), duration: 150 };
          const { damage, isCrit } = enemy.calcAttack();
          const { actual, deathResist, evaded } = this.player.takeDamage(damage);
          if (evaded) {
            this.addMessage(`${enemy.name}の攻撃を見切った！`, '#44ff44');
            continue;
          }
          const critStr = isCrit ? '【会心！】' : '';
          this.addMessage(`${enemy.name}の攻撃！ ${actual}ダメージ。${critStr}`);
          this.renderer.addFloatText(this.player.x, this.player.y, actual.toString(), '#ff4444');
          if (deathResist) this.addMessage('不屈の魂が発動！HP1で耐えた！', '#ffd700');

          if (this.player.armor?.special === 'thorns') {
            const reflectActual = enemy.takeDamage(2, true);
            if (reflectActual > 0) {
              this.addMessage(`${enemy.name}に茨のダメージ！`);
              this.renderer.addFloatText(enemy.x, enemy.y, reflectActual.toString(), '#ffffff');
            }
          }

          await new Promise(r => setTimeout(r, 150));
        }
        break;
      }

      case 'poison_attack': {
        enemy.attackTarget = { x: this.player.x, y: this.player.y, time: Date.now(), duration: 150 };
        const { damage } = enemy.calcAttack();
        const { actual, evaded } = this.player.takeDamage(damage);
        if (evaded) {
          this.addMessage(`${enemy.name}の毒攻撃を見切った！`, '#44ff44');
          break;
        }
        this.player.addStatus('poison', action.duration);
        this.addMessage(`${enemy.name}の毒攻撃！ ${actual}ダメージ。毒になった。`);
        this.renderer.addFloatText(this.player.x, this.player.y, actual.toString(), '#ff4444');
        await new Promise(r => setTimeout(r, 150));
        break;
      }

      case 'magic_bolt': {
        enemy.attackTarget = { x: this.player.x, y: this.player.y, time: Date.now(), duration: 150 };
        const actual = Math.max(1, action.dmg - this.player.def);
        // 反射チェック
        if (this.player.armor?.special === 'reflect' && Math.random() < 0.15) {
          const reflected = enemy.takeDamage(action.dmg, true);
          this.addMessage(`魔法が反射した！ ${enemy.name}に${reflected}ダメージ！`);
          this.renderer.addFloatText(enemy.x, enemy.y, reflected.toString(), '#ffffff');
        } else {
          this.player.hp -= actual;
          this.addMessage(`${enemy.name}の魔法弾！ ${actual}ダメージ。`);
          this.renderer.addFloatText(this.player.x, this.player.y, actual.toString(), '#ff4444');
        }
        await new Promise(r => setTimeout(r, 150));
        break;
      }

      case 'steal_item': {
        if (this.player.armor?.special === 'anti_theft') {
          this.addMessage(`${enemy.name}はアイテムを盗もうとしたが、盾に阻まれた！`, '#44ff44');
          break;
        }
        if (this.player.inventory.length > 0 && !enemy.stolenItem) {
          const idx = Math.floor(Math.random() * this.player.inventory.length);
          enemy.stolenItem = this.player.inventory.splice(idx, 1)[0];
          this.addMessage(`${enemy.name}に${getDisplayName(enemy.stolenItem)}を盗まれた！`, '#ff6666');
        }
        break;
      }

      case 'steal_gold': {
        if (this.player.armor?.special === 'anti_theft') {
          this.addMessage(`${enemy.name}はお金を盗もうとしたが、盾に阻まれた！`, '#44ff44');
          break;
        }
        const stolen = Math.min(this.player.gold, Math.floor(10 + Math.random() * 20));
        if (stolen > 0) {
          this.player.gold -= stolen;
          this.addMessage(`${enemy.name}に${stolen}Gを盗まれた！`, '#ff6666');
        }
        break;
      }

      case 'life_drain': {
        enemy.attackTarget = { x: this.player.x, y: this.player.y, time: Date.now(), duration: 150 };
        const { damage } = enemy.calcAttack();
        const { actual } = this.player.takeDamage(damage);
        enemy.hp = Math.min(enemy.hpMax, enemy.hp + Math.floor(actual / 2));
        this.addMessage(`${enemy.name}の生命吸収！ ${actual}ダメージ。`);
        this.renderer.addFloatText(this.player.x, this.player.y, actual.toString(), '#ff4444');
        this.renderer.addFloatText(enemy.x, enemy.y, `+${Math.floor(actual / 2)}`, '#44ff44');
        await new Promise(r => setTimeout(r, 150));
        break;
      }

      case 'dissolve': {
        const targetEquip = Math.random() < 0.5 ? this.player.weapon : (this.player.armor || this.player.weapon);
        if (targetEquip) {
          if (targetEquip.special === 'rust_proof' || targetEquip.rust_proof) {
            this.addMessage(`${enemy.name}の溶解液！しかし${targetEquip.name}はサビなかった！`, '#44ff44');
          } else {
            targetEquip.bonus = (targetEquip.bonus || 0) - 1;
            this.addMessage(`${enemy.name}の溶解液！${targetEquip.name}の強化値が下がった！`, '#ff6666');
          }
        } else {
          this.addMessage(`${enemy.name}は溶解液を吐いたが効果がなかった。`);
        }
        break;
      }

      case 'death_mark':
        this.player.addStatus('death_mark', action.duration);
        this.addMessage(`${enemy.name}が死の刻印を付与した！ ${action.duration}ターン後に即死！`, '#ff0000');
        break;

      case 'summon_minion': {
        for (let i = 0; i < (action.count || 2); i++) {
          const pos = this._getNearbyFloor(enemy.x, enemy.y, 2);
          if (pos) {
            const minion = spawnEnemy(pos.x, pos.y, this.floor);
            if (minion) this.enemies.push(minion);
          }
        }
        this.addMessage(`${enemy.name}が配下を召喚した！`);
        break;
      }

      case 'chaos_aura': {
        enemy.attackTarget = { x: this.player.x, y: this.player.y, time: Date.now(), duration: 150 };
        const { damage } = enemy.calcAttack();
        const { actual } = this.player.takeDamage(Math.floor(damage * 1.3));
        this.player.addStatus('poison', 3);
        this.player.hunger = Math.max(0, this.player.hunger - 20);
        this.addMessage(`混沌の王の混沌オーラ！ ${actual}ダメージ！毒・空腹！`, '#ff0044');
        this.renderer.addFloatText(this.player.x, this.player.y, actual.toString(), '#ff4444');
        await new Promise(r => setTimeout(r, 150));
        break;
      }
    }
  }

  // -------------------------------------------------------
  //  ターン終了処理
  // -------------------------------------------------------
  async _endPlayerTurn() {
    // 死の刻印チェック
    if (this.player.statuses.death_mark === 1) {
      this.addMessage('死の刻印が発動！ 即死した！', '#ff0000');
      this.player.hp = 0;
      this._gameOver();
      return;
    }

    const msgs = this.player.onTurnEnd(this.floor);
    msgs.forEach(m => this.addMessage(m));

    if (this.player.isDead()) {
      this._gameOver();
      return;
    }

    // 敵ターン
    await this._enemyTurn();
  }

  // -------------------------------------------------------
  //  ゲームオーバー・クリア
  // -------------------------------------------------------
  _gameOver() {
    // 記憶継承データ保存
    this.saveData.lastEquipSnapshot = this.player.getEquipSnapshot();

    // 復活の草チェック
    const reviveIdx = this.player.inventory.findIndex(i => i.id === 'g_revive');
    if (reviveIdx >= 0) {
      this.player.inventory.splice(reviveIdx, 1);
      this.player.hp = this.player.hpMax;
      this.addMessage('復活の草が光り輝き、全回復して復活した！', '#ffff00');
      this.player.statuses = {}; // 状態異常リセット
      return;
    }

    // 復活チェック（死神の加護）
    if (this.player.blessingEffects.revive && Math.random() < this.player.blessingEffects.revive) {
      this.player.hp = Math.floor(this.player.hpMax * 0.3);
      this.player.inventory = [];
      this.player.weapon = null;
      this.player.armor  = null;
      this.addMessage('死神の加護が発動！ 復活したが…アイテムは全て消えた。', '#ffd700');
      this.player.blessingEffects.revive = 0; // 1回のみ
      return;
    }

    // 魂片計算
    const souls = this.floor * SOUL_PER_FLOOR;
    addSoulFragments(this.saveData, souls);
    this.saveData.stats.maxFloor  = Math.max(this.saveData.stats.maxFloor || 0, this.floor);
    // 死亡時：アイテムとお金ロスト
    this.saveData.playerInventory = [];
    this.saveData.playerGold = 0;
    writeSave(this.saveData);

    const achResult = checkAchievements(this.saveData);

    this.destroy();
    this.onGameOver({
      floor:    this.floor,
      souls,
      achievements: achResult.newAchievements,
      achReward:    achResult.totalReward,
    });
  }

  _gameComplete() {
    const souls = SOUL_CLEAR + this.floor * SOUL_PER_FLOOR;
    addSoulFragments(this.saveData, souls);
    this.saveData.stats.totalRuns = (this.saveData.stats.totalRuns || 0) + 1;
    this.saveData.stats.maxFloor = DUNGEON_MAX_FLOOR;
    // クリア時：アイテムとお金持ち帰り
    this.saveData.playerInventory = [...this.player.inventory];
    this.saveData.playerGold = this.player.gold;
    writeSave(this.saveData);

    const achResult = checkAchievements(this.saveData);
    this.destroy();
    this.onClear({ souls, achievements: achResult.newAchievements });
  }

  // -------------------------------------------------------
  //  描画ループ
  // -------------------------------------------------------
  _startRenderLoop() {
    const loop = () => {
      this._render();
      this._rafId = requestAnimationFrame(loop);
    };
    this._rafId = requestAnimationFrame(loop);
  }

  _render() {
    const camX = this.player.x - Math.floor(this.canvas.width  / this.renderer.tileSize / 2);
    const camY = this.player.y - Math.floor(this.canvas.height / this.renderer.tileSize / 2);

    const exploredSet = this._mapRevealed
      ? (() => { const s = new Set(); for (let y = 0; y < 40; y++) for (let x = 0; x < 60; x++) s.add(`${x},${y}`); return s; })()
      : this.exploredSet;

    this.renderer.draw({
      player:      this.player,
      tiles:       this.tiles,
      enemies:     this.enemies,
      items:       this.floorItems,
      visibleSet:  this._mapRevealed ? exploredSet : this.visibleSet,
      exploredSet,
      floor:       this.floor,
    });

    this.renderer.drawFloatTexts(camX, camY);
  }

  // -------------------------------------------------------
  //  ユーティリティ
  // -------------------------------------------------------
  _getRandomFloor() {
    for (let attempt = 0; attempt < 100; attempt++) {
      const x = 1 + Math.floor(Math.random() * 58);
      const y = 1 + Math.floor(Math.random() * 38);
      if (isWalkable(this.tiles, x, y)) return { x, y };
    }
    return { x: this.player.x, y: this.player.y };
  }

  _getNearbyFloor(cx, cy, radius) {
    for (let attempt = 0; attempt < 30; attempt++) {
      const x = cx + Math.floor(Math.random() * radius * 2) - radius;
      const y = cy + Math.floor(Math.random() * radius * 2) - radius;
      if (isWalkable(this.tiles, x, y) && !this.enemies.find(e => e.x === x && e.y === y)) {
        return { x, y };
      }
    }
    return null;
  }

  // 外部からインベントリ操作（UI連携）
  externalUseItem(index)   { this._queueAction({ type: 'use_item',   index }); }
  externalEquipItem(index) { this._queueAction({ type: 'equip_item', index }); }
  externalDropItem(index)  { this._queueAction({ type: 'drop_item',  index }); }
  externalPutItem(potIndex, itemIndex) { this._queueAction({ type: 'put_item', potIndex, itemIndex }); }
  externalTakeOutItem(potIndex, contentIndex) { this._queueAction({ type: 'takeout_item', potIndex, contentIndex }); }
}
