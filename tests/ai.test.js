import { describe, it, expect } from 'vitest';
import { Tile } from '../js/tiles.js';
import { AIPlayer } from '../js/ai.js';

const T = (type, value) => new Tile(type, value);
const fakeGame = (prevId = 1) => ({
  getPrevPlayer: () => ({ id: prevId }),
  getAllDiscards: () => [],
});

describe('AIPlayer', () => {
  it('decideAfterDraw 不重複摸牌', () => {
    const ai = new AIPlayer(1, 'ai');
    for (let i = 0; i < 16; i++) ai.hand.push(T('wan', (i % 9) + 1));
    const ext = T('tong', 9);
    ai.drawTile(ext);
    const before = ai.hand.length;
    ai.decideAfterDraw(ext, fakeGame());
    expect(ai.hand.length).toBe(before);
  });

  it('decideAfterDraw(null) 不崩潰（已多一張免摸）', () => {
    const ai = new AIPlayer(1, 'ai');
    for (let i = 0; i < 17; i++) ai.hand.push(T('wan', (i % 9) + 1));
    const d = ai.decideAfterDraw(null, fakeGame());
    expect(['discard', 'win', 'kong']).toContain(d.action);
  });

  it('上家棄牌可吃', () => {
    const ai = new AIPlayer(2, 'ai2');
    ai.hand.push(T('wan', 1), T('wan', 2), T('wan', 5), T('wan', 6));
    const d = ai.decide(T('wan', 3), fakeGame(1));
    expect(d.action).toBe('chow');
  });

  it('decide(null) 直接選棄牌', () => {
    const ai = new AIPlayer(1, 'ai');
    ai.hand.push(T('wan', 1), T('wan', 9));
    const d = ai.decide(null, fakeGame());
    expect(d.action).toBe('discard');
  });

  it('胡牌優先於吃碰', () => {
    const ai = new AIPlayer(1, 'ai');
    [1, 2, 3, 4, 5, 6, 7, 8, 9].forEach((v) => ai.hand.push(T('wan', v)));
    [1, 1, 1].forEach((v) => ai.hand.push(T('tiao', v)));
    [5, 5].forEach((v) => ai.hand.push(T('tong', v)));
    [2, 2].forEach((v) => ai.hand.push(T('tiao', v)));
    const d = ai.decide(T('tong', 5), fakeGame(0));
    expect(d.action).toBe('win');
  });
});
