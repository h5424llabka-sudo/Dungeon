// ============================================================
//  main.js  ─  画面管理・UIオーケストレーション
// ============================================================

import { loadSave, writeSave } from './save.js';
import { pullSingle, pullTen, getOwnedBlessingsSummary, getBlessingById, checkSublimation, doSublimation } from './gacha.js';
import { Game } from './game.js';
import {
  GAME_STATE, RARITY, RARITY_COLOR, RARITY_NAME,
  GACHA_COST_SINGLE, GACHA_COST_TEN, GACHA_PITY,
  SLOT_UNLOCK_COST,
} from './constants.js';
import { getDisplayName } from './items.js';
import { Village } from './village.js';

// ===============================================================
//  アプリケーション本体
// ===============================================================
class App {
  constructor() {
    this.saveData = loadSave();
    this.state    = GAME_STATE.LOBBY;
    this.game     = null;

    this._buildDOM();
    this._showVillage();
  }

  // -------------------------------------------------------
  //  DOM構築
  // -------------------------------------------------------
  _buildDOM() {
    document.body.innerHTML = '';

    // ── ロビー画面 ──────────────────────────────────────
    this.lobbyScreen = el('div', { id: 'lobby-screen', class: 'screen' });
    this.lobbyScreen.innerHTML = `
      <div class="lobby-bg">
        <div class="lobby-title">
          <span class="title-glow">魂廟の迷宮</span>
          <div class="title-sub">～命を賭けた冒険と、死を越えた加護～</div>
        </div>
        <div class="lobby-panels">
          <div class="lobby-left">
            <div class="soul-display">
              <span class="soul-icon">◈</span>
              <span id="soul-count" class="soul-count">0</span>
              <span class="soul-label">魂片</span>
            </div>
            <div class="lobby-stats" id="lobby-stats"></div>
            <div class="lobby-buttons">
              <button id="btn-start"   class="btn btn-primary">⚔ ダンジョンへ</button>
              <button id="btn-gacha"   class="btn btn-gacha">🎰 魂廟ガチャ</button>
              <button id="btn-library" class="btn btn-secondary">📖 加護図鑑</button>
            </div>
          </div>
          <div class="lobby-right">
            <div class="blessing-select-title">加護スロット（出発前に選択）</div>
            <div id="blessing-slots" class="blessing-slots"></div>
            <div id="owned-blessings-list" class="owned-blessings-list"></div>
            <button id="btn-slot-unlock" class="btn btn-slot-unlock" style="display:none"></button>
          </div>
        </div>
      </div>
    `;

    // ── ガチャ画面 ──────────────────────────────────────
    this.gachaScreen = el('div', { id: 'gacha-screen', class: 'screen hidden' });
    this.gachaScreen.innerHTML = `
      <div class="gacha-bg">
        <button id="btn-gacha-back" class="btn btn-back">← 戻る</button>
        <div class="gacha-title">魂廟ガチャ</div>
        <div class="gacha-pity-bar">
          <span>天井まで：</span>
          <div class="pity-bar-wrap">
            <div id="pity-bar-fill" class="pity-bar-fill"></div>
          </div>
          <span id="pity-count">0/${GACHA_PITY}</span>
        </div>
        <div class="gacha-soul-display">
          <span class="soul-icon">◈</span>
          <span id="gacha-soul-count" class="soul-count">0</span>魂片
        </div>
        <div class="gacha-cost-info">
          単発 ${GACHA_COST_SINGLE}◈ ／ 10連 ${GACHA_COST_TEN}◈（★2以上1枚確定）
        </div>
        <div class="gacha-buttons">
          <button id="btn-pull-1"  class="btn btn-gacha-pull">単発ガチャ</button>
          <button id="btn-pull-10" class="btn btn-gacha-pull pull-ten">10連ガチャ</button>
        </div>
        <div id="gacha-result" class="gacha-result hidden"></div>
        <div class="gacha-owned-title">加護セット &amp; 所持加護一覧（昇華）</div>
        <div style="max-width: 800px; margin: 0 auto 16px;">
          <div class="blessing-select-title">加護スロット（出発前に選択）</div>
          <div id="blessing-slots" class="blessing-slots"></div>
          <button id="btn-slot-unlock" class="btn btn-slot-unlock" style="display:none"></button>
        </div>
        <div id="gacha-owned-list" class="gacha-owned-list"></div>
      </div>
    `;

    // ── ダンジョン画面 ──────────────────────────────────
    this.dungeonScreen = el('div', { id: 'dungeon-screen', class: 'screen hidden' });
    this.dungeonScreen.innerHTML = `
      <div class="dungeon-layout">
        <div class="dungeon-left">
          <canvas id="game-canvas"></canvas>
        </div>
        <div class="dungeon-right">
          <div class="status-panel">
            <div class="status-floor" id="st-floor">1F</div>
            <div class="status-name">冒険者</div>
            <div class="status-row">
              <span>HP</span>
              <div class="bar-wrap"><div id="hp-bar" class="bar hp-bar"></div></div>
              <span id="hp-text" class="bar-text">80/80</span>
            </div>
            <div class="status-row">
              <span>満腹</span>
              <div class="bar-wrap"><div id="hunger-bar" class="bar hunger-bar"></div></div>
              <span id="hunger-text" class="bar-text">100/100</span>
            </div>
            <div class="status-grid">
              <div class="sg-item"><div class="sg-label">Lv</div><div id="st-level" class="sg-val">1</div></div>
              <div class="sg-item"><div class="sg-label">Exp</div><div id="st-exp" class="sg-val">0</div></div>
              <div class="sg-item"><div class="sg-label">攻撃</div><div id="st-atk" class="sg-val">10</div></div>
              <div class="sg-item"><div class="sg-label">防御</div><div id="st-def" class="sg-val">5</div></div>
              <div class="sg-item sg-gold"><div class="sg-label">💰</div><div id="st-gold" class="sg-val">0</div></div>
            </div>
            <div class="equip-section">
              <div class="equip-row"><span>武器</span><span id="eq-weapon" class="equip-name">なし</span></div>
              <div class="equip-row"><span>防具</span><span id="eq-armor"  class="equip-name">なし</span></div>
            </div>
            <div class="status-section-title">状態</div>
            <div id="st-statuses" class="st-statuses"></div>
          </div>
          <div class="inventory-panel">
            <div class="inv-title">持ち物 [I]</div>
            <div id="inventory-list" class="inventory-list"></div>
          </div>
          <div class="blessing-active-panel">
            <div class="inv-title">加護</div>
            <div id="active-blessings" class="active-blessings"></div>
          </div>
        </div>
      </div>
      <div class="message-log-wrap">
        <div id="message-log" class="message-log"></div>
      </div>
      <div id="dungeon-key-help" class="key-help">
        矢印/WASD:移動　G:拾う　Enter/>:階段・話しかける
      </div>
      
      <!-- 村の各種施設モーダル -->
      <div id="modal-storage" class="screen hidden" style="position:absolute; top:0; left:0; background:rgba(0,0,0,0.8); display:flex; justify-content:center; align-items:center; z-index: 2000;">
        <div style="background:var(--panel); padding:20px; border-radius:8px; width:400px; border:1px solid var(--border);">
          <h2 style="color:var(--accent); margin-bottom:10px;">📦 倉庫</h2>
          <div style="display:flex; gap:10px; margin-bottom:10px;">
            <div style="flex:1;">
              <h3 style="font-size:14px; margin-bottom:5px;">手持ちのアイテム</h3>
              <div id="storage-inv-list" style="height:200px; overflow-y:auto; background:var(--bg); padding:5px;"></div>
            </div>
            <div style="flex:1;">
              <h3 style="font-size:14px; margin-bottom:5px;">倉庫のアイテム (<span id="storage-count">0</span>/50)</h3>
              <div id="storage-store-list" style="height:200px; overflow-y:auto; background:var(--bg); padding:5px;"></div>
            </div>
          </div>
          <button id="btn-close-storage" class="btn btn-secondary" style="width:100%;">閉じる</button>
        </div>
      </div>

      <div id="modal-bank" class="screen hidden" style="position:absolute; top:0; left:0; background:rgba(0,0,0,0.8); display:flex; justify-content:center; align-items:center; z-index: 2000;">
        <div style="background:var(--panel); padding:20px; border-radius:8px; width:300px; border:1px solid var(--border); text-align:center;">
          <h2 style="color:var(--gold); margin-bottom:10px;">💰 銀行</h2>
          <div style="margin-bottom:10px; font-size:14px;">
            <p>現在の所持金: <span id="bank-player-gold" style="color:var(--gold); font-weight:bold;">0</span></p>
            <p>現在の預金額: <span id="bank-stored-gold" style="color:var(--gold); font-weight:bold;">0</span></p>
          </div>
          <div style="display:flex; flex-direction:column; gap:10px; margin-bottom:10px;">
            <div>
              <input type="number" id="bank-amount" value="100" style="width:100px; padding:5px;" min="1" />
            </div>
            <div style="display:flex; gap:10px; justify-content:center;">
              <button id="btn-bank-deposit" class="btn btn-primary">預ける</button>
              <button id="btn-bank-withdraw" class="btn btn-secondary">引き出す</button>
            </div>
          </div>
          <button id="btn-close-bank" class="btn btn-secondary" style="width:100%;">閉じる</button>
        </div>
      </div>

      <div id="modal-shop" class="screen hidden" style="position:absolute; top:0; left:0; background:rgba(0,0,0,0.8); display:flex; justify-content:center; align-items:center; z-index: 2000;">
        <div style="background:var(--panel); padding:20px; border-radius:8px; width:350px; border:1px solid var(--border);">
          <h2 style="color:#cc66aa; margin-bottom:10px; text-align:center;">🛒 お店</h2>
          <div style="margin-bottom:10px; font-size:14px; text-align:right;">
            所持金: <span id="shop-player-gold" style="color:var(--gold); font-weight:bold;">0</span>G
          </div>
          <div id="shop-item-list" style="height:200px; overflow-y:auto; background:var(--bg); padding:10px; margin-bottom:15px; border-radius:4px;"></div>
          <button id="btn-close-shop" class="btn btn-secondary" style="width:100%;">閉じる</button>
        </div>
      </div>
    `;

    // ── ゲームオーバー画面 ──────────────────────────────
    this.gameOverScreen = el('div', { id: 'gameover-screen', class: 'screen hidden' });
    this.gameOverScreen.innerHTML = `
      <div class="gameover-bg">
        <div class="gameover-title">Game Over</div>
        <div id="gameover-info" class="gameover-info"></div>
        <div id="gameover-achievements" class="gameover-ach"></div>
        <div class="gameover-buttons">
          <button id="btn-retry"  class="btn btn-primary">もう一度挑む</button>
          <button id="btn-go-lobby" class="btn btn-secondary">ロビーへ戻る</button>
        </div>
      </div>
    `;

    // ── クリア画面 ──────────────────────────────────────
    this.clearScreen = el('div', { id: 'clear-screen', class: 'screen hidden' });
    this.clearScreen.innerHTML = `
      <div class="clear-bg">
        <div class="clear-title">✦ DUNGEON CLEAR ✦</div>
        <div id="clear-info" class="clear-info"></div>
        <button id="btn-clear-lobby" class="btn btn-primary">ロビーへ戻る</button>
      </div>
    `;

    document.body.append(
      this.lobbyScreen,
      this.gachaScreen,
      this.dungeonScreen,
      this.gameOverScreen,
      this.clearScreen,
    );

    this._bindEvents();
  }

