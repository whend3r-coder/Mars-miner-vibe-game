import { GAME_CONFIG, SHOP_ITEMS, UPGRADES } from '../config/GameConfig.js';

export class ShopSystem {
  constructor(scene) {
    this.scene = scene;
    this.isOpen = false;
    this.currentTab = 'items'; // 'items' or 'upgrades'
    this.uiElements = [];

    // Detect mobile for UI scaling
    this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    this.uiScale = this.isMobile ? 1.4 : 1.0;
  }

  open() {
    if (this.isOpen) return;
    this.isOpen = true;

    this.scene.scene.pause('GameScene');
    this.createShopUI();
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;

    // Destroy UI elements
    this.uiElements.forEach(el => el.destroy());
    this.uiElements = [];

    // Reset solar panel state to prevent animation glitches
    const gameScene = this.scene.scene.get('GameScene');
    if (gameScene && gameScene.rover) {
      gameScene.rover.resetSolarState();
    }

    this.scene.scene.resume('GameScene');
  }

  createShopUI() {
    const width = GAME_CONFIG.GAME_WIDTH;
    const height = GAME_CONFIG.GAME_HEIGHT;
    const cx = Math.floor(width / 2);
    const scale = this.uiScale;

    // Scaled font sizes (must be multiples of 10)
    this.smallFont = Math.max(10, Math.round(10 * scale / 10) * 10);
    this.largeFont = Math.max(10, Math.round(20 * scale / 10) * 10);

    // Background overlay
    const overlay = this.scene.add.rectangle(cx, Math.floor(height / 2), width, height, 0x000000, 0.85);
    this.uiElements.push(overlay);

    // Title
    const titleY = Math.floor(24 * scale);
    const title = this.scene.add.bitmapText(cx, titleY, 'pixel', 'SHOP', this.largeFont)
      .setOrigin(0.5)
      .setTint(0xffaa00);
    this.uiElements.push(title);

    // Money display
    const gameData = this.scene.registry.get('gameData');
    const moneyText = this.scene.add.bitmapText(width - 12, titleY, 'pixel', `$${gameData.money}`, this.largeFont)
      .setOrigin(1, 0.5)
      .setTint(0xffdd44);
    this.uiElements.push(moneyText);

    // Tab buttons
    const tabY = Math.floor(64 * scale);
    const tabWidth = Math.floor(100 * scale);
    const tabHeight = Math.floor(28 * scale);
    const tabOffset = Math.floor(80 * scale);

    const itemsTabBg = this.scene.add.rectangle(cx - tabOffset, tabY, tabWidth, tabHeight,
      this.currentTab === 'items' ? 0x333333 : 0x222222)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        this.currentTab = 'items';
        this.close();
        this.open();
      });
    this.uiElements.push(itemsTabBg);
    const itemsTabText = this.scene.add.bitmapText(cx - tabOffset, tabY, 'pixel', 'ITEMS', this.smallFont)
      .setOrigin(0.5)
      .setTint(this.currentTab === 'items' ? 0xffaa00 : 0x888888);
    this.uiElements.push(itemsTabText);

    const upgradesTabBg = this.scene.add.rectangle(cx + tabOffset, tabY, Math.floor(120 * scale), tabHeight,
      this.currentTab === 'upgrades' ? 0x333333 : 0x222222)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        this.currentTab = 'upgrades';
        this.close();
        this.open();
      });
    this.uiElements.push(upgradesTabBg);
    const upgradesTabText = this.scene.add.bitmapText(cx + tabOffset, tabY, 'pixel', 'UPGRADES', this.smallFont)
      .setOrigin(0.5)
      .setTint(this.currentTab === 'upgrades' ? 0xffaa00 : 0x888888);
    this.uiElements.push(upgradesTabText);

    // Content area
    if (this.currentTab === 'items') {
      this.createItemsTab();
    } else {
      this.createUpgradesTab();
    }

    // Close button
    const closeY = height - Math.floor(28 * scale);
    const closeBg = this.scene.add.rectangle(cx, closeY, Math.floor(140 * scale), tabHeight, 0x444444)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.close());
    this.uiElements.push(closeBg);
    const closeText = this.scene.add.bitmapText(cx, closeY, 'pixel', this.isMobile ? 'CLOSE' : 'CLOSE ESC', this.smallFont)
      .setOrigin(0.5)
      .setTint(0xffffff);
    this.uiElements.push(closeText);

    // ESC to close
    this.escKey = this.scene.input.keyboard.once('keydown-ESC', () => this.close());
  }

  createItemsTab() {
    const width = GAME_CONFIG.GAME_WIDTH;
    const cx = Math.floor(width / 2);
    const scale = this.uiScale;
    const startY = Math.floor(104 * scale);
    const itemsPerRow = 2;
    const itemWidth = Math.floor(190 * scale);
    const itemHeight = Math.floor(60 * scale);

    const items = Object.entries(SHOP_ITEMS);
    const gameData = this.scene.registry.get('gameData');

    const devMode = this.scene.registry.get('devMode');

    items.forEach(([key, item], index) => {
      const row = Math.floor(index / itemsPerRow);
      const col = index % itemsPerRow;

      const x = Math.floor(cx + (col - 0.5) * itemWidth);
      const y = startY + row * itemHeight;

      const canAfford = devMode || gameData.money >= item.cost;

      // Item box
      const box = this.scene.add.rectangle(x, y, itemWidth - 8, itemHeight - 8, canAfford ? 0x333333 : 0x222222)
        .setStrokeStyle(Math.floor(2 * scale), canAfford ? 0x666666 : 0x333333)
        .setInteractive({ useHandCursor: canAfford })
        .on('pointerover', () => canAfford && box.setFillStyle(0x444444))
        .on('pointerout', () => box.setFillStyle(canAfford ? 0x333333 : 0x222222))
        .on('pointerdown', () => canAfford && this.buyItem(key));
      this.uiElements.push(box);

      // Item name
      const nameText = this.scene.add.bitmapText(x, y - Math.floor(12 * scale), 'pixel', item.name.toUpperCase(), this.smallFont)
        .setOrigin(0.5)
        .setTint(canAfford ? 0xffffff : 0x666666);
      this.uiElements.push(nameText);

      // Item cost
      const costText = this.scene.add.bitmapText(x, y + Math.floor(12 * scale), 'pixel', `$${item.cost}`, this.smallFont)
        .setOrigin(0.5)
        .setTint(canAfford ? 0xffdd44 : 0x664422);
      this.uiElements.push(costText);

      // Item description (tooltip on hover)
      box.on('pointerover', () => {
        if (this.tooltipText) this.tooltipText.destroy();
        this.tooltipText = this.scene.add.bitmapText(cx, GAME_CONFIG.GAME_HEIGHT - Math.floor(64 * scale), 'pixel', item.description.toUpperCase(), this.smallFont)
          .setOrigin(0.5)
          .setTint(0xaaaaaa);
        this.uiElements.push(this.tooltipText);
      });
    });
  }

  createUpgradesTab() {
    const width = GAME_CONFIG.GAME_WIDTH;
    const cx = Math.floor(width / 2);
    const scale = this.uiScale;
    const startY = Math.floor(104 * scale);
    const upgradeHeight = Math.floor(36 * scale);

    const upgrades = Object.entries(UPGRADES);
    const gameData = this.scene.registry.get('gameData');
    const devMode = this.scene.registry.get('devMode');

    upgrades.forEach(([key, upgrade], index) => {
      const y = startY + index * upgradeHeight;
      const currentLevel = gameData.upgrades[key] || 0;
      const maxLevel = upgrade.levels.length - 1;
      const isMaxed = currentLevel >= maxLevel;
      const nextLevel = upgrade.levels[currentLevel + 1];
      const cost = nextLevel ? nextLevel.cost : 0;
      const canAfford = !isMaxed && (devMode || gameData.money >= cost);

      // Upgrade row
      const box = this.scene.add.rectangle(cx, y, width - Math.floor(40 * scale), upgradeHeight - 4, canAfford ? 0x333333 : 0x222222)
        .setStrokeStyle(Math.floor(2 * scale), canAfford ? 0x666666 : 0x333333)
        .setInteractive({ useHandCursor: canAfford })
        .on('pointerover', () => canAfford && box.setFillStyle(0x444444))
        .on('pointerout', () => box.setFillStyle(canAfford ? 0x333333 : 0x222222))
        .on('pointerdown', () => canAfford && this.buyUpgrade(key));
      this.uiElements.push(box);

      // Upgrade name
      const nameText = this.scene.add.bitmapText(Math.floor(40 * scale), y, 'pixel', upgrade.name.toUpperCase(), this.smallFont)
        .setOrigin(0, 0.5)
        .setTint(0xffffff);
      this.uiElements.push(nameText);

      // Level indicator
      const levelText = this.scene.add.bitmapText(cx, y, 'pixel', `LV ${currentLevel + 1}/${maxLevel + 1}`, this.smallFont)
        .setOrigin(0.5)
        .setTint(isMaxed ? 0x44ff44 : 0x888888);
      this.uiElements.push(levelText);

      // Cost
      const costStr = isMaxed ? 'MAX' : `$${cost}`;
      const costText = this.scene.add.bitmapText(width - Math.floor(40 * scale), y, 'pixel', costStr, this.smallFont)
        .setOrigin(1, 0.5)
        .setTint(isMaxed ? 0x44ff44 : (canAfford ? 0xffdd44 : 0x664422));
      this.uiElements.push(costText);
    });
  }

  buyItem(itemKey) {
    const item = SHOP_ITEMS[itemKey];
    const gameData = this.scene.registry.get('gameData');
    const devMode = this.scene.registry.get('devMode');

    if (!devMode && gameData.money < item.cost) return;

    // Try to add to inventory
    const gameScene = this.scene.scene.get('GameScene');
    if (gameScene.inventorySystem) {
      const added = gameScene.inventorySystem.addItem(itemKey);
      if (!added) {
        // Inventory full
        return;
      }
    } else {
      // Fallback - add directly to gameData inventory
      const inventory = gameData.inventory || [];
      const existingSlot = inventory.findIndex(s => s && s.type === itemKey);

      if (existingSlot >= 0 && item.stackable) {
        inventory[existingSlot].quantity++;
      } else if (inventory.length < 6) {
        inventory.push({ type: itemKey, quantity: 1 });
      } else {
        return; // Full
      }

      gameData.inventory = inventory;
    }

    // Deduct money (unless dev mode)
    if (!this.scene.registry.get('devMode')) {
      gameData.money -= item.cost;
    }
    this.scene.registry.set('gameData', gameData);

    // Refresh UI
    this.close();
    this.open();
  }

  buyUpgrade(upgradeKey) {
    const upgrade = UPGRADES[upgradeKey];
    const gameData = this.scene.registry.get('gameData');
    const devMode = this.scene.registry.get('devMode');
    const currentLevel = gameData.upgrades[upgradeKey] || 0;

    if (currentLevel >= upgrade.levels.length - 1) return;

    const nextLevel = upgrade.levels[currentLevel + 1];
    if (!devMode && gameData.money < nextLevel.cost) return;

    // Apply upgrade (don't deduct money in dev mode)
    if (!this.scene.registry.get('devMode')) {
      gameData.money -= nextLevel.cost;
    }
    gameData.upgrades[upgradeKey] = currentLevel + 1;
    this.scene.registry.set('gameData', gameData);

    // Apply upgrade effects to rover
    const gameScene = this.scene.scene.get('GameScene');
    if (gameScene) {
      this.applyUpgradeToRover(gameScene, upgradeKey, currentLevel + 1);
    }

    // Refresh UI
    this.close();
    this.open();
  }

  applyUpgradeToRover(gameScene, upgradeKey, level) {
    const upgrade = UPGRADES[upgradeKey];
    const levelData = upgrade.levels[level];
    const rover = gameScene.rover;

    switch (upgradeKey) {
      case 'batteryCapacity':
        rover.maxBattery = levelData.capacity;
        rover.battery = Math.min(rover.battery, rover.maxBattery);
        break;
      case 'hullArmor':
        rover.maxHull = levelData.hp;
        rover.hull = Math.min(rover.hull, rover.maxHull);
        break;
      case 'cargoBay':
        rover.maxCargo = levelData.slots;
        break;
      case 'thrusters':
        rover.hasThrusters = levelData.enabled;
        break;
      case 'headlights':
        // Update lighting system with new radius
        if (gameScene.lightingSystem) {
          gameScene.lightingSystem.setLightRadius(levelData.radius);
        }
        gameScene.lightRadius = levelData.radius;
        break;
      case 'movementSpeed':
        rover.speedMultiplier = levelData.multiplier;
        break;
    }
  }
}
