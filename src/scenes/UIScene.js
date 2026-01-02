import Phaser from 'phaser';
import { GAME_CONFIG, SHOP_ITEMS, UPGRADES } from '../config/GameConfig.js';
import { SaveSystem } from '../systems/SaveSystem.js';

export class UIScene extends Phaser.Scene {
  constructor() {
    super({ key: 'UIScene' });
  }

  create() {
    // Get HUD zoom scale
    this.hudScale = this.registry.get('hudZoom') || 1;

    // HUD elements
    this.createHUD();

    // Touch controls (not scaled - they need to stay in fixed positions)
    this.createTouchControls();

    // Shop UI (hidden by default)
    this.shopUI = null;
    this.repairUI = null;

    // Get reference to game scene
    const gameScene = this.scene.get('GameScene');
    gameScene.events.on('gameUpdate', this.updateHUD, this);
    gameScene.events.on('nearBuilding', this.showBuildingPrompt, this);

    // Recharge animation
    this.rechargeAnimation = null;

    // Listen for zoom changes
    this.registry.events.on('changedata-hudZoom', this.onHudZoomChange, this);
  }

  onHudZoomChange(parent, value) {
    this.hudScale = value;
    this.rebuildHUD();
  }

  rebuildHUD() {
    // Destroy existing HUD elements
    if (this.hudContainer) {
      this.hudContainer.destroy(true);
    }
    this.createHUD();
  }

  createHUD() {
    const scale = this.hudScale;
    const padding = 8;
    const width = GAME_CONFIG.GAME_WIDTH;
    const height = GAME_CONFIG.GAME_HEIGHT;
    const cx = Math.floor(width / 2);

    // Create container for HUD elements
    this.hudContainer = this.add.container(0, 0);

    // Calculate scaled font sizes (must be multiples of 10)
    const smallFont = Math.max(10, Math.round(10 * scale / 10) * 10);
    const largeFont = Math.max(10, Math.round(20 * scale / 10) * 10);

    // Top-left: Battery and Hull bars
    const barWidth = Math.floor(100 * scale);
    const barHeight = Math.floor(12 * scale);
    const barBgHeight = Math.floor(16 * scale);
    const labelOffset = Math.floor(56 * scale);
    const rowSpacing = Math.floor(24 * scale);

    // Battery bar background
    const batBg = this.add.rectangle(padding + labelOffset, padding + Math.floor(12 * scale), barWidth, barBgHeight, 0x333333)
      .setOrigin(0, 0.5);
    this.hudContainer.add(batBg);

    this.batteryBar = this.add.rectangle(padding + labelOffset, padding + Math.floor(12 * scale), barWidth, barHeight, 0x44ff44)
      .setOrigin(0, 0.5);
    this.hudContainer.add(this.batteryBar);
    this.batteryBarMaxWidth = barWidth;

    const batLabel = this.add.bitmapText(padding, padding + Math.floor(12 * scale), 'pixel', 'BAT:', smallFont)
      .setOrigin(0, 0.5)
      .setTint(0xffffff);
    this.hudContainer.add(batLabel);

    // Hull bar
    const hullBg = this.add.rectangle(padding + labelOffset, padding + Math.floor(12 * scale) + rowSpacing, barWidth, barBgHeight, 0x333333)
      .setOrigin(0, 0.5);
    this.hudContainer.add(hullBg);

    this.hullBar = this.add.rectangle(padding + labelOffset, padding + Math.floor(12 * scale) + rowSpacing, barWidth, barHeight, 0xff4444)
      .setOrigin(0, 0.5);
    this.hudContainer.add(this.hullBar);
    this.hullBarMaxWidth = barWidth;

    const hullLabel = this.add.bitmapText(padding, padding + Math.floor(12 * scale) + rowSpacing, 'pixel', 'HULL:', smallFont)
      .setOrigin(0, 0.5)
      .setTint(0xffffff);
    this.hudContainer.add(hullLabel);

    // Top-right: Money and Cargo
    this.moneyText = this.add.bitmapText(width - padding, padding, 'pixel', '$0', largeFont)
      .setOrigin(1, 0)
      .setTint(0xffdd44);
    this.hudContainer.add(this.moneyText);

    this.cargoText = this.add.bitmapText(width - padding, padding + Math.floor(28 * scale), 'pixel', 'Cargo: 0/6', smallFont)
      .setOrigin(1, 0)
      .setTint(0xaaaaaa);
    this.hudContainer.add(this.cargoText);

    // Top-center: Depth indicator
    this.depthText = this.add.bitmapText(cx, padding, 'pixel', 'Surface', smallFont)
      .setOrigin(0.5, 0)
      .setTint(0x888888);
    this.hudContainer.add(this.depthText);

    // Center: Recharge indicator
    this.rechargeText = this.add.bitmapText(cx, Math.floor(height / 2) - Math.floor(40 * scale), 'pixel', 'RECHARGING...', largeFont)
      .setOrigin(0.5)
      .setTint(0x44ff44)
      .setVisible(false);
    this.hudContainer.add(this.rechargeText);

    // Bottom: Item hotbar
    this.createHotbar();

    // Building prompt
    const promptY = height - Math.floor(100 * scale);
    this.buildingPromptBg = this.add.rectangle(cx, promptY, Math.floor(120 * scale), Math.floor(30 * scale), 0x000000, 0.7)
      .setVisible(false);
    this.hudContainer.add(this.buildingPromptBg);

    this.buildingPrompt = this.add.bitmapText(cx, promptY, 'pixel', '', smallFont)
      .setOrigin(0.5)
      .setTint(0xffffff)
      .setVisible(false);
    this.hudContainer.add(this.buildingPrompt);
  }