  // -------------------------------------------------------
  //  イベントバインド
  // -------------------------------------------------------
  _bindEvents() {
    // ロビー (既存のボタン、後で削除してもよいが互換性のため残す)
    const btnStart = $('btn-start');
    if (btnStart) btnStart.onclick   = () => this._startDungeon();
    const btnGacha = $('btn-gacha');
    if (btnGacha) btnGacha.onclick   = () => this._showGacha();
    const btnLibrary = $('btn-library');
    if (btnLibrary) btnLibrary.onclick = () => this._showGacha();

    $('btn-gacha-back').onclick = () => this._hideGacha();
    $('btn-pull-1').onclick  = () => this._doPull(1);
    $('btn-pull-10').onclick = () => this._doPull(10);
    $('btn-retry').onclick   = () => this._showVillage();
    $('btn-go-lobby').onclick = () => this._showVillage();
    $('btn-clear-lobby').onclick = () => this._showVillage();

    // モーダル閉じる
    $('btn-close-storage').onclick = () => { $('modal-storage').classList.add('hidden'); writeSave(this.saveData); };
    $('btn-close-bank').onclick = () => { $('modal-bank').classList.add('hidden'); writeSave(this.saveData); };
    $('btn-close-shop').onclick = () => { $('modal-shop').classList.add('hidden'); writeSave(this.saveData); };
    
    // 銀行アクション
    $('btn-bank-deposit').onclick = () => {
      const amt = parseInt($('bank-amount').value, 10);
      if (amt > 0 && this.saveData.playerGold >= amt) {
        this.saveData.playerGold -= amt;
        this.saveData.bankGold += amt;
        if(this.village) this.village.player.gold = this.saveData.playerGold;
        this._updateBankUI();
      }
    };
    $('btn-bank-withdraw').onclick = () => {
      const amt = parseInt($('bank-amount').value, 10);
      if (amt > 0 && this.saveData.bankGold >= amt) {
        this.saveData.bankGold -= amt;
        this.saveData.playerGold += amt;
        if(this.village) this.village.player.gold = this.saveData.playerGold;
        this._updateBankUI();
      }
    };
  }

