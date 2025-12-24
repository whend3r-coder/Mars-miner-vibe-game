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

      // Check surface button first
      if (this.surfaceButtonVisible) {
        const btnX = rect.width / 2 - 60;
        const btnY = rect.height - 80;
        if (x >= btnX && x <= btnX + 120 && y >= btnY && y <= btnY + 40) {
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
  }

  setSurfaceButtonVisible(visible, callback) {
    this.surfaceButtonVisible = visible;
    this.surfaceButtonCallback = callback;
  }

  render(ctx) {
    if (!this.enabled) return;

    // Draw joystick
    if (this.joystick.active) {
      ctx.save();

      // Outer circle
      ctx.beginPath();
      ctx.arc(this.joystick.startX, this.joystick.startY, 50, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Inner circle (stick)
      ctx.beginPath();
      ctx.arc(this.joystick.currentX, this.joystick.currentY, 25, 0, Math.PI * 2);
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
      ctx.fillStyle = 'rgba(255, 100, 0, 0.3)';
      ctx.fillRect(ctx.canvas.width / 2, 0, ctx.canvas.width / 2, ctx.canvas.height);
      ctx.restore();
    }

    // Draw surface button
    if (this.surfaceButtonVisible) {
      ctx.save();
      const btnX = ctx.canvas.width / 2 - 60;
      const btnY = ctx.canvas.height - 80;

      ctx.fillStyle = 'rgba(255, 215, 0, 0.9)';
      ctx.fillRect(btnX, btnY, 120, 40);
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.strokeRect(btnX, btnY, 120, 40);

      ctx.fillStyle = '#000000';
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('ENTER BASE', ctx.canvas.width / 2, btnY + 20);
      ctx.restore();
    }
  }
}
