// ============================================================
//  assets.js  ─  画像および設定ファイルのロード管理
// ============================================================

export const Assets = {
  images: {},
  config: null,
  villageMap: null,
  isLoaded: false,

  /**
   * ゲーム起動時に必要なアセットを全て読み込む
   */
  async loadAll() {
    try {
      // 1. 設定用JSONをロード（ファイルがない場合はデフォルト値を設定）
      try {
        const res = await fetch('data/assets_config.json');
        if (res.ok) this.config = await res.json();
      } catch (e) {
        console.warn('assets_config.json load failed, using defaults.');
      }
      
      try {
        const res = await fetch('data/village_map.json');
        if (res.ok) this.villageMap = await res.json();
      } catch (e) {
        console.warn('village_map.json load failed, using generated map.');
      }

      // デフォルトコンフィグ
      if (!this.config) {
        this.config = {
          dungeon: {}, characters: { enemies: {} }, items: {}, village: {}
        };
      }

      // config内の全画像パスを収集してロード
      const srcsToLoad = new Set();
      const collectSrcs = (obj) => {
        if (!obj) return;
        if (typeof obj === 'string') srcsToLoad.add(obj);
        else if (obj.src) srcsToLoad.add(obj.src);
        else if (typeof obj === 'object') {
          Object.values(obj).forEach(collectSrcs);
        }
      };
      collectSrcs(this.config);
      if (this.villageMap && this.villageMap.customImages) {
        collectSrcs(this.villageMap.customImages);
      }

      const loadPromises = Array.from(srcsToLoad).map(src => this.loadImage(src));
      await Promise.all(loadPromises);

      this.isLoaded = true;
    } catch (err) {
      console.error('Failed to load assets', err);
    }
  },

  /**
   * 画像を非同期で読み込み、キャッシュする
   */
  loadImage(src) {
    if (!src) return Promise.resolve(null);
    if (typeof src === 'object') src = src.src;
    if (!src) return Promise.resolve(null);
    if (this.images[src]) return Promise.resolve(this.images[src]);

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.images[src] = img;
        resolve(img);
      };
      img.onerror = () => {
        console.warn(`Failed to load image: ${src}`);
        resolve(null); // エラー時はnullを返し進行を止めない
      };
      img.src = src;
    });
  },

  /**
   * 指定した画像のインスタンスを取得
   * 引数が {src, sx, sy} のオブジェクトでもそのまま渡せるようにする
   */
  getImage(src) {
    if (!src) return null;
    if (typeof src === 'object') src = src.src;
    return this.images[src] || null;
  }
};
