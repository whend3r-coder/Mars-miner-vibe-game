import { CONFIG } from '../config.js';

export class SurfaceBase {
  constructor(player, economy) {
    this.player = player;
    this.economy = economy;

    // Surface zone is top few tiles
    this.surfaceDepth = 3; // tiles

    // UI state
    this.showMenu = false;
    this.menuType = null; // 'fuel', 'sell', 'repair', 'upgrade'
    this.selectedUpgrade = null;
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
      this.handleMenuInput(input);
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

  handleMenuInput(input) {
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
