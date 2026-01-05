import Phaser from 'phaser';
import { GAME_CONFIG, UPGRADES } from '../config/GameConfig.js';
import { TILE_TYPES, getTileTypeById, getTileTypeName } from '../config/TileTypes.js';
import { Rover } from '../entities/Rover.js';
import { WorldGenerator } from '../world/WorldGenerator.js';
import { DrillSystem } from '../systems/DrillSystem.js';
import { InventorySystem } from '../systems/InventorySystem.js';
import { ShopSystem } from '../systems/ShopSystem.js';
import { LightingSystem } from '../systems/LightingSystem.js';
import { SaveSystem } from '../systems/SaveSystem.js';
import { BoulderSystem } from '../systems/BoulderSystem.js';
import { ElevatorSystem } from '../systems/ElevatorSystem.js';

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

    // Restore rover state if loading from save
    const savedRoverState = this.registry.get('roverState');
    if (savedRoverState) {
      this.rover.battery = savedRoverState.battery;
      this.rover.hull = savedRoverState.hull;
      this.rover.cargo = savedRoverState.cargo || [];
      this.registry.set('roverState', null);  // Clear after use
    }

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

    // Create boulder system for falling boulders
    this.boulderSystem = new BoulderSystem(this);

    // Create elevator system
    this.elevatorSystem = new ElevatorSystem(this);

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

    // Apply dev mode darkness setting
    const disableDarkness = this.registry.get('disableDarkness') === true;
    if (disableDarkness) {
      this.lightingSystem.setEnabled(false);
    }

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

  // Determine which mined_dirt background sprite to use based on adjacent tiles
  // Sprite naming convention:
  // - left_wall / right_wall = wall texture on that side (solid neighbor)
  // - rock_below = floor texture (solid below)
  // - and_above = ceiling texture (solid above)
  // - walls_on_each_side = left AND right walls (horizontal corridor)
  // - pit_shaft_above = at bottom of vertical shaft, shaft visible above
  // - corner_wall = L-shaped corner where floor meets wall
  getMinedDirtSprite(x, y) {
    // Get adjacent tile states (true = solid/wall, false = air/mined)
    const left = this.isSolidAt(x - 1, y);
    const right = this.isSolidAt(x + 1, y);
    const above = this.isSolidAt(x, y - 1);
    const below = this.isSolidAt(x, y + 1);

    // Check if this is a mined tile (modified to air) vs natural air
    const tileKey = `${x},${y}`;
    const isModified = this.modifiedTiles.has(tileKey);

    // Only show background for underground tiles or modified tiles
    if (y < GAME_CONFIG.SURFACE_HEIGHT && !isModified) {
      return null; // Above ground natural air - no background
    }

    // Check if ceiling is visible above (for pit sprites)
    // Scan upward through shaft to find ceiling, or check surface ground for surface pits
    let hasCeilingVisible = false;
    if (!above) {
      // Scan upward to find solid ceiling within the shaft
      for (let scanY = y - 1; scanY >= Math.max(0, y - 50); scanY--) {
        if (this.isSolidAt(x, scanY)) {
          hasCeilingVisible = true;
          break;
        }
      }
      // For surface pits: if below surface, ground at surface level forms visible "ceiling"
      if (!hasCeilingVisible && y > GAME_CONFIG.SURFACE_HEIGHT) {
        const surfaceLevel = GAME_CONFIG.SURFACE_HEIGHT;
        if (this.isSolidAt(x - 1, surfaceLevel) || this.isSolidAt(x + 1, surfaceLevel)) {
          hasCeilingVisible = true;
        }
      }
    }

    // === 4 SIDES SOLID - Crossroads ===
    if (left && right && above && below) {
      return 'mined_dirt_rock_below_left_upper_corner_shaft_on_allsides_cross';
    }

    // === 3 SIDES SOLID ===
    // Pit bottom: floor + left wall + right wall (open above) - digging straight down
    // Only use pit sprite if there's a visible ceiling above, otherwise use floor sprite
    if (below && left && right && !above) {
      if (hasCeilingVisible) {
        return 'mined_dirt_rock_pit_shaft_above';
      }
      // No ceiling visible (open to sky) - just show floor with walls
      return 'mined_dirt_rock_below';
    }
    // T-junction from below: ceiling + left wall + right wall (open below)
    if (above && left && right && !below) {
      return 'mined_dirt_walls_on_each_side_and_top';
    }
    // Horizontal shaft RIGHT end: floor + ceiling + right wall (open left)
    if (below && above && right && !left) {
      return 'mined_dirt_rock_below_right_corner_wall';
    }
    // Horizontal shaft LEFT end: floor + ceiling + left wall (open right)
    if (below && above && left && !right) {
      return 'mined_dirt_rock_below_left_corner_wall';
    }

    // === 2 SIDES SOLID ===
    // Vertical shaft: floor + ceiling (open left and right)
    if (below && above && !left && !right) {
      return 'mined_dirt_rock_below_and_above';
    }
    // Horizontal corridor: left wall + right wall (open above and below)
    if (left && right && !above && !below) {
      return 'mined_dirt_walls_on_each_side';
    }
    // L-corner: floor + left wall (open above and right)
    // Check diagonal to determine tight junction vs open space
    if (below && left && !above && !right) {
      const diagonalSolid = this.isSolidAt(x + 1, y - 1); // upper-right diagonal
      if (diagonalSolid) {
        // Tight L-junction - walls form enclosed corner
        return 'mined_dirt_rock_corner_L-junction-shaft_to_the_right';
      }
      // Open L-corner - free space around
      return 'mined_dirt_rock_pit_left_wall_and_ground_shaft_above';
    }
    // L-corner: floor + right wall (open above and left)
    if (below && right && !above && !left) {
      const diagonalSolid = this.isSolidAt(x - 1, y - 1); // upper-left diagonal
      if (diagonalSolid) {
        // Tight L-junction - walls form enclosed corner
        return 'mined_dirt_rock_corner_L-junction-shaft_to_the_left';
      }
      // Open L-corner - free space around
      return 'mined_dirt_rock_pit_right_wall_and_ground_shaft_above';
    }
    // Upper-left corner: ceiling + left wall (open below and right) - shaft below and to the side
    if (above && left && !below && !right) {
      return 'mined_dirt_top_left_corner_free_space_around';
    }
    // Upper-right corner: ceiling + right wall (open below and left) - shaft below and to the side
    if (above && right && !below && !left) {
      return 'mined_dirt_top_right_corner_free_space_around';
    }

    // === 1 SIDE SOLID ===
    // Floor only - check diagonals to determine tight T-junction vs open space
    if (below && !above && !left && !right) {
      const topLeftSolid = this.isSolidAt(x - 1, y - 1);
      const topRightSolid = this.isSolidAt(x + 1, y - 1);

      if (topLeftSolid && topRightSolid) {
        // Both diagonals solid - tight T-junction
        return 'mined_dirt_rock_below_shaft_on_left_right_top';
      } else if (topLeftSolid && !topRightSolid) {
        // Top-right free - use left upper corner variant
        return 'mined_dirt_rock_below_left_upper_corner_shaft_on_top_only';
      } else if (!topLeftSolid && topRightSolid) {
        // Top-left free - use right upper corner variant
        return 'mined_dirt_rock_below_right_upper_corner_shaft_on_top_only';
      } else {
        // Both diagonals free - open space, just floor
        return 'mined_dirt_rock_below';
      }
    }
    // Left wall only (open above, below, right)
    if (left && !above && !below && !right) {
      return 'mined_dirt_left_wall';
    }
    // Right wall only (open above, below, left)
    if (right && !above && !below && !left) {
      return 'mined_dirt_right_wall';
    }
    // Ceiling only (open below, left, right)
    if (above && !below && !left && !right) {
      return 'mined_dirt_just_top_free_space_around';
    }

    // === 0 SIDES SOLID ===
    // Check for tight 4-way cross (all 4 directions open, but diagonals solid)
    if (!above && !below && !left && !right) {
      const topLeftSolid = this.isSolidAt(x - 1, y - 1);
      const topRightSolid = this.isSolidAt(x + 1, y - 1);
      const bottomLeftSolid = this.isSolidAt(x - 1, y + 1);
      const bottomRightSolid = this.isSolidAt(x + 1, y + 1);

      if (topLeftSolid && topRightSolid && bottomLeftSolid && bottomRightSolid) {
        // Perfect tight 4-way cross - all diagonals solid
        return 'mined_dirt_rock_below_left_upper_corner_shaft_on_allsides_cross';
      }
    }

    // Open area - no walls nearby
    return 'mined_dirt';
  }

  // Check if a tile position has a solid tile
  isSolidAt(x, y) {
    if (x < 0 || x >= GAME_CONFIG.WORLD_WIDTH || y < 0 || y >= GAME_CONFIG.WORLD_DEPTH) {
      return true; // Treat out of bounds as solid
    }

    const tileKey = `${x},${y}`;
    let tileId;

    if (this.modifiedTiles.has(tileKey)) {
      tileId = this.modifiedTiles.get(tileKey);
    } else {
      tileId = this.worldGenerator.getTileAt(x, y);
    }

    if (tileId === 0) return false; // Air is not solid

    const tileType = getTileTypeById(tileId);
    return tileType.solid || false;
  }

  loadChunk(chunkX, chunkY) {
    const chunkKey = `${chunkX},${chunkY}`;
    const sprites = [];
    const backgroundSprites = [];

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

          // Add background behind transparent placed items (ladders, elevators, etc.)
          if (tileType.placed || tileType.climbable || tileType.elevatorPart) {
            const bgTexture = this.getMinedDirtSprite(x, y);
            if (bgTexture) {
              const bgSprite = this.add.sprite(
                x * GAME_CONFIG.TILE_SIZE + GAME_CONFIG.TILE_SIZE / 2,
                y * GAME_CONFIG.TILE_SIZE + GAME_CONFIG.TILE_SIZE / 2,
                bgTexture
              );
              bgSprite.setDepth(-1); // Behind everything
              bgSprite.setData('tileX', x);
              bgSprite.setData('tileY', y);
              bgSprite.setData('isBackground', true);
              backgroundSprites.push(bgSprite);
            }
          }
        } else {
          // Air tile - check if we should render a mined dirt background
          const bgTexture = this.getMinedDirtSprite(x, y);
          if (bgTexture) {
            const bgSprite = this.add.sprite(
              x * GAME_CONFIG.TILE_SIZE + GAME_CONFIG.TILE_SIZE / 2,
              y * GAME_CONFIG.TILE_SIZE + GAME_CONFIG.TILE_SIZE / 2,
              bgTexture
            );
            bgSprite.setDepth(-1); // Behind everything
            bgSprite.setData('tileX', x);
            bgSprite.setData('tileY', y);
            bgSprite.setData('isBackground', true);
            backgroundSprites.push(bgSprite);
          }
        }
      }
    }

    this.loadedChunks.set(chunkKey, { sprites, backgroundSprites });
  }

  unloadChunk(key, chunk) {
    for (const sprite of chunk.sprites) {
      const collider = sprite.getData('collider');
      if (collider) {
        collider.destroy();
      }
      sprite.destroy();
    }
    // Clean up background sprites
    if (chunk.backgroundSprites) {
      for (const bgSprite of chunk.backgroundSprites) {
        bgSprite.destroy();
      }
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

    // Also reload adjacent chunks if tile is at chunk boundary
    // (adjacent tiles in other chunks need their backgrounds updated)
    const localX = tileX % this.chunkSize;
    const localY = tileY % this.chunkSize;

    // Check and reload adjacent chunks at boundaries
    const adjacentChunks = [];
    if (localX === 0) adjacentChunks.push([chunkX - 1, chunkY]); // Left edge
    if (localX === this.chunkSize - 1) adjacentChunks.push([chunkX + 1, chunkY]); // Right edge
    if (localY === 0) adjacentChunks.push([chunkX, chunkY - 1]); // Top edge
    if (localY === this.chunkSize - 1) adjacentChunks.push([chunkX, chunkY + 1]); // Bottom edge

    for (const [adjX, adjY] of adjacentChunks) {
      const adjKey = `${adjX},${adjY}`;
      if (this.loadedChunks.has(adjKey)) {
        this.unloadChunk(adjKey, this.loadedChunks.get(adjKey));
        this.loadChunk(adjX, adjY);
      }
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

    // Update boulder system (check for falling boulders)
    if (this.boulderSystem) {
      this.boulderSystem.update(time, delta);
    }

    // Update elevator system (handle riding elevators)
    if (this.elevatorSystem) {
      this.elevatorSystem.update(time, delta, input);
    }

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
      // Use sprite center + half tile to get the tile we're standing ON
      depth: Math.max(0, Math.floor((this.rover.sprite.y + GAME_CONFIG.TILE_SIZE / 2) / GAME_CONFIG.TILE_SIZE) - GAME_CONFIG.SURFACE_HEIGHT),
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
    // Collect cargo details before selling
    const cargoDetails = this.getCargoSummary();
    const sold = this.rover.sellCargo();

    if (sold > 0) {
      // Show detailed cargo sold popup
      this.showCargoSoldPopup(cargoDetails, sold);
    }
  }

  getCargoSummary() {
    // Group cargo by ore type
    const summary = {};
    for (const item of this.rover.cargo) {
      if (!summary[item.ore]) {
        summary[item.ore] = { count: 0, totalValue: 0, unitValue: item.value };
      }
      summary[item.ore].count++;
      summary[item.ore].totalValue += item.value;
    }
    return summary;
  }

  showCargoSoldPopup(cargoDetails, totalValue) {
    const cx = GAME_CONFIG.GAME_WIDTH / 2;
    const cy = GAME_CONFIG.GAME_HEIGHT / 2;
    const entries = Object.entries(cargoDetails);

    // Popup dimensions
    const popupWidth = Math.min(300, GAME_CONFIG.GAME_WIDTH - 40);
    const lineHeight = 28;
    const popupHeight = Math.min(60 + entries.length * lineHeight + 40, GAME_CONFIG.GAME_HEIGHT - 60);

    // Container for all popup elements
    const popupElements = [];

    // Background overlay
    const overlay = this.add.rectangle(cx, cy, GAME_CONFIG.GAME_WIDTH, GAME_CONFIG.GAME_HEIGHT, 0x000000, 0.7)
      .setDepth(200);
    popupElements.push(overlay);

    // Popup box
    const box = this.add.rectangle(cx, cy, popupWidth, popupHeight, 0x222233, 1)
      .setStrokeStyle(2, 0x44ff44)
      .setDepth(201);
    popupElements.push(box);

    // Title
    const title = this.add.bitmapText(cx, cy - popupHeight / 2 + 20, 'pixel', 'CARGO SOLD!', 20)
      .setOrigin(0.5)
      .setTint(0x44ff44)
      .setDepth(202);
    popupElements.push(title);

    // List each ore type
    let yOffset = cy - popupHeight / 2 + 50;
    for (const [ore, data] of entries) {
      // Ore texture (small sprite)
      const oreName = ore.charAt(0).toUpperCase() + ore.slice(1);
      const textureKey = ore; // Ore textures use the ore name

      // Draw mini ore icon (scaled down via Phaser)
      if (this.textures.exists(textureKey)) {
        const icon = this.add.sprite(cx - popupWidth / 2 + 25, yOffset, textureKey)
          .setScale(0.15)
          .setDepth(202);
        popupElements.push(icon);
      } else {
        // Fallback: colored circle
        const colorMap = {
          coal: 0x333333, copper: 0xdd7744, iron: 0x888888, silver: 0xcccccc,
          gold: 0xffdd00, platinum: 0xaaddff, ruby: 0xff3344, emerald: 0x33ff66,
          diamond: 0x88ffff, crystal: 0x00ffff
        };
        const circle = this.add.circle(cx - popupWidth / 2 + 25, yOffset, 8, colorMap[ore] || 0xffffff)
          .setDepth(202);
        popupElements.push(circle);
      }

      // Ore name and count
      const nameText = this.add.bitmapText(cx - popupWidth / 2 + 45, yOffset, 'pixel',
        `${oreName} x${data.count}`, 10)
        .setOrigin(0, 0.5)
        .setTint(0xffffff)
        .setDepth(202);
      popupElements.push(nameText);

      // Value (right-aligned)
      const valueText = this.add.bitmapText(cx + popupWidth / 2 - 20, yOffset, 'pixel',
        `$${data.totalValue}`, 10)
        .setOrigin(1, 0.5)
        .setTint(0xffdd44)
        .setDepth(202);
      popupElements.push(valueText);

      yOffset += lineHeight;
    }

    // Divider line
    const divider = this.add.rectangle(cx, yOffset, popupWidth - 40, 2, 0x666666)
      .setDepth(202);
    popupElements.push(divider);

    // Total
    yOffset += 20;
    const totalText = this.add.bitmapText(cx - popupWidth / 2 + 20, yOffset, 'pixel', 'TOTAL:', 10)
      .setOrigin(0, 0.5)
      .setTint(0xffffff)
      .setDepth(202);
    popupElements.push(totalText);

    const totalValueText = this.add.bitmapText(cx + popupWidth / 2 - 20, yOffset, 'pixel',
      `+$${totalValue}`, 20)
      .setOrigin(1, 0.5)
      .setTint(0x44ff44)
      .setDepth(202);
    popupElements.push(totalValueText);

    // Auto-dismiss after delay OR on tap
    const dismissPopup = () => {
      popupElements.forEach(el => {
        this.tweens.add({
          targets: el,
          alpha: 0,
          duration: 300,
          onComplete: () => el.destroy()
        });
      });
    };

    // Tap/click to dismiss
    overlay.setInteractive().on('pointerdown', dismissPopup);

    // Auto-dismiss after 3 seconds
    this.time.delayedCall(3000, dismissPopup);
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

  // Save game state (called on orientation change, pause, etc.)
  saveGame() {
    if (!this.rover) return;

    // Update gameData with current rover state
    const gameData = this.registry.get('gameData');
    gameData.cargo = this.rover.cargo;

    const saveData = {
      version: '2.0',
      timestamp: Date.now(),
      worldSeed: this.worldSeed,
      playerPosition: {
        x: this.rover.sprite.x,
        y: this.rover.sprite.y,
      },
      gameData: gameData,
      modifiedTiles: Array.from(this.modifiedTiles.entries()),
      placedItems: this.placedItems,
      exploredTiles: Array.from(this.exploredTiles),
      roverState: {
        battery: this.rover.battery,
        hull: this.rover.hull,
        cargo: this.rover.cargo,
      },
    };

    SaveSystem.save(saveData);
  }
}
