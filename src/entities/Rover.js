import Phaser from 'phaser';
import { GAME_CONFIG, UPGRADES } from '../config/GameConfig.js';

export class Rover {
  constructor(scene, x, y) {
    this.scene = scene;

    // Get upgrade levels
    const gameData = scene.registry.get('gameData');
    const upgrades = gameData?.upgrades || {};

    // Calculate stats from upgrades
    this.maxBattery = UPGRADES.batteryCapacity.levels[upgrades.batteryCapacity || 0].capacity;
    this.maxHull = UPGRADES.hullArmor.levels[upgrades.hullArmor || 0].hp;
    this.maxCargo = UPGRADES.cargoBay.levels[upgrades.cargoBay || 0].slots;
    this.hasThrusters = UPGRADES.thrusters.levels[upgrades.thrusters || 0].enabled;

    // Current stats
    this.battery = this.maxBattery;
    this.hull = this.maxHull;
    this.cargo = gameData?.cargo || [];

    // Check if PNG sprites with animations are available
    const pngSprites = scene.registry.get('pngSprites') || {};
    this.hasAnimatedSprites = pngSprites.rover || false;
    this.hasDirectionalSprites = pngSprites.roverSide && pngSprites.roverFront && pngSprites.roverBack;
    this.hasDrillSpritesheet = pngSprites.roverDrillSpritesheet && scene.textures.exists('rover_drill_spritesheet');
    this.hasDrillDownSpritesheet = pngSprites.roverDrillDownSpritesheet && scene.textures.exists('rover_drill_down_spritesheet');
    this.hasDrillUpSpritesheet = pngSprites.roverDrillUpSpritesheet && scene.textures.exists('rover_drill_up_spritesheet');
    this.hasSolarSpritesheet = pngSprites.roverSolarSpritesheet && scene.textures.exists('rover_solar_spritesheet');

    // Create sprite with physics - use spritesheet if available for animations
    if (this.hasAnimatedSprites && scene.textures.exists('rover_spritesheet')) {
      this.sprite = scene.physics.add.sprite(x, y, 'rover_spritesheet', 0);
    } else {
      this.sprite = scene.physics.add.sprite(x, y, 'rover');
    }

    // Track current sprite mode for texture switching
    this.currentSpriteMode = 'normal';  // 'normal' or 'drill'
    this.sprite.setCollideWorldBounds(true);

    // Set collision box - wider to prevent wheel clipping into walls
    const bodyWidth = GAME_CONFIG.TILE_SIZE * 0.96;  // Nearly full width
    const bodyHeight = GAME_CONFIG.TILE_SIZE * 0.7;
    this.sprite.setSize(bodyWidth, bodyHeight);
    this.sprite.setOffset((GAME_CONFIG.TILE_SIZE - bodyWidth) / 2, GAME_CONFIG.TILE_SIZE - bodyHeight);
    this.sprite.setDepth(10);

    // Physics properties
    this.sprite.body.setMaxVelocityY(GAME_CONFIG.MAX_FALL_SPEED);
    this.sprite.body.setDragX(2000);  // High drag for snappy stops
    this.sprite.body.setMaxVelocityX(GAME_CONFIG.MOVE_SPEED);  // Cap horizontal speed

    // Add collision with solid tiles
    scene.physics.add.collider(this.sprite, scene.solidTiles);

    // State
    this.isGrounded = false;
    this.isClimbing = false;
    this.isDrilling = false;
    this.isRecharging = false;
    this.drillDirection = null;
    this.facingRight = true;
    this.isUsingThrusters = false;
    this.movementDirection = 'side'; // 'side', 'front', 'back'

    // Fall damage tracking
    this.fallStartY = null;
    this.wasFalling = false;

    // Solar panel state
    this.solarState = 'retracted'; // 'retracted', 'deploying', 'deployed', 'retracting'
    this.solarPanelsOut = false;   // True when panels are fully deployed (can charge)
  }

