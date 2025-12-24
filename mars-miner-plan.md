# Mars Miner: Game Design & Implementation Plan

A Motherload-inspired 2D mining game with beautiful pixel art, built with vanilla JS + Canvas and packaged as an Android APK.

---

## 1. Project Overview

### Vision
Recreate the satisfying core loop of the original Motherload Flash game—drilling deep into Mars, managing limited resources, upgrading your rig—while elevating the visual presentation to modern indie pixel art standards (Moonlighter, Stardew Valley aesthetic).

### Tech Stack
- **Runtime**: Vanilla JavaScript + HTML5 Canvas
- **Build**: Vite (fast dev server, optimized production builds)
- **Mobile Wrapper**: Capacitor (web → native Android)
- **CI/CD**: GitHub Actions (automated APK builds)
- **Art**: Hand-crafted pixel art, 16x16 or 32x32 base tile size
- **Audio**: Howler.js for sound effects and music

### Target Platforms
- Web (primary development target)
- Android APK (via Capacitor)
- Potential: iOS, Desktop (Electron) with minimal changes

---

## 2. Core Game Mechanics

### 2.1 The Mining Rig (Player)

**Movement & Controls**
- Arrow keys / WASD / Touch joystick for mobile
- Left/Right: Horizontal movement (on surface or through open tunnels)
- Down: Drill downward (consumes fuel, takes time based on material hardness)
- Up: Activate thrusters to fly upward (consumes fuel rapidly)
- The rig cannot drill upward—only fly

**Resources to Manage**
| Resource | Description | Consequence if Empty |
|----------|-------------|---------------------|
| Fuel | Consumed by all movement, drilling uses less than flying | Stranded, must pay for rescue (loses money) |
| Cargo | Limited slots for collected ores | Must return to surface to sell |
| Hull | Damage from hazards (lava, gas pockets, explosives) | Game over if destroyed |

**Upgrades (purchased at surface base)**
- Drill: Faster drilling, can break harder materials
- Fuel Tank: Larger capacity
- Cargo Bay: More ore slots
- Hull: More damage resistance
- Radiator: Resist heat at deeper levels
- Thrusters: Faster vertical flight, less fuel consumption

### 2.2 The Underground World

**Procedural Generation**
- World is a 2D grid of tiles (e.g., 100 tiles wide × 2000+ tiles deep)
- Generate on first play, save seed for persistence
- Tile types distributed by depth bands:

```
Depth 0-50:     Dirt (easy), Coal, Copper, occasional Iron
Depth 50-150:   Rock (medium), Iron, Silver, small Gold veins
Depth 150-300:  Hard Rock, Gold, Platinum, Ruby, gas pockets
Depth 300-500:  Dense Rock, Emerald, Diamond, lava pools
Depth 500+:     Ancient Layer, Alien artifacts, extreme hazards
```

**Tile Properties**
```javascript
tileTypes = {
  air:      { solid: false, drillTime: 0 },
  dirt:     { solid: true, drillTime: 0.3, hardness: 1 },
  rock:     { solid: true, drillTime: 0.8, hardness: 2, requiresDrill: 2 },
  hardRock: { solid: true, drillTime: 1.5, hardness: 3, requiresDrill: 4 },
  coal:     { solid: true, drillTime: 0.3, ore: 'coal', value: 5 },
  copper:   { solid: true, drillTime: 0.4, ore: 'copper', value: 15 },
  iron:     { solid: true, drillTime: 0.5, ore: 'iron', value: 30 },
  silver:   { solid: true, drillTime: 0.6, ore: 'silver', value: 75 },
  gold:     { solid: true, drillTime: 0.8, ore: 'gold', value: 150 },
  platinum: { solid: true, drillTime: 1.0, ore: 'platinum', value: 300 },
  ruby:     { solid: true, drillTime: 1.2, ore: 'ruby', value: 500 },
  emerald:  { solid: true, drillTime: 1.2, ore: 'emerald', value: 750 },
  diamond:  { solid: true, drillTime: 1.5, ore: 'diamond', value: 1500 },
  lava:     { solid: false, hazard: 'heat', damage: 10 },
  gas:      { solid: true, hazard: 'explosion', triggerRadius: 2 },
}
```

### 2.3 Surface Base

**Buildings/NPCs**
1. **Fuel Station**: Refuel (cost scales with tank size)
2. **Ore Buyer**: Sell collected ores for cash
3. **Upgrade Shop**: Purchase rig upgrades
4. **Repair Bay**: Fix hull damage
5. **Save Point**: Manual save (also auto-save on surface return)

