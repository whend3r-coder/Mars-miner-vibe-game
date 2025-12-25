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

    // Load sprites
    this.sprites = {};
    this.spritesLoaded = false;
    this.loadSprites();
  }

  loadSprites() {
    const spritesToLoad = {
      player: '/assets/sprites/player.png',
      fuelstation: '/assets/sprites/fuelstation.png',
      shop: '/assets/sprites/shop.png',
      repairshop: '/assets/sprites/repairshop.png',
      marsdirt: '/assets/sprites/marsdirt.png'
    };

    let loadedCount = 0;
    const totalCount = Object.keys(spritesToLoad).length;

    for (const [key, path] of Object.entries(spritesToLoad)) {
      const img = new Image();
      img.onload = () => {
        loadedCount++;
        if (loadedCount === totalCount) {
          this.spritesLoaded = true;
          console.log('All sprites loaded!');
        }
      };
      img.onerror = () => {
        console.error(`Failed to load sprite: ${path}`);
        loadedCount++;
        if (loadedCount === totalCount) {
          this.spritesLoaded = true;
        }
      };
      img.src = path;
      this.sprites[key] = img;
    }
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

        // Use marsdirt texture for dirt and rock tiles (id 1 and 2)
        if (this.spritesLoaded && this.sprites.marsdirt && this.sprites.marsdirt.complete && (tile.id === 1 || tile.id === 2)) {
          // Draw marsdirt texture scaled to tile size
          this.ctx.drawImage(
            this.sprites.marsdirt,
            0, 0, this.sprites.marsdirt.width, this.sprites.marsdirt.height,
            screenX, screenY, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE
          );

          // Add slight color tint for rock vs dirt
          if (tile.id === 2) {
            this.ctx.fillStyle = 'rgba(105, 105, 105, 0.3)'; // Gray tint for rock
            this.ctx.fillRect(screenX, screenY, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE);
          }
        } else {
          // Draw tile with solid color fallback
          this.ctx.fillStyle = tile.color;
          this.ctx.fillRect(screenX, screenY, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE);
        }

        // Add texture pattern based on tile type
        if (tile.ore) {
          // Ores get sparkle effect
          this.ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
          this.ctx.fillRect(screenX + 4, screenY + 4, 4, 4);
          this.ctx.fillRect(screenX + CONFIG.TILE_SIZE - 8, screenY + CONFIG.TILE_SIZE - 8, 4, 4);
        } else if (tile.solid && !this.spritesLoaded) {
          // Regular blocks get subtle shading (only when not using textures)
          this.ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
          this.ctx.fillRect(screenX, screenY + CONFIG.TILE_SIZE - 4, CONFIG.TILE_SIZE, 4);
          this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
          this.ctx.fillRect(screenX, screenY, CONFIG.TILE_SIZE, 2);
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

    if (this.spritesLoaded && this.sprites.player.complete) {
      // Draw player sprite
      const playerWidth = player.width * CONFIG.TILE_SIZE;
      const playerHeight = player.height * CONFIG.TILE_SIZE;

      this.ctx.drawImage(
        this.sprites.player,
        playerScreenX,
        playerScreenY,
        playerWidth,
        playerHeight
      );

      // Add glow effect when drilling
      if (player.drilling) {
        this.ctx.save();
        this.ctx.globalAlpha = 0.3;
        this.ctx.fillStyle = '#FF6600';
        this.ctx.fillRect(playerScreenX, playerScreenY, playerWidth, playerHeight);
        this.ctx.restore();
      }
    } else {
      // Fallback to colored rectangle
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
    }

    // Render HUD
    this.renderHUD(player);

    // Render touch controls
    if (touchControls) {
      touchControls.render(this.ctx);
    }

    // Render surface base menu
    if (surfaceBase) {
      this.renderSurfaceMenu(surfaceBase, touchControls);
    }
  }

  renderHUD(player) {
    // Render HUD at screen resolution for crisp text
    this.ctx.save();

    // Reset transform to render at full canvas resolution
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);

    const scale = this.canvas.width / CONFIG.INTERNAL_WIDTH;
    const padding = 3 * scale;
    const hudWidth = 70 * scale;
    const hudHeight = 50 * scale;

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(padding, padding, hudWidth, hudHeight);

    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.font = `${Math.floor(12 * scale)}px monospace`;

    // Fuel
    this.ctx.fillText(`F:${Math.floor(player.fuel)}/${player.maxFuel}`, padding + 2 * scale, padding + 7 * scale);

    // Fuel bar
    const fuelPercent = player.fuel / player.maxFuel;
    const barWidth = hudWidth - 4 * scale;
    this.ctx.fillStyle = fuelPercent < 0.3 ? '#FF0000' : '#00FF00';
    this.ctx.fillRect(padding + 2 * scale, padding + 9 * scale, barWidth * fuelPercent, 4 * scale);
    this.ctx.strokeStyle = '#FFFFFF';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(padding + 2 * scale, padding + 9 * scale, barWidth, 4 * scale);

    // Hull
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.fillText(`H:${Math.floor(player.hull)}/${player.maxHull}`, padding + 2 * scale, padding + 20 * scale);

    const hullPercent = player.hull / player.maxHull;
    this.ctx.fillStyle = hullPercent < 0.3 ? '#FF0000' : '#00FFFF';
    this.ctx.fillRect(padding + 2 * scale, padding + 22 * scale, barWidth * hullPercent, 4 * scale);
    this.ctx.strokeStyle = '#FFFFFF';
    this.ctx.strokeRect(padding + 2 * scale, padding + 22 * scale, barWidth, 4 * scale);

    // Cargo
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.fillText(`C:${player.cargo.length}/${player.maxCargo}`, padding + 2 * scale, padding + 33 * scale);

    // Money
    this.ctx.fillText(`$${player.money}`, padding + 2 * scale, padding + 43 * scale);

    // Depth indicator (top right)
    const depthWidth = 35 * scale;
    const depthHeight = 12 * scale;
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(this.canvas.width - depthWidth - padding, padding, depthWidth, depthHeight);

    this.ctx.fillStyle = '#FFD700';
    this.ctx.font = `${Math.floor(12 * scale)}px monospace`;
    this.ctx.fillText(`${Math.floor(player.y)}m`, this.canvas.width - depthWidth - padding + 2 * scale, padding + 8 * scale);

    this.ctx.restore();
  }

  renderSurfaceBuildings(world) {
    // Draw building sprites at the surface (sitting on ground at y=0)
    const buildings = [
      { x: 45, y: 0, width: 3, height: 3, sprite: 'fuelstation', name: 'FUEL', color: '#00AA00', icon: 'F' },
      { x: 49, y: 0, width: 3, height: 3, sprite: 'shop', name: 'SHOP', color: '#FFAA00', icon: '$' },
      { x: 53, y: 0, width: 3, height: 3, sprite: 'repairshop', name: 'REPAIR', color: '#00AAFF', icon: '+' },
    ];

    buildings.forEach(building => {
      const screenX = building.x * CONFIG.TILE_SIZE - this.cameraX;
      const screenY = building.y * CONFIG.TILE_SIZE - this.cameraY;
      const width = building.width * CONFIG.TILE_SIZE;
      const height = building.height * CONFIG.TILE_SIZE;

      if (this.spritesLoaded && this.sprites[building.sprite] && this.sprites[building.sprite].complete) {
        // Draw building sprite
        this.ctx.drawImage(
          this.sprites[building.sprite],
          screenX,
          screenY,
          width,
          height
        );
      } else {
        // Fallback to colored rectangles
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
      }
    });

    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'alphabetic';
  }

  renderSurfaceMenu(surfaceBase, touchControls) {
    const menuState = surfaceBase.getMenuState();

    if (!menuState && surfaceBase.isAtSurface() && touchControls && !touchControls.enabled) {
      // Keyboard hint - render at high resolution
      this.ctx.save();
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      const scale = this.canvas.width / CONFIG.INTERNAL_WIDTH;

      const centerX = this.canvas.width / 2;
      const centerY = this.canvas.height - 60 * scale;

      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      this.ctx.fillRect(centerX - 100 * scale, centerY - 25 * scale, 200 * scale, 50 * scale);

      this.ctx.fillStyle = '#FFD700';
      this.ctx.font = `bold ${Math.floor(14 * scale)}px monospace`;
      this.ctx.textAlign = 'center';
      this.ctx.fillText('SURFACE BASE', centerX, centerY);

      this.ctx.font = `${Math.floor(12 * scale)}px monospace`;
      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.fillText('Press E or SPACE to enter', centerX, centerY + 15 * scale);

      this.ctx.restore();
      return;
    }

    if (!menuState) return;

    // Draw menu at high resolution for crisp text
    this.ctx.save();
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    const scale = this.canvas.width / CONFIG.INTERNAL_WIDTH;

    // Draw overlay
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;

    // Store menu layout for touch detection
    surfaceBase.menuLayout = { centerX, centerY, scale };

    if (menuState.type === 'main') {
      this.renderMainMenu(menuState, centerX, centerY, scale, touchControls);
    } else if (menuState.type === 'upgrade') {
      this.renderUpgradeMenu(menuState, centerX, centerY, scale, touchControls);
    }

    this.ctx.restore();
  }

  renderMainMenu(menuState, centerX, centerY, scale, touchControls = null) {
    const { player, economy } = menuState;

    // Title
    this.ctx.fillStyle = '#FFD700';
    this.ctx.font = `bold ${Math.floor(16 * scale)}px monospace`;
    this.ctx.textAlign = 'center';
    this.ctx.fillText('SURFACE BASE', centerX, centerY - 50 * scale);

    // Player stats
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.font = `${Math.floor(12 * scale)}px monospace`;
    this.ctx.fillText(`Money: $${player.money}`, centerX, centerY - 35 * scale);

    // Menu options
    const options = [
      { key: '1', text: `Refuel ($${economy.refuelCost})`, color: player.fuel < player.maxFuel ? '#00FF00' : '#666666' },
      { key: '2', text: `Sell Cargo ($${player.cargoValue})`, color: player.cargo.length > 0 ? '#FFD700' : '#666666' },
      { key: '3', text: `Repair Hull ($${economy.repairCost})`, color: player.hull < player.maxHull ? '#00FFFF' : '#666666' },
      { key: '4', text: 'Upgrades', color: '#FF00FF' },
      { key: '5', text: 'Save Game', color: '#FFFFFF' },
    ];

    this.ctx.textAlign = 'left';
    this.ctx.font = `${Math.floor(12 * scale)}px monospace`;

    options.forEach((option, index) => {
      const y = centerY - 15 * scale + index * 12 * scale;
      this.ctx.fillStyle = option.color;
      this.ctx.fillText(`[${option.key}] ${option.text}`, centerX - 60 * scale, y);
    });

    // Close button for touch controls
    if (touchControls && touchControls.enabled) {
      this.ctx.fillStyle = '#FF0000';
      this.ctx.fillRect(centerX + 50 * scale, centerY - 55 * scale, 20 * scale, 10 * scale);
      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.font = `${Math.floor(12 * scale)}px monospace`;
      this.ctx.textAlign = 'center';
      this.ctx.fillText('X', centerX + 60 * scale, centerY - 48 * scale);
    } else {
      // Instructions for keyboard
      this.ctx.fillStyle = '#888888';
      this.ctx.font = `${Math.floor(10 * scale)}px monospace`;
      this.ctx.textAlign = 'center';
      this.ctx.fillText('Press ESC to close', centerX, centerY + 40 * scale);
    }
  }

  renderUpgradeMenu(menuState, centerX, centerY, scale, touchControls = null) {
    const { player, economy } = menuState;

    // Title
    this.ctx.fillStyle = '#FF00FF';
    this.ctx.font = `bold ${Math.floor(16 * scale)}px monospace`;
    this.ctx.textAlign = 'center';
    this.ctx.fillText('UPGRADES', centerX, centerY - 50 * scale);

    // Money
    this.ctx.fillStyle = '#FFD700';
    this.ctx.font = `${Math.floor(12 * scale)}px monospace`;
    this.ctx.fillText(`Money: $${player.money}`, centerX, centerY - 40 * scale);

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
    this.ctx.font = `${Math.floor(12 * scale)}px monospace`;

    upgradeKeys.forEach((item, index) => {
      const upgrade = upgrades.find(u => u.type === item.type);
      const y = centerY - 25 * scale + index * 14 * scale;

      if (upgrade.isMaxed) {
        this.ctx.fillStyle = '#666666';
        this.ctx.fillText(`[${item.key}] ${item.name} - MAX`, centerX - 70 * scale, y);
      } else {
        const canAfford = player.money >= upgrade.nextCost;
        this.ctx.fillStyle = canAfford ? '#00FF00' : '#FF6666';
        this.ctx.fillText(
          `[${item.key}] ${item.name} Lv${upgrade.currentLevel + 1} - $${upgrade.nextCost}`,
          centerX - 70 * scale,
          y
        );

        // Description
        this.ctx.fillStyle = '#AAAAAA';
        this.ctx.font = `${Math.floor(10 * scale)}px monospace`;
        this.ctx.fillText(upgrade.description, centerX - 68 * scale, y + 6 * scale);
        this.ctx.font = `${Math.floor(12 * scale)}px monospace`;
      }
    });

    // Back button for touch controls
    if (touchControls && touchControls.enabled) {
      this.ctx.fillStyle = '#FF6600';
      this.ctx.fillRect(centerX - 20 * scale, centerY + 45 * scale, 40 * scale, 10 * scale);
      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.font = `${Math.floor(12 * scale)}px monospace`;
      this.ctx.textAlign = 'center';
      this.ctx.fillText('BACK', centerX, centerY + 52 * scale);
    } else {
      // Instructions for keyboard
      this.ctx.fillStyle = '#888888';
      this.ctx.font = `${Math.floor(10 * scale)}px monospace`;
      this.ctx.textAlign = 'center';
      this.ctx.fillText('Press B or ESC to go back', centerX, centerY + 50 * scale);
    }
  }
}
