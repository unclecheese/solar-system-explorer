import './style.css';
import * as THREE from 'three';
import { CameraController } from './core/CameraController.js';
import { CollisionSystem, computeSpeedLimit } from './core/CollisionSystem.js';
import { SolarSystem } from './entities/SolarSystem.js';
import { NavigationArrows } from './ui/NavigationArrows.js';
import { WarpMenu } from './ui/WarpMenu.js';
import { SolarMap } from './ui/SolarMap.js';
import { AU_TO_LIGHT_MIN, AU_TO_KM, C_AU_PER_SEC } from './data/constants.js';
import { computePlanetPosition } from './core/OrbitalMechanics.js';
import { PLANETS } from './data/planets.js';

// ── DOM Elements ──
const canvas = document.getElementById('scene');
const hud = document.getElementById('hud');
const startScreen = document.getElementById('start-screen');
const startBtn = document.getElementById('start-btn');
const loadingBar = document.getElementById('loading-bar');
const loadingPercent = document.getElementById('loading-percent');
const speedDisplay = document.getElementById('speed-display');
const speedAuDisplay = document.getElementById('speed-au-display');
const distanceDisplay = document.getElementById('distance-display');
const lighttimeDisplay = document.getElementById('lighttime-display');
const etaDisplay = document.getElementById('eta-display');
const controlsOverlay = document.getElementById('controls-overlay');
const btnControls = document.getElementById('btn-controls');
const btnWarpMenu = document.getElementById('btn-warp-menu');
const warpTransition = document.getElementById('warp-transition');
const proximityWarning = document.getElementById('proximity-warning');
const tempKDisplay = document.getElementById('temp-k-display');
const tempCDisplay = document.getElementById('temp-c-display');
const planetDistanceList = document.getElementById('planet-distance-list');
const targetPrompt = document.getElementById('target-prompt');
const targetPromptName = document.getElementById('target-prompt-name');
const hudDestIcon = document.getElementById('hud-dest-icon');
const hudDestName = document.getElementById('hud-dest-name');
const clearDestBtn = document.getElementById('clear-dest-btn');

// ── Speed System ──
// Requested speed: what the player has set via throttle or keys.
// Effective speed: min(requested, proportional limit from target distance).
// This creates smooth automatic deceleration as you approach a planet.
const SPEED_STEPS = [1, 5, 10, 25, 50, 75, 100, 250, 500];
const SPEED_MIN = SPEED_STEPS[0];
const SPEED_MAX = SPEED_STEPS[SPEED_STEPS.length - 1];

let requestedSpeed = 1;    // what the player asked for (multiples of c)
let effectiveSpeed = 1;    // what's actually applied after distance limiting
let currentSpeedLimit = Infinity; // speed limit from target proximity
let currentStepIndex = 0;  // index into SPEED_STEPS
let wasSpeedLimited = false; // track speed-limit state transitions

// ── Renderer ──
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  logarithmicDepthBuffer: true,
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// ── Scene & Camera ──
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1e-7, 200);

// ── Loading Manager ──
const loadingManager = new THREE.LoadingManager();
let assetsLoaded = false;

loadingManager.onProgress = (url, loaded, total) => {
  const pct = Math.round((loaded / total) * 100);
  loadingBar.style.width = `${pct}%`;
  loadingPercent.textContent = `${pct}% Compiling`;
};

loadingManager.onLoad = () => {
  assetsLoaded = true;
  loadingBar.style.width = '100%';
  loadingPercent.textContent = '100% Ready';
  startBtn.textContent = 'Initiate Launch';
  startBtn.disabled = false;
};

loadingManager.onError = (url) => {
  console.warn('Failed to load:', url);
  assetsLoaded = true;
  loadingBar.style.width = '100%';
  loadingPercent.textContent = 'Ready (some textures missing)';
  startBtn.disabled = false;
};

// ── Solar System ──
const solarSystem = new SolarSystem(scene, loadingManager);

// ── Camera Controller ──
const cameraController = new CameraController(camera, canvas);

// Start near Earth
const earthPos = computePlanetPosition('earth');
cameraController.warpTo(earthPos.x + 0.001, earthPos.y + 0.0002, earthPos.z + 0.001);

// ── Collision System ──
const collisionSystem = new CollisionSystem();
cameraController.enforceCollision = (proposed) => {
  collisionSystem.setBodies(solarSystem.getCollisionBodies());
  return collisionSystem.enforce(proposed);
};

