// ============================================================
//  village.js  ─  村マップの管理
// ============================================================

import { TILE, MAP_WIDTH, MAP_HEIGHT, KEYS } from './constants.js';
import { Player } from './player.js';
import { Renderer } from './renderer.js';
import { Assets } from './assets.js';

export class Village {
  constructor(saveData, canvas, onEnterDungeon, onInteract) {
    this.saveData = saveData;
    this.canvas = canvas;
    this.onEnterDungeon = onEnterDungeon;
    this.onInteract = onInteract;

    this.renderer = new Renderer(canvas);
    this.isVillage = true;

    // プレイヤーの初期化
    this.player = new Player([]);
    this.player.direction = 'DOWN';
    
    // 村のマップ生成
    this.tiles = Array.from({ length: MAP_HEIGHT }, () => Array(MAP_WIDTH).fill(TILE.VILLAGE_FLOOR));
    this._buildMap();

    // イベントバインド
    this._keyHandler = this._handleKey.bind(this);
    window.addEventListener('keydown', this._keyHandler);

    this.draw();
  }

  destroy() {
    window.removeEventListener('keydown', this._keyHandler);
  }

  _buildMap() {
    if (Assets.villageMap && Assets.villageMap.tiles && Assets.villageMap.tiles.length > 0) {
      // JSONマップを使う
      const map = Assets.villageMap;
      for (let y = 0; y < Math.min(MAP_HEIGHT, map.height); y++) {
        for (let x = 0; x < Math.min(MAP_WIDTH, map.width); x++) {
          this.tiles[y][x] = map.tiles[y][x];
        }
      }
      this.player.x = Math.floor(map.width / 2);
      this.player.y = Math.floor(map.height / 2) + 2;
    } else {
      // 枠を壁にする
      for (let y = 0; y < MAP_HEIGHT; y++) {
        for (let x = 0; x < MAP_WIDTH; x++) {
          if (x === 0 || x === MAP_WIDTH - 1 || y === 0 || y === MAP_HEIGHT - 1) {
            this.tiles[y][x] = TILE.VILLAGE_WALL;
          }
        }
      }

      // プレイヤー初期位置
      this.player.x = Math.floor(MAP_WIDTH / 2);
      this.player.y = Math.floor(MAP_HEIGHT / 2) + 2;

      const cx = this.player.x;
      const cy = this.player.y;

      // 施設を配置 (カウンター付き)
      // ガチャ（左）
      this._buildFacility(cx - 8, cy - 2, TILE.NPC_SHRINE);
      // 道具屋（中央寄り）
      this._buildFacility(cx, cy - 4, TILE.NPC_SHOP);
      // 銀行（右）
      this._buildFacility(cx + 8, cy - 2, TILE.NPC_BANK);

      // ダンジョンの入口（上部中央）
      this.tiles[cy - 10][cx - 1] = TILE.DUNGEON_GATE;
      this.tiles[cy - 10][cx]     = TILE.DUNGEON_GATE;
      this.tiles[cy - 10][cx + 1] = TILE.DUNGEON_GATE;
    }
  }

  _buildFacility(x, y, tileType) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) {
          this.tiles[y][x] = tileType; // 店員
        } else if (dy === 1 && dx === 0) {
          this.tiles[y+dy][x+dx] = TILE.VILLAGE_FLOOR; // 前面は開ける
        } else {
          this.tiles[y+dy][x+dx] = TILE.VILLAGE_WALL; // 周囲は壁/机
        }
      }
    }
  }  


  _handleKey(e) {
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
        this._movePlayer(dir);
        return;
      }
    }

    if (KEYS.WAIT.includes(key) || KEYS.WAIT.includes(lKey)) {
      e.preventDefault();
      this._interact();
      return;
    }
  }

  _movePlayer(dir) {
    const dx = dir.includes('LEFT') ? -1 : dir.includes('RIGHT') ? 1 : 0;
    const dy = dir.includes('UP') ? -1 : dir.includes('DOWN') ? 1 : 0;
    
    if (dx < 0) this.player.direction = 'LEFT';
    else if (dx > 0) this.player.direction = 'RIGHT';
    else if (dy < 0) this.player.direction = 'UP';
    else if (dy > 0) this.player.direction = 'DOWN';

    const nx = this.player.x + dx;
    const ny = this.player.y + dy;

    if (nx < 0 || nx >= MAP_WIDTH || ny < 0 || ny >= MAP_HEIGHT) return;

    const tile = this.tiles[ny][nx];

    // 当たり判定
    if (this._isSolid(tile)) {
      return;
    }

    this.player.x = nx;
    this.player.y = ny;
    this.player.animState = (this.player.animState + 1) % 4;

    this.draw();
  }

  _interact() {
    // プレイヤーの周囲8マスをチェックして施設があればインタラクト
    // 向いている方向という概念が今の所ないので周囲すべてを対象にする
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = this.player.x + dx;
        const ny = this.player.y + dy;
        const tile = this.tiles[ny][nx];
        if (this._isFacility(tile)) {
          this.onInteract(tile);
          return;
        }
      }
    }
  }

  _isSolid(tile) {
    return [
      TILE.VILLAGE_WALL, TILE.WALL, TILE.WATER,
      TILE.NPC_STORAGE, TILE.NPC_BANK, TILE.NPC_SHOP, TILE.NPC_SHRINE, TILE.DUNGEON_GATE
    ].includes(tile);
  }

  _isFacility(tile) {
    return [
      TILE.NPC_STORAGE, TILE.NPC_BANK, TILE.NPC_SHOP, TILE.NPC_SHRINE, TILE.DUNGEON_GATE
    ].includes(tile);
  }

  draw() {
    const state = {
      isVillage: true,
      player: this.player,
      tiles: this.tiles,
      enemies: [],
      items: [],
      visibleSet: new Set(),
      exploredSet: new Set()
    };
    this.renderer.draw(state);
  }
}