  // -------------------------------------------------------
  //  画面切替
  // -------------------------------------------------------
  _hideAll() {
    [this.lobbyScreen, this.gachaScreen, this.dungeonScreen, this.gameOverScreen, this.clearScreen]
      .forEach(s => s.classList.add('hidden'));
  }

  _showLobby() {
    if (this.game) { this.game.destroy(); this.game = null; }
    this._hideAll();
    this.lobbyScreen.classList.remove('hidden');
    this._renderLobby();
  }

  _showGacha() {
    this.gachaScreen.classList.remove('hidden');
    this._renderGacha();
  }

  _hideGacha() {
    this.gachaScreen.classList.add('hidden');
  }

  _showVillage() {
    if (this.game) { this.game.destroy(); this.game = null; }
    if (this.village) { this.village.destroy(); this.village = null; }
    this._hideAll();
    this.state = GAME_STATE.VILLAGE;
    this.dungeonScreen.classList.remove('hidden');

    const canvas = $('game-canvas');
    this._resizeCanvas(canvas);

    // お店のラインナップ生成
    if (!this.saveData.shopInventory) {
      this._generateShopInventory();
    }

    // インベントリや所持金はセーブデータから読み込む
    this.village = new Village(
      this.saveData,
      canvas,
      () => this._startDungeon(), // ダンジョンへ
      (facilityId) => this._openFacility(facilityId) // 各施設を開く
    );

    // 所持品やお金をセット
    this.village.player.inventory = [...this.saveData.playerInventory];
    this.village.player.gold = this.saveData.playerGold;

    this._startUIUpdate();
    window.addEventListener('resize', () => this._resizeCanvas(canvas));
  }

