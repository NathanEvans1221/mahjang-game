import { describe, it, expect, beforeAll } from 'vitest';
import { Tile } from '../js/tiles.js';

function makeEl() {
  return {
    disabled: true,
    textContent: '',
    classList: { add() {}, remove() {} },
    addEventListener() {},
    innerHTML: '',
    appendChild() {},
    querySelector: () => makeEl(),
  };
}
function makeTemplate() {
  return { content: { cloneNode: () => makeEl() } };
}

globalThis.window = globalThis;
globalThis.document = {
  getElementById: (id) => (id === 'tpl-player-area' || id === 'tpl-tile' ? makeTemplate() : makeEl()),
  querySelector: () => null,
};

let Game;
beforeAll(async () => {
  ({ Game } = await import('../js/game.js'));
});

const total = (pl) => pl.hand.length + pl.melds.reduce((s, m) => s + m.tiles.length, 0);

describe('Game 流程', () => {
  it('開局：莊家 17、閒家 16，且牌序隨機', () => {
    const g = new Game();
    g.startNewGame();
    g.players.forEach((pl, i) => {
      expect(total(pl)).toBe(i === g.dealer ? 17 : 16);
    });
    expect(g.tileSet.remaining()).toBeLessThan(144);
  });

  it('人類可完成摸→打循環', () => {
    const g = new Game();
    g.startNewGame();
    g.currentPlayer = 0;
    g.lastDiscard = null;
    g.lastDraw = null;
    g.state = 'playing';
    g.playTurn();
    const after = total(g.players[0]);
    expect([16, 17]).toContain(after);
    expect(g.players[0].hasDrawn).toBe(true);
    g.handleHumanDiscard(g.players[0].hand[0]);
    expect(g.currentPlayer).toBe(1);
  });

  it('吃牌完成副露登記', () => {
    const g = new Game();
    g.startNewGame();
    const p = g.players[2];
    p.hand = [];
    p.hand.push(new Tile('wan', 1), new Tile('wan', 2));
    while (p.hand.length < 16) p.hand.push(new Tile('tong', 9));
    g.handleChow(p, new Tile('wan', 3));
    expect(p.melds.length).toBe(1);
    expect(p.melds[0].type).toBe('chow');
    expect(g.lastDiscard).toBeNull();
  });

  it('AI 多回合後張數維持 16/17', async () => {
    const g = new Game();
    g.startNewGame();
    g.currentPlayer = 1;
    g.lastDiscard = null;
    g.state = 'playing';
    g.playTurn();
    await new Promise((r) => setTimeout(r, 2500));
    g.players.forEach((pl) => {
      expect([16, 17]).toContain(total(pl));
    });
  }, 10000);

  it('設定：預設速度與延遲對照', () => {
    const g = new Game();
    expect(g.settings.speed).toBe('normal');
    expect(g.getDelay('ai')).toBe(500);
    expect(g.getDelay('check')).toBe(300);
    expect(g.getDelay('kong')).toBe(300);
    g.settings.speed = 'fast';
    expect(g.getDelay('ai')).toBe(150);
    g.settings.speed = 'slow';
    expect(g.getDelay('ai')).toBe(900);
  });

  it('設定面板開關不崩潰', () => {
    const g = new Game();
    expect(() => {
      g.openSettings();
      g.closeSettings();
    }).not.toThrow();
  });
});
