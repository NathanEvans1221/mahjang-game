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

  it('吃碰評估：刻子價值與順子潛力', () => {
    const ai = new AIPlayer(1, 'ai');
    ai.hand.push(T('wan', 5), T('wan', 5), T('wan', 5));
    expect(ai.evaluatePong(T('wan', 5), fakeGame())).toBe(3);

    const ai2 = new AIPlayer(1, 'ai');
    ai2.hand.push(T('wan', 5), T('wan', 5), T('wan', 6));
    // 有對又有靠張順子潛力 → 保留不碰
    expect(ai2.evaluatePong(T('wan', 5), fakeGame())).toBe(1);

    const ai3 = new AIPlayer(2, 'ai');
    ai3.hand.push(T('wan', 1), T('wan', 2));
    expect(ai3.evaluateChow(T('wan', 3), fakeGame())).toBe(2);
  });

  it('棄牌策略：優先打孤張字牌', () => {
    const ai = new AIPlayer(1, 'ai');
    ai.hand.push(T('wan', 5), T('wan', 5), T('zi', 'east'));
    const d = ai.chooseDiscard(fakeGame());
    expect(d.type).toBe('zi');
    expect(d.value).toBe('east');
  });

  it('危險牌判斷：在外牌視為危險', () => {
    const ai = new AIPlayer(1, 'ai');
    const outs = [T('wan', 5)];
    expect(ai.isTileDangerous(T('wan', 5), outs)).toBe(true);
    expect(ai.isTileDangerous(T('wan', 6), outs)).toBe(false);
  });

  it('對子加牌可碰', () => {
    const ai = new AIPlayer(1, 'ai');
    ai.hand.push(T('tong', 7), T('tong', 7));
    const d = ai.decide(T('tong', 7), fakeGame(0));
    expect(d.action).toBe('pong');
  });
});