  _generateShopInventory() {
    // 実行時に items.js をインポートする
    import('./items.js').then(({ createRandomItem }) => {
      this.saveData.shopInventory = [];
      for (let i = 0; i < 5; i++) {
        const item = createRandomItem(3); // 3階相当のアイテム
        if (item) {
          let basePrice = 50;
          if (item.type === 'weapon' || item.type === 'armor') basePrice = 300;
          if (item.type === 'pot' || item.type === 'staff') basePrice = 150;
          if (item.type === 'scroll') basePrice = 100;
          item.price = basePrice + Math.floor(Math.random() * 50);
          this.saveData.shopInventory.push(item);
        }
      }
      import('./save.js').then(({ writeSave }) => writeSave(this.saveData));
    }).catch(e => console.error("Shop Gen Error", e));
  }

  _openFacility(facilityId) {
    if (facilityId === 10) { // TILE.NPC_STORAGE
      this._showStorage();
    } else if (facilityId === 11) { // TILE.NPC_BANK
      this._showBank();
    } else if (facilityId === 12) { // TILE.NPC_SHOP
      this._showShop();
    } else if (facilityId === 13) { // TILE.NPC_SHRINE
      this._showGacha();
    } else if (facilityId === 14) { // TILE.DUNGEON_GATE
      this._startDungeon();
    }
  }

  _showBank() {
    $('modal-bank').classList.remove('hidden');
    this._updateBankUI();
  }

  _updateBankUI() {
    $('bank-player-gold').textContent = this.saveData.playerGold.toLocaleString();
    $('bank-stored-gold').textContent = this.saveData.bankGold.toLocaleString();
  }

  _showShop() {
    $('modal-shop').classList.remove('hidden');
    this._updateShopUI();
  }

  _updateShopUI() {
    const list = $('shop-item-list');
    list.innerHTML = '';
    $('shop-player-gold').textContent = this.saveData.playerGold.toLocaleString();
    
    if (!this.saveData.shopInventory || this.saveData.shopInventory.length === 0) {
      list.innerHTML = '<div style="color:#999; text-align:center; padding: 20px;">品切れです</div>';
      return;
    }
    
    import('./constants.js').then(({ RARITY_COLOR }) => {
      this.saveData.shopInventory.forEach((item, i) => {
        const elItem = el('div', { class: 'shop-row', style: 'display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; border-bottom:1px solid var(--border); padding-bottom:5px;' });
        const nameSpan = el('span', {});
        nameSpan.textContent = item.name;
        nameSpan.style.color = RARITY_COLOR[item.rarity] || '#fff';
        
        const buyBtn = el('button', { class: 'btn btn-primary', style: 'padding: 4px 8px; font-size:12px;' });
        buyBtn.textContent = `${item.price}G`;
        buyBtn.onclick = () => {
          if (this.saveData.playerGold >= item.price) {
            if (this.village.player.inventory.length >= 8) {
              this._toast('持ち物がいっぱいです');
              return;
            }
            this.saveData.playerGold -= item.price;
            this.village.player.inventory.push(item);
            this.saveData.playerInventory = this.village.player.inventory;
            this.village.player.gold = this.saveData.playerGold;
            this.saveData.shopInventory.splice(i, 1);
            import('./save.js').then(({ writeSave }) => writeSave(this.saveData));
            this._updateShopUI();
            this._toast(`${item.name}を購入しました`);
          } else {
            this._toast('お金が足りません');
          }
        };
        
        elItem.appendChild(nameSpan);
        elItem.appendChild(buyBtn);
        list.appendChild(elItem);
      });
    });
  }

  _showStorage() {
    $('modal-storage').classList.remove('hidden');
    this._updateStorageUI();
  }

