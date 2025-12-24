import { Game } from './core/Game.js';

// Initialize game when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('gameCanvas');
  const game = new Game(canvas);

  // Expose game instance for debugging
  window.game = game;

  // Start the game
  game.start();

  console.log('Mars Miner started!');
  console.log('Controls:');
  console.log('  Arrow Keys or WASD - Move');
  console.log('  Down/S - Drill');
  console.log('  Up/W - Fly (uses more fuel)');
  console.log('');
  console.log('Debug commands (in console):');
  console.log('  game.save() - Save game');
  console.log('  game.load() - Load game');
  console.log('  game.player.fuel = 100 - Refill fuel');
  console.log('  game.player.money += 1000 - Add money');
});