**Economy Balance**
- Early game: Tight fuel economy, frequent returns
- Mid game: Deeper runs, risk/reward tension
- Late game: Expedition planning, hazard management

### 2.4 Hazards & Events

- **Gas Pockets**: Chain explosions when drilled, destroy nearby tiles and damage hull
- **Lava Pools**: Continuous heat damage, requires radiator upgrades
- **Unstable Caverns**: Random cave-ins if you linger
- **Earthquakes**: Occasional screen shake + falling debris at depth
- **Alien Ruins**: Late-game areas with high-value artifacts and unique dangers

---

## 3. Visual Design (Pixel Art Style)

### 3.1 Art Direction

**Reference Games**: Moonlighter, Stardew Valley, Dome Keeper

**Key Characteristics**
- 32x32 pixel base tile size (good detail while staying chunky)
- Limited but vibrant palette (48-64 colors max, consistent across all assets)
- Subtle dithering for texture gradients
- Warm underground palette (browns, oranges, reds) contrasting cool surface (Martian rust + blue sky)
- Particle effects for drilling dust, thruster flames, ore sparkle
- Smooth animation (8-12 frames for key actions)

**Palette Suggestion** (can use Lospec palettes)
- Surface: Dusty oranges, pale sky, metallic grays
- Shallow: Warm browns, tan, copper tones
- Mid: Cooler grays, blue-silver ore highlights
- Deep: Dark purples, red lava glow, gem sparkles
- Artifacts: Alien green/cyan accents

### 3.2 Required Art Assets

**Player Rig**
- Idle (4 frames, subtle hover bob)
- Moving left/right (4 frames)
- Drilling down (4 frames + particle effect)
- Flying up (4 frames + thruster flame)
- Damaged states (visual cracks overlay)

**Tiles** (each 32x32, with edge variants for seamless tiling)
- Dirt (3 variants)
- Rock types (3 variants each)
- Each ore type (distinct color, subtle sparkle animation 2-3 frames)
- Lava (4 frame animation)
- Gas pocket (subtle glow pulse)
- Air/empty (background texture)
- Surface buildings (larger multi-tile sprites)

**UI**
- Fuel gauge (vertical bar with icons)
- Cargo slots (grid with ore icons)
- Depth meter
- Money counter
- Minimap (optional, reveals explored areas)
- Shop interface panels
- Touch controls overlay (mobile)

**Effects**
- Drilling particles (dirt chunks flying)
- Thruster flame (2-3 frame loop)
- Explosion (6-8 frames)
- Ore collection sparkle
- Damage flash

### 3.3 Animation Principles

- 12 FPS for character animations
- Smooth easing on movement (not linear)
- Screen shake for impacts and explosions
- Parallax background layers for depth feel
- Camera follows player with slight lag (smooth follow)

---

## 4. Technical Architecture

### 4.1 Project Structure

```
mars-miner/
├── index.html
├── package.json
├── vite.config.js
├── capacitor.config.json
├── .github/
│   └── workflows/
│       └── build-apk.yml
├── src/
│   ├── main.js              # Entry point, game loop
│   ├── config.js            # Game constants, tuning values
│   ├── core/
│   │   ├── Game.js          # Main game class, state management
│   │   ├── Input.js         # Keyboard, touch, gamepad handling
│   │   ├── Renderer.js      # Canvas rendering, camera, effects
│   │   ├── AssetLoader.js   # Sprites, sounds preloading
│   │   └── SaveManager.js   # LocalStorage save/load
│   ├── world/
│   │   ├── World.js         # Tile grid, generation, queries
│   │   ├── TileTypes.js     # Tile definitions
│   │   ├── WorldGen.js      # Procedural generation algorithms
│   │   └── Chunk.js         # (Optional) chunk-based loading for huge worlds
│   ├── entities/
│   │   ├── Player.js        # Rig movement, physics, state
│   │   ├── Particle.js      # Particle system for effects
│   │   └── Explosion.js     # Explosion logic and animation
│   ├── ui/
│   │   ├── HUD.js           # In-game overlay (fuel, cargo, depth)
│   │   ├── Shop.js          # Upgrade shop interface
│   │   ├── Menu.js          # Main menu, pause menu
│   │   └── TouchControls.js # Mobile joystick/buttons
│   ├── systems/
│   │   ├── Physics.js       # Gravity, collision detection
│   │   ├── Drilling.js      # Drill mechanics, progress tracking
│   │   ├── Economy.js       # Money, pricing, upgrade costs
│   │   └── Hazards.js       # Gas chain reactions, lava damage
│   └── data/
│       ├── upgrades.json    # Upgrade definitions and costs
│       ├── ores.json        # Ore values and properties
│       └── depth-bands.json # Generation rules by depth
├── assets/
│   ├── sprites/
│   │   ├── player/
│   │   ├── tiles/
│   │   ├── ui/
│   │   └── effects/
│   ├── audio/
│   │   ├── sfx/
│   │   └── music/
│   └── fonts/
└── android/                 # Generated by Capacitor
```