// ── Navigation Arrows ──
const navArrowsContainer = document.getElementById('nav-arrows');
const navArrows = new NavigationArrows(camera, navArrowsContainer, warpToPlanet);

// ── Warp Menu ──
const warpMenu = new WarpMenu(warpToPlanet);

// ── Solar Map ──
const solarMap = new SolarMap();

// ── Speed Management ──
function setRequestedSpeed(value) {
  requestedSpeed = Math.max(SPEED_MIN, Math.min(SPEED_MAX, Math.round(value)));
  // Sync step index to nearest step
  currentStepIndex = findNearestStepIndex(requestedSpeed);
  requestedSpeed = SPEED_STEPS[currentStepIndex];
  updateSpeedDisplay();
  updateThrottle();
}

function setSpeedByStepIndex(index) {
  currentStepIndex = Math.max(0, Math.min(SPEED_STEPS.length - 1, index));
  requestedSpeed = SPEED_STEPS[currentStepIndex];
  updateSpeedDisplay();
  updateThrottle();
}

function adjustRequestedSpeed(delta) {
  setSpeedByStepIndex(currentStepIndex + delta);
}

function findNearestStepIndex(value) {
  let best = 0;
  let bestDiff = Infinity;
  for (let i = 0; i < SPEED_STEPS.length; i++) {
    const diff = Math.abs(SPEED_STEPS[i] - value);
    if (diff < bestDiff) { bestDiff = diff; best = i; }
  }
  return best;
}

function updateSpeedDisplay() {
  // Effective speed = min of requested and distance-based limit
  effectiveSpeed = Math.min(requestedSpeed, currentSpeedLimit);

  // Light speed label
  const displaySpeed = effectiveSpeed < requestedSpeed ? effectiveSpeed : requestedSpeed;
  let label;
  if (displaySpeed < 0.05) {
    const kms = Math.round(displaySpeed * 299792);
    label = `${kms.toLocaleString()} km/s`;
  } else if (displaySpeed < 1) {
    label = `${displaySpeed.toFixed(2)}x c`;
  } else {
    label = `${Math.round(displaySpeed)}x c`;
  }
  speedDisplay.textContent = label;

  // AU per second
  const auPerSec = effectiveSpeed * C_AU_PER_SEC;
  if (auPerSec < 0.001) {
    speedAuDisplay.textContent = `${(auPerSec * 1000).toFixed(2)} mAU/s`;
  } else {
    speedAuDisplay.textContent = `${auPerSec.toFixed(3)} AU/s`;
  }

  cameraController.speedMultiplier = effectiveSpeed;
}

// ── Throttle UI ──
const throttleEl = document.getElementById('throttle');
const throttleFill = document.getElementById('throttle-fill');
const throttleHandle = document.getElementById('throttle-handle');
const throttleLimit = document.getElementById('throttle-limit');
const throttleNotches = document.getElementById('throttle-notches');
const throttleZones = document.getElementById('throttle-zones');

// Build notch labels and click zones (top = fastest, bottom = slowest)
for (let i = SPEED_STEPS.length - 1; i >= 0; i--) {
  // Notch label
  const label = document.createElement('div');
  label.className = 'throttle-notch';
  label.dataset.index = i;
  label.textContent = `${SPEED_STEPS[i]}x`;
  throttleNotches.appendChild(label);

  // Click zone
  const zone = document.createElement('div');
  zone.addEventListener('click', () => setSpeedByStepIndex(i));
  throttleZones.appendChild(zone);
}

// Drag support on the throttle track
let dragging = false;
const throttleTrack = throttleEl.querySelector('.throttle-track');

throttleTrack.addEventListener('mousedown', (e) => {
  dragging = true;
  handleThrottleDrag(e);
  e.preventDefault();
});

document.addEventListener('mousemove', (e) => {
  if (dragging) handleThrottleDrag(e);
});

document.addEventListener('mouseup', () => {
  dragging = false;
});

function handleThrottleDrag(e) {
  const rect = throttleTrack.getBoundingClientRect();
  const y = e.clientY - rect.top;
  const pct = 1 - Math.max(0, Math.min(1, y / rect.height));
  const idx = Math.round(pct * (SPEED_STEPS.length - 1));
  setSpeedByStepIndex(idx);
}

