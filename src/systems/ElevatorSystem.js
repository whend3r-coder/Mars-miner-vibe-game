import { GAME_CONFIG, SHOP_ITEMS } from '../config/GameConfig.js';
import { TILE_TYPES } from '../config/TileTypes.js';

export class ElevatorSystem {
  constructor(scene) {
    this.scene = scene;

    // Track all elevators: { id, topX, topY, length, carY, carSprite }
    this.elevators = [];

    // Elevator movement speed (faster than ladder climbing) - 25% faster
    this.elevatorSpeed = 500;

    // Player riding state
    this.playerRiding = null;

    // Load saved elevators from registry
    this.loadElevators();
  }

  loadElevators() {
    const placedItems = this.scene.placedItems || [];
    for (const item of placedItems) {
      if (item.type === 'elevatorSmall' || item.type === 'elevatorMedium' || item.type === 'elevatorLarge') {
        const elevator = {
          id: item.id || this.elevators.length,
          topX: item.x,
          topY: item.y,
          length: item.length,
          carY: item.carY !== undefined ? item.carY : item.y,  // Start at TOP by default
          carSprite: null
        };
        this.elevators.push(elevator);
        this.createCarSprite(elevator);
      }
    }
  }

  createCarSprite(elevator) {
    const worldX = elevator.topX * GAME_CONFIG.TILE_SIZE + GAME_CONFIG.TILE_SIZE / 2;
    const worldY = elevator.carY * GAME_CONFIG.TILE_SIZE + GAME_CONFIG.TILE_SIZE / 2;

    // Create a simple sprite for the car - no physics blocking
    const car = this.scene.add.sprite(worldX, worldY, 'tile_elevatorCar');
    car.setDepth(15);  // In front of rover

    elevator.carSprite = car;
  }

