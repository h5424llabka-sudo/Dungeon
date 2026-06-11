// ============================================================
//  dungeon.js  ─  BSP法によるダンジョン生成
// ============================================================

import { TILE, MAP_WIDTH, MAP_HEIGHT, BOSS_FLOORS } from './constants.js';

// -------------------------------------------------------
// BSPノード
// -------------------------------------------------------
class BSPNode {
  constructor(x, y, w, h) {
    this.x = x; this.y = y;
    this.w = w; this.h = h;
    this.left  = null;
    this.right = null;
    this.room  = null; // { x, y, w, h }
  }
}

const MIN_ROOM_SIZE  = 5;
const MIN_LEAF_SIZE  = MIN_ROOM_SIZE + 2;
const SPLIT_RATIO_MIN = 0.35;
const SPLIT_RATIO_MAX = 0.65;

function splitNode(node, depth = 0) {
  if (depth > 6) return;

  const canSplitH = node.h >= MIN_LEAF_SIZE * 2;
  const canSplitV = node.w >= MIN_LEAF_SIZE * 2;
  if (!canSplitH && !canSplitV) return;

  const splitH = canSplitH && (!canSplitV || Math.random() < 0.5);

  if (splitH) {
    const ratio = SPLIT_RATIO_MIN + Math.random() * (SPLIT_RATIO_MAX - SPLIT_RATIO_MIN);
    const splitY = Math.floor(node.h * ratio);
    node.left  = new BSPNode(node.x, node.y,          node.w, splitY);
    node.right = new BSPNode(node.x, node.y + splitY, node.w, node.h - splitY);
  } else {
    const ratio = SPLIT_RATIO_MIN + Math.random() * (SPLIT_RATIO_MAX - SPLIT_RATIO_MIN);
    const splitX = Math.floor(node.w * ratio);
    node.left  = new BSPNode(node.x,          node.y, splitX,          node.h);
    node.right = new BSPNode(node.x + splitX, node.y, node.w - splitX, node.h);
  }

  splitNode(node.left,  depth + 1);
  splitNode(node.right, depth + 1);
}

function placeRooms(node, rooms) {
  if (!node.left && !node.right) {
    // 葉ノードに部屋を配置
    const rw = MIN_ROOM_SIZE + Math.floor(Math.random() * Math.max(1, node.w - MIN_ROOM_SIZE - 2));
    const rh = MIN_ROOM_SIZE + Math.floor(Math.random() * Math.max(1, node.h - MIN_ROOM_SIZE - 2));
    const rx = node.x + 1 + Math.floor(Math.random() * Math.max(1, node.w - rw - 1));
    const ry = node.y + 1 + Math.floor(Math.random() * Math.max(1, node.h - rh - 1));
    node.room = { x: rx, y: ry, w: rw, h: rh };
    rooms.push(node.room);
    return node.room;
  }

  const leftRoom  = node.left  ? placeRooms(node.left,  rooms) : null;
  const rightRoom = node.right ? placeRooms(node.right, rooms) : null;

  // 兄弟部屋の中心同士を通路でつなぐ
  if (leftRoom && rightRoom) {
    node.corridors = [{ from: leftRoom, to: rightRoom }];
  }
  return leftRoom || rightRoom;
}

function collectCorridors(node, list) {
  if (!node) return;
  if (node.corridors) list.push(...node.corridors);
  collectCorridors(node.left,  list);
  collectCorridors(node.right, list);
}

function carveCorridor(tiles, x1, y1, x2, y2) {
  // L字通路（水平→垂直）
  let cx = x1, cy = y1;
  while (cx !== x2) {
    if (tiles[cy][cx] === TILE.WALL) tiles[cy][cx] = TILE.CORRIDOR;
    cx += cx < x2 ? 1 : -1;
  }
  while (cy !== y2) {
    if (tiles[cy][cx] === TILE.WALL) tiles[cy][cx] = TILE.CORRIDOR;
    cy += cy < y2 ? 1 : -1;
  }
}

function roomCenter(room) {
  return {
    x: Math.floor(room.x + room.w / 2),
    y: Math.floor(room.y + room.h / 2),
  };
}

// -------------------------------------------------------
// ダンジョン生成
// -------------------------------------------------------

/**
 * フロアのタイルマップと諸情報を生成する
 * @param {number} floor - 現在のフロア番号（1始まり）
 * @returns {{
 *   tiles: number[][],
 *   rooms: object[],
 *   playerStart: {x,y},
 *   stairsPos: {x,y},
 *   enemySpawns: {x,y}[],
 *   itemSpawns: {x,y}[],
 * }}
 */
