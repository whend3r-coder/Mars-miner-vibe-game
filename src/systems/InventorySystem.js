import { GAME_CONFIG, SHOP_ITEMS } from '../config/GameConfig.js';
import { TILE_TYPES } from '../config/TileTypes.js';

export class InventorySystem {
  constructor(scene) {
    this.scene = scene;
    this.selectedSlot = 0;
    this.maxSlots = 6;

    // Setup input for item selection
    this.setupInput();
  }

  setupInput() {
    // Number keys to select hotbar slots
    for (let i = 1; i <= 6; i++) {
      this.scene.input.keyboard.on(`keydown-${i}`, () => {
        this.selectedSlot = i - 1;
        this.scene.events.emit('hotbarSelect', this.selectedSlot);
      });
    }

    // E key is handled by GameScene to prioritize building interactions
  }

  getInventory() {
    const gameData = this.scene.registry.get('gameData');
    return gameData?.inventory || [];
  }

  addItem(itemType, quantity = 1) {
    const gameData = this.scene.registry.get('gameData');
    const inventory = gameData.inventory || [];
    const itemDef = SHOP_ITEMS[itemType];

    if (!itemDef) return false;

    // Check if item is stackable and already exists
    if (itemDef.stackable) {
      const existingSlot = inventory.findIndex(slot => slot && slot.type === itemType);

      if (existingSlot >= 0) {
        const newQuantity = inventory[existingSlot].quantity + quantity;
        if (newQuantity <= itemDef.maxStack) {
          inventory[existingSlot].quantity = newQuantity;
          gameData.inventory = inventory;
          this.scene.registry.set('gameData', gameData);
          return true;
        }
      }
    }

    // Find empty slot
    let emptySlot = inventory.findIndex(slot => !slot);
    if (emptySlot < 0 && inventory.length < this.maxSlots) {
      emptySlot = inventory.length;
    }

    if (emptySlot >= 0 && emptySlot < this.maxSlots) {
      inventory[emptySlot] = { type: itemType, quantity };
      gameData.inventory = inventory;
      this.scene.registry.set('gameData', gameData);
      return true;
    }

    return false; // Inventory full
  }

  removeItem(slotIndex, quantity = 1) {
    const gameData = this.scene.registry.get('gameData');
    const inventory = gameData.inventory || [];

    if (!inventory[slotIndex]) return false;

    inventory[slotIndex].quantity -= quantity;

    if (inventory[slotIndex].quantity <= 0) {
      inventory[slotIndex] = null;
    }

    gameData.inventory = inventory;
    this.scene.registry.set('gameData', gameData);
    return true;
  }

  useSelectedItem() {
    const inventory = this.getInventory();
    const selectedItem = inventory[this.selectedSlot];

    if (!selectedItem) return;

    const itemType = selectedItem.type;

    switch (itemType) {
      case 'ladder':
        this.placeLadder();
        break;
      case 'platform':
        this.placePlatform();
        break;
      case 'torch':
        this.placeTorch();
        break;
      case 'dynamite':
        this.placeDynamite();
        break;
      case 'elevatorSmall':
        this.placeElevator('elevatorSmall');
        break;
      case 'elevatorMedium':
        this.placeElevator('elevatorMedium');
        break;
      case 'elevatorLarge':
        this.placeElevator('elevatorLarge');
        break;
      case 'scanner':
        this.useScanner();
        break;
      case 'teleporterPad':
        this.placeTeleporter();
        break;
      default:
        break;
    }
  }

  getPlacementPosition(atRoverPosition = false) {
    const rover = this.scene.rover;
    const tileX = Math.floor(rover.sprite.x / GAME_CONFIG.TILE_SIZE);
    const tileY = Math.floor(rover.sprite.y / GAME_CONFIG.TILE_SIZE);

    // Some items (ladders) should be placed at rover's position
    if (atRoverPosition) {
      return { x: tileX, y: tileY };
    }

    // Others place in direction rover is facing
    if (rover.facingRight) {
      return { x: tileX + 1, y: tileY };
    } else {
      return { x: tileX - 1, y: tileY };
    }
  }

  canPlaceAt(tileX, tileY, allowReplace = false) {
    const tile = this.scene.getTileAt(tileX, tileY);
    if (!tile) return false;

    // Can't place on solid tiles
    if (tile.solid) return false;

    // Can't place on tiles that already have placed items (ladder, torch, etc.)
    // unless explicitly allowed
    if (!allowReplace && tile.placed) return false;

    return true;
  }