### 4.2 Game Loop

```javascript
// Main game loop (fixed timestep with interpolation)
const TICK_RATE = 60;
const TICK_DURATION = 1000 / TICK_RATE;

let lastTime = 0;
let accumulator = 0;

function gameLoop(currentTime) {
  const deltaTime = currentTime - lastTime;
  lastTime = currentTime;
  accumulator += deltaTime;

  // Fixed update for physics/logic
  while (accumulator >= TICK_DURATION) {
    update(TICK_DURATION / 1000); // Update in seconds
    accumulator -= TICK_DURATION;
  }

  // Render with interpolation
  const alpha = accumulator / TICK_DURATION;
  render(alpha);

  requestAnimationFrame(gameLoop);
}
```

### 4.3 Rendering Strategy

**Canvas Setup**
- Internal resolution: 480x270 (16:9, scales up pixel-perfect)
- Scale to fit screen with `image-rendering: pixelated`
- Double buffering via offscreen canvas for complex scenes

**Camera**
- Centered on player with deadzone (slight movement before camera follows)
- Smooth lerp to target position
- Clamp to world bounds
- Shake effect system for impacts

**Tile Rendering**
- Only render tiles visible on screen + 1 tile buffer
- Cache static tile sections to offscreen canvas when possible
- Layer order: Background → Tiles → Player → Particles → UI

### 4.4 Collision & Physics

**Simple Grid Collision**
```javascript
// Player is slightly smaller than 1 tile for forgiving movement
const PLAYER_WIDTH = 0.8;  // tiles
const PLAYER_HEIGHT = 0.9; // tiles

function checkCollision(x, y, width, height) {
  const tiles = getTilesInRect(x, y, width, height);
  return tiles.some(tile => tile.solid);
}

function applyGravity(entity, dt) {
  if (!entity.grounded && !entity.flying) {
    entity.vy += GRAVITY * dt;
    entity.vy = Math.min(entity.vy, MAX_FALL_SPEED);
  }
}
```

**Movement Resolution**
- Move X first, resolve X collisions
- Move Y second, resolve Y collisions
- Prevents corner sticking

### 4.5 Drilling Mechanic

```javascript
class DrillingSystem {
  constructor(player, world) {
    this.player = player;
    this.world = world;
    this.drillProgress = 0;
    this.targetTile = null;
  }

  startDrill(tileX, tileY) {
    const tile = this.world.getTile(tileX, tileY);
    if (!tile.solid) return;
    if (tile.requiresDrill > this.player.drillLevel) return;

    this.targetTile = { x: tileX, y: tileY, type: tile };
    this.drillProgress = 0;
  }

  update(dt) {
    if (!this.targetTile) return;

    // Consume fuel while drilling
    const fuelCost = DRILL_FUEL_RATE * dt;
    if (!this.player.consumeFuel(fuelCost)) {
      this.cancelDrill();
      return;
    }

    // Progress based on drill level and tile hardness
    const drillSpeed = this.player.drillSpeed;
    const tileTime = this.targetTile.type.drillTime / drillSpeed;
    this.drillProgress += dt / tileTime;

    // Spawn particles
    spawnDrillParticles(this.targetTile.x, this.targetTile.y);

    if (this.drillProgress >= 1) {
      this.completeDrill();
    }
  }

  completeDrill() {
    const tile = this.targetTile.type;

    // Collect ore if present
    if (tile.ore && this.player.hasCargoSpace()) {
      this.player.addToCargo(tile.ore);
    }

    // Remove tile from world
    this.world.setTile(this.targetTile.x, this.targetTile.y, 'air');

    // Handle hazards
    if (tile.hazard === 'explosion') {
      triggerGasExplosion(this.targetTile.x, this.targetTile.y);
    }

    this.targetTile = null;
    this.drillProgress = 0;
  }
}
```

### 4.6 Save System

