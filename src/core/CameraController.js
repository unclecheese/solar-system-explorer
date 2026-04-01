import { C_AU_PER_SEC } from '../data/constants.js';

/**
 * Floating-origin first-person camera controller.
 * The Three.js camera stays at (0,0,0). The player's real position
 * is tracked in worldPosition using JS doubles for precision.
 */
export class CameraController {
  constructor(camera, canvas) {
    this.camera = camera;
    this.canvas = canvas;

    // World position in AU (double precision)
    this.worldPosition = { x: 0, y: 0, z: 0 };

    // Euler angles
    this.yaw = 0;    // horizontal rotation (radians)
    this.pitch = 0;  // vertical rotation (radians)

    // Speed multiplier (1-10x speed of light)
    this.speedMultiplier = 1;

    // Input state
    this.keys = new Set();
    this.mouseSensitivity = 0.002;
    this.isLocked = false;

    // Collision callback (set by main)
    this.enforceCollision = null;

    this._setupListeners();
  }

  _setupListeners() {
    // Pointer lock
    this.canvas.addEventListener('click', () => {
      if (!this.isLocked) {
        this.canvas.requestPointerLock();
      }
    });

    document.addEventListener('pointerlockchange', () => {
      this.isLocked = document.pointerLockElement === this.canvas;
    });

    // Mouse look
    document.addEventListener('mousemove', (e) => {
      if (!this.isLocked) return;
      this.yaw -= e.movementX * this.mouseSensitivity;
      this.pitch -= e.movementY * this.mouseSensitivity;
      this.pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, this.pitch));
    });

    // Keyboard
    document.addEventListener('keydown', (e) => {
      this.keys.add(e.code);
    });
    document.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
    });
  }

  /**
   * Get the forward direction vector based on current yaw/pitch
   */
  getForward() {
    // Three.js camera looks down -Z, so forward = -Z direction
    return {
      x: -Math.sin(this.yaw) * Math.cos(this.pitch),
      y: Math.sin(this.pitch),
      z: -Math.cos(this.yaw) * Math.cos(this.pitch),
    };
  }

  /**
   * Get the right direction vector
   */
  getRight() {
    return {
      x: -Math.cos(this.yaw),
      y: 0,
      z: Math.sin(this.yaw),
    };
  }

  update(dt) {
    if (!this.isLocked) return;

    // Compute movement direction
    const forward = this.getForward();
    const right = this.getRight();

    let moveX = 0, moveY = 0, moveZ = 0;

    if (this.keys.has('KeyW')) {
      moveX += forward.x;
      moveY += forward.y;
      moveZ += forward.z;
    }
    if (this.keys.has('KeyS')) {
      moveX -= forward.x;
      moveY -= forward.y;
      moveZ -= forward.z;
    }
    if (this.keys.has('KeyA')) {
      moveX -= right.x;
      moveZ -= right.z;
    }
    if (this.keys.has('KeyD')) {
      moveX += right.x;
      moveZ += right.z;
    }
    if (this.keys.has('Space')) {
      moveY += 1;
    }
    if (this.keys.has('ShiftLeft') || this.keys.has('ShiftRight')) {
      moveY -= 1;
    }

    // Normalize
    const len = Math.sqrt(moveX * moveX + moveY * moveY + moveZ * moveZ);
    if (len > 0) {
      const speed = C_AU_PER_SEC * this.speedMultiplier * dt;
      moveX = (moveX / len) * speed;
      moveY = (moveY / len) * speed;
      moveZ = (moveZ / len) * speed;

      // Proposed position
      const proposed = {
        x: this.worldPosition.x + moveX,
        y: this.worldPosition.y + moveY,
        z: this.worldPosition.z + moveZ,
      };

      // Enforce collision bubbles
      if (this.enforceCollision) {
        const corrected = this.enforceCollision(proposed);
        this.worldPosition.x = corrected.x;
        this.worldPosition.y = corrected.y;
        this.worldPosition.z = corrected.z;
      } else {
        this.worldPosition.x = proposed.x;
        this.worldPosition.y = proposed.y;
        this.worldPosition.z = proposed.z;
      }
    }

    // Update camera rotation (camera stays at origin)
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;
  }

  /**
   * Warp to a specific position in AU
   */
  warpTo(x, y, z) {
    this.worldPosition.x = x;
    this.worldPosition.y = y;
    this.worldPosition.z = z;
  }
}
