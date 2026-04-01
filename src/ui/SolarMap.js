import { PLANETS } from '../data/planets.js';

/**
 * Top-down 2D map of the solar system rendered to a canvas.
 * Shows planet positions, orbit paths, and the player's location.
 * Uses the ecliptic XZ plane (Three.js X and -Z = ecliptic X and Y).
 * Supports scroll-wheel zoom and drag to pan.
 */
export class SolarMap {
  constructor() {
    this.overlay = document.getElementById('map-overlay');
    this.canvas = document.getElementById('map-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.isOpen = false;

    // Zoom: AU visible from center to edge
    this.viewRadius = 35; // start showing full system
    this.minViewRadius = 0.5;
    this.maxViewRadius = 50;

    // Pan offset in AU (0,0 = sun-centered)
    this.panX = 0;
    this.panZ = 0;

    // Drag state
    this._dragging = false;
    this._lastMouse = null;
    this._scale = 1; // cached px-per-AU, set each render

    this._bindEvents();
  }

  _bindEvents() {
    this.canvas.addEventListener('wheel', (e) => {
      if (!this.isOpen) return;
      e.preventDefault();
      const factor = e.deltaY > 0 ? 1.15 : 1 / 1.15;
      this.viewRadius = Math.max(this.minViewRadius, Math.min(this.maxViewRadius, this.viewRadius * factor));
    }, { passive: false });

    this.canvas.addEventListener('mousedown', (e) => {
      if (!this.isOpen) return;
      this._dragging = true;
      this._lastMouse = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('mousemove', (e) => {
      if (!this._dragging || !this.isOpen) return;
      const dx = e.clientX - this._lastMouse.x;
      const dy = e.clientY - this._lastMouse.y;
      this._lastMouse = { x: e.clientX, y: e.clientY };
      // Convert pixel drag to AU offset
      if (this._scale > 0) {
        this.panX -= dx / this._scale;
        this.panZ += dy / this._scale;
      }
    });

    window.addEventListener('mouseup', () => {
      this._dragging = false;
      this._lastMouse = null;
    });
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
    const scale = Math.min(w, h) / 2 / this.viewRadius * 0.9;
    this._scale = scale;

    ctx.clearRect(0, 0, w, h);

    // Helper: world AU to screen px, accounting for pan
    const toScreen = (wx, wz) => ({
      sx: cx + (wx - this.panX) * scale,
      sy: cy + (wz + this.panZ) * scale,
    });

    // Draw orbit rings (circular approximation centered on sun)
    const sunScreen = toScreen(0, 0);
    for (const body of bodies) {
      if (body.data.isStar) continue;
      const dist = Math.sqrt(
        body.worldPosition.x * body.worldPosition.x +
        body.worldPosition.z * body.worldPosition.z
      );
      const r = dist * scale;
      if (r < 2) continue;

      ctx.beginPath();
      ctx.arc(sunScreen.sx, sunScreen.sy, r, 0, Math.PI * 2);
      ctx.strokeStyle = body.data.color + '25';
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }

    // Draw Sun
    ctx.beginPath();
    ctx.arc(sunScreen.sx, sunScreen.sy, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#FCB500';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(sunScreen.sx, sunScreen.sy, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#FCB50020';
    ctx.fill();

    // Draw planets
    for (const body of bodies) {
      if (body.data.isStar) continue;
      const { sx, sy } = toScreen(body.worldPosition.x, -body.worldPosition.z);

      // Skip if off-screen (with margin)
      if (sx < -40 || sx > w + 40 || sy < -40 || sy > h + 40) continue;

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
    const { sx: px, sy: py } = toScreen(cameraWorldPos.x, -cameraWorldPos.z);

    ctx.beginPath();
    ctx.arc(px, py, 6, 0, Math.PI * 2);
    ctx.strokeStyle = '#B0E5FF80';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(px, py, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = '#B0E5FF';
    ctx.fill();

    ctx.font = "bold 9px 'JetBrains Mono', monospace";
    ctx.fillStyle = '#B0E5FF';
    ctx.textAlign = 'left';
    ctx.fillText('YOU', px + 10, py + 3);

    // Scale indicator — pick a nice round AU value for the current zoom
    const idealScalePx = 80;
    const idealAU = idealScalePx / scale;
    const niceValues = [0.1, 0.25, 0.5, 1, 2, 5, 10, 20, 50];
    let scaleAU = niceValues[0];
    for (const v of niceValues) {
      if (Math.abs(v - idealAU) < Math.abs(scaleAU - idealAU)) scaleAU = v;
    }
    const scalePx = scaleAU * scale;
    const scaleY = h - 30;
    ctx.beginPath();
    ctx.moveTo(20, scaleY);
    ctx.lineTo(20 + scalePx, scaleY);
    ctx.strokeStyle = '#8ECAE640';
    ctx.lineWidth = 1;
    ctx.stroke();
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

    // Zoom hint
    ctx.font = "9px 'JetBrains Mono', monospace";
    ctx.fillStyle = '#8ECAE640';
    ctx.textAlign = 'right';
    ctx.fillText('Scroll to zoom · Drag to pan', w - 16, h - 24);
  }
}
