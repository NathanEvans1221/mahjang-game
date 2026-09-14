/**
 * ===========================================
 * Mahjong Web Edition - App Entry Point (ES6 Module)
 * ===========================================
 */

import './init.js';
import { Game } from './game.js';

// 啟動遊戲實例
const game = new Game();

// 可以在這裡進行額外的啟動配置
console.log('[App] 遊戲實例已建立');

export default game;
