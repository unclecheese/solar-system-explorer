import * as THREE from 'three';
import { AU_TO_LIGHT_MIN } from '../data/constants.js';

/**
 * Projects planet positions to screen and renders navigation arrows
 * at screen edges for off-screen planets, or floating labels for on-screen ones.
 */
export class NavigationArrows {
  constructor(camera, container, onWarp) {
    this.camera = camera;
    this.container = container;
    this.onWarp = onWarp;
    this.elements = new Map(); // planetId -> DOM element
  }

  update(bodies, cameraWorldPos) {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const margin = 60;

    // Track which IDs are still active
    const activeIds = new Set();

    for (const body of bodies) {
      activeIds.add(body.id);

      // Relative position in AU
      const rx = body.worldPosition.x - cameraWorldPos.x;
      const ry = body.worldPosition.y - cameraWorldPos.y;
      const rz = body.worldPosition.z - cameraWorldPos.z;
      const dist = Math.sqrt(rx * rx + ry * ry + rz * rz);

      // Project to NDC
      const vec = new THREE.Vector3(rx, ry, rz);
      vec.project(this.camera);

      const screenX = (vec.x * 0.5 + 0.5) * w;
      const screenY = (-vec.y * 0.5 + 0.5) * h;

      // Is it behind the camera?
      const behind = vec.z > 1;

      // Format distance
      const distStr = dist < 0.01
        ? `${(dist * 149597870.7).toFixed(0)} km`
        : `${dist.toFixed(2)} AU`;

      // Get or create element
      let el = this.elements.get(body.id);
      if (!el) {
        el = this._createElement(body);
        this.elements.set(body.id, el);
        this.container.appendChild(el);
      }

      const isOnScreen = !behind && screenX > margin && screenX < w - margin &&
                          screenY > margin && screenY < h - margin;

      if (isOnScreen) {
        // Show as floating label near the planet
        this._renderAsLabel(el, body, screenX, screenY, dist, distStr);
      } else {
        // Show as edge arrow
        this._renderAsArrow(el, body, screenX, screenY, behind, w, h, margin, dist, distStr);
      }
    }

    // Remove stale elements
    for (const [id, el] of this.elements) {
      if (!activeIds.has(id)) {
        el.remove();
        this.elements.delete(id);
      }
    }
  }

  _createElement(body) {
    const el = document.createElement('div');
    el.style.position = 'absolute';
    el.style.pointerEvents = 'auto';
    el.style.cursor = 'pointer';
    el.style.fontFamily = "'JetBrains Mono', monospace";
    el.style.transition = 'opacity 0.2s, left 0.1s, top 0.1s';
    el.style.zIndex = '5';
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      this.onWarp(body.id);
    });
    return el;
  }

  _renderAsLabel(el, body, x, y, dist, distStr) {
    // Fade based on distance: very far = subtle, close = prominent
    const opacity = Math.max(0.3, Math.min(0.9, 1 - dist / 40));

    el.className = 'planet-label';
    el.style.left = `${x}px`;
    el.style.top = `${y - 20}px`;
    el.style.opacity = opacity;
    el.style.color = body.data.color;
    el.innerHTML = `
      <div class="label-name">${body.data.name}</div>
      <div class="label-distance">${distStr}</div>
    `;
  }

  _renderAsArrow(el, body, sx, sy, behind, w, h, margin, dist, distStr) {
    // Compute edge intersection
    let ax = sx, ay = sy;
    if (behind) {
      ax = w - sx;
      ay = h - sy;
    }

    // Direction from center to projected point
    const cx = w / 2, cy = h / 2;
    let dx = ax - cx, dy = ay - cy;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > 0) { dx /= len; dy /= len; }

    // Clamp to screen edge
    const edgeX = Math.max(margin, Math.min(w - margin, cx + dx * (w / 2 - margin)));
    const edgeY = Math.max(margin, Math.min(h - margin, cy + dy * (h / 2 - margin)));

    // Arrow rotation
    const angle = Math.atan2(dy, dx);

    const opacity = Math.max(0.3, Math.min(0.7, 1 - dist / 50));

    el.className = 'nav-arrow';
    el.style.left = `${edgeX}px`;
    el.style.top = `${edgeY}px`;
    el.style.transform = 'translate(-50%, -50%)';
    el.style.opacity = opacity;
    el.style.color = body.data.color;

    // Arrow character pointing in the right direction
    const arrowChar = this._getArrowChar(angle);

    el.innerHTML = `
      <span class="arrow-icon">${arrowChar}</span>
      <span>
        <span class="arrow-label">${body.data.name}</span><br>
        <span class="arrow-distance">${distStr}</span>
      </span>
    `;
  }

  _getArrowChar(angle) {
    // 8 directional arrows
    const deg = ((angle * 180 / Math.PI) + 360) % 360;
    if (deg < 22.5 || deg >= 337.5) return '→';
    if (deg < 67.5) return '↘';
    if (deg < 112.5) return '↓';
    if (deg < 157.5) return '↙';
    if (deg < 202.5) return '←';
    if (deg < 247.5) return '↖';
    if (deg < 292.5) return '↑';
    return '↗';
  }
}
