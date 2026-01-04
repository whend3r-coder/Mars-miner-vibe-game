import { GAME_CONFIG, UPGRADES } from '../config/GameConfig.js';
import { TILE_TYPES, getTileTypeById } from '../config/TileTypes.js';

export class DrillSystem {
  constructor(scene) {
    this.scene = scene;
    this.rover = scene.rover;

    // Drilling state
    this.currentTarget = null;
    this.drillProgress = 0;
    this.drillDirection = null;

    // Visual elements
    this.crackOverlay = null;
    this.drillParticles = null;
    this.hasCracksSprite = false;

    // Create crack overlay sprite
    this.createCrackOverlay();
  }

  createCrackOverlay() {
    // Check if cracks spritesheet is available
    const pngSprites = this.scene.registry.get('pngSprites') || {};
    this.hasCracksSprite = pngSprites.cracksSpritesheet && this.scene.textures.exists('cracks_spritesheet');

    if (this.hasCracksSprite) {
      this.crackOverlay = this.scene.add.sprite(0, 0, 'cracks_spritesheet', 0)
        .setDepth(5)  // Above tiles, below drill animation
        .setVisible(false);
    }
  }

  update(time, delta, input) {
    const dt = delta / 1000;

    // Drilling requires holding the drill key (Space or touch drill button)
    // Movement keys alone don't trigger drilling
    if (!input.drill || this.rover.battery <= 0) {
      this.stopDrilling();
      return;
    }

    // Determine drill direction based on input
    let targetX = Math.floor(this.rover.sprite.x / GAME_CONFIG.TILE_SIZE);
    let targetY = Math.floor(this.rover.sprite.y / GAME_CONFIG.TILE_SIZE);

    // Calculate rover position within current tile (0-1 range)
    const roverTileOffsetX = (this.rover.sprite.x % GAME_CONFIG.TILE_SIZE) / GAME_CONFIG.TILE_SIZE;

    // Priority: explicit direction keys while drilling
    if (input.up && !input.down && !input.left && !input.right) {
      // Drill up
      targetY -= 1;
      this.drillDirection = 'up';
    } else if (input.down && !input.left && !input.right) {
      // Drill down
      targetY += 1;
      this.drillDirection = 'down';
    } else if (input.left && !input.right) {
      // Drill left - only if in left half of tile
      if (roverTileOffsetX > 0.5) {
        this.stopDrilling();
        return;
      }
      targetX -= 1;
      this.drillDirection = 'left';
    } else if (input.right && !input.left) {
      // Drill right - only if in right half of tile
      if (roverTileOffsetX < 0.5) {
        this.stopDrilling();
        return;
      }
      targetX += 1;
      this.drillDirection = 'right';
    } else {
      // No direction specified - drill in facing direction (with distance check)
      if (this.rover.facingRight) {
        if (roverTileOffsetX < 0.5) {
          this.stopDrilling();
          return;
        }
        targetX += 1;
        this.drillDirection = 'right';
      } else {
        if (roverTileOffsetX > 0.5) {
          this.stopDrilling();
          return;
        }
        targetX -= 1;
        this.drillDirection = 'left';
      }
    }

    const targetKey = `${targetX},${targetY}`;

    // Check if target changed
    if (this.currentTarget !== targetKey) {
      this.currentTarget = targetKey;
      this.drillProgress = 0;
    }

    // Get tile at target
    const tile = this.scene.getTileAt(targetX, targetY);

    // Check if tile is drillable
    if (!tile || !tile.solid || tile.drillTime === 0) {
      this.stopDrilling();
      return;
    }

    // Check drill power requirement
    const gameData = this.scene.registry.get('gameData');
    const drillPowerLevel = gameData?.upgrades?.drillPower || 0;
    const maxHardness = UPGRADES.drillPower.levels[drillPowerLevel].maxHardness;

    // Special handling for boulders (hardness 4)
    const isBoulder = tile.unstable && tile.hardness === 4;
    if (isBoulder) {
      // Check if player has explosive tip
      const hasExplosiveTip = this.hasExplosiveTip();
      // Drill power level 2 (maxHardness 3) is NOT enough for boulders
      // Need either explosive tip OR max drill power would need to be level 4+ (not available)
      if (!hasExplosiveTip) {
        this.stopDrilling();
        this.showNeedExplosiveTip(targetX, targetY);
        return;
      }
      // Track that we're using explosive tip for this boulder
      this.usingExplosiveTip = true;
    } else if (tile.hardness && tile.hardness > maxHardness) {
      // Can't drill this material
      this.stopDrilling();
      // Show feedback
      this.showCannotDrill(targetX, targetY);
      return;
    }

    // Start drilling
    this.rover.isDrilling = true;
    this.rover.drillDirection = this.drillDirection;

    // Force retract solar panels when drilling
    if (this.rover.solarState !== 'retracted') {
      this.rover.solarState = 'retracting';
      this.rover.solarPanelsOut = false;
      this.rover.isRecharging = false;
    }

    // Calculate drill speed
    const drillSpeedLevel = gameData?.upgrades?.drillSpeed || 0;
    const speedMultiplier = UPGRADES.drillSpeed.levels[drillSpeedLevel].multiplier;
    const drillTime = tile.drillTime / speedMultiplier;

    // Progress drilling
    this.drillProgress += dt / drillTime;

    // Update crack overlay
    this.updateCrackOverlay(targetX, targetY, this.drillProgress);

    // Check if drilling complete
    if (this.drillProgress >= 1) {
      this.completeDrill(targetX, targetY, tile);
    }
  }

