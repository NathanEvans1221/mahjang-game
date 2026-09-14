# Mahjong UI 優化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 四方桌版面、質感視覺與動效上線，62 項既有測試全綠。

**Architecture:** 只改 `renderPlayers`／`updatePlayerArea` 的 DOM 結構與 `index.html` 容器，新增 CSS 區段；遊戲流程、判定、計分零變更。結構測試沿用既有 stub 模式。

**Tech Stack:** 原生 ES6 Modules、純 CSS、Vitest（node environment＋DOM stub）。

---

### Task 1：中央資訊區＋計分條

**Files:**
- Modify: `index.html`（`#game-board` 內新增 `#table-center`、header 下新增 `#score-bar`）
- Modify: `js/game.js`（新增 `renderTableCenter()`、`renderScoreBar()`，在 `updateUI()` 內呼叫）
- Test: `tests/game.test.js`（stub 斷言節點生成）

- [ ] **Step 1: Write the failing test**

```js
it('中央資訊區與計分條節點生成', () => {
  const g = new Game();
  g.startNewGame();
  const seen = [];
  globalThis.document.querySelector = (sel) => {
    seen.push(sel);
    return null;
  };
  g.renderTableCenter();
  g.renderScoreBar();
  expect(seen).toContain('#table-center');
  expect(seen).toContain('#score-bar');
});
```

注意：此測試會覆寫全域 `document.querySelector`，結尾必須恢復原 stub。
在測試檔頂部保留 `const origQuery = globalThis.document.querySelector` 並在測試後還原。

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/game.test.js`
Expected: FAIL with "g.renderTableCenter is not a function"

- [ ] **Step 3: Write minimal implementation**

`index.html` 在 `<main id="game-board">` 內新增：

```html
<div id="table-center">
    <span id="center-tiles"></span>
    <span id="center-turn"></span>
</div>
```

header 內新增：

```html
<div id="score-bar"></div>
```

`js/game.js` 新增方法（放在 `renderPlayers` 之前）：

```js
renderTableCenter() {
    const center = document.querySelector('#table-center');
    if (!center) return;
    const tiles = document.querySelector('#center-tiles');
    if (tiles) tiles.textContent = `剩餘牌數: ${this.tileSet.remaining()}`;
    const turn = document.querySelector('#center-turn');
    if (turn) {
        const p = this.players[this.currentPlayer];
        turn.textContent = `輪到：${p.name}${p.isDealer ? '（莊）' : ''}`;
    }
}

renderScoreBar() {
    const bar = document.querySelector('#score-bar');
    if (!bar) return;
    bar.textContent = this.players.map(p => p.name).join('｜');
}
```

並在 `updateUI()` 內 `this.renderPlayers()` 之後呼叫兩者。

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/game.test.js`
Expected: PASS（全檔）

- [ ] **Step 5: Commit**

```bash
git add index.html js/game.js tests/game.test.js
git commit -m "feat(ui): 新增中央資訊區與計分條"
```

---

### Task 2：四方桌座位容器

**Files:**
- Modify: `js/game.js`（重寫 `renderPlayers` 為桌位結構，`createPlayerArea` 加座位 class）
- Test: `tests/game.test.js`（座位 class 斷言）

- [ ] **Step 1: Write the failing test**

```js
it('玩家區帶方位座位 class', () => {
  const g = new Game();
  g.startNewGame();
  const added = [];
  const fakeArea = {
    classList: { add: (c) => added.push(c) },
    querySelector: () => ({ textContent: '' }),
  };
  const tpl = {
    content: { cloneNode: () => ({ querySelector: () => fakeArea }) },
  };
  const origGet = globalThis.document.getElementById;
  globalThis.document.getElementById = (id) =>
    id === 'tpl-player-area' ? tpl : origGet(id);
  const area = g.createPlayerArea(g.players[0]);
  globalThis.document.getElementById = origGet;
  expect(added).toContain('table-seat');
  expect(added).toContain('east');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/game.test.js`
Expected: FAIL（`added` 缺 `table-seat`）

- [ ] **Step 3: Write minimal implementation**

`createPlayerArea` 內 `area.classList.add(player.direction)` 之前加：

```js
area.classList.add('table-seat');
```

