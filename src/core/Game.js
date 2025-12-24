import { CONFIG } from '../config.js';
import { Input } from './Input.js';
import { Renderer } from './Renderer.js';
import { TouchControls } from './TouchControls.js';
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
    this.surfaceBase = new SurfaceBase(this.player, this.economy);

    // Game loop
    this.running = false;
    this.lastTime = 0;
    this.accumulator = 0;

    // Fixed timestep
    this.TICK_RATE = 60;
    this.TICK_DURATION = 1000 / this.TICK_RATE;
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

  // Save/Load methods (for future)
  save() {
    const saveData = {
      version: 1,
      seed: this.world.seed,
      player: {
        x: this.player.x,
        y: this.player.y,
        fuel: this.player.fuel,
        hull: this.player.hull,
        cargo: this.player.cargo,
        money: this.player.money,
        drillLevel: this.player.drillLevel,
        maxFuel: this.player.maxFuel,
        maxHull: this.player.maxHull,
        maxCargo: this.player.maxCargo,
      },
      world: {
        modifiedTiles: this.world.getModifiedTiles(),
      },
    };

    localStorage.setItem('marsMiner_save', JSON.stringify(saveData));
    console.log('Game saved!');
  }

  load() {
    const saveJson = localStorage.getItem('marsMiner_save');
    if (!saveJson) {
      console.log('No save data found');
      return false;
    }

    try {
      const saveData = JSON.parse(saveJson);

      // Recreate world with same seed
      this.world = new World(saveData.seed);
      this.world.applyModifiedTiles(saveData.world.modifiedTiles);

      // Restore player state
      this.player.x = saveData.player.x;
      this.player.y = saveData.player.y;
      this.player.fuel = saveData.player.fuel;
      this.player.hull = saveData.player.hull;
      this.player.cargo = saveData.player.cargo;
      this.player.money = saveData.player.money;
      this.player.drillLevel = saveData.player.drillLevel;
      this.player.maxFuel = saveData.player.maxFuel;
      this.player.maxHull = saveData.player.maxHull;
      this.player.maxCargo = saveData.player.maxCargo;

      // Recreate drilling system
      this.drillingSystem = new DrillingSystem(this.player, this.world);

      console.log('Game loaded!');
      return true;
    } catch (error) {
      console.error('Failed to load save:', error);
      return false;
    }
  }
}
