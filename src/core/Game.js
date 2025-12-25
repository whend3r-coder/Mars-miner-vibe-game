import { CONFIG } from '../config.js';
import { Input } from './Input.js';
import { Renderer } from './Renderer.js';
import { TouchControls } from './TouchControls.js';
import { SaveManager } from './SaveManager.js';
import { World } from '../world/World.js';
import { Player } from '../entities/Player.js';
import { DrillingSystem } from '../systems/Drilling.js';
import { Economy } from '../systems/Economy.js';
import { SurfaceBase } from '../systems/SurfaceBase.js';
import { Hazards } from '../systems/Hazards.js';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;

    // Core systems
    this.touchControls = new TouchControls(canvas);
    this.input = new Input(this.touchControls);
    this.renderer = new Renderer(canvas);

    // Game state
    this.world = new World();
    this.player = new Player(CONFIG.WORLD_WIDTH / 2, 2); // Start at center, near surface
    this.hazards = new Hazards(this.world, this.player);
    this.drillingSystem = new DrillingSystem(this.player, this.world, this.hazards);
    this.economy = new Economy(this.player);
    this.surfaceBase = new SurfaceBase(this.player, this.economy, this);
    this.surfaceBase.setRenderer(this.renderer); // For debug overlay

    // Game loop
    this.running = false;
    this.lastTime = 0;
    this.accumulator = 0;

    // Fixed timestep
    this.TICK_RATE = 60;
    this.TICK_DURATION = 1000 / this.TICK_RATE;

    // Track last surface state for auto-save
    this.wasAtSurface = false;

    // Try to load save on startup
    this.loadGame();
  }

  start() {
    this.running = true;
    this.lastTime = performance.now();
    requestAnimationFrame((time) => this.gameLoop(time));
  }

  stop() {
    this.running = false;
  }

  gameLoop(currentTime) {
    if (!this.running) return;

    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;
    this.accumulator += deltaTime;

    // Fixed update for physics/logic
    while (this.accumulator >= this.TICK_DURATION) {
      this.update(this.TICK_DURATION / 1000); // Update in seconds
      this.accumulator -= this.TICK_DURATION;
    }

    // Render
    this.render();

    requestAnimationFrame((time) => this.gameLoop(time));
  }

  update(dt) {
    // Update touch controls
    this.touchControls.update();

    // Update surface base (handles menu interactions)
    this.surfaceBase.update(this.input, this.touchControls);

    // Only update player and drilling when menu is not open
    if (!this.surfaceBase.showMenu) {
      // Update player
      this.player.update(dt, this.input, this.world);

      // Update drilling system
      this.drillingSystem.update(dt, this.input);

      // Update hazards (lava damage, etc)
      this.hazards.update(dt);
    }

    // Update input state (clear pressed/released keys)
    this.input.update();

    // Auto-save when returning to surface
    const atSurface = this.surfaceBase.isAtSurface();
    if (atSurface && !this.wasAtSurface) {
      this.saveGame();
    }
    this.wasAtSurface = atSurface;

    // Check game over conditions
    if (this.player.fuel <= 0) {
      console.log('Out of fuel! Game Over');
      // TODO: Implement rescue or game over screen
    }

    if (this.player.hull <= 0) {
      console.log('Hull destroyed! Game Over');
      // TODO: Implement game over screen
    }
  }

  render() {
    // Update camera
    this.renderer.updateCamera(this.player);

    // Render world, player, HUD, touch controls, and surface base menu
    this.renderer.render(
      this.world,
      this.player,
      this.drillingSystem,
      this.touchControls,
      this.surfaceBase
    );
  }

  // Save/Load methods
  saveGame() {
    return SaveManager.save(this);
  }

  loadGame() {
    const saveData = SaveManager.load();
    if (saveData) {
      // Recreate world with same seed
      this.world = new World(saveData.seed);

      // Apply save data
      SaveManager.applySaveData(this, saveData);

      // Recreate systems with loaded state
      this.hazards = new Hazards(this.world, this.player);
      this.drillingSystem = new DrillingSystem(this.player, this.world, this.hazards);

      return true;
    }
    return false;
  }

  deleteSave() {
    return SaveManager.deleteSave();
  }

  hasSave() {
    return SaveManager.hasSave();
  }
}
