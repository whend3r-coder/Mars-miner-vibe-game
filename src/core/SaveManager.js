export class SaveManager {
  static SAVE_KEY = 'marsMiner_save';
  static VERSION = 1;

  static save(game) {
    try {
      const data = {
        version: this.VERSION,
        seed: game.world.seed,
        player: {
          x: game.player.x,
          y: game.player.y,
          money: game.player.money,
          fuel: game.player.fuel,
          maxFuel: game.player.maxFuel,
          hull: game.player.hull,
          maxHull: game.player.maxHull,
          cargo: game.player.cargo,
          maxCargo: game.player.maxCargo,
          drillSpeed: game.player.drillSpeed,
          drillPower: game.player.drillPower,
        },
        economy: {
          upgrades: game.economy.upgrades,
        },
        world: {
          // Save modified tiles (tiles that have been drilled)
          modifiedTiles: game.world.getModifiedTiles(),
        },
        timestamp: Date.now(),
      };

      localStorage.setItem(this.SAVE_KEY, JSON.stringify(data));
      console.log('Game saved successfully!');
      return true;
    } catch (error) {
      console.error('Failed to save game:', error);
      return false;
    }
  }

  static load() {
    try {
      const json = localStorage.getItem(this.SAVE_KEY);
      if (!json) return null;

      const data = JSON.parse(json);

      // Version check
      if (data.version !== this.VERSION) {
        console.warn('Save file version mismatch');
        return null;
      }

      return data;
    } catch (error) {
      console.error('Failed to load game:', error);
      return null;
    }
  }

  static hasSave() {
    return !!localStorage.getItem(this.SAVE_KEY);
  }

  static deleteSave() {
    try {
      localStorage.removeItem(this.SAVE_KEY);
      console.log('Save file deleted');
      return true;
    } catch (error) {
      console.error('Failed to delete save:', error);
      return false;
    }
  }

  static applySaveData(game, saveData) {
    // Restore player state
    game.player.x = saveData.player.x;
    game.player.y = saveData.player.y;
    game.player.money = saveData.player.money;
    game.player.fuel = saveData.player.fuel;
    game.player.maxFuel = saveData.player.maxFuel;
    game.player.hull = saveData.player.hull;
    game.player.maxHull = saveData.player.maxHull;
    game.player.cargo = saveData.player.cargo;
    game.player.maxCargo = saveData.player.maxCargo;
    game.player.drillSpeed = saveData.player.drillSpeed;
    game.player.drillPower = saveData.player.drillPower;

    // Restore economy/upgrades
    game.economy.upgrades = saveData.economy.upgrades;

    // Restore world modifications
    if (saveData.world && saveData.world.modifiedTiles) {
      game.world.applyModifiedTiles(saveData.world.modifiedTiles);
    }

    console.log('Save data loaded successfully!');
  }
}
