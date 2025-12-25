import { CONFIG } from '../config.js';

export class SurfaceBase {
  constructor(player, economy, game = null) {
    this.player = player;
    this.economy = economy;
    this.game = game;
    this.renderer = null; // Set via setRenderer()

    // Surface zone is top few tiles
    this.surfaceDepth = 3; // tiles

    // UI state
    this.showMenu = false;
    this.menuType = null; // 'main', 'upgrade'
    this.selectedUpgrade = null;
  }

  setRenderer(renderer) {
    this.renderer = renderer;
  }

  update(input, touchControls = null) {
    const atSurface = this.isAtSurface();

    // Show/hide surface button on touch controls
    if (touchControls) {
      touchControls.setSurfaceButtonVisible(atSurface && !this.showMenu, () => {
        this.openMenu('main');
      });
    }

    // Auto-open menu when at surface
    if (atSurface && !this.showMenu) {
      // Check if player pressed a key to open menu
      if (input.isKeyPressed('KeyE') || input.isKeyPressed('Space')) {
        this.openMenu('main');
      }
    }

    // Close menu when pressing escape
    if (this.showMenu && input.isKeyPressed('Escape')) {
      this.closeMenu();
    }

    // Handle menu interactions
    if (this.showMenu) {
      this.handleMenuInput(input, touchControls);
    }
  }

  isAtSurface() {
    return this.player.y < this.surfaceDepth;
  }

  openMenu(type = 'main') {
    this.showMenu = true;
    this.menuType = type;
  }

  closeMenu() {
    this.showMenu = false;
    this.menuType = null;
    this.selectedUpgrade = null;
  }

  handleMenuInput(input, touchControls = null) {
    // Handle touch input if available
    if (touchControls && touchControls.enabled) {
      this.handleTouchMenuInput(touchControls);
    }

    // Number key selections for main menu
    if (this.menuType === 'main') {
      if (input.isKeyPressed('Digit1')) {
        this.refuelFull();
      } else if (input.isKeyPressed('Digit2')) {
        this.sellAll();
      } else if (input.isKeyPressed('Digit3')) {
        this.repairFull();
      } else if (input.isKeyPressed('Digit4')) {
        this.openMenu('upgrade');
      } else if (input.isKeyPressed('Digit5')) {
        this.saveGame();
      }
    }

    // Upgrade menu
    if (this.menuType === 'upgrade') {
      if (input.isKeyPressed('Digit1')) {
        this.buyUpgrade('drillSpeed');
      } else if (input.isKeyPressed('Digit2')) {
        this.buyUpgrade('drillPower');
      } else if (input.isKeyPressed('Digit3')) {
        this.buyUpgrade('fuelTank');
      } else if (input.isKeyPressed('Digit4')) {
        this.buyUpgrade('cargoBay');
      } else if (input.isKeyPressed('Digit5')) {
        this.buyUpgrade('hull');
      } else if (input.isKeyPressed('KeyB') || input.isKeyPressed('Escape')) {
        this.openMenu('main');
      }
    }
  }

