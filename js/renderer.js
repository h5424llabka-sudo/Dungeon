// ============================================================
//  renderer.js  ─  Canvas描画
// ============================================================

import { TILE, TILE_SIZE, MAP_WIDTH, MAP_HEIGHT, RARITY_COLOR } from './constants.js';
import { getDisplayName } from './items.js';
import { Assets } from './assets.js';

// タイルの基本色
const COLORS = {
  wall:        '#05050a',
  wallEdge:    '#11111a',
  floor:       '#3a3a4e',
  floorDark:   '#20202c',
  corridor:    '#2c2c3e',
  corridorDark:'#181824',
  stairs:      '#c9a96e',
  stairsDark:  '#6b5a3e',
  door:        '#8b5e1a',
  water:       '#0d2a4a',
  waterShine:  '#1a4a7a',
  trap:        '#4a0a0a',
  fog:         '#000000',
  explored:    0.25,
  
  // 村用
  villageFloor: '#455545', // 草地っぽく
  villageWall:  '#2a3a2a', // 木や崖
  villageWallEdge: '#3a4a3a',
  npcStorage:   '#aa8855',
  npcBank:      '#cccc44',
  npcShop:      '#cc66aa',
  npcShrine:    '#aa44ff',
  dungeonGate:  '#882222',

  player:      '#f0e080',
  playerShadow:'#c9a020',
  enemy:       '#e05555',
  bossEnemy:   '#ff2222',
  item:        '#55cc88',
  gold:        '#ffd700',
};

export class Renderer {
  constructor(canvas) {
    this.canvas  = canvas;
    this.ctx     = canvas.getContext('2d');
    this.tileSize = TILE_SIZE;
    this.animTick = 0;

    // アニメーションループ
    this._rafId = null;
  }

  // -------------------------------------------------------
  //  メイン描画
  // -------------------------------------------------------
  draw(state) {
    const { player, tiles, enemies, items, visibleSet, exploredSet, floor } = state;
    const ctx   = this.ctx;
    const ts    = this.tileSize;

    // カメラ計算（プレイヤーを中央に）
    const camX = player.x - Math.floor(this.canvas.width  / ts / 2);
    const camY = player.y - Math.floor(this.canvas.height / ts / 2);

    ctx.fillStyle = COLORS.fog;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const startX = Math.max(0, camX);
    const startY = Math.max(0, camY);
    const endX   = Math.min(MAP_WIDTH,  camX + Math.ceil(this.canvas.width  / ts) + 1);
    const endY   = Math.min(MAP_HEIGHT, camY + Math.ceil(this.canvas.height / ts) + 1);

    // ── タイル描画 ────────────────────────────────────
    for (let ty = startY; ty < endY; ty++) {
      for (let tx = startX; tx < endX; tx++) {
        const key  = `${tx},${ty}`;
        const isVisible  = state.isVillage ? true : visibleSet.has(key);
        const isExplored = state.isVillage ? true : exploredSet.has(key);
        if (!isVisible && !isExplored) continue;

        const tile = tiles[ty][tx];
        const sx   = (tx - camX) * ts;
        const sy   = (ty - camY) * ts;

        this._drawTile(ctx, tile, sx, sy, ts, isVisible, tx, ty, state);
      }
    }

    // ── アイテム描画 ──────────────────────────────────
    if (items) {
      for (const item of items) {
        const key = `${item.x},${item.y}`;
        if (!state.isVillage && !visibleSet.has(key)) continue;
        const sx = (item.x - camX) * ts;
        const sy = (item.y - camY) * ts;
        this._drawItem(ctx, item, sx, sy, ts);
      }
    }

    // ── 敵描画 ───────────────────────────────────────
    if (enemies) {
      for (const enemy of enemies) {
        if (enemy.isDead()) continue;
        const key = `${enemy.x},${enemy.y}`;
        if (!state.isVillage && !visibleSet.has(key)) continue;
        const sx = (enemy.x - camX) * ts;
        const sy = (enemy.y - camY) * ts;
        this._drawEnemy(ctx, enemy, sx, sy, ts);
      }
    }

    // ── プレイヤー描画 ────────────────────────────────
    const psx = (player.x - camX) * ts;
    const psy = (player.y - camY) * ts;
    this._drawPlayer(ctx, player, psx, psy, ts);

    // ── ミニマップ描画 ──────────────────────────────
    if (!state.isVillage) {
      this._drawMinimap(ctx, tiles, exploredSet, visibleSet, player, enemies || [], items || []);
    }

    this.animTick++;
  }