  placeLadder() {
    // Ladders are placed at the rover's current position
    const pos = this.getPlacementPosition(true);
    const tile = this.scene.getTileAt(pos.x, pos.y);

    // Check if already a ladder here
    if (tile && tile.climbable) {
      this.showPlacementFeedback(pos.x, pos.y, 'Already a ladder here', true);
      return;
    }

    if (this.canPlaceAt(pos.x, pos.y)) {
      this.scene.setTileAt(pos.x, pos.y, TILE_TYPES.ladder.id);
      this.removeItem(this.selectedSlot);
      this.showPlacementFeedback(pos.x, pos.y, 'Ladder placed');

      // Track placed item
      this.trackPlacedItem('ladder', pos.x, pos.y);
    } else {
      this.showPlacementFeedback(pos.x, pos.y, 'Cannot place here', true);
    }
  }

  placePlatform() {
    const pos = this.getPlacementPosition();

    if (this.canPlaceAt(pos.x, pos.y)) {
      this.scene.setTileAt(pos.x, pos.y, TILE_TYPES.platform.id);
      this.removeItem(this.selectedSlot);
      this.showPlacementFeedback(pos.x, pos.y, 'Platform placed');
      this.trackPlacedItem('platform', pos.x, pos.y);
    } else {
      this.showPlacementFeedback(pos.x, pos.y, 'Cannot place here', true);
    }
  }

  placeTorch() {
    const pos = this.getPlacementPosition();

    if (this.canPlaceAt(pos.x, pos.y)) {
      this.scene.setTileAt(pos.x, pos.y, TILE_TYPES.torch.id);
      this.removeItem(this.selectedSlot);
      this.showPlacementFeedback(pos.x, pos.y, 'Torch placed');
      this.trackPlacedItem('torch', pos.x, pos.y);

      // Add light effect
      this.addLightAt(pos.x, pos.y);
    } else {
      this.showPlacementFeedback(pos.x, pos.y, 'Cannot place here', true);
    }
  }

  placeDynamite() {
    const pos = this.getPlacementPosition();
    const tileX = pos.x;
    const tileY = pos.y;

    this.removeItem(this.selectedSlot);
    this.showPlacementFeedback(tileX, tileY, 'BOOM!');

    // Delayed explosion
    this.scene.time.delayedCall(500, () => {
      this.explodeDynamite(tileX, tileY);
    });
  }