`renderPlayers` 改為依固定座位順序渲染（south/east/north/west 順序對應 index 0/1/2/3
以外的顯示順序不變，僅容器改用 `.table-seat` 定位；桌位 CSS 由 Task 4 提供，
本任務只保證 class 正確）。

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/game.test.js`
Expected: PASS（全檔）

- [ ] **Step 5: Commit**

```bash
git add js/game.js tests/game.test.js
git commit -m "feat(ui): 玩家區改為四方桌座位容器"
```

---

### Task 3：副露區渲染

**Files:**
- Modify: `js/game.js`（`updatePlayerArea` 新增 `.meld-area` 渲染）
- Modify: `index.html`（`#tpl-player-area` 新增 `<div class="meld-area"></div>`）
- Test: `tests/game.test.js`（吃/碰/槓副露各一）

- [ ] **Step 1: Write the failing test**

```js
it('副露區渲染吃碰槓', () => {
  const g = new Game();
  g.startNewGame();
  const appended = [];
  const meldDiv = { innerHTML: '', appendChild: (el) => appended.push(el) };
  const area = {
    querySelector: (sel) => {
      if (sel === '.meld-area') return meldDiv;
      return { innerHTML: '', appendChild: () => {} };
    },
  };
  const tileTpl = { content: { cloneNode: () => ({ querySelector: () => ({ textContent: '' }) }) } };
  const origGet = globalThis.document.getElementById;
  globalThis.document.getElementById = (id) =>
    id === 'tpl-tile' ? tileTpl : origGet(id);
  const { Tile } = await import('../js/tiles.js'); // 檔頂已靜態 import，本行改為直接使用 Tile
  const p = g.players[1];
  p.melds = [
    { type: 'chow', tiles: [new Tile('wan', 1), new Tile('wan', 2), new Tile('wan', 3)] },
    { type: 'pong', tiles: [new Tile('tong', 5), new Tile('tong', 5), new Tile('tong', 5)] },
    { type: 'kong', tiles: [new Tile('zi', 'zhong'), new Tile('zi', 'zhong'), new Tile('zi', 'zhong'), new Tile('zi', 'zhong')] },
  ];
  g.updatePlayerArea(area, p);
  globalThis.document.getElementById = origGet;
  expect(appended.length).toBe(3 + 3 + 4);
});
```

注意：`tests/game.test.js` 檔頂已有 `import { Tile } from '../js/tiles.js'`，
測試內直接使用 `Tile`，不可再寫動態 import。

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/game.test.js`
Expected: FAIL（`appended.length` 為 0，`.meld-area` 未被查詢）

- [ ] **Step 3: Write minimal implementation**

`index.html` 的 `#tpl-player-area` 新增：

```html
<div class="meld-area"></div>
```

`updatePlayerArea` 在棄牌區渲染之後新增：

```js
const meldDiv = area.querySelector('.meld-area');
if (meldDiv) {
    meldDiv.innerHTML = '';
    player.melds.forEach(meld => {
        meld.tiles.forEach(tile => {
            const fragment = tileTemplate.content.cloneNode(true);
            const tileEl = fragment.querySelector('.tile');
            tileEl.textContent = tile.toString();
            tileEl.classList.add('tile-meld');
            meldDiv.appendChild(tileEl);
        });
    });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/game.test.js`
Expected: PASS（全檔）

- [ ] **Step 5: Commit**

```bash
git add index.html js/game.js tests/game.test.js
git commit -m "feat(ui): 新增副露區渲染"
```

---

### Task 4：視覺風格 CSS

**Files:**
- Modify: `css/style.css`（新增桌位、中央區、計分條、牌面質感、花色配色、牌背）

- [ ] **Step 1: Write the styles**

```css
:root {
    --felt: #0B5D3B;
    --felt-dark: #08422A;
    --tile-face: #FFFDF5;
    --suit-tiao: #1B7A3D;
    --suit-tong: #1D4ED8;
}

/* 桌面 */
#game-board {
    background: radial-gradient(circle at 50% 40%, var(--felt), var(--felt-dark));
}

/* 桌位 */
.table-seat { padding: 0.5rem; border-radius: 8px; }
.table-seat.south { text-align: center; }
.table-seat.north { text-align: center; }

/* 中央區與計分條 */
#table-center { text-align: center; color: #fff; padding: 0.5rem; }
#score-bar { color: #fff; font-size: 0.9rem; }

/* 牌面質感 */
.tile {
    background: linear-gradient(180deg, #ffffff 0%, var(--tile-face) 70%, #E8E0C8 100%);
    box-shadow: 0 2px 0 #B9AE8E, 0 4px 6px rgba(0,0,0,0.35);
}

/* 花色配色（JS 需配合加 data-suit，見 Step 3 備註） */
.tile[data-suit="tiao"] { color: var(--suit-tiao); }
.tile[data-suit="tong"] { color: var(--suit-tong); }

/* 牌背菱格紋 */
.tile-back {
    background:
        repeating-linear-gradient(45deg, #324A5F 0 6px, #3D5A75 6px 12px);
}

/* 副露橫置 */
.tile-meld { transform: rotate(0); opacity: 0.95; }
```

