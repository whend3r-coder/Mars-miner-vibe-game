const SAVE_KEY = 'mars_miner_rover_save';
const SETTINGS_KEY = 'mars_miner_rover_settings';

export class SaveSystem {
  static save(data) {
    try {
      const saveString = JSON.stringify(data);
      localStorage.setItem(SAVE_KEY, saveString);
      console.log('Game saved successfully');
      return true;
    } catch (e) {
      console.error('Failed to save game:', e);
      return false;
    }
  }

  static load() {
    try {
      const saveString = localStorage.getItem(SAVE_KEY);
      if (!saveString) return null;

      const data = JSON.parse(saveString);

      // Version check
      if (data.version !== '2.0') {
        console.warn('Save version mismatch, may have compatibility issues');
      }

      return data;
    } catch (e) {
      console.error('Failed to load game:', e);
      return null;
    }
  }

  static hasSave() {
    return localStorage.getItem(SAVE_KEY) !== null;
  }

  static delete() {
    localStorage.removeItem(SAVE_KEY);
    console.log('Save deleted');
  }

  static saveSettings(settings) {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      return true;
    } catch (e) {
      console.error('Failed to save settings:', e);
      return false;
    }
  }

  static loadSettings() {
    try {
      const settingsString = localStorage.getItem(SETTINGS_KEY);
      if (!settingsString) return null;
      return JSON.parse(settingsString);
    } catch (e) {
      console.error('Failed to load settings:', e);
      return null;
    }
  }

  static exportSave() {
    const saveString = localStorage.getItem(SAVE_KEY);
    if (!saveString) return null;

    // Create downloadable file
    const blob = new Blob([saveString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `mars_miner_save_${Date.now()}.json`;
    a.click();

    URL.revokeObjectURL(url);
    return true;
  }

  static importSave(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);

          // Validate save structure
          if (!data.version || !data.worldSeed || !data.gameData) {
            reject(new Error('Invalid save file'));
            return;
          }

          localStorage.setItem(SAVE_KEY, e.target.result);
          resolve(data);
        } catch (err) {
          reject(err);
        }
      };

      reader.onerror = reject;
      reader.readAsText(file);
    });
  }
}
