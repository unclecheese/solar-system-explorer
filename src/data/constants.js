export const AU_TO_KM = 149_597_870.7;
export const C_AU_PER_SEC = 0.002_004;  // speed of light in AU/second
export const C_KM_PER_SEC = 299_792.458;

// Planet radii in AU
export const SUN_RADIUS_AU = 696_340 / AU_TO_KM;      // ~0.00465
export const EARTH_RADIUS_AU = 6_371 / AU_TO_KM;      // ~0.0000426

// Conversion helpers
export const AU_TO_LIGHT_MIN = 8.317;  // 1 AU = ~8.317 light-minutes

export const DEG_TO_RAD = Math.PI / 180;
export const RAD_TO_DEG = 180 / Math.PI;