  _drawTile(ctx, tile, sx, sy, ts, isVisible, tx, ty, state) {
    if (Assets.config) {
      let cellCustom = null;
      if (state && state.isVillage && state.customImages && state.customImages[ty] && state.customImages[ty][tx]) {
        cellCustom = state.customImages[ty][tx];
      }

      // 村のオブジェクトタイルの場合は、透過背景として先に床を描画する
      const isVillageObj = [TILE.VILLAGE_WALL, TILE.NPC_STORAGE, TILE.NPC_BANK, TILE.NPC_SHOP, TILE.NPC_SHRINE, TILE.DUNGEON_GATE].includes(tile);
      if (isVillageObj || (state && state.isVillage && tile === TILE.VILLAGE_FLOOR)) {
        const floorImgConfig = (cellCustom && cellCustom.base) ? cellCustom.base : Assets.config.village?.floor;
        const floorImg = Assets.getImage(floorImgConfig);
        if (floorImg) {
          ctx.globalAlpha = isVisible ? 1.0 : 0.5;
          const fx = floorImgConfig.sx || 0;
          const fy = floorImgConfig.sy || 0;
          ctx.drawImage(floorImg, fx, fy, 32, 32, sx, sy, ts, ts);
          ctx.globalAlpha = 1.0;
        } else if (isVillageObj) {
          ctx.fillStyle = COLORS.villageFloor;
          ctx.fillRect(sx, sy, ts, ts);
        }
      }

      if (state && state.isVillage && tile === TILE.VILLAGE_FLOOR) {
        return;
      }

      let imgSrc = null;
      if (cellCustom && cellCustom.obj !== undefined) {
        imgSrc = cellCustom.obj;
      } else {
        switch (tile) {
          case TILE.FLOOR:         imgSrc = Assets.config.dungeon?.floor; break;
          case TILE.WALL:          imgSrc = Assets.config.dungeon?.wall; break;
          case TILE.CORRIDOR:      imgSrc = Assets.config.dungeon?.corridor; break;
          case TILE.WATER:         imgSrc = Assets.config.dungeon?.water; break;
          case TILE.STAIRS:        imgSrc = Assets.config.dungeon?.stairs; break;
          case TILE.DOOR:          imgSrc = Assets.config.dungeon?.door; break;
          case TILE.TRAP:          imgSrc = Assets.config.dungeon?.trap; break;
          case TILE.VILLAGE_FLOOR: imgSrc = Assets.config.village?.floor; break;
          case TILE.VILLAGE_WALL:  imgSrc = Assets.config.village?.wall; break;
          case TILE.NPC_STORAGE:   imgSrc = Assets.config.village?.storage; break;
          case TILE.NPC_BANK:      imgSrc = Assets.config.village?.bank; break;
          case TILE.NPC_SHOP:      imgSrc = Assets.config.village?.shop; break;
          case TILE.NPC_SHRINE:    imgSrc = Assets.config.village?.shrine; break;
          case TILE.DUNGEON_GATE:  imgSrc = Assets.config.village?.gate; break;
        }
      }
      const imgConfig = imgSrc;
      const img = Assets.getImage(imgConfig);
      if (img) {
        ctx.globalAlpha = isVisible ? 1.0 : 0.5;
        const cropX = imgConfig.sx || 0;
        const cropY = imgConfig.sy || 0;
        ctx.drawImage(img, cropX, cropY, 32, 32, sx, sy, ts, ts);
        ctx.globalAlpha = 1.0;
        
        if (!isVisible) {
          ctx.fillStyle = 'rgba(0,0,0,0.5)';
          ctx.fillRect(sx, sy, ts, ts);
        }
        return;
      }
    }

    // --- Fallback (Old text/color rendering) ---
    let color;
    switch (tile) {
      case TILE.WALL:          color = isVisible ? COLORS.wallEdge : COLORS.wall; break;
      case TILE.FLOOR:         color = isVisible ? COLORS.floor    : COLORS.floorDark; break;
      case TILE.CORRIDOR:      color = isVisible ? COLORS.corridor : COLORS.corridorDark; break;
      case TILE.STAIRS:        color = isVisible ? COLORS.stairs   : COLORS.stairsDark; break;
      case TILE.DOOR:          color = isVisible ? COLORS.door     : '#4a3010'; break;
      case TILE.WATER:         color = isVisible ? this._waterColor() : '#061525'; break;
      case TILE.TRAP:          color = isVisible ? COLORS.trap     : COLORS.floor; break;
      
      // 村用
      case TILE.VILLAGE_FLOOR: color = COLORS.villageFloor; break;
      case TILE.VILLAGE_WALL:  color = COLORS.villageWallEdge; break;
      case TILE.NPC_STORAGE:   color = COLORS.npcStorage; break;
      case TILE.NPC_BANK:      color = COLORS.npcBank; break;
      case TILE.NPC_SHOP:      color = COLORS.npcShop; break;
      case TILE.NPC_SHRINE:    color = COLORS.npcShrine; break;
      case TILE.DUNGEON_GATE:  color = COLORS.dungeonGate; break;
      
      default:                 color = '#000'; break;
    }

    ctx.fillStyle = color;
    ctx.fillRect(sx, sy, ts, ts);

    // タイル枠線（見やすくするため）
    if (tile === TILE.FLOOR || tile === TILE.CORRIDOR || tile === TILE.WALL || tile === TILE.VILLAGE_FLOOR || tile === TILE.VILLAGE_WALL) {
      ctx.strokeStyle = isVisible ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.3)';
      ctx.lineWidth = 1;
      ctx.strokeRect(sx, sy, ts, ts);
    }

