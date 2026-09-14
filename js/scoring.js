// ===========================================
// Scoring Module
// 台灣麻將計分系統（台灣 16 張常見台數）
// ===========================================

import { Player } from './player.js';

export class Scoring {
    static calculate(winner, hand, melds, isSelfDraw, isDealer, consecutiveWins, flowers, options = {}) {
        const meldList = melds || [];
        const flowerList = flowers || [];
        let fans = 0;
        const details = [];
        const add = (n, label) => { if (n > 0) { fans += n; details.push(label); } };

        if (!this.hasMelds(meldList)) {
            add(1, '門前清 (+1)');
        }

        if (isSelfDraw) {
            add(1, '自摸 (+1)');
        }

        if (isDealer) {
            add(1, '莊家 (+1)');
        }

        if (consecutiveWins > 0) {
            add(consecutiveWins, `連莊 x${consecutiveWins} (+${consecutiveWins})`);
        }

        const allTiles = [...hand, ...meldList.flatMap(m => m.tiles)];
        const countOf = (value) => allTiles.filter(t => t.value === value).length;

        // 先算胡牌結構：刻子/槓子以結構為準（眼對不計刻），無有效結構時退回張數判斷
        const structProbe = new Player(0, 'probe');
        const struct = structProbe.findWinGroups(hand, meldList);
        const keValues = (vals) => {
            if (struct) {
                const s = new Set();
                for (const g of struct.groups) {
                    if ((g.type === 'pong' || g.type === 'kong') && vals.includes(g.tiles[0].value)) {
                        s.add(g.tiles[0].value);
                    }
                }
                return [...s];
            }
            return vals.filter(v => countOf(v) >= 3);
        };

        // --- 三元牌：大三元 +8（含刻，不疊加）；小三元 +4；散刻每組 +1（槓 +2）
        const dragonVals = ['zhong', 'fa', 'bai'];
        const dragonSets = keValues(dragonVals);
        const dragonPairs = dragonVals.filter(v => countOf(v) === 2);
        if (dragonSets.length === 3) {
            add(8, '大三元 (+8，含三元刻)');
        } else {
            if (dragonSets.length === 2 && dragonPairs.length === 1) {
                add(4, '小三元 (+4)');
            }
            const names = { zhong: '紅中', fa: '發財', bai: '白板' };
            for (const d of dragonSets) {
                const n = countOf(d) === 4 ? 2 : 1;
                add(n, `${names[d]}刻 (+${n})`);
            }
        }

        // --- 風牌：僅刻子/槓子計台；大四喜 +8（含刻）；小四喜 +4；散刻每組 +1
        const windVals = ['east', 'south', 'west', 'north'];
        const windSets = keValues(windVals);
        const windPairs = windVals.filter(v => countOf(v) === 2);
        if (windSets.length === 4) {
            add(8, '大四喜 (+8，含風刻)');
        } else {
            if (windSets.length === 3 && windPairs.length === 1) {
                add(4, '小四喜 (+4)');
            }
            if (windSets.length > 0) {
                add(windSets.length, `風刻 x${windSets.length} (+${windSets.length})`);
            }
        }

        // --- 特殊胡（對局情境，由 game 傳入 options）
        if (options.heavenly) {
            add(8, '天胡 (+8)');
        } else if (options.earthly) {
            add(8, '地胡 (+8)');
        } else if (options.human) {
            add(8, '人胡 (+8)');
        }
        if (options.isLastTile) {
            add(1, isSelfDraw ? '海底撈月 (+1)' : '河底撈魚 (+1)');
        }

        // --- 花色與手牌型：僅在有效胡牌結構下判定（避免散牌誤觸）
        const shape = struct;
        if (shape) {
            const suitTiles = allTiles.filter(t => ['wan', 'tiao', 'tong'].includes(t.type));
            const suits = new Set(suitTiles.map(t => t.type));
            const hasHonor = allTiles.some(t => t.type === 'zi');
            if (suits.size === 1 && !hasHonor) {
                add(8, '清一色 (+8)');
            } else if (suits.size === 1 && hasHonor) {
                add(4, '混一色 (+4)');
            }

            // --- 對對胡 / 平胡（需完整胡牌結構）
            const types = shape.groups.map(g => g.type);
            if (types.every(t => t === 'pong' || t === 'kong')) {
                add(4, '對對胡 (+4)');
            } else if (types.every(t => t === 'chow') &&
                shape.eye.type !== 'zi' && shape.eye.type !== 'hua') {
                add(2, '平胡 (+2)');
            }
        }

        if (flowerList.length > 0) {
            add(flowerList.length, `花牌 x${flowerList.length} (+${flowerList.length})`);
        }

        return {
            fans: fans,
            points: this.fansToPoints(fans),
            details: details
        };
    }

    static hasMelds(melds) {
        return melds && melds.length > 0;
    }

    static fansToPoints(fans) {
        if (fans <= 0) return 0;
        if (fans === 1) return 1;
        if (fans === 2) return 2;
        if (fans === 3) return 4;
        if (fans === 4) return 8;
        if (fans === 5) return 16;
        if (fans >= 6) return 32;
        
        return Math.pow(2, fans - 1);
    }

    static settle(winner, losers, scores) {
        const results = [];
        
        losers.forEach(loser => {
            const points = scores.points;
            
            if (winner.isDealer || loser.isDealer) {
                results.push({
                    winner: winner.name,
                    loser: loser.name,
                    points: points * 2,
                    type: 'dealer'
                });
            } else {
                results.push({
                    winner: winner.name,
                    loser: loser.name,
                    points: points,
                    type: 'normal'
                });
            }
        });

        return results;
    }
}