```javascript
const SaveManager = {
  save(gameState) {
    const data = {
      version: 1,
      seed: gameState.world.seed,
      player: {
        x: gameState.player.x,
        y: gameState.player.y,
        money: gameState.player.money,
        fuel: gameState.player.fuel,
        hull: gameState.player.hull,
        cargo: gameState.player.cargo,
        upgrades: gameState.player.upgrades,
      },
      world: {
        modifiedTiles: gameState.world.getModifiedTiles(), // Only save changes
      },
      stats: gameState.stats,
      timestamp: Date.now(),
    };
    localStorage.setItem('marsMiner_save', JSON.stringify(data));
  },

  load() {
    const json = localStorage.getItem('marsMiner_save');
    return json ? JSON.parse(json) : null;
  },

  hasSave() {
    return !!localStorage.getItem('marsMiner_save');
  }
};
```

---

## 5. Mobile & APK Build

### 5.1 Touch Controls

**Virtual Joystick**
- Left side of screen: Movement joystick (appears on touch)
- Tap right side: Context action (drill when over tile, thrust when in air)
- Top corners: Pause, inventory buttons

**Implementation**
```javascript
class TouchControls {
  constructor(canvas) {
    this.joystick = { active: false, x: 0, y: 0, dx: 0, dy: 0 };
    this.actionPressed = false;

    canvas.addEventListener('touchstart', this.onTouchStart.bind(this));
    canvas.addEventListener('touchmove', this.onTouchMove.bind(this));
    canvas.addEventListener('touchend', this.onTouchEnd.bind(this));
  }

  onTouchStart(e) {
    for (const touch of e.changedTouches) {
      if (touch.clientX < window.innerWidth / 2) {
        // Left side - joystick
        this.joystick.active = true;
        this.joystick.x = touch.clientX;
        this.joystick.y = touch.clientY;
      } else {
        // Right side - action
        this.actionPressed = true;
      }
    }
  }

  getInput() {
    return {
      dx: this.joystick.dx,
      dy: this.joystick.dy,
      action: this.actionPressed,
    };
  }
}
```

### 5.2 Capacitor Setup

```json
// capacitor.config.json
{
  "appId": "com.yourname.marsminer",
  "appName": "Mars Miner",
  "webDir": "dist",
  "server": {
    "androidScheme": "https"
  },
  "android": {
    "buildOptions": {
      "signingType": "apksigner"
    }
  }
}
```

**Setup Commands**
```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap init "Mars Miner" "com.yourname.marsminer"
npx cap add android
npm run build  # Build web app with Vite
npx cap sync   # Copy to Android project
```

### 5.3 GitHub Actions APK Build

```yaml
# .github/workflows/build-apk.yml
name: Build Android APK

on:
  push:
    branches: [main]
    tags: ['v*']
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build web app
        run: npm run build

      - name: Setup Java
        uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '17'

      - name: Setup Android SDK
        uses: android-actions/setup-android@v3

      - name: Sync Capacitor
        run: npx cap sync android

      - name: Build APK
        working-directory: android
        run: ./gradlew assembleDebug

      - name: Upload APK
        uses: actions/upload-artifact@v4
        with:
          name: mars-miner-apk
          path: android/app/build/outputs/apk/debug/app-debug.apk

      # For releases: sign APK and upload to GitHub Releases
      - name: Build Release APK
        if: startsWith(github.ref, 'refs/tags/')
        working-directory: android
        run: ./gradlew assembleRelease
        env:
          KEYSTORE_PASSWORD: ${{ secrets.KEYSTORE_PASSWORD }}
          KEY_ALIAS: ${{ secrets.KEY_ALIAS }}
          KEY_PASSWORD: ${{ secrets.KEY_PASSWORD }}
```

---

## 6. Implementation Phases

### Phase 1: Core Prototype (Week 1-2)
**Goal**: Playable drilling loop, no art

- [ ] Project setup (Vite, basic HTML/Canvas)
- [ ] Game loop with fixed timestep
- [ ] Tile-based world (simple procedural generation)
- [ ] Player movement (gravity, left/right, collision)
- [ ] Basic drilling mechanic (hold down to drill)
- [ ] Fuel consumption
- [ ] Placeholder colored rectangles for all visuals
- [ ] Keyboard input

**Deliverable**: Can drill down, run out of fuel, restart

### Phase 2: Game Systems (Week 2-3)
**Goal**: Complete gameplay loop

- [ ] Ore collection and cargo system
- [ ] Surface base (refuel, sell ores)
- [ ] Money and upgrade shop (3-4 upgrades)
- [ ] Hull damage and repair
- [ ] Simple hazards (gas explosions)
- [ ] Save/load system
- [ ] Basic HUD

