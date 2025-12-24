# Mars Miner

A Motherload-inspired 2D mining game with pixel art aesthetics, built with vanilla JavaScript and HTML5 Canvas.

## 🎮 Game Description

Drill deep into Mars, manage limited resources, collect valuable ores, and upgrade your mining rig. Features satisfying core gameplay loop with procedurally generated underground worlds.

## ✨ Features (Phase 1 Complete)

- **Procedural World Generation**: 100-tile wide × 2000-tile deep Mars underground with depth-based ore distribution
- **Physics-Based Movement**: Gravity, collision detection, and smooth player controls
- **Drilling Mechanic**: Mine through dirt, rock, and hard rock to collect ores
- **Resource Management**: Fuel consumption system with different costs for movement, drilling, and flying
- **Multiple Ore Types**: Coal, Copper, Iron, Silver, Gold, Platinum, Ruby, Emerald, Diamond
- **HUD System**: Real-time display of fuel, hull, cargo, money, and depth
- **Save/Load System**: Persistent game state using localStorage
- **Camera System**: Smooth camera following with lerp

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Android Build

```bash
# Sync web app with Android project
npm run android:sync

# Open in Android Studio (if installed)
npm run android:open

# Build APK (requires Android SDK)
npm run android:build
```

📱 **See [ANDROID_BUILD.md](./ANDROID_BUILD.md) for detailed Android build instructions and troubleshooting.**

## 🎯 Controls

- **Arrow Keys** or **WASD**: Move left/right, drill down, fly up
- **Down/S**: Drill through solid tiles below you
- **Up/W**: Activate thrusters to fly upward (consumes fuel rapidly)

## 🛠️ Debug Commands

Open browser console and use these commands:

```javascript
// Save game
game.save()

// Load saved game
game.load()

// Refill fuel
game.player.fuel = 100

// Add money
game.player.money += 1000

// Teleport to depth
game.player.y = 100
```

## 📋 Implementation Status

### ✅ Phase 1: Core Prototype (COMPLETE)
- [x] Project setup with Vite
- [x] Game loop with fixed timestep
- [x] Tile-based world with procedural generation
- [x] Player movement (gravity, left/right, collision)
- [x] Basic drilling mechanic
- [x] Fuel consumption
- [x] Placeholder colored rectangles for visuals
- [x] Keyboard input

### 🔄 Phase 2: Game Systems (TODO)
- [ ] Ore collection and cargo system
- [ ] Surface base (refuel, sell ores)
- [ ] Money and upgrade shop
- [ ] Hull damage and repair
- [ ] Hazards (gas explosions, lava)
- [ ] Enhanced save/load system

### 📅 Future Phases
- Phase 3: Content & Balance
- Phase 4: Polish & Pixel Art
- Phase 5: Android/Mobile Release

## 🏗️ Project Structure

```
mars-miner/
├── index.html              # Main HTML file
├── package.json            # Dependencies and scripts
├── vite.config.js          # Vite configuration
├── src/
│   ├── main.js            # Entry point
│   ├── config.js          # Game configuration
│   ├── core/
│   │   ├── Game.js        # Main game class
│   │   ├── Input.js       # Input handling
│   │   └── Renderer.js    # Canvas rendering
│   ├── world/
│   │   ├── World.js       # World management
│   │   ├── WorldGen.js    # Procedural generation
│   │   └── TileTypes.js   # Tile definitions
│   ├── entities/
│   │   └── Player.js      # Player rig
│   └── systems/
│       └── Drilling.js    # Drilling mechanics
└── mars-miner-plan.md     # Complete design document
```

## 🎨 Tech Stack

- **Runtime**: Vanilla JavaScript + HTML5 Canvas
- **Build Tool**: Vite
- **Mobile**: Capacitor (Android project configured)
- **Platforms**: Web, Android (iOS ready to add)

## 📖 Design Document

See [mars-miner-plan.md](./mars-miner-plan.md) for the complete game design and implementation plan.

## 🤝 Contributing

This is a learning/development project. Feel free to fork and experiment!

## 📄 License

MIT