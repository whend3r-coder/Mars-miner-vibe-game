import { CONFIG } from '../config.js';
import { TILE_TYPES } from '../world/TileTypes.js';

export class Economy {
  constructor(player) {
    this.player = player;

    // Upgrade definitions
    this.upgrades = {
      drillSpeed: {
        name: 'Drill Speed',
        description: 'Drill faster through materials',
        levels: [
          { cost: 100, multiplier: 1.25 },
          { cost: 300, multiplier: 1.5 },
          { cost: 800, multiplier: 2.0 },
          { cost: 2000, multiplier: 3.0 },
        ],
        currentLevel: 0,
      },
      drillPower: {
        name: 'Drill Power',
        description: 'Break through harder materials',
        levels: [
          { cost: 200, drillLevel: 2, info: 'Can drill rock' },
          { cost: 500, drillLevel: 3, info: 'Can drill hard rock (deeper layers)' },
          { cost: 1500, drillLevel: 4, info: 'Can drill any material' },
        ],
        currentLevel: 0,
      },
      fuelTank: {
        name: 'Fuel Tank',
        description: 'Increase maximum fuel capacity',
        levels: [
          { cost: 150, capacity: 150 },
          { cost: 400, capacity: 200 },
          { cost: 900, capacity: 300 },
          { cost: 2500, capacity: 500 },
        ],
        currentLevel: 0,
      },
      cargoBay: {
        name: 'Cargo Bay',
        description: 'Carry more ore per trip',
        levels: [
          { cost: 250, capacity: 6 },
          { cost: 600, capacity: 8 },
          { cost: 1200, capacity: 12 },
          { cost: 3000, capacity: 20 },
        ],
        currentLevel: 0,
      },
      hull: {
        name: 'Hull Armor',
        description: 'Increase maximum hull strength',
        levels: [
          { cost: 300, capacity: 150 },
          { cost: 700, capacity: 200 },
          { cost: 1500, capacity: 300 },
          { cost: 4000, capacity: 500 },
        ],
        currentLevel: 0,
      },
    };
  }

  // Calculate total value of cargo
  getCargoValue() {
    let total = 0;
    for (const oreName of this.player.cargo) {
      // Find the tile type for this ore
      const tileType = Object.values(TILE_TYPES).find(t => t.ore === oreName);
      if (tileType && tileType.value) {
        total += tileType.value;
      }
    }
    return total;
  }

  // Sell all cargo
  sellCargo() {
    const value = this.getCargoValue();
    this.player.money += value;
    this.player.clearCargo();
    return value;
  }

  // Refuel
  refuel(amount = null) {
    const amountToFuel = amount === null
      ? this.player.maxFuel - this.player.fuel
      : Math.min(amount, this.player.maxFuel - this.player.fuel);

    const cost = Math.ceil(amountToFuel * CONFIG.FUEL_PRICE_PER_UNIT);

    if (this.player.money >= cost) {
      this.player.money -= cost;
      this.player.addFuel(amountToFuel);
      return { success: true, amount: amountToFuel, cost };
    }

    return { success: false, cost };
  }

  // Repair hull
  repair(amount = null) {
    const amountToRepair = amount === null
      ? this.player.maxHull - this.player.hull
      : Math.min(amount, this.player.maxHull - this.player.hull);

    const cost = Math.ceil(amountToRepair * CONFIG.REPAIR_PRICE_PER_HP);

    if (this.player.money >= cost) {
      this.player.money -= cost;
      this.player.repair(amountToRepair);
      return { success: true, amount: amountToRepair, cost };
    }

    return { success: false, cost };
  }

  // Purchase upgrade
  purchaseUpgrade(upgradeType) {
    const upgrade = this.upgrades[upgradeType];
    if (!upgrade) return { success: false, error: 'Invalid upgrade type' };

    const currentLevel = upgrade.currentLevel;
    if (currentLevel >= upgrade.levels.length) {
      return { success: false, error: 'Max level reached' };
    }

    const levelData = upgrade.levels[currentLevel];
    const cost = levelData.cost;

    if (this.player.money < cost) {
      return { success: false, error: 'Not enough money', cost };
    }

    // Purchase upgrade
    this.player.money -= cost;
    upgrade.currentLevel++;

    // Apply upgrade effects
    this.applyUpgrade(upgradeType, levelData);

    return { success: true, cost, level: upgrade.currentLevel };
  }

  applyUpgrade(upgradeType, levelData) {
    switch (upgradeType) {
      case 'drillSpeed':
        this.player.drillSpeed = levelData.multiplier;
        break;
      case 'drillPower':
        this.player.drillLevel = levelData.drillLevel;
        break;
      case 'fuelTank':
        this.player.maxFuel = levelData.capacity;
        // Top up fuel when upgrading
        this.player.fuel = Math.min(this.player.fuel + 50, this.player.maxFuel);
        break;
      case 'cargoBay':
        this.player.maxCargo = levelData.capacity;
        break;
      case 'hull':
        this.player.maxHull = levelData.capacity;
        // Heal a bit when upgrading
        this.player.hull = Math.min(this.player.hull + 50, this.player.maxHull);
        break;
    }
  }

  // Get next upgrade info
  getUpgradeInfo(upgradeType) {
    const upgrade = this.upgrades[upgradeType];
    if (!upgrade) return null;

    const currentLevel = upgrade.currentLevel;
    const maxLevel = upgrade.levels.length;
    const isMaxed = currentLevel >= maxLevel;

    const nextLevel = isMaxed ? null : upgrade.levels[currentLevel];

    return {
      name: upgrade.name,
      description: upgrade.description,
      currentLevel,
      maxLevel,
      isMaxed,
      nextCost: nextLevel?.cost,
      nextLevel: nextLevel,
    };
  }

  // Get all upgrades info
  getAllUpgrades() {
    return Object.keys(this.upgrades).map(type => ({
      type,
      ...this.getUpgradeInfo(type)
    }));
  }
}
