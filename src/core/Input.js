export class Input {
  constructor() {
    this.keys = {};
    this.keysPressed = {}; // For single-press detection
    this.keysReleased = {}; // For release detection

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
    if (this.isKeyDown('ArrowLeft') || this.isKeyDown('KeyA')) h -= 1;
    if (this.isKeyDown('ArrowRight') || this.isKeyDown('KeyD')) h += 1;
    return h;
  }

  getVertical() {
    let v = 0;
    if (this.isKeyDown('ArrowUp') || this.isKeyDown('KeyW')) v -= 1;
    if (this.isKeyDown('ArrowDown') || this.isKeyDown('KeyS')) v += 1;
    return v;
  }

  isDrilling() {
    return this.isKeyDown('ArrowDown') || this.isKeyDown('KeyS');
  }

  isFlying() {
    return this.isKeyDown('ArrowUp') || this.isKeyDown('KeyW');
  }
}