    // タイル文字
    if (isVisible) {
      ctx.font = `${Math.floor(ts * 0.55)}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      switch (tile) {
        case TILE.STAIRS:
          ctx.fillStyle = '#fff8cc';
          ctx.fillText('▼', sx + ts/2, sy + ts/2);
          break;
        case TILE.DOOR:
          ctx.fillStyle = '#e0a040';
          ctx.fillText('+', sx + ts/2, sy + ts/2);
          break;
        case TILE.WATER:
          ctx.fillStyle = 'rgba(100,180,255,0.4)';
          ctx.fillText('~', sx + ts/2, sy + ts/2);
          break;
        case TILE.TRAP:
          break;
        case TILE.NPC_STORAGE:
          ctx.fillStyle = '#fff';
          ctx.fillText('📦', sx + ts/2, sy + ts/2);
          break;
        case TILE.NPC_BANK:
          ctx.fillStyle = '#fff';
          ctx.fillText('💰', sx + ts/2, sy + ts/2);
          break;
        case TILE.NPC_SHOP:
          ctx.fillStyle = '#fff';
          ctx.fillText('🛒', sx + ts/2, sy + ts/2);
          break;
        case TILE.NPC_SHRINE:
          ctx.fillStyle = '#fff';
          ctx.fillText('⛩️', sx + ts/2, sy + ts/2);
          break;
        case TILE.DUNGEON_GATE:
          ctx.fillStyle = '#fff';
          ctx.fillText('⚔', sx + ts/2, sy + ts/2);
          break;
      }
    }
  }

  _waterColor() {
    const phase = (Math.sin(this.animTick * 0.05) + 1) / 2;
    const r = Math.floor(13 + phase * 10);
    const g = Math.floor(42 + phase * 20);
    const b = Math.floor(74 + phase * 30);
    return `rgb(${r},${g},${b})`;
  }

  _drawItem(ctx, item, sx, sy, ts) {
    let imgConfig = Assets.config?.items?.[item.type];
    if (!imgConfig && item.type === 'gold') imgConfig = Assets.config?.items?.gold;
    const img = Assets.getImage(imgConfig);

    if (img) {
      const cropX = imgConfig.sx || 0;
      const cropY = imgConfig.sy || 0;
      ctx.drawImage(img, cropX, cropY, 32, 32, sx, sy, ts, ts);
      return;
    }

    // --- Fallback ---
    // アイテムの背景グロー
    const color = item.type === 'gold' ? COLORS.gold : COLORS.item;
    ctx.shadowBlur  = 8;
    ctx.shadowColor = color;
    ctx.fillStyle   = color;
    ctx.font        = `${Math.floor(ts * 0.6)}px monospace`;
    ctx.textAlign   = 'center';
    ctx.textBaseline = 'middle';

    let char = '?';
    switch (item.type) {
      case 'weapon': char = '⚔'; break;
      case 'armor':  char = '🛡'; break;
      case 'grass':  char = '🌿'; break;
      case 'scroll': char = '📜'; break;
      case 'staff':  char = '🪄'; break;
      case 'food':   char = '🍙'; break;
      case 'pot':    char = '🏺'; break;
      case 'gold':   char = '$'; break;
    }
    ctx.fillText(char, sx + ts/2, sy + ts/2);
    ctx.shadowBlur = 0;
  }

  _drawEnemy(ctx, enemy, sx, sy, ts) {
    const isBoss = enemy.isBoss;
    const color  = isBoss ? COLORS.bossEnemy : COLORS.enemy;

    // 攻撃アニメーションのオフセット
    let offsetX = 0;
    let offsetY = 0;
    if (enemy.attackTarget) {
      const elapsed = Date.now() - enemy.attackTarget.time;
      const dur = enemy.attackTarget.duration || 150;
      if (elapsed < dur) {
        const progress = elapsed / dur;
        const peak = Math.sin(progress * Math.PI);
        const tx = enemy.attackTarget.x - enemy.x;
        const ty = enemy.attackTarget.y - enemy.y;
        offsetX = tx * ts * 0.5 * peak;
        offsetY = ty * ts * 0.5 * peak;
      }
    }
    sx += offsetX;
    sy += offsetY;

    // HP バー
    const hpRatio = enemy.hp / enemy.hpMax;
    ctx.fillStyle = '#330000';
    ctx.fillRect(sx + 2, sy + ts - 6, ts - 4, 4);
    ctx.fillStyle = hpRatio > 0.5 ? '#44cc44' : hpRatio > 0.25 ? '#ccaa00' : '#cc2222';
    ctx.fillRect(sx + 2, sy + ts - 6, Math.floor((ts - 4) * hpRatio), 4);

    const imgConfig = Assets.config?.characters?.enemies?.[enemy.id];
    const img = Assets.getImage(imgConfig);

    if (img) {
      const sw = 32;
      const sh = 32;

      const animSeq = [1, 0, 1, 2];
      const frameX = animSeq[(enemy.animState || 0) % 4];
      
      let frameY = 0; // DOWN
      if (enemy.direction === 'LEFT') frameY = 1;
      if (enemy.direction === 'RIGHT') frameY = 2;
      if (enemy.direction === 'UP') frameY = 3;

      const cropX = (imgConfig.sx || 0) + frameX * sw;
      const cropY = (imgConfig.sy || 0) + frameY * sh;

      const drawH = ts * 1.2;
      const drawW = ts;
      const dy = sy + ts - drawH + 4;
      
      ctx.drawImage(img, cropX, cropY, sw, sh, sx, dy, drawW, drawH);
    } else {
      // Fallback
      ctx.font        = `${Math.floor(ts * (isBoss ? 0.72 : 0.62))}px serif`;
      ctx.textAlign   = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowBlur  = isBoss ? 12 : 6;
      ctx.shadowColor = color;
      ctx.fillText(enemy.icon, sx + ts/2, sy + ts/2 - 2);
      ctx.shadowBlur  = 0;
    }

    // 状態異常マーク
    if (enemy.hasStatus('sleep')) {
      ctx.font = '10px sans-serif';
      ctx.fillStyle = '#aaaaff';
      ctx.fillText('💤', sx + ts - 8, sy + 8);
    }
    if (enemy.hasStatus('stun')) {
      ctx.font = '10px sans-serif';
      ctx.fillStyle = '#ffff44';
      ctx.fillText('⚡', sx + ts - 8, sy + 8);
    }
  }

  _drawPlayer(ctx, player, sx, sy, ts) {
    // 攻撃アニメーションのオフセット
    let offsetX = 0;
    let offsetY = 0;
    if (player.attackTarget) {
      const elapsed = Date.now() - player.attackTarget.time;
      const dur = player.attackTarget.duration || 150;
      if (elapsed < dur) {
        const progress = elapsed / dur;
        const peak = Math.sin(progress * Math.PI);
        const tx = player.attackTarget.x - player.x;
        const ty = player.attackTarget.y - player.y;
        offsetX = tx * ts * 0.5 * peak;
        offsetY = ty * ts * 0.5 * peak;
      }
    }
    sx += offsetX;
    sy += offsetY;

    // 影
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(sx + ts/2, sy + ts - 4, ts/3, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    const imgConfig = Assets.config?.characters?.player;
    const img = Assets.getImage(imgConfig);

    if (img) {
      const sw = 32;
      const sh = 32;

      const animSeq = [1, 0, 1, 2];
      const frameX = animSeq[(player.animState || 0) % 4];
      
      let frameY = 0; // DOWN
      if (player.direction === 'LEFT') frameY = 1;
      if (player.direction === 'RIGHT') frameY = 2;
      if (player.direction === 'UP') frameY = 3;

      const cropX = (imgConfig.sx || 0) + frameX * sw;
      const cropY = (imgConfig.sy || 0) + frameY * sh;

      const bob = Math.sin(this.animTick * 0.1) * 1.5;
      const drawH = ts * 1.2;
      const drawW = ts;
      const dy = sy + ts - drawH + 4 + bob;
      
      ctx.drawImage(img, cropX, cropY, sw, sh, sx, dy, drawW, drawH);
    } else {
      // Fallback
      const bob = Math.sin(this.animTick * 0.1) * 1.5;
      ctx.font        = `${Math.floor(ts * 0.7)}px serif`;
      ctx.textAlign   = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowBlur  = 16;
      ctx.shadowColor = COLORS.playerShadow;
      ctx.fillText('🧙', sx + ts/2, sy + ts/2 - 2 + bob);
      ctx.shadowBlur  = 0;
    }

    // 主人公上部の体力バー
    const hpRatio = player.hp / player.hpMax;
    ctx.fillStyle = '#330000';
    ctx.fillRect(sx + 2, sy - 6, ts - 4, 4);
    ctx.fillStyle = hpRatio > 0.5 ? '#44cc44' : hpRatio > 0.25 ? '#ccaa00' : '#cc2222';
    ctx.fillRect(sx + 2, sy - 6, Math.floor((ts - 4) * hpRatio), 4);

    // 状態異常
    const statuses = Object.keys(player.statuses);
    statuses.forEach((s, i) => {
      const icons = { poison: '☠', sleep: '💤', stun: '⚡' };
      ctx.font = '9px sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(icons[s] || '?', sx + 4 + i * 12, sy + 4);
    });
  }

  // -------------------------------------------------------
  //  ダメージ数値フロート
  // -------------------------------------------------------
  _floatTexts = [];

  addFloatText(x, y, text, color = '#ffffff', cameraOffset = { x: 0, y: 0 }) {
    this._floatTexts.push({
      x, y, text, color,
      life: 40, maxLife: 40,
      camX: cameraOffset.x, camY: cameraOffset.y,
    });
  }

  drawFloatTexts(camX, camY) {
    const ctx = this.ctx;
    const ts  = this.tileSize;

    for (const ft of this._floatTexts) {
      const alpha = ft.life / ft.maxLife;
      const sx    = (ft.x - camX) * ts + ts / 2;
      const sy    = (ft.y - camY) * ts - (ft.maxLife - ft.life) * 0.6;

      ctx.globalAlpha = alpha;
      ctx.font        = 'bold 14px sans-serif';
      ctx.textAlign   = 'center';
      ctx.fillStyle   = ft.color;
      ctx.strokeStyle = '#000';
      ctx.lineWidth   = 3;
      ctx.strokeText(ft.text, sx, sy);
      ctx.fillText(ft.text, sx, sy);

      ft.life--;
    }
    this._floatTexts = this._floatTexts.filter(f => f.life > 0);
    ctx.globalAlpha = 1;
  }

  // -------------------------------------------------------
  //  ミニマップ描画
  // -------------------------------------------------------
  _drawMinimap(ctx, tiles, exploredSet, visibleSet, player, enemies, items) {
    const mTs = 4; // 1タイルのピクセルサイズ
    const mw = MAP_WIDTH * mTs;
    const mh = MAP_HEIGHT * mTs;
    
    // 右上に配置
    const offsetX = this.canvas.width - mw - 16;
    const offsetY = 16;
    
    // 背景
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(offsetX - 2, offsetY - 2, mw + 4, mh + 4);
    
    for (let ty = 0; ty < MAP_HEIGHT; ty++) {
      for (let tx = 0; tx < MAP_WIDTH; tx++) {
        const key = `${tx},${ty}`;
        if (!exploredSet.has(key)) continue;
        
        const tile = tiles[ty][tx];
        if (tile === TILE.WALL) continue;
        
        let color = '#445';
        if (tile === TILE.FLOOR) color = '#7799cc';
        else if (tile === TILE.CORRIDOR) color = '#5577aa';
        else if (tile === TILE.STAIRS) color = '#ffff00';
        else if (tile === TILE.WATER) color = '#3366ff';
        else if (tile === TILE.DOOR) color = '#aa7744';
        
        ctx.fillStyle = color;
        ctx.fillRect(offsetX + tx * mTs, offsetY + ty * mTs, mTs, mTs);
      }
    }
    
    // アイテム（探索済み）
    ctx.fillStyle = '#22ff22';
    for (const item of items) {
      if (exploredSet.has(`${item.x},${item.y}`)) {
        ctx.fillRect(offsetX + item.x * mTs, offsetY + item.y * mTs, mTs, mTs);
      }
    }
    
    // 敵（可視範囲のみ）
    ctx.fillStyle = '#ff2222';
    for (const enemy of enemies) {
      if (enemy.isDead()) continue;
      if (visibleSet.has(`${enemy.x},${enemy.y}`)) {
        ctx.fillRect(offsetX + enemy.x * mTs, offsetY + enemy.y * mTs, mTs, mTs);
      }
    }
    
    // プレイヤー
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(offsetX + player.x * mTs, offsetY + player.y * mTs, mTs, mTs);
  }

  // -------------------------------------------------------
  //  Canvas サイズ調整
  // -------------------------------------------------------
  resize(w, h) {
    this.canvas.width  = w;
    this.canvas.height = h;
  }
}
