import { CONFIG } from '../config.js';
import { getTileTypeById } from '../world/TileTypes.js';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    // Set internal resolution
    this.canvas.width = CONFIG.INTERNAL_WIDTH;
    this.canvas.height = CONFIG.INTERNAL_HEIGHT;

    // Scale canvas to fit window
    this.scaleCanvas();
    window.addEventListener('resize', () => this.scaleCanvas());

    // Camera
    this.cameraX = 0;
    this.cameraY = 0;
    this.targetCameraX = 0;
    this.targetCameraY = 0;
  }

  scaleCanvas() {
    const aspectRatio = CONFIG.INTERNAL_WIDTH / CONFIG.INTERNAL_HEIGHT;
    const windowRatio = window.innerWidth / window.innerHeight;

    let width, height;

    if (windowRatio > aspectRatio) {
      // Window is wider
      height = window.innerHeight * 0.9;
      width = height * aspectRatio;
    } else {
      // Window is taller
      width = window.innerWidth * 0.9;
      height = width / aspectRatio;
    }

    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
  }

  updateCamera(player) {
    // Center camera on player
    this.targetCameraX = player.getCenterX() * CONFIG.TILE_SIZE - CONFIG.INTERNAL_WIDTH / 2;
    this.targetCameraY = player.getCenterY() * CONFIG.TILE_SIZE - CONFIG.INTERNAL_HEIGHT / 2;

    // Smooth camera movement
    this.cameraX += (this.targetCameraX - this.cameraX) * CONFIG.CAMERA_LERP;
    this.cameraY += (this.targetCameraY - this.cameraY) * CONFIG.CAMERA_LERP;
  }

  render(world, player, drillingSystem) {
    // Clear screen
    this.ctx.fillStyle = '#0a0a0a';
    this.ctx.fillRect(0, 0, CONFIG.INTERNAL_WIDTH, CONFIG.INTERNAL_HEIGHT);

    // Calculate visible tile range
    const startTileX = Math.floor(this.cameraX / CONFIG.TILE_SIZE);
    const startTileY = Math.floor(this.cameraY / CONFIG.TILE_SIZE);
    const endTileX = Math.ceil((this.cameraX + CONFIG.INTERNAL_WIDTH) / CONFIG.TILE_SIZE);
    const endTileY = Math.ceil((this.cameraY + CONFIG.INTERNAL_HEIGHT) / CONFIG.TILE_SIZE);

    // Render tiles
    for (let y = Math.max(0, startTileY); y < Math.min(world.depth, endTileY); y++) {
      for (let x = Math.max(0, startTileX); x < Math.min(world.width, endTileX); x++) {
        const tileId = world.getTileId(x, y);
        const tile = getTileTypeById(tileId);

        if (tile.id === 0) continue; // Skip air tiles

        const screenX = x * CONFIG.TILE_SIZE - this.cameraX;
        const screenY = y * CONFIG.TILE_SIZE - this.cameraY;

        this.ctx.fillStyle = tile.color;
        this.ctx.fillRect(screenX, screenY, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE);

        // Draw ore sparkle
        if (tile.ore) {
          this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
          this.ctx.fillRect(screenX + 2, screenY + 2, 4, 4);
        }
      }
    }

    // Render drilling target
    const targetTile = drillingSystem.getTargetTile();
    if (targetTile) {
      const progress = drillingSystem.getProgress();
      const screenX = targetTile.x * CONFIG.TILE_SIZE - this.cameraX;
      const screenY = targetTile.y * CONFIG.TILE_SIZE - this.cameraY;

      // Draw progress overlay
      this.ctx.fillStyle = `rgba(255, 255, 0, ${0.3 * progress})`;
      this.ctx.fillRect(screenX, screenY, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE);

      // Draw progress bar
      this.ctx.fillStyle = '#FFD700';
      this.ctx.fillRect(screenX, screenY - 4, CONFIG.TILE_SIZE * progress, 2);
    }

    // Render player
    const playerScreenX = player.x * CONFIG.TILE_SIZE - this.cameraX;
    const playerScreenY = player.y * CONFIG.TILE_SIZE - this.cameraY;

    this.ctx.fillStyle = player.drilling ? '#FF6600' : '#00FF00';
    this.ctx.fillRect(
      playerScreenX,
      playerScreenY,
      player.width * CONFIG.TILE_SIZE,
      player.height * CONFIG.TILE_SIZE
    );

    // Player indicator (direction)
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.fillRect(
      playerScreenX + player.width * CONFIG.TILE_SIZE / 2 - 2,
      playerScreenY + player.height * CONFIG.TILE_SIZE / 2 - 2,
      4,
      4
    );

    // Render HUD
    this.renderHUD(player);
  }

  renderHUD(player) {
    const padding = 10;

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(padding, padding, 150, 100);

    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.font = '12px monospace';

    // Fuel
    this.ctx.fillText(`Fuel: ${Math.floor(player.fuel)}/${player.maxFuel}`, padding + 5, padding + 20);

    // Fuel bar
    const fuelPercent = player.fuel / player.maxFuel;
    this.ctx.fillStyle = fuelPercent < 0.3 ? '#FF0000' : '#00FF00';
    this.ctx.fillRect(padding + 5, padding + 25, 140 * fuelPercent, 10);
    this.ctx.strokeStyle = '#FFFFFF';
    this.ctx.strokeRect(padding + 5, padding + 25, 140, 10);

    // Hull
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.fillText(`Hull: ${Math.floor(player.hull)}/${player.maxHull}`, padding + 5, padding + 50);

    const hullPercent = player.hull / player.maxHull;
    this.ctx.fillStyle = hullPercent < 0.3 ? '#FF0000' : '#00FFFF';
    this.ctx.fillRect(padding + 5, padding + 55, 140 * hullPercent, 10);
    this.ctx.strokeStyle = '#FFFFFF';
    this.ctx.strokeRect(padding + 5, padding + 55, 140, 10);

    // Cargo
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.fillText(`Cargo: ${player.cargo.length}/${player.maxCargo}`, padding + 5, padding + 80);

    // Money
    this.ctx.fillText(`Money: $${player.money}`, padding + 5, padding + 95);

    // Depth indicator
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(CONFIG.INTERNAL_WIDTH - 120, padding, 110, 30);
    this.ctx.fillStyle = '#FFD700';
    this.ctx.fillText(`Depth: ${Math.floor(player.y)}m`, CONFIG.INTERNAL_WIDTH - 115, padding + 20);
  }
}
