// Calculate optimal game resolution based on screen aspect ratio
function calculateGameDimensions() {
  const tileSize = 140;
  const screenWidth = window.innerWidth;
  const screenHeight = window.innerHeight;
  const aspectRatio = screenWidth / screenHeight;

  // Target visible tiles based on aspect ratio
  let tilesWide, tilesTall;

  if (aspectRatio >= 1.7) {
    // Wide screens (16:9 or wider) - desktop, landscape phones
    tilesWide = 8;  // 1024px
    tilesTall = 4;  // 512px  -> 2:1 ratio, close to 16:9
  } else if (aspectRatio >= 1.3) {
    // Medium screens (4:3 to 16:10)
    tilesWide = 6;  // 768px
    tilesTall = 4;  // 512px  -> 3:2 ratio
  } else if (aspectRatio >= 0.8) {
    // Square-ish screens
    tilesWide = 5;  // 640px
    tilesTall = 5;  // 640px  -> 1:1 ratio
  } else {
    // Portrait phones
    tilesWide = 4;  // 512px
    tilesTall = 6;  // 768px  -> 2:3 ratio
  }

  return {
    width: tilesWide * tileSize,
    height: tilesTall * tileSize,
    tilesWide,
    tilesTall
  };
}

const gameDimensions = calculateGameDimensions();

export const GAME_CONFIG = {
  // Display - Resolution adapts to screen, always multiple of tile size
  GAME_WIDTH: gameDimensions.width,
  GAME_HEIGHT: gameDimensions.height,
  TILES_WIDE: gameDimensions.tilesWide,
  TILES_TALL: gameDimensions.tilesTall,
  TILE_SIZE: 140,  // 140px tiles for detailed sprites
  CAMERA_ZOOM: 1,

  // Zoom settings range
  GAME_ZOOM_MIN: 0.5,
  GAME_ZOOM_MAX: 4.0,
  GAME_ZOOM_STEP: 0.25,  // Allow 0.75 zoom option
  HUD_ZOOM_MIN: 0.5,
  HUD_ZOOM_MAX: 2.0,
  HUD_ZOOM_STEP: 0.5,

  // World
  WORLD_WIDTH: 100,        // tiles
  WORLD_DEPTH: 500,        // tiles
  SURFACE_HEIGHT: 10,      // tiles of surface before mine

  // Physics (in pixels per second) - Mars gravity (38% of Earth)
  // Mars = 3.72 m/s², at 140px/tile scale = ~520 px/s²
  GRAVITY: 520,
  MOVE_SPEED: 380,  // Base movement speed (upgradeable)
  JUMP_VELOCITY: -435,  // Base ~1.3 tile jump height (upgradeable)
  MAX_FALL_SPEED: 800,  // Terminal velocity (~5.7 tiles/sec, reasonable for Mars atmosphere)
  CLIMB_SPEED: 280,

  // Fall damage (in tiles)
  FALL_DAMAGE_START: 3,     // Start taking damage after 3 tiles
  FALL_DAMAGE_DEADLY: 6,    // 6 tiles fall is deadly (100 damage)

  // Rover stats
  STARTING_BATTERY: 100,
  STARTING_HULL: 100,
  STARTING_CARGO: 8,
  STARTING_MONEY: 100,

  // Battery consumption (per second, except JUMP which is per jump)
  BATTERY_IDLE: 0,
  BATTERY_MOVE: 0.3,
  BATTERY_DRILL: 1.0,
  BATTERY_JUMP: 2.5,      // Per jump - useful but has tradeoff
  BATTERY_THRUSTER: 3.0,  // Only thrusters cost battery
  BATTERY_CLIMB: 0.5,     // Climbing ladders costs energy

  // Recharge (4 sec total: ~1s deploy + ~3s charging)
  SOLAR_RECHARGE_TIME: 3000,  // ms to fully recharge (after deploy)
  SOLAR_RECHARGE_RATE: 33,    // battery per second when panels deployed

  // Economy
  RESCUE_COST: 500,

  // Drilling
  DRILL_RANGE: 1,  // tiles

  // Camera
  CAMERA_LERP: 1,  // Instant follow - no lag

  // Surface layout
  SURFACE_START_X: 20,      // Where flat surface begins
  SURFACE_END_X: 80,        // Where flat surface ends
  CAVE_ENTRANCE_X: 15,      // Cave entrance on the left
  SPAWN_X: 22,              // Player spawn position (left of shop)
};

// Detect mobile for default settings
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

export const DEFAULT_SETTINGS = {
  soundEnabled: true,
  debugMode: false,
  gameZoom: isMobile ? 1.25 : 1.0,
  hudZoom: isMobile ? 1.75 : 1.0,
  devMode: false,        // Infinite battery and money
  tileSnap: true,        // Gentle guidance toward tile centers
};