  update(time, delta, input) {
    const dt = delta / 1000;

    // Check if grounded
    const wasGrounded = this.isGrounded;
    this.isGrounded = this.sprite.body.blocked.down || this.sprite.body.touching.down;

    // Fall damage tracking
    this.checkFallDamage(wasGrounded);

    // Check if on surface for recharging (at or above surface level)
    const isOnSurface = this.sprite.y <= (GAME_CONFIG.SURFACE_HEIGHT + 1) * GAME_CONFIG.TILE_SIZE;
    const isStandingStill = this.isGrounded && Math.abs(this.sprite.body.velocity.x) < 10;
    const canStartCharging = isOnSurface && isStandingStill && this.battery < this.maxBattery && !this.isDrilling;

    // Handle solar panel deployment and recharging
    this.updateSolarPanels(canStartCharging, dt);

    // Check for climbing (ladder tiles)
    this.checkClimbing();

    // Movement
    this.handleMovement(input, dt);

    // Update facing direction and movement direction
    if (input.left) {
      this.facingRight = false;
      this.movementDirection = 'side';
    }
    if (input.right) {
      this.facingRight = true;
      this.movementDirection = 'side';
    }
    // For climbing/vertical movement, show front/back views
    if (this.isClimbing) {
      if (input.up) {
        this.movementDirection = 'back';
      } else if (input.down) {
        this.movementDirection = 'front';
      }
    }

    // Flip sprite based on direction (only for side view)
    if (this.movementDirection === 'side') {
      this.sprite.setFlipX(!this.facingRight);
    } else {
      this.sprite.setFlipX(false);
    }

    // Battery drain
    this.updateBatteryDrain(input, dt);

    // Check if out of battery underground
    this.checkBatteryDeath();

    // Update animation
    this.updateAnimation(input);

    // Check hazards
    this.checkHazards(dt);
  }

  handleMovement(input, dt) {
    const speed = GAME_CONFIG.MOVE_SPEED;
    this.isUsingThrusters = false;

    // Don't allow movement while drilling
    if (this.isDrilling) {
      this.sprite.setVelocityX(0);
      return;
    }

    // Horizontal movement (works even with low battery, just slower)
    if (input.left) {
      this.sprite.setVelocityX(-speed);
    } else if (input.right) {
      this.sprite.setVelocityX(speed);
    }

    // Climbing
    if (this.isClimbing) {
      this.sprite.body.setAllowGravity(false);

      if (input.up) {
        // Check if we can climb higher (is there ladder above or are we still in tolerance?)
        const canClimbHigher = this.canClimbUp();
        if (canClimbHigher) {
          this.sprite.setVelocityY(-GAME_CONFIG.CLIMB_SPEED);
        } else {
          this.sprite.setVelocityY(0); // Stop at top edge
        }
      } else if (input.down) {
        this.sprite.setVelocityY(GAME_CONFIG.CLIMB_SPEED);
      } else {
        this.sprite.setVelocityY(0);
      }
    } else {
      this.sprite.body.setAllowGravity(true);

      // Jump (free, no battery cost)
      if (input.up && this.isGrounded) {
        this.sprite.setVelocityY(GAME_CONFIG.JUMP_VELOCITY);
      }

      // Thrusters (late game upgrade, costs battery)
      if (this.hasThrusters && input.up && !this.isGrounded && this.battery > 0) {
        this.sprite.setVelocityY(Math.max(this.sprite.body.velocity.y - 15, -200));
        this.isUsingThrusters = true;
      }
    }
  }