  createHotbar() {
    const scale = this.hudScale;
    const slotSize = Math.floor(36 * scale);
    const slotGap = Math.floor(6 * scale);
    const slots = 6;
    const hotbarY = GAME_CONFIG.GAME_HEIGHT - Math.floor(36 * scale);
    const startX = Math.floor((GAME_CONFIG.GAME_WIDTH - slots * (slotSize + slotGap)) / 2);

    const smallFont = Math.max(10, Math.round(10 * scale / 10) * 10);

    this.hotbarSlots = [];
    this.selectedSlot = 0;

    for (let i = 0; i < slots; i++) {
      const x = startX + i * (slotSize + slotGap);
      const centerX = Math.floor(x + slotSize / 2);

      const bg = this.add.rectangle(centerX, hotbarY, slotSize, slotSize, 0x333333, 0.9)
        .setStrokeStyle(Math.floor(2 * scale), i === 0 ? 0xffaa00 : 0x666666)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.selectAndUseSlot(i));
      this.hudContainer.add(bg);

      const label = this.add.bitmapText(centerX, hotbarY, 'pixel', '', smallFont)
        .setOrigin(0.5)
        .setTint(0xffffff);
      this.hudContainer.add(label);

      // Slot number
      const numLabel = this.add.bitmapText(x + Math.floor(4 * scale), hotbarY - Math.floor(slotSize / 2) + Math.floor(4 * scale), 'pixel', `${i + 1}`, smallFont)
        .setTint(0x888888);
      this.hudContainer.add(numLabel);

      this.hotbarSlots.push({ bg, label, numLabel, index: i });
    }
  }

  selectAndUseSlot(index) {
    const scale = this.hudScale;
    // Update selection highlight
    this.hotbarSlots.forEach((slot, i) => {
      slot.bg.setStrokeStyle(Math.floor(2 * scale), i === index ? 0xffaa00 : 0x666666);
    });
    this.selectedSlot = index;

    // Tell game scene to use this item
    const gameScene = this.scene.get('GameScene');
    if (gameScene && gameScene.inventorySystem) {
      gameScene.inventorySystem.selectedSlot = index;
      gameScene.inventorySystem.useSelectedItem();
    }
  }

  createTouchControls() {
    if (!this.sys.game.device.input.touch) return;

    const gameScene = this.scene.get('GameScene');

    // Virtual joystick area (left side) - bigger and moved up for better reach
    const joystickY = GAME_CONFIG.GAME_HEIGHT - 120;
    this.joystickBase = this.add.circle(90, joystickY, 60, 0x444444, 0.5);
    this.joystickThumb = this.add.circle(90, joystickY, 28, 0xffffff, 0.7);

    // Drill/Mine button (main action - bigger)
    const mineY = GAME_CONFIG.GAME_HEIGHT - 90;
    const drillBtn = this.add.circle(GAME_CONFIG.GAME_WIDTH - 70, mineY, 55, 0xff6600, 0.8)
      .setInteractive()
      .on('pointerdown', () => {
        gameScene.touchControls.drill = true;
        drillBtn.setFillStyle(0xffaa00, 1);
      })
      .on('pointerup', () => {
        gameScene.touchControls.drill = false;
        drillBtn.setFillStyle(0xff6600, 0.8);
      })
      .on('pointerout', () => {
        gameScene.touchControls.drill = false;
        drillBtn.setFillStyle(0xff6600, 0.8);
      });

    this.add.bitmapText(GAME_CONFIG.GAME_WIDTH - 70, mineY, 'pixel', 'MINE', 20)
      .setOrigin(0.5)
      .setTint(0xffffff);

    // Joystick touch handling
    this.input.on('pointerdown', (pointer) => {
      if (pointer.x < GAME_CONFIG.GAME_WIDTH / 3) {
        this.joystickActive = true;
        this.joystickStartX = pointer.x;
        this.joystickStartY = pointer.y;
      }
    });

    this.input.on('pointermove', (pointer) => {
      if (this.joystickActive) {
        const dx = pointer.x - this.joystickStartX;
        const dy = pointer.y - this.joystickStartY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxDist = 60;

        const clampedDist = Math.min(dist, maxDist);
        const angle = Math.atan2(dy, dx);

        this.joystickThumb.x = this.joystickBase.x + Math.cos(angle) * clampedDist;
        this.joystickThumb.y = this.joystickBase.y + Math.sin(angle) * clampedDist;

        // Update touch controls - includes up for climbing
        const threshold = 20;
        gameScene.touchControls.left = dx < -threshold;
        gameScene.touchControls.right = dx > threshold;
        gameScene.touchControls.up = dy < -threshold;
        gameScene.touchControls.down = dy > threshold;
      }
    });

    this.input.on('pointerup', () => {
      this.joystickActive = false;
      this.joystickThumb.x = this.joystickBase.x;
      this.joystickThumb.y = this.joystickBase.y;
      gameScene.touchControls.left = false;
      gameScene.touchControls.right = false;
      gameScene.touchControls.up = false;
      gameScene.touchControls.down = false;
    });

    // Pause button - rectangle bg + bitmapText
    const pauseBg = this.add.rectangle(GAME_CONFIG.GAME_WIDTH - 24, 68, 40, 24, 0x333333)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        this.scene.launch('PauseScene');
        this.scene.pause('GameScene');
      });

    this.add.bitmapText(GAME_CONFIG.GAME_WIDTH - 24, 68, 'pixel', 'II', 10)
      .setOrigin(0.5)
      .setTint(0xffffff);
  }

  updateHUD(data) {
    // Update battery bar
    const batteryPercent = data.battery / data.maxBattery;
    this.batteryBar.width = this.batteryBarMaxWidth * batteryPercent;
    this.batteryBar.fillColor = batteryPercent > 0.3 ? 0x44ff44 : 0xff4444;

    // Update hull bar
    const hullPercent = data.hull / data.maxHull;
    this.hullBar.width = this.hullBarMaxWidth * hullPercent;

    // Update money
    this.moneyText.setText(`$${data.money}`);

    // Update cargo
    this.cargoText.setText(`Cargo: ${data.cargo.length}/${data.maxCargo}`);

    // Update depth
    if (data.depth > 0) {
      this.depthText.setText(`Depth: ${data.depth}m`);
    } else {
      this.depthText.setText('Surface');
    }

    // Update recharge indicator
    if (data.isRecharging && data.battery < data.maxBattery) {
      this.rechargeText.setVisible(true);
    } else {
      this.rechargeText.setVisible(false);
    }

    // Update hotbar with inventory items
    const gameData = this.registry.get('gameData');
    const inventory = gameData?.inventory || [];

    this.hotbarSlots.forEach((slot, index) => {
      if (inventory[index] && inventory[index].quantity > 0) {
        const item = inventory[index];
        const abbrev = item.type.substring(0, 3).toUpperCase();
        const qty = item.quantity > 1 ? ` ${item.quantity}` : '';
        slot.label.setText(abbrev + qty);
        slot.bg.setFillStyle(0x555555, 0.8);
      } else {
        slot.label.setText('');
        slot.bg.setFillStyle(0x333333, 0.8);
      }
    });
  }

  showBuildingPrompt(buildingType) {
    if (buildingType === 'shop') {
      this.buildingPrompt.setText('E: SHOP');
      this.buildingPrompt.setVisible(true);
      this.buildingPromptBg.setVisible(true);

      // Auto-hide after 2 seconds
      this.time.delayedCall(2000, () => {
        this.buildingPrompt.setVisible(false);
        this.buildingPromptBg.setVisible(false);
      });
    } else if (buildingType === 'repair') {
      this.buildingPrompt.setText('E: REPAIR');
      this.buildingPrompt.setVisible(true);
      this.buildingPromptBg.setVisible(true);

      this.time.delayedCall(2000, () => {
        this.buildingPrompt.setVisible(false);
        this.buildingPromptBg.setVisible(false);
      });
    }
  }

  showShopUI() {
    // Implementation for shop UI overlay
  }

  showRepairUI() {
    // Implementation for repair UI overlay
  }
}