function updateThrottle() {
  const pct = (currentStepIndex / (SPEED_STEPS.length - 1)) * 100;
  throttleFill.style.height = `${pct}%`;
  throttleHandle.style.bottom = `calc(${pct}% - 4px)`;

  // Update notch highlights
  const notchEls = throttleNotches.querySelectorAll('.throttle-notch');
  notchEls.forEach(el => {
    const idx = parseInt(el.dataset.index);
    el.classList.toggle('active', idx === currentStepIndex);
  });

  // Speed limit indicator position
  const isLimited = effectiveSpeed < requestedSpeed;
  throttleEl.classList.toggle('throttle-limited', isLimited);

  if (isLimited && currentSpeedLimit < SPEED_MAX) {
    const limitIdx = findNearestStepIndex(currentSpeedLimit);
    const limitPct = (limitIdx / (SPEED_STEPS.length - 1)) * 100;
    throttleLimit.style.display = 'block';
    throttleLimit.style.bottom = `${limitPct}%`;
  } else {
    throttleLimit.style.display = 'none';
  }
}

// Initialize throttle state
updateThrottle();

// ── Target System ──
// Two concepts:
//   crosshairCandidate: planet near the crosshair (transient, for prompting)
//   lockedTarget: explicitly set by the player via right-click (persistent)
// Speed limits are based on distance to the lockedTarget only.
let crosshairCandidate = null; // { id, data, worldPosition, worldDist }
let lockedTarget = null;       // { id, data } — persistent until cleared

function findCrosshairCandidate() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const cx = w / 2;
  const cy = h / 2;
  const maxScreenDist = Math.min(w, h) * 0.25;

  let best = null;
  let bestWeight = Infinity;

  for (const body of solarSystem.bodies) {
    const rx = body.worldPosition.x - cameraController.worldPosition.x;
    const ry = body.worldPosition.y - cameraController.worldPosition.y;
    const rz = body.worldPosition.z - cameraController.worldPosition.z;

    const vec = new THREE.Vector3(rx, ry, rz);
    vec.project(camera);
    if (vec.z > 1) continue;

    const sx = (vec.x * 0.5 + 0.5) * w;
    const sy = (-vec.y * 0.5 + 0.5) * h;
    const screenDist = Math.sqrt((sx - cx) ** 2 + (sy - cy) ** 2);
    if (screenDist > maxScreenDist) continue;

    const worldDist = Math.sqrt(rx * rx + ry * ry + rz * rz);
    const weight = screenDist + (worldDist * 50);

    if (weight < bestWeight) {
      bestWeight = weight;
      best = { id: body.id, data: body.data, worldPosition: body.worldPosition, worldDist };
    }
  }

  crosshairCandidate = best;
}

