import { CONFIG } from '../config.js';
import { WorldGen } from './WorldGen.js';
import { getTileTypeById, TILE_TYPES } from './TileTypes.js';

export class World {
  constructor(seed = Date.now()) {
    this.seed = seed;
    this.width = CONFIG.WORLD_WIDTH;
    this.depth = CONFIG.WORLD_DEPTH;
    this.tiles = [];
    this.modifiedTiles = new Map(); // Track tiles that have been modified

    this.generate();
  }

  generate() {
    const gen = new WorldGen(this.seed);
    this.tiles = gen.generate(this.width, this.depth);
  }

  getTile(x, y) {
    // Return tile type data
    if (x < 0 || x >= this.width || y < 0 || y >= this.depth) {
      return TILE_TYPES.air; // Out of bounds
    }

    const tileId = this.tiles[Math.floor(y)][Math.floor(x)];
    return getTileTypeById(tileId);
  }

  getTileId(x, y) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.depth) {
      return TILE_TYPES.air.id;
    }
    return this.tiles[Math.floor(y)][Math.floor(x)];
  }

  setTile(x, y, tileName) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.depth) {
      return;
    }

    const tileType = TILE_TYPES[tileName];
    if (!tileType) {
      console.error(`Unknown tile type: ${tileName}`);
      return;
    }

    const tileX = Math.floor(x);
    const tileY = Math.floor(y);

    this.tiles[tileY][tileX] = tileType.id;
    this.modifiedTiles.set(`${tileX},${tileY}`, tileType.id);
  }

  isSolid(x, y) {
    return this.getTile(x, y).solid;
  }

  // Check collision with a rectangle
  checkCollision(x, y, width, height) {
    const tiles = this.getTilesInRect(x, y, width, height);
    return tiles.some(tile => tile.solid);
  }

  // Get all tiles in a rectangle
  getTilesInRect(x, y, width, height) {
    const tiles = [];
    const startX = Math.floor(x);
    const startY = Math.floor(y);
    const endX = Math.ceil(x + width);
    const endY = Math.ceil(y + height);

    for (let ty = startY; ty < endY; ty++) {
      for (let tx = startX; tx < endX; tx++) {
        tiles.push(this.getTile(tx, ty));
      }
    }

    return tiles;
  }

  getModifiedTiles() {
    return Array.from(this.modifiedTiles.entries()).map(([pos, tileId]) => {
      const [x, y] = pos.split(',').map(Number);
      return { x, y, tileId };
    });
  }

  applyModifiedTiles(modifiedTiles) {
    modifiedTiles.forEach(({ x, y, tileId }) => {
      this.tiles[y][x] = tileId;
      this.modifiedTiles.set(`${x},${y}`, tileId);
    });
  }
}
