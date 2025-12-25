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

    // Convert touch from canvas to screen coordinates
    const canvasScale = touchControls.canvas.width / CONFIG.INTERNAL_WIDTH;
    const touchX = touch.x * canvasScale;
    const touchY = touch.y * canvasScale;

    // Add debug info
    if (this.renderer) {
      this.renderer.debugInfo.push(`Touch Debug (${this.menuType || 'none'}):`);
      this.renderer.debugInfo.push(`Canvas: ${touch.x.toFixed(0)}, ${touch.y.toFixed(0)}`);
      this.renderer.debugInfo.push(`Screen: ${touchX.toFixed(0)}, ${touchY.toFixed(0)}`);
      this.renderer.debugInfo.push(`Center: ${centerX.toFixed(0)}, ${centerY.toFixed(0)}`);
      this.renderer.debugInfo.push(`Scale: ${scale.toFixed(2)}, CanvasScale: ${canvasScale.toFixed(2)}`);
      this.renderer.debugInfo.push(`Canvas size: ${touchControls.canvas.width}x${touchControls.canvas.height}`);
      this.renderer.debugInfo.push(`Internal: ${CONFIG.INTERNAL_WIDTH}x${CONFIG.INTERNAL_HEIGHT}`);
    }

    console.log('Touch detected:', {
      canvasTouch: { x: touch.x, y: touch.y },
      screenTouch: { x: touchX, y: touchY },
      menuCenter: { x: centerX, y: centerY },
      scale, canvasScale
    });

    if (this.menuType === 'main') {
      // Check close button (X button at top right of menu)
      const closeBtn = { x: centerX + 50 * scale, y: centerY - 55 * scale, w: 20 * scale, h: 10 * scale };
      console.log('Close button hitbox:', closeBtn);

      if (this.isPointInRect(touchX, touchY, closeBtn.x, closeBtn.y, closeBtn.w, closeBtn.h)) {
        console.log('Close button clicked!');
        if (this.renderer) {
          this.renderer.debugInfo.push('ACTION: Close button clicked');
        }
        this.closeMenu();
        return;
      }

      // Check main menu option buttons (larger hitboxes for touch)
      const options = [
        { y: centerY - 15 * scale, action: () => this.refuelFull(), name: 'Refuel' },
        { y: centerY - 3 * scale, action: () => this.sellAll(), name: 'Sell' },
        { y: centerY + 9 * scale, action: () => this.repairFull(), name: 'Repair' },
        { y: centerY + 21 * scale, action: () => this.openMenu('upgrade'), name: 'Upgrades' },
        { y: centerY + 33 * scale, action: () => this.saveGame(), name: 'Save' },
      ];

      for (const option of options) {
        // Larger hitbox: 140 wide, 16 tall, centered on text
        const hitbox = { x: centerX - 70 * scale, y: option.y - 10 * scale, w: 140 * scale, h: 16 * scale };
        if (this.isPointInRect(touchX, touchY, hitbox.x, hitbox.y, hitbox.w, hitbox.h)) {
          console.log(`Menu option clicked: ${option.name}`, hitbox);
          if (this.renderer) {
            this.renderer.debugInfo.push(`ACTION: ${option.name} clicked`);
          }
          option.action();
          return;
        }
      }
      console.log('No menu option clicked');
      if (this.renderer) {
        this.renderer.debugInfo.push('ACTION: No button clicked');
      }
    } else if (this.menuType === 'upgrade') {
      // Check back button (larger hitbox)
      if (this.isPointInRect(touchX, touchY, centerX - 30 * scale, centerY + 40 * scale, 60 * scale, 16 * scale)) {
        if (this.renderer) {
          this.renderer.debugInfo.push('ACTION: Back button clicked');
        }
        this.openMenu('main');
        return;
      }

      // Check upgrade option buttons (larger hitboxes)
      const upgrades = [
        { y: centerY - 25 * scale, type: 'drillSpeed' },
        { y: centerY - 11 * scale, type: 'drillPower' },
        { y: centerY + 3 * scale, type: 'fuelTank' },
        { y: centerY + 17 * scale, type: 'cargoBay' },
        { y: centerY + 31 * scale, type: 'hull' },
      ];

      for (const upgrade of upgrades) {
        // Larger hitbox: 160 wide, 16 tall
        if (this.isPointInRect(touchX, touchY, centerX - 80 * scale, upgrade.y - 8 * scale, 160 * scale, 16 * scale)) {
          if (this.renderer) {
            this.renderer.debugInfo.push(`ACTION: Upgrade ${upgrade.type} clicked`);
          }
          this.buyUpgrade(upgrade.type);
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
