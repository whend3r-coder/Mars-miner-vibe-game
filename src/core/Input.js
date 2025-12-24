export class Input {
  constructor(touchControls = null) {
    this.keys = {};
    this.keysPressed = {}; // For single-press detection
    this.keysReleased = {}; // For release detection
    this.touchControls = touchControls;

    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    window.addEventListener('keyup', (e) => this.onKeyUp(e));
  }

  onKeyDown(e) {
    if (!this.keys[e.code]) {
      this.keysPressed[e.code] = true;
    }
    this.keys[e.code] = true;
  }

  onKeyUp(e) {
    this.keys[e.code] = false;
    this.keysReleased[e.code] = true;
  }

  isKeyDown(code) {
    return this.keys[code] || false;
  }

  isKeyPressed(code) {
    return this.keysPressed[code] || false;
  }

  isKeyReleased(code) {
    return this.keysReleased[code] || false;
  }

  // Call this at the end of each frame
  update() {
    this.keysPressed = {};
    this.keysReleased = {};
  }

  // Movement helpers
  getHorizontal() {
    let h = 0;

    // Keyboard input
    if (this.isKeyDown('ArrowLeft') || this.isKeyDown('KeyA')) h -= 1;
    if (this.isKeyDown('ArrowRight') || this.isKeyDown('KeyD')) h += 1;

    // Touch input
    if (this.touchControls) {
      h += this.touchControls.getHorizontal();
    }

    return Math.max(-1, Math.min(1, h));
  }

  getVertical() {
    let v = 0;

    // Keyboard input
    if (this.isKeyDown('ArrowUp') || this.isKeyDown('KeyW')) v -= 1;
    if (this.isKeyDown('ArrowDown') || this.isKeyDown('KeyS')) v += 1;

    // Touch input
    if (this.touchControls) {
      v += this.touchControls.getVertical();
    }

    return Math.max(-1, Math.min(1, v));
  }

  isDrilling() {
    const keyboardDrill = this.isKeyDown('ArrowDown') || this.isKeyDown('KeyS');
    const touchDrill = this.touchControls && this.touchControls.getVertical() > 0.3;
    const touchAction = this.touchControls && this.touchControls.isActionPressed();

    return keyboardDrill || touchDrill || touchAction;
  }

  isFlying() {
    const keyboardFly = this.isKeyDown('ArrowUp') || this.isKeyDown('KeyW');
    const touchFly = this.touchControls && this.touchControls.getVertical() < -0.3;

    return keyboardFly || touchFly;
  }
}
