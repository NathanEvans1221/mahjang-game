// ===========================================
// Game Module
// 遊戲主邏輯：狀態管理、回合控制
// ===========================================

console.log('[Game] 載入中...');

/**
 * 麻將遊戲模組（ES6 Module）
 */

import { TileSet } from './tiles.js';
import { Player } from './player.js';
import { AIPlayer } from './ai.js';
import { Scoring } from './scoring.js';

console.log('[Game] 載入中...');

    /** @constant {Object} 遊戲狀態列舉 */
    export const GameState = {
        INIT: 'init',
        DEALING: 'dealing',
        PLAYING: 'playing',
        ROUND_END: 'round_end',
        GAME_OVER: 'game_over'
    };

    /** @constant {string[]} 玩家方位 */
    export const PlayerDirection = ['east', 'south', 'west', 'north'];

    /** @constant {Object} 日誌工具 */
    export const Logger = {
        log: (msg, data) => console.log(`[麻將] ${msg}`, data || ''),
        error: (msg, err) => console.error(`[麻將錯誤] ${msg}`, err),
        warn: (msg, data) => console.warn(`[麻將警告] ${msg}`, data || ''),
        info: (msg, data) => console.info(`[麻將資訊] ${msg}`, data || '')
    };

    /** @constant {Object} 各速度檔的 AI/檢查延遲（毫秒） */
    export const GameSpeedDelays = {
        slow: { ai: 900, check: 500, kong: 500 },
        normal: { ai: 500, check: 300, kong: 300 },
        fast: { ai: 150, check: 80, kong: 80 },
    };

    /**
     * 遊戲主類別
     * @class Game
     */
    export class Game {
        /**
         * 建立遊戲實例
         * @constructor
         */
        constructor() {
            Logger.log('初始化遊戲...');
            /** @type {TileSet} 牌組 */
            this.tileSet = null;
            /** @type {Player[]} 玩家陣列 */
            this.players = [];
            /** @type {number} 當前玩家索引 */
            this.currentPlayer = 0;
            /** @type {string} 遊戲狀態 */
            this.state = GameState.INIT;
            /** @type {number} 莊家索引 */
            this.dealer = 0;
            /** @type {number} 連莊數 */
            this.consecutiveWins = 0;
            /** @type {Tile} 最後打出的牌 */
            this.lastDiscard = null;
            /** @type {Tile} 最後摸到的牌 */
            this.lastDraw = null;
            /** @type {Player} 胡牌玩家 */
            this.winner = null;
            /** @type {Object} 使用者設定：速度與動畫 */
            this.settings = { speed: 'normal', animations: true };

            try {
                this.initPlayers();
                this.bindEvents();
                this.loadSettings();
                Logger.log('遊戲初始化完成');
            } catch (err) {
                Logger.error('遊戲初始化失敗', err);
            }
        }

    /**
     * 依目前速度檔取得延遲毫秒數
     * @method getDelay
     * @param {string} kind - ai | check | kong
     */
    getDelay(kind) {
        const speed = (this.settings && this.settings.speed) || 'normal';
        return (GameSpeedDelays[speed] || GameSpeedDelays.normal)[kind];
    }

    /**
     * 載入使用者設定（localStorage），並套用動畫開關
     * @method loadSettings
     */
    loadSettings() {
        try {
            if (typeof localStorage !== 'undefined') {
                const raw = localStorage.getItem('mahjong-settings');
                if (raw) this.settings = { ...this.settings, ...JSON.parse(raw) };
            }
        } catch (err) {
            Logger.warn('載入設定失敗，使用預設值', err);
        }
        this.applyAnimationSetting();
    }

    /**
     * 儲存使用者設定
     * @method saveSettings
     */
    saveSettings() {
        try {
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem('mahjong-settings', JSON.stringify(this.settings));
            }
        } catch (err) {
            Logger.warn('儲存設定失敗', err);
        }
        this.applyAnimationSetting();
    }

    /**
     * 套用動畫開關到 body class
     * @method applyAnimationSetting
     */
    applyAnimationSetting() {
        if (typeof document !== 'undefined' && document.body) {
            document.body.classList.toggle('no-anim', !this.settings.animations);
        }
    }

    /**
     * 開啟設定面板
     * @method openSettings
     */
    openSettings() {
        const modal = document.getElementById('settings-modal');
        const speed = document.getElementById('setting-speed');
        const anim = document.getElementById('setting-anim');
        if (speed) speed.value = this.settings.speed;
        if (anim) anim.checked = this.settings.animations;
        if (modal) modal.classList.remove('hidden');
    }

    /**
     * 關閉設定面板
     * @method closeSettings
     */
    closeSettings() {
        const modal = document.getElementById('settings-modal');
        if (modal) modal.classList.add('hidden');
    }

        /**
         * 初始化玩家
         * @method initPlayers
         */
        initPlayers() {
        this.players = [
            new Player(0, '東家 (你)', true),
            new AIPlayer(1, '南家'),
            new AIPlayer(2, '西家'),
            new AIPlayer(3, '北家')
        ];

        this.players.forEach((p, i) => {
            p.direction = PlayerDirection[i];
            p.isDealer = (i === this.dealer);
        });
        Logger.log('玩家初始化完成', { players: this.players.map(p => p.name) });
    }

    /**
     * 綁定 DOM 事件
     * @method bindEvents
     */
    bindEvents() {
        const newGameBtn = document.getElementById('btn-new-game');
        if (!newGameBtn) {
            Logger.warn('找不到新局按鈕');
        } else {
            newGameBtn.addEventListener('click', () => {
                Logger.log('點擊新局按鈕');
                this.startNewGame();
            });
        }

        const btnIds = ['btn-chow', 'btn-pong', 'btn-kong', 'btn-win'];
        btnIds.forEach(id => {
            const btn = document.getElementById(id);
            if (btn) {
                btn.addEventListener('click', () => {
                    Logger.log(`點擊動作按鈕: ${id}`);
                    this.playerAction(id.replace('btn-', ''));
                });
            } else {
                Logger.warn(`找不到按鈕: ${id}`);
            }
        });

        const settingsBtn = document.getElementById('btn-settings');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => this.openSettings());
        }

        const settingsClose = document.getElementById('settings-close');
        if (settingsClose) {
            settingsClose.addEventListener('click', () => this.closeSettings());
        }

        const speedSelect = document.getElementById('setting-speed');
        if (speedSelect) {
            speedSelect.addEventListener('change', () => {
                this.settings.speed = speedSelect.value;
                this.saveSettings();
                Logger.log(`遊戲速度: ${speedSelect.value}`);
            });
        }

        const animCheck = document.getElementById('setting-anim');
        if (animCheck) {
            animCheck.addEventListener('change', () => {
                this.settings.animations = animCheck.checked;
                this.saveSettings();
                Logger.log(`動畫: ${animCheck.checked ? '開' : '關'}`);
            });
        }

        const modalClose = document.getElementById('modal-close');
        if (modalClose) {
            modalClose.addEventListener('click', () => {
                document.getElementById('modal')?.classList.add('hidden');
            });
        }
    }

    /**
     * 開始新遊戲
     * @method startNewGame
     */
    startNewGame() {
        Logger.log('========== 開始新遊戲 ==========');

        try {
            this.tileSet = new TileSet();
            Logger.log('牌組建立完成', { totalTiles: this.tileSet.tiles.length });

            this.players.forEach(p => p.reset());
            Logger.log('玩家重置完成');

            this.dealer = Math.floor(Math.random() * 4);
            this.currentPlayer = this.dealer;
            this.consecutiveWins = 0;
            this.winner = null;

            Logger.log(`莊家: ${PlayerDirection[this.dealer]} (${this.dealer})`);

            this.players.forEach((p, i) => {
                p.isDealer = (i === this.dealer);
            });

            this.dealTiles();
            this.updateUI();

            this.state = GameState.PLAYING;
            Logger.log('遊戲狀態: PLAYING');
            // 天胡：莊家開局即胡牌（尚未有任何棄牌與副露）
            if (this.players[this.dealer].canWin()) {
                this.handleWin(this.players[this.dealer], null, true);
                return;
            }
            this.playTurn();
        } catch (err) {
            Logger.error('開始新遊戲失敗', err);
        }
    }

    meldTileCount(player) {
        return player.melds.reduce((sum, m) => sum + (m.tiles ? m.tiles.length : 0), 0);
    }

    /**
     * 摸牌（含花牌補牌）：花牌直接入 flowers 並繼續補，直到摸到非花牌或牌牆見底
     * @method drawWithReplacement
     * @param {Player} player - 摸牌玩家
     * @returns {Tile|null} 摸到的非花牌（已加入手牌），牌牆見底則為 null
     */
    drawWithReplacement(player) {
        let guard = 0;
        while (guard++ < 20) {
            const tile = this.tileSet.draw();
            if (!tile) return null;
            if (tile.isFlower()) {
                player.flowers.push(tile);
                Logger.log(`補花: ${player.name} 摸到 ${tile.toString()}，補一張`);
                continue;
            }
            player.drawTile(tile);
            return tile;
        }
        Logger.error('補花次數異常，停止摸牌');
        return null;
    }

    dealTiles() {
        const tilesPerPlayer = 16;

        for (let i = 0; i < tilesPerPlayer; i++) {
            for (let j = 0; j < 4; j++) {
                this.drawWithReplacement(this.players[j]);
            }
        }

        this.drawWithReplacement(this.players[this.dealer]);

        // 發牌結束後重置摸牌旗標：僅手牌已多一張（莊家/補花後）者可直接打牌
        this.players.forEach(p => {
            const total = p.hand.length + this.meldTileCount(p);
            p.hasDrawn = (total % 3 === 2);
        });
        this.lastDiscard = null;
        this.lastDraw = null;

        this.players.forEach(p => p.sortHand());

        Logger.log('發牌完成', {
            remainingTiles: this.tileSet.remaining(),
            playerHands: this.players.map(p => p.hand.length)
        });
    }

    /**
     * 開始回合
     * @method playTurn
     */
    playTurn() {
        const player = this.players[this.currentPlayer];
        Logger.log(`回合開始: ${player.name} (${PlayerDirection[this.currentPlayer]})`);

        if (player.isHuman) {
            // 人類回合：無待處理棄牌時先摸牌（手牌 16→17）；已有 17 張則直接打牌
            if (!this.lastDiscard) {
                const total = player.hand.length + this.meldTileCount(player);
                if (total % 3 === 1) {
                    const drawn = this.drawWithReplacement(player);
                    if (drawn) {
                        this.lastDraw = drawn;
                        player.sortHand();
                        Logger.log(`玩家摸牌: ${drawn.toString()}`);
                    } else {
                        Logger.log('牌牆見底，流局');
                        this.handleDraw();
                        return;
                    }
                } else {
                    player.hasDrawn = true;
                }
            }
            Logger.log('玩家回合，啟用動作按鈕');
            this.updateUI();
            this.enableHumanActions();
        } else {
            Logger.log('AI 回合思考中...');
            this.showLoading();
            setTimeout(() => {
                try {
                    this.aiTurn(player);
                } catch (err) {
                    Logger.error('AI 回合執行失敗', err);
                    this.hideLoading();
                }
            }, this.getDelay('ai'));
        }
    }

    showLoading() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.classList.remove('hidden');
        }
    }

    hideLoading() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.classList.add('hidden');
        }
    }

    /**
     * AI 回合處理
     * @method aiTurn
     * @param {Player} player - AI 玩家
     */
    aiTurn(player) {
        let tile = this.lastDiscard;

        if (tile) {
            // 拿上家棄牌入手再決策；不喊吃碰槓時等同過牌後摸切（張數維持 16/17）
            player.drawTile(tile);
            this.lastDiscard = null;
            tile = tile;
            player.sortHand();
            Logger.log(`AI 取棄牌: ${tile.toString()}`);
        } else {
            const total = player.hand.length + this.meldTileCount(player);
            if (total % 3 === 1) {
                tile = this.drawWithReplacement(player);
                if (!tile) {
                    Logger.log('牌牆見底，流局');
                    this.hideLoading();
                    this.handleDraw();
                    return;
                }
                this.lastDraw = tile;
                player.sortHand();
                Logger.log(`AI 摸牌: ${tile.toString()}`);
            } else {
                // 已多一張（開局莊家 / 吃碰後）：直接決策不再摸牌
                tile = null;
                player.hasDrawn = true;
            }
        }

        try {
            const decision = player.decideAfterDraw(tile, this);
            Logger.log(`AI 決策: ${decision.action}`, decision);
            this.executeAction(player, decision);
            this.hideLoading();
        } catch (err) {
            Logger.error('AI 決策失敗', err);
            this.hideLoading();
        }
    }

    /**
     * 執行玩家決策
     * @method executeAction
     * @param {Player} player - 玩家
     * @param {Object} decision - 決策物件
     */
    executeAction(player, decision) {
        const { action, tile } = decision;
        Logger.log(`執行動作: ${action}`, { player: player.name, tile: tile?.toString() });

        try {
            switch (action) {
                case 'win': {
                    // 放槍（胡上家現打出的棄牌）vs 自摸的區分
                    const isSelf = tile !== this.lastDiscard;
                    this.handleWin(player, tile, isSelf);
                    break;
                }
                case 'kong':
                    this.handleKong(player, tile);
                    break;
                case 'pong':
                    this.handlePong(player, tile);
                    break;
                case 'chow':
                    this.handleChow(player, tile);
                    break;
                case 'discard':
                    this.handleDiscard(player, tile);
                    break;
                default:
                    Logger.warn(`未知動作: ${action}`);
            }
        } catch (err) {
            Logger.error(`玩家動作執行失敗: ${action}`, err);
        }

        this.disableActions();
    }

    disableActions() {
        const btnIds = ['btn-chow', 'btn-pong', 'btn-kong', 'btn-win'];
        btnIds.forEach(id => {
            const btn = document.getElementById(id);
            if (btn) btn.disabled = true;
        });
        Logger.log('動作按鈕已禁用');
    }

    showWinDialog(winnerName, result) {
        Logger.log('顯示胡牌對話框', { winner: winnerName, result });

        const modal = document.getElementById('modal');
        const title = document.getElementById('modal-title');
        const message = document.getElementById('modal-message');

        if (!modal || !title || !message) {
            Logger.error('找不到對話框元素');
            return;
        }

        title.textContent = result.details.includes('流局（牌牆見底）')
            ? `😐 流局`
            : `🎉 ${winnerName} 胡牌!`;
        const detailsHtml = result.details.map(d => `<p>${d}</p>`).join('');
        message.innerHTML = `
            <p><strong>台數: ${result.fans} 台</strong></p>
            <p><strong>分數: ${result.points}</strong></p>
            <hr>
            ${detailsHtml}
        `;

        modal.classList.remove('hidden');
        Logger.log('========== 遊戲結束 ==========');
    }

    /**
     * 更新 UI
     * @method updateUI
     */
    updateUI() {
        try {
            const remaining = this.tileSet.remaining();
            const tileCountEl = document.getElementById('tile-count');
            if (tileCountEl) {
                tileCountEl.textContent = `剩餘牌數: ${remaining}`;
            }

            this.renderPlayers();
        } catch (err) {
            Logger.error('更新UI失敗', err);
        }
    }

    renderPlayers() {
        const board = document.getElementById('game-board');
        if (!board) {
            Logger.error('找不到 game-board 元素');
            return;
        }

        try {
            this.players.forEach((player, index) => {
                let area = document.querySelector(`.player-area.${player.direction}`);

                if (!area) {
                    area = this.createPlayerArea(player);
                    board.appendChild(area);
                }

                this.updatePlayerArea(area, player);
            });
        } catch (err) {
            Logger.error('渲染玩家區域失敗', err);
        }
    }

    handleWin(player, tile, isSelfDraw = true) {
        this.winner = player;
        Logger.log(`🎉 胡牌! 玩家: ${player.name}`, { tile: tile?.toString(), isSelfDraw });

        // 特殊胡情境：開局（無棄牌、無副露）→ 天/地/人胡；牌牆見底 → 海底/河底
        const isOpening = this.getAllDiscards().length === 0 &&
            this.players.every(p => p.melds.length === 0);
        const options = {
            heavenly: isOpening && player.isDealer && isSelfDraw,
            earthly: isOpening && !player.isDealer && isSelfDraw,
            human: isOpening && !isSelfDraw,
            isLastTile: this.tileSet.remaining() === 0,
        };

        const result = Scoring.calculate(
            player,
            player.hand,
            player.melds,
            isSelfDraw,
            player.isDealer,
            this.consecutiveWins,
            player.flowers,
            options
        );

        Logger.log('胡牌結果', result);
        this.showWinDialog(player.name, result);
        this.state = GameState.ROUND_END;
    }

    /**
     * 流局：牌牆見底且無人胡牌，結束本局
     * @method handleDraw
     */
    handleDraw() {
        Logger.log('========== 流局 ==========');
        this.state = GameState.ROUND_END;
        this.showWinDialog('無人', { fans: 0, points: 0, details: ['流局（牌牆見底）'] });
    }

    handleDiscard(player, tile) {
        player.discardTile(tile);
        this.lastDiscard = tile;
        this.lastDraw = null;
        Logger.log(`打牌: ${player.name} 打出 ${tile.toString()}`);

        this.nextPlayer();
        this.updateUI();

        this.checkOtherPlayers();
    }

    checkOtherPlayers() {
        const nextPlayer = this.players[this.currentPlayer];
        Logger.log(`檢查其他玩家: ${nextPlayer.name}`);

        if (nextPlayer.isHuman) {
            // 輪到人類：進入回合，由玩家決定喊吃碰槓胡或點牌過牌摸打
            this.playTurn();
            return;
        }

        setTimeout(() => {
            try {
                const tile = this.lastDiscard;
                Logger.log(`檢查 ${nextPlayer.name} 是否能吃碰槓胡`, { tile: tile?.toString() });

                const decision = nextPlayer.decide(tile, this);
                Logger.log(`${nextPlayer.name} 決策: ${decision.action}`);

                if (decision.action === 'win' || decision.action === 'pong' ||
                    decision.action === 'kong' || decision.action === 'chow') {
                    this.executeAction(nextPlayer, decision);
                } else {
                    this.playTurn();
                }
            } catch (err) {
                Logger.error('檢查其他玩家失敗', err);
                this.playTurn();
            }
        }, this.getDelay('check'));
    }

    handlePong(player, tile) {
        Logger.log(`碰! ${player.name} 碰 ${tile.toString()}`);
        player.removeTile(tile);
        player.removeTile(tile);
        player.addMelds({ type: 'pong', tiles: [tile, tile, tile], from: this.getPrevPlayer(player.id).id });

        this.currentPlayer = player.id;
        this.lastDiscard = null;
        this.lastDraw = null;
        // 碰後不需再摸牌，可直接打牌
        player.hasDrawn = true;

        this.updateUI();
        this.playTurn();
    }

    handleKong(player, tile) {
        Logger.log(`槓! ${player.name} 槓 ${tile.toString()}`);
        player.removeTile(tile);
        player.removeTile(tile);
        player.removeTile(tile);
        player.addMelds({ type: 'kong', tiles: [tile, tile, tile, tile], from: 'self' });

        const kongTile = this.drawWithReplacement(player);
        if (kongTile) {
            Logger.log(`槓後摸牌: ${kongTile.toString()}`);
        }

        player.sortHand();
        this.updateUI();

        this.showLoading();
        setTimeout(() => {
            try {
                const decision = player.decideAfterDraw(kongTile, this);
                this.executeAction(player, decision);
            } catch (err) {
                Logger.error('槓後決策失敗', err);
            } finally {
                this.hideLoading();
            }
        }, this.getDelay('kong'));
    }

    handleChow(player, tile) {
        Logger.log(`吃! ${player.name} 吃 ${tile.toString()}`);
        const pair = player.findChowTiles(tile);
        if (!pair) {
            Logger.warn(`吃牌失敗: ${player.name} 找不到可配對的兩張牌`);
            return;
        }
        player.removeTile(pair[0]);
        player.removeTile(pair[1]);
        player.addMelds({ type: 'chow', tiles: [pair[0], pair[1], tile], from: this.getPrevPlayer(player.id).id });

        this.currentPlayer = player.id;
        this.lastDiscard = null;
        this.lastDraw = null;
        // 吃後不需再摸牌，可直接打牌
        player.hasDrawn = true;

        this.updateUI();
        this.playTurn();
    }

    nextPlayer() {
        const prev = this.currentPlayer;
        this.currentPlayer = (this.currentPlayer + 1) % 4;
        Logger.log(`換下一位玩家: ${PlayerDirection[prev]} -> ${PlayerDirection[this.currentPlayer]}`);
    }

    getPrevPlayer(playerId) {
        return this.players[(playerId + 3) % 4];
    }

    getAllDiscards() {
        const allDiscards = [];
        for (const player of this.players) {
            allDiscards.push(...player.discards);
        }
        return allDiscards;
    }

    enableHumanActions() {
        const tile = this.lastDiscard || this.lastDraw;
        const player = this.players[this.currentPlayer];

        if (!tile) {
            Logger.warn('沒有可用的牌用於動作判斷');
            return;
        }

        Logger.log('檢查玩家可用動作', {
            player: player.name,
            tile: tile.toString(),
            canPong: player.canPong(tile),
            canKong: player.canKong(tile, !!this.lastDraw),
            canChow: player.canChow(tile, this.getPrevPlayer(player.id)?.id),
            canWin: player.canWin(tile)
        });

        const pongBtn = document.getElementById('btn-pong');
        const kongBtn = document.getElementById('btn-kong');
        const chowBtn = document.getElementById('btn-chow');
        const winBtn = document.getElementById('btn-win');

        if (pongBtn) pongBtn.disabled = !player.canPong(tile);
        if (kongBtn) kongBtn.disabled = !player.canKong(tile, !!this.lastDraw);

        const fromPlayer = this.getPrevPlayer(player.id);
        if (chowBtn) chowBtn.disabled = !player.canChow(tile, fromPlayer?.id);

        if (winBtn) winBtn.disabled = !player.canWin(tile);
    }

    playerAction(action) {
        const player = this.players[this.currentPlayer];
        const tile = this.lastDiscard || this.lastDraw;

        Logger.log(`玩家動作: ${action}`, { player: player.name, tile: tile?.toString() });

        try {
            switch (action) {
                case 'pong':
                    this.handlePong(player, tile);
                    break;
                case 'kong':
                    this.handleKong(player, tile);
                    break;
                case 'chow':
                    this.handleChow(player, tile);
                    break;
                case 'win':
                    this.handleWin(player, tile);
                    break;
            }
        } catch (err) {
            Logger.error(`玩家動作執行失敗: ${action}`, err);
        }

        this.disableActions();
    }


    createPlayerArea(player) {
        const template = document.getElementById('tpl-player-area');
        const fragment = template.content.cloneNode(true);
        const area = fragment.querySelector('.player-area');

        area.classList.add(player.direction);
        area.querySelector('.player-name').textContent = player.name;

        return area;
    }

    updatePlayerArea(area, player) {
        const handDiv = area.querySelector('.player-hand');
        const discardsDiv = area.querySelector('.discard-pile');
        const tileTemplate = document.getElementById('tpl-tile');

        handDiv.innerHTML = '';
        player.hand.forEach(tile => {
            const fragment = tileTemplate.content.cloneNode(true);
            const tileEl = fragment.querySelector('.tile');

            if (player.isHuman) {
                tileEl.textContent = tile.toString();
                tileEl.addEventListener('click', () => {
                    // 兩段式出牌：第一下選取（反饋），第二下確認打出
                    if (tileEl.classList.contains('selected')) {
                        this.handleHumanDiscard(tile);
                    } else {
                        handDiv.querySelectorAll('.tile.selected')
                            .forEach(el => el.classList.remove('selected'));
                        tileEl.classList.add('selected');
                    }
                });
            } else {
                tileEl.classList.add('tile-back');
            }
            handDiv.appendChild(tileEl);
        });

        discardsDiv.innerHTML = '';
        player.discards.forEach(tile => {
            const fragment = tileTemplate.content.cloneNode(true);
            const tileEl = fragment.querySelector('.tile');
            tileEl.textContent = tile.toString();
            discardsDiv.appendChild(tileEl);
        });
    }

    handleHumanDiscard(tile) {
        if (this.state !== GameState.PLAYING) return;
        if (this.currentPlayer !== 0) return;

        const player = this.players[0];

        if (!player.hasDrawn) {
            // 尚未摸牌（例如放棄喊吃碰槓、直接點牌）：先視為過牌再摸牌，避免卡死
            this.lastDiscard = null;
            const total = player.hand.length + this.meldTileCount(player);
            if (total % 3 === 1) {
                const drawn = this.drawWithReplacement(player);
                if (!drawn) {
                    this.handleDraw();
                    return;
                }
                this.lastDraw = drawn;
                this.updateUI();
            } else {
                player.hasDrawn = true;
            }
        }

        player.discardTile(tile);
        this.lastDiscard = tile;
        this.lastDraw = null;

        this.updateUI();
        this.nextPlayer();

        this.disableActions();
        this.playTurn();
    }
    } // class Game

// 瀏覽器全域相容（ESM 下仍保留，方便除錯主控台存取）
if (typeof window !== 'undefined') {
    window.Game = Game;
    window.GameState = GameState;
    window.PlayerDirection = PlayerDirection;
    window.Logger = Logger;
}