  _updateStorageUI() {
    // 倉庫UIの更新
    $('storage-count').textContent = this.saveData.storage.length;
    
    const invList = $('storage-inv-list');
    invList.innerHTML = '';
    this.village.player.inventory.forEach((item, i) => {
      const elItem = el('div', { class: 'inv-row' });
      elItem.innerHTML = `<span class="inv-num">${i+1}</span><span class="inv-name" style="color:${RARITY_COLOR[item.rarity] || '#fff'}">${getDisplayName(item)}</span>`;
      elItem.onclick = () => {
        if (this.saveData.storage.length >= 50) return;
        this.saveData.storage.push(item);
        this.village.player.inventory.splice(i, 1);
        this.saveData.playerInventory = this.village.player.inventory;
        this._updateStorageUI();
      };
      invList.appendChild(elItem);
    });

    const storeList = $('storage-store-list');
    storeList.innerHTML = '';
    this.saveData.storage.forEach((item, i) => {
      const elItem = el('div', { class: 'inv-row' });
      elItem.innerHTML = `<span class="inv-num">${i+1}</span><span class="inv-name" style="color:${RARITY_COLOR[item.rarity] || '#fff'}">${getDisplayName(item)}</span>`;
      elItem.onclick = () => {
        if (this.village.player.inventory.length >= 8) return; // プレイヤーのインベントリ制限
        this.village.player.inventory.push(item);
        this.saveData.storage.splice(i, 1);
        this.saveData.playerInventory = this.village.player.inventory;
        this._updateStorageUI();
      };
      storeList.appendChild(elItem);
    });
  }

  // -------------------------------------------------------
  //  ロビー描画
  // -------------------------------------------------------
  _selectedBlessingIds = [];

  _renderLobby() {
    const sd = this.saveData;
    $('soul-count').textContent = sd.soulFragments.toLocaleString();

    // 統計
    const stats = sd.stats;
    $('lobby-stats').innerHTML = `
      <div class="stat-row"><span>挑戦回数</span><span>${stats.totalRuns || 0}回</span></div>
      <div class="stat-row"><span>最高到達F</span><span>${stats.maxFloor || 0}F</span></div>
      <div class="stat-row"><span>総討伐数</span><span>${stats.totalKills || 0}体</span></div>
      <div class="stat-row"><span>クリア数</span><span>${stats.clears || 0}回</span></div>
    `;

    // 加護スロット
    const maxSlots = sd.blessingSlots || 2;
    this._renderBlessingSlots(maxSlots);

    // スロット拡張ボタン
    const slotBtn = this.lobbyScreen.querySelector('.btn-slot-unlock');
    const nextIdx = maxSlots - 2; // 2スロットから始まる
    if (nextIdx < SLOT_UNLOCK_COST.length) {
      const cost = SLOT_UNLOCK_COST[nextIdx];
      slotBtn.style.display = 'block';
      slotBtn.textContent   = `スロット拡張 (◈${cost.toLocaleString()})`;
      slotBtn.onclick = () => {
        if (sd.soulFragments >= cost) {
          sd.soulFragments -= cost;
          sd.blessingSlots  = (sd.blessingSlots || 2) + 1;
          writeSave(sd);
          this._renderLobby();
        } else {
          this._toast('魂片が足りません！');
        }
      };
    } else {
      slotBtn.style.display = 'none';
    }
  }

  _renderBlessingSlots(maxSlots) {
    // 選択済みをmaxSlotsに切り詰め
    if (this._selectedBlessingIds.length > maxSlots) {
      this._selectedBlessingIds.length = maxSlots;
    }

    document.querySelectorAll('.blessing-slots').forEach(slotsDiv => {
      slotsDiv.innerHTML = '';
      for (let i = 0; i < maxSlots; i++) {
        const bid = this._selectedBlessingIds[i];
        const b   = bid ? getBlessingById(bid) : null;
        const slot = el('div', { class: 'blessing-slot' + (b ? ' filled' : '') });
        slot.innerHTML = b
          ? `<span class="bs-icon">${b.icon}</span><span class="bs-name" style="color:${RARITY_COLOR[b.rarity]}">${b.name}</span>`
          : `<span class="bs-empty">スロット ${i+1}</span>`;
        slot.dataset.index = i;
        slot.onclick = () => {
          if (b) {
            // 解除
            this._selectedBlessingIds.splice(i, 1);
            this._renderLobby();
            if (this.gachaScreen && !this.gachaScreen.classList.contains('hidden')) {
              this._renderGacha();
            }
          }
        };
        slotsDiv.appendChild(slot);
      }
    });

    // 所持加護リスト
    const list = $('owned-blessings-list');
    list.innerHTML = '<div class="ol-title">所持加護（クリックで選択）</div>';
    const summary = getOwnedBlessingsSummary(this.saveData);
    if (!summary.length) {
      list.innerHTML += '<div class="ol-empty">加護がありません。ガチャを引いてみよう！</div>';
    }
    for (const { data, count, id } of summary) {
      const selected = this._selectedBlessingIds.includes(id);
      const card = el('div', { class: 'owned-card' + (selected ? ' selected' : '') });
      card.innerHTML = `
        <span class="oc-icon">${data.icon}</span>
        <span class="oc-name" style="color:${RARITY_COLOR[data.rarity]}">${RARITY_NAME[data.rarity]} ${data.name}</span>
        <span class="oc-count">×${count}</span>
      `;
      card.onclick = () => {
        if (selected) {
          const idx = this._selectedBlessingIds.indexOf(id);
          if (idx >= 0) this._selectedBlessingIds.splice(idx, 1);
        } else if (this._selectedBlessingIds.length < maxSlots) {
          this._selectedBlessingIds.push(id);
        } else {
          this._toast(`スロットが満杯です（最大${maxSlots}枠）`);
        }
        this._renderLobby();
      };
      list.appendChild(card);
    }
  }