  handleTouchMenuInput(touchControls) {
    // Get last touch position in canvas coordinates
    const touch = touchControls.getLastTouch();
    if (!touch || !touch.justReleased) return;

    // Get menu layout from renderer (screen coordinates)
    if (!this.menuLayout) {
      console.warn('Menu layout not set! Touch detection will not work.');
      if (this.renderer) {
        this.renderer.debugInfo.push('ERROR: Menu layout not set!');
      }
      return;
    }
    const { centerX, centerY, scale } = this.menuLayout;

    // Touch coordinates are already in canvas space (native resolution)
    // No conversion needed since canvas is now at native resolution
    const touchX = touch.x;
    const touchY = touch.y;

    // Add debug info
    if (this.renderer) {
      this.renderer.debugInfo.push(`Touch Debug (${this.menuType || 'none'}):`);
      this.renderer.debugInfo.push(`Touch: ${touchX.toFixed(0)}, ${touchY.toFixed(0)}`);
      this.renderer.debugInfo.push(`Center: ${centerX.toFixed(0)}, ${centerY.toFixed(0)}`);
      this.renderer.debugInfo.push(`Scale: ${scale.toFixed(2)}`);
      this.renderer.debugInfo.push(`Canvas: ${touchControls.canvas.width}x${touchControls.canvas.height}`);
    }

    console.log('Touch detected:', {
      touch: { x: touchX, y: touchY },
      menuCenter: { x: centerX, y: centerY },
      scale
    });

    if (this.menuType === 'main') {
      // Check close button (larger button at top right) - MUST match renderer
      const closeBtnSize = 40 * scale;
      const closeBtnX = centerX + 80 * scale;
      const closeBtnY = centerY - 70 * scale;

      if (this.isPointInRect(touchX, touchY, closeBtnX, closeBtnY, closeBtnSize, closeBtnSize)) {
        console.log('Close button clicked!');
        if (this.renderer) {
          this.renderer.debugInfo.push('ACTION: Close button clicked');
        }
        this.closeMenu();
        return;
      }

      // Check main menu option buttons - MUST match renderer layout
      const buttonWidth = 160 * scale;
      const buttonHeight = 24 * scale;
      const buttonSpacing = 6 * scale;
      const startY = centerY - 18 * scale;

      const options = [
        { action: () => this.refuelFull(), name: 'Refuel' },
        { action: () => this.sellAll(), name: 'Sell' },
        { action: () => this.repairFull(), name: 'Repair' },
        { action: () => this.openMenu('upgrade'), name: 'Upgrades' },
        { action: () => this.saveGame(), name: 'Save' },
      ];

      for (let i = 0; i < options.length; i++) {
        const y = startY + i * (buttonHeight + buttonSpacing);
        const btnX = centerX - buttonWidth / 2;
        const btnY = y - buttonHeight / 2;

        if (this.isPointInRect(touchX, touchY, btnX, btnY, buttonWidth, buttonHeight)) {
          console.log(`Menu option clicked: ${options[i].name}`);
          if (this.renderer) {
            this.renderer.debugInfo.push(`ACTION: ${options[i].name} clicked`);
          }
          options[i].action();
          return;
        }
      }
      console.log('No menu option clicked');
      if (this.renderer) {
        this.renderer.debugInfo.push('ACTION: No button clicked');
      }
    } else if (this.menuType === 'upgrade') {
      // Check back button - MUST match renderer
      const backBtnWidth = 100 * scale;
      const backBtnHeight = 35 * scale;
      const backBtnX = centerX - backBtnWidth / 2;
      const backBtnY = centerY + 48 * scale;

      if (this.isPointInRect(touchX, touchY, backBtnX, backBtnY, backBtnWidth, backBtnHeight)) {
        if (this.renderer) {
          this.renderer.debugInfo.push('ACTION: Back button clicked');
        }
        this.openMenu('main');
        return;
      }

      // Check upgrade option buttons - MUST match renderer layout
      const buttonWidth = 180 * scale;
      const buttonHeight = 28 * scale;
      const buttonSpacing = 4 * scale;
      const startY = centerY - 25 * scale;

      const upgradeTypes = ['drillSpeed', 'drillPower', 'fuelTank', 'cargoBay', 'hull'];

      for (let i = 0; i < upgradeTypes.length; i++) {
        const y = startY + i * (buttonHeight + buttonSpacing);
        const btnX = centerX - buttonWidth / 2;
        const btnY = y - buttonHeight / 2;

        if (this.isPointInRect(touchX, touchY, btnX, btnY, buttonWidth, buttonHeight)) {
          if (this.renderer) {
            this.renderer.debugInfo.push(`ACTION: Upgrade ${upgradeTypes[i]} clicked`);
          }
          this.buyUpgrade(upgradeTypes[i]);
          return;
        }
      }
      if (this.renderer) {
        this.renderer.debugInfo.push('ACTION: No upgrade clicked');
      }
    }
  }

  isPointInRect(px, py, rx, ry, rw, rh) {
    return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
  }

  refuelFull() {
    const result = this.economy.refuel();
    if (result.success) {
      console.log(`Refueled ${result.amount.toFixed(1)} units for $${result.cost}`);
    } else {
      console.log(`Not enough money! Need $${result.cost}`);
    }
  }

  sellAll() {
    const value = this.economy.sellCargo();
    if (value > 0) {
      console.log(`Sold cargo for $${value}! Total money: $${this.player.money}`);
    } else {
      console.log('No cargo to sell!');
    }
  }

  repairFull() {
    const result = this.economy.repair();
    if (result.success) {
      console.log(`Repaired ${result.amount.toFixed(1)} HP for $${result.cost}`);
    } else {
      console.log(`Not enough money! Need $${result.cost}`);
    }
  }

  buyUpgrade(upgradeType) {
    const result = this.economy.purchaseUpgrade(upgradeType);
    if (result.success) {
      const info = this.economy.getUpgradeInfo(upgradeType);
      console.log(`Purchased ${info.name} Level ${result.level} for $${result.cost}!`);
    } else {
      console.log(`Cannot purchase: ${result.error}`);
    }
  }

  saveGame() {
    if (this.game && this.game.saveGame) {
      this.game.saveGame();
      console.log('Game saved manually!');
    } else {
      console.warn('Cannot save: game instance not available');
    }
  }

  // Get menu state for rendering
  getMenuState() {
    if (!this.showMenu) return null;

    return {
      type: this.menuType,
      player: {
        money: this.player.money,
        fuel: this.player.fuel,
        maxFuel: this.player.maxFuel,
        hull: this.player.hull,
        maxHull: this.player.maxHull,
        cargo: this.player.cargo,
        cargoValue: this.economy.getCargoValue(),
      },
      economy: {
        refuelCost: Math.ceil((this.player.maxFuel - this.player.fuel) * CONFIG.FUEL_PRICE_PER_UNIT),
        repairCost: Math.ceil((this.player.maxHull - this.player.hull) * CONFIG.REPAIR_PRICE_PER_HP),
        upgrades: this.economy.getAllUpgrades(),
      }
    };
  }
}
