/**
 * Xbox Controller input handler using the Gamepad API
 */

export class ControllerInput {
  constructor() {
    this.leftStick = { x: 0, y: 0 };
    this.rightStick = { x: 0, y: 0 };
    this.buttons = {};
    this.triggers = { left: 0, right: 0 };
    this.connected = false;
    this.gamepadIndex = null;

    // Button mapping for Xbox controller
    this.buttonMap = {
      0: 'A',
      1: 'B',
      2: 'X',
      3: 'Y',
      4: 'LB',
      5: 'RB',
      6: 'LT',
      7: 'RT',
      8: 'Back',
      9: 'Start',
      10: 'LeftStick',
      11: 'RightStick',
      12: 'Guide',
    };

    // Setup event listeners
    window.addEventListener('gamepadconnected', (e) => this.onGamepadConnected(e));
    window.addEventListener('gamepaddisconnected', (e) => this.onGamepadDisconnected(e));

    // Poll for controllers (since gamepadconnected might not always fire)
    this.pollInterval = setInterval(() => this.checkForControllers(), 500);
  }

  onGamepadConnected(event) {
    console.log('Gamepad connected:', event.gamepad.id);
    this.gamepadIndex = event.gamepad.index;
    this.connected = true;
  }

  onGamepadDisconnected(event) {
    console.log('Gamepad disconnected:', event.gamepad.id);
    if (this.gamepadIndex === event.gamepad.index) {
      this.connected = false;
      this.gamepadIndex = null;
      this.resetInput();
    }
  }

  checkForControllers() {
    const gamepads = navigator.getGamepads();
    for (let i = 0; i < gamepads.length; i++) {
      if (gamepads[i]) {
        this.gamepadIndex = i;
        this.connected = true;
        return;
      }
    }
  }

  update() {
    if (!this.connected || this.gamepadIndex === null) return;

    const gamepads = navigator.getGamepads();
    const gamepad = gamepads[this.gamepadIndex];

    if (!gamepad) {
      this.connected = false;
      this.gamepadIndex = null;
      return;
    }

    // Update analog sticks with deadzone
    const deadzone = 0.1;

    // Left stick (axes 0, 1)
    this.leftStick.x = Math.abs(gamepad.axes[0]) > deadzone ? gamepad.axes[0] : 0;
    this.leftStick.y = Math.abs(gamepad.axes[1]) > deadzone ? gamepad.axes[1] : 0;

    // Right stick (axes 2, 3)
    this.rightStick.x = Math.abs(gamepad.axes[2]) > deadzone ? gamepad.axes[2] : 0;
    this.rightStick.y = Math.abs(gamepad.axes[3]) > deadzone ? gamepad.axes[3] : 0;

    // Update buttons
    gamepad.buttons.forEach((button, index) => {
      const buttonName = this.buttonMap[index] || `Button${index}`;
      this.buttons[buttonName] = button.pressed;
    });

    // Update triggers (axes 4, 5 on some controllers, buttons on others)
    if (gamepad.buttons[6]) {
      this.triggers.left = gamepad.buttons[6].value;
    } else {
      this.triggers.left = (gamepad.axes[4] + 1) / 2; // Normalize from [-1, 1] to [0, 1]
    }

    if (gamepad.buttons[7]) {
      this.triggers.right = gamepad.buttons[7].value;
    } else {
      this.triggers.right = (gamepad.axes[5] + 1) / 2;
    }
  }

  resetInput() {
    this.leftStick = { x: 0, y: 0 };
    this.rightStick = { x: 0, y: 0 };
    this.buttons = {};
    this.triggers = { left: 0, right: 0 };
  }

  isPressed(buttonName) {
    return this.buttons[buttonName] === true;
  }

  destroy() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
  }
}