  // -------------------------------------------------------
  //  ガチャ画面描画
  // -------------------------------------------------------
  _renderGacha() {
    const sd = this.saveData;
    $('gacha-soul-count').textContent = sd.soulFragments.toLocaleString();
    $('soul-count').textContent = sd.soulFragments.toLocaleString();

    // 天井バー
    const pity = sd.gachaCount || 0;
    $('pity-count').textContent = `${pity}/${GACHA_PITY}`;
    $('pity-bar-fill').style.width = `${(pity / GACHA_PITY) * 100}%`;

    // 加護スロット
    const maxSlots = sd.blessingSlots || 2;
    this._renderBlessingSlots(maxSlots);

    // スロット拡張ボタン
    const slotBtn = this.gachaScreen.querySelector('.btn-slot-unlock');
    if (slotBtn) {
      const nextIdx = maxSlots - 2; // 2スロットから始まる
      if (nextIdx < SLOT_UNLOCK_COST.length) {
        const cost = SLOT_UNLOCK_COST[nextIdx];
        slotBtn.style.display = 'block';
        slotBtn.textContent   = `スロット拡張 (◈${cost.toLocaleString()})`;
        slotBtn.onclick = () => {
          if (sd.soulFragments >= cost) {
            sd.soulFragments -= cost;
            sd.blessingSlots  = (sd.blessingSlots || 2) + 1;
            writeSave(sd);
            this._renderGacha();
          } else {
            this._toast('魂片が足りません！');
          }
        };
      } else {
        slotBtn.style.display = 'none';
      }
    }

    // 所持加護リスト（昇華ボタン付き）
    const list = $('gacha-owned-list');
    list.innerHTML = '';
    const summary = getOwnedBlessingsSummary(sd);
    if (!summary.length) {
      list.innerHTML = '<div class="ol-empty">まだ加護を所持していません。</div>';
    }
    for (const { data, count, id } of summary) {
      const { canSublimate } = checkSublimation(sd, id);
      const card = el('div', { class: 'gacha-owned-card' });
      if (this._selectedBlessingIds.includes(id)) {
        card.classList.add('selected');
      }
      card.innerHTML = `
        <span class="oc-icon">${data.icon}</span>
        <span class="oc-name" style="color:${RARITY_COLOR[data.rarity]}">${RARITY_NAME[data.rarity]} ${data.name}</span>
        <span class="oc-count">×${count}</span>
        <span class="oc-desc">${data.desc}</span>
        ${canSublimate ? `<button class="btn btn-sublimate" data-id="${id}">昇華（×3消費）</button>` : ''}
      `;
      card.onclick = (e) => {
        if (e.target.classList.contains('btn-sublimate')) return;
        this._toggleBlessingSelect(id, maxSlots);
      };
      list.appendChild(card);
    }

    list.querySelectorAll('.btn-sublimate').forEach(btn => {
      btn.onclick = () => {
        const result = doSublimation(this.saveData, btn.dataset.id);
        if (result.success) {
          this._toast(`昇華成功！ ${result.upgraded.name} が誕生した！`);
          this._renderGacha();
        } else {
          this._toast(result.error);
        }
      };
    });
  }

  _toggleBlessingSelect(id, maxSlots) {
    const idx = this._selectedBlessingIds.indexOf(id);
    if (idx >= 0) {
      this._selectedBlessingIds.splice(idx, 1);
    } else {
      if (this._selectedBlessingIds.length >= maxSlots) {
        this._toast(`加護は最大${maxSlots}つまでしかセットできません`);
        return;
      }
      this._selectedBlessingIds.push(id);
    }
    this._renderGacha();
    this._renderActiveBlessings();
  }

  // -------------------------------------------------------
  //  ガチャ実行
  // -------------------------------------------------------
  _doPull(count) {
    const fn = count === 1 ? pullSingle : pullTen;
    const result = fn(this.saveData);

    if (!result.success) { this._toast(result.error); return; }

    // 演出
    this._showGachaResult(result.results);
    this._renderGacha();
  }

