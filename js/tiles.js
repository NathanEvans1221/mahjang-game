// ===========================================
// Mahjong Tiles Module
// 牌組管理：洗牌、發牌、補牌
// ===========================================

export const TileType = {
    WAN: 'wan',
    TIAO: 'tiao',
    TONG: 'tong',
    ZI: 'zi',
    HUA: 'hua'
};

export const TileValue = {
    WAN: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    TIAO: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    TONG: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    ZI: ['east', 'south', 'west', 'north', 'zhong', 'fa', 'bai'],
    HUA: ['spring', 'summer', 'autumn', 'winter', 'plum', 'orchid', 'bamboo', 'chrysanthemum']
};

export const ZI_NAMES = {
    east: '東', south: '南', west: '西', north: '北',
    zhong: '中', fa: '發', bai: '白'
};

export const HUA_NAMES = {
    spring: '春', summer: '夏', autumn: '秋', winter: '冬',
    plum: '梅', orchid: '蘭', bamboo: '竹', chrysanthemum: '菊'
};

export class Tile {
    constructor(type, value) {
        this.type = type;
        this.value = value;
    }

    toString() {
        if (this.type === TileType.WAN) {
            return `${this.value}萬`;
        }
        if (this.type === TileType.TIAO) {
            return `${this.value}條`;
        }
        if (this.type === TileType.TONG) {
            return `${this.value}筒`;
        }
        if (this.type === TileType.ZI) {
            return ZI_NAMES[this.value] || this.value;
        }
        if (this.type === TileType.HUA) {
            return HUA_NAMES[this.value] || this.value;
        }
        return '?';
    }

    equals(other) {
        return this.type === other.type && this.value === other.value;
    }

    isHonor() {
        return this.type === TileType.ZI;
    }

    isFlower() {
        return this.type === TileType.HUA;
    }
}

export class TileSet {
    constructor() {
        this.tiles = [];
        this.index = 0;
        this.createTiles();
        this.shuffle();
    }

    createTiles() {
        this.tiles = [];
        
        [TileType.WAN, TileType.TIAO, TileType.TONG].forEach(type => {
            for (let v = 1; v <= 9; v++) {
                for (let i = 0; i < 4; i++) {
                    this.tiles.push(new Tile(type, v));
                }
            }
        });

        TileValue.ZI.forEach(v => {
            for (let i = 0; i < 4; i++) {
                this.tiles.push(new Tile(TileType.ZI, v));
            }
        });

        TileValue.HUA.forEach(v => {
            this.tiles.push(new Tile(TileType.HUA, v));
        });
    }

    shuffle() {
        for (let i = this.tiles.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.tiles[i], this.tiles[j]] = [this.tiles[j], this.tiles[i]];
        }
        this.index = 0;
    }

    draw() {
        if (this.index >= this.tiles.length) {
            return null;
        }
        return this.tiles[this.index++];
    }

    remaining() {
        return this.tiles.length - this.index;
    }

    reset() {
        this.createTiles();
        this.shuffle();
    }
}
