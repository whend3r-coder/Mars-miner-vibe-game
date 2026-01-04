import { GAME_CONFIG } from '../config/GameConfig.js';
import { TILE_TYPES, getTileTypeById } from '../config/TileTypes.js';

export class BoulderSystem {
  constructor(scene) {
    this.scene = scene;

    // Track unstable boulders and their timers
    // Key: "x,y", Value: { startTime: timestamp, falling: boolean, fallY: number }
    this.unstableBoulders = new Map();

    // Time before unsupported boulder falls (ms)
    this.fallDelay = 2000;

    // Fall speed (pixels per second)
    this.fallSpeed = 600;

    // Visual warning indicators
    this.warningIndicators = new Map();
  }

  update(time, delta) {
    const dt = delta / 1000;

    // Get player position for death check
    const playerTileX = Math.floor(this.scene.rover.sprite.x / GAME_CONFIG.TILE_SIZE);
    const playerTileY = Math.floor(this.scene.rover.sprite.y / GAME_CONFIG.TILE_SIZE);

    // Scan loaded chunks for boulders
    this.scanForBoulders();

    // Update unstable boulders
    const currentTime = Date.now();
    const bouldersToRemove = [];

    for (const [key, data] of this.unstableBoulders) {
      const [x, y] = key.split(',').map(Number);

      // Check if boulder still exists
      const tile = this.scene.getTileAt(x, y);
      if (!tile || !tile.unstable) {
        bouldersToRemove.push(key);
        this.removeWarning(key);
        continue;
      }

      // Check if boulder is now supported
      if (this.isBoulderSupported(x, y)) {
        bouldersToRemove.push(key);
        this.removeWarning(key);
        continue;
      }

      // Boulder is falling
      if (data.falling) {
        // Update fall position
        data.fallY += this.fallSpeed * dt;

        // Calculate current tile position during fall
        const originalY = y;
        const fallTileOffset = Math.floor(data.fallY / GAME_CONFIG.TILE_SIZE);
        const newY = originalY + fallTileOffset;

        // Check for collision with ground or player
        const tileBelow = this.scene.getTileAt(x, newY + 1);

        // Check if boulder lands on solid ground OR ladder (ladders catch boulders!)
        // Check this BEFORE player collision - ladder protects the player!
        const landedOnSolid = tileBelow && tileBelow.solid && !tileBelow.unstable;
        const landedOnLadder = tileBelow && tileBelow.climbable;

        if (landedOnSolid || landedOnLadder) {
          // Boulder has landed (caught by ladder or solid ground)
          if (newY !== originalY) {
            // Move boulder to new position
            this.scene.setTileAt(x, originalY, TILE_TYPES.air.id);
            this.scene.setTileAt(x, newY, TILE_TYPES.boulder.id);
          }

          // Show impact effect
          this.showImpactEffect(x, newY);

          bouldersToRemove.push(key);
          this.removeWarning(key);

          // Re-add to check if still unstable at new position
          // (it won't be unstable because it's now adjacent to the ladder)
          this.checkBoulderStability(x, newY);
          continue;
        }

        // Check if boulder hits player (only if NOT caught by ladder/ground above)
        if (x === playerTileX && (newY === playerTileY || newY + 1 === playerTileY)) {
          // Boulder crushes player!
          this.crushPlayer(x, newY);
          // Remove boulder (it broke on impact)
          this.scene.setTileAt(x, originalY, TILE_TYPES.air.id);
          bouldersToRemove.push(key);
          this.removeWarning(key);
          continue;
        }

        // Update visual position (handled by chunk reload on setTileAt)
        continue;
      }

      // Not yet falling - check timer
      const elapsed = currentTime - data.startTime;

      // Update warning indicator
      this.updateWarning(key, x, y, elapsed / this.fallDelay);

      if (elapsed >= this.fallDelay) {
        // Start falling!
        data.falling = true;
        data.fallY = 0;

        // Play warning sound/effect
        this.showFallStart(x, y);
      }
    }

    // Clean up removed boulders
    for (const key of bouldersToRemove) {
      this.unstableBoulders.delete(key);
    }
  }

  scanForBoulders() {
    // Scan visible chunks for new boulders
    for (const [chunkKey, chunk] of this.scene.loadedChunks) {
      for (const sprite of chunk.sprites) {
        const tileType = sprite.getData('tileType');
        if (tileType && tileType.unstable) {
          const x = sprite.getData('tileX');
          const y = sprite.getData('tileY');
          this.checkBoulderStability(x, y);
        }
      }
    }
  }

  checkBoulderStability(x, y) {
    const key = `${x},${y}`;

    // Already tracking this boulder
    if (this.unstableBoulders.has(key)) {
      return;
    }

    // Check if supported
    if (!this.isBoulderSupported(x, y)) {
      // Start tracking as unstable
      this.unstableBoulders.set(key, {
        startTime: Date.now(),
        falling: false,
        fallY: 0
      });

      // Create warning indicator
      this.createWarning(key, x, y);
    }
  }

