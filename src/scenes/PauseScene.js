import Phaser from 'phaser';
import { GAME_CONFIG, DEFAULT_SETTINGS } from '../config/GameConfig.js';
import { SaveSystem } from '../systems/SaveSystem.js';

export class PauseScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PauseScene' });
  }

  create() {
    const width = GAME_CONFIG.GAME_WIDTH;
    const height = GAME_CONFIG.GAME_HEIGHT;
    const cx = Math.floor(width / 2);

    // Semi-transparent overlay
    this.add.rectangle(cx, Math.floor(height / 2), width, height, 0x000000, 0.7);

    // Title
    this.add.bitmapText(cx, 50, 'pixel', 'PAUSED', 20)
      .setOrigin(0.5)
      .setTint(0xffffff);

    // Resume button
    const resumeBg = this.add.rectangle(cx, 110, 160, 36, 0x444444)
      .setInteractive({ useHandCursor: true });
    const resumeText = this.add.bitmapText(cx, 110, 'pixel', 'RESUME', 20)
      .setOrigin(0.5)
      .setTint(0xffffff);
    resumeBg
      .on('pointerover', () => resumeText.setTint(0xffaa00))
      .on('pointerout', () => resumeText.setTint(0xffffff))
      .on('pointerdown', () => this.resumeGame());

    // Save button
    const saveBg = this.add.rectangle(cx, 160, 160, 36, 0x444444)
      .setInteractive({ useHandCursor: true });
    this.saveText = this.add.bitmapText(cx, 160, 'pixel', 'SAVE GAME', 20)
      .setOrigin(0.5)
      .setTint(0xffffff);
    saveBg
      .on('pointerover', () => this.saveText.setTint(0xffaa00))
      .on('pointerout', () => this.saveText.setTint(0xffffff))
      .on('pointerdown', () => this.saveGame());

    // Settings button
    const settingsBg = this.add.rectangle(cx, 210, 160, 36, 0x444444)
      .setInteractive({ useHandCursor: true });
    const settingsText = this.add.bitmapText(cx, 210, 'pixel', 'SETTINGS', 20)
      .setOrigin(0.5)
      .setTint(0xffffff);
    settingsBg
      .on('pointerover', () => settingsText.setTint(0xffaa00))
      .on('pointerout', () => settingsText.setTint(0xffffff))
      .on('pointerdown', () => this.openSettings());

    // Respawn button
    const respawnBg = this.add.rectangle(cx, 260, 180, 36, 0x224444)
      .setInteractive({ useHandCursor: true });
    const respawnText = this.add.bitmapText(cx, 260, 'pixel', 'RESPAWN AT BASE', 20)
      .setOrigin(0.5)
      .setTint(0x66ffff);
    respawnBg
      .on('pointerover', () => respawnText.setTint(0xaaffff))
      .on('pointerout', () => respawnText.setTint(0x66ffff))
      .on('pointerdown', () => this.respawnAtBase());

    // Quit button
    const quitBg = this.add.rectangle(cx, 320, 180, 36, 0x442222)
      .setInteractive({ useHandCursor: true });
    const quitText = this.add.bitmapText(cx, 320, 'pixel', 'QUIT TO MENU', 20)
      .setOrigin(0.5)
      .setTint(0xff6666);
    quitBg
      .on('pointerover', () => quitText.setTint(0xffaaaa))
      .on('pointerout', () => quitText.setTint(0xff6666))
      .on('pointerdown', () => this.quitToMenu());

    // ESC to resume
    this.input.keyboard.on('keydown-ESC', () => this.resumeGame());
  }

  resumeGame() {
    this.scene.resume('GameScene');
    this.scene.stop();
  }

  saveGame() {
    const gameScene = this.scene.get('GameScene');

    const saveData = {
      version: '2.0',
      timestamp: Date.now(),
      worldSeed: gameScene.worldSeed,
      playerPosition: {
        x: gameScene.rover.sprite.x,
        y: gameScene.rover.sprite.y,
      },
      gameData: this.registry.get('gameData'),
      modifiedTiles: Array.from(gameScene.modifiedTiles.entries()),
      placedItems: gameScene.placedItems,
      roverState: {
        battery: gameScene.rover.battery,
        hull: gameScene.rover.hull,
        cargo: gameScene.rover.cargo,
      },
    };

    SaveSystem.save(saveData);
    this.saveText.setText('SAVED!');

    this.time.delayedCall(1000, () => {
      this.saveText.setText('SAVE GAME');
    });
  }

  saveSettings() {
    const settings = {
      soundEnabled: this.registry.get('soundEnabled'),
      debugMode: this.registry.get('debugMode'),
      gameZoom: this.registry.get('gameZoom'),
      hudZoom: this.registry.get('hudZoom'),
      devMode: this.registry.get('devMode'),
      disableDarkness: this.registry.get('disableDarkness'),
    };
    SaveSystem.saveSettings(settings);
  }

  applyGameZoom() {
    const gameScene = this.scene.get('GameScene');
    const zoom = this.registry.get('gameZoom') || 1.0;
    if (gameScene && gameScene.cameras && gameScene.cameras.main) {
      gameScene.cameras.main.setZoom(zoom);
    }
  }

  applyHudZoom() {
    // HUD zoom is applied via registry event listener in UIScene
    // The UIScene listens for 'changedata-hudZoom' and rebuilds HUD automatically
  }

  openSettings() {
    const width = GAME_CONFIG.GAME_WIDTH;
    const height = GAME_CONFIG.GAME_HEIGHT;
    const cx = Math.floor(width / 2);

    // Track all UI elements for cleanup
    const uiElements = [];

    const overlay = this.add.rectangle(cx, Math.floor(height / 2), width - 20, height - 40, 0x222222, 0.95);
    uiElements.push(overlay);

    const settingsTitle = this.add.bitmapText(cx, 30, 'pixel', 'SETTINGS', 20)
      .setOrigin(0.5)
      .setTint(0xffffff);
    uiElements.push(settingsTitle);

    let currentY = 70;

    // Sound toggle
    const soundEnabled = this.registry.get('soundEnabled') !== false;
    const soundBg = this.add.rectangle(cx, currentY, 240, 28, 0x444444)
      .setInteractive({ useHandCursor: true });
    uiElements.push(soundBg);
    const soundText = this.add.bitmapText(cx, currentY, 'pixel', `SOUND: ${soundEnabled ? 'ON' : 'OFF'}`, 10)
      .setOrigin(0.5)
      .setTint(0xffffff)
      .setDepth(1);
    uiElements.push(soundText);

    soundBg.on('pointerdown', () => {
      const newValue = this.registry.get('soundEnabled') === false;
      this.registry.set('soundEnabled', newValue);
      soundText.setText(`SOUND: ${newValue ? 'ON' : 'OFF'}`);
      this.saveSettings();
    });

    currentY += 40;

    // Game Zoom control
    const gameZoom = this.registry.get('gameZoom') || 1.0;
    const gameZoomLabel = this.add.bitmapText(cx, currentY, 'pixel', 'GAME ZOOM', 10)
      .setOrigin(0.5)
      .setTint(0x888888);
    uiElements.push(gameZoomLabel);

    currentY += 20;

    const gameZoomBg = this.add.rectangle(cx, currentY, 240, 28, 0x333333);
    uiElements.push(gameZoomBg);

    const gameZoomMinusBg = this.add.rectangle(cx - 90, currentY, 36, 24, 0x555555)
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

    const gameZoomPlusBg = this.add.rectangle(cx + 90, currentY, 36, 24, 0x555555)
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
      this.applyGameZoom();
    });

    gameZoomPlusBg.on('pointerdown', () => {
      let val = this.registry.get('gameZoom') || 1.0;
      val = Math.min(GAME_CONFIG.GAME_ZOOM_MAX, val + GAME_CONFIG.GAME_ZOOM_STEP);
      this.registry.set('gameZoom', val);
      gameZoomValue.setText(`${val.toFixed(2)}X`);
      this.saveSettings();
      this.applyGameZoom();
    });

    currentY += 40;

    // HUD Zoom control
    const hudZoom = this.registry.get('hudZoom') || 1.0;
    const hudZoomLabel = this.add.bitmapText(cx, currentY, 'pixel', 'HUD ZOOM', 10)
      .setOrigin(0.5)
      .setTint(0x888888);
    uiElements.push(hudZoomLabel);

    currentY += 20;

    const hudZoomBg = this.add.rectangle(cx, currentY, 240, 28, 0x333333);
    uiElements.push(hudZoomBg);

    const hudZoomMinusBg = this.add.rectangle(cx - 90, currentY, 36, 24, 0x555555)
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

    const hudZoomPlusBg = this.add.rectangle(cx + 90, currentY, 36, 24, 0x555555)
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
      this.applyHudZoom();
    });

    hudZoomPlusBg.on('pointerdown', () => {
      let val = this.registry.get('hudZoom') || 1.0;
      val = Math.min(GAME_CONFIG.HUD_ZOOM_MAX, val + GAME_CONFIG.HUD_ZOOM_STEP);
      this.registry.set('hudZoom', val);
      hudZoomValue.setText(`${val.toFixed(2)}X`);
      this.saveSettings();
      this.applyHudZoom();
    });

    currentY += 40;

    // Debug toggle
    const debugEnabled = this.registry.get('debugMode') === true;
    const debugBg = this.add.rectangle(cx, currentY, 240, 28, 0x444444)
      .setInteractive({ useHandCursor: true });
    uiElements.push(debugBg);
    const debugText = this.add.bitmapText(cx, currentY, 'pixel', `DEBUG: ${debugEnabled ? 'ON' : 'OFF'}`, 10)
      .setOrigin(0.5)
      .setTint(0xffffff)
      .setDepth(1);
    uiElements.push(debugText);

    debugBg.on('pointerdown', () => {
      const newValue = !this.registry.get('debugMode');
      this.registry.set('debugMode', newValue);
      debugText.setText(`DEBUG: ${newValue ? 'ON' : 'OFF'}`);
      this.saveSettings();
    });

    currentY += 40;

    // Dev Mode toggle (infinite battery and money)
    const devEnabled = this.registry.get('devMode') === true;
    const devBg = this.add.rectangle(cx, currentY, 240, 28, 0x442244)
      .setInteractive({ useHandCursor: true });
    uiElements.push(devBg);
    const devText = this.add.bitmapText(cx, currentY, 'pixel', `DEV MODE: ${devEnabled ? 'ON' : 'OFF'}`, 10)
      .setOrigin(0.5)
      .setTint(0xff88ff)
      .setDepth(1);
    uiElements.push(devText);

    // Track darkness toggle elements for showing/hiding
    let darknessElements = [];

    const createDarknessToggle = () => {
      const y = currentY;
      const darknessDisabled = this.registry.get('disableDarkness') === true;
      const darkBg = this.add.rectangle(cx, y, 240, 28, 0x224422)
        .setInteractive({ useHandCursor: true });
      uiElements.push(darkBg);
      darknessElements.push(darkBg);

      const darkText = this.add.bitmapText(cx, y, 'pixel', `DARKNESS: ${darknessDisabled ? 'OFF' : 'ON'}`, 10)
        .setOrigin(0.5)
        .setTint(0x88ff88)
        .setDepth(1);
      uiElements.push(darkText);
      darknessElements.push(darkText);

      darkBg.on('pointerdown', () => {
        const newValue = !this.registry.get('disableDarkness');
        this.registry.set('disableDarkness', newValue);
        darkText.setText(`DARKNESS: ${newValue ? 'OFF' : 'ON'}`);
        this.saveSettings();
        // Apply immediately
        const gameScene = this.scene.get('GameScene');
        if (gameScene && gameScene.lightingSystem) {
          gameScene.lightingSystem.setEnabled(!newValue);
        }
      });

      return darknessElements;
    };

    const updateDarknessVisibility = () => {
      const devOn = this.registry.get('devMode') === true;
      darknessElements.forEach(el => el.setVisible(devOn));
    };

    devBg.on('pointerdown', () => {
      const newValue = !this.registry.get('devMode');
      this.registry.set('devMode', newValue);
      devText.setText(`DEV MODE: ${newValue ? 'ON' : 'OFF'}`);
      this.saveSettings();
      updateDarknessVisibility();
    });

    currentY += 40;

    // Darkness toggle (only visible when dev mode is on)
    createDarknessToggle();
    updateDarknessVisibility();

    currentY += 40;

    // Close button
    const closeBg = this.add.rectangle(cx, currentY, 100, 28, 0x444444)
      .setInteractive({ useHandCursor: true });
    uiElements.push(closeBg);
    const closeText = this.add.bitmapText(cx, currentY, 'pixel', 'CLOSE', 10)
      .setOrigin(0.5)
      .setTint(0xffffff)
      .setDepth(1);
    uiElements.push(closeText);

    closeBg.on('pointerdown', () => {
      uiElements.forEach(el => el.destroy());
    });
  }

  quitToMenu() {
    this.scene.stop('GameScene');
    this.scene.stop('UIScene');
    this.scene.start('MenuScene');
    this.scene.stop();
  }

  respawnAtBase() {
    const gameScene = this.scene.get('GameScene');
    if (gameScene && gameScene.rover) {
      // Teleport to spawn point
      gameScene.rover.sprite.setPosition(
        GAME_CONFIG.SPAWN_X * GAME_CONFIG.TILE_SIZE,
        (GAME_CONFIG.SURFACE_HEIGHT - 1) * GAME_CONFIG.TILE_SIZE
      );
      gameScene.rover.sprite.setVelocity(0, 0);

      // Refill battery and hull
      gameScene.rover.battery = gameScene.rover.maxBattery;
      gameScene.rover.hull = gameScene.rover.maxHull;
    }
    this.resumeGame();
  }
}
