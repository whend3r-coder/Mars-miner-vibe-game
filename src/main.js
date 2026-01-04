import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { GameScene } from './scenes/GameScene.js';
import { UIScene } from './scenes/UIScene.js';
import { PauseScene } from './scenes/PauseScene.js';
import { MapScene } from './scenes/MapScene.js';
import { GAME_CONFIG } from './config/GameConfig.js';
import { SaveSystem } from './systems/SaveSystem.js';

// Hide status bar on Android for fullscreen immersive mode
// Only runs in Capacitor native app, not in browser
if (window.Capacitor?.isNativePlatform?.()) {
  // Access StatusBar through Capacitor Plugins (no import needed)
  const StatusBar = window.Capacitor?.Plugins?.StatusBar;
  if (StatusBar) {
    StatusBar.hide();
    StatusBar.setOverlaysWebView({ overlay: true });
  }
}

const config = {
  type: Phaser.AUTO,
  parent: 'game-container',
  backgroundColor: '#1a1a2e',
  pixelArt: true,
  antialias: false,
  roundPixels: true,  // Round sprite positions for crisp pixel art
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_CONFIG.GAME_WIDTH,
    height: GAME_CONFIG.GAME_HEIGHT,
    autoRound: true,
    zoom: 1,  // Base zoom, FIT will scale from here
  },
  render: {
    pixelArt: true,
    antialias: false,
    roundPixels: true,  // Crisp rendering
  },
  fps: {
    target: 60,
    forceSetTimeOut: false,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: GAME_CONFIG.GRAVITY * GAME_CONFIG.TILE_SIZE },
      debug: false,
      fps: 60,
    },
  },
  scene: [BootScene, MenuScene, GameScene, UIScene, PauseScene, MapScene],
  input: {
    activePointers: 3, // Support multi-touch
  },
};

const game = new Phaser.Game(config);

// Force pixelated rendering on canvas
game.events.once('ready', () => {
  const canvas = game.canvas;
  if (canvas) {
    canvas.style.imageRendering = 'pixelated';
    canvas.style.imageRendering = 'crisp-edges';
  }
});

// Handle visibility change for mobile
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    game.scene.pause('GameScene');
  }
});

// Handle orientation change on mobile - save state and reload to recalculate dimensions
window.addEventListener('orientationchange', () => {
  // Check if GameScene is active and trigger a save
  const gameScene = game.scene.getScene('GameScene');
  if (gameScene && gameScene.scene.isActive()) {
    // Trigger emergency save before reload
    if (gameScene.saveGame) {
      gameScene.saveGame();
    }
    // Mark that we have an active session to auto-continue
    SaveSystem.setActiveSession(true);
  }

  setTimeout(() => {
    window.location.reload();
  }, 100);
});