  updateCrackOverlay(tileX, tileY, progress) {
    if (!this.hasCracksSprite || !this.crackOverlay) return;

    // Position at center of target tile
    const x = tileX * GAME_CONFIG.TILE_SIZE + GAME_CONFIG.TILE_SIZE / 2;
    const y = tileY * GAME_CONFIG.TILE_SIZE + GAME_CONFIG.TILE_SIZE / 2;

    this.crackOverlay.setPosition(x, y).setVisible(true);

    // Set frame based on progress (4 frames: 0, 1, 2, 3)
    const frameIndex = Math.min(3, Math.floor(progress * 4));
    this.crackOverlay.setFrame(frameIndex);

    // Rotate/flip based on drill direction
    // Sprite is oriented for drilling RIGHT (drill coming from left)
    switch (this.drillDirection) {
      case 'right':
        this.crackOverlay.setAngle(0);
        this.crackOverlay.setFlipX(false);
        this.crackOverlay.setFlipY(false);
        break;
      case 'left':
        this.crackOverlay.setAngle(0);
        this.crackOverlay.setFlipX(true);
        this.crackOverlay.setFlipY(false);
        break;
      case 'down':
        this.crackOverlay.setAngle(90);
        this.crackOverlay.setFlipX(false);
        this.crackOverlay.setFlipY(false);
        break;
      case 'up':
        this.crackOverlay.setAngle(-90);
        this.crackOverlay.setFlipX(false);
        this.crackOverlay.setFlipY(false);
        break;
    }
  }

  completeDrill(tileX, tileY, tile) {
    // If drilling a boulder with explosive tip, consume it
    if (this.usingExplosiveTip && tile.unstable) {
      this.consumeExplosiveTip();
      this.showBoulderDestroyed(tileX, tileY);
    }

    // If tile has ore, add to cargo
    if (tile.ore && tile.value) {
      const added = this.rover.addToCargo(tile.ore, tile.value);

      if (added) {
        // Show pickup feedback
        this.showOrePickup(tileX, tileY, tile.ore, tile.value);
      } else {
        // Cargo full - still destroy tile but ore is lost
        this.showCargoFull(tileX, tileY);
      }
    }

    // Check for gas explosion
    if (tile.hazard === 'explosion') {
      this.triggerExplosion(tileX, tileY);
      return;
    }

    // Replace tile with air
    this.scene.setTileAt(tileX, tileY, TILE_TYPES.air.id);

    // Reset drilling state
    this.stopDrilling();

    // Visual feedback
    this.showDrillComplete(tileX, tileY);
  }

