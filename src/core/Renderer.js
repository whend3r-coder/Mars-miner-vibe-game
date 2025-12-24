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

  render(world, player, drillingSystem, touchControls, surfaceBase) {
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

    // Render surface buildings
    this.renderSurfaceBuildings(world);

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

    // Render touch controls
    if (touchControls) {
      touchControls.render(this.ctx);
    }

    // Render surface base menu
    if (surfaceBase) {
      this.renderSurfaceMenu(surfaceBase);
    }
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

  renderSurfaceBuildings(world) {
    // Draw simple building shapes at the surface (y = 0-2)
    const buildings = [
      { x: 45, y: -2, width: 3, height: 2, color: '#00AA00', name: 'FUEL', icon: 'F' },
      { x: 49, y: -2, width: 3, height: 2, color: '#FFAA00', name: 'SHOP', icon: '$' },
      { x: 53, y: -2, width: 3, height: 2, color: '#00AAFF', name: 'REPAIR', icon: '+' },
    ];

    buildings.forEach(building => {
      const screenX = building.x * CONFIG.TILE_SIZE - this.cameraX;
      const screenY = building.y * CONFIG.TILE_SIZE - this.cameraY;
      const width = building.width * CONFIG.TILE_SIZE;
      const height = building.height * CONFIG.TILE_SIZE;

      // Draw building body
      this.ctx.fillStyle = building.color;
      this.ctx.fillRect(screenX, screenY, width, height);

      // Draw building border
      this.ctx.strokeStyle = '#FFFFFF';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(screenX, screenY, width, height);

      // Draw roof
      this.ctx.fillStyle = '#8B4513';
      this.ctx.beginPath();
      this.ctx.moveTo(screenX - 4, screenY);
      this.ctx.lineTo(screenX + width / 2, screenY - 10);
      this.ctx.lineTo(screenX + width + 4, screenY);
      this.ctx.closePath();
      this.ctx.fill();

      // Draw icon
      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.font = 'bold 20px monospace';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(building.icon, screenX + width / 2, screenY + height / 2);

      // Draw label
      this.ctx.font = '10px monospace';
      this.ctx.fillStyle = '#FFD700';
      this.ctx.fillText(building.name, screenX + width / 2, screenY - 15);
    });

    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'alphabetic';
  }

  renderSurfaceMenu(surfaceBase) {
    const menuState = surfaceBase.getMenuState();

    // Show "Press E to open base" hint when at surface
    if (!menuState && surfaceBase.isAtSurface()) {
      this.ctx.save();
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      this.ctx.fillRect(CONFIG.INTERNAL_WIDTH / 2 - 100, CONFIG.INTERNAL_HEIGHT - 60, 200, 50);
      this.ctx.fillStyle = '#FFD700';
      this.ctx.font = '14px monospace';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('SURFACE BASE', CONFIG.INTERNAL_WIDTH / 2, CONFIG.INTERNAL_HEIGHT - 35);
      this.ctx.font = '12px monospace';
      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.fillText('Press E or SPACE to enter', CONFIG.INTERNAL_WIDTH / 2, CONFIG.INTERNAL_HEIGHT - 20);
      this.ctx.restore();
      return;
    }

    if (!menuState) return;

    // Draw overlay
    this.ctx.save();
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    this.ctx.fillRect(0, 0, CONFIG.INTERNAL_WIDTH, CONFIG.INTERNAL_HEIGHT);

    const centerX = CONFIG.INTERNAL_WIDTH / 2;
    const centerY = CONFIG.INTERNAL_HEIGHT / 2;

    if (menuState.type === 'main') {
      this.renderMainMenu(menuState, centerX, centerY);
    } else if (menuState.type === 'upgrade') {
      this.renderUpgradeMenu(menuState, centerX, centerY);
    }

    this.ctx.restore();
  }

  renderMainMenu(menuState, centerX, centerY) {
    const { player, economy } = menuState;

    // Title
    this.ctx.fillStyle = '#FFD700';
    this.ctx.font = 'bold 20px monospace';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('SURFACE BASE', centerX, centerY - 120);

    // Player stats
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.font = '14px monospace';
    this.ctx.fillText(`Money: $${player.money}`, centerX, centerY - 80);

    // Menu options
    const options = [
      { key: '1', text: `Refuel ($${economy.refuelCost})`, color: player.fuel < player.maxFuel ? '#00FF00' : '#666666' },
      { key: '2', text: `Sell Cargo ($${player.cargoValue})`, color: player.cargo.length > 0 ? '#FFD700' : '#666666' },
      { key: '3', text: `Repair Hull ($${economy.repairCost})`, color: player.hull < player.maxHull ? '#00FFFF' : '#666666' },
      { key: '4', text: 'Upgrades', color: '#FF00FF' },
    ];

    this.ctx.textAlign = 'left';
    this.ctx.font = '16px monospace';

    options.forEach((option, index) => {
      const y = centerY - 30 + index * 30;
      this.ctx.fillStyle = option.color;
      this.ctx.fillText(`[${option.key}] ${option.text}`, centerX - 150, y);
    });

    // Instructions
    this.ctx.fillStyle = '#888888';
    this.ctx.font = '12px monospace';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('Press ESC to close', centerX, centerY + 100);
  }

  renderUpgradeMenu(menuState, centerX, centerY) {
    const { player, economy } = menuState;

    // Title
    this.ctx.fillStyle = '#FF00FF';
    this.ctx.font = 'bold 18px monospace';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('UPGRADES', centerX, centerY - 120);

    // Money
    this.ctx.fillStyle = '#FFD700';
    this.ctx.font = '14px monospace';
    this.ctx.fillText(`Money: $${player.money}`, centerX, centerY - 95);

    // Upgrade options
    const upgrades = economy.upgrades;
    const upgradeKeys = [
      { key: '1', type: 'drillSpeed', name: 'Drill Speed' },
      { key: '2', type: 'drillPower', name: 'Drill Power' },
      { key: '3', type: 'fuelTank', name: 'Fuel Tank' },
      { key: '4', type: 'cargoBay', name: 'Cargo Bay' },
      { key: '5', type: 'hull', name: 'Hull Armor' },
    ];

    this.ctx.textAlign = 'left';
    this.ctx.font = '13px monospace';

    upgradeKeys.forEach((item, index) => {
      const upgrade = upgrades.find(u => u.type === item.type);
      const y = centerY - 60 + index * 35;

      if (upgrade.isMaxed) {
        this.ctx.fillStyle = '#666666';
        this.ctx.fillText(`[${item.key}] ${item.name} - MAX LEVEL`, centerX - 180, y);
      } else {
        const canAfford = player.money >= upgrade.nextCost;
        this.ctx.fillStyle = canAfford ? '#00FF00' : '#FF6666';
        this.ctx.fillText(
          `[${item.key}] ${item.name} Lv${upgrade.currentLevel + 1} - $${upgrade.nextCost}`,
          centerX - 180,
          y
        );

        // Description
        this.ctx.fillStyle = '#AAAAAA';
        this.ctx.font = '11px monospace';
        this.ctx.fillText(upgrade.description, centerX - 175, y + 13);
        this.ctx.font = '13px monospace';
      }
    });

    // Instructions
    this.ctx.fillStyle = '#888888';
    this.ctx.font = '12px monospace';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('Press B or ESC to go back', centerX, centerY + 100);
  }
}
