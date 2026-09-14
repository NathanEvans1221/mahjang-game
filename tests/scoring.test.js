import { describe, it, expect } from 'vitest';
import { Tile } from '../js/tiles.js';
import { Player } from '../js/player.js';
import { Scoring } from '../js/scoring.js';

const T = (type, value) => new Tile(type, value);
const calc = (tiles, flowers = [], melds = []) =>
  Scoring.calculate(new Player(0, 'w', true), tiles, melds, true, false, 0, flowers);

describe('Scoring', () => {
  it('散張風牌不計台（門清+自摸=2）', () => {
    expect(calc([T('zi', 'east')]).fans).toBe(2);
  });

  it('風刻計 1 台', () => {
    expect(calc([T('zi', 'east'), T('zi', 'east'), T('zi', 'east')]).fans).toBe(3);
  });

  it('三元刻計台、散張不計', () => {
    expect(calc([T('zi', 'zhong'), T('zi', 'zhong'), T('zi', 'zhong')]).fans).toBe(3);
    expect(calc([T('zi', 'zhong')]).fans).toBe(2);
  });

  it('花牌每張 1 台', () => {
    expect(calc([T('wan', 1)], [T('hua', 'spring'), T('hua', 'summer')]).fans).toBe(4);
  });

  it('莊家/連莊加計', () => {
    const r = Scoring.calculate(new Player(0, 'w', true), [T('wan', 1)], [], true, true, 2, []);
    // 門清1 + 自摸1 + 莊家1 + 連莊2 = 5
    expect(r.fans).toBe(5);
    expect(r.points).toBe(16);
  });

  it('fansToPoints 對照', () => {
    expect(Scoring.fansToPoints(0)).toBe(0);
    expect(Scoring.fansToPoints(1)).toBe(1);
    expect(Scoring.fansToPoints(3)).toBe(4);
    expect(Scoring.fansToPoints(6)).toBe(32);
  });

  it('眼對風牌不計刻', () => {
    const r = calc([T('zi', 'east'), T('zi', 'east')]);
    expect(r.fans).toBe(2);
    expect(r.details.join()).not.toContain('風刻');
  });

  it('紅中刻有明細', () => {
    const r = calc([T('zi', 'zhong'), T('zi', 'zhong'), T('zi', 'zhong')]);
    expect(r.details.join()).toContain('紅中刻');
  });
});

describe('Scoring 特殊胡', () => {
  const winHand = () => {
    const tiles = [];
    [1, 2, 3, 4, 5, 6, 7, 8, 9].forEach((v) => tiles.push(T('wan', v)));
    [1, 1, 1].forEach((v) => tiles.push(T('tiao', v)));
    [5, 5, 5].forEach((v) => tiles.push(T('tong', v)));
    [2, 2].forEach((v) => tiles.push(T('tiao', v)));
    return tiles;
  };

  it('天胡 +8', () => {
    const r = Scoring.calculate(new Player(0, 'w', true), winHand(), [], true, true, 0, [], { heavenly: true });
    expect(r.details.join()).toContain('天胡');
    // 門清1 + 自摸1 + 莊家1 + 天胡8 = 11
    expect(r.fans).toBe(11);
  });

  it('地胡 +8', () => {
    const r = Scoring.calculate(new Player(0, 'w', true), winHand(), [], true, false, 0, [], { earthly: true });
    expect(r.details.join()).toContain('地胡');
    expect(r.fans).toBe(10);
  });

  it('人胡 +8（放槍不計自摸）', () => {
    const r = Scoring.calculate(new Player(0, 'w', true), winHand(), [], false, false, 0, [], { human: true });
    expect(r.details.join()).toContain('人胡');
    expect(r.fans).toBe(9);
  });

  it('海底撈月 / 河底撈魚 +1', () => {
    const r1 = Scoring.calculate(new Player(0, 'w', true), winHand(), [], true, false, 0, [], { isLastTile: true });
    expect(r1.details.join()).toContain('海底撈月');
    const r2 = Scoring.calculate(new Player(0, 'w', true), winHand(), [], false, false, 0, [], { isLastTile: true });
    expect(r2.details.join()).toContain('河底撈魚');
  });
});