  checkClimbing() {
    const tileX = Math.floor(this.sprite.x / GAME_CONFIG.TILE_SIZE);
    const tileSize = GAME_CONFIG.TILE_SIZE;

    // Check both center and feet - climb if EITHER is in a ladder
    const centerTileY = Math.floor(this.sprite.y / tileSize);
    const feetY = this.sprite.body.bottom;
    const feetTileY = Math.floor(feetY / tileSize);

    const centerTile = this.scene.getTileAt(tileX, centerTileY);
    const feetTile = this.scene.getTileAt(tileX, feetTileY);

    // Also check if feet are just above a ladder (within most of the tile above)
    // When feet enter tile above ladder, feetPositionInTile is HIGH (near bottom of new tile)
    // As player climbs higher, it decreases toward 0 (top of tile)
    const tileBelow = this.scene.getTileAt(tileX, feetTileY + 1);
    const feetPositionInTile = feetY % tileSize;
    // Allow climbing if in bottom 80% of tile above ladder (feetPositionInTile > 20% from top)
    const justAboveLadder = tileBelow && tileBelow.climbable && feetPositionInTile > tileSize * 0.2;

    // Can climb if center OR feet are in a ladder, OR just above a ladder
    this.isClimbing = (centerTile && centerTile.climbable) ||
                      (feetTile && feetTile.climbable) ||
                      justAboveLadder;
  }

  canClimbUp() {
    const tileX = Math.floor(this.sprite.x / GAME_CONFIG.TILE_SIZE);
    const tileSize = GAME_CONFIG.TILE_SIZE;
    const feetY = this.sprite.body.bottom;
    const feetTileY = Math.floor(feetY / tileSize);

    // Check if there's a ladder at feet level or above
    const feetTile = this.scene.getTileAt(tileX, feetTileY);
    const centerTileY = Math.floor(this.sprite.y / tileSize);
    const centerTile = this.scene.getTileAt(tileX, centerTileY);

    // Can climb up if feet or center are still in a ladder
    // (not just in the tolerance zone above)
    return (feetTile && feetTile.climbable) || (centerTile && centerTile.climbable);
  }

  updateSolarPanels(canStartCharging, dt) {
    // If we should be charging and panels are retracted, start deploying
    if (canStartCharging && this.solarState === 'retracted') {
      this.solarState = 'deploying';
      this.solarPanelsOut = false;
      this.isRecharging = false;
    }
    // If we shouldn't be charging and panels are out, start retracting
    else if (!canStartCharging && (this.solarState === 'deployed' || this.solarState === 'deploying')) {
      this.solarState = 'retracting';
      this.solarPanelsOut = false;
      this.isRecharging = false;
    }

    // Handle charging when panels are fully deployed
    if (this.solarState === 'deployed' && this.solarPanelsOut && canStartCharging) {
      this.isRecharging = true;
      this.battery = Math.min(this.maxBattery, this.battery + GAME_CONFIG.SOLAR_RECHARGE_RATE * dt);
    } else if (this.solarState !== 'deployed') {
      this.isRecharging = false;
    }

    // Check if battery is full
    if (this.battery >= this.maxBattery && this.solarState === 'deployed') {
      this.solarState = 'retracting';
      this.solarPanelsOut = false;
      this.isRecharging = false;
    }
  }

  updateBatteryDrain(input, dt) {
    if (this.isRecharging) return;

    // Dev mode: infinite battery
    if (this.scene.registry.get('devMode')) {
      this.battery = this.maxBattery;
      return;
    }

    let drain = GAME_CONFIG.BATTERY_IDLE;

    // Moving horizontally drains battery
    if ((input.left || input.right) && Math.abs(this.sprite.body.velocity.x) > 10) {
      drain += GAME_CONFIG.BATTERY_MOVE;
    }

    // Drilling drains battery
    if (this.isDrilling) {
      drain += GAME_CONFIG.BATTERY_DRILL;
    }

    // Thrusters drain battery (only when actually using them)
    if (this.isUsingThrusters) {
      drain += GAME_CONFIG.BATTERY_THRUSTER;
    }

    this.battery = Math.max(0, this.battery - drain * dt);
  }