**Deliverable**: Can mine, sell, upgrade, save progress

### Phase 3: Content & Balance (Week 3-4)
**Goal**: Satisfying progression

- [ ] Full ore variety with depth distribution
- [ ] All planned upgrades
- [ ] Lava hazards with heat mechanic
- [ ] World generation tuning
- [ ] Economy balancing pass
- [ ] Sound effects (drilling, explosion, purchase, pickup)
- [ ] Basic background music

**Deliverable**: 30-60 minute satisfying gameplay session

### Phase 4: Polish & Art (Week 4-6)
**Goal**: Beautiful pixel art presentation

- [ ] All player animations
- [ ] Tile sprites with variants
- [ ] Particle effects
- [ ] UI art and polish
- [ ] Screen shake and juice
- [ ] Title screen, menus
- [ ] Touch controls for mobile
- [ ] Capacitor integration

**Deliverable**: Release-ready web version

### Phase 5: Android Release (Week 6-7)
**Goal**: Published APK

- [ ] Touch control tuning
- [ ] Performance optimization
- [ ] GitHub Actions APK build
- [ ] Testing on multiple Android devices
- [ ] App icons and splash screen
- [ ] Play Store assets (if publishing)

---

## 7. Key Design Decisions (Avoid Scope Creep)

### What's IN
- Deep mining with resource management
- Upgrade progression
- Procedural world with depth-based content
- Beautiful pixel art
- Satisfying game feel (particles, shake, sound)
- Save system
- Mobile support

### What's OUT (for v1.0)
- Multiplayer
- Story/quests
- Multiple vehicles
- Base building
- Crafting
- Achievements
- Leaderboards
- Multiple planets

### What's MAYBE (post-launch)
- Minimap
- Teleporters at depth milestones
- Boss encounters at certain depths
- New Game+ mode
- Additional game modes

---

## 8. Art Asset Checklist

### Player Rig
- [ ] Idle animation (4 frames)
- [ ] Move left (4 frames)
- [ ] Move right (4 frames, or flip left)
- [ ] Drill down (4 frames)
- [ ] Fly up (4 frames)
- [ ] Damage overlay (2-3 states)

### Tiles (32x32 each)
- [ ] Dirt (3 variants)
- [ ] Rock (3 variants)
- [ ] Hard rock (3 variants)
- [ ] Coal ore
- [ ] Copper ore
- [ ] Iron ore
- [ ] Silver ore
- [ ] Gold ore
- [ ] Platinum ore
- [ ] Ruby ore
- [ ] Emerald ore
- [ ] Diamond ore
- [ ] Lava (4 frame animation)
- [ ] Gas pocket
- [ ] Background (2-3 depth variants)

### Surface
- [ ] Ground tiles
- [ ] Sky background
- [ ] Fuel station building
- [ ] Shop building
- [ ] Repair bay
- [ ] Landing pad

### UI
- [ ] Fuel gauge frame + fill
- [ ] Cargo slot background
- [ ] Ore icons (small, for cargo/shop)
- [ ] Money icon
- [ ] Depth meter
- [ ] Button sprites (normal, hover, pressed)
- [ ] Shop panel background
- [ ] Touch joystick graphics

### Effects
- [ ] Drill particles (4-6 sprite variants)
- [ ] Explosion animation (6-8 frames)
- [ ] Thruster flame (3 frame loop)
- [ ] Ore pickup sparkle (4 frames)
- [ ] Dust cloud (4 frames)

---

## 9. Quick Reference: Key Tuning Values

```javascript
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
};
```

---

## 10. Getting Started Commands

```bash
# Create project
mkdir mars-miner && cd mars-miner
npm init -y
npm install vite --save-dev

# Create basic structure
mkdir -p src/{core,world,entities,ui,systems,data} assets/{sprites,audio,fonts}

# Add scripts to package.json
# "dev": "vite",
# "build": "vite build",
# "preview": "vite preview"

# Start development
npm run dev
```

---

## Summary for Claude Code

**Start with Phase 1.** Build the core loop first with ugly colored rectangles. Get the drilling and movement feeling good before any art. The game loop, physics, and drilling mechanic are the foundation everything else builds on.

Focus on game feel early—even with rectangles, the drilling should feel satisfying. Add screen shake, particles, and sound effects as soon as the basic mechanics work.

Save pixel art for Phase 4 unless you have assets ready to go. The game should be fun with placeholder graphics first.

Good luck, and remember: **the original Motherload was fun because of the tension between greed and fuel management**. Every upgrade should make the player feel more powerful while tempting them to go deeper than is safe.
