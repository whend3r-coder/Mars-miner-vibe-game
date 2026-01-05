import Phaser from 'phaser';
import { GAME_CONFIG, UPGRADES } from '../config/GameConfig.js';

// Rover sprite size (different from TILE_SIZE now)
const ROVER_SIZE = 128;

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
    this.speedMultiplier = UPGRADES.movementSpeed.levels[upgrades.movementSpeed || 0].multiplier;
    this.jumpMultiplier = UPGRADES.jumpHeight.levels[upgrades.jumpHeight || 0].multiplier;

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

    // Set collision box - keep original working formula
    const bodyWidth = 128 * 0.96;  // ~123px (rover is 128x128)
    const bodyHeight = 128 * 0.7;  // ~90px
    this.sprite.setSize(bodyWidth, bodyHeight);
    // Offset adjusted for 140px tiles (rover is 128px, 8px total down shift)
    const offsetX = (128 - bodyWidth) / 2;  // ~2.5
    const offsetY = 128 - bodyHeight + 2;   // sprite appears 8px lower total
    this.sprite.setOffset(offsetX, offsetY);
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
    this.isOnElevator = false;  // Set by ElevatorSystem when riding

    // Fall damage tracking
    this.fallStartY = null;
    this.wasFalling = false;

    // Jump energy tracking (for ceiling bump refunds)
    this.jumpStartY = null;
    this.jumpEnergyPaid = 0;

    // Solar panel state
    this.solarState = 'retracted'; // 'retracted', 'deploying', 'deployed', 'retracting'
    this.solarPanelsOut = false;   // True when panels are fully deployed (can charge)

    // Surface charged lock - when fully charged on surface, battery stays locked
    this.surfaceChargeLocked = false;
  }

  update(time, delta, input) {
    const dt = delta / 1000;

    // Check if grounded
    const wasGrounded = this.isGrounded;
    this.isGrounded = this.sprite.body.blocked.down || this.sprite.body.touching.down;

    // Clear jump tracking when landing
    if (this.isGrounded && !wasGrounded) {
      this.jumpStartY = null;
      this.jumpEnergyPaid = 0;
    }

    // Fall damage tracking
    this.checkFallDamage(wasGrounded);

    // Check if on surface for recharging (at or above surface level)
    const isOnSurface = this.sprite.y <= (GAME_CONFIG.SURFACE_HEIGHT + 1) * GAME_CONFIG.TILE_SIZE;
    const isUnderground = this.sprite.y > (GAME_CONFIG.SURFACE_HEIGHT + 2) * GAME_CONFIG.TILE_SIZE;

    // Unlock battery when going underground
    if (isUnderground && this.surfaceChargeLocked) {
      this.surfaceChargeLocked = false;
    }

    // If surface charge locked, keep battery at max
    if (this.surfaceChargeLocked && isOnSurface) {
      this.battery = this.maxBattery;
    }

    // Only start charging if not drilling, standing still on surface, and battery not full
    const isStandingStill = this.isGrounded && Math.abs(this.sprite.body.velocity.x) < 10;
    const canStartCharging = isOnSurface && isStandingStill && this.battery < this.maxBattery && !this.isDrilling && !this.surfaceChargeLocked;

    // Handle solar panel deployment and recharging
    this.updateSolarPanels(canStartCharging, dt, isOnSurface);

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
    const speed = GAME_CONFIG.MOVE_SPEED * this.speedMultiplier;
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

    // Apply tile snap guidance if enabled
    this.applyTileSnap(input, dt);

    // When on elevator - allow horizontal movement to walk off, but skip vertical controls
    if (this.isOnElevator) {
      this.sprite.body.setAllowGravity(false);
      // Don't return - let horizontal movement happen above, just skip climbing/jumping below
      return;
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

      // Jump (costs battery, multiplier from upgrade)
      if (input.up && this.isGrounded && this.battery > 0) {
        const jumpVelocity = GAME_CONFIG.JUMP_VELOCITY * this.jumpMultiplier;
        this.sprite.setVelocityY(jumpVelocity);
        // Track jump start for energy refund if we hit ceiling immediately
        this.jumpStartY = this.sprite.y;
        this.jumpEnergyPaid = GAME_CONFIG.BATTERY_JUMP;
        // Drain battery per jump (not per-second like other costs)
        this.battery = Math.max(0, this.battery - GAME_CONFIG.BATTERY_JUMP);
      }

      // Thrusters (late game upgrade, costs battery)
      if (this.hasThrusters && input.up && !this.isGrounded && this.battery > 0) {
        this.sprite.setVelocityY(Math.max(this.sprite.body.velocity.y - 15, -200));
        this.isUsingThrusters = true;
      }
    }

    // Prevent visual ceiling clipping
    // The sprite visual extends above the physics body, so check for ceiling above sprite top
    this.checkCeilingClip();
  }

  checkCeilingClip() {
    const tileSize = GAME_CONFIG.TILE_SIZE;
    const ceilingBuffer = 8; // Visual buffer below ceiling tiles

    // Only check when moving upward
    if (this.sprite.body.velocity.y >= 0) return;

    // Visual sprite top (sprite is 128px, origin 0.5)
    const spriteTop = this.sprite.y - 64;
    const spriteTopTileY = Math.floor(spriteTop / tileSize);
    const tileX = Math.floor(this.sprite.x / tileSize);

    // Check if there's a solid tile at the visual top
    if (this.scene.isSolidAt(tileX, spriteTopTileY)) {
      // Calculate minimum Y position to not clip into ceiling (with 8px buffer)
      const minY = (spriteTopTileY + 1) * tileSize + 64 + ceilingBuffer;

      if (this.sprite.y < minY) {
        this.sprite.y = minY;
        this.sprite.setVelocityY(0);

        // Refund energy for ceiling bump jumps
        // If we barely jumped (less than half a tile), refund most of the energy
        if (this.jumpStartY !== null && this.jumpEnergyPaid > 0) {
          const jumpDistance = this.jumpStartY - this.sprite.y; // Positive = moved up
          const minJumpForFullCost = tileSize * 0.5; // Half tile minimum for full cost

          if (jumpDistance < minJumpForFullCost) {
            // Refund proportional to how short the jump was
            const refundRatio = 1 - (jumpDistance / minJumpForFullCost);
            const refund = this.jumpEnergyPaid * refundRatio * 0.8; // Refund up to 80%
            this.battery = Math.min(this.maxBattery, this.battery + refund);
          }
          // Clear jump tracking
          this.jumpStartY = null;
          this.jumpEnergyPaid = 0;
        }
      }
    }
  }

  applyTileSnap(input, dt) {
    // Check if tile snap is enabled
    const tileSnapEnabled = this.scene.registry.get('tileSnap') !== false;
    if (!tileSnapEnabled) return;

    const tileSize = GAME_CONFIG.TILE_SIZE;
    const snapStrength = 250; // Pixels per second correction (slightly faster)
    const snapThreshold = tileSize * 0.48; // Within 48% of tile center (more generous)
    const minOffset = 6; // Don't snap if already very close (prevents jitter)

    const hasHorizontalInput = input.left || input.right;
    const hasVerticalInput = input.up || input.down;

    // No snapping when pressing both directions - let physics handle it
    if (hasHorizontalInput && hasVerticalInput) return;

    // Get current position and calculate offset from tile center
    const x = this.sprite.x;
    const y = this.sprite.y;

    const tileCenterX = (Math.floor(x / tileSize) + 0.5) * tileSize;
    const tileCenterY = (Math.floor(y / tileSize) + 0.5) * tileSize;

    const offsetX = x - tileCenterX;
    const offsetY = y - tileCenterY;

    const tileX = Math.floor(x / tileSize);
    const tileY = Math.floor(y / tileSize);

    // HORIZONTAL SNAP - center when moving vertically
    // Works for: ladders, elevators, narrow passages, AND normal pits/shafts
    if (hasVerticalInput && !hasHorizontalInput && Math.abs(offsetX) < snapThreshold && Math.abs(offsetX) > minOffset) {
      const ladderHere = this.scene.getTileAt(tileX, tileY);
      const ladderAbove = this.scene.getTileAt(tileX, tileY - 1);
      const ladderBelow = this.scene.getTileAt(tileX, tileY + 1);
      const hasLadderContext = (ladderHere && ladderHere.climbable) ||
                               (ladderAbove && ladderAbove.climbable) ||
                               (ladderBelow && ladderBelow.climbable);

      const hasElevatorContext = (ladderHere && (ladderHere.elevatorPart || ladderHere.rideable)) ||
                                 (ladderAbove && (ladderAbove.elevatorPart || ladderAbove.rideable)) ||
                                 (ladderBelow && (ladderBelow.elevatorPart || ladderBelow.rideable));

      // Check for narrow vertical passage (walls on both sides)
      const leftBlocked = this.scene.isSolidAt(tileX - 1, tileY);
      const rightBlocked = this.scene.isSolidAt(tileX + 1, tileY);
      const hasNarrowPassage = leftBlocked && rightBlocked;

      // Check for pit/shaft entrance when pressing down
      // Look at the tile in the direction we're offset from center
      const pressingDown = input.down;
      let nearPitEntrance = false;

      if (pressingDown) {
        // Check which direction we're offset from tile center
        // If offset > 0, we're to the right of center, check the tile to the right
        // If offset < 0, we're to the left of center, check the tile to the left
        const checkTileX = offsetX > 0 ? tileX + 1 : tileX - 1;

        // Is there an open pit at that adjacent tile?
        const adjacentOpen = !this.scene.isSolidAt(checkTileX, tileY);
        const adjacentPitBelow = !this.scene.isSolidAt(checkTileX, tileY + 1);

        // Also check current tile - maybe we're already mostly over the pit
        const currentOpen = !this.scene.isSolidAt(tileX, tileY + 1);

        nearPitEntrance = (adjacentOpen && adjacentPitBelow) || currentOpen;
      }

      if (hasLadderContext || hasElevatorContext || hasNarrowPassage ||
          this.isClimbing || this.isOnElevator || nearPitEntrance) {
        const correction = -Math.sign(offsetX) * Math.min(Math.abs(offsetX), snapStrength * dt);
        this.sprite.x += correction;
      }
    }

    // VERTICAL SNAP - help step off ladders/elevators/shafts when moving horizontally
    // KEY: Only snap if there's actually space to move into!
    if (hasHorizontalInput && !hasVerticalInput && Math.abs(offsetY) < snapThreshold && Math.abs(offsetY) > minOffset) {
      const dirX = input.left ? -1 : 1;
      const destTileX = tileX + dirX;

      // Check if destination is actually open (not a wall)
      const destOpen = !this.scene.isSolidAt(destTileX, tileY);

      // Check if there's floor or ladder to land on
      const destTileBelow = this.scene.getTileAt(destTileX, tileY + 1);
      const destHasFloor = this.scene.isSolidAt(destTileX, tileY + 1) ||
                           (destTileBelow && destTileBelow.climbable);

      // Only proceed if there's actually somewhere to step off to
      const canStepOff = destOpen && destHasFloor;

      if (!canStepOff) return; // No space to move - don't snap (prevents jitter against walls)

      // Check for ladder/elevator context at current position
      const ladderHere = this.scene.getTileAt(tileX, tileY);
      const ladderBelow = this.scene.getTileAt(tileX, tileY + 1);
      const hasLadderHere = (ladderHere && ladderHere.climbable) || (ladderBelow && ladderBelow.climbable);
      const hasElevatorHere = (ladderHere && (ladderHere.elevatorPart || ladderHere.rideable)) ||
                              (ladderBelow && (ladderBelow.elevatorPart || ladderBelow.rideable));

      // Check if stepping off from ladder/elevator behind us
      const tileBehind = this.scene.getTileAt(tileX - dirX, tileY);
      const steppingOffLadder = tileBehind && tileBehind.climbable;
      const steppingOffElevator = tileBehind && (tileBehind.elevatorPart || tileBehind.rideable);

      // Check for narrow horizontal passage
      const aboveBlocked = this.scene.isSolidAt(tileX, tileY - 1);
      const belowBlocked = this.scene.isSolidAt(tileX, tileY + 1);
      const hasNarrowPassage = aboveBlocked && belowBlocked;

      // NEW: Also snap when in a vertical shaft trying to step onto a side ledge
      const inVerticalShaft = !belowBlocked && this.scene.isSolidAt(tileX - 1, tileY) !== this.scene.isSolidAt(tileX + 1, tileY);

      const shouldSnap = hasLadderHere || hasElevatorHere || hasNarrowPassage ||
                         this.isClimbing || this.isOnElevator ||
                         steppingOffLadder || steppingOffElevator || inVerticalShaft;

      if (shouldSnap) {
        const correction = -Math.sign(offsetY) * Math.min(Math.abs(offsetY), snapStrength * dt);
        this.sprite.y += correction;
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

  updateSolarPanels(canStartCharging, dt, isOnSurface) {
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

    // Check if battery is full - lock it and retract panels
    if (this.battery >= this.maxBattery && this.solarState === 'deployed' && isOnSurface) {
      this.surfaceChargeLocked = true;  // Lock battery to full while on surface
      this.solarState = 'retracting';
      this.solarPanelsOut = false;
      this.isRecharging = false;
    }
  }

  updateBatteryDrain(input, dt) {
    if (this.isRecharging) return;

    // Surface charge locked - no drain while on surface
    if (this.surfaceChargeLocked) return;

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

    // Climbing drains battery (only when actively moving up/down)
    if (this.isClimbing && (input.up || input.down)) {
      drain += GAME_CONFIG.BATTERY_CLIMB;
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
            const bodyWidth = ROVER_SIZE * 0.96;
            const bodyHeight = ROVER_SIZE * 0.7;

            if (this.drillDirection === 'left' || this.drillDirection === 'right') {
              // Side drill: 254x128 - only X padding
              const xPadding = (254 - ROVER_SIZE) / 2;  // 63 pixels
              this.sprite.body.setOffset(
                xPadding + (ROVER_SIZE - bodyWidth) / 2,
                ROVER_SIZE - bodyHeight + 2  // +2 for visual offset
              );
            } else {
              // Up/Down drill: 254x254 - both X and Y padding
              const padding = (254 - ROVER_SIZE) / 2;  // 63 pixels
              this.sprite.body.setOffset(
                padding + (ROVER_SIZE - bodyWidth) / 2,
                padding + ROVER_SIZE - bodyHeight + 2  // +2 for visual offset
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
          const bodyWidth = ROVER_SIZE * 0.96;
          const bodyHeight = ROVER_SIZE * 0.7;
          const padding = (254 - ROVER_SIZE) / 2;
          this.sprite.body.setOffset(
            padding + (ROVER_SIZE - bodyWidth) / 2,
            padding + ROVER_SIZE - bodyHeight + 2  // +2 for visual offset
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
          const bodyWidth = ROVER_SIZE * 0.96;
          const bodyHeight = ROVER_SIZE * 0.7;
          this.sprite.body.setOffset(
            (ROVER_SIZE - bodyWidth) / 2,
            ROVER_SIZE - bodyHeight + 2  // +2 for visual offset
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
    // Check if dev mode is enabled (keep cargo in dev mode)
    const devMode = this.scene.registry.get('devMode') === true;

    // Show message
    const message = devMode ? 'RESCUED - DEV MODE' : 'RESCUED - CARGO LOST!';
    const msg = this.scene.add.bitmapText(
      Math.floor(this.sprite.x),
      Math.floor(this.sprite.y - 20),
      'pixel',
      message,
      10
    ).setOrigin(0.5).setTint(devMode ? 0xffff44 : 0xff4444).setDepth(100);

    this.scene.tweens.add({
      targets: msg,
      y: msg.y - 30,
      alpha: 0,
      duration: 2000,
      onComplete: () => msg.destroy()
    });

    // Lose cargo in normal mode only!
    if (!devMode) {
      this.cargo = [];
    }

    // Reset position to spawn point
    this.sprite.setPosition(
      GAME_CONFIG.SPAWN_X * GAME_CONFIG.TILE_SIZE,
      (GAME_CONFIG.SURFACE_HEIGHT - 1) * GAME_CONFIG.TILE_SIZE
    );
    this.sprite.setVelocity(0, 0);

    // Reset stats
    this.battery = this.maxBattery;
    this.hull = this.maxHull;

    // Reset solar panel state
    this.solarState = 'retracted';
    this.solarPanelsOut = false;
    this.isRecharging = false;
    this.surfaceChargeLocked = true;  // Lock battery since we're at full on surface

    // Reset sprite to normal mode
    if (this.currentSpriteMode !== 'normal' && this.hasAnimatedSprites) {
      this.sprite.setTexture('rover_spritesheet', 0);
      this.sprite.setFlipX(false);
      this.sprite.setOrigin(0.5, 0.5);
      this.currentSpriteMode = 'normal';

      // Reset physics body offset
      const bodyWidth = ROVER_SIZE * 0.96;
      const bodyHeight = ROVER_SIZE * 0.7;
      this.sprite.body.setOffset(
        (ROVER_SIZE - bodyWidth) / 2,
        ROVER_SIZE - bodyHeight + 2  // +2 for visual offset
      );
    }

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

  // Reset solar panel animation state (call after pause/shop/etc)
  resetSolarState() {
    // If panels were mid-animation, reset to appropriate state
    if (this.solarState === 'deploying') {
      this.solarState = 'retracted';
    } else if (this.solarState === 'retracting') {
      this.solarState = 'retracted';
    }
    this.solarPanelsOut = this.solarState === 'deployed';
    this.isRecharging = false;

    // Reset sprite if stuck in solar mode
    if (this.currentSpriteMode === 'rover_solar_spritesheet' && this.solarState === 'retracted') {
      if (this.hasAnimatedSprites) {
        this.sprite.setTexture('rover_spritesheet', 0);
        this.sprite.setFlipX(false);
        this.sprite.setOrigin(0.5, 0.5);
        this.currentSpriteMode = 'normal';

        const bodyWidth = ROVER_SIZE * 0.96;
        const bodyHeight = ROVER_SIZE * 0.7;
        this.sprite.body.setOffset(
          (ROVER_SIZE - bodyWidth) / 2,
          ROVER_SIZE - bodyHeight + 2  // +2 for visual offset
        );
      }
    }
  }
}