  update(time, delta, input) {
    const dt = delta / 1000;
    const rover = this.scene.rover;
    const TILE = GAME_CONFIG.TILE_SIZE;

    // Simple approach: use sprite centers
    const roverTileX = Math.floor(rover.sprite.x / TILE);
    const roverCenterTileY = (rover.sprite.y + TILE / 2) / TILE;  // Which tile the rover is standing on

    // Check if player should start riding an elevator
    if (!this.playerRiding) {
      for (const elevator of this.elevators) {
        // Check if rover is at the elevator column
        if (roverTileX !== elevator.topX) continue;

        // Check if rover is within the elevator shaft range (with tolerance at bottom)
        const roverTile = Math.floor(rover.sprite.y / TILE);
        const elevatorBottom = elevator.topY + elevator.length - 1;

        // Allow entry if within shaft OR slightly below bottom (falling into shaft)
        if (roverTile < elevator.topY || roverTile > elevatorBottom + 1) continue;

        // If below the elevator bottom, only catch if falling (entering from side)
        if (roverTile > elevatorBottom) {
          // Only catch if not moving up (jumping away)
          if (rover.sprite.body.velocity.y < 0) continue;
        }

        // Calculate car position from rover position
        elevator.carY = (rover.sprite.y - TILE / 2) / TILE;

        // Clamp to valid range - this prevents going below bottom
        elevator.carY = Math.max(elevator.topY, Math.min(elevatorBottom, elevator.carY));

        this.playerRiding = elevator;
        break;
      }
    }

    // Handle player riding elevator
    if (this.playerRiding) {
      const elevator = this.playerRiding;
      const TILE = GAME_CONFIG.TILE_SIZE;

      // Check if player walked off horizontally
      const horizontallyAway = Math.abs(roverTileX - elevator.topX) >= 1;

      // Check if player jumped off
      const jumpedOff = rover.sprite.body.velocity.y < -100;

      if (horizontallyAway || jumpedOff) {
        // Player exited elevator
        this.playerRiding = null;
        rover.isOnElevator = false;
      } else {
        // Player is on elevator
        rover.isOnElevator = true;

        // Move elevator with up/down input
        if (input.up || input.down) {
          const direction = input.up ? -1 : 1;
          const moveAmount = direction * this.elevatorSpeed * dt / TILE;

          // Calculate new car position
          let newCarY = elevator.carY + moveAmount;

          // Clamp to elevator bounds
          const minY = elevator.topY;
          const maxY = elevator.topY + elevator.length - 1;
          newCarY = Math.max(minY, Math.min(maxY, newCarY));

          elevator.carY = newCarY;

          // Check for chaining to another elevator
          const atBottom = elevator.carY >= maxY - 0.1;
          const atTop = elevator.carY <= minY + 0.1;

          if (input.down && atBottom) {
            // Look for elevator below that we can chain to
            const chainElevator = this.findChainableElevator(elevator.topX, maxY + 1, 'down');
            if (chainElevator) {
              // Transition to the new elevator at its top
              chainElevator.carY = chainElevator.topY;
              this.playerRiding = chainElevator;
              this.updateSavedCarPosition(chainElevator);
            }
          } else if (input.up && atTop) {
            // Look for elevator above that we can chain to
            const chainElevator = this.findChainableElevator(elevator.topX, minY - 1, 'up');
            if (chainElevator) {
              // Transition to the new elevator at its bottom
              chainElevator.carY = chainElevator.topY + chainElevator.length - 1;
              this.playerRiding = chainElevator;
              this.updateSavedCarPosition(chainElevator);
            }
          }
        }

        // Simple: rover.sprite.y = carY * TILE + TILE/2
        // This is the inverse of the entry formula, so position stays exact
        rover.sprite.y = elevator.carY * TILE + TILE / 2;
        rover.sprite.body.velocity.y = 0;
        rover.sprite.body.setAllowGravity(false);
        rover.isGrounded = true;

        // Update placed item data for saving
        this.updateSavedCarPosition(elevator);
      }
    } else {
      rover.isOnElevator = false;
      // Only re-enable gravity if not climbing (climbing handles its own gravity)
      if (!rover.isClimbing) {
        rover.sprite.body.setAllowGravity(true);
      }
    }

    // Update all car sprite positions
    for (const elevator of this.elevators) {
      if (elevator.carSprite) {
        // Cart sprite is centered on the tile where the cart is
        const worldY = elevator.carY * GAME_CONFIG.TILE_SIZE + GAME_CONFIG.TILE_SIZE / 2;
        elevator.carSprite.y = worldY;
        elevator.carSprite.x = elevator.topX * GAME_CONFIG.TILE_SIZE + GAME_CONFIG.TILE_SIZE / 2;
      }
    }
  }

  updateSavedCarPosition(elevator) {
    const placedItem = this.scene.placedItems.find(
      item => item.type && item.type.startsWith('elevator') && item.x === elevator.topX && item.y === elevator.topY
    );
    if (placedItem) {
      placedItem.carY = elevator.carY;
    }
  }

  // Find an elevator that can be chained to from the given position
  findChainableElevator(x, y, direction) {
    for (const elevator of this.elevators) {
      // Must be same column
      if (elevator.topX !== x) continue;
      // Skip current elevator
      if (elevator === this.playerRiding) continue;

      const elevatorBottom = elevator.topY + elevator.length - 1;

      if (direction === 'down') {
        // Going down: need elevator that starts at or contains this Y position
        // The new elevator's top should be at y or within a small range
        if (elevator.topY >= y - 1 && elevator.topY <= y + 1) {
          return elevator;
        }
      } else if (direction === 'up') {
        // Going up: need elevator whose bottom is at or contains this Y position
        if (elevatorBottom >= y - 1 && elevatorBottom <= y + 1) {
          return elevator;
        }
      }
    }
    return null;
  }