  checkBatteryDeath() {
    // If out of battery and underground, trigger rescue
    const isOnSurface = this.sprite.y <= (GAME_CONFIG.SURFACE_HEIGHT + 1) * GAME_CONFIG.TILE_SIZE;

    if (this.battery <= 0 && !isOnSurface) {
      this.rescueRover();
    }
  }

  updateAnimation(input) {
    // Use directional sprites if available
    if (this.hasDirectionalSprites && !this.hasAnimatedSprites) {
      // Simple directional sprite switching
      if (this.movementDirection === 'front') {
        this.sprite.setTexture('rover_front');
      } else if (this.movementDirection === 'back') {
        this.sprite.setTexture('rover_back');
      } else {
        this.sprite.setTexture('rover_side');
      }
      return;
    }

    if (this.hasAnimatedSprites) {
      const isMoving = (input.left || input.right) && this.isGrounded;

      // Handle drill sprite switching based on direction
      if (this.isDrilling) {
        let drillAnim = null;
        let drillTexture = null;
        let needsFlip = false;

        // Determine which drill animation and texture to use
        if (this.drillDirection === 'down' && this.hasDrillDownSpritesheet) {
          drillTexture = 'rover_drill_down_spritesheet';
          drillAnim = 'rover_drill_down';
          needsFlip = false;
        } else if (this.drillDirection === 'up' && this.hasDrillUpSpritesheet) {
          drillTexture = 'rover_drill_up_spritesheet';
          drillAnim = 'rover_drill_up';
          needsFlip = false;
        } else if ((this.drillDirection === 'left' || this.drillDirection === 'right') && this.hasDrillSpritesheet) {
          drillTexture = 'rover_drill_spritesheet';
          drillAnim = this.drillDirection === 'right' ? 'rover_drill_right' : 'rover_drill_left';
          needsFlip = this.drillDirection === 'left';
        }

        if (drillTexture && drillAnim) {
          // Switch to appropriate drill spritesheet
          if (this.currentSpriteMode !== drillTexture) {
            this.sprite.setTexture(drillTexture, 0);
            this.currentSpriteMode = drillTexture;

            // Keep origin centered for all sprites
            this.sprite.setOrigin(0.5, 0.5);

            // Adjust physics body offset for larger sprites
            // Rover is centered in the larger sprite, so add padding offset
            const bodyWidth = GAME_CONFIG.TILE_SIZE * 0.96;
            const bodyHeight = GAME_CONFIG.TILE_SIZE * 0.7;

            if (this.drillDirection === 'left' || this.drillDirection === 'right') {
              // Side drill: 254x128 - only X padding
              const xPadding = (254 - GAME_CONFIG.TILE_SIZE) / 2;  // 63 pixels
              this.sprite.body.setOffset(
                xPadding + (GAME_CONFIG.TILE_SIZE - bodyWidth) / 2,
                GAME_CONFIG.TILE_SIZE - bodyHeight  // No Y padding
              );
            } else {
              // Up/Down drill: 254x254 - both X and Y padding
              const padding = (254 - GAME_CONFIG.TILE_SIZE) / 2;  // 63 pixels
              this.sprite.body.setOffset(
                padding + (GAME_CONFIG.TILE_SIZE - bodyWidth) / 2,
                padding + GAME_CONFIG.TILE_SIZE - bodyHeight
              );
            }
          }
          this.sprite.setFlipX(needsFlip);
          if (!this.sprite.anims.isPlaying || this.sprite.anims.currentAnim?.key !== drillAnim) {
            this.sprite.play(drillAnim);
          }
        }
      } else if (this.solarState !== 'retracted' && this.hasSolarSpritesheet) {
        // Handle solar panel animations
        const solarTexture = 'rover_solar_spritesheet';

        // Switch to solar spritesheet if needed
        if (this.currentSpriteMode !== solarTexture) {
          this.sprite.setTexture(solarTexture, 0);
          this.currentSpriteMode = solarTexture;
          this.sprite.setOrigin(0.5, 0.5);
          this.sprite.setFlipX(false);

          // Adjust physics body offset for 254x254 sprite
          const bodyWidth = GAME_CONFIG.TILE_SIZE * 0.96;
          const bodyHeight = GAME_CONFIG.TILE_SIZE * 0.7;
          const padding = (254 - GAME_CONFIG.TILE_SIZE) / 2;
          this.sprite.body.setOffset(
            padding + (GAME_CONFIG.TILE_SIZE - bodyWidth) / 2,
            padding + GAME_CONFIG.TILE_SIZE - bodyHeight
          );
        }

        // Play appropriate animation based on state
        if (this.solarState === 'deploying') {
          const currentAnim = this.sprite.anims.currentAnim?.key;
          if (currentAnim !== 'rover_solar_deploy') {
            this.sprite.play('rover_solar_deploy');
            // When deploy finishes, switch to deployed state
            this.sprite.once('animationcomplete', () => {
              if (this.solarState === 'deploying') {
                this.solarState = 'deployed';
                this.solarPanelsOut = true;
              }
            });
          }
        } else if (this.solarState === 'deployed') {
          const currentAnim = this.sprite.anims.currentAnim?.key;
          if (currentAnim !== 'rover_solar_wiggle') {
            this.sprite.play('rover_solar_wiggle');
          }
        } else if (this.solarState === 'retracting') {
          const currentAnim = this.sprite.anims.currentAnim?.key;
          if (currentAnim !== 'rover_solar_retract') {
            this.sprite.play('rover_solar_retract');
            // When retract finishes, switch back to normal
            this.sprite.once('animationcomplete', () => {
              if (this.solarState === 'retracting') {
                this.solarState = 'retracted';
                this.solarPanelsOut = false;
              }
            });
          }
        }
      } else {
        // Switch back to normal spritesheet if was using other sprites
        if (this.currentSpriteMode !== 'normal') {
          this.sprite.setTexture('rover_spritesheet', 0);
          this.sprite.setFlipX(false);
          this.sprite.setOrigin(0.5, 0.5);
          this.currentSpriteMode = 'normal';

          // Reset physics body offset for normal 128x128 sprite
          const bodyWidth = GAME_CONFIG.TILE_SIZE * 0.96;
          const bodyHeight = GAME_CONFIG.TILE_SIZE * 0.7;
          this.sprite.body.setOffset(
            (GAME_CONFIG.TILE_SIZE - bodyWidth) / 2,
            GAME_CONFIG.TILE_SIZE - bodyHeight
          );
        }

        // Driving animation takes priority when moving
        if (isMoving) {
          if (!this.sprite.anims.isPlaying || this.sprite.anims.currentAnim?.key !== 'rover_drive') {
            this.sprite.play('rover_drive');
          }
        } else if (this.isUsingThrusters) {
          if (!this.sprite.anims.isPlaying || this.sprite.anims.currentAnim?.key !== 'rover_jetpack_anim') {
            this.sprite.play('rover_jetpack_anim', true);
          }
        } else {
          // Idle - stop animation, show first frame
          if (this.sprite.anims.isPlaying) {
            this.sprite.stop();
          }
          this.sprite.setFrame(0);
        }
      }
    } else {
      // Fallback to texture swapping (old behavior)
      if (this.isDrilling) {
        this.sprite.setTexture('rover_drill');
      } else if (this.isUsingThrusters) {
        this.sprite.setTexture('rover_jetpack');
      } else {
        this.sprite.setTexture('rover');
      }
    }
  }