  explodeDynamite(centerX, centerY) {
    const radius = 2;

    // Visual effect
    const x = centerX * GAME_CONFIG.TILE_SIZE + GAME_CONFIG.TILE_SIZE / 2;
    const y = centerY * GAME_CONFIG.TILE_SIZE + GAME_CONFIG.TILE_SIZE / 2;

    this.scene.cameras.main.shake(200, 0.01);

    const explosion = this.scene.add.circle(x, y, 10, 0xff6600).setDepth(30);
    this.scene.tweens.add({
      targets: explosion,
      scale: 5,
      alpha: 0,
      duration: 400,
      onComplete: () => explosion.destroy(),
    });

    // Destroy tiles in radius
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= radius) {
          const tile = this.scene.getTileAt(centerX + dx, centerY + dy);
          if (tile && tile.solid && !tile.surface) {
            this.scene.setTileAt(centerX + dx, centerY + dy, TILE_TYPES.air.id);
          }
        }
      }
    }
  }

  placeElevator(elevatorType) {
    const rover = this.scene.rover;
    const roverTileX = Math.floor(rover.sprite.x / GAME_CONFIG.TILE_SIZE);
    // Get tile where rover body is (not feet) - elevator starts at rover level
    const roverTileY = Math.floor(rover.sprite.y / GAME_CONFIG.TILE_SIZE);

    const itemDef = SHOP_ITEMS[elevatorType];
    if (!itemDef || !itemDef.elevatorLength) {
      this.showPlacementFeedback(roverTileX, roverTileY, 'Invalid elevator', true);
      return;
    }

    // Show placement overlay with 3 options
    this.showElevatorPlacementOverlay(elevatorType, roverTileX, roverTileY);
  }

  showElevatorPlacementOverlay(elevatorType, roverTileX, roverTileY) {
    const itemDef = SHOP_ITEMS[elevatorType];
    const length = itemDef.elevatorLength;

    // Calculate positions: behind, on rover, in front
    const positions = [];
    const rover = this.scene.rover;

    // Behind (opposite of facing direction)
    const behindX = rover.facingRight ? roverTileX - 1 : roverTileX + 1;
    positions.push({ x: behindX, y: roverTileY, label: 'BEHIND' });

    // On rover position
    positions.push({ x: roverTileX, y: roverTileY, label: 'HERE' });

    // In front (facing direction)
    const frontX = rover.facingRight ? roverTileX + 1 : roverTileX - 1;
    positions.push({ x: frontX, y: roverTileY, label: 'FRONT' });

    // Create overlay elements
    this.elevatorPlacementOverlay = [];
    this.pendingElevatorType = elevatorType;
    this.pendingElevatorLength = length;

    for (let i = 0; i < positions.length; i++) {
      const pos = positions[i];
      const worldX = pos.x * GAME_CONFIG.TILE_SIZE + GAME_CONFIG.TILE_SIZE / 2;
      const worldY = pos.y * GAME_CONFIG.TILE_SIZE + GAME_CONFIG.TILE_SIZE / 2;

      // Check if this position is valid
      let canPlace = true;
      for (let dy = 0; dy < length; dy++) {
        const tile = this.scene.getTileAt(pos.x, pos.y + dy);
        if (tile && tile.solid && !tile.placed) {
          canPlace = false;
          break;
        }
      }

      // Create preview rectangle showing elevator shaft
      const previewColor = canPlace ? 0x44ff44 : 0xff4444;
      const preview = this.scene.add.rectangle(
        worldX,
        worldY + (length / 2 - 0.5) * GAME_CONFIG.TILE_SIZE,
        GAME_CONFIG.TILE_SIZE * 0.8,
        length * GAME_CONFIG.TILE_SIZE * 0.9,
        previewColor,
        0.3
      ).setDepth(50).setStrokeStyle(2, previewColor, 0.8);

      // Create label
      const label = this.scene.add.bitmapText(
        Math.floor(worldX),
        Math.floor(worldY - GAME_CONFIG.TILE_SIZE * 0.8),
        'pixel',
        pos.label,
        10
      ).setOrigin(0.5).setTint(canPlace ? 0x44ff44 : 0xff4444).setDepth(51);

      // Create clickable button
      const button = this.scene.add.rectangle(
        worldX,
        worldY,
        GAME_CONFIG.TILE_SIZE,
        GAME_CONFIG.TILE_SIZE,
        0x000000,
        0.01
      ).setDepth(52).setInteractive({ useHandCursor: canPlace });

      if (canPlace) {
        button.on('pointerdown', () => {
          this.confirmElevatorPlacement(pos.x, pos.y);
        });
      }

      this.elevatorPlacementOverlay.push({ preview, label, button, pos, canPlace });
    }

    // Create cancel hint
    const cancelHint = this.scene.add.bitmapText(
      Math.floor(rover.sprite.x),
      Math.floor(rover.sprite.y - GAME_CONFIG.TILE_SIZE * 2),
      'pixel',
      'TAP TO PLACE - ESC TO CANCEL',
      8
    ).setOrigin(0.5).setTint(0xaaaaaa).setDepth(51);
    this.elevatorPlacementOverlay.push({ label: cancelHint });

    // Listen for ESC or click elsewhere to cancel
    this.elevatorCancelHandler = () => {
      this.cancelElevatorPlacement();
    };
    this.scene.input.keyboard.once('keydown-ESC', this.elevatorCancelHandler);

    // Auto-cancel after 5 seconds
    this.elevatorTimeout = this.scene.time.delayedCall(5000, () => {
      this.cancelElevatorPlacement();
    });
  }

  confirmElevatorPlacement(x, y) {
    // Clean up overlay
    this.cleanupElevatorOverlay();

    // Place the elevator
    if (this.scene.elevatorSystem) {
      const success = this.scene.elevatorSystem.placeElevator(x, y, this.pendingElevatorType);
      if (success) {
        this.removeItem(this.selectedSlot);
        this.showPlacementFeedback(x, y, `${this.pendingElevatorLength}-tile elevator placed`);
      } else {
        this.showPlacementFeedback(x, y, 'Cannot place here', true);
      }
    }

    this.pendingElevatorType = null;
    this.pendingElevatorLength = null;
  }

  cancelElevatorPlacement() {
    this.cleanupElevatorOverlay();
    this.pendingElevatorType = null;
    this.pendingElevatorLength = null;

    const rover = this.scene.rover;
    const roverTileX = Math.floor(rover.sprite.x / GAME_CONFIG.TILE_SIZE);
    const roverTileY = Math.floor(rover.sprite.y / GAME_CONFIG.TILE_SIZE);
    this.showPlacementFeedback(roverTileX, roverTileY, 'Cancelled', true);
  }

  cleanupElevatorOverlay() {
    if (this.elevatorPlacementOverlay) {
      // Fade out all elements before destroying
      for (const item of this.elevatorPlacementOverlay) {
        const elements = [];
        if (item.preview) elements.push(item.preview);
        if (item.label) elements.push(item.label);
        if (item.button) elements.push(item.button);

        // Immediately destroy all elements (no fade for reliability)
        for (const el of elements) {
          try {
            if (el && el.destroy) {
              el.destroy();
            }
          } catch (e) {
            // Already destroyed
          }
        }
      }
      this.elevatorPlacementOverlay = [];
      this.elevatorPlacementOverlay = null;
    }

    if (this.elevatorTimeout) {
      try {
        this.elevatorTimeout.destroy();
      } catch (e) {
        // Already destroyed
      }
      this.elevatorTimeout = null;
    }

    if (this.elevatorCancelHandler) {
      try {
        this.scene.input.keyboard.off('keydown-ESC', this.elevatorCancelHandler);
      } catch (e) {
        // Already removed
      }
      this.elevatorCancelHandler = null;
    }
  }

  useScanner() {
    const rover = this.scene.rover;
    const centerX = Math.floor(rover.sprite.x / GAME_CONFIG.TILE_SIZE);
    const centerY = Math.floor(rover.sprite.y / GAME_CONFIG.TILE_SIZE);
    const radius = 8;

    // Reveal ores in radius
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= radius) {
          const tile = this.scene.getTileAt(centerX + dx, centerY + dy);
          if (tile && tile.ore) {
            this.showOrePing(centerX + dx, centerY + dy, tile.ore);
          }
        }
      }
    }

    // Scanner is reusable, don't remove
    this.showPlacementFeedback(centerX, centerY, 'Scanning...');
  }

  showOrePing(tileX, tileY, oreType) {
    const x = tileX * GAME_CONFIG.TILE_SIZE + GAME_CONFIG.TILE_SIZE / 2;
    const y = tileY * GAME_CONFIG.TILE_SIZE + GAME_CONFIG.TILE_SIZE / 2;

    const ping = this.scene.add.circle(x, y, 4, 0x00ff00, 0.8).setDepth(25);

    this.scene.tweens.add({
      targets: ping,
      scale: 2,
      alpha: 0,
      duration: 2000,
      onComplete: () => ping.destroy(),
    });
  }

  placeTeleporter() {
    const pos = this.getPlacementPosition();

    if (this.canPlaceAt(pos.x, pos.y)) {
      this.scene.setTileAt(pos.x, pos.y, TILE_TYPES.teleporter.id);
      this.removeItem(this.selectedSlot);
      this.showPlacementFeedback(pos.x, pos.y, 'Teleporter placed');

      // Track teleporter for linking
      const teleporters = this.scene.placedItems.filter(i => i.type === 'teleporter');
      const teleporterId = teleporters.length;
      this.trackPlacedItem('teleporter', pos.x, pos.y, { id: teleporterId });
    } else {
      this.showPlacementFeedback(pos.x, pos.y, 'Cannot place here', true);
    }
  }

  addLightAt(tileX, tileY) {
    // Create a light effect (simple glow circle)
    const x = tileX * GAME_CONFIG.TILE_SIZE + GAME_CONFIG.TILE_SIZE / 2;
    const y = tileY * GAME_CONFIG.TILE_SIZE + GAME_CONFIG.TILE_SIZE / 2;

    const light = this.scene.add.circle(x, y, 40, 0xffaa00, 0.15).setDepth(5);

    // Flicker animation
    this.scene.tweens.add({
      targets: light,
      alpha: { from: 0.1, to: 0.2 },
      scale: { from: 0.95, to: 1.05 },
      duration: 500,
      yoyo: true,
      repeat: -1,
    });
  }

  trackPlacedItem(type, x, y, data = {}) {
    this.scene.placedItems.push({ type, x, y, ...data });
    this.scene.registry.set('placedItems', this.scene.placedItems);
  }

  showPlacementFeedback(tileX, tileY, message, isError = false) {
    const x = Math.floor(tileX * GAME_CONFIG.TILE_SIZE + GAME_CONFIG.TILE_SIZE / 2);
    const y = tileY * GAME_CONFIG.TILE_SIZE;

    const text = this.scene.add.bitmapText(x, y, 'pixel', message.toUpperCase(), 10)
      .setOrigin(0.5)
      .setTint(isError ? 0xff4444 : 0x44ff44)
      .setDepth(30);

    this.scene.tweens.add({
      targets: text,
      y: y - 40,
      alpha: 0,
      duration: 1000,
      onComplete: () => text.destroy(),
    });
  }
}
