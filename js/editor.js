import { TILE } from './constants.js';
import { ENEMY_DEFS } from './enemy.js';
const $ = id => document.getElementById(id);

let config = {
  dungeon: {},
  characters: { enemies: {} },
  items: {},
  village: {}
};

let villageMap = {
  width: 30, height: 20, tiles: []
};

for (let y = 0; y < villageMap.height; y++) {
  const row = [];
  for (let x = 0; x < villageMap.width; x++) {
    row.push(TILE.VILLAGE_FLOOR);
  }
  villageMap.tiles.push(row);
}

const BRUSHES = [
  { label: '村の床', val: TILE.VILLAGE_FLOOR, type: 'bg' },
  { label: '村の壁', val: TILE.VILLAGE_WALL, type: 'bg' },
  { label: 'ダンジョン入口', val: TILE.DUNGEON_GATE, type: 'npc' },
  { label: '倉庫NPC', val: TILE.NPC_STORAGE, type: 'npc' },
  { label: '銀行NPC', val: TILE.NPC_BANK, type: 'npc' },
  { label: 'お店NPC', val: TILE.NPC_SHOP, type: 'npc' },
  { label: '神社NPC', val: TILE.NPC_SHRINE, type: 'npc' },
];

let currentBrush = TILE.VILLAGE_WALL;
let assetTree = {};

// モーダル用状態
let currentPickerTarget = null;
let currentPickerKind = null;
let loadedPickerImg = null;

async function init() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      $('tab-' + btn.dataset.tab).classList.add('active');
    };
  });

  try {
    const res = await fetch('http://localhost:8081/api/assets');
    if (res.ok) {
      const assets = await res.json();
      assets.forEach(path => {
        const parts = path.split('/');
        if (parts.length >= 3) {
          const folder = parts[1];
          const file = parts.slice(2).join('/');
          if (!assetTree[folder]) assetTree[folder] = [];
          assetTree[folder].push({ path, file });
        }
      });
    }
  } catch(e) { console.warn("Failed to fetch assets list", e); }

  try {
    const res = await fetch('data/assets_config.json');
    if (res.ok) config = await res.json();
  } catch(e) {}
  try {
    const res = await fetch('data/village_map.json');
    if (res.ok) villageMap = await res.json();
  } catch(e) {}

  buildEnemyInputs();
  buildItemInputs();

  initPickerModal();
  bindInputs();
  initVillageEditor();

  $('btn-save').onclick = saveAll;
}

function initPickerModal() {
  const modal = $('picker-modal');
  const folderSel = $('modal-folder-select');
  const imgSel = $('modal-img-select');
  const canvas = $('picker-canvas');
  const ctx = canvas.getContext('2d');
  
  $('btn-close-modal').onclick = () => modal.classList.add('hidden');
  
  Object.keys(assetTree).forEach(folder => {
    folderSel.innerHTML += `<option value="${folder}">${folder}</option>`;
  });
  
  folderSel.onchange = () => {
    const folder = folderSel.value;
    imgSel.innerHTML = '<option value="">--画像--</option>';
    if (folder && assetTree[folder]) {
      assetTree[folder].forEach(item => {
        imgSel.innerHTML += `<option value="${item.path}">${item.file}</option>`;
      });
    }
    loadedPickerImg = null;
    drawPickerCanvas();
  };
  
  imgSel.onchange = () => {
    const path = imgSel.value;
    if (!path) {
      loadedPickerImg = null;
      drawPickerCanvas();
      return;
    }
    const img = new Image();
    img.onload = () => {
      loadedPickerImg = img;
      canvas.width = img.width;
      canvas.height = img.height;
      drawPickerCanvas();
    };
    img.src = path;
  };
  
  function drawPickerCanvas(hoverX = -1, hoverY = -1) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!loadedPickerImg) return;
    
    ctx.drawImage(loadedPickerImg, 0, 0);
    
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.beginPath();
    for (let x = 0; x <= canvas.width; x += 32) {
      ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height);
    }
    for (let y = 0; y <= canvas.height; y += 32) {
      ctx.moveTo(0, y); ctx.lineTo(canvas.width, y);
    }
    ctx.stroke();
    
    if (hoverX >= 0 && hoverY >= 0) {
      ctx.fillStyle = currentPickerKind === 'character' ? 'rgba(255,255,0,0.5)' : 'rgba(255,0,0,0.5)';
      const w = currentPickerKind === 'character' ? 96 : 32;
      const h = currentPickerKind === 'character' ? 128 : 32;
      ctx.fillRect(hoverX * 32, hoverY * 32, w, h);
    }
  }
  
  let hoverX = -1, hoverY = -1;
  canvas.onmousemove = e => {
    const rect = canvas.getBoundingClientRect();
    hoverX = Math.floor((e.clientX - rect.left) / 32);
    hoverY = Math.floor((e.clientY - rect.top) / 32);
    drawPickerCanvas(hoverX, hoverY);
  };
  canvas.onmouseout = () => drawPickerCanvas(-1, -1);
  
  canvas.onclick = () => {
    if (!loadedPickerImg || hoverX < 0 || hoverY < 0) return;
    const path = imgSel.value;
    const sx = hoverX * 32;
    const sy = hoverY * 32;
    
    if (currentPickerTarget) {
      const configObj = { src: path, sx, sy };
      currentPickerTarget.dataset.value = JSON.stringify(configObj);
      updatePickerPreview(currentPickerTarget);
      saveTargetValue(currentPickerTarget.id, configObj);
    }
    modal.classList.add('hidden');
  };
}

