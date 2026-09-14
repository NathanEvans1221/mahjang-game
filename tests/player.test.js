import { describe, it, expect } from 'vitest';
import { Tile } from '../js/tiles.js';
import { Player } from '../js/player.js';

const T = (type, value) => new Tile(type, value);

/** 萬 1-9 + 筒條刻子 + 眼：標準 17 張胡牌型 */
function winningHand() {
  const p = new Player(0, 't', true);
  [1, 2, 3, 4, 5, 6, 7, 8, 9].forEach((v) => p.hand.push(T('wan', v)));
  [1, 1, 1].forEach((v) => p.hand.push(T('tiao', v)));
  [5, 5, 5].forEach((v) => p.hand.push(T('tong', v)));
  [2, 2].forEach((v) => p.hand.push(T('tiao', v)));
  return p;
}

describe('Player 胡牌判定（台灣 16 張）', () => {
  it('17 張標準型可胡', () => {
    const p = winningHand();
    expect(p.hand.length).toBe(17);
    expect(p.checkWin(p.hand)).toBe(true);
  });

  it('14 張舊規則型不可胡', () => {
    const p = new Player(0, 't', true);
    [1, 2, 3, 4, 5, 6, 7, 8, 9].forEach((v) => p.hand.push(T('wan', v)));
    [1, 1, 1].forEach((v) => p.hand.push(T('tiao', v)));
    [2, 2].forEach((v) => p.hand.push(T('tiao', v)));
    expect(p.checkWin(p.hand)).toBe(false);
  });

  it('帶副露（2 面子）可胡', () => {
    const p = new Player(0, 't', true);
    [1, 2, 3, 4, 5, 6, 7, 8, 9].forEach((v) => p.hand.push(T('wan', v)));
    [2, 2].forEach((v) => p.hand.push(T('tiao', v)));
    p.melds = [
      { type: 'pong', tiles: [T('tong', 5), T('tong', 5), T('tong', 5)], from: 3 },
      { type: 'pong', tiles: [T('tiao', 1), T('tiao', 1), T('tiao', 1)], from: 3 },
    ];
    expect(p.checkWin(p.hand)).toBe(true);
  });

  it('canWin 支援補上第 17 張', () => {
    const p = winningHand();
    const last = p.hand.pop();
    expect(p.hand.length).toBe(16);
    expect(p.canWin(last)).toBe(true);
    expect(p.canWin(T('wan', 9))).toBe(false);
  });

  it('canReady 判斷聽牌', () => {
    const p = winningHand();
    p.hand.pop();
    expect(p.canReady()).toBe(true);
  });

  it('非聽牌型 canReady 為 false', () => {
    const p = new Player(0, 't', true);
    [1, 1, 2, 2, 3, 3, 4, 4, 5].forEach((v) => p.hand.push(T('wan', v)));
    [1, 3, 5, 7, 9, 2, 4].forEach((v) => p.hand.push(T('tong', v)));
    expect(p.hand.length).toBe(16);
    expect(p.canReady()).toBe(false);
  });
});

describe('Player 吃碰槓', () => {
  it('canPong 需兩張同牌', () => {
    const p = new Player(0, 't', true);
    p.hand.push(T('wan', 5), T('wan', 5));
    expect(p.canPong(T('wan', 5))).toBe(true);
    expect(p.canPong(T('wan', 6))).toBe(false);
  });

  it('canChow 僅接受上家 id 或物件', () => {
    const p = new Player(2, 'c');
    p.hand.push(T('wan', 1), T('wan', 2));
    expect(p.canChow(T('wan', 3), 1)).toBe(true);
    expect(p.canChow(T('wan', 3), { id: 1 })).toBe(true);
    expect(p.canChow(T('wan', 3), 3)).toBe(false);
    expect(p.canChow(T('wan', 3), 2)).toBe(false);
  });

  it('findChowTiles 回傳可配對的兩張', () => {
    const p = new Player(2, 'c');
    p.hand.push(T('wan', 1), T('wan', 2));
    const pair = p.findChowTiles(T('wan', 3));
    expect(pair).not.toBeNull();
    expect(pair).toHaveLength(2);
    expect(p.findChowTiles(T('wan', 9))).toBeNull();
  });

  it('canKong 手牌三張或摸牌刻', () => {
    const p = new Player(0, 't', true);
    p.hand.push(T('wan', 7), T('wan', 7));
    expect(p.canKong(T('wan', 7), false)).toBe(false);
    p.hand.push(T('wan', 7));
    expect(p.canKong(T('wan', 7), true)).toBe(true);
  });

  it('null 牌安全', () => {
    const p = new Player(0, 'n', true);
    p.hand.push(T('wan', 1));
    expect(p.canPong(null)).toBe(false);
    expect(p.canKong(null)).toBe(false);
    expect(p.canChow(null, 1)).toBe(false);
  });

  it('findWinGroups 回傳面子與眼', () => {
    const p = winningHand();
    const shape = p.findWinGroups();
    expect(shape).not.toBeNull();
    expect(shape.groups).toHaveLength(5);
    expect(shape.eye).toBeDefined();
    const bad = new Player(0, 'b', true);
    bad.hand.push(T('wan', 1), T('wan', 2));
    expect(bad.findWinGroups()).toBeNull();
  });

  it('手牌基本操作：排序、移除、打出、重置', () => {
    const p = new Player(0, 't', true);
    p.hand.push(T('tong', 3), T('zi', 'east'), T('wan', 9), T('hua', 'spring'));
    p.sortHand();
    expect(p.hand.map((t) => t.type)).toEqual(['wan', 'tong', 'zi', 'hua']);

    expect(p.removeTile(T('wan', 9))).toBe(true);
    expect(p.removeTile(T('wan', 9))).toBe(false);
    expect(p.getHandSize()).toBe(3);

    p.hasDrawn = true;
    expect(p.discardTile(T('tong', 3))).toBe(true);
    expect(p.hasDrawn).toBe(false);
    expect(p.getDiscardCount()).toBe(1);

    p.addMelds({ type: 'pong', tiles: [] });
    expect(p.getMelds()).toHaveLength(1);

    p.reset();
    expect(p.getHandSize()).toBe(0);
    expect(p.getMelds()).toHaveLength(0);
    expect(p.getDiscardCount()).toBe(0);
  });

  it('tryWin 支援暗槓四張', () => {
    const p = new Player(0, 't', true);
    const tiles = [T('wan', 1), T('wan', 1), T('wan', 1), T('wan', 1), T('tiao', 2), T('tiao', 2)];
    expect(p.tryWin(tiles, 0, [], null, 1)).toBe(true);
  });
});
