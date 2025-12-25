import { TILE_TYPES } from '../world/TileTypes.js';

export class Hazards {
  constructor(world, player) {
    this.world = world;
    this.player = player;
    this.lavaDamageRate = 5; // damage per second
    this.gasDamage = 20; // damage per explosion
    this.gasExplosionRadius = 2; // tiles
  }

  update(dt) {
    // Check for lava damage
    this.checkLavaDamage(dt);
  }

  checkLavaDamage(dt) {
    // Check tiles around player for lava
    const playerTileX = Math.floor(this.player.getCenterX());
    const playerTileY = Math.floor(this.player.getCenterY());

    // Check a 3x3 area around player
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const tile = this.world.getTile(playerTileX + dx, playerTileY + dy);
        if (tile.hazard === 'heat' || tile.id === TILE_TYPES.lava.id) {
          // Player is near/in lava
          this.player.takeDamage(this.lavaDamageRate * dt);
          return; // Only damage once per frame
        }
      }
    }
  }

  // Trigger gas explosion when a gas tile is drilled
  triggerGasExplosion(x, y) {
    console.log(`Gas explosion at ${x}, ${y}!`);

    // Damage player if nearby
    const playerTileX = Math.floor(this.player.getCenterX());
    const playerTileY = Math.floor(this.player.getCenterY());
    const distance = Math.sqrt(
      Math.pow(x - playerTileX, 2) + Math.pow(y - playerTileY, 2)
    );

    if (distance <= this.gasExplosionRadius) {
      this.player.takeDamage(this.gasDamage);
    }

    // Destroy tiles in radius
    for (let dy = -this.gasExplosionRadius; dy <= this.gasExplosionRadius; dy++) {
      for (let dx = -this.gasExplosionRadius; dx <= this.gasExplosionRadius; dx++) {
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= this.gasExplosionRadius) {
          const tileX = x + dx;
          const tileY = y + dy;

          // Don't destroy bedrock or other important tiles
          const tile = this.world.getTile(tileX, tileY);

          // Destroy most tiles except air
          if (tile.solid) {
            this.world.setTile(tileX, tileY, 'air');

            // Chain reaction with other gas tiles
            if (tile.hazard === 'explosion' || tile.id === TILE_TYPES.gas.id) {
              // Small delay before chain explosion
              setTimeout(() => this.triggerGasExplosion(tileX, tileY), 100);
            }
          }
        }
      }
    }
  }
}