  // Place a new elevator
  placeElevator(x, y, elevatorType) {
    const itemDef = SHOP_ITEMS[elevatorType];
    if (!itemDef || !itemDef.elevatorLength) {
      console.error('Invalid elevator type:', elevatorType);
      return false;
    }

    const length = itemDef.elevatorLength;

    // Validate placement - need air tiles for the shaft
    for (let dy = 0; dy < length; dy++) {
      const tile = this.scene.getTileAt(x, y + dy);
      if (tile && tile.solid && !tile.placed) {
        // Can't place here - blocked by solid tile
        return false;
      }
    }

    // Check if this elevator chains to one above
    const tileAbove = this.scene.getTileAt(x, y - 1);
    const isChainedAbove = tileAbove && (
      tileAbove.id === TILE_TYPES.elevatorRope.id ||
      tileAbove.id === TILE_TYPES.elevatorTop.id ||
      tileAbove.id === TILE_TYPES.elevatorBottom.id
    );

    // Check if there's an elevator below (for bottom tile decision)
    const tileBelow = this.scene.getTileAt(x, y + length);
    const isChainedBelow = tileBelow && (
      tileBelow.id === TILE_TYPES.elevatorRope.id ||
      tileBelow.id === TILE_TYPES.elevatorTop.id
    );

    if (isChainedAbove) {
      // Find the elevator above and merge with it
      const elevatorAbove = this.findElevatorAt(x, y - 1);

      if (elevatorAbove) {
        // Remove the old bottom tile of elevator above
        const oldBottom = elevatorAbove.topY + elevatorAbove.length - 1;
        this.scene.setTileAt(x, oldBottom, TILE_TYPES.elevatorRope.id);

        // Extend the elevator above
        elevatorAbove.length += length;

        // Place rope for the new section
        for (let dy = 0; dy < length; dy++) {
          this.scene.setTileAt(x, y + dy, TILE_TYPES.elevatorRope.id);
        }

        // Place bottom tile at new bottom (unless chaining to another below)
        if (!isChainedBelow) {
          this.scene.setTileAt(x, y + length - 1, TILE_TYPES.elevatorBottom.id);
        }

        // Update the saved placed item
        const placedItem = this.scene.placedItems.find(
          item => item.type && item.type.startsWith('elevator') &&
                  item.x === elevatorAbove.topX && item.y === elevatorAbove.topY
        );
        if (placedItem) {
          placedItem.length = elevatorAbove.length;
        }
        this.scene.registry.set('placedItems', this.scene.placedItems);

        return true;
      }
    }

    // Not chaining - create new elevator
    // Place top anchor
    this.scene.setTileAt(x, y, TILE_TYPES.elevatorTop.id);

    // Rope segments (middle)
    for (let dy = 1; dy < length - 1; dy++) {
      this.scene.setTileAt(x, y + dy, TILE_TYPES.elevatorRope.id);
    }

    // Bottom tile (unless chaining to another below)
    if (length > 1) {
      if (isChainedBelow) {
        this.scene.setTileAt(x, y + length - 1, TILE_TYPES.elevatorRope.id);
      } else {
        this.scene.setTileAt(x, y + length - 1, TILE_TYPES.elevatorBottom.id);
      }
    }

    // Track elevator - cart starts at TOP (where player is)
    const elevatorId = this.elevators.length;
    const elevator = {
      id: elevatorId,
      topX: x,
      topY: y,
      length: length,
      carY: y,  // Start at top!
      carSprite: null
    };
    this.elevators.push(elevator);

    // Create the car sprite
    this.createCarSprite(elevator);

    // Track placed item
    this.scene.placedItems.push({
      type: elevatorType,
      x: x,
      y: y,
      id: elevatorId,
      length: length,
      carY: y  // Save that cart is at top
    });
    this.scene.registry.set('placedItems', this.scene.placedItems);

    return true;
  }

  // Find elevator that contains a given tile position
  findElevatorAt(x, y) {
    for (const elevator of this.elevators) {
      if (elevator.topX === x &&
          y >= elevator.topY &&
          y < elevator.topY + elevator.length) {
        return elevator;
      }
    }
    return null;
  }

  // Check if player is riding an elevator
  isPlayerRiding() {
    return this.playerRiding !== null;
  }

  // Clean up
  destroy() {
    for (const elevator of this.elevators) {
      if (elevator.carSprite) {
        elevator.carSprite.destroy();
      }
    }
    this.elevators = [];
    this.playerRiding = null;
  }
}
