import { CONFIG } from '../config.js';

export class Player {
  constructor(x, y) {
    // Position (in tiles)
    this.x = x;
    this.y = y;

    // Velocity (in tiles/second)
    this.vx = 0;
    this.vy = 0;

    // Size (in tiles)
    this.width = 0.8;
    this.height = 0.9;

    // Resources
    this.fuel = CONFIG.STARTING_FUEL;
    this.maxFuel = CONFIG.STARTING_FUEL;
    this.hull = CONFIG.STARTING_HULL;
    this.maxHull = CONFIG.STARTING_HULL;
    this.cargo = [];
    this.maxCargo = CONFIG.STARTING_CARGO;
    this.money = 0;

    // Upgrades
    this.drillLevel = 1;
    this.drillSpeed = 1.0;

    // State
    this.grounded = false;
    this.flying = false;
    this.drilling = false;
  }

  update(dt, input, world) {
    // Handle movement
    const horizontal = input.getHorizontal();
    const isDrillingDown = input.isDrilling();
    const isThrusting = input.isFlying();

    // Horizontal movement
    if (horizontal !== 0) {
      this.vx = horizontal * CONFIG.MOVE_SPEED;
      this.consumeFuel(CONFIG.FUEL_MOVE * dt);
    } else {
      this.vx = 0;
    }

    // Vertical movement - Flying
    if (isThrusting) {
      this.flying = true;
      this.vy = -CONFIG.FLY_SPEED;
      this.consumeFuel(CONFIG.FUEL_FLY * dt);
    } else {
      this.flying = false;
    }

    // Apply gravity when not flying
    if (!this.flying && !this.grounded) {
      this.vy += CONFIG.GRAVITY * dt;
      this.vy = Math.min(this.vy, CONFIG.MAX_FALL_SPEED);
    }

    // Apply movement with collision
    this.moveX(dt, world);
    this.moveY(dt, world);

    // Check if grounded
    this.grounded = world.isSolid(this.x, this.y + this.height + 0.01) ||
                    world.isSolid(this.x + this.width, this.y + this.height + 0.01);

    // Stop falling if grounded
    if (this.grounded && this.vy > 0) {
      this.vy = 0;
    }
  }

  moveX(dt, world) {
    const newX = this.x + this.vx * dt;

    // Check left edge
    if (this.vx < 0) {
      if (!world.isSolid(newX, this.y) && !world.isSolid(newX, this.y + this.height - 0.1)) {
        this.x = newX;
      } else {
        this.x = Math.ceil(newX);
        this.vx = 0;
      }
    }
    // Check right edge
    else if (this.vx > 0) {
      if (!world.isSolid(newX + this.width, this.y) && !world.isSolid(newX + this.width, this.y + this.height - 0.1)) {
        this.x = newX;
      } else {
        this.x = Math.floor(newX + this.width) - this.width;
        this.vx = 0;
      }
    }

    // Clamp to world bounds
    this.x = Math.max(0, Math.min(this.x, CONFIG.WORLD_WIDTH - this.width));
  }

  moveY(dt, world) {
    const newY = this.y + this.vy * dt;

    // Check top
    if (this.vy < 0) {
      if (!world.isSolid(this.x, newY) && !world.isSolid(this.x + this.width - 0.1, newY)) {
        this.y = newY;
      } else {
        this.y = Math.ceil(newY);
        this.vy = 0;
      }
    }
    // Check bottom
    else if (this.vy > 0) {
      if (!world.isSolid(this.x, newY + this.height) && !world.isSolid(this.x + this.width - 0.1, newY + this.height)) {
        this.y = newY;
      } else {
        this.y = Math.floor(newY + this.height) - this.height;
        this.vy = 0;
        this.grounded = true;
      }
    }

    // Clamp to world bounds
    this.y = Math.max(0, Math.min(this.y, CONFIG.WORLD_DEPTH - this.height));
  }

  consumeFuel(amount) {
    this.fuel = Math.max(0, this.fuel - amount);
    return this.fuel > 0;
  }

  addFuel(amount) {
    this.fuel = Math.min(this.maxFuel, this.fuel + amount);
  }

  takeDamage(amount) {
    this.hull = Math.max(0, this.hull - amount);
    return this.hull > 0;
  }

  repair(amount) {
    this.hull = Math.min(this.maxHull, this.hull + amount);
  }

  hasCargoSpace() {
    return this.cargo.length < this.maxCargo;
  }

  addToCargo(ore) {
    if (this.hasCargoSpace()) {
      this.cargo.push(ore);
      return true;
    }
    return false;
  }

  clearCargo() {
    this.cargo = [];
  }

  getCenterX() {
    return this.x + this.width / 2;
  }

  getCenterY() {
    return this.y + this.height / 2;
  }
}
