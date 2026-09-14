# 🀄 mahjang-game｜台灣 16 張麻將網頁版

4 人制台灣麻將（1 位玩家＋3 位 AI），支援完整番型計分、遊戲設定與行動裝置操作。

## 功能

- **完整對局流程**：發牌、花牌補牌、吃碰槓胡、流局判定，莊家輪轉
- **台灣番型計分**：門清、自摸、莊家、連莊、風刻、三元刻（紅中/發財/白板）、大三元/大四喜/小三元/小四喜、清一色/混一色、對對胡/平胡、天胡/地胡/人胡、海底撈月/河底撈魚、花牌
- **AI 對手**：胡牌優先、吃碰評估、孤張字牌優先的棄牌策略
- **設定面板**：遊戲速度三檔、動畫開關（localStorage 記憶）
- **體驗**：兩段式出牌（選取再確認）、響應式牌面、觸控優化

## 快速開始

```bash
npm install
npm run dev      # 開發伺服器（http://localhost:5173）
npm run build    #  production 建置（輸出 dist/）
npm test         # Vitest：62 項測試
```

## 專案結構

```
├── index.html          # 入口（ES 模組載入）
├── js/
│   ├── tiles.js        # 牌組：144 張、洗牌、發牌
│   ├── player.js       # 玩家：手牌管理、吃碰槓胡判定（台灣 17 張胡牌型）
│   ├── ai.js           # AI 決策邏輯
│   ├── scoring.js      # 台數計算
│   ├── game.js         # 對局主流程、回合控制、設定
│   └── app.js          # 啟動入口
├── css/style.css       # 樣式（含 RWD 斷點）
├── tests/              # Vitest 測試（tiles/player/ai/scoring/game）
└── CHANGELOG.md        # 變更日誌
```

## 技術棧

Vite 6、原生 ES6 Modules、Vitest、無框架依賴。

## 狀態

- 測試：62 項全綠
- Issues #1–#5 已全數完成關閉
- 詳細變更見 [CHANGELOG.md](CHANGELOG.md)
