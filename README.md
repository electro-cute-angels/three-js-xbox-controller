# Three.js Xbox Controller Demo

An interactive 3D scene built with Three.js that you can control with an Xbox controller or compatible gamepad.

## Features

- **Interactive 3D Scene**: Multiple geometric objects including a cube, torus, and orbiting spheres
- **Xbox Controller Support**: Full gamepad input with analog sticks, buttons, and triggers
- **Camera Control**: Right stick controls camera rotation around the scene
- **Object Control**: Left stick rotates the main cube
- **Button Controls**:
  - **A Button**: Scale the cube
  - **B Button**: Spin the cube
  - **X Button**: Scale the torus
  - **Y Button**: Reset cube rotation
  - **Left/Right Triggers**: Move cube along Z-axis

## Live Demo

To run the demo locally:

```bash
npm install
npm run dev
```

Then open `http://localhost:5173` in your browser.

Connect an Xbox controller or compatible gamepad and start controlling the scene!

## Requirements

- Modern browser with Gamepad API support
- Xbox controller or compatible USB/Bluetooth gamepad

## Project Structure

```
src/
├── main.js           # Three.js scene setup and animation loop
├── controller.js     # Xbox controller/Gamepad API handler
├── style.css         # Styling for the scene and UI
└── assets/          # Images and assets
```

## Building for Production

```bash
npm run build
```

The build output will be in the `dist/` directory.
