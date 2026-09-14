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

  it('碰牌登記副露並換手', () => {
    const g = new Game();
    g.startNewGame();
    const p = g.players[1];
    p.hand = [new Tile('tong', 7), new Tile('tong', 7)];
    while (p.hand.length < 16) p.hand.push(new Tile('wan', 1));
    g.handlePong(p, new Tile('tong', 7));
    expect(p.melds).toHaveLength(1);
    expect(p.melds[0].type).toBe('pong');
    expect(p.hand).toHaveLength(14);
    expect(g.currentPlayer).toBe(1);
    expect(g.lastDiscard).toBeNull();
    expect(p.hasDrawn).toBe(true);
  });

  it('槓牌登記副露並補牌', async () => {
    const g = new Game();
    g.startNewGame();
    const p = g.players[1];
    p.hand = [new Tile('tong', 7), new Tile('tong', 7), new Tile('tong', 7)];
    while (p.hand.length < 16) p.hand.push(new Tile('wan', 1));
    g.handleKong(p, new Tile('tong', 7));
    expect(p.melds).toHaveLength(1);
    expect(p.melds[0].type).toBe('kong');
    // 槓後決策為非同步，等待完成不斷言崩潰
    await new Promise((r) => setTimeout(r, 800));
    expect(p.melds).toHaveLength(1);
  }, 10000);

  it('自摸與放槍計分不同', () => {
    const g = new Game();
    g.startNewGame();
    const p = g.players[0];
    p.hand = [new Tile('wan', 1)];
    const ronTile = new Tile('wan', 2);
    g.lastDiscard = ronTile;
    g.executeAction(p, { action: 'win', tile: ronTile });
    expect(g.state).toBe('round_end');
  });

  it('放槍不計自摸、天胡開局有明細', () => {
    const g = new Game();
    g.startNewGame();
    const p = g.players[0];
    p.hand = [new Tile('wan', 1)];
    // 放槍：tile 即 lastDiscard
    const ronTile = new Tile('wan', 2);
    g.lastDiscard = ronTile;
    let captured = null;
    const orig = g.showWinDialog.bind(g);
    g.showWinDialog = (name, result) => { captured = result; };
    g.executeAction(p, { action: 'win', tile: ronTile });
    expect(captured.details.join()).not.toContain('自摸');
    g.showWinDialog = orig;

    // 天胡：開局無棄牌無副露＋莊家自摸
    const g2 = new Game();
    g2.startNewGame();
    const dealer = g2.players[g2.dealer];
    dealer.hand = [new Tile('wan', 1)];
    let captured2 = null;
    g2.showWinDialog = (name, result) => { captured2 = result; };
    g2.handleWin(dealer, null, true);
    expect(captured2.details.join()).toContain('天胡');
  });

  it('流局結束本局', () => {
    const g = new Game();
    g.startNewGame();
    let captured = null;
    g.showWinDialog = (name, result) => { captured = result; };
    g.handleDraw();
    expect(g.state).toBe('round_end');
    expect(captured.details).toContain('流局（牌牆見底）');
  });

  it('摸牌花牌自動補牌', () => {
    const g = new Game();
    g.startNewGame();
    const p = g.players[0];
    const before = p.hand.length;
    g.tileSet.tiles = [new Tile('hua', 'spring'), new Tile('wan', 1), new Tile('wan', 2)];
    g.tileSet.index = 0;
    const drawn = g.drawWithReplacement(p);
    expect(drawn).not.toBeNull();
    expect(drawn.type).toBe('wan');
    expect(p.flowers).toHaveLength(1);
    expect(p.hand.length).toBe(before + 1);
  });
});
