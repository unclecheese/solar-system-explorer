import { PLANETS } from '../data/planets.js';

/**
 * Top-down 2D map of the solar system rendered to a canvas.
 * Shows planet positions, orbit paths, and the player's location.
 * Uses the ecliptic XZ plane (Three.js X and -Z = ecliptic X and Y).
 */
export class SolarMap {
  constructor() {
    this.overlay = document.getElementById('map-overlay');
    this.canvas = document.getElementById('map-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.isOpen = false;

    // Map will auto-scale to fit Neptune's orbit
    this.maxAU = 35; // slightly beyond Neptune
  }

  toggle() {
    if (this.isOpen) this.close();
    else this.open();
  }

  open() {
    this.isOpen = true;
    this.overlay.style.display = 'flex';
  }

  close() {
    this.isOpen = false;
    this.overlay.style.display = 'none';
  }

  /**
   * Render the map.
   * @param {Array} bodies - solar system bodies with worldPosition
   * @param {Object} cameraWorldPos - player position { x, y, z }
   */
  render(bodies, cameraWorldPos) {
    if (!this.isOpen) return;

    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    const ctx = this.ctx;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const w = rect.width;
    const h = rect.height;
    const cx = w / 2;
    const cy = h / 2;
    const scale = Math.min(w, h) / 2 / this.maxAU * 0.9; // px per AU

    ctx.clearRect(0, 0, w, h);

    // Helper: world AU to screen px (top-down: X = ecliptic X, Z = ecliptic -Y)
    const toScreen = (wx, wz) => ({
      sx: cx + wx * scale,
      sy: cy - (-wz) * scale, // -Z in Three.js = +Y in ecliptic
    });

    // Draw orbit rings
    for (const body of bodies) {
      if (body.data.isStar) continue;
      const dist = Math.sqrt(
        body.worldPosition.x * body.worldPosition.x +
        body.worldPosition.z * body.worldPosition.z
      );
      const r = dist * scale;
      if (r < 2) continue;

      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = body.data.color + '25'; // very transparent
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }

    // Draw Sun at center
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#FCB500';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#FCB50020';
    ctx.fill();

    // Draw planets
    for (const body of bodies) {
      if (body.data.isStar) continue;
      const { sx, sy } = toScreen(body.worldPosition.x, body.worldPosition.z);

      // Dot
      const dotSize = body.data.radiusKM > 20000 ? 3.5 : 2.5;
      ctx.beginPath();
      ctx.arc(sx, sy, dotSize, 0, Math.PI * 2);
      ctx.fillStyle = body.data.color;
      ctx.fill();

      // Label
      ctx.font = "9px 'JetBrains Mono', monospace";
      ctx.fillStyle = body.data.color + 'cc';
      ctx.textAlign = 'left';
      ctx.fillText(body.data.name.toUpperCase(), sx + dotSize + 4, sy + 3);
    }

    // Draw player position
    const { sx: px, sy: py } = toScreen(cameraWorldPos.x, cameraWorldPos.z);

    // Pulsing ring
    ctx.beginPath();
    ctx.arc(px, py, 6, 0, Math.PI * 2);
    ctx.strokeStyle = '#B0E5FF80';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Solid dot
    ctx.beginPath();
    ctx.arc(px, py, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = '#B0E5FF';
    ctx.fill();

    // Label
    ctx.font = "bold 9px 'JetBrains Mono', monospace";
    ctx.fillStyle = '#B0E5FF';
    ctx.textAlign = 'left';
    ctx.fillText('YOU', px + 10, py + 3);

    // Scale indicator
    const scaleAU = 5;
    const scalePx = scaleAU * scale;
    const scaleY = h - 30;
    ctx.beginPath();
    ctx.moveTo(20, scaleY);
    ctx.lineTo(20 + scalePx, scaleY);
    ctx.strokeStyle = '#8ECAE640';
    ctx.lineWidth = 1;
    ctx.stroke();
    // Ticks
    ctx.beginPath();
    ctx.moveTo(20, scaleY - 3);
    ctx.lineTo(20, scaleY + 3);
    ctx.moveTo(20 + scalePx, scaleY - 3);
    ctx.lineTo(20 + scalePx, scaleY + 3);
    ctx.stroke();
    ctx.font = "9px 'JetBrains Mono', monospace";
    ctx.fillStyle = '#8ECAE660';
    ctx.textAlign = 'center';
    ctx.fillText(`${scaleAU} AU`, 20 + scalePx / 2, scaleY + 14);
  }
}
