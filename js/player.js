// ===========================================
// Player Module
// 玩家類別：手牌管理、吃碰槓胡判斷
// ===========================================

import { Tile, TileType } from './tiles.js';

export class Player {
    constructor(id, name, isHuman = false) {
        this.id = id;
        this.name = name;
        this.isHuman = isHuman;
        this.hand = [];
        this.melds = [];
        this.discards = [];
        this.flowers = [];
        this.isReady = false;
        this.hasDrawn = false;
    }

    drawTile(tile) {
        this.hand.push(tile);
        this.hasDrawn = true;
    }

    sortHand() {
        const order = { wan: 0, tiao: 1, tong: 2, zi: 3, hua: 4 };
        this.hand.sort((a, b) => {
            if (order[a.type] !== order[b.type]) {
                return order[a.type] - order[b.type];
            }
            return a.value - b.value;
        });
    }

    removeTile(tile) {
        const idx = this.hand.findIndex(t => t.equals(tile));
        if (idx !== -1) {
            this.hand.splice(idx, 1);
            return true;
        }
        return false;
    }

    discardTile(tile) {
        if (this.removeTile(tile)) {
            this.discards.push(tile);
            this.hasDrawn = false;
            return true;
        }
        return false;
    }

    addMelds(meld) {
        this.melds.push(meld);
    }

    getMelds() {
        return this.melds;
    }

    canPong(tile) {
        if (!tile) return false;
        return this.hand.filter(t => t.equals(tile)).length >= 2;
    }

    canChow(tile, fromPlayer) {
        if (!tile) return false;
        const fromId = (fromPlayer && typeof fromPlayer === 'object' && 'id' in fromPlayer)
            ? fromPlayer.id
            : fromPlayer;
        if (fromId === undefined || fromId === null) return false;
        // 吃僅能吃「上家」的棄牌：上家座位 = (自己 - 1 + 4) % 4
        if ((this.id + 3) % 4 !== fromId) return false;
        
        const handValues = this.hand
            .filter(t => t.type === tile.type && t.type !== TileType.ZI && t.type !== TileType.HUA)
            .map(t => t.value)
            .sort((a, b) => a - b);

        const target = tile.value;
        
        for (let i = 0; i < handValues.length - 1; i++) {
            const v1 = handValues[i];
            if (v1 >= target) continue;
            
            for (let j = i + 1; j < handValues.length; j++) {
                const v2 = handValues[j];
                if (v2 >= target || v2 <= v1) continue;
                
                if ((v1 + v2 + target) % 3 === 0) {
                    const diff1 = target - v1;
                    const diff2 = target - v2;
                    if (diff1 <= 2 && diff2 <= 2 && diff1 > 0 && diff2 > 0) {
                        return true;
                    }
                }
            }
        }
        
        return false;
    }

    /**
     * 找出手牌中可與棄牌組成順子的兩張牌（供 handleChow 實際移除手牌用）
     * @param {Tile} tile - 上家棄牌
     * @returns {Tile[]|null} 手牌中的兩張牌，無法組成則為 null
     */
    findChowTiles(tile) {
        if (!tile || tile.type === TileType.ZI || tile.type === TileType.HUA) return null;

        for (let start = tile.value - 2; start <= tile.value; start++) {
            if (start < 1 || start + 2 > 9) continue;

            const need = [start, start + 1, start + 2];
            const picked = [];
            let coveredCurrent = false;
            let ok = true;

            for (const v of need) {
                if (v === tile.value && !coveredCurrent) {
                    coveredCurrent = true;
                    continue;
                }
                const found = this.hand.find(t =>
                    t.type === tile.type && t.value === v &&
                    !picked.includes(t));
                if (!found) { ok = false; break; }
                picked.push(found);
            }

            if (ok && picked.length === 2) return picked;
        }

        return null;
    }

    canKong(tile, isDrawn = false) {
        if (!tile) return false;
        const count = this.hand.filter(t => t.equals(tile)).length;
        
        if (isDrawn) {
            return count === 3;
        }
        return count === 3 || count === 4;
    }

    canWin(tile, melds = this.melds) {
        const testHand = [...this.hand];
        if (tile) {
            testHand.push(tile);
        }

        return this.checkWin(testHand, melds);
    }

    checkWin(hand, melds = this.melds) {
        const meldList = melds || [];
        const meldTileCount = meldList.reduce(
            (sum, m) => sum + (m.tiles ? m.tiles.length : 0), 0);
        const neededGroups = 5 - meldList.length;
        if (neededGroups < 0) return false;

        const nonFlowers = hand.filter(t => !t.isFlower());
        if (nonFlowers.length + meldTileCount !== 17) return false;

        const sorted = [...nonFlowers].sort((a, b) => {
            if (a.type !== b.type) return a.type < b.type ? -1 : 1;
            if (a.value === b.value) return 0;
            return a.value < b.value ? -1 : 1;
        });

        return this.tryWin(sorted, 0, [], null, neededGroups);
    }

    tryWin(tiles, index, groups, eye, neededGroups = 5) {
        // 相容舊簽章：內部一律轉為共用核心 dfsGroups（回傳結構，null 表示無解）
        const res = this.dfsGroups(tiles.slice(index), [...groups], eye || null, neededGroups);
        return res !== null;
    }

