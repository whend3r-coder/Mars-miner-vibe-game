export class TouchControls {
  constructor(canvas) {
    this.canvas = canvas;
    this.enabled = 'ontouchstart' in window;

    // Virtual joystick
    this.joystick = {
      active: false,
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
      dx: 0,
      dy: 0,
      touchId: null
    };

    // Action button (right side)
    this.actionButton = {
      active: false,
      touchId: null
    };

    // Surface interaction button
    this.surfaceButton = {
      pressed: false,
      wasPressed: false
    };
    this.surfaceButtonVisible = false;
    this.surfaceButtonCallback = null;

    // Last touch for menu interaction (in canvas coordinates)
    this.lastTouch = {
      x: 0,
      y: 0,
      justReleased: false
    };

    if (this.enabled) {
      this.setupTouchEvents();
    }
  }

  setupTouchEvents() {
    this.canvas.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
    this.canvas.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
    this.canvas.addEventListener('touchend', (e) => this.onTouchEnd(e), { passive: false });
    this.canvas.addEventListener('touchcancel', (e) => this.onTouchEnd(e), { passive: false });
  }

  onTouchStart(e) {
    e.preventDefault();

    for (const touch of e.changedTouches) {
      const rect = this.canvas.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      const screenMidpoint = rect.width / 2;

      // Check surface button first (convert internal coords to screen coords)
      if (this.surfaceButtonVisible) {
        const scaleX = rect.width / this.canvas.width;
        const scaleY = rect.height / this.canvas.height;
        const btnX = (this.canvas.width / 2 - 60) * scaleX;
        const btnY = (this.canvas.height - 35) * scaleY;
        const btnWidth = 120 * scaleX;
        const btnHeight = 30 * scaleY;

        if (x >= btnX && x <= btnX + btnWidth && y >= btnY && y <= btnY + btnHeight) {
          this.surfaceButton.pressed = true;
          if (this.surfaceButtonCallback) {
            this.surfaceButtonCallback();
          }
          continue;
        }
      }

      if (x < screenMidpoint) {
        // Left side - joystick
        if (!this.joystick.active) {
          this.joystick.active = true;
          this.joystick.touchId = touch.identifier;
          this.joystick.startX = x;
          this.joystick.startY = y;
          this.joystick.currentX = x;
          this.joystick.currentY = y;
          this.updateJoystickDirection();
        }
      } else {
        // Right side - action button
        if (!this.actionButton.active) {
          this.actionButton.active = true;
          this.actionButton.touchId = touch.identifier;
        }
      }
    }
  }

  onTouchMove(e) {
    e.preventDefault();

    for (const touch of e.changedTouches) {
      if (this.joystick.active && touch.identifier === this.joystick.touchId) {
        const rect = this.canvas.getBoundingClientRect();
        this.joystick.currentX = touch.clientX - rect.left;
        this.joystick.currentY = touch.clientY - rect.top;
        this.updateJoystickDirection();
      }
    }
  }

  onTouchEnd(e) {
    e.preventDefault();

    for (const touch of e.changedTouches) {
      // Track last touch position in canvas coordinates for menu interaction
      const rect = this.canvas.getBoundingClientRect();
      const screenX = touch.clientX - rect.left;
      const screenY = touch.clientY - rect.top;

      // Convert to canvas coordinates
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      this.lastTouch.x = screenX * scaleX;
      this.lastTouch.y = screenY * scaleY;
      this.lastTouch.justReleased = true;

      if (this.joystick.active && touch.identifier === this.joystick.touchId) {
        this.joystick.active = false;
        this.joystick.touchId = null;
        this.joystick.dx = 0;
        this.joystick.dy = 0;
      }

      if (this.actionButton.active && touch.identifier === this.actionButton.touchId) {
        this.actionButton.active = false;
        this.actionButton.touchId = null;
      }
    }
  }

  updateJoystickDirection() {
    const deltaX = this.joystick.currentX - this.joystick.startX;
    const deltaY = this.joystick.currentY - this.joystick.startY;

    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const maxDistance = 50; // pixels

    if (distance > 5) { // Dead zone
      this.joystick.dx = Math.max(-1, Math.min(1, deltaX / maxDistance));
      this.joystick.dy = Math.max(-1, Math.min(1, deltaY / maxDistance));
    } else {
      this.joystick.dx = 0;
      this.joystick.dy = 0;
    }
  }

  getHorizontal() {
    return this.joystick.dx;
  }

  getVertical() {
    return this.joystick.dy;
  }

  isActionPressed() {
    return this.actionButton.active;
  }

  isSurfaceButtonPressed() {
    return this.surfaceButton.pressed && !this.surfaceButton.wasPressed;
  }

  update() {
    this.surfaceButton.wasPressed = this.surfaceButton.pressed;
    this.surfaceButton.pressed = false;
    this.lastTouch.justReleased = false;
  }

  getLastTouch() {
    return this.lastTouch;
  }

  setSurfaceButtonVisible(visible, callback) {
    this.surfaceButtonVisible = visible;
    this.surfaceButtonCallback = callback;
  }

  render(ctx) {
    if (!this.enabled) return;

    // Get scale ratio between screen and internal canvas
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = ctx.canvas.width / rect.width;
    const scaleY = ctx.canvas.height / rect.height;

    // Draw joystick
    if (this.joystick.active) {
      ctx.save();

      const startX = this.joystick.startX * scaleX;
      const startY = this.joystick.startY * scaleY;
      const currentX = this.joystick.currentX * scaleX;
      const currentY = this.joystick.currentY * scaleY;

      // Outer circle
      ctx.beginPath();
      ctx.arc(startX, startY, 50 * scaleX, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Inner circle (stick)
      ctx.beginPath();
      ctx.arc(currentX, currentY, 25 * scaleX, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.restore();
    }

    // Draw action button indicator
    if (this.actionButton.active) {
      ctx.save();
      ctx.fillStyle = 'rgba(255, 100, 0, 0.08)';
      ctx.fillRect(ctx.canvas.width / 2, 0, ctx.canvas.width / 2, ctx.canvas.height);
      ctx.restore();
    }

    // Draw surface button
    if (this.surfaceButtonVisible) {
      ctx.save();
      const btnX = ctx.canvas.width / 2 - 60;
      const btnY = ctx.canvas.height - 35;
      const btnWidth = 120;
      const btnHeight = 30;

      ctx.fillStyle = 'rgba(255, 215, 0, 0.9)';
      ctx.fillRect(btnX, btnY, btnWidth, btnHeight);
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.strokeRect(btnX, btnY, btnWidth, btnHeight);

      ctx.fillStyle = '#000000';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('ENTER BASE', ctx.canvas.width / 2, btnY + btnHeight / 2);
      ctx.restore();
    }
  }
}
