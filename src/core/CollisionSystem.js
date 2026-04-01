/**
 * Handles speed limiting and hard collision around celestial bodies.
 *
 * Speed limit is proportional to distance from the targeted body:
 *   effective_speed = min(requested_speed, distance * DECEL_K)
 *
 * With DECEL_K = 200:
 *   0.25 AU → max 50x c (full speed)
 *   0.05 AU → max 10x c
 *   0.01 AU → max 2x c
 *   0.001 AU → max 0.2x c
 *   0.0001 AU → max 0.02x c
 *
 * A minimum floor speed (0.001x c) prevents you from ever getting stuck.
 * Hard collision at surface + 500km is always enforced on all bodies.
 */

// Deceleration constant: max_speed_c = distance_AU * DECEL_K
// Tuned so that at 0.25 AU you're still at 50c (full speed cap)
export const DECEL_K = 200;

// Minimum speed floor so you never feel stuck
export const MIN_SPEED = 0.001;

/**
 * Compute the speed limit (in multiples of c) based on distance to target.
 * @param {number} distanceAU - distance from camera to target body
 * @returns {number} maximum speed in multiples of c
 */
export function computeSpeedLimit(distanceAU) {
  return Math.max(MIN_SPEED, distanceAU * DECEL_K);
}

export class CollisionSystem {
  constructor() {
    this.bodies = [];
    this.hardCollision = null;
  }

  setBodies(bodies) {
    this.bodies = bodies;
  }

  /**
   * Enforce the hard collision boundary (surface + 500km) on all bodies.
   */
  enforce(proposed) {
    let { x, y, z } = proposed;
    this.hardCollision = null;

    for (const body of this.bodies) {
      const dx = x - body.worldPosition.x;
      const dy = y - body.worldPosition.y;
      const dz = z - body.worldPosition.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (dist < body.minDistanceAU && dist > 0) {
        const scale = body.minDistanceAU / dist;
        x = body.worldPosition.x + dx * scale;
        y = body.worldPosition.y + dy * scale;
        z = body.worldPosition.z + dz * scale;
        this.hardCollision = body.id;
      }
    }

    return { x, y, z };
  }
}