    /**
     * 胡牌結構搜尋共用核心：回溯拆解手牌為順子/刻子/槓子 + 一對眼
     * @param {Tile[]} rest - 剩餘待拆解牌（已排序）
     * @param {Object[]} groups - 已拆出面子（不含眼）
     * @param {Tile|null} eye - 已決定的眼
     * @param {number} needed - 所需面子數（5 - 副露數）
     * @returns {{groups:Object[],eye:Tile}|null} 成功回傳結構，失敗回傳 null
     */
    dfsGroups(rest, groups, eye, needed) {
        if (rest.length === 0) {
            return (groups.length === needed && eye !== null) ? { groups, eye } : null;
        }

        const tile = rest[0];

        if (!eye) {
            const pairIdx = rest.findIndex((t, idx) => idx > 0 && t.equals(tile));
            if (pairIdx !== -1) {
                // 注意：將眼不計入 groups，否則完成條件永不成立
                const hit = this.dfsGroups(
                    rest.filter((t, i) => i !== 0 && i !== pairIdx), groups, tile, needed);
                if (hit) return hit;
            }
        }

        // 槓子（暗槓：手牌四張相同）
        if (rest.length >= 4 && rest[1].equals(tile) && rest[2].equals(tile) && rest[3].equals(tile)) {
            const hit = this.dfsGroups(
                rest.slice(4), [...groups, { type: 'kong', tiles: [tile, tile, tile, tile] }], eye, needed);
            if (hit) return hit;
        }

        // 刻子
        if (rest.length >= 3 && rest[1].equals(tile) && rest[2].equals(tile)) {
            const hit = this.dfsGroups(
                rest.slice(3), [...groups, { type: 'pong', tiles: [tile, tile, tile] }], eye, needed);
            if (hit) return hit;
        }

        if (tile.type !== TileType.ZI && tile.type !== TileType.HUA) {
            // 找出所有包含 tile 的順子 (start, start+1, start+2)，tile 可為頭、中、尾
            for (let start = tile.value - 2; start <= tile.value; start++) {
                if (start < 1 || start + 2 > 9) continue;

                const need = [start, start + 1, start + 2];
                const usedIdx = [];
                let coveredCurrent = false;
                let ok = true;

                for (const v of need) {
                    if (v === tile.value && !coveredCurrent) {
                        coveredCurrent = true;
                        continue;
                    }
                    const found = rest.findIndex((t, idx) =>
                        idx !== 0 && !usedIdx.includes(idx) &&
                        t.type === tile.type && t.value === v);
                    if (found === -1) { ok = false; break; }
                    usedIdx.push(found);
                }

                if (ok) {
                    const removeSet = new Set([0, ...usedIdx]);
                    const chowTiles = [tile, ...usedIdx.map(i => rest[i])];
                    const hit = this.dfsGroups(
                        rest.filter((t, idx) => !removeSet.has(idx)),
                        [...groups, { type: 'chow', tiles: chowTiles }], eye, needed);
                    if (hit) return hit;
                }
            }
        }

        return null;
    }

    /**
     * 找出胡牌的完整結構（手牌面子 + 眼，並附上副露）
     * @param {Tile[]} [hand=this.hand] - 手牌
     * @param {Object[]} [melds=this.melds] - 副露
     * @returns {{groups:Object[],eye:Tile}|null} groups 含副露（type: chow/pong/kong）
     */
    findWinGroups(hand = this.hand, melds = this.melds) {
        const meldList = melds || [];
        const needed = 5 - meldList.length;
        if (needed < 0) return null;

        const closed = (hand || []).filter(t => !t.isFlower());
        const meldTiles = meldList.reduce((s, m) => s + (m.tiles ? m.tiles.length : 0), 0);
        if (closed.length + meldTiles !== 17) return null;

        const sorted = [...closed].sort((a, b) => {
            if (a.type !== b.type) return a.type < b.type ? -1 : 1;
            if (a.value === b.value) return 0;
            return a.value < b.value ? -1 : 1;
        });

        const res = this.dfsGroups(sorted, [], null, needed);
        if (!res) return null;

        const meldGroups = meldList.map(m => ({
            type: m.type === 'kong' ? 'kong' : m.type,
            tiles: m.tiles,
        }));
        return { groups: [...res.groups, ...meldGroups], eye: res.eye };
    }

    canReady() {
        // 聽牌：16 張手牌存在某張牌使 17 張胡牌（考慮副露）
        const candidates = [];
        ['wan', 'tiao', 'tong'].forEach(type => {
            for (let v = 1; v <= 9; v++) candidates.push(new Tile(type, v));
        });
        ['east', 'south', 'west', 'north', 'zhong', 'fa', 'bai'].forEach(v => {
            candidates.push(new Tile(TileType.ZI, v));
        });
        return candidates.some(tile => this.canWin(tile));
    }

    getHandSize() {
        return this.hand.length;
    }

    getDiscardCount() {
        return this.discards.length;
    }

    reset() {
        this.hand = [];
        this.melds = [];
        this.discards = [];
        this.flowers = [];
        this.isReady = false;
        this.hasDrawn = false;
    }
}
