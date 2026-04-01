import * as THREE from 'three';
import { PLANETS } from '../data/planets.js';
import { computePlanetPosition, computeOrbitPath } from '../core/OrbitalMechanics.js';

/**
 * Creates and manages all celestial bodies in the solar system.
 * Uses floating-origin rendering: all mesh positions are relative to camera.
 */
export class SolarSystem {
  constructor(scene, loadingManager) {
    this.scene = scene;
    this.bodies = [];  // { id, data, mesh, worldPosition, orbitLine }
    this.textureLoader = new THREE.TextureLoader(loadingManager);
    this.currentDate = new Date();

    this._createBodies();
    this._createOrbitPaths();
    this._createStarfield();
    this._updatePositions();
  }

  _createBodies() {
    for (const planet of PLANETS) {
      let mesh;

      if (planet.isStar) {
        // Sun: emissive material, not affected by lighting
        const geometry = new THREE.SphereGeometry(planet.radiusAU, 64, 64);
        const material = new THREE.MeshBasicMaterial({
          color: new THREE.Color(planet.color),
          map: this._loadTexture(planet.texture),
        });
        mesh = new THREE.Mesh(geometry, material);

        // Point light at the sun
        const light = new THREE.PointLight(0xffffff, 2, 0, 0);
        mesh.add(light);

        // Glow sprite
        const spriteMat = new THREE.SpriteMaterial({
          map: this._createGlowTexture(),
          color: 0xFFE4A0,
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        const sprite = new THREE.Sprite(spriteMat);
        sprite.scale.set(planet.radiusAU * 6, planet.radiusAU * 6, 1);
        mesh.add(sprite);
      } else {
        const geometry = new THREE.SphereGeometry(planet.radiusAU, 48, 48);
        const material = new THREE.MeshStandardMaterial({
          map: this._loadTexture(planet.texture),
          roughness: 0.8,
          metalness: 0.1,
        });
        mesh = new THREE.Mesh(geometry, material);

        // Saturn rings
        if (planet.hasRings) {
          const innerR = planet.radiusAU * 1.2;
          const outerR = planet.radiusAU * 2.3;
          const ringGeo = new THREE.RingGeometry(innerR, outerR, 64);
          // Fix UVs for RingGeometry
          const pos = ringGeo.attributes.position;
          const uv = ringGeo.attributes.uv;
          for (let i = 0; i < pos.count; i++) {
            const x = pos.getX(i);
            const z = pos.getY(i);
            const dist = Math.sqrt(x * x + z * z);
            uv.setXY(i, (dist - innerR) / (outerR - innerR), 0.5);
          }
          const ringMat = new THREE.MeshBasicMaterial({
            color: 0xC4A55A,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.6,
          });
          const ringMesh = new THREE.Mesh(ringGeo, ringMat);
          ringMesh.rotation.x = Math.PI / 2;
          // Saturn's axial tilt ~26.7 degrees
          ringMesh.rotation.y = 26.7 * (Math.PI / 180);
          mesh.add(ringMesh);
        }
      }

      this.scene.add(mesh);

      this.bodies.push({
        id: planet.id,
        data: planet,
        mesh,
        worldPosition: { x: 0, y: 0, z: 0 },
        orbitLine: null,
      });
    }

    // Ambient light so shadow sides of planets aren't pitch black
    const ambient = new THREE.AmbientLight(0x404040, 0.3);
    this.scene.add(ambient);
  }

  _createOrbitPaths() {
    for (const body of this.bodies) {
      if (body.data.isStar) continue;

      const pathPoints = computeOrbitPath(body.id, 360);
      const positions = new Float32Array(pathPoints.length * 3);
      // Store the double-precision world positions for floating-origin updates
      body.orbitWorldPositions = pathPoints;

      for (let i = 0; i < pathPoints.length; i++) {
        positions[i * 3] = pathPoints[i].x;
        positions[i * 3 + 1] = pathPoints[i].y;
        positions[i * 3 + 2] = pathPoints[i].z;
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

      const material = new THREE.LineBasicMaterial({
        color: new THREE.Color(body.data.color),
        transparent: true,
        opacity: 0.25,
        depthWrite: false,
      });

      const line = new THREE.Line(geometry, material);
      this.scene.add(line);
      body.orbitLine = line;
    }
  }

  _createStarfield() {
    const count = 15000;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      // Random position on a large sphere
      const theta = Math.random() * 2 * Math.PI;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 150; // far away

      positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      // Slight color variation (blue-white)
      const brightness = 0.5 + Math.random() * 0.5;
      colors[i * 3]     = brightness * (0.9 + Math.random() * 0.1);
      colors[i * 3 + 1] = brightness * (0.9 + Math.random() * 0.1);
      colors[i * 3 + 2] = brightness;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.15,
      vertexColors: true,
      sizeAttenuation: true,
      depthWrite: false,
    });

    this.starfield = new THREE.Points(geometry, material);
    this.scene.add(this.starfield);
  }

  _updatePositions() {
    for (const body of this.bodies) {
      if (body.data.isStar) {
        // Sun stays at origin in world space
        body.worldPosition = { x: 0, y: 0, z: 0 };
      } else {
        body.worldPosition = computePlanetPosition(body.id, this.currentDate);
      }
    }
  }

  /**
   * Per-frame update with floating-origin.
   * @param {Object} cameraWorldPos - { x, y, z } in AU
   */
  update(cameraWorldPos) {
    for (const body of this.bodies) {
      // Floating-origin: render position = world position - camera position
      body.mesh.position.set(
        body.worldPosition.x - cameraWorldPos.x,
        body.worldPosition.y - cameraWorldPos.y,
        body.worldPosition.z - cameraWorldPos.z,
      );

      // Update orbit path positions (floating-origin)
      if (body.orbitLine && body.orbitWorldPositions) {
        const posAttr = body.orbitLine.geometry.attributes.position;
        const wp = body.orbitWorldPositions;
        for (let i = 0; i < wp.length; i++) {
          posAttr.setXYZ(
            i,
            wp[i].x - cameraWorldPos.x,
            wp[i].y - cameraWorldPos.y,
            wp[i].z - cameraWorldPos.z,
          );
        }
        posAttr.needsUpdate = true;
      }
    }

    // Starfield follows camera (stars at infinity)
    if (this.starfield) {
      this.starfield.position.set(0, 0, 0);
    }
  }

  /**
   * Get a body by its ID
   */
  getBody(id) {
    return this.bodies.find(b => b.id === id);
  }

  /**
   * Get all bodies as collision targets
   */
  getCollisionBodies() {
    return this.bodies.map(b => ({
      id: b.id,
      worldPosition: b.worldPosition,
      zoneRadiusAU: b.data.zoneRadiusAU,
      minDistanceAU: b.data.minDistanceAU,
    }));
  }

  _loadTexture(filename) {
    return this.textureLoader.load(`/textures/${filename}`);
  }

  _createGlowTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    gradient.addColorStop(0, 'rgba(255, 228, 160, 0.6)');
    gradient.addColorStop(0.3, 'rgba(255, 228, 160, 0.2)');
    gradient.addColorStop(1, 'rgba(255, 228, 160, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }
}
