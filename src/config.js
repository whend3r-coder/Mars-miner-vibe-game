// config.js - Tweak these for game feel
export const CONFIG = {
  // World
  WORLD_WIDTH: 100,        // tiles
  WORLD_DEPTH: 2000,       // tiles
  TILE_SIZE: 32,           // pixels

  // Player physics
  MOVE_SPEED: 4,           // tiles/second
  GRAVITY: 20,             // tiles/second²
  MAX_FALL_SPEED: 15,      // tiles/second
  FLY_SPEED: 6,            // tiles/second (thrust)
  FLY_ACCEL: 25,           // tiles/second² (thrust acceleration)

  // Resources
  STARTING_FUEL: 100,
  STARTING_CARGO: 4,       // slots
  STARTING_HULL: 100,

  // Fuel costs (per second)
  FUEL_IDLE: 0,
  FUEL_MOVE: 0.5,
  FUEL_DRILL: 1.0,
  FUEL_FLY: 3.0,

  // Economy
  FUEL_PRICE_PER_UNIT: 2,
  REPAIR_PRICE_PER_HP: 5,
  RESCUE_COST: 500,        // if stranded

  // Rendering
  INTERNAL_WIDTH: 480,
  INTERNAL_HEIGHT: 270,
  CAMERA_LERP: 0.1,        // smoothing factor

  // Drilling
  DRILL_RANGE: 1.5,        // tiles - how far player can reach to drill
};