  _showGachaResult(results) {
    const panel = $('gacha-result');
    panel.innerHTML = '';
    panel.classList.remove('hidden');

    // UR演出
    const hasUR = results.some(r => r.rarity === RARITY.ULTRA_RARE);
    if (hasUR) {
      panel.classList.add('ur-flash');
      setTimeout(() => panel.classList.remove('ur-flash'), 1500);
    }

    for (const { blessing, rarity, isNew } of results) {
      const card = el('div', { class: `result-card rarity-${rarity}` });
      card.innerHTML = `
        <span class="rc-rarity" style="color:${RARITY_COLOR[rarity]}">${RARITY_NAME[rarity]}</span>
        <span class="rc-icon">${blessing.icon}</span>
        <span class="rc-name" style="color:${RARITY_COLOR[rarity]}">${blessing.name}</span>
        ${isNew ? '<span class="rc-new">NEW!</span>' : ''}
      `;
      panel.appendChild(card);
    }

    const closeBtn = el('button', { class: 'btn btn-secondary result-close' });
    closeBtn.textContent = '閉じる';
    closeBtn.onclick = () => { panel.classList.add('hidden'); panel.innerHTML = ''; };
    panel.appendChild(closeBtn);
  }

  // -------------------------------------------------------
  //  ダンジョン開始
  // -------------------------------------------------------
  _startDungeon() {
    this._hideAll();
    this.dungeonScreen.classList.remove('hidden');

    const canvas = $('game-canvas');
    this._resizeCanvas(canvas);

    // お店のラインナップをリセット（次回村に戻った時に再生成）
    this.saveData.shopInventory = null;
    import('./save.js').then(({ writeSave }) => writeSave(this.saveData));

    this.game = new Game(
      this.saveData,
      [...this._selectedBlessingIds],
      canvas,
      (result) => this._showGameOver(result),
      (result) => this._showClear(result),
      this.village ? [...this.village.player.inventory] : [...(this.saveData.playerInventory || [])],
      this.village ? this.village.player.gold : (this.saveData.playerGold || 0)
    );

    this.game.onMessage = (text, color) => this._addMessage(text, color);
    
    // 初期メッセージの表示
    $('message-log').innerHTML = '';
    for (const msg of this.game.messages) {
      this._addMessage(msg.text, msg.color);
    }

    this._startUIUpdate();
    this._renderActiveBlessings();
    window.addEventListener('resize', () => this._resizeCanvas(canvas));
  }

  _resizeCanvas(canvas) {
    const right = document.querySelector('.dungeon-right');
    const rightW = right ? right.offsetWidth : 280;
    canvas.width  = window.innerWidth  - rightW - 8;
    canvas.height = window.innerHeight - 70;
  }

  // -------------------------------------------------------
  //  ダンジョンUI更新
  // -------------------------------------------------------
  _uiInterval = null;

  _startUIUpdate() {
    if (this._uiInterval) clearInterval(this._uiInterval);
    this._uiInterval = setInterval(() => {
      this._updateDungeonUI();
    }, 50);
  }

  _updateDungeonUI() {
    const p = this.game ? this.game.player : (this.village ? this.village.player : null);
    if (!p) return;

    $('st-floor').textContent   = this.game ? `${this.game.floor}F` : '村';
    $('hp-text').textContent    = `${p.hp}/${p.hpMax}`;
    $('hunger-text').textContent= `${p.hunger}/${p.hungerMax}`;
    $('st-level').textContent   = p.level;
    $('st-exp').textContent     = `${p.exp}`;
    $('st-atk').textContent     = p.atk;
    $('st-def').textContent     = p.def;
    $('st-gold').textContent    = `${p.gold}G`;

    $('hp-bar').style.width     = `${Math.max(0, (p.hp / p.hpMax) * 100)}%`;
    $('hp-bar').style.background = p.hp / p.hpMax > 0.5 ? '#44cc44'
      : p.hp / p.hpMax > 0.25 ? '#ccaa00' : '#cc2222';
    $('hunger-bar').style.width = `${(p.hunger / p.hungerMax) * 100}%`;

    $('eq-weapon').textContent  = p.weapon ? `${p.weapon.name}+${p.weapon.bonus||0}` : 'なし';
    $('eq-armor').textContent   = p.armor  ? `${p.armor.name}+${p.armor.bonus||0}`   : 'なし';

    // 状態異常
    const statDiv = $('st-statuses');
    statDiv.innerHTML = '';
    const icons = { poison: '☠毒', sleep: '💤眠り', stun: '⚡麻痺', death_mark: '💀死印' };
    for (const [s, turns] of Object.entries(p.statuses)) {
      const sp = el('span', { class: 'status-badge' });
      sp.textContent = (icons[s] || s) + `(${turns})`;
      statDiv.appendChild(sp);
    }

    // インベントリ
    this._renderInventory(p);
  }

