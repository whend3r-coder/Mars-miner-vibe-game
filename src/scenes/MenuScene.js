import Phaser from 'phaser';
import { GAME_CONFIG, DEFAULT_SETTINGS } from '../config/GameConfig.js';
import { SaveSystem } from '../systems/SaveSystem.js';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Load and apply settings
    this.loadSettings();

    // Title
    this.add.bitmapText(Math.floor(width / 2), 60, 'pixel', 'MARS MINER', 30)
      .setOrigin(0.5)
      .setTint(0xc2703a);

    this.add.bitmapText(Math.floor(width / 2), 110, 'pixel', 'ROVER EDITION', 20)
      .setOrigin(0.5)
      .setTint(0x888888);

    // Check for existing save
    const hasSave = SaveSystem.hasSave();

    // New Game button
    this.createButton(Math.floor(width / 2), 180, 'NEW GAME', () => this.startNewGame());

    // Continue button (if save exists)
    if (hasSave) {
      this.createButton(Math.floor(width / 2), 240, 'CONTINUE', () => this.continueGame());
    }

    // Settings button
    this.createButton(Math.floor(width / 2), hasSave ? 300 : 240, 'SETTINGS', () => this.openSettings());

    // Instructions
    this.add.bitmapText(Math.floor(width / 2), height - 56, 'pixel', 'ARROWS:MOVE  SPACE+DIR:DRILL  E:INTERACT', 10)
      .setOrigin(0.5)
      .setTint(0x666666);

    // Version
    this.add.bitmapText(width - 8, height - 8, 'pixel', 'V2.0', 10)
      .setOrigin(1, 1)
      .setTint(0x444444);
  }

  createButton(x, y, text, callback) {
    const btn = this.add.bitmapText(x, y, 'pixel', text, 20)
      .setOrigin(0.5)
      .setTint(0xffffff);

    // Create background rectangle
    const padding = 16;
    const bg = this.add.rectangle(x, y, btn.width + padding * 2, btn.height + padding, 0x444444)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => {
        btn.setTint(0xffaa00);
        bg.setFillStyle(0x555555);
      })
      .on('pointerout', () => {
        btn.setTint(0xffffff);
        bg.setFillStyle(0x444444);
      })
      .on('pointerdown', callback);

    // Move text above background
    btn.setDepth(1);

    return { btn, bg };
  }

  startNewGame() {
    // Reset game data with starting equipment
    this.registry.set('gameData', {
      money: 100,
      upgrades: {
        drillSpeed: 0,
        drillPower: 0,
        batteryCapacity: 0,
        cargoBay: 0,
        hullArmor: 0,
        wheelTraction: 0,
        headlights: 0,
        thrusters: 0,
      },
      inventory: [
        { type: 'ladder', quantity: 10 },
        { type: 'platform', quantity: 5 },
        { type: 'torch', quantity: 3 },
      ],
      cargo: [],
    });

    // Clear explored tiles for new game
    this.registry.set('exploredTiles', new Set());

    // Generate new world seed
    this.registry.set('worldSeed', Date.now());
    this.registry.set('modifiedTiles', new Map());
    this.registry.set('placedItems', []);

    this.scene.start('GameScene');
    this.scene.launch('UIScene');
  }

  continueGame() {
    const saveData = SaveSystem.load();
    if (saveData) {
      this.registry.set('gameData', saveData.gameData);
      this.registry.set('worldSeed', saveData.worldSeed);
      this.registry.set('playerPosition', saveData.playerPosition);

      // Convert modified tiles array back to Map
      const modifiedTiles = new Map();
      if (saveData.modifiedTiles) {
        saveData.modifiedTiles.forEach(([key, value]) => {
          modifiedTiles.set(key, value);
        });
      }
      this.registry.set('modifiedTiles', modifiedTiles);
      this.registry.set('placedItems', saveData.placedItems || []);

      this.scene.start('GameScene');
      this.scene.launch('UIScene');
    }
  }

  loadSettings() {
    const saved = SaveSystem.loadSettings();
    const settings = { ...DEFAULT_SETTINGS, ...saved };

    // Store in registry
    this.registry.set('soundEnabled', settings.soundEnabled);
    this.registry.set('debugMode', settings.debugMode);
    this.registry.set('gameZoom', settings.gameZoom);
    this.registry.set('hudZoom', settings.hudZoom);
  }

  saveSettings() {
    const settings = {
      soundEnabled: this.registry.get('soundEnabled'),
      debugMode: this.registry.get('debugMode'),
      gameZoom: this.registry.get('gameZoom'),
      hudZoom: this.registry.get('hudZoom'),
    };
    SaveSystem.saveSettings(settings);
  }

  openSettings() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    const cx = Math.floor(width / 2);

    // Track all UI elements for cleanup
    const uiElements = [];

    const overlay = this.add.rectangle(cx, Math.floor(height / 2), width, height, 0x000000, 0.85);
    uiElements.push(overlay);

    const settingsTitle = this.add.bitmapText(cx, 40, 'pixel', 'SETTINGS', 20)
      .setOrigin(0.5)
      .setTint(0xffffff);
    uiElements.push(settingsTitle);

    let currentY = 90;

    // Sound toggle
    const soundEnabled = this.registry.get('soundEnabled') !== false;
    const soundBg = this.add.rectangle(cx, currentY, 240, 32, 0x444444)
      .setInteractive({ useHandCursor: true });
    uiElements.push(soundBg);
    const soundBtn = this.add.bitmapText(cx, currentY, 'pixel', `SOUND: ${soundEnabled ? 'ON' : 'OFF'}`, 10)
      .setOrigin(0.5)
      .setTint(0xffffff)
      .setDepth(1);
    uiElements.push(soundBtn);

    soundBg.on('pointerdown', () => {
      const newValue = this.registry.get('soundEnabled') === false;
      this.registry.set('soundEnabled', newValue);
      soundBtn.setText(`SOUND: ${newValue ? 'ON' : 'OFF'}`);
      this.saveSettings();
    });

    currentY += 50;

    // Game Zoom control
    const gameZoom = this.registry.get('gameZoom') || 1.0;
    const gameZoomLabel = this.add.bitmapText(cx, currentY, 'pixel', 'GAME ZOOM', 10)
      .setOrigin(0.5)
      .setTint(0x888888);
    uiElements.push(gameZoomLabel);

    currentY += 24;

    const gameZoomBg = this.add.rectangle(cx, currentY, 240, 32, 0x333333);
    uiElements.push(gameZoomBg);

    const gameZoomMinusBg = this.add.rectangle(cx - 90, currentY, 40, 28, 0x555555)
      .setInteractive({ useHandCursor: true });
    uiElements.push(gameZoomMinusBg);
    const gameZoomMinus = this.add.bitmapText(cx - 90, currentY, 'pixel', '-', 20)
      .setOrigin(0.5)
      .setTint(0xffffff)
      .setDepth(1);
    uiElements.push(gameZoomMinus);

    const gameZoomValue = this.add.bitmapText(cx, currentY, 'pixel', `${gameZoom.toFixed(2)}X`, 10)
      .setOrigin(0.5)
      .setTint(0xffaa00)
      .setDepth(1);
    uiElements.push(gameZoomValue);

    const gameZoomPlusBg = this.add.rectangle(cx + 90, currentY, 40, 28, 0x555555)
      .setInteractive({ useHandCursor: true });
    uiElements.push(gameZoomPlusBg);
    const gameZoomPlus = this.add.bitmapText(cx + 90, currentY, 'pixel', '+', 20)
      .setOrigin(0.5)
      .setTint(0xffffff)
      .setDepth(1);
    uiElements.push(gameZoomPlus);

    gameZoomMinusBg.on('pointerdown', () => {
      let val = this.registry.get('gameZoom') || 1.0;
      val = Math.max(GAME_CONFIG.GAME_ZOOM_MIN, val - GAME_CONFIG.GAME_ZOOM_STEP);
      this.registry.set('gameZoom', val);
      gameZoomValue.setText(`${val.toFixed(2)}X`);
      this.saveSettings();
    });

    gameZoomPlusBg.on('pointerdown', () => {
      let val = this.registry.get('gameZoom') || 1.0;
      val = Math.min(GAME_CONFIG.GAME_ZOOM_MAX, val + GAME_CONFIG.GAME_ZOOM_STEP);
      this.registry.set('gameZoom', val);
      gameZoomValue.setText(`${val.toFixed(2)}X`);
      this.saveSettings();
    });

    currentY += 50;

    // HUD Zoom control
    const hudZoom = this.registry.get('hudZoom') || 1.0;
    const hudZoomLabel = this.add.bitmapText(cx, currentY, 'pixel', 'HUD ZOOM', 10)
      .setOrigin(0.5)
      .setTint(0x888888);
    uiElements.push(hudZoomLabel);

    currentY += 24;

    const hudZoomBg = this.add.rectangle(cx, currentY, 240, 32, 0x333333);
    uiElements.push(hudZoomBg);

    const hudZoomMinusBg = this.add.rectangle(cx - 90, currentY, 40, 28, 0x555555)
      .setInteractive({ useHandCursor: true });
    uiElements.push(hudZoomMinusBg);
    const hudZoomMinus = this.add.bitmapText(cx - 90, currentY, 'pixel', '-', 20)
      .setOrigin(0.5)
      .setTint(0xffffff)
      .setDepth(1);
    uiElements.push(hudZoomMinus);

    const hudZoomValue = this.add.bitmapText(cx, currentY, 'pixel', `${hudZoom.toFixed(2)}X`, 10)
      .setOrigin(0.5)
      .setTint(0xffaa00)
      .setDepth(1);
    uiElements.push(hudZoomValue);

    const hudZoomPlusBg = this.add.rectangle(cx + 90, currentY, 40, 28, 0x555555)
      .setInteractive({ useHandCursor: true });
    uiElements.push(hudZoomPlusBg);
    const hudZoomPlus = this.add.bitmapText(cx + 90, currentY, 'pixel', '+', 20)
      .setOrigin(0.5)
      .setTint(0xffffff)
      .setDepth(1);
    uiElements.push(hudZoomPlus);

    hudZoomMinusBg.on('pointerdown', () => {
      let val = this.registry.get('hudZoom') || 1.0;
      val = Math.max(GAME_CONFIG.HUD_ZOOM_MIN, val - GAME_CONFIG.HUD_ZOOM_STEP);
      this.registry.set('hudZoom', val);
      hudZoomValue.setText(`${val.toFixed(2)}X`);
      this.saveSettings();
    });

    hudZoomPlusBg.on('pointerdown', () => {
      let val = this.registry.get('hudZoom') || 1.0;
      val = Math.min(GAME_CONFIG.HUD_ZOOM_MAX, val + GAME_CONFIG.HUD_ZOOM_STEP);
      this.registry.set('hudZoom', val);
      hudZoomValue.setText(`${val.toFixed(2)}X`);
      this.saveSettings();
    });

    currentY += 50;

    // Delete save button
    if (SaveSystem.hasSave()) {
      const deleteBg = this.add.rectangle(cx, currentY, 200, 32, 0x440000)
        .setInteractive({ useHandCursor: true });
      uiElements.push(deleteBg);
      const deleteBtn = this.add.bitmapText(cx, currentY, 'pixel', 'DELETE SAVE', 10)
        .setOrigin(0.5)
        .setTint(0xff4444)
        .setDepth(1);
      uiElements.push(deleteBtn);

      deleteBg.on('pointerdown', () => {
        SaveSystem.delete();
        deleteBtn.setText('DELETED');
        deleteBg.disableInteractive();
      });

      currentY += 50;
    }

    // Close button
    const closeBg = this.add.rectangle(cx, currentY, 120, 32, 0x444444)
      .setInteractive({ useHandCursor: true });
    uiElements.push(closeBg);
    const closeBtn = this.add.bitmapText(cx, currentY, 'pixel', 'CLOSE', 10)
      .setOrigin(0.5)
      .setTint(0xffffff)
      .setDepth(1);
    uiElements.push(closeBtn);

    closeBg.on('pointerdown', () => {
      uiElements.forEach(el => el.destroy());
      this.scene.restart();
    });
  }
}