export function generateFloor(floor) {
  // タイルマップを壁で初期化
  const tiles = Array.from({ length: MAP_HEIGHT }, () =>
    new Array(MAP_WIDTH).fill(TILE.WALL)
  );

  // BSP生成
  const root  = new BSPNode(0, 0, MAP_WIDTH, MAP_HEIGHT);
  splitNode(root);
  const rooms = [];
  placeRooms(root, rooms);

  // 部屋を床として描画
  for (const room of rooms) {
    for (let ry = room.y; ry < room.y + room.h; ry++) {
      for (let rx = room.x; rx < room.x + room.w; rx++) {
        if (ry >= 0 && ry < MAP_HEIGHT && rx >= 0 && rx < MAP_WIDTH) {
          tiles[ry][rx] = TILE.FLOOR;
        }
      }
    }
  }

  // 通路を彫る
  const corridors = [];
  collectCorridors(root, corridors);
  for (const { from, to } of corridors) {
    const c1 = roomCenter(from);
    const c2 = roomCenter(to);
    carveCorridor(tiles, c1.x, c1.y, c2.x, c2.y);
  }

  // 出口（階段）を最後の部屋に配置
  shuffle(rooms);
  const stairsRoom = rooms[rooms.length - 1];
  const stairsPos  = roomCenter(stairsRoom);
  tiles[stairsPos.y][stairsPos.x] = TILE.STAIRS;

  // プレイヤースタート（最初の部屋の中心）
  const startRoom   = rooms[0];
  const playerStart = roomCenter(startRoom);

  // 敵スポーン位置（各部屋にランダム数）
  const enemySpawns = [];
  const itemSpawns  = [];
  const isBoss = BOSS_FLOORS.includes(floor);

  for (let i = 1; i < rooms.length; i++) {
    const room = rooms[i];
    // 敵：部屋ごとに1〜2体（ボスフロアは最後の部屋にボス1体）
    if (isBoss && i === rooms.length - 1) {
      enemySpawns.push({ ...roomCenter(room), isBoss: true });
    } else {
      const count = 1 + Math.floor(Math.random() * 2);
      for (let k = 0; k < count; k++) {
        enemySpawns.push(randomFloorInRoom(room, tiles));
      }
    }
    // アイテム：3部屋に1個程度
    if (Math.random() < 0.35) {
      itemSpawns.push(randomFloorInRoom(room, tiles));
    }
  }

  // 罠を床にランダム配置（フロアが深いほど多い）
  const trapCount = Math.floor(floor * 0.5) + 2;
  for (let t = 0; t < trapCount; t++) {
    const rx = 1 + Math.floor(Math.random() * (MAP_WIDTH  - 2));
    const ry = 1 + Math.floor(Math.random() * (MAP_HEIGHT - 2));
    if (tiles[ry][rx] === TILE.FLOOR) tiles[ry][rx] = TILE.TRAP;
  }

  return { tiles, rooms, playerStart, stairsPos, enemySpawns, itemSpawns };
}

function randomFloorInRoom(room, tiles) {
  for (let attempt = 0; attempt < 20; attempt++) {
    const rx = room.x + Math.floor(Math.random() * room.w);
    const ry = room.y + Math.floor(Math.random() * room.h);
    if (tiles[ry][rx] === TILE.FLOOR) return { x: rx, y: ry };
  }
  return roomCenter(room);
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

// -------------------------------------------------------
// 視野計算（簡易ロス・カスティング）
// -------------------------------------------------------

/**
 * プレイヤー位置から視野内タイルを計算する
 * @param {number[][]} tiles
 * @param {number} px - プレイヤーX
 * @param {number} py - プレイヤーY
 * @param {number} radius - 視野半径
 * @returns {Set<string>} "x,y" の文字列集合
 */
export function computeFOV(tiles, px, py, radius) {
  const visible = new Set();
  visible.add(`${px},${py}`);

  const ANGLES = 360;
  for (let a = 0; a < ANGLES; a++) {
    const rad = (a / ANGLES) * Math.PI * 2;
    let rx = px + 0.5, ry = py + 0.5;
    const dx = Math.cos(rad), dy = Math.sin(rad);

    for (let step = 0; step < radius; step++) {
      rx += dx; ry += dy;
      const tx = Math.floor(rx), ty = Math.floor(ry);
      if (tx < 0 || tx >= MAP_WIDTH || ty < 0 || ty >= MAP_HEIGHT) break;
      visible.add(`${tx},${ty}`);
      if (tiles[ty][tx] === TILE.WALL) break;
    }
  }
  return visible;
}

export function isWalkable(tiles, x, y) {
  if (x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT) return false;
  const t = tiles[y][x];
  return t !== TILE.WALL;
}