  _renderInventory(p) {
    const list = $('inventory-list');
    
    // 初回のみDOM要素を生成（8枠固定）
    if (list.children.length === 0) {
      for (let i = 0; i < 8; i++) {
        const row = el('div', { class: 'inv-row inv-empty' });
        row.innerHTML = `
          <span class="inv-num">${i+1}</span>
          <span class="inv-empty-label" style="flex:1;">─</span>
          <button class="btn btn-sm inv-drop-btn" title="捨てる" style="padding:0 4px; font-size:10px; border-radius:2px; display:none;">捨</button>
        `;
        list.appendChild(row);
      }
    }

    // 中身だけ更新する
    for (let i = 0; i < 8; i++) {
      const item = p.inventory[i];
      const row  = list.children[i];
      const nameSpan = row.querySelector('.inv-name, .inv-empty-label');
      const dropBtn  = row.querySelector('.inv-drop-btn');

      if (item) {
        row.className = 'inv-row';
        nameSpan.className = 'inv-name';
        nameSpan.style.cursor = 'pointer';
        nameSpan.title = 'クリックで使う/装備する';
        nameSpan.textContent = getDisplayName(item);
        nameSpan.onclick = () => {
          if (!this.game) {
            this._toast('村では使えません');
            return;
          }
          if (['weapon','armor'].includes(item.type)) {
            this.game.externalEquipItem(i);
          } else {
            this.game.externalUseItem(i);
          }
        };

        dropBtn.style.display = 'inline-block';
        dropBtn.onclick = (e) => {
          e.stopPropagation();
          if (!this.game) {
            this._toast('村では捨てられません');
            return;
          }
          this.game.externalDropItem(i);
        };
      } else {
        row.className = 'inv-row inv-empty';
        nameSpan.className = 'inv-empty-label';
        nameSpan.style.cursor = 'default';
        nameSpan.title = '';
        nameSpan.textContent = '─';
        nameSpan.onclick = null;
        
        dropBtn.style.display = 'none';
        dropBtn.onclick = null;
      }
    }
  }

  _renderActiveBlessings() {
    const div = $('active-blessings');
    div.innerHTML = '';
    for (const id of this._selectedBlessingIds) {
      const b = getBlessingById(id);
      if (!b) continue;
      const span = el('span', { class: 'active-blessing-badge' });
      span.title = b.desc;
      span.textContent = b.icon + ' ' + b.name;
      div.appendChild(span);
    }
  }

  _addMessage(text, color) {
    const log = $('message-log');
    const line = el('div', { class: 'msg-line' });
    line.style.color = color || '#cccccc';
    line.textContent = text;
    log.appendChild(line); // 下に追加していく
    // 最新50件を保持（古いものを上から削除）
    while (log.children.length > 50) log.removeChild(log.firstChild);
    
    // 常に最新メッセージが見えるように下へスクロール
    log.scrollTop = log.scrollHeight;
  }

  // -------------------------------------------------------
  //  ゲームオーバー画面
  // -------------------------------------------------------
  _showGameOver(result) {
    if (this._uiInterval) clearInterval(this._uiInterval);
    this._hideAll();
    this.gameOverScreen.classList.remove('hidden');

    $('gameover-info').innerHTML = `
      <div class="go-floor">到達フロア：<strong>${result.floor}F</strong></div>
      <div class="go-souls">
        獲得魂片：<strong>◈ ${result.souls.toLocaleString()}</strong>
        <span class="soul-tip">（次のガチャに使えます）</span>
      </div>
    `;

    const achDiv = $('gameover-achievements');
    achDiv.innerHTML = '';
    if (result.achievements?.length) {
      achDiv.innerHTML = '<div class="ach-title">✦ 実績解除！</div>';
      for (const a of result.achievements) {
        const d = el('div', { class: 'ach-item' });
        d.textContent = `🏆 ${a.label}`;
        achDiv.appendChild(d);
      }
    }
  }

  // -------------------------------------------------------
  //  クリア画面
  // -------------------------------------------------------
  _showClear(result) {
    if (this._uiInterval) clearInterval(this._uiInterval);
    this._hideAll();
    this.clearScreen.classList.remove('hidden');

    $('clear-info').innerHTML = `
      <div class="cl-congrats">おめでとうございます！ダンジョンを攻略しました！</div>
      <div class="cl-souls">獲得魂片：<strong>◈ ${result.souls.toLocaleString()}</strong></div>
    `;
  }

  // -------------------------------------------------------
  //  トーストメッセージ
  // -------------------------------------------------------
  _toast(msg) {
    const t = el('div', { class: 'toast' });
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.classList.add('show'), 10);
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 2500);
  }
}

// -------------------------------------------------------
//  ユーティリティ
// -------------------------------------------------------
function el(tag, attrs = {}) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v;
    else e.setAttribute(k, v);
  }
  return e;
}

function $(id) { return document.getElementById(id); }

// -------------------------------------------------------
//  起動
// -------------------------------------------------------
window.addEventListener('DOMContentLoaded', async () => {
  const { Assets } = await import('./assets.js');
  await Assets.loadAll();
  new App();
});