function getLockedTargetDist() {
  if (!lockedTarget) return Infinity;
  const body = solarSystem.getBody(lockedTarget.id);
  if (!body) return Infinity;
  const dx = body.worldPosition.x - cameraController.worldPosition.x;
  const dy = body.worldPosition.y - cameraController.worldPosition.y;
  const dz = body.worldPosition.z - cameraController.worldPosition.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function setLockedTarget(id) {
  const body = solarSystem.getBody(id);
  if (!body) return;
  lockedTarget = { id: body.id, data: body.data };
  updateDestinationHUD();
}

function clearLockedTarget() {
  lockedTarget = null;
  updateDestinationHUD();
}

function updateDestinationHUD() {
  if (!lockedTarget) {
    hudDestName.textContent = '—';
    hudDestName.style.color = '#B0E5FF';
    hudDestIcon.style.display = 'none';
    clearDestBtn.style.display = 'none';
    distanceDisplay.textContent = '—';
    lighttimeDisplay.textContent = '—';
    etaDisplay.textContent = '—';
    return;
  }
  const dist = getLockedTargetDist();
  hudDestName.textContent = lockedTarget.data.name;
  hudDestName.style.color = lockedTarget.data.color;
  hudDestIcon.style.display = 'flex';
  hudDestIcon.style.borderColor = lockedTarget.data.color;
  hudDestIcon.querySelector('div').style.background = lockedTarget.data.color;
  clearDestBtn.style.display = 'inline';

  // Distance
  distanceDisplay.textContent = formatDistance(dist);

  // Light-time
  const lightMinutes = dist * AU_TO_LIGHT_MIN;
  if (lightMinutes < 60) {
    lighttimeDisplay.textContent = `${lightMinutes.toFixed(1)} lt-min`;
  } else {
    lighttimeDisplay.textContent = `${(lightMinutes / 60).toFixed(1)} lt-hr`;
  }

  // ETA based on current effective speed
  const auPerSec = effectiveSpeed * C_AU_PER_SEC;
  if (auPerSec > 0 && dist < Infinity) {
    const etaSec = dist / auPerSec;
    if (etaSec < 60) {
      etaDisplay.textContent = `${Math.round(etaSec)}s`;
    } else if (etaSec < 3600) {
      etaDisplay.textContent = `${Math.round(etaSec / 60)}m ${Math.round(etaSec % 60)}s`;
    } else if (etaSec < 86400) {
      const h = Math.floor(etaSec / 3600);
      const m = Math.round((etaSec % 3600) / 60);
      etaDisplay.textContent = `${h}h ${m}m`;
    } else {
      const d = Math.floor(etaSec / 86400);
      const h = Math.round((etaSec % 86400) / 3600);
      etaDisplay.textContent = `${d}d ${h}h`;
    }
  } else {
    etaDisplay.textContent = '—';
  }
}

function updateCrosshairPrompt() {
  // Show prompt if there's a candidate near crosshair that isn't already our locked target
  if (crosshairCandidate && (!lockedTarget || crosshairCandidate.id !== lockedTarget.id)) {
    targetPrompt.style.opacity = '1';
    targetPromptName.textContent = crosshairCandidate.data.name;
    targetPromptName.style.color = crosshairCandidate.data.color;
  } else {
    targetPrompt.style.opacity = '0';
  }
}

// Right-click (button 2) to lock target — use mousedown since contextmenu doesn't fire in pointer lock
document.addEventListener('mousedown', (e) => {
  if (e.button === 2 && crosshairCandidate) {
    setLockedTarget(crosshairCandidate.id);
  }
});
document.addEventListener('contextmenu', (e) => e.preventDefault());

// Clear target button
clearDestBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  clearLockedTarget();
});


// ── Warp Function ──
function warpToPlanet(planetId) {
  const body = solarSystem.getBody(planetId);
  if (!body) return;

  // Auto-lock the warp destination as target
  setLockedTarget(planetId);

  warpTransition.style.opacity = '1';

  setTimeout(() => {
    const wp = body.worldPosition;
    const dist = Math.sqrt(wp.x * wp.x + wp.y * wp.y + wp.z * wp.z);

    // Place camera at the zone boundary, looking at the planet from the sunward side
    const approachDist = body.data.zoneRadiusAU * 0.8;

    let offsetX, offsetY, offsetZ;
    if (dist > 0.001) {
      const toSunX = -wp.x / dist;
      const toSunZ = -wp.z / dist;
      offsetX = toSunX * approachDist;
      offsetY = approachDist * 0.3;
      offsetZ = toSunZ * approachDist;
    } else {
      offsetX = approachDist;
      offsetY = approachDist * 0.3;
      offsetZ = 0;
    }

    cameraController.warpTo(
      wp.x + offsetX,
      wp.y + offsetY,
      wp.z + offsetZ,
    );

    // Point camera at the planet
    const dx = wp.x - cameraController.worldPosition.x;
    const dy = wp.y - cameraController.worldPosition.y;
    const dz = wp.z - cameraController.worldPosition.z;
    const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
    cameraController.yaw = Math.atan2(dx, dz);
    cameraController.pitch = Math.asin(dy / d);

    setTimeout(() => {
      warpTransition.style.opacity = '0';
    }, 100);
  }, 300);
}

// ── Keyboard Shortcuts ──
document.addEventListener('keydown', (e) => {
  // Arrow up/down: step through throttle increments (disabled when speed-limited)
  if (e.code === 'ArrowUp') {
    e.preventDefault();
    if (effectiveSpeed >= requestedSpeed) adjustRequestedSpeed(1);
  }
  if (e.code === 'ArrowDown') {
    e.preventDefault();
    if (effectiveSpeed >= requestedSpeed) adjustRequestedSpeed(-1);
  }

  // Tab = warp menu
  if (e.code === 'Tab') {
    e.preventDefault();
    warpMenu.toggle();
  }

  // ? = controls
  if (e.key === '?' || e.key === '/') {
    toggleControls();
  }

  // M = solar system map
  if (e.code === 'KeyM') {
    solarMap.toggle();
  }

  // Escape
  if (e.code === 'Escape') {
    if (solarMap.isOpen) solarMap.close();
    else if (warpMenu.isOpen) warpMenu.close();
    else if (controlsOverlay.style.display !== 'none') controlsOverlay.style.display = 'none';
  }

  // Dismiss controls overlay on any key
  if (controlsOverlay.style.display !== 'none' && e.code !== 'Tab') {
    controlsOverlay.style.display = 'none';
  }
});