  isBoulderSupported(x, y) {
    // Check ground below
    const tileBelow = this.scene.getTileAt(x, y + 1);
    if (tileBelow && tileBelow.solid) {
      return true;
    }

    // Check for ladder stabilization (adjacent ladders)
    const directions = [
      { dx: -1, dy: 0 },  // left
      { dx: 1, dy: 0 },   // right
      { dx: 0, dy: -1 },  // above
      { dx: 0, dy: 1 },   // below
    ];

    for (const dir of directions) {
      const adjacentTile = this.scene.getTileAt(x + dir.dx, y + dir.dy);
      if (adjacentTile && adjacentTile.climbable) {
        return true;  // Stabilized by ladder
      }
    }

    return false;
  }

  createWarning(key, x, y) {
    const worldX = x * GAME_CONFIG.TILE_SIZE + GAME_CONFIG.TILE_SIZE / 2;
    const worldY = y * GAME_CONFIG.TILE_SIZE + GAME_CONFIG.TILE_SIZE / 2;

    // Create shaking effect indicator
    const indicator = this.scene.add.circle(worldX, worldY - GAME_CONFIG.TILE_SIZE, 6, 0xffaa00)
      .setDepth(20)
      .setAlpha(0);

    this.warningIndicators.set(key, indicator);
  }

  updateWarning(key, x, y, progress) {
    const indicator = this.warningIndicators.get(key);
    if (!indicator) return;

    // Increase visibility and shake as time progresses
    indicator.setAlpha(Math.min(1, progress * 1.5));

    // Shake effect
    const shake = Math.sin(Date.now() / 50) * progress * 4;
    const worldX = x * GAME_CONFIG.TILE_SIZE + GAME_CONFIG.TILE_SIZE / 2;
    indicator.setX(worldX + shake);

    // Change color from yellow to red
    const r = 255;
    const g = Math.floor(170 * (1 - progress));
    const b = 0;
    indicator.setFillStyle(Phaser.Display.Color.GetColor(r, g, b));
  }

  removeWarning(key) {
    const indicator = this.warningIndicators.get(key);
    if (indicator) {
      indicator.destroy();
      this.warningIndicators.delete(key);
    }
  }

  showFallStart(x, y) {
    const worldX = x * GAME_CONFIG.TILE_SIZE + GAME_CONFIG.TILE_SIZE / 2;
    const worldY = y * GAME_CONFIG.TILE_SIZE + GAME_CONFIG.TILE_SIZE / 2;

    // Dust particles
    for (let i = 0; i < 5; i++) {
      const particle = this.scene.add.circle(
        worldX + Phaser.Math.Between(-10, 10),
        worldY - GAME_CONFIG.TILE_SIZE / 2,
        3,
        0x888888
      ).setDepth(25);

      this.scene.tweens.add({
        targets: particle,
        y: particle.y - 20,
        alpha: 0,
        duration: 400,
        onComplete: () => particle.destroy()
      });
    }
  }

  showImpactEffect(x, y) {
    const worldX = x * GAME_CONFIG.TILE_SIZE + GAME_CONFIG.TILE_SIZE / 2;
    const worldY = y * GAME_CONFIG.TILE_SIZE + GAME_CONFIG.TILE_SIZE;

    // Camera shake
    this.scene.cameras.main.shake(100, 0.005);

    // Dust cloud
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI;
      const particle = this.scene.add.circle(worldX, worldY, 4, 0x666666)
        .setDepth(25);

      this.scene.tweens.add({
        targets: particle,
        x: worldX + Math.cos(angle) * 30,
        y: worldY - Math.sin(angle) * 20,
        alpha: 0,
        scale: 0.5,
        duration: 300,
        onComplete: () => particle.destroy()
      });
    }
  }

  showLadderDestroyed(x, y) {
    const worldX = x * GAME_CONFIG.TILE_SIZE + GAME_CONFIG.TILE_SIZE / 2;
    const worldY = y * GAME_CONFIG.TILE_SIZE + GAME_CONFIG.TILE_SIZE / 2;

    // Wood splinter effect
    for (let i = 0; i < 4; i++) {
      const particle = this.scene.add.rectangle(
        worldX,
        worldY,
        4,
        8,
        0x8b4513
      ).setDepth(25);

      this.scene.tweens.add({
        targets: particle,
        x: worldX + Phaser.Math.Between(-30, 30),
        y: worldY + Phaser.Math.Between(-30, 30),
        angle: Phaser.Math.Between(0, 360),
        alpha: 0,
        duration: 500,
        onComplete: () => particle.destroy()
      });
    }
  }

  crushPlayer(x, y) {
    // Show crush effect
    const worldX = x * GAME_CONFIG.TILE_SIZE + GAME_CONFIG.TILE_SIZE / 2;
    const worldY = y * GAME_CONFIG.TILE_SIZE + GAME_CONFIG.TILE_SIZE / 2;

    // Death message
    const msg = this.scene.add.bitmapText(
      Math.floor(worldX),
      Math.floor(worldY - 30),
      'pixel',
      'CRUSHED!',
      12
    ).setOrigin(0.5).setTint(0xff0000).setDepth(100);

    this.scene.tweens.add({
      targets: msg,
      y: msg.y - 40,
      alpha: 0,
      duration: 2000,
      onComplete: () => msg.destroy()
    });

    // Big camera shake
    this.scene.cameras.main.shake(300, 0.02);

    // Trigger rover death (instant)
    this.scene.rover.rescueRover();
  }

  // Clean up when scene shuts down
  destroy() {
    for (const indicator of this.warningIndicators.values()) {
      indicator.destroy();
    }
    this.warningIndicators.clear();
    this.unstableBoulders.clear();
  }
}
