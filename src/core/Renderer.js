import { CONFIG } from '../config.js';
import { getTileTypeById } from '../world/TileTypes.js';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    // Set canvas to native screen resolution for crisp rendering
    this.updateCanvasSize();
    window.addEventListener('resize', () => this.updateCanvasSize());

    // Camera
    this.cameraX = 0;
    this.cameraY = 0;
    this.targetCameraX = 0;
    this.targetCameraY = 0;

    // Load sprites
    this.sprites = {};
    this.spritesLoaded = false;
    this.loadSprites();

    // Debug info for Android APK testing
    this.debugInfo = [];
  }

  loadSprites() {
    const spritesToLoad = {
      player: '/assets/sprites/player.png',
      playerIdle: '/assets/sprites/aligned_idle.png',
      playerDrill: '/assets/sprites/aligned_drill.png',
      playerJetpack: '/assets/sprites/aligned_jetpack.png',
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

  updateCanvasSize() {
    const dpr = window.devicePixelRatio || 1;
    const aspectRatio = CONFIG.INTERNAL_WIDTH / CONFIG.INTERNAL_HEIGHT;
    const windowRatio = window.innerWidth / window.innerHeight;

    let cssWidth, cssHeight;

    if (windowRatio > aspectRatio) {
      // Window is wider
      cssHeight = window.innerHeight * 0.9;
      cssWidth = cssHeight * aspectRatio;
    } else {
      // Window is taller
      cssWidth = window.innerWidth * 0.9;
      cssHeight = cssWidth / aspectRatio;
    }

    // Set CSS size
    this.canvas.style.width = `${cssWidth}px`;
    this.canvas.style.height = `${cssHeight}px`;

    // Set internal resolution to match CSS size * devicePixelRatio for crisp rendering
    this.canvas.width = cssWidth * dpr;
    this.canvas.height = cssHeight * dpr;

    // Calculate scale factor for game world rendering
    this.scale = this.canvas.width / CONFIG.INTERNAL_WIDTH;

    // Enable image smoothing for better sprite scaling (sprites are high-res)
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';
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
    // Clear screen at full resolution
    this.ctx.fillStyle = '#0a0a0a';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Apply scaling for game world rendering (pixel art at internal resolution)
    this.ctx.save();
    this.ctx.scale(this.scale, this.scale);

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

    if (this.spritesLoaded) {
      // Choose sprite and config based on player state
      let playerSprite, spriteConfig;
      if (player.flying) {
        playerSprite = this.sprites.playerJetpack;
        spriteConfig = CONFIG.ROBOT_SPRITES.jetpack;
      } else if (player.drilling) {
        playerSprite = this.sprites.playerDrill;
        spriteConfig = CONFIG.ROBOT_SPRITES.drill;
      } else {
        playerSprite = this.sprites.playerIdle;
        spriteConfig = CONFIG.ROBOT_SPRITES.idle;
      }

      // Draw player sprite with proper alignment using config
      if (playerSprite && playerSprite.complete && spriteConfig) {
        const spriteWidth = spriteConfig.width * CONFIG.TILE_SIZE;
        const spriteHeight = spriteConfig.height * CONFIG.TILE_SIZE;
        const offsetX = spriteConfig.offsetX * CONFIG.TILE_SIZE;
        const offsetY = spriteConfig.offsetY * CONFIG.TILE_SIZE;

        this.ctx.drawImage(
          playerSprite,
          playerScreenX + offsetX,
          playerScreenY + offsetY,
          spriteWidth,
          spriteHeight
        );
      } else {
        // Fallback to basic player sprite if state sprites not loaded
        if (this.sprites.player && this.sprites.player.complete) {
          const playerWidth = player.width * CONFIG.TILE_SIZE;
          const playerHeight = player.height * CONFIG.TILE_SIZE;

          this.ctx.drawImage(
            this.sprites.player,
            playerScreenX,
            playerScreenY,
            playerWidth,
            playerHeight
          );
        }
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

    // Restore context - render UI at native resolution for crisp text
    this.ctx.restore();

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

    // Render debug overlay for Android APK testing
    this.renderDebugOverlay(touchControls, surfaceBase);
  }

  renderHUD(player) {
    // Render HUD at native resolution for crisp text
    this.ctx.save();

    const scale = this.scale;
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
    // Using 3.5x3.5 tiles for balanced sprite quality
    const buildings = [
      { x: 45, y: -0.5, width: 3.5, height: 3.5, sprite: 'fuelstation', name: 'FUEL', color: '#00AA00', icon: 'F' },
      { x: 49, y: -0.5, width: 3.5, height: 3.5, sprite: 'shop', name: 'SHOP', color: '#FFAA00', icon: '$' },
      { x: 53, y: -0.5, width: 3.5, height: 3.5, sprite: 'repairshop', name: 'REPAIR', color: '#00AAFF', icon: '+' },
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
      // Keyboard hint - render at native resolution
      this.ctx.save();
      const scale = this.scale;

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

    // Draw menu at native resolution for crisp text
    this.ctx.save();
    const scale = this.scale;

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
    this.ctx.font = `bold ${Math.floor(14 * scale)}px monospace`;
    this.ctx.textAlign = 'center';
    this.ctx.fillText('SURFACE BASE', centerX, centerY - 50 * scale);

    // Player stats
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.font = `${Math.floor(10 * scale)}px monospace`;
    this.ctx.fillText(`Money: $${player.money}`, centerX, centerY - 35 * scale);

    // Menu options as touch-friendly buttons
    const options = [
      { text: `Refuel (FREE)`, color: player.fuel < player.maxFuel ? '#00FF00' : '#666666' },
      { text: `Sell Cargo ($${player.cargoValue})`, color: player.cargo.length > 0 ? '#FFD700' : '#666666' },
      { text: `Repair Hull ($${economy.repairCost})`, color: player.hull < player.maxHull ? '#00FFFF' : '#666666' },
      { text: 'Upgrades', color: '#FF00FF' },
      { text: 'Save Game', color: '#FFFFFF' },
      { text: 'Load Game', color: '#FFFF00' },
    ];

    // Draw compact buttons that fit any screen
    const buttonWidth = 85 * scale;
    const buttonHeight = 14 * scale;
    const buttonSpacing = 3 * scale;
    const startY = centerY - 15 * scale;

    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.font = `bold ${Math.floor(8 * scale)}px monospace`;

    options.forEach((option, index) => {
      const y = startY + index * (buttonHeight + buttonSpacing);
      const btnX = centerX - buttonWidth / 2;

      // Button background
      this.ctx.fillStyle = option.color === '#666666' ? 'rgba(50, 50, 50, 0.8)' : 'rgba(0, 0, 0, 0.8)';
      this.ctx.fillRect(btnX, y - buttonHeight / 2, buttonWidth, buttonHeight);

      // Button border
      this.ctx.strokeStyle = option.color;
      this.ctx.lineWidth = 1 * scale;
      this.ctx.strokeRect(btnX, y - buttonHeight / 2, buttonWidth, buttonHeight);

      // Button text
      this.ctx.fillStyle = option.color;
      this.ctx.fillText(option.text, centerX, y);
    });

    // Close button for touch controls
    if (touchControls && touchControls.enabled) {
      const closeBtnSize = 22 * scale;
      const closeBtnX = centerX + 50 * scale;
      const closeBtnY = centerY - 50 * scale;

      this.ctx.fillStyle = 'rgba(200, 0, 0, 0.9)';
      this.ctx.fillRect(closeBtnX, closeBtnY, closeBtnSize, closeBtnSize);
      this.ctx.strokeStyle = '#FFFFFF';
      this.ctx.lineWidth = 1.5 * scale;
      this.ctx.strokeRect(closeBtnX, closeBtnY, closeBtnSize, closeBtnSize);

      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.font = `bold ${Math.floor(14 * scale)}px monospace`;
      this.ctx.fillText('X', closeBtnX + closeBtnSize / 2, closeBtnY + closeBtnSize / 2);
    } else {
      // Instructions for keyboard
      this.ctx.fillStyle = '#888888';
      this.ctx.font = `${Math.floor(12 * scale)}px monospace`;
      this.ctx.fillText('Press ESC to close', centerX, centerY + 50 * scale);
    }
  }

  renderUpgradeMenu(menuState, centerX, centerY, scale, touchControls = null) {
    const { player, economy } = menuState;

    // Title
    this.ctx.fillStyle = '#FF00FF';
    this.ctx.font = `bold ${Math.floor(14 * scale)}px monospace`;
    this.ctx.textAlign = 'center';
    this.ctx.fillText('UPGRADES', centerX, centerY - 50 * scale);

    // Money
    this.ctx.fillStyle = '#FFD700';
    this.ctx.font = `${Math.floor(10 * scale)}px monospace`;
    this.ctx.fillText(`Money: $${player.money}`, centerX, centerY - 35 * scale);

    // Upgrade options as touch-friendly buttons
    const upgrades = economy.upgrades;
    const upgradeKeys = [
      { type: 'drillSpeed', name: 'Drill Speed' },
      { type: 'drillPower', name: 'Drill Power' },
      { type: 'fuelTank', name: 'Fuel Tank' },
      { type: 'cargoBay', name: 'Cargo Bay' },
      { type: 'hull', name: 'Hull Armor' },
    ];

    // Draw compact buttons that fit any screen
    const buttonWidth = 95 * scale;
    const buttonHeight = 14 * scale;
    const buttonSpacing = 2 * scale;
    const startY = centerY - 20 * scale;

    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    upgradeKeys.forEach((item, index) => {
      const upgrade = upgrades.find(u => u.type === item.type);
      const y = startY + index * (buttonHeight + buttonSpacing);
      const btnX = centerX - buttonWidth / 2;

      let color, text;
      if (upgrade.isMaxed) {
        color = '#666666';
        text = `${item.name} - MAX`;
      } else {
        const canAfford = player.money >= upgrade.nextCost;
        color = canAfford ? '#00FF00' : '#FF6666';
        text = `${item.name} Lv${upgrade.currentLevel + 1} $${upgrade.nextCost}`;
      }

      // Button background
      this.ctx.fillStyle = color === '#666666' ? 'rgba(50, 50, 50, 0.8)' : 'rgba(0, 0, 0, 0.8)';
      this.ctx.fillRect(btnX, y - buttonHeight / 2, buttonWidth, buttonHeight);

      // Button border
      this.ctx.strokeStyle = color;
      this.ctx.lineWidth = 1 * scale;
      this.ctx.strokeRect(btnX, y - buttonHeight / 2, buttonWidth, buttonHeight);

      // Button text
      this.ctx.fillStyle = color;
      this.ctx.font = `bold ${Math.floor(7 * scale)}px monospace`;
      this.ctx.fillText(text, centerX, y);
    });

    // Back button for touch controls
    if (touchControls && touchControls.enabled) {
      const backBtnWidth = 55 * scale;
      const backBtnHeight = 18 * scale;
      const backBtnX = centerX - backBtnWidth / 2;
      const backBtnY = centerY + 30 * scale;

      this.ctx.fillStyle = 'rgba(255, 102, 0, 0.9)';
      this.ctx.fillRect(backBtnX, backBtnY, backBtnWidth, backBtnHeight);
      this.ctx.strokeStyle = '#FFFFFF';
      this.ctx.lineWidth = 1.5 * scale;
      this.ctx.strokeRect(backBtnX, backBtnY, backBtnWidth, backBtnHeight);

      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.font = `bold ${Math.floor(9 * scale)}px monospace`;
      this.ctx.fillText('BACK', centerX, backBtnY + backBtnHeight / 2);
    } else {
      // Instructions for keyboard
      this.ctx.fillStyle = '#888888';
      this.ctx.font = `${Math.floor(12 * scale)}px monospace`;
      this.ctx.fillText('Press B or ESC to go back', centerX, centerY + 50 * scale);
    }
  }

  renderDebugOverlay(touchControls, surfaceBase) {
    if (!touchControls || this.debugInfo.length === 0) return;

    this.ctx.save();
    const scale = this.scale;
    const fontSize = Math.floor(10 * scale);
    const lineHeight = fontSize + 4 * scale;
    const padding = 5 * scale;

    // Semi-transparent background
    const debugHeight = this.debugInfo.length * lineHeight + padding * 2;
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    this.ctx.fillRect(0, 0, this.canvas.width, debugHeight);

    // Debug text
    this.ctx.font = `${fontSize}px monospace`;
    this.ctx.fillStyle = '#00FF00';
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'top';

    this.debugInfo.forEach((line, index) => {
      this.ctx.fillText(line, padding, padding + index * lineHeight);
    });

    this.ctx.restore();

    // Clear debug info for next frame
    this.debugInfo = [];
  }
}