export const UPGRADES = {
  drillSpeed: {
    name: 'Drill Speed',
    levels: [
      { cost: 0, multiplier: 1.0 },
      { cost: 500, multiplier: 1.5 },
      { cost: 1000, multiplier: 2.0 },
      { cost: 2000, multiplier: 3.0 },
      { cost: 4000, multiplier: 5.0 },
    ],
  },
  drillPower: {
    name: 'Drill Power',
    levels: [
      { cost: 0, maxHardness: 1 },
      { cost: 1000, maxHardness: 2 },
      { cost: 5000, maxHardness: 3 },
    ],
  },
  batteryCapacity: {
    name: 'Battery',
    levels: [
      { cost: 0, capacity: 100 },
      { cost: 200, capacity: 150 },
      { cost: 500, capacity: 200 },
      { cost: 1200, capacity: 300 },
      { cost: 3000, capacity: 500 },
    ],
  },
  cargoBay: {
    name: 'Cargo Bay',
    levels: [
      { cost: 0, slots: 8 },
      { cost: 300, slots: 12 },
      { cost: 800, slots: 18 },
      { cost: 2000, slots: 25 },
      { cost: 5000, slots: 35 },
    ],
  },
  hullArmor: {
    name: 'Hull Armor',
    levels: [
      { cost: 0, hp: 100 },
      { cost: 400, hp: 150 },
      { cost: 1000, hp: 200 },
      { cost: 2500, hp: 300 },
      { cost: 6000, hp: 500 },
    ],
  },
  movementSpeed: {
    name: 'Movement Speed',
    levels: [
      { cost: 0, multiplier: 1.0 },
      { cost: 400, multiplier: 1.25 },
      { cost: 1000, multiplier: 1.5 },
      { cost: 2500, multiplier: 1.8 },
    ],
  },
  jumpHeight: {
    name: 'Jump Height',
    levels: [
      { cost: 0, multiplier: 1.0 },       // 1.3 tiles base
      { cost: 600, multiplier: 1.15 },    // ~1.5 tiles
      { cost: 1500, multiplier: 1.35 },   // ~1.75 tiles
      { cost: 3500, multiplier: 1.55 },   // ~2.0 tiles
    ],
  },
  headlights: {
    name: 'Headlights',
    levels: [
      { cost: 0, radius: 1.0 },
      { cost: 300, radius: 2 },
      { cost: 800, radius: 3.5 },
      { cost: 2000, radius: 6 },
    ],
  },
  thrusters: {
    name: 'Thrusters',
    levels: [
      { cost: 0, enabled: false },
      { cost: 25000, enabled: true },
    ],
  },
};

export const SHOP_ITEMS = {
  ladder: {
    name: 'Ladder',
    cost: 10,
    description: 'Climb up and down walls',
    stackable: true,
    maxStack: 50,
  },
  platform: {
    name: 'Platform',
    cost: 100,
    description: 'Create horizontal bridges',
    stackable: true,
    maxStack: 20,
  },
  torch: {
    name: 'Torch',
    cost: 75,
    description: 'Permanent light source',
    stackable: true,
    maxStack: 20,
  },
  explosiveTip: {
    name: 'Explosive Tip',
    cost: 40,
    description: 'Breaks boulders (1 use)',
    stackable: true,
    maxStack: 20,
  },
  dynamite: {
    name: 'Dynamite',
    cost: 200,
    description: 'Blast a 3x3 area',
    stackable: true,
    maxStack: 10,
  },
  elevatorSmall: {
    name: 'Elevator (8)',
    cost: 400,
    description: '8 tile vertical lift',
    stackable: true,
    maxStack: 5,
    elevatorLength: 8,
  },
  elevatorMedium: {
    name: 'Elevator (16)',
    cost: 700,
    description: '16 tile vertical lift',
    stackable: true,
    maxStack: 5,
    elevatorLength: 16,
  },
  elevatorLarge: {
    name: 'Elevator (32)',
    cost: 1200,
    description: '32 tile vertical lift',
    stackable: true,
    maxStack: 5,
    elevatorLength: 32,
  },
  scanner: {
    name: 'Scanner',
    cost: 1000,
    description: 'Reveals ores in radius',
    stackable: false,
    maxStack: 1,
  },
  grapplingHook: {
    name: 'Grappling Hook',
    cost: 2000,
    description: 'Swing and climb tool',
    stackable: false,
    maxStack: 1,
  },
  teleporterPad: {
    name: 'Teleporter Pad',
    cost: 5000,
    description: 'Fast travel between pads',
    stackable: true,
    maxStack: 10,
  },
};