function updatePickerPreview(container) {
  const valStr = container.dataset.value;
  let html = `<button class="btn-picker">画像を選択...</button>`;
  if (valStr) {
    const obj = JSON.parse(valStr);
    html += `<div class="picker-preview" style="background-image: url('${obj.src}'); background-position: -${obj.sx}px -${obj.sy}px;"></div>`;
  }
  container.innerHTML = html;
  container.querySelector('.btn-picker').onclick = () => {
    currentPickerTarget = container;
    currentPickerKind = container.dataset.kind;
    $('picker-modal').classList.remove('hidden');
    
    if (valStr) {
      const obj = JSON.parse(valStr);
      const parts = obj.src.split('/');
      if (parts.length >= 3) {
        $('modal-folder-select').value = parts[1];
        $('modal-folder-select').dispatchEvent(new Event('change'));
        $('modal-img-select').value = obj.src;
        $('modal-img-select').dispatchEvent(new Event('change'));
      }
    }
  };
}

function saveTargetValue(id, configObj) {
  if (id.startsWith('dung-')) {
    const k = id.replace('dung-', '');
    config.dungeon[k] = configObj;
  } else if (id === 'char-player') {
    config.characters.player = configObj;
  } else if (id.startsWith('enemy-')) {
    const k = id.replace('enemy-', '');
    if(!config.characters.enemies) config.characters.enemies = {};
    config.characters.enemies[k] = configObj;
  } else if (id.startsWith('item-')) {
    const k = id.replace('item-', '');
    if(!config.items) config.items = {};
    config.items[k] = configObj;
  } else if (id === 'brush-img') {
    const mapKey = getVillageConfigKey(currentBrush);
    if(mapKey) {
      if(!config.village) config.village = {};
      config.village[mapKey] = configObj;
    }
  }
}

function buildEnemyInputs() {
  const list = $('enemy-list');
  ENEMY_DEFS.forEach(def => {
    list.innerHTML += `<label>${def.name}</label><div id="enemy-${def.id}" class="asset-picker" data-kind="character"></div>`;
  });
}

function buildItemInputs() {
  const list = $('item-list');
  const items = ['weapon', 'armor', 'grass', 'scroll', 'staff', 'food', 'pot', 'gold'];
  items.forEach(type => {
    list.innerHTML += `<label>${type}</label><div id="item-${type}" class="asset-picker" data-kind="item"></div>`;
  });
}

function bindInputs() {
  ['floor', 'wall', 'corridor', 'water', 'stairs', 'door', 'trap'].forEach(k => {
    const el = $(`dung-${k}`);
    if(config.dungeon[k]) el.dataset.value = JSON.stringify(config.dungeon[k]);
    updatePickerPreview(el);
  });

  const playerEl = $('char-player');
  if(config.characters.player) playerEl.dataset.value = JSON.stringify(config.characters.player);
  updatePickerPreview(playerEl);

  ENEMY_DEFS.forEach(def => {
    const el = $(`enemy-${def.id}`);
    if(config.characters.enemies && config.characters.enemies[def.id]) {
      el.dataset.value = JSON.stringify(config.characters.enemies[def.id]);
    }
    updatePickerPreview(el);
  });

  const items = ['weapon', 'armor', 'grass', 'scroll', 'staff', 'food', 'pot', 'gold'];
  items.forEach(type => {
    const el = $(`item-${type}`);
    if(config.items && config.items[type]) {
      el.dataset.value = JSON.stringify(config.items[type]);
    }
    updatePickerPreview(el);
  });
}