function toggleControls() {
  if (controlsOverlay.style.display === 'none') {
    controlsOverlay.style.display = 'flex';
    document.exitPointerLock();
  } else {
    controlsOverlay.style.display = 'none';
  }
}

// Clicking anywhere on the controls overlay dismisses it
controlsOverlay.addEventListener('click', () => {
  controlsOverlay.style.display = 'none';
});

// ── HUD buttons ──
btnControls.addEventListener('click', (e) => {
  e.stopPropagation();
  toggleControls();
});

btnWarpMenu.addEventListener('click', (e) => {
  e.stopPropagation();
  warpMenu.toggle();
});

// ── Start Screen ──
startBtn.addEventListener('click', () => {
  startScreen.style.opacity = '0';
  startScreen.style.transition = 'opacity 0.5s';
  setTimeout(() => {
    startScreen.style.display = 'none';
    hud.style.display = 'block';
    controlsOverlay.style.display = 'flex';
  }, 500);
});

// ── How to Play ──
const howToPlayModal = document.getElementById('how-to-play');
const howToPlayBtn = document.getElementById('how-to-play-btn');
const howToPlayClose = document.getElementById('how-to-play-close');

function openHowToPlay() {
  howToPlayModal.style.display = 'flex';
  howToPlayModal.setAttribute('tabindex', '-1');
  howToPlayModal.focus();
}

function closeHowToPlay() {
  howToPlayModal.style.display = 'none';
}

howToPlayBtn.addEventListener('click', openHowToPlay);
howToPlayClose.addEventListener('click', closeHowToPlay);
howToPlayModal.addEventListener('click', closeHowToPlay);
howToPlayModal.addEventListener('keydown', closeHowToPlay);

// If no textures found, still allow starting
setTimeout(() => {
  if (!assetsLoaded) {
    assetsLoaded = true;
    loadingBar.style.width = '100%';
    loadingPercent.textContent = 'Ready';
    startBtn.disabled = false;
  }
}, 3000);

// ── Resize ──
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ── Planet Distance List ──
let lastDistListUpdate = 0;

function formatDistance(distAU) {
  if (distAU < 0.001) {
    return `${(distAU * AU_TO_KM).toFixed(0)} km`;
  }
  return `${distAU.toFixed(2)} AU`;
}

function updatePlanetDistanceList() {
  // Compute distances for all bodies
  const entries = solarSystem.bodies.map(b => {
    const dx = b.worldPosition.x - cameraController.worldPosition.x;
    const dy = b.worldPosition.y - cameraController.worldPosition.y;
    const dz = b.worldPosition.z - cameraController.worldPosition.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    return { id: b.id, data: b.data, dist };
  });

  // Sort by distance
  entries.sort((a, b) => a.dist - b.dist);

  // Build HTML
  let html = '';
  for (const e of entries) {
    const isClosest = e === entries[0];
    const opacity = isClosest ? '1' : '0.55';
    const nameColor = isClosest ? e.data.color : '#c0c8cd';
    const distColor = isClosest ? '#B0E5FF' : '#8a9297';
    const glow = isClosest ? `box-shadow:0 0 6px ${e.data.color}40;` : '';
    html += `
      <div style="display:flex;align-items:center;gap:8px;opacity:${opacity};padding:3px 0;">
        <div style="width:12px;height:12px;border:1px solid ${e.data.color};flex-shrink:0;display:flex;align-items:center;justify-content:center;padding:1px;">
          <div style="width:100%;height:100%;background:${e.data.color};opacity:0.8;${glow}"></div>
        </div>
        <span style="font-family:'Space Grotesk',sans-serif;font-size:11px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:${nameColor};flex:1;white-space:nowrap;">${e.data.name}</span>
        <span style="font-family:'JetBrains Mono',monospace;font-size:10px;color:${distColor};white-space:nowrap;">${formatDistance(e.dist)}</span>
      </div>`;
  }
  planetDistanceList.innerHTML = html;
}

// ── Animation Loop ──
let lastTime = performance.now();