  showBoulderDestroyed(tileX, tileY) {
    const x = Math.floor(tileX * GAME_CONFIG.TILE_SIZE + GAME_CONFIG.TILE_SIZE / 2);
    const y = tileY * GAME_CONFIG.TILE_SIZE + GAME_CONFIG.TILE_SIZE / 2;

    // Explosion effect for boulder
    this.scene.cameras.main.shake(150, 0.01);

    // Rock debris
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2;
      const particle = this.scene.add.circle(x, y, 5, 0x666666)
        .setDepth(25);

      this.scene.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * Phaser.Math.Between(30, 50),
        y: y + Math.sin(angle) * Phaser.Math.Between(30, 50),
        alpha: 0,
        scale: 0.3,
        duration: 400,
        onComplete: () => particle.destroy(),
      });
    }

    // "BOOM" text
    const text = this.scene.add.bitmapText(x, y - 20, 'pixel', 'BOOM!', 12)
      .setOrigin(0.5)
      .setTint(0xff6600)
      .setDepth(30);

    this.scene.tweens.add({
      targets: text,
      y: y - 50,
      alpha: 0,
      duration: 800,
      onComplete: () => text.destroy(),
    });
  }

  triggerExplosion(centerX, centerY) {
    const explosionRadius = 2;
    const damage = 20;

    // Damage player if in range
    const playerTileX = Math.floor(this.rover.sprite.x / GAME_CONFIG.TILE_SIZE);
    const playerTileY = Math.floor(this.rover.sprite.y / GAME_CONFIG.TILE_SIZE);

    const dist = Math.sqrt(
      Math.pow(centerX - playerTileX, 2) +
      Math.pow(centerY - playerTileY, 2)
    );

    if (dist <= explosionRadius) {
      this.rover.takeDamage(damage);
    }

    // Destroy tiles in radius
    const tilesToCheck = [];

    for (let dx = -explosionRadius; dx <= explosionRadius; dx++) {
      for (let dy = -explosionRadius; dy <= explosionRadius; dy++) {
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d <= explosionRadius) {
          tilesToCheck.push({ x: centerX + dx, y: centerY + dy });
        }
      }
    }

    // Process tiles (may trigger chain reactions)
    for (const pos of tilesToCheck) {
      const tile = this.scene.getTileAt(pos.x, pos.y);
      if (tile && tile.solid) {
        if (tile.hazard === 'explosion') {
          // Chain reaction - delayed
          this.scene.time.delayedCall(100, () => {
            this.triggerExplosion(pos.x, pos.y);
          });
        }
        this.scene.setTileAt(pos.x, pos.y, TILE_TYPES.air.id);
      }
    }

    // Visual feedback
    this.showExplosion(centerX, centerY);
    this.stopDrilling();
  }

  stopDrilling() {
    this.rover.isDrilling = false;
    this.rover.drillDirection = null;
    this.currentTarget = null;
    this.drillProgress = 0;
    this.drillDirection = null;
    this.usingExplosiveTip = false;

    // Hide crack overlay
    if (this.crackOverlay) {
      this.crackOverlay.setVisible(false);
    }
  }

  // Check if player has explosive tip in inventory
  hasExplosiveTip() {
    const gameData = this.scene.registry.get('gameData');
    const inventory = gameData?.inventory || [];

    for (const slot of inventory) {
      if (slot && slot.type === 'explosiveTip' && slot.quantity > 0) {
        return true;
      }
    }
    return false;
  }

  // Consume one explosive tip from inventory
  consumeExplosiveTip() {
    const gameData = this.scene.registry.get('gameData');
    const inventory = gameData?.inventory || [];

    for (let i = 0; i < inventory.length; i++) {
      if (inventory[i] && inventory[i].type === 'explosiveTip' && inventory[i].quantity > 0) {
        inventory[i].quantity--;
        if (inventory[i].quantity <= 0) {
          inventory[i] = null;
        }
        gameData.inventory = inventory;
        this.scene.registry.set('gameData', gameData);
        return true;
      }
    }
    return false;
  }

  showNeedExplosiveTip(tileX, tileY) {
    // Don't spam the message
    if (this.needExplosiveTipCooldown) return;
    this.needExplosiveTipCooldown = true;

    const x = Math.floor(tileX * GAME_CONFIG.TILE_SIZE + GAME_CONFIG.TILE_SIZE / 2);
    const y = tileY * GAME_CONFIG.TILE_SIZE;

    const text = this.scene.add.bitmapText(x, y, 'pixel', 'NEED EXPLOSIVE TIP', 10)
      .setOrigin(0.5)
      .setTint(0xff8844)
      .setDepth(30);

    this.scene.tweens.add({
      targets: text,
      y: y - 40,
      alpha: 0,
      duration: 1000,
      onComplete: () => {
        text.destroy();
        this.needExplosiveTipCooldown = false;
      },
    });
  }

  showOrePickup(tileX, tileY, ore, value) {
    const x = Math.floor(tileX * GAME_CONFIG.TILE_SIZE + GAME_CONFIG.TILE_SIZE / 2);
    const y = tileY * GAME_CONFIG.TILE_SIZE;

    const text = this.scene.add.bitmapText(x, y, 'pixel', `+$${value}`, 10)
      .setOrigin(0.5)
      .setTint(0xffdd44)
      .setDepth(30);

    this.scene.tweens.add({
      targets: text,
      y: y - 40,
      alpha: 0,
      duration: 800,
      onComplete: () => text.destroy(),
    });
  }

  showCargoFull(tileX, tileY) {
    const x = Math.floor(tileX * GAME_CONFIG.TILE_SIZE + GAME_CONFIG.TILE_SIZE / 2);
    const y = tileY * GAME_CONFIG.TILE_SIZE;

    const text = this.scene.add.bitmapText(x, y, 'pixel', 'CARGO FULL', 10)
      .setOrigin(0.5)
      .setTint(0xff4444)
      .setDepth(30);

    this.scene.tweens.add({
      targets: text,
      y: y - 40,
      alpha: 0,
      duration: 1000,
      onComplete: () => text.destroy(),
    });
  }

  showCannotDrill(tileX, tileY) {
    // Don't spam the message
    if (this.cannotDrillCooldown) return;
    this.cannotDrillCooldown = true;

    const x = Math.floor(tileX * GAME_CONFIG.TILE_SIZE + GAME_CONFIG.TILE_SIZE / 2);
    const y = tileY * GAME_CONFIG.TILE_SIZE;

    const text = this.scene.add.bitmapText(x, y, 'pixel', 'UPGRADE DRILL', 10)
      .setOrigin(0.5)
      .setTint(0xff8844)
      .setDepth(30);

    this.scene.tweens.add({
      targets: text,
      y: y - 40,
      alpha: 0,
      duration: 1000,
      onComplete: () => {
        text.destroy();
        this.cannotDrillCooldown = false;
      },
    });
  }

  showDrillComplete(tileX, tileY) {
    // Simple particle effect
    const x = tileX * GAME_CONFIG.TILE_SIZE + GAME_CONFIG.TILE_SIZE / 2;
    const y = tileY * GAME_CONFIG.TILE_SIZE + GAME_CONFIG.TILE_SIZE / 2;

    for (let i = 0; i < 5; i++) {
      const particle = this.scene.add.circle(x, y, 2, 0x8b4513)
        .setDepth(25);

      this.scene.tweens.add({
        targets: particle,
        x: x + Phaser.Math.Between(-20, 20),
        y: y + Phaser.Math.Between(-20, 20),
        alpha: 0,
        scale: 0,
        duration: 300,
        onComplete: () => particle.destroy(),
      });
    }
  }

  showExplosion(centerX, centerY) {
    const x = centerX * GAME_CONFIG.TILE_SIZE + GAME_CONFIG.TILE_SIZE / 2;
    const y = centerY * GAME_CONFIG.TILE_SIZE + GAME_CONFIG.TILE_SIZE / 2;

    // Flash
    this.scene.cameras.main.flash(200, 255, 100, 0);

    // Explosion circle
    const explosion = this.scene.add.circle(x, y, 10, 0xff4400)
      .setDepth(30);

    this.scene.tweens.add({
      targets: explosion,
      scale: 4,
      alpha: 0,
      duration: 300,
      onComplete: () => explosion.destroy(),
    });

    // Particles
    for (let i = 0; i < 15; i++) {
      const particle = this.scene.add.circle(x, y, 3, 0xff6600)
        .setDepth(25);

      const angle = (i / 15) * Math.PI * 2;
      const dist = Phaser.Math.Between(30, 60);

      this.scene.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        alpha: 0,
        duration: 500,
        onComplete: () => particle.destroy(),
      });
    }
  }
}
