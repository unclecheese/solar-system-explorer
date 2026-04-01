import { AU_TO_KM } from './constants.js';

const KM_TO_AU = 1 / AU_TO_KM;
const SURFACE_BUFFER_KM = 500; // hard stop: 500km above surface

// Surface temperatures in Kelvin (approximate averages)
// Used when close to a planet; in open space we compute from solar distance

// Planet colors matching the design system
export const PLANET_COLORS = {
  sun:     '#FCB500',
  mercury: '#8a9297',
  venus:   '#FFD898',
  earth:   '#8ECAE6',
  mars:    '#B72301',
  jupiter: '#694a00',
  saturn:  '#FFBA27',
  uranus:  '#8ECAE6',
  neptune: '#0A566E',
};

export const PLANETS = [
  {
    id: 'sun',
    name: 'Sun',
    radiusKM: 696_340,
    radiusAU: 696_340 * KM_TO_AU,
    color: PLANET_COLORS.sun,
    // Approach zone: entering this triggers speed limit
    zoneRadiusAU: 0.015,
    // Hard collision: surface + 500km
    minDistanceAU: (696_340 + SURFACE_BUFFER_KM) * KM_TO_AU,
    surfaceTempK: 5778,
    texture: '2k_sun.jpg',
    emissive: true,
    isStar: true,
  },
  {
    id: 'mercury',
    name: 'Mercury',
    radiusKM: 2_439.7,
    radiusAU: 2_439.7 * KM_TO_AU,
    color: PLANET_COLORS.mercury,
    zoneRadiusAU: 0.0003,
    minDistanceAU: (2_439.7 + SURFACE_BUFFER_KM) * KM_TO_AU,
    surfaceTempK: 440,
    texture: '2k_mercury.jpg',
  },
  {
    id: 'venus',
    name: 'Venus',
    radiusKM: 6_051.8,
    radiusAU: 6_051.8 * KM_TO_AU,
    color: PLANET_COLORS.venus,
    zoneRadiusAU: 0.0004,
    minDistanceAU: (6_051.8 + SURFACE_BUFFER_KM) * KM_TO_AU,
    surfaceTempK: 737,
    texture: '2k_venus_atmosphere.jpg',
  },
  {
    id: 'earth',
    name: 'Earth',
    radiusKM: 6_371,
    radiusAU: 6_371 * KM_TO_AU,
    color: PLANET_COLORS.earth,
    zoneRadiusAU: 0.0004,
    minDistanceAU: (6_371 + SURFACE_BUFFER_KM) * KM_TO_AU,
    surfaceTempK: 288,
    texture: '2k_earth_daymap.jpg',
  },
  {
    id: 'mars',
    name: 'Mars',
    radiusKM: 3_389.5,
    radiusAU: 3_389.5 * KM_TO_AU,
    color: PLANET_COLORS.mars,
    zoneRadiusAU: 0.0003,
    minDistanceAU: (3_389.5 + SURFACE_BUFFER_KM) * KM_TO_AU,
    surfaceTempK: 210,
    texture: '2k_mars.jpg',
  },
  {
    id: 'jupiter',
    name: 'Jupiter',
    radiusKM: 69_911,
    radiusAU: 69_911 * KM_TO_AU,
    color: PLANET_COLORS.jupiter,
    zoneRadiusAU: 0.001,
    minDistanceAU: (69_911 + SURFACE_BUFFER_KM) * KM_TO_AU,
    surfaceTempK: 165,
    texture: '2k_jupiter.jpg',
  },
  {
    id: 'saturn',
    name: 'Saturn',
    radiusKM: 58_232,
    radiusAU: 58_232 * KM_TO_AU,
    color: PLANET_COLORS.saturn,
    zoneRadiusAU: 0.001,
    minDistanceAU: (58_232 + SURFACE_BUFFER_KM) * KM_TO_AU,
    surfaceTempK: 134,
    texture: '2k_saturn.jpg',
    hasRings: true,
  },
  {
    id: 'uranus',
    name: 'Uranus',
    radiusKM: 25_362,
    radiusAU: 25_362 * KM_TO_AU,
    color: PLANET_COLORS.uranus,
    zoneRadiusAU: 0.0006,
    minDistanceAU: (25_362 + SURFACE_BUFFER_KM) * KM_TO_AU,
    surfaceTempK: 76,
    texture: '2k_uranus.jpg',
  },
  {
    id: 'neptune',
    name: 'Neptune',
    radiusKM: 24_622,
    radiusAU: 24_622 * KM_TO_AU,
    color: PLANET_COLORS.neptune,
    zoneRadiusAU: 0.0006,
    minDistanceAU: (24_622 + SURFACE_BUFFER_KM) * KM_TO_AU,
    surfaceTempK: 72,
    texture: '2k_neptune.jpg',
  },
];