function animate(now) {
  requestAnimationFrame(animate);

  const dt = Math.min((now - lastTime) / 1000, 0.1);
  lastTime = now;

  // Update collision bodies for hard collision checks
  collisionSystem.setBodies(solarSystem.getCollisionBodies());

  // Detect crosshair candidate (for "right-click to target" prompt)
  findCrosshairCandidate();
  updateCrosshairPrompt();

  // Compute proportional speed limit based on distance to locked target
  const targetDist = getLockedTargetDist();
  currentSpeedLimit = computeSpeedLimit(targetDist);

  // Update locked target HUD (distance changes each frame)
  if (lockedTarget) updateDestinationHUD();

  // Apply effective speed (requested capped by distance limit)
  effectiveSpeed = Math.min(requestedSpeed, currentSpeedLimit);
  cameraController.speedMultiplier = effectiveSpeed;
  updateSpeedDisplay();
  updateThrottle();

  // Update camera
  cameraController.update(dt);

  // Update solar system (floating-origin)
  solarSystem.update(cameraController.worldPosition);

  // Update navigation arrows
  navArrows.update(solarSystem.bodies, cameraController.worldPosition);

  // Update warp menu distances (only when open)
  if (warpMenu.isOpen) {
    warpMenu.updateDistances(solarSystem.bodies, cameraController.worldPosition);
  }

  // Speed limit indicator — show when actively being limited
  const isSpeedLimited = lockedTarget && effectiveSpeed < requestedSpeed;
  if (isSpeedLimited) {
    let limitLabel;
    if (effectiveSpeed < 0.01) {
      limitLabel = `${effectiveSpeed.toFixed(3)}x c`;
    } else if (effectiveSpeed < 1) {
      limitLabel = `${effectiveSpeed.toFixed(2)}x c`;
    } else {
      limitLabel = `${Math.round(effectiveSpeed)}x c`;
    }
    proximityWarning.textContent = `▶ Proximity deceleration — ${lockedTarget.data.name}. Limit: ${limitLabel}`;
    proximityWarning.style.opacity = '1';
    etaDisplay.textContent = 'ARRIVING';
    etaDisplay.classList.add('eta-arriving');
    wasSpeedLimited = true;
  } else {
    if (wasSpeedLimited) {
      setSpeedByStepIndex(0); // reset to 1x
      wasSpeedLimited = false;
    }
    proximityWarning.style.opacity = '0';
    etaDisplay.classList.remove('eta-arriving');
  }

  // Temperature: equilibrium temperature from solar distance
  // T = T_sun * sqrt(R_sun / (2 * d)) where d = distance from sun center
  const sunBody = solarSystem.getBody('sun');
  const sdx = cameraController.worldPosition.x - sunBody.worldPosition.x;
  const sdy = cameraController.worldPosition.y - sunBody.worldPosition.y;
  const sdz = cameraController.worldPosition.z - sunBody.worldPosition.z;
  const distFromSun = Math.sqrt(sdx * sdx + sdy * sdy + sdz * sdz);

  // Solar equilibrium temp: T = 278.5 / sqrt(d_AU)  (simplified blackbody in K)
  let tempK;
  if (distFromSun < 0.001) {
    tempK = 5778; // at the sun
  } else {
    tempK = 278.5 / Math.sqrt(distFromSun);
  }

  // If near the locked target, blend toward that body's surface temp
  if (lockedTarget && targetDist < 0.25) {
    const planet = solarSystem.getBody(lockedTarget.id);
    if (planet && planet.data.surfaceTempK) {
      const blend = Math.max(0, 1 - targetDist / 0.25);
      tempK = tempK * (1 - blend) + planet.data.surfaceTempK * blend;
    }
  }

  // Deep space minimum: cosmic microwave background 2.7K
  tempK = Math.max(2.7, tempK);
  const tempC = tempK - 273.15;
  tempKDisplay.textContent = `${Math.round(tempK)} K`;
  tempCDisplay.textContent = `${Math.round(tempC)} °C`;

  // Update planet distance list (throttled to ~4Hz to avoid DOM thrash)
  if (now - lastDistListUpdate > 250) {
    lastDistListUpdate = now;
    updatePlanetDistanceList();
  }

  // Update 2D map
  solarMap.render(solarSystem.bodies, cameraController.worldPosition);

  // Render
  renderer.render(scene, camera);
}

requestAnimationFrame(animate);
