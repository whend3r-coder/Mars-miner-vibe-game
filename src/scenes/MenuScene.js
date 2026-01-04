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

    // Detect mobile for UI scaling
    this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    this.uiScale = this.isMobile ? 1.5 : 1.0;

    // Track main menu elements for hiding when settings opens
    this.menuElements = [];

    // Load and apply settings
    this.loadSettings();

    // Check for active session (orientation change) - auto-continue
    if (SaveSystem.hasActiveSession() && SaveSystem.hasSave()) {
      SaveSystem.clearActiveSession();
      this.continueGame();
      return;  // Skip building menu UI
    }
    SaveSystem.clearActiveSession();  // Clear stale session marker

    // Title - scale font sizes (must be multiples of 10)
    const titleSize = Math.max(10, Math.round(30 * this.uiScale / 10) * 10);
    const subtitleSize = Math.max(10, Math.round(20 * this.uiScale / 10) * 10);
    const titleY = Math.floor(60 * this.uiScale);
    const subtitleY = Math.floor(110 * this.uiScale);

    const title = this.add.bitmapText(Math.floor(width / 2), titleY, 'pixel', 'MARS MINER', titleSize)
      .setOrigin(0.5)
      .setTint(0xc2703a);
    this.menuElements.push(title);

    const subtitle = this.add.bitmapText(Math.floor(width / 2), subtitleY, 'pixel', 'ROVER EDITION', subtitleSize)
      .setOrigin(0.5)
      .setTint(0x888888);
    this.menuElements.push(subtitle);

    // Check for existing save
    const hasSave = SaveSystem.hasSave();

    // Button spacing scales with UI
    const buttonSpacing = Math.floor(60 * this.uiScale);
    const firstButtonY = Math.floor(180 * this.uiScale);

    // New Game button
    const newGameBtn = this.createButton(Math.floor(width / 2), firstButtonY, 'NEW GAME', () => this.startNewGame());
    this.menuElements.push(newGameBtn.btn, newGameBtn.bg);

    // Continue button (if save exists)
    if (hasSave) {
      const continueBtn = this.createButton(Math.floor(width / 2), firstButtonY + buttonSpacing, 'CONTINUE', () => this.continueGame());
      this.menuElements.push(continueBtn.btn, continueBtn.bg);
    }

    // Settings button
    const settingsBtn = this.createButton(Math.floor(width / 2), firstButtonY + (hasSave ? buttonSpacing * 2 : buttonSpacing), 'SETTINGS', () => this.openSettings());
    this.menuElements.push(settingsBtn.btn, settingsBtn.bg);

    // Instructions - scaled text
    const smallTextSize = Math.max(10, Math.round(10 * this.uiScale / 10) * 10);
    const instructionsY = height - Math.floor(56 * this.uiScale);

    // Shorter instructions on mobile
    const instructionText = this.isMobile
      ? 'JOYSTICK:MOVE  MINE:DRILL  TAP:INTERACT'
      : 'ARROWS:MOVE  SPACE+DIR:DRILL  E:INTERACT';

    const instructions = this.add.bitmapText(Math.floor(width / 2), instructionsY, 'pixel', instructionText, smallTextSize)
      .setOrigin(0.5)
      .setTint(0x666666);
    this.menuElements.push(instructions);

    // Version
    const version = this.add.bitmapText(width - 8, height - 8, 'pixel', 'V2.0', smallTextSize)
      .setOrigin(1, 1)
      .setTint(0x444444);
    this.menuElements.push(version);
  }

  createButton(x, y, text, callback) {
    // Scale button text size (must be multiples of 10)
    const fontSize = Math.max(10, Math.round(20 * this.uiScale / 10) * 10);
    const btn = this.add.bitmapText(x, y, 'pixel', text, fontSize)
      .setOrigin(0.5)
      .setTint(0xffffff);

    // Create background rectangle - scaled padding
    const padding = Math.floor(16 * this.uiScale);
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
    // Check if save exists - warn before overwriting
    if (SaveSystem.hasSave()) {
      this.showOverwriteWarning();
      return;
    }

    this.doStartNewGame();
  }

  showOverwriteWarning() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    const cx = Math.floor(width / 2);
    const scale = this.uiScale;

    // Hide main menu elements
    this.menuElements.forEach(el => el.setVisible(false));

    // Font sizes
    const titleFont = Math.max(10, Math.round(20 * scale / 10) * 10);
    const smallFont = Math.max(10, Math.round(10 * scale / 10) * 10);

    // Track warning UI elements
    const warningElements = [];

    // Full overlay
    const overlay = this.add.rectangle(cx, Math.floor(height / 2), width, height, 0x000000, 1);
    warningElements.push(overlay);

    // Warning title
    const titleY = Math.floor(height / 2) - Math.floor(60 * scale);
    const title = this.add.bitmapText(cx, titleY, 'pixel', 'WARNING', titleFont)
      .setOrigin(0.5)
      .setTint(0xff6644);
    warningElements.push(title);

    // Warning message
    const msgY = Math.floor(height / 2) - Math.floor(20 * scale);
    const msg = this.add.bitmapText(cx, msgY, 'pixel', 'EXISTING SAVE WILL BE LOST', smallFont)
      .setOrigin(0.5)
      .setTint(0xffffff);
    warningElements.push(msg);

    const msg2 = this.add.bitmapText(cx, msgY + Math.floor(20 * scale), 'pixel', 'ARE YOU SURE?', smallFont)
      .setOrigin(0.5)
      .setTint(0xaaaaaa);
    warningElements.push(msg2);

    // Button dimensions
    const btnWidth = Math.floor(100 * scale);
    const btnHeight = Math.floor(32 * scale);
    const btnY = Math.floor(height / 2) + Math.floor(40 * scale);
    const btnSpacing = Math.floor(60 * scale);

    // Cancel button (NO)
    const cancelBg = this.add.rectangle(cx - btnSpacing, btnY, btnWidth, btnHeight, 0x444444)
      .setInteractive({ useHandCursor: true });
    warningElements.push(cancelBg);
    const cancelBtn = this.add.bitmapText(cx - btnSpacing, btnY, 'pixel', 'CANCEL', smallFont)
      .setOrigin(0.5)
      .setTint(0xffffff)
      .setDepth(1);
    warningElements.push(cancelBtn);

    cancelBg.on('pointerdown', () => {
      warningElements.forEach(el => el.destroy());
      this.menuElements.forEach(el => el.setVisible(true));
    });

    // Confirm button (YES)
    const confirmBg = this.add.rectangle(cx + btnSpacing, btnY, btnWidth, btnHeight, 0x663333)
      .setInteractive({ useHandCursor: true });
    warningElements.push(confirmBg);
    const confirmBtn = this.add.bitmapText(cx + btnSpacing, btnY, 'pixel', 'START NEW', smallFont)
      .setOrigin(0.5)
      .setTint(0xff4444)
      .setDepth(1);
    warningElements.push(confirmBtn);

    confirmBg.on('pointerdown', () => {
      warningElements.forEach(el => el.destroy());
      SaveSystem.delete();  // Delete old save
      this.doStartNewGame();
    });
  }

  doStartNewGame() {
    // Reset game data with starting equipment
    this.registry.set('gameData', {
      money: 100,
      upgrades: {
        drillSpeed: 0,
        drillPower: 0,
        batteryCapacity: 0,
        cargoBay: 0,
        hullArmor: 0,
        movementSpeed: 0,
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

      // Restore rover state (battery, hull, cargo)
      if (saveData.roverState) {
        this.registry.set('roverState', saveData.roverState);
      }

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
    const scale = this.uiScale;

    // Hide main menu elements
    this.menuElements.forEach(el => el.setVisible(false));

    // Font sizes (must be multiples of 10)
    const titleFont = Math.max(10, Math.round(20 * scale / 10) * 10);
    const smallFont = Math.max(10, Math.round(10 * scale / 10) * 10);
    const largeFont = Math.max(10, Math.round(20 * scale / 10) * 10);

    // Track all UI elements for cleanup
    const uiElements = [];

    const overlay = this.add.rectangle(cx, Math.floor(height / 2), width, height, 0x000000, 1);
    uiElements.push(overlay);

    const settingsTitle = this.add.bitmapText(cx, Math.floor(40 * scale), 'pixel', 'SETTINGS', titleFont)
      .setOrigin(0.5)
      .setTint(0xffffff);
    uiElements.push(settingsTitle);

    let currentY = Math.floor(90 * scale);

    // Scaled dimensions
    const rowWidth = Math.floor(240 * scale);
    const rowHeight = Math.floor(32 * scale);
    const rowSpacing = Math.floor(50 * scale);
    const btnWidth = Math.floor(40 * scale);
    const btnHeight = Math.floor(28 * scale);
    const btnOffset = Math.floor(90 * scale);

    // Sound toggle
    const soundEnabled = this.registry.get('soundEnabled') !== false;
    const soundBg = this.add.rectangle(cx, currentY, rowWidth, rowHeight, 0x444444)
      .setInteractive({ useHandCursor: true });
    uiElements.push(soundBg);
    const soundBtn = this.add.bitmapText(cx, currentY, 'pixel', `SOUND: ${soundEnabled ? 'ON' : 'OFF'}`, smallFont)
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

    currentY += rowSpacing;

    // Game Zoom control
    const gameZoom = this.registry.get('gameZoom') || 1.0;
    const gameZoomLabel = this.add.bitmapText(cx, currentY, 'pixel', 'GAME ZOOM', smallFont)
      .setOrigin(0.5)
      .setTint(0x888888);
    uiElements.push(gameZoomLabel);

    currentY += Math.floor(24 * scale);

    const gameZoomBg = this.add.rectangle(cx, currentY, rowWidth, rowHeight, 0x333333);
    uiElements.push(gameZoomBg);

    const gameZoomMinusBg = this.add.rectangle(cx - btnOffset, currentY, btnWidth, btnHeight, 0x555555)
      .setInteractive({ useHandCursor: true });
    uiElements.push(gameZoomMinusBg);
    const gameZoomMinus = this.add.bitmapText(cx - btnOffset, currentY, 'pixel', '-', largeFont)
      .setOrigin(0.5)
      .setTint(0xffffff)
      .setDepth(1);
    uiElements.push(gameZoomMinus);

    const gameZoomValue = this.add.bitmapText(cx, currentY, 'pixel', `${gameZoom.toFixed(2)}X`, smallFont)
      .setOrigin(0.5)
      .setTint(0xffaa00)
      .setDepth(1);
    uiElements.push(gameZoomValue);

    const gameZoomPlusBg = this.add.rectangle(cx + btnOffset, currentY, btnWidth, btnHeight, 0x555555)
      .setInteractive({ useHandCursor: true });
    uiElements.push(gameZoomPlusBg);
    const gameZoomPlus = this.add.bitmapText(cx + btnOffset, currentY, 'pixel', '+', largeFont)
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

    currentY += rowSpacing;

    // HUD Zoom control
    const hudZoom = this.registry.get('hudZoom') || 1.0;
    const hudZoomLabel = this.add.bitmapText(cx, currentY, 'pixel', 'HUD ZOOM', smallFont)
      .setOrigin(0.5)
      .setTint(0x888888);
    uiElements.push(hudZoomLabel);

    currentY += Math.floor(24 * scale);

    const hudZoomBg = this.add.rectangle(cx, currentY, rowWidth, rowHeight, 0x333333);
    uiElements.push(hudZoomBg);

    const hudZoomMinusBg = this.add.rectangle(cx - btnOffset, currentY, btnWidth, btnHeight, 0x555555)
      .setInteractive({ useHandCursor: true });
    uiElements.push(hudZoomMinusBg);
    const hudZoomMinus = this.add.bitmapText(cx - btnOffset, currentY, 'pixel', '-', largeFont)
      .setOrigin(0.5)
      .setTint(0xffffff)
      .setDepth(1);
    uiElements.push(hudZoomMinus);

    const hudZoomValue = this.add.bitmapText(cx, currentY, 'pixel', `${hudZoom.toFixed(2)}X`, smallFont)
      .setOrigin(0.5)
      .setTint(0xffaa00)
      .setDepth(1);
    uiElements.push(hudZoomValue);

    const hudZoomPlusBg = this.add.rectangle(cx + btnOffset, currentY, btnWidth, btnHeight, 0x555555)
      .setInteractive({ useHandCursor: true });
    uiElements.push(hudZoomPlusBg);
    const hudZoomPlus = this.add.bitmapText(cx + btnOffset, currentY, 'pixel', '+', largeFont)
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

    currentY += rowSpacing;

    // Delete save button
    if (SaveSystem.hasSave()) {
      const deleteBg = this.add.rectangle(cx, currentY, Math.floor(200 * scale), rowHeight, 0x440000)
        .setInteractive({ useHandCursor: true });
      uiElements.push(deleteBg);
      const deleteBtn = this.add.bitmapText(cx, currentY, 'pixel', 'DELETE SAVE', smallFont)
        .setOrigin(0.5)
        .setTint(0xff4444)
        .setDepth(1);
      uiElements.push(deleteBtn);

      deleteBg.on('pointerdown', () => {
        SaveSystem.delete();
        deleteBtn.setText('DELETED');
        deleteBg.disableInteractive();
      });

      currentY += rowSpacing;
    }

    // Close button
    const closeBg = this.add.rectangle(cx, currentY, Math.floor(120 * scale), rowHeight, 0x444444)
      .setInteractive({ useHandCursor: true });
    uiElements.push(closeBg);
    const closeBtn = this.add.bitmapText(cx, currentY, 'pixel', 'CLOSE', smallFont)
      .setOrigin(0.5)
      .setTint(0xffffff)
      .setDepth(1);
    uiElements.push(closeBtn);

    closeBg.on('pointerdown', () => {
      // Show menu elements again
      this.menuElements.forEach(el => el.setVisible(true));
      // Destroy settings UI elements
      uiElements.forEach(el => el.destroy());
    });
  }
}