  checkFallDamage(wasGrounded) {
    const isFalling = this.sprite.body.velocity.y > 50 && !this.isGrounded && !this.isClimbing;

    // Start tracking fall
    if (isFalling && !this.wasFalling) {
      this.fallStartY = this.sprite.y;
    }

    // Landed - check for fall damage
    if (this.isGrounded && this.wasFalling && this.fallStartY !== null) {
      const fallDistance = (this.sprite.y - this.fallStartY) / GAME_CONFIG.TILE_SIZE;

      if (fallDistance > GAME_CONFIG.FALL_DAMAGE_START) {
        // Calculate damage: scales from 0 at 3 tiles to 100 at 6 tiles
        const damageRange = GAME_CONFIG.FALL_DAMAGE_DEADLY - GAME_CONFIG.FALL_DAMAGE_START;
        const excessFall = fallDistance - GAME_CONFIG.FALL_DAMAGE_START;
        const damagePercent = Math.min(1, excessFall / damageRange);
        const damage = damagePercent * 100;  // 100 = full health at default

        this.takeDamage(damage);

        // Show fall damage feedback
        if (damage > 0) {
          const msg = this.scene.add.bitmapText(
            Math.floor(this.sprite.x),
            Math.floor(this.sprite.y - 30),
            'pixel',
            `-${Math.round(damage)} FALL`,
            10
          ).setOrigin(0.5).setTint(0xff6666).setDepth(100);

          this.scene.tweens.add({
            targets: msg,
            y: msg.y - 30,
            alpha: 0,
            duration: 1500,
            onComplete: () => msg.destroy()
          });
        }
      }

      this.fallStartY = null;
    }

    this.wasFalling = isFalling;
  }

