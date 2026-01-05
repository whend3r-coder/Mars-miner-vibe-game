import { GAME_CONFIG } from '../config/GameConfig.js';
import { TILE_TYPES } from '../config/TileTypes.js';

export class WorldGenerator {
  constructor(seed) {
    this.seed = seed;
    this.pitfalls = new Map();  // Store pitfall locations
    this.generatePitfalls();
  }

  // Generate pitfall locations deterministically from seed
  generatePitfalls() {
    const pitfallCount = 30;  // Number of pitfalls in the world

    for (let i = 0; i < pitfallCount; i++) {
      // Use seed to deterministically place pitfalls
      const rand1 = this.seededRandom(i * 123 + 456);
      const rand2 = this.seededRandom(i * 789 + 101);
      const rand3 = this.seededRandom(i * 234 + 567);
      const rand4 = this.seededRandom(i * 345 + 678);

      // X position: anywhere in mining area
      const x = Math.floor(GAME_CONFIG.CAVE_ENTRANCE_X - 5 + rand1 * (GAME_CONFIG.SURFACE_START_X - GAME_CONFIG.CAVE_ENTRANCE_X + 5));

      // Y position: start at depth 50+ (y = surface + 50)
      const minDepth = 50;
      const maxDepth = 400;
      const startY = GAME_CONFIG.SURFACE_HEIGHT + minDepth + Math.floor(rand2 * (maxDepth - minDepth));

      // Pitfall depth: 4-8 tiles
      const depth = 4 + Math.floor(rand3 * 5);  // 4, 5, 6, 7, or 8

      // Crystal at bottom: 75% chance
      const hasCrystal = rand4 < 0.75;

      // Store pitfall data
      for (let dy = 0; dy < depth; dy++) {
        const key = `${x},${startY + dy}`;
        this.pitfalls.set(key, {
          isBottom: dy === depth - 1,
          hasCrystal: dy === depth - 1 && hasCrystal
        });
      }
    }
  }

  // Seeded random for pitfall generation
  seededRandom(n) {
    const x = Math.sin(this.seed + n) * 43758.5453;
    return x - Math.floor(x);
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

    // === CHECK FOR PITFALLS ===
    const pitfallKey = `${x},${y}`;
    if (this.pitfalls.has(pitfallKey)) {
      const pitfallData = this.pitfalls.get(pitfallKey);
      if (pitfallData.hasCrystal) {
        return TILE_TYPES.crystal.id;  // Crystal at bottom of pitfall
      }
      return TILE_TYPES.air.id;  // Empty pitfall shaft
    }

    // === UNDERGROUND MINING AREA ===
    const depth = y - surfaceY;
    const rand = this.random(x, y);

    // Boulder spawning - starts at depth 30, increases with depth
    // Boulders spawn where there would normally be rock/hardRock
    const boulderChance = this.getBoulderChance(depth);
    const boulderRand = this.random(x + 1000, y + 1000);  // Different seed for boulders
    if (boulderRand < boulderChance) {
      return TILE_TYPES.boulder.id;
    }

    // Layer 1: Shallow (0-50) - Dirt, Coal, Iron
    if (depth < 50) {
      if (rand < 0.04) return TILE_TYPES.coal.id;       // 4%
      if (rand < 0.08) return TILE_TYPES.iron.id;       // 4% (early game ore)
      return TILE_TYPES.dirt.id;
    }

    // Layer 2: Medium (50-150) - Rock, Silver, Gold, Ruby
    if (depth < 150) {
      if (rand < 0.03) return TILE_TYPES.silver.id;     // 3%
      if (rand < 0.06) return TILE_TYPES.gold.id;       // 3%
      if (rand < 0.09) return TILE_TYPES.ruby.id;       // 3% (amethyst sprite)
      if (rand < 0.14) return TILE_TYPES.dirt.id;
      return TILE_TYPES.rock.id;
    }

    // Layer 3: Deep (150-300) - Hard Rock, Gold, Platinum, Gas
    if (depth < 300) {
      if (rand < 0.025) return TILE_TYPES.gold.id;      // 2.5%
      if (rand < 0.055) return TILE_TYPES.platinum.id;  // 3%
      if (rand < 0.07) return TILE_TYPES.gas.id;        // 1.5% gas
      if (rand < 0.17) return TILE_TYPES.rock.id;
      return TILE_TYPES.hardRock.id;
    }

    // Layer 4: Very Deep (300-400) - Emerald, Diamond, Lava
    if (depth < 400) {
      if (rand < 0.03) return TILE_TYPES.emerald.id;    // 3% (was 1.5%)
      if (rand < 0.07) return TILE_TYPES.diamond.id;    // 4% (was 1.5%)
      if (rand < 0.10) return TILE_TYPES.lava.id;       // 3% lava
      if (rand < 0.12) return TILE_TYPES.gas.id;        // 2% gas
      return TILE_TYPES.hardRock.id;
    }

    // Layer 5: Ancient (400+) - Diamond, Lava, Hard Rock
    if (rand < 0.05) return TILE_TYPES.diamond.id;      // 5% (was 2.5%)
    if (rand < 0.10) return TILE_TYPES.lava.id;
    if (rand < 0.12) return TILE_TYPES.gas.id;
    return TILE_TYPES.hardRock.id;
  }

  // Boulder spawn chance based on depth
  getBoulderChance(depth) {
    // Boulders spawn from the very beginning at 7%
    if (depth < 0) return 0;            // Only in sky area (shouldn't happen)
    return 0.07;                         // 7% everywhere underground
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
