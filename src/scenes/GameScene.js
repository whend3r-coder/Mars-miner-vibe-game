import Phaser from 'phaser';
import { GAME_CONFIG, UPGRADES } from '../config/GameConfig.js';
import { TILE_TYPES, getTileTypeById, getTileTypeName } from '../config/TileTypes.js';
import { Rover } from '../entities/Rover.js';
import { WorldGenerator } from '../world/WorldGenerator.js';
import { DrillSystem } from '../systems/DrillSystem.js';
import { InventorySystem } from '../systems/InventorySystem.js';
import { ShopSystem } from '../systems/ShopSystem.js';
import { LightingSystem } from '../systems/LightingSystem.js';

export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  create() {
    // Get world seed
    this.worldSeed = this.registry.get('worldSeed') || Date.now();
    this.worldGenerator = new WorldGenerator(this.worldSeed);

    // Get or create modified tiles map
    this.modifiedTiles = this.registry.get('modifiedTiles') || new Map();
    this.placedItems = this.registry.get('placedItems') || [];

    // Create sky background
    this.createBackground();

    // Create tile groups for physics
    this.solidTiles = this.physics.add.staticGroup();
    this.climbableTiles = this.add.group();
    this.hazardTiles = this.add.group();

    // Create world chunks storage
    this.loadedChunks = new Map();
    this.chunkSize = 16; // tiles per chunk

    // Set world bounds
    this.physics.world.setBounds(
      0, 0,
      GAME_CONFIG.WORLD_WIDTH * GAME_CONFIG.TILE_SIZE,
      GAME_CONFIG.WORLD_DEPTH * GAME_CONFIG.TILE_SIZE
    );

    // Create rover - spawn in center of flat surface
    const playerPos = this.registry.get('playerPosition') || {
      x: GAME_CONFIG.SPAWN_X * GAME_CONFIG.TILE_SIZE,
      y: (GAME_CONFIG.SURFACE_HEIGHT - 1) * GAME_CONFIG.TILE_SIZE,
    };

    this.rover = new Rover(this, playerPos.x, playerPos.y);

    // Set up camera with zoom
    this.cameras.main.setBounds(
      0, 0,
      GAME_CONFIG.WORLD_WIDTH * GAME_CONFIG.TILE_SIZE,
      GAME_CONFIG.WORLD_DEPTH * GAME_CONFIG.TILE_SIZE
    );
    this.cameras.main.startFollow(this.rover.sprite, true, GAME_CONFIG.CAMERA_LERP, GAME_CONFIG.CAMERA_LERP);
    this.cameras.main.setZoom(this.registry.get('gameZoom') || 1);
    // Add deadzone to prevent micro-jitter when standing still
    this.cameras.main.setDeadzone(16, 16);
    this.cameras.main.setRoundPixels(true);  // Round camera position to prevent subpixel jitter

    // Create drill system
    this.drillSystem = new DrillSystem(this);

    // Create inventory system
    this.inventorySystem = new InventorySystem(this);

    // Input setup
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    });
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.eKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);

    // Touch controls
    this.touchControls = {
      left: false,
      right: false,
      up: false,
      down: false,
      drill: false,
    };

    // Fog of war / exploration tracking
    this.exploredTiles = this.registry.get('exploredTiles') || new Set();
    this.lightRadius = 1.5; // tiles visible around rover (matches headlights level 0)

    // Create circular lighting system
    this.lightingSystem = new LightingSystem(this);

    // Set light radius based on headlights upgrade
    const gameData = this.registry.get('gameData');
    const headlightLevel = gameData?.upgrades?.headlights || 0;
    const headlightRadius = UPGRADES.headlights.levels[headlightLevel].radius;
    this.lightingSystem.setLightRadius(headlightRadius);
    this.lightRadius = headlightRadius;

    // Create surface buildings
    this.createSurfaceBuildings();

    // Initial chunk loading
    this.updateChunks();

    // Pause menu key
    this.input.keyboard.on('keydown-ESC', () => {
      this.scene.launch('PauseScene');
      this.scene.pause();
    });

    // Store reference for UI scene
    this.events.emit('gameSceneReady', this);
  }

  createBackground() {
    // Mars sky gradient (reddish-orange horizon)
    const skyHeight = GAME_CONFIG.SURFACE_HEIGHT * GAME_CONFIG.TILE_SIZE;
    const worldWidth = GAME_CONFIG.WORLD_WIDTH * GAME_CONFIG.TILE_SIZE;

    // Sky rectangle
    const sky = this.add.rectangle(
      worldWidth / 2,
      skyHeight / 2,
      worldWidth,
      skyHeight,
      0x8b4513  // Mars sky color
    ).setDepth(-10);

    // Horizon gradient effect
    const horizon = this.add.rectangle(
      worldWidth / 2,
      skyHeight - 20,
      worldWidth,
      40,
      0xc2703a
    ).setDepth(-9).setAlpha(0.5);

    // Underground darkness
    const underground = this.add.rectangle(
      worldWidth / 2,
      skyHeight + (GAME_CONFIG.WORLD_DEPTH * GAME_CONFIG.TILE_SIZE - skyHeight) / 2,
      worldWidth,
      GAME_CONFIG.WORLD_DEPTH * GAME_CONFIG.TILE_SIZE - skyHeight,
      0x0a0a15
    ).setDepth(-10);

    // Ground surface line
    const groundLine = this.add.rectangle(
      worldWidth / 2,
      skyHeight,
      worldWidth,
      4,
      0xc2703a
    ).setDepth(3);
  }

  createSurfaceBuildings() {
    // Ground level Y position (where buildings sit)
    const groundY = GAME_CONFIG.SURFACE_HEIGHT * GAME_CONFIG.TILE_SIZE;
    const tileSize = GAME_CONFIG.TILE_SIZE;

    // Check if PNG sprites loaded successfully
    const pngSprites = this.registry.get('pngSprites') || {};

    // Buildings closer together near spawn point
    // Shop building (near mine entrance)
    const shopX = 29 * tileSize;
    const shopTexture = pngSprites.shop ? 'shop_png' : 'building_shop';
    this.shopBuilding = this.add.sprite(shopX, groundY, shopTexture)
      .setOrigin(0.5, 1)
      .setDepth(5)
      .setInteractive({ useHandCursor: true });

    // Scale PNG if it's too large
    if (pngSprites.shop) {
      const targetHeight = tileSize * 3;
      const scale = targetHeight / this.shopBuilding.height;
      this.shopBuilding.setScale(scale);
    }

    // Repair building (right of spawn)
    const repairX = 58 * tileSize;
    const repairTexture = pngSprites.repair ? 'repairshop_png' : 'building_repair';
    this.repairBuilding = this.add.sprite(repairX, groundY, repairTexture)
      .setOrigin(0.5, 1)
      .setDepth(5)
      .setInteractive({ useHandCursor: true });

    // Scale PNG if it's too large
    if (pngSprites.repair) {
      const targetHeight = tileSize * 3;
      const scale = targetHeight / this.repairBuilding.height;
      this.repairBuilding.setScale(scale);
    }

    // Add labels above buildings
    this.add.bitmapText(Math.floor(shopX), Math.floor(groundY - tileSize * 3.5), 'pixel', 'SHOP [E]', 10)
      .setOrigin(0.5)
      .setTint(0xffffff)
      .setDepth(6);

    this.add.bitmapText(Math.floor(repairX), Math.floor(groundY - tileSize * 3.5), 'pixel', 'REPAIR [E]', 10)
      .setOrigin(0.5)
      .setTint(0xffffff)
      .setDepth(6);

    // Arrow pointing to mine (left side)
    this.add.bitmapText(Math.floor((GAME_CONFIG.SURFACE_START_X + 3) * tileSize), Math.floor(groundY - tileSize * 0.3), 'pixel', '<<< MINE', 10)
      .setOrigin(0, 1)
      .setTint(0xffaa00)
      .setDepth(6);
  }

  updateChunks() {
    const cameraX = this.cameras.main.scrollX;
    const cameraY = this.cameras.main.scrollY;
    const viewWidth = this.cameras.main.width;
    const viewHeight = this.cameras.main.height;

    // Calculate visible chunk range (with buffer)
    const buffer = 2;
    const startChunkX = Math.max(0, Math.floor(cameraX / (this.chunkSize * GAME_CONFIG.TILE_SIZE)) - buffer);
    const endChunkX = Math.min(
      Math.ceil(GAME_CONFIG.WORLD_WIDTH / this.chunkSize),
      Math.ceil((cameraX + viewWidth) / (this.chunkSize * GAME_CONFIG.TILE_SIZE)) + buffer
    );
    const startChunkY = Math.max(0, Math.floor(cameraY / (this.chunkSize * GAME_CONFIG.TILE_SIZE)) - buffer);
    const endChunkY = Math.min(
      Math.ceil(GAME_CONFIG.WORLD_DEPTH / this.chunkSize),
      Math.ceil((cameraY + viewHeight) / (this.chunkSize * GAME_CONFIG.TILE_SIZE)) + buffer
    );

    // Track which chunks should be visible
    const visibleChunks = new Set();

    // Load visible chunks
    for (let cx = startChunkX; cx <= endChunkX; cx++) {
      for (let cy = startChunkY; cy <= endChunkY; cy++) {
        const chunkKey = `${cx},${cy}`;
        visibleChunks.add(chunkKey);

        if (!this.loadedChunks.has(chunkKey)) {
          this.loadChunk(cx, cy);
        }
      }
    }

    // Unload far chunks
    for (const [key, chunk] of this.loadedChunks) {
      if (!visibleChunks.has(key)) {
        this.unloadChunk(key, chunk);
      }
    }
  }

  loadChunk(chunkX, chunkY) {
    const chunkKey = `${chunkX},${chunkY}`;
    const sprites = [];

    const startX = chunkX * this.chunkSize;
    const startY = chunkY * this.chunkSize;

    for (let y = startY; y < startY + this.chunkSize && y < GAME_CONFIG.WORLD_DEPTH; y++) {
      for (let x = startX; x < startX + this.chunkSize && x < GAME_CONFIG.WORLD_WIDTH; x++) {
        const tileKey = `${x},${y}`;
        let tileId;

        // Check for modified tiles first
        if (this.modifiedTiles.has(tileKey)) {
          tileId = this.modifiedTiles.get(tileKey);
        } else {
          tileId = this.worldGenerator.getTileAt(x, y);
        }

        const tileType = getTileTypeById(tileId);
        const tileName = getTileTypeName(tileId);

        if (tileId !== 0) { // Don't render air
          const sprite = this.add.sprite(
            x * GAME_CONFIG.TILE_SIZE + GAME_CONFIG.TILE_SIZE / 2,
            y * GAME_CONFIG.TILE_SIZE + GAME_CONFIG.TILE_SIZE / 2,
            `tile_${tileName}`
          );
          sprite.setData('tileX', x);
          sprite.setData('tileY', y);
          sprite.setData('tileType', tileType);
          sprites.push(sprite);

          // Add to physics group if solid
          if (tileType.solid && !tileType.oneWay) {
            const collider = this.solidTiles.create(
              x * GAME_CONFIG.TILE_SIZE + GAME_CONFIG.TILE_SIZE / 2,
              y * GAME_CONFIG.TILE_SIZE + GAME_CONFIG.TILE_SIZE / 2,
              null
            );
            collider.setSize(GAME_CONFIG.TILE_SIZE, GAME_CONFIG.TILE_SIZE);
            collider.setVisible(false);
            collider.setData('tileX', x);
            collider.setData('tileY', y);
            collider.setData('sprite', sprite);
            sprite.setData('collider', collider);
          }

          // Track climbable tiles
          if (tileType.climbable) {
            this.climbableTiles.add(sprite);
          }

          // Track hazard tiles
          if (tileType.hazard) {
            this.hazardTiles.add(sprite);
          }
        }
      }
    }

    this.loadedChunks.set(chunkKey, { sprites });
  }

  unloadChunk(key, chunk) {
    for (const sprite of chunk.sprites) {
      const collider = sprite.getData('collider');
      if (collider) {
        collider.destroy();
      }
      sprite.destroy();
    }
    this.loadedChunks.delete(key);
  }

  getTileAt(tileX, tileY) {
    const tileKey = `${tileX},${tileY}`;

    if (this.modifiedTiles.has(tileKey)) {
      return getTileTypeById(this.modifiedTiles.get(tileKey));
    }

    const tileId = this.worldGenerator.getTileAt(tileX, tileY);
    return getTileTypeById(tileId);
  }

  setTileAt(tileX, tileY, tileId) {
    const tileKey = `${tileX},${tileY}`;
    this.modifiedTiles.set(tileKey, tileId);
    this.registry.set('modifiedTiles', this.modifiedTiles);

    // Reload the chunk containing this tile
    const chunkX = Math.floor(tileX / this.chunkSize);
    const chunkY = Math.floor(tileY / this.chunkSize);
    const chunkKey = `${chunkX},${chunkY}`;

    if (this.loadedChunks.has(chunkKey)) {
      this.unloadChunk(chunkKey, this.loadedChunks.get(chunkKey));
      this.loadChunk(chunkX, chunkY);
    }
  }

  isOnSurface() {
    return this.rover.sprite.y < GAME_CONFIG.SURFACE_HEIGHT * GAME_CONFIG.TILE_SIZE;
  }

  update(time, delta) {
    // Update chunks based on camera position
    this.updateChunks();

    // Get input
    const input = {
      left: this.cursors.left.isDown || this.wasd.left.isDown || this.touchControls.left,
      right: this.cursors.right.isDown || this.wasd.right.isDown || this.touchControls.right,
      up: this.cursors.up.isDown || this.wasd.up.isDown || this.touchControls.up,
      down: this.cursors.down.isDown || this.wasd.down.isDown || this.touchControls.down,
      // Drill ONLY with Space key or touch drill button (not movement keys)
      drill: this.spaceKey.isDown || this.touchControls.drill,
      interact: this.eKey.isDown,
    };

    // Update explored tiles (fog of war)
    this.updateExploration();

    // Update rover
    this.rover.update(time, delta, input);

    // Update drill system
    this.drillSystem.update(time, delta, input);

    // Check building interactions
    this.checkBuildingInteractions();

    // Handle E key for shop/repair interaction (priority over item use)
    if (Phaser.Input.Keyboard.JustDown(this.eKey)) {
      if (this.nearShop) {
        this.sellCargoAtShop();
        this.openShop();
      } else if (this.nearRepair) {
        this.repairAtShop();
      } else {
        // Use inventory item if not near a building
        this.inventorySystem.useSelectedItem();
      }
    }

    // Update fog of war overlay
    this.updateFogOfWar();

    // Update circular lighting
    if (this.lightingSystem) {
      this.lightingSystem.update(this.rover.sprite.x, this.rover.sprite.y);
    }

    // Emit update event for UI
    this.events.emit('gameUpdate', {
      battery: this.rover.battery,
      maxBattery: this.rover.maxBattery,
      hull: this.rover.hull,
      maxHull: this.rover.maxHull,
      cargo: this.rover.cargo,
      maxCargo: this.rover.maxCargo,
      money: this.registry.get('gameData').money,
      depth: Math.max(0, Math.floor(this.rover.sprite.y / GAME_CONFIG.TILE_SIZE) - GAME_CONFIG.SURFACE_HEIGHT),
      isOnSurface: this.isOnSurface(),
      isRecharging: this.rover.isRecharging,
    });
  }

  checkBuildingInteractions() {
    if (!this.isOnSurface()) return;

    const roverX = this.rover.sprite.x;
    const roverY = this.rover.sprite.y;
    const interactionRange = GAME_CONFIG.TILE_SIZE * 3;

    // Check shop proximity
    const shopDist = Phaser.Math.Distance.Between(roverX, roverY, this.shopBuilding.x, this.shopBuilding.y);
    this.nearShop = shopDist < interactionRange;

    // Check repair proximity
    const repairDist = Phaser.Math.Distance.Between(roverX, roverY, this.repairBuilding.x, this.repairBuilding.y);
    this.nearRepair = repairDist < interactionRange;

    // Emit events for UI
    if (this.nearShop) {
      this.events.emit('nearBuilding', 'shop');
    }
    if (this.nearRepair) {
      this.events.emit('nearBuilding', 'repair');
    }
  }

  updateExploration() {
    // Get rover tile position
    const roverTileX = Math.floor(this.rover.sprite.x / GAME_CONFIG.TILE_SIZE);
    const roverTileY = Math.floor(this.rover.sprite.y / GAME_CONFIG.TILE_SIZE);

    // Mark tiles within light radius as explored
    for (let dx = -this.lightRadius; dx <= this.lightRadius; dx++) {
      for (let dy = -this.lightRadius; dy <= this.lightRadius; dy++) {
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= this.lightRadius) {
          const key = `${roverTileX + dx},${roverTileY + dy}`;
          this.exploredTiles.add(key);
        }
      }
    }

    // Save explored tiles
    this.registry.set('exploredTiles', this.exploredTiles);
  }

  updateFogOfWar() {
    // The new LightingSystem handles smooth circular darkness overlay.
    // This method now just ensures all tiles are rendered at full brightness.
    // Darkness effect comes from the overlay, not tile alpha/tint.

    for (const [key, chunk] of this.loadedChunks) {
      for (const sprite of chunk.sprites) {
        sprite.setAlpha(1);
        sprite.clearTint();
      }
    }
  }

  isTileVisible(tileX, tileY) {
    // Surface tiles are always visible
    if (tileY <= GAME_CONFIG.SURFACE_HEIGHT) {
      return { visible: true, explored: true };
    }

    const roverTileX = Math.floor(this.rover.sprite.x / GAME_CONFIG.TILE_SIZE);
    const roverTileY = Math.floor(this.rover.sprite.y / GAME_CONFIG.TILE_SIZE);

    const dx = tileX - roverTileX;
    const dy = tileY - roverTileY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    const isInLight = dist <= this.lightRadius;
    const isExplored = this.exploredTiles.has(`${tileX},${tileY}`);

    return { visible: isInLight, explored: isExplored };
  }

  openShop() {
    // Create shop system if not exists
    if (!this.shopSystem) {
      const uiScene = this.scene.get('UIScene');
      this.shopSystem = new ShopSystem(uiScene);
    }
    this.shopSystem.open();
  }

  sellCargoAtShop() {
    const sold = this.rover.sellCargo();
    if (sold > 0) {
      // Show feedback
      const msg = this.add.bitmapText(
        Math.floor(this.rover.sprite.x),
        Math.floor(this.rover.sprite.y - 30),
        'pixel',
        `+$${sold}`,
        10
      ).setOrigin(0.5).setTint(0x44ff44).setDepth(100);

      this.tweens.add({
        targets: msg,
        y: msg.y - 20,
        alpha: 0,
        duration: 1500,
        onComplete: () => msg.destroy()
      });
    }
  }

  repairAtShop() {
    const gameData = this.registry.get('gameData');
    const repairCost = 5; // per HP
    const damageAmount = this.rover.maxHull - this.rover.hull;

    if (damageAmount > 0 && gameData.money >= repairCost) {
      const affordable = Math.floor(gameData.money / repairCost);
      const repairAmount = Math.min(damageAmount, affordable);
      const cost = repairAmount * repairCost;

      gameData.money -= cost;
      this.registry.set('gameData', gameData);
      this.rover.repair(repairAmount);

      // Show feedback
      const msg = this.add.bitmapText(
        Math.floor(this.rover.sprite.x),
        Math.floor(this.rover.sprite.y - 30),
        'pixel',
        `REPAIRED +${repairAmount} HP`,
        10
      ).setOrigin(0.5).setTint(0x44ff44).setDepth(100);

      this.tweens.add({
        targets: msg,
        y: msg.y - 20,
        alpha: 0,
        duration: 1500,
        onComplete: () => msg.destroy()
      });
    }
  }
}
