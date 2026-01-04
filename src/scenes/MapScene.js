import Phaser from 'phaser';
import { GAME_CONFIG } from '../config/GameConfig.js';
import { TILE_TYPES, getTileTypeById } from '../config/TileTypes.js';

export class MapScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MapScene' });
  }

  create() {
    const width = GAME_CONFIG.GAME_WIDTH;
    const height = GAME_CONFIG.GAME_HEIGHT;

    // Dark background
    this.add.rectangle(width / 2, height / 2, width, height, 0x111122, 0.95);

    // Title
    this.add.bitmapText(width / 2, 20, 'pixel', 'MAP', 20)
      .setOrigin(0.5, 0)
      .setTint(0xffffff);

    // Get game scene data
    const gameScene = this.scene.get('GameScene');
    this.gameScene = gameScene;

    // Map settings - higher default zoom
    this.mapScale = 8; // pixels per tile (was 2)
    this.minScale = 2;
    this.maxScale = 16;
    this.mapOffsetX = 0;
    this.mapOffsetY = 0;

    // Calculate initial offset to center on player
    if (gameScene && gameScene.rover) {
      const playerTileX = Math.floor(gameScene.rover.sprite.x / GAME_CONFIG.TILE_SIZE);
      const playerTileY = Math.floor(gameScene.rover.sprite.y / GAME_CONFIG.TILE_SIZE);
      this.mapOffsetX = width / 2 - playerTileX * this.mapScale;
      this.mapOffsetY = height / 2 - playerTileY * this.mapScale;
    }

    // Create map container for panning
    this.mapContainer = this.add.container(0, 0);

    // Draw the map
    this.drawMap();

    // Instructions
    this.add.bitmapText(width / 2, height - 40, 'pixel', 'SCROLL/PINCH TO ZOOM - DRAG TO PAN', 10)
      .setOrigin(0.5)
      .setTint(0x888888);

    // Close button
    const closeBg = this.add.rectangle(width / 2, height - 20, 80, 24, 0x444444)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.closeMap());
    this.add.bitmapText(width / 2, height - 20, 'pixel', 'CLOSE', 10)
      .setOrigin(0.5)
      .setTint(0xffffff);

    // Input handling
    this.cursors = this.input.keyboard.createCursorKeys();
    this.input.keyboard.on('keydown-ESC', () => this.closeMap());

    // Touch/drag panning
    this.isDragging = false;
    this.dragStartX = 0;
    this.dragStartY = 0;

    // Pinch zoom tracking
    this.pinchStartDistance = 0;
    this.pinchStartScale = this.mapScale;

    this.input.on('pointerdown', (pointer) => {
      if (pointer.y > 40 && pointer.y < height - 60) {
        this.isDragging = true;
        this.dragStartX = pointer.x - this.mapOffsetX;
        this.dragStartY = pointer.y - this.mapOffsetY;
      }
    });

    this.input.on('pointermove', (pointer) => {
      // Handle pinch zoom on mobile
      if (this.input.pointer1.isDown && this.input.pointer2.isDown) {
        const p1 = this.input.pointer1;
        const p2 = this.input.pointer2;
        const distance = Phaser.Math.Distance.Between(p1.x, p1.y, p2.x, p2.y);

        if (this.pinchStartDistance === 0) {
          this.pinchStartDistance = distance;
          this.pinchStartScale = this.mapScale;
        } else {
          const zoomFactor = distance / this.pinchStartDistance;
          const centerX = (p1.x + p2.x) / 2;
          const centerY = (p1.y + p2.y) / 2;
          this.zoomAt(centerX, centerY, this.pinchStartScale * zoomFactor);
        }
        this.isDragging = false;
        return;
      } else {
        this.pinchStartDistance = 0;
      }

      if (this.isDragging) {
        this.mapOffsetX = pointer.x - this.dragStartX;
        this.mapOffsetY = pointer.y - this.dragStartY;
        this.updateMapPosition();
      }
    });

    this.input.on('pointerup', () => {
      this.isDragging = false;
      this.pinchStartDistance = 0;
    });

    // Mouse wheel zoom (PC)
    this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY) => {
      if (pointer.y > 40 && pointer.y < height - 60) {
        const zoomDelta = deltaY > 0 ? -1 : 1;
        const newScale = Phaser.Math.Clamp(this.mapScale + zoomDelta, this.minScale, this.maxScale);
        this.zoomAt(pointer.x, pointer.y, newScale);
      }
    });

    // Keyboard panning speed
    this.panSpeed = 200;
  }

  zoomAt(centerX, centerY, newScale) {
    newScale = Phaser.Math.Clamp(newScale, this.minScale, this.maxScale);
    if (newScale === this.mapScale) return;

    // Calculate the world position under the cursor before zoom
    const worldX = (centerX - this.mapOffsetX) / this.mapScale;
    const worldY = (centerY - this.mapOffsetY) / this.mapScale;

    // Update scale
    const oldScale = this.mapScale;
    this.mapScale = newScale;

    // Adjust offset to keep the same world point under cursor
    this.mapOffsetX = centerX - worldX * this.mapScale;
    this.mapOffsetY = centerY - worldY * this.mapScale;

    // Redraw map at new scale
    this.redrawMap();
  }

  redrawMap() {
    // Clear and redraw
    this.mapContainer.removeAll(true);
    this.drawMap();
  }

  update(time, delta) {
    const dt = delta / 1000;

    // Keyboard panning
    if (this.cursors.left.isDown) {
      this.mapOffsetX += this.panSpeed * dt;
      this.updateMapPosition();
    }
    if (this.cursors.right.isDown) {
      this.mapOffsetX -= this.panSpeed * dt;
      this.updateMapPosition();
    }
    if (this.cursors.up.isDown) {
      this.mapOffsetY += this.panSpeed * dt;
      this.updateMapPosition();
    }
    if (this.cursors.down.isDown) {
      this.mapOffsetY -= this.panSpeed * dt;
      this.updateMapPosition();
    }
  }

  drawMap() {
    const gameScene = this.gameScene;
    if (!gameScene) return;

    const scale = this.mapScale;
    const devMode = this.registry.get('devMode') === true;
    const disableDarkness = this.registry.get('disableDarkness') === true;
    const showAll = devMode && disableDarkness;

    // Graphics for drawing tiles
    const graphics = this.add.graphics();
    this.mapContainer.add(graphics);

    // If dev mode with darkness disabled, show entire world
    if (showAll) {
      this.drawFullWorld(graphics, scale);
    } else {
      // Draw only explored tiles
      this.drawExploredTiles(graphics, scale);
    }

    // Draw player marker (one tile size)
    if (gameScene.rover) {
      const playerTileX = Math.floor(gameScene.rover.sprite.x / GAME_CONFIG.TILE_SIZE);
      const playerTileY = Math.floor(gameScene.rover.sprite.y / GAME_CONFIG.TILE_SIZE);

      // Marker is exactly one tile in size (radius = half tile)
      const marker = this.add.circle(
        playerTileX * scale + scale / 2,
        playerTileY * scale + scale / 2,
        scale / 2,
        0x00ff00
      );
      this.mapContainer.add(marker);

      // Pulsing animation (subtle scale, stays within bounds)
      this.tweens.add({
        targets: marker,
        scale: { from: 1, to: 1.3 },
        alpha: { from: 1, to: 0.7 },
        duration: 500,
        yoyo: true,
        repeat: -1
      });
    }

    // Draw surface line
    const surfaceY = GAME_CONFIG.SURFACE_HEIGHT * scale;
    graphics.lineStyle(1, 0x88ff88, 0.5);
    graphics.lineBetween(0, surfaceY, GAME_CONFIG.WORLD_WIDTH * scale, surfaceY);

    this.updateMapPosition();
  }

  drawFullWorld(graphics, scale) {
    const gameScene = this.gameScene;
    if (!gameScene || !gameScene.worldGenerator) return;

    // Draw a sample of the world (not every tile for performance)
    const sampleStep = 1; // Draw every tile for accuracy
    const maxY = Math.min(GAME_CONFIG.WORLD_DEPTH, 500); // Limit depth for performance

    for (let y = 0; y < maxY; y += sampleStep) {
      for (let x = 0; x < GAME_CONFIG.WORLD_WIDTH; x += sampleStep) {
        // Check modified tiles first
        const key = `${x},${y}`;
        let tileId;

        if (gameScene.modifiedTiles && gameScene.modifiedTiles.has(key)) {
          tileId = gameScene.modifiedTiles.get(key);
        } else {
          tileId = gameScene.worldGenerator.getTileAt(x, y);
        }

        const tileType = getTileTypeById(tileId);
        if (tileType && tileId !== TILE_TYPES.air.id) {
          const color = this.getTileColor(tileType);
          graphics.fillStyle(color, 1);
          graphics.fillRect(x * scale, y * scale, scale * sampleStep, scale * sampleStep);
        }
      }
    }
  }

  drawExploredTiles(graphics, scale) {
    const gameScene = this.gameScene;
    if (!gameScene) return;

    // Draw from explored tiles set
    const exploredTiles = gameScene.exploredTiles;
    if (!exploredTiles) return;

    for (const key of exploredTiles) {
      const [x, y] = key.split(',').map(Number);

      // Get tile data
      let tileId;
      if (gameScene.modifiedTiles && gameScene.modifiedTiles.has(key)) {
        tileId = gameScene.modifiedTiles.get(key);
      } else if (gameScene.worldGenerator) {
        tileId = gameScene.worldGenerator.getTileAt(x, y);
      }

      if (tileId !== undefined) {
        const tileType = getTileTypeById(tileId);
        if (tileType && tileId !== TILE_TYPES.air.id) {
          const color = this.getTileColor(tileType);
          graphics.fillStyle(color, 1);
          graphics.fillRect(x * scale, y * scale, scale, scale);
        } else {
          // Air tiles show as dark (explored but empty)
          graphics.fillStyle(0x222233, 1);
          graphics.fillRect(x * scale, y * scale, scale, scale);
        }
      }
    }
  }

  getTileColor(tileType) {
    // Return a color based on tile type for the map
    if (tileType.ore) {
      // Ore colors
      switch (tileType.ore) {
        case 'coal': return 0x333333;
        case 'copper': return 0xdd7744;
        case 'iron': return 0x888888;
        case 'silver': return 0xcccccc;
        case 'gold': return 0xffdd00;
        case 'platinum': return 0xaaddff;
        case 'ruby': return 0xff3344;
        case 'emerald': return 0x33ff66;
        case 'diamond': return 0x88ffff;
        case 'crystal': return 0x00ffff;
        default: return 0xffffff;
      }
    }

    // Check specific tile types first (for placed items like ladders)
    if (tileType.climbable) return 0xffaa00; // Bright orange for ladders
    if (tileType.id === TILE_TYPES.platform?.id) return 0x8888ff; // Blue for platforms
    if (tileType.id === TILE_TYPES.boulder?.id) return 0x777777; // Gray for boulders

    // Standard tiles
    if (tileType.color) return tileType.color;

    switch (tileType.id) {
      case TILE_TYPES.dirt.id: return 0x664422;
      case TILE_TYPES.rock.id: return 0x666666;
      case TILE_TYPES.hardRock.id: return 0x444444;
      case TILE_TYPES.surface.id: return 0x886644;
      case TILE_TYPES.lava.id: return 0xff4400;
      case TILE_TYPES.gas.id: return 0x44ff44;
      default: return 0x443322;
    }
  }

  updateMapPosition() {
    this.mapContainer.setPosition(this.mapOffsetX, this.mapOffsetY);
  }

  closeMap() {
    this.scene.resume('GameScene');
    this.scene.stop();
  }
}