  checkHazards(dt) {
    const tileX = Math.floor(this.sprite.x / GAME_CONFIG.TILE_SIZE);
    const tileY = Math.floor(this.sprite.y / GAME_CONFIG.TILE_SIZE);

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const tile = this.scene.getTileAt(tileX + dx, tileY + dy);

        if (tile && tile.hazard === 'heat') {
          this.takeDamage(tile.damage * dt);
        }
      }
    }
  }

  takeDamage(amount) {
    this.hull = Math.max(0, this.hull - amount);

    if (amount > 0) {
      this.sprite.setTint(0xff0000);
      this.scene.time.delayedCall(100, () => {
        this.sprite.clearTint();
      });
    }

    if (this.hull <= 0) {
      this.die();
    }
  }

  die() {
    // Hull destroyed - lose cargo and respawn
    this.rescueRover();
  }

  rescueRover() {
    // Show message
    const msg = this.scene.add.bitmapText(
      Math.floor(this.sprite.x),
      Math.floor(this.sprite.y - 20),
      'pixel',
      'RESCUED - CARGO LOST!',
      10
    ).setOrigin(0.5).setTint(0xff4444).setDepth(100);

    this.scene.tweens.add({
      targets: msg,
      y: msg.y - 30,
      alpha: 0,
      duration: 2000,
      onComplete: () => msg.destroy()
    });

    // Lose cargo!
    this.cargo = [];

    // Reset position to spawn point
    this.sprite.setPosition(
      GAME_CONFIG.SPAWN_X * GAME_CONFIG.TILE_SIZE,
      (GAME_CONFIG.SURFACE_HEIGHT - 1) * GAME_CONFIG.TILE_SIZE
    );
    this.sprite.setVelocity(0, 0);

    // Reset stats
    this.battery = this.maxBattery;
    this.hull = this.maxHull;

    // Visual feedback
    this.scene.cameras.main.flash(500, 255, 0, 0);
  }

  addToCargo(ore, value) {
    if (this.cargo.length >= this.maxCargo) {
      return false;
    }

    this.cargo.push({ ore, value });
    return true;
  }

  sellCargo() {
    let total = 0;
    for (const item of this.cargo) {
      total += item.value;
    }

    const gameData = this.scene.registry.get('gameData');
    gameData.money += total;
    gameData.cargo = []; // Clear saved cargo
    this.scene.registry.set('gameData', gameData);

    this.cargo = [];
    return total;
  }

  repair(amount) {
    const repairAmount = Math.min(amount, this.maxHull - this.hull);
    this.hull += repairAmount;
    return repairAmount;
  }
}
