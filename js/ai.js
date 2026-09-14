// ===========================================
// AI Module
// AI 電腦玩家決策邏輯
// ===========================================

import { Player } from './player.js';
import { TileType } from './tiles.js';

export class AIPlayer extends Player {
    constructor(id, name) {
        super(id, name, false);
    }

    decide(tile, game) {
        if (!tile) {
            return { action: 'discard', tile: this.chooseDiscard(game) };
        }

        if (this.canWin(tile)) {
            return { action: 'win', tile: tile };
        }

        if (this.canKong(tile, false)) {
            return { action: 'kong', tile: tile };
        }

        if (this.canPong(tile)) {
            const pongValue = this.evaluatePong(tile, game);
            if (pongValue > 0) {
                return { action: 'pong', tile: tile };
            }
        }

        if (tile && this.canChow(tile, game.getPrevPlayer(this.id).id)) {
            const chowValue = this.evaluateChow(tile, game);
            if (chowValue > 0) {
                return { action: 'chow', tile: tile };
            }
        }

        return { action: 'discard', tile: this.chooseDiscard(game) };
    }

    evaluatePong(tile, game) {
        const counts = {};
        this.hand.forEach(t => {
            const key = `${t.type}-${t.value}`;
            counts[key] = (counts[key] || 0) + 1;
        });

        const tileKey = `${tile.type}-${tile.value}`;
        const count = counts[tileKey] || 0;

        if (count >= 3) return 3;
        if (count === 2) {
            const sameTypeTiles = this.hand.filter(t => t.type === tile.type);
            const hasPotentialChow = sameTypeTiles.some(t => {
                const v = t.value;
                return Math.abs(v - tile.value) <= 2 && v !== tile.value;
            });
            return hasPotentialChow ? 1 : 2;
        }
        return 0;
    }

    evaluateChow(tile, game) {
        const suitTiles = this.hand.filter(t => t.type === tile.type && Math.abs(t.value - tile.value) <= 2);
        
        if (suitTiles.length >= 2) {
            const counts = {};
            suitTiles.forEach(t => {
                const key = `${t.type}-${t.value}`;
                counts[key] = (counts[key] || 0) + 1;
            });
            
            let pairs = 0;
            for (const key in counts) {
                if (counts[key] >= 2) pairs++;
            }
            
            return pairs > 0 ? 3 : 2;
        }
        return 1;
    }

    chooseDiscard(game = null) {
        this.sortHand();
        
        const discardedTiles = game ? game.getAllDiscards() : [];
        
        const ziTiles = this.hand.filter(t => t.type === TileType.ZI);
        const huaTiles = this.hand.filter(t => t.type === TileType.HUA);
        
        const safeZi = ziTiles.filter(t => !this.isTileDangerous(t, discardedTiles));
        if (safeZi.length > 0) {
            return this.selectLonelyTile(safeZi);
        }
        
        if (ziTiles.length > 0) {
            return this.selectLonelyTile(ziTiles);
        }
        
        if (huaTiles.length > 0) {
            return this.selectLonelyTile(huaTiles);
        }
        
        const suitTiles = this.hand.filter(t => t.type !== TileType.ZI && t.type !== TileType.HUA);
        
        const havePair = suitTiles.filter(t => {
            const same = suitTiles.filter(s => s.equals(t));
            return same.length >= 2;
        });
        
        if (havePair.length > 0) {
            const keepForEye = havePair[0];
            const others = suitTiles.filter(t => !t.equals(keepForEye));
            return this.selectBestDiscard(others, discardedTiles);
        }
        
        return this.selectBestDiscard(suitTiles, discardedTiles);
    }

    isTileDangerous(tile, discardedTiles) {
        const key = `${tile.type}-${tile.value}`;
        return discardedTiles.some(d => `${d.type}-${d.value}` === key);
    }

    selectLonelyTile(tiles) {
        const counts = {};
        tiles.forEach(t => {
            const key = `${t.type}-${t.value}`;
            counts[key] = (counts[key] || 0) + 1;
        });

        let lonelyTile = null;
        let minCount = 999;

        for (const tile of tiles) {
            const key = `${tile.type}-${tile.value}`;
            if (counts[key] < minCount) {
                minCount = counts[key];
                lonelyTile = tile;
            }
        }

        return lonelyTile || tiles[0];
    }

    selectBestDiscard(tiles, discardedTiles) {
        const tileValues = tiles.map(t => ({ tile: t, value: this.evaluateTileValue(t, discardedTiles) }));
        tileValues.sort((a, b) => a.value - b.value);
        
        return tileValues[0]?.tile || tiles[0];
    }

    evaluateTileValue(tile, discardedTiles) {
        let score = 0;
        
        const count = this.hand.filter(t => t.equals(tile)).length;
        if (count >= 3) score -= 100;
        else if (count === 2) score -= 50;
        
        const sameType = this.hand.filter(t => t.type === tile.type && !t.equals(tile));
        const potentials = sameType.filter(t => Math.abs(t.value - tile.value) <= 2);
        score += potentials.length * 10;
        
        if (!this.isTileDangerous(tile, discardedTiles)) score += 5;
        
        if (tile.value === 1 || tile.value === 9) score -= 20;
        
        return score;
    }

    decideAfterDraw(tile, game) {
        // tile 已由呼叫端摸起並加入手牌，此處僅決策不再重複 drawTile
        // （tile 為 null 表示已多一張不需再摸，如開局莊家 / 吃碰後）
        this.sortHand();

        if (tile && this.canWin(tile)) {
            return { action: 'win', tile: tile };
        }

        if (tile && this.canKong(tile, true)) {
            return { action: 'kong', tile: tile };
        }

        return { action: 'discard', tile: this.chooseDiscard(game) };
    }
}
