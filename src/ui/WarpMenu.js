import { PLANETS, PLANET_COLORS } from '../data/planets.js';

/**
 * Warp Menu panel — lists all planets with distances, click to warp.
 */
export class WarpMenu {
  constructor(onWarp) {
    this.onWarp = onWarp;
    this.menuEl = document.getElementById('warp-menu');
    this.listEl = document.getElementById('warp-planet-list');
    this.backdropEl = document.getElementById('warp-backdrop');
    this.isOpen = false;

    this._buildList();

    this.backdropEl.addEventListener('click', () => this.close());
  }

  _buildList() {
    this.listEl.innerHTML = '';
    this.items = [];

    for (const planet of PLANETS) {
      const btn = document.createElement('button');
      btn.className = 'warp-item';
      if (planet.id === 'earth') btn.classList.add('active');

      btn.innerHTML = `
        <div style="display:flex;align-items:center;gap:16px;">
          <div style="width:24px;height:24px;border:1px solid ${planet.color};display:flex;align-items:center;justify-content:center;padding:2px;">
            <div style="width:100%;height:100%;background:${planet.color};opacity:0.8;${planet.isStar ? `box-shadow:0 0 10px ${planet.color}` : ''}"></div>
          </div>
          <span style="font-family:'Space Grotesk',sans-serif;font-weight:500;font-size:18px;letter-spacing:0.1em;text-transform:uppercase;">${planet.name}</span>
        </div>
        <div style="text-align:right;">
          <span class="warp-distance" style="font-family:'JetBrains Mono',monospace;font-size:14px;color:#c0c8cd;">--</span>
        </div>
      `;

      btn.addEventListener('click', () => {
        this.onWarp(planet.id);
        this.close();
      });

      this.listEl.appendChild(btn);
      this.items.push({ id: planet.id, el: btn });
    }
  }

  updateDistances(bodies, cameraWorldPos) {
    for (const item of this.items) {
      const body = bodies.find(b => b.id === item.id);
      if (!body) continue;

      const dx = body.worldPosition.x - cameraWorldPos.x;
      const dy = body.worldPosition.y - cameraWorldPos.y;
      const dz = body.worldPosition.z - cameraWorldPos.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      const distEl = item.el.querySelector('.warp-distance');
      if (distEl) {
        distEl.textContent = `${dist.toFixed(2)} AU`;
      }
    }
  }

  toggle() {
    if (this.isOpen) this.close();
    else this.open();
  }

  open() {
    this.isOpen = true;
    this.menuEl.style.display = 'flex';
    document.exitPointerLock();
  }

  close() {
    this.isOpen = false;
    this.menuEl.style.display = 'none';
  }
}
