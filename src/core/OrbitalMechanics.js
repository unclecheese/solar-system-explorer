import { DEG_TO_RAD } from '../data/constants.js';
import { ORBITAL_ELEMENTS } from '../data/orbitalElements.js';

/**
 * Convert a JS Date to Julian Date
 */
function dateToJD(date) {
  return date.getTime() / 86400000 + 2440587.5;
}

/**
 * Centuries past J2000.0 epoch
 */
function centuriesPastJ2000(date) {
  const JD = dateToJD(date);
  return (JD - 2451545.0) / 36525.0;
}

/**
 * Normalize angle to [0, 360)
 */
function normalizeAngle(deg) {
  let a = deg % 360;
  if (a < 0) a += 360;
  return a;
}

/**
 * Solve Kepler's equation M = E - e*sin(E) using Newton-Raphson
 * @param {number} M - mean anomaly in radians
 * @param {number} e - eccentricity
 * @returns {number} E - eccentric anomaly in radians
 */
function solveKepler(M, e) {
  let E = M; // initial guess
  for (let i = 0; i < 10; i++) {
    const dE = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    E -= dE;
    if (Math.abs(dE) < 1e-12) break;
  }
  return E;
}

/**
 * Compute heliocentric ecliptic position of a planet in AU
 * Returns { x, y, z } where XZ is the ecliptic plane, Y is ecliptic north
 * (mapped to Three.js coordinate system)
 */
export function computePlanetPosition(planetId, date = new Date()) {
  const elements = ORBITAL_ELEMENTS[planetId];
  if (!elements) return { x: 0, y: 0, z: 0 };

  const T = centuriesPastJ2000(date);

  // Compute current orbital elements
  const a     = elements.a[0]     + elements.a[1]     * T;
  const e     = elements.e[0]     + elements.e[1]     * T;
  const I     = (elements.I[0]     + elements.I[1]     * T) * DEG_TO_RAD;
  const L     = normalizeAngle(elements.L[0]     + elements.L[1]     * T);
  const wbar  = normalizeAngle(elements.wbar[0]  + elements.wbar[1]  * T);
  const Omega = normalizeAngle(elements.Omega[0] + elements.Omega[1] * T);

  // Mean anomaly
  const M = normalizeAngle(L - wbar) * DEG_TO_RAD;

  // Argument of perihelion
  const w = (wbar - Omega) * DEG_TO_RAD;
  const OmegaRad = Omega * DEG_TO_RAD;

  // Solve Kepler's equation
  const E = solveKepler(M, e);

  // Heliocentric coordinates in the orbital plane
  const xPrime = a * (Math.cos(E) - e);
  const yPrime = a * Math.sqrt(1 - e * e) * Math.sin(E);

  // Rotate to ecliptic coordinates
  const cosW = Math.cos(w);
  const sinW = Math.sin(w);
  const cosO = Math.cos(OmegaRad);
  const sinO = Math.sin(OmegaRad);
  const cosI = Math.cos(I);
  const sinI = Math.sin(I);

  // Ecliptic X, Y, Z
  const xEcl = (cosW * cosO - sinW * sinO * cosI) * xPrime +
               (-sinW * cosO - cosW * sinO * cosI) * yPrime;
  const yEcl = (cosW * sinO + sinW * cosO * cosI) * xPrime +
               (-sinW * sinO + cosW * cosO * cosI) * yPrime;
  const zEcl = (sinW * sinI) * xPrime +
               (cosW * sinI) * yPrime;

  // Map to Three.js: ecliptic XY -> XZ plane, ecliptic Z -> Y (up)
  return {
    x: xEcl,
    y: zEcl,
    z: -yEcl,  // negate so the coordinate system is right-handed
  };
}

/**
 * Sample orbit path points for visualization
 * Returns array of { x, y, z } positions in AU
 */
export function computeOrbitPath(planetId, numPoints = 360) {
  const elements = ORBITAL_ELEMENTS[planetId];
  if (!elements) return [];

  const T = centuriesPastJ2000(new Date());

  const a     = elements.a[0]     + elements.a[1]     * T;
  const e     = elements.e[0]     + elements.e[1]     * T;
  const I     = (elements.I[0]     + elements.I[1]     * T) * DEG_TO_RAD;
  const wbar  = normalizeAngle(elements.wbar[0]  + elements.wbar[1]  * T);
  const Omega = normalizeAngle(elements.Omega[0] + elements.Omega[1] * T);
  const w     = (wbar - Omega) * DEG_TO_RAD;
  const OmegaRad = Omega * DEG_TO_RAD;

  const cosW = Math.cos(w);
  const sinW = Math.sin(w);
  const cosO = Math.cos(OmegaRad);
  const sinO = Math.sin(OmegaRad);
  const cosI = Math.cos(I);
  const sinI = Math.sin(I);

  const points = [];
  for (let i = 0; i <= numPoints; i++) {
    const M = (i / numPoints) * 2 * Math.PI;
    const E = solveKepler(M, e);
    const xP = a * (Math.cos(E) - e);
    const yP = a * Math.sqrt(1 - e * e) * Math.sin(E);

    const xEcl = (cosW * cosO - sinW * sinO * cosI) * xP + (-sinW * cosO - cosW * sinO * cosI) * yP;
    const yEcl = (cosW * sinO + sinW * cosO * cosI) * xP + (-sinW * sinO + cosW * cosO * cosI) * yP;
    const zEcl = (sinW * sinI) * xP + (cosW * sinI) * yP;

    points.push({ x: xEcl, y: zEcl, z: -yEcl });
  }
  return points;
}