備註：花色配色依賴 `data-suit` 屬性，需在 `updatePlayerArea` 與副露渲染設定
`tileEl.dataset.suit = tile.type`（wan 不設，保持墨黑）。此為同一任務的 JS 微調，
連同 CSS 一起提交。

- [ ] **Step 2: Build to verify CSS bundles**

Run: `npm run build`
Expected: 成功，`dist/assets/*.css` 產出

- [ ] **Step 3: Commit**

```bash
git add css/style.css js/game.js
git commit -m "feat(ui): 桌感視覺風格與花色配色"
```

---

### Task 5：動效與 RWD 擴充

**Files:**
- Modify: `css/style.css`（keyframes、出牌位移、摸牌高亮、按鈕呼吸、胡牌彈出、no-anim 擴充、RWD）

- [ ] **Step 1: Write the styles**

```css
/* 出牌滑入 */
@keyframes tile-in {
    from { transform: translateY(-10px); opacity: 0.3; }
    to { transform: translateY(0); opacity: 1; }
}
.discard-pile .tile:last-child { animation: tile-in 0.25s ease-out; }

/* 摸牌高亮 */
@keyframes draw-flash {
    0% { outline: 3px solid var(--gold); }
    100% { outline: 3px solid transparent; }
}
.tile-just-drawn { animation: draw-flash 0.8s ease-out 1; }

/* 可行動按鈕呼吸燈 */
@keyframes btn-breathe {
    0%, 100% { box-shadow: 0 0 0 rgba(232,170,66,0); }
    50% { box-shadow: 0 0 12px rgba(232,170,66,0.9); }
}
.action-btn:not(:disabled) { animation: btn-breathe 1.6s ease-in-out infinite; }

/* 胡牌彈出 */
@keyframes win-pop {
    from { transform: scale(0.8); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
}
.modal:not(.hidden) .modal-content { animation: win-pop 0.3s ease-out; }

/* 動畫開關擴充 */
body.no-anim .discard-pile .tile:last-child,
body.no-anim .tile-just-drawn,
body.no-anim .action-btn:not(:disabled),
body.no-anim .modal:not(.hidden) .modal-content { animation: none; }

/* RWD：小牌面橫滑 */
@media (max-width: 640px) {
    .table-seat.south .player-hand {
        display: flex;
        overflow-x: auto;
        padding-bottom: 0.25rem;
    }
}
```

`tile-just-drawn` 由 JS 在人類摸牌與 AI 摸牌後對新牌節點加一次 class
（`updatePlayerArea` 重繪時自然清除，无需額外清理邏輯；本任務含此兩處各一行）：
人類：`playTurn` 人類摸牌分支 `this.lastDrawTileEl` 機制過於複雜，簡化為
在 `updatePlayerArea` 對 `this.lastDraw` 對應的第一張相同牌加 class。
實作：渲染人類手牌時，若 `this.lastDraw && tile.equals(this.lastDraw)` 且尚未加過，
加 `tile-just-drawn` 並將 `this.lastDrawMarked = true`；`handleHumanDiscard` 內重置為 false。

- [ ] **Step 2: Run full verification**

Run: `npm test`（全綠）、`npm run build`（成功）、`git diff --check`（乾淨）
Expected: 全部通過

- [ ] **Step 3: Commit**

```bash
git add css/style.css js/game.js
git commit -m "feat(ui): 出牌摸牌動效與 RWD 擴充"
```

---

### Task 6：驗收與收尾

- [ ] **Step 1: Full test suite**

Run: `npm test`
Expected: 全部 PASS（含新增 4 項：中央區、座位 class、副露渲染）

- [ ] **Step 2: 手動驗收**

Run: `npm run dev`，開啟 http://localhost:5173/
檢查：四方桌方位正確、南家兩段式出牌、吃碰槓副露顯示、設定面板速度/動畫生效、
手機寬度（DevTools 390px）手牌可橫滑出牌

- [ ] **Step 3: 更新 CHANGELOG**

`CHANGELOG.md` 的 `[Unreleased]` 下新增：

```markdown
### 新增
- 四方桌版面：方位座位、中央資訊區、計分條、副露區
- 桌感視覺：氈面桌面、質感牌面、花色配色、牌背紋路
- 動效：出牌滑入、摸牌高亮、按鈕呼吸、胡牌彈出（受動畫開關控制）
```

```bash
git add CHANGELOG.md
git commit -m "docs(changelog): UI 優化驗收收尾"
```
