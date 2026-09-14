import { describe, it, expect } from 'vitest';
import { Tile, TileSet, TileType } from '../js/tiles.js';

describe('TileSet', () => {
  it('建立 144 張牌', () => {
    const ts = new TileSet();
    expect(ts.tiles.length).toBe(144);
    expect(ts.remaining()).toBe(144);
  });

  it('建構子即洗牌：兩副牌序不同', () => {
    const a = new TileSet();
    const b = new TileSet();
    const same = a.tiles.every(
      (t, i) => t.type === b.tiles[i].type && t.value === b.tiles[i].value
    );
    expect(same).toBe(false);
  });

  it('draw 依序取牌、見底回傳 null', () => {
    const ts = new TileSet();
    const first = ts.draw();
    expect(first).toBeInstanceOf(Tile);
    expect(ts.remaining()).toBe(143);
    for (let i = 0; i < 143; i++) ts.draw();
    expect(ts.remaining()).toBe(0);
    expect(ts.draw()).toBeNull();
  });

  it('reset 重建並重洗', () => {
    const ts = new TileSet();
    for (let i = 0; i < 10; i++) ts.draw();
    ts.reset();
    expect(ts.remaining()).toBe(144);
  });

  it('花牌共 8 張、字牌 28 張', () => {
    const ts = new TileSet();
    expect(ts.tiles.filter((t) => t.isFlower()).length).toBe(8);
    expect(ts.tiles.filter((t) => t.isHonor()).length).toBe(28);
  });

  it('Tile equals/toString（含花色）', () => {
    expect(new Tile(TileType.WAN, 1).equals(new Tile(TileType.WAN, 1))).toBe(true);
    expect(new Tile(TileType.WAN, 1).equals(new Tile(TileType.WAN, 2))).toBe(false);
    expect(new Tile(TileType.WAN, 3).toString()).toBe('3萬');
    expect(new Tile(TileType.TIAO, 5).toString()).toBe('5條');
    expect(new Tile(TileType.TONG, 9).toString()).toBe('9筒');
    expect(new Tile(TileType.ZI, 'east').toString()).toBe('東');
    expect(new Tile(TileType.HUA, 'spring').toString()).toBe('春');
  });
});