// ----------------------------------------------------
// 村エディタ
// ----------------------------------------------------
function initVillageEditor() {
  const pBg = $('palette-items');
  const pNpc = $('palette-npcs');
  
  BRUSHES.forEach(b => {
    const d = document.createElement('div');
    d.className = 'palette-item' + (b.val === currentBrush ? ' selected' : '');
    d.textContent = b.label;
    d.onclick = () => {
      document.querySelectorAll('.palette-item').forEach(el => el.classList.remove('selected'));
      d.classList.add('selected');
      currentBrush = b.val;
      updateBrushInput();
    };
    if(b.type === 'bg') pBg.appendChild(d);
    else pNpc.appendChild(d);
  });

  updateBrushInput();

  const canvas = $('village-canvas');
  const ctx = canvas.getContext('2d');
  let isDragging = false;

  const drawMap = () => {
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const ts = 32;

    for (let y = 0; y < villageMap.height; y++) {
      for (let x = 0; x < villageMap.width; x++) {
        const val = villageMap.tiles[y][x];
        
        ctx.fillStyle = '#445';
        if (val === TILE.VILLAGE_FLOOR) ctx.fillStyle = '#565';
        if (val === TILE.VILLAGE_WALL) ctx.fillStyle = '#343';
        if (val === TILE.DUNGEON_GATE) ctx.fillStyle = '#833';
        ctx.fillRect(x*ts, y*ts, ts, ts);
        
        ctx.strokeStyle = '#223';
        ctx.strokeRect(x*ts, y*ts, ts, ts);

        ctx.fillStyle = '#fff';
        ctx.font = '12px sans-serif';
        if (val === TILE.NPC_STORAGE) ctx.fillText('庫', x*ts+ts/4, y*ts+ts/2+4);
        if (val === TILE.NPC_BANK) ctx.fillText('銀', x*ts+ts/4, y*ts+ts/2+4);
        if (val === TILE.NPC_SHOP) ctx.fillText('店', x*ts+ts/4, y*ts+ts/2+4);
        if (val === TILE.NPC_SHRINE) ctx.fillText('神', x*ts+ts/4, y*ts+ts/2+4);
        if (val === TILE.DUNGEON_GATE) ctx.fillText('門', x*ts+ts/4, y*ts+ts/2+4);
      }
    }
  };

  const paint = (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / 32);
    const y = Math.floor((e.clientY - rect.top) / 32);
    if(x >= 0 && x < villageMap.width && y >= 0 && y < villageMap.height) {
      villageMap.tiles[y][x] = currentBrush;
      drawMap();
    }
  };

  canvas.onmousedown = e => { isDragging = true; paint(e); };
  canvas.onmousemove = e => { if(isDragging) paint(e); };
  window.onmouseup = () => isDragging = false;

  drawMap();
}

function getVillageConfigKey(val) {
  switch(val) {
    case TILE.VILLAGE_FLOOR: return 'floor';
    case TILE.VILLAGE_WALL:  return 'wall';
    case TILE.NPC_STORAGE:   return 'storage';
    case TILE.NPC_BANK:      return 'bank';
    case TILE.NPC_SHOP:      return 'shop';
    case TILE.NPC_SHRINE:    return 'shrine';
    case TILE.DUNGEON_GATE:  return 'gate';
  }
  return null;
}

function updateBrushInput() {
  const k = getVillageConfigKey(currentBrush);
  const el = $('brush-img');
  if(config.village && config.village[k]) {
    el.dataset.value = JSON.stringify(config.village[k]);
  } else {
    delete el.dataset.value;
  }
  updatePickerPreview(el);
}

// ----------------------------------------------------
// 保存処理
// ----------------------------------------------------
async function saveAll() {
  try {
    await fetch('http://localhost:8081/api/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: 'assets_config.json', content: config })
    });
    await fetch('http://localhost:8081/api/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: 'village_map.json', content: villageMap })
    });

    const msg = $('save-msg');
    msg.textContent = '保存しました。';
    setTimeout(() => msg.textContent = '', 3000);
  } catch (err) {
    alert('保存に失敗しました。\n' + err);
  }
}

init();
