import { CONFIG } from '../config.js';

export class DrillingSystem {
  constructor(player, world) {
    this.player = player;
    this.world = world;
    this.drillProgress = 0;
    this.targetTile = null;
  }

  update(dt, input) {
    const isDrillingDown = input.isDrilling();

    if (isDrillingDown) {
      // Find tile below player
      const tileX = Math.floor(this.player.getCenterX());
      const tileY = Math.floor(this.player.y + this.player.height + 0.5);

      // Check if tile is in range and solid
      const tile = this.world.getTile(tileX, tileY);

      if (tile.solid) {
        // Check if we have the required drill level
        const requiresDrill = tile.requiresDrill || 0;
        if (requiresDrill > this.player.drillLevel) {
          this.cancelDrill();
          return;
        }

        // Start or continue drilling
        if (!this.targetTile || this.targetTile.x !== tileX || this.targetTile.y !== tileY) {
          this.startDrill(tileX, tileY, tile);
        }

        // Consume fuel while drilling
        const fuelCost = CONFIG.FUEL_DRILL * dt;
        if (!this.player.consumeFuel(fuelCost)) {
          this.cancelDrill();
          return;
        }

        // Progress based on drill level and tile hardness
        const drillSpeed = this.player.drillSpeed;
        const tileTime = tile.drillTime / drillSpeed;
        this.drillProgress += dt / tileTime;

        // Complete drilling
        if (this.drillProgress >= 1) {
          this.completeDrill();
        }

        this.player.drilling = true;
      } else {
        this.cancelDrill();
      }
    } else {
      this.cancelDrill();
    }
  }

  startDrill(tileX, tileY, tile) {
    this.targetTile = { x: tileX, y: tileY, type: tile };
    this.drillProgress = 0;
  }

  completeDrill() {
    if (!this.targetTile) return;

    const tile = this.targetTile.type;

    // Collect ore if present
    if (tile.ore && this.player.hasCargoSpace()) {
      this.player.addToCargo(tile.ore);
    }

    // Remove tile from world
    this.world.setTile(this.targetTile.x, this.targetTile.y, 'air');

    // TODO: Handle hazards (gas, lava)
    // if (tile.hazard === 'explosion') {
    //   triggerGasExplosion(this.targetTile.x, this.targetTile.y);
    // }

    this.targetTile = null;
    this.drillProgress = 0;
  }

  cancelDrill() {
    this.targetTile = null;
    this.drillProgress = 0;
    this.player.drilling = false;
  }

  getProgress() {
    return this.drillProgress;
  }

  getTargetTile() {
    return this.targetTile;
  }
}
