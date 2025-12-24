import { TILE_TYPES } from './TileTypes.js';

// Simple seeded random number generator
class Random {
  constructor(seed) {
    this.seed = seed;
  }

  next() {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  nextInt(min, max) {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  nextFloat(min, max) {
    return this.next() * (max - min) + min;
  }

  chance(probability) {
    return this.next() < probability;
  }
}

export class WorldGen {
  constructor(seed = Date.now()) {
    this.seed = seed;
    this.rng = new Random(seed);
  }

  generate(width, depth) {
    const tiles = [];

    for (let y = 0; y < depth; y++) {
      tiles[y] = [];
      for (let x = 0; x < width; x++) {
        tiles[y][x] = this.generateTile(x, y);
      }
    }

    // Create surface area (clear top rows)
    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < width; x++) {
        tiles[y][x] = TILE_TYPES.air.id;
      }
    }

    return tiles;
  }

  generateTile(x, y) {
    // Reset RNG for consistent generation based on position
    const posRng = new Random(this.seed + x * 1000 + y);

    // Surface layer (already handled above, but just in case)
    if (y < 5) {
      return TILE_TYPES.air.id;
    }

    // Depth-based generation
    if (y < 50) {
      // Shallow: Dirt, Coal, Copper
      if (posRng.chance(0.05)) return TILE_TYPES.coal.id;
      if (posRng.chance(0.03)) return TILE_TYPES.copper.id;
      return TILE_TYPES.dirt.id;
    } else if (y < 150) {
      // Medium depth: Rock, Iron, Silver, occasional Gold
      if (posRng.chance(0.04)) return TILE_TYPES.iron.id;
      if (posRng.chance(0.02)) return TILE_TYPES.silver.id;
      if (posRng.chance(0.01)) return TILE_TYPES.gold.id;
      if (posRng.chance(0.3)) return TILE_TYPES.dirt.id;
      return TILE_TYPES.rock.id;
    } else if (y < 300) {
      // Deep: Hard Rock, Gold, Platinum, Ruby
      if (posRng.chance(0.03)) return TILE_TYPES.gold.id;
      if (posRng.chance(0.02)) return TILE_TYPES.platinum.id;
      if (posRng.chance(0.015)) return TILE_TYPES.ruby.id;
      if (posRng.chance(0.05)) return TILE_TYPES.gas.id;
      if (posRng.chance(0.2)) return TILE_TYPES.rock.id;
      return TILE_TYPES.hardRock.id;
    } else if (y < 500) {
      // Very deep: Emerald, Diamond, Lava
      if (posRng.chance(0.02)) return TILE_TYPES.emerald.id;
      if (posRng.chance(0.01)) return TILE_TYPES.diamond.id;
      if (posRng.chance(0.03)) return TILE_TYPES.lava.id;
      if (posRng.chance(0.08)) return TILE_TYPES.gas.id;
      return TILE_TYPES.hardRock.id;
    } else {
      // Ancient layer
      if (posRng.chance(0.03)) return TILE_TYPES.diamond.id;
      if (posRng.chance(0.05)) return TILE_TYPES.lava.id;
      return TILE_TYPES.hardRock.id;
    }
  }
}
