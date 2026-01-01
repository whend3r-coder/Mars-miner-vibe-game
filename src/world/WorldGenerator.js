import { GAME_CONFIG } from '../config/GameConfig.js';
import { TILE_TYPES } from '../config/TileTypes.js';

export class WorldGenerator {
  constructor(seed) {
    this.seed = seed;
  }

  // Simple seeded random number generator
  random(x, y) {
    const n = Math.sin(this.seed + x * 12.9898 + y * 78.233) * 43758.5453;
    return n - Math.floor(n);
  }

  getTileAt(x, y) {
    // Out of bounds
    if (x < 0 || x >= GAME_CONFIG.WORLD_WIDTH || y < 0 || y >= GAME_CONFIG.WORLD_DEPTH) {
      return TILE_TYPES.air.id;
    }

    const surfaceY = GAME_CONFIG.SURFACE_HEIGHT;
    const mineStartX = GAME_CONFIG.CAVE_ENTRANCE_X; // Where mining area begins
    const townStart = GAME_CONFIG.SURFACE_START_X;
    const townEnd = GAME_CONFIG.SURFACE_END_X;

    // === SKY AREA (above surface) ===
    if (y < surfaceY) {
      return TILE_TYPES.air.id;
    }

    // === GROUND LEVEL (y === surfaceY) ===
    if (y === surfaceY) {
      // Town area - undrillable surface
      if (x >= townStart && x <= townEnd) {
        return TILE_TYPES.surface.id;
      }
      // Mining area floor - drillable dirt so player can mine down!
      if (x >= mineStartX - 5 && x < townStart) {
        return TILE_TYPES.dirt.id;
      }
      // Left mountain (can't go further left)
      if (x < mineStartX - 5) {
        return TILE_TYPES.rock.id;
      }
      // Right side (beyond town)
      return TILE_TYPES.surface.id;
    }

    // === BELOW SURFACE ===
    if (y > surfaceY) {
      // PROTECTED GROUND UNDER TOWN (can't mine directly under shops - narrow strip)
      if (x >= townStart + 5 && x <= townEnd - 5 && y <= surfaceY + 5) {
        return TILE_TYPES.hardRock.id;
      }

      // ENTIRE UNDERGROUND IS MINABLE (except the narrow strip under town center)
      // This allows wide horizontal mining once you go down
    }

    // === UNDERGROUND MINING AREA ===
    const depth = y - surfaceY;
    const rand = this.random(x, y);

    // Layer 1: Shallow (0-50) - Dirt, Coal, Copper
    if (depth < 50) {
      if (rand < 0.02) return TILE_TYPES.coal.id;
      if (rand < 0.04) return TILE_TYPES.copper.id;
      return TILE_TYPES.dirt.id;
    }

    // Layer 2: Medium (50-150) - Rock, Iron, Silver, Gold
    if (depth < 150) {
      if (rand < 0.015) return TILE_TYPES.iron.id;
      if (rand < 0.03) return TILE_TYPES.silver.id;
      if (rand < 0.04) return TILE_TYPES.gold.id;
      if (rand < 0.08) return TILE_TYPES.dirt.id;
      return TILE_TYPES.rock.id;
    }

    // Layer 3: Deep (150-300) - Hard Rock, Gold, Platinum, Ruby, Gas
    if (depth < 300) {
      if (rand < 0.01) return TILE_TYPES.gold.id;
      if (rand < 0.025) return TILE_TYPES.platinum.id;
      if (rand < 0.035) return TILE_TYPES.ruby.id;
      if (rand < 0.05) return TILE_TYPES.gas.id;
      if (rand < 0.15) return TILE_TYPES.rock.id;
      return TILE_TYPES.hardRock.id;
    }

    // Layer 4: Very Deep (300-400) - Emerald, Diamond, Lava
    if (depth < 400) {
      if (rand < 0.015) return TILE_TYPES.emerald.id;
      if (rand < 0.03) return TILE_TYPES.diamond.id;
      if (rand < 0.06) return TILE_TYPES.lava.id;
      if (rand < 0.08) return TILE_TYPES.gas.id;
      return TILE_TYPES.hardRock.id;
    }

    // Layer 5: Ancient (400+) - Diamond, Lava, Hard Rock
    if (rand < 0.025) return TILE_TYPES.diamond.id;
    if (rand < 0.08) return TILE_TYPES.lava.id;
    if (rand < 0.1) return TILE_TYPES.gas.id;
    return TILE_TYPES.hardRock.id;
  }

  // Simple 2D noise for potential cave generation
  noise2D(x, y) {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;

    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);

    const topRight = this.random(X + 1, Y);
    const topLeft = this.random(X, Y);
    const bottomRight = this.random(X + 1, Y + 1);
    const bottomLeft = this.random(X, Y + 1);

    const u = this.fade(xf);
    const v = this.fade(yf);

    return this.lerp(
      this.lerp(topLeft, topRight, u),
      this.lerp(bottomLeft, bottomRight, u),
      v
    );
  }

  fade(t) {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  lerp(a, b, t) {
    return a + t * (b - a);
  }
}
