import { GAME_CONFIG } from '../config/GameConfig.js';

export class LightingSystem {
  constructor(scene) {
    this.scene = scene;
    this.lightRadius = 1.0 * GAME_CONFIG.TILE_SIZE; // 1 tile radius default
    this.enabled = true;

    // Create the darkness overlay with light hole
    this.createLightingOverlay();
  }

  createLightingOverlay() {
    const screenW = GAME_CONFIG.GAME_WIDTH;
    const screenH = GAME_CONFIG.GAME_HEIGHT;

    // Canvas needs to be big enough to cover screen with light circle in center
    const canvasSize = Math.max(screenW, screenH) * 3;

    const canvas = document.createElement('canvas');
    canvas.width = canvasSize;
    canvas.height = canvasSize;
    const ctx = canvas.getContext('2d');

    const centerX = canvasSize / 2;
    const centerY = canvasSize / 2;

    // Radial gradient from transparent center to opaque darkness
    const outerRadius = canvasSize / 2;
    const brightRadius = this.lightRadius; // 1.5 tiles
    const fadeDistance = GAME_CONFIG.TILE_SIZE; // 1 tile gradient

    // Create gradient from center outward
    const gradient = ctx.createRadialGradient(
      centerX, centerY, 0,
      centerX, centerY, outerRadius
    );

    // Calculate ratios for gradient stops
    const brightEnd = brightRadius / outerRadius;
    const darkStart = (brightRadius + fadeDistance) / outerRadius;

    // Smooth gradient: bright center -> 1 tile fade -> full darkness
    gradient.addColorStop(0, 'rgba(8, 8, 18, 0)');
    gradient.addColorStop(brightEnd, 'rgba(8, 8, 18, 0)');
    gradient.addColorStop(darkStart, 'rgba(8, 8, 18, 1)');
    gradient.addColorStop(1, 'rgba(8, 8, 18, 1)');

    // Fill entire canvas with the gradient
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvasSize, canvasSize);

    // Add texture to Phaser
    if (this.scene.textures.exists('darknessOverlay')) {
      this.scene.textures.remove('darknessOverlay');
    }
    this.scene.textures.addCanvas('darknessOverlay', canvas);

    // Create the overlay sprite
    this.overlay = this.scene.add.image(screenW / 2, screenH / 2, 'darknessOverlay');
    this.overlay.setOrigin(0.5, 0.5);
    this.overlay.setScrollFactor(0); // Fixed to camera
    this.overlay.setDepth(999); // Above game, below UI
    this.overlay.setAlpha(0); // Start invisible (surface has no darkness)
  }

  update(playerX, playerY) {
    if (!this.enabled || !this.overlay) return;

    const playerTileY = Math.floor(playerY / GAME_CONFIG.TILE_SIZE);
    const depthBelowSurface = playerTileY - GAME_CONFIG.SURFACE_HEIGHT;

    // Start fading in darkness from 1 tile below surface (earlier and smoother)
    const fadeStartDepth = 1;  // Start darkness at 1 tile underground
    const fadeEndDepth = 8;    // Full darkness at 8 tiles underground

    if (depthBelowSurface <= 0) {
      // On or above surface - fade out darkness
      const currentAlpha = this.overlay.alpha;
      const newAlpha = currentAlpha * 0.85;
      this.overlay.setAlpha(newAlpha < 0.01 ? 0 : newAlpha);
    } else {
      // Underground - gradually increase darkness
      const fadeProgress = (depthBelowSurface - fadeStartDepth) / (fadeEndDepth - fadeStartDepth);
      const targetAlpha = Math.max(0, Math.min(1, fadeProgress));

      // Smoother transition
      const currentAlpha = this.overlay.alpha;
      const newAlpha = currentAlpha + (targetAlpha - currentAlpha) * 0.08;
      this.overlay.setAlpha(newAlpha);
    }

    this.overlay.setPosition(GAME_CONFIG.GAME_WIDTH / 2, GAME_CONFIG.GAME_HEIGHT / 2);
  }

  setLightRadius(tiles) {
    this.lightRadius = tiles * GAME_CONFIG.TILE_SIZE;
    if (this.overlay) {
      this.overlay.destroy();
    }
    this.createLightingOverlay();
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (this.overlay) {
      this.overlay.setVisible(enabled);
    }
  }

  destroy() {
    if (this.overlay) {
      this.overlay.destroy();
    }
  }
}