describe('Scoring 番型', () => {
  it('大三元 +8（含刻不疊加）', () => {
    const tiles = [];
    ['zhong', 'fa', 'bai'].forEach((v) => [1, 2, 3].forEach(() => tiles.push(T('zi', v))));
    const r = calc(tiles);
    expect(r.details.join()).toContain('大三元');
    expect(r.details.join()).not.toContain('紅中刻');
    // 門清1 + 自摸1 + 大三元8 = 10
    expect(r.fans).toBe(10);
  });

  it('settle 莊家相關加倍', () => {
    const winner = { name: 'w', isDealer: true };
    const loser = { name: 'l', isDealer: false };
    const r1 = Scoring.settle(winner, [loser], { points: 4 });
    expect(r1[0].points).toBe(8);
    expect(r1[0].type).toBe('dealer');

    const r2 = Scoring.settle(
      { name: 'w', isDealer: false },
      [{ name: 'l', isDealer: false }],
      { points: 4 }
    );
    expect(r2[0].points).toBe(4);
    expect(r2[0].type).toBe('normal');
  });

  it('小四喜 +4', () => {
    const tiles = [];
    ['east', 'south', 'west'].forEach((v) => [1, 2, 3].forEach(() => tiles.push(T('zi', v))));
    [1, 2].forEach(() => tiles.push(T('zi', 'north')));
    const r = calc(tiles);
    expect(r.details.join()).toContain('小四喜');
    // 門清1 + 自摸1 + 小四喜4 + 風刻3 = 9
    expect(r.fans).toBe(9);
  });

  it('小三元 +4（散刻另計）', () => {
    const tiles = [];
    ['zhong', 'fa'].forEach((v) => [1, 2, 3].forEach(() => tiles.push(T('zi', v))));
    [1, 2].forEach(() => tiles.push(T('zi', 'bai')));
    const r = calc(tiles);
    expect(r.details.join()).toContain('小三元');
    // 門清1 + 自摸1 + 小三元4 + 紅中1 + 發財1 = 8
    expect(r.fans).toBe(8);
  });

  it('大四喜 +8', () => {
    const tiles = [];
    ['east', 'south', 'west', 'north'].forEach((v) => [1, 2, 3].forEach(() => tiles.push(T('zi', v))));
    const r = calc(tiles);
    expect(r.details.join()).toContain('大四喜');
    // 門清1 + 自摸1 + 大四喜8 = 10
    expect(r.fans).toBe(10);
  });

  it('清一色 +8', () => {
    const tiles = [];
    [1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 4, 5, 6, 7].forEach((v) => tiles.push(T('wan', v)));
    [5, 5].forEach((v) => tiles.push(T('wan', v)));
    const r = calc(tiles);
    expect(r.details.join()).toContain('清一色');
    // 門清1 + 自摸1 + 清一色8 = 10
    expect(r.fans).toBe(10);
  });

  it('混一色 +4（含風刻）', () => {
    const tiles = [];
    [1, 2, 3, 4, 5, 6, 7, 8, 9].forEach((v) => tiles.push(T('wan', v)));
    [1, 2, 3].forEach(() => tiles.push(T('zi', 'east')));
    [2, 2, 2].forEach((v) => tiles.push(T('wan', v)));
    [1, 2].forEach(() => tiles.push(T('zi', 'east')));
    const r = calc(tiles);
    expect(r.details.join()).toContain('混一色');
    // 門清1 + 自摸1 + 混一色4 + 風刻1 = 7
    expect(r.fans).toBe(7);
  });

  it('對對胡 +4', () => {
    const tiles = [];
    [1, 1, 1, 2, 2, 2].forEach((v) => tiles.push(T('wan', v)));
    [3, 3, 3, 4, 4, 4, 5, 5, 5].forEach((v) => tiles.push(T('tong', v)));
    [5, 5].forEach((v) => tiles.push(T('tiao', v)));
    const r = calc(tiles);
    expect(r.details.join()).toContain('對對胡');
    // 門清1 + 自摸1 + 對對胡4 = 6
    expect(r.fans).toBe(6);
  });

  it('平胡 +2', () => {
    const tiles = [];
    [1, 2, 3, 4, 5, 6, 7, 8, 9].forEach((v) => tiles.push(T('wan', v)));
    [1, 2, 3, 4, 5, 6].forEach((v) => tiles.push(T('tiao', v)));
    [5, 5].forEach((v) => tiles.push(T('tong', v)));
    const r = calc(tiles);
    expect(r.details.join()).toContain('平胡');
    // 門清1 + 自摸1 + 平胡2 = 4
    expect(r.fans).toBe(4);
  });
});
