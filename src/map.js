import * as THREE from 'three';
import { makeBoxCollider, rand } from './utils.js';

const coverMaterial = new THREE.MeshStandardMaterial({ color: 0x455854, roughness: 0.82 });
const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x263531, roughness: 0.9 });
const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x66736d, roughness: 0.95 });
const stripeMaterial = new THREE.MeshStandardMaterial({ color: 0x78e9c0, roughness: 0.65 });

export class TrainingMap {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.colliders = [];
    this.occluders = [];
    this.spawnPoints = [];
    this.peekCovers = [];
    this.impacts = [];
    this.tracers = [];
    this.damageTexts = [];
    scene.add(this.group);
    this.build();
  }

  addBox({ position, size, material = coverMaterial, collider = true, name = 'box' }) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z), material);
    mesh.position.copy(position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = name;
    this.group.add(mesh);
    if (collider) {
      this.colliders.push(makeBoxCollider(position.clone(), size.clone()));
      this.occluders.push(mesh);
    }
    return mesh;
  }

  build() {
    const floor = new THREE.Mesh(new THREE.BoxGeometry(46, 0.24, 56), floorMaterial);
    floor.position.set(0, -0.12, 0);
    floor.receiveShadow = true;
    this.group.add(floor);

    this.addBox({ position: new THREE.Vector3(0, 2, -28), size: new THREE.Vector3(46, 4, 1), material: wallMaterial, name: 'north-wall' });
    this.addBox({ position: new THREE.Vector3(0, 2, 28), size: new THREE.Vector3(46, 4, 1), material: wallMaterial, name: 'south-wall' });
    this.addBox({ position: new THREE.Vector3(-23, 2, 0), size: new THREE.Vector3(1, 4, 56), material: wallMaterial, name: 'west-wall' });
    this.addBox({ position: new THREE.Vector3(23, 2, 0), size: new THREE.Vector3(1, 4, 56), material: wallMaterial, name: 'east-wall' });

    const pieces = [
      [-12, 1, 6, 1.4, 2, 8],
      [12, 1, 6, 1.4, 2, 8],
      [-6, 1, -5, 7, 2, 1.4],
      [6, 1, -10, 7, 2, 1.4],
      [0, 1, 2, 3.5, 2, 3.5],
      [-16, 0.65, -13, 4, 1.3, 5],
      [16, 0.65, -16, 4, 1.3, 5],
      [-15, 1.2, 18, 6, 2.4, 1.2],
      [15, 1.2, 18, 6, 2.4, 1.2],
      [0, 1.15, 10.2, 8.5, 2.3, 1.2],
      [-5.6, 0.85, 14.4, 1.2, 1.7, 5.2],
      [5.6, 0.85, 14.4, 1.2, 1.7, 5.2],
      [0, 0.75, -20, 10, 1.5, 1.2]
    ];
    pieces.forEach(([x, y, z, sx, sy, sz]) => this.addBox({
      position: new THREE.Vector3(x, y, z),
      size: new THREE.Vector3(sx, sy, sz)
    }));

    const stripeGeo = new THREE.BoxGeometry(1.2, 0.025, 9);
    for (let i = -14; i <= 14; i += 7) {
      const stripe = new THREE.Mesh(stripeGeo, stripeMaterial);
      stripe.position.set(i, 0.02, 21.5);
      this.group.add(stripe);
    }

    this.spawnPoints = [
      new THREE.Vector3(-17, 0, -22),
      new THREE.Vector3(-8, 0, -23),
      new THREE.Vector3(0, 0, -22),
      new THREE.Vector3(9, 0, -24),
      new THREE.Vector3(18, 0, -20),
      new THREE.Vector3(-18, 0, -6),
      new THREE.Vector3(18, 0, -8),
      new THREE.Vector3(0, 0, -16)
    ];

    this.peekCovers = [
      { cover: new THREE.Vector3(-12, 0, 6), left: new THREE.Vector3(-14.2, 0, 1.8), right: new THREE.Vector3(-9.7, 0, 1.8) },
      { cover: new THREE.Vector3(12, 0, 6), left: new THREE.Vector3(9.8, 0, 1.8), right: new THREE.Vector3(14.2, 0, 1.8) },
      { cover: new THREE.Vector3(-6, 0, -5), left: new THREE.Vector3(-10, 0, -7.1), right: new THREE.Vector3(-2, 0, -7.1) },
      { cover: new THREE.Vector3(6, 0, -10), left: new THREE.Vector3(2, 0, -12.2), right: new THREE.Vector3(10, 0, -12.2) }
    ];

    const sun = new THREE.DirectionalLight(0xffffff, 2.3);
    sun.position.set(10, 18, 9);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    this.scene.add(sun);
    this.scene.add(new THREE.HemisphereLight(0xb8ddff, 0x365046, 1.6));

    const sky = new THREE.Mesh(new THREE.BoxGeometry(48, 0.08, 20), new THREE.MeshStandardMaterial({ color: 0x9ccfd0, roughness: 1 }));
    sky.position.set(0, 4.05, 18);
    this.group.add(sky);
  }

  spawnImpact(point, color) {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.055, 8, 8),
      new THREE.MeshBasicMaterial({ color })
    );
    mesh.position.copy(point);
    this.scene.add(mesh);
    this.impacts.push({ mesh, ttl: 0.3 });
  }

  spawnTracer(start, end, color, width = 0.035, ttl = 0.09) {
    const delta = end.clone().sub(start);
    const length = delta.length();
    if (length < 0.12) return;

    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.86,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(width, width * 0.45, length, 8, 1), material);
    mesh.position.copy(start).addScaledVector(delta, 0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
    this.scene.add(mesh);
    this.tracers.push({ mesh, material, ttl, maxTtl: ttl });
  }

  spawnDamageText(point, label, color = '#ffffff') {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 96;
    const context = canvas.getContext('2d');
    context.font = '800 34px Arial';
    context.textAlign = 'center';
    context.lineWidth = 8;
    context.strokeStyle = 'rgba(0, 0, 0, 0.72)';
    context.fillStyle = color;
    context.strokeText(label, 128, 56);
    context.fillText(label, 128, 56);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false
    });
    const sprite = new THREE.Sprite(material);
    sprite.position.copy(point).add(new THREE.Vector3(0, 0.35, 0));
    sprite.scale.set(1.3, 0.48, 1);
    this.scene.add(sprite);
    this.damageTexts.push({ sprite, material, texture, ttl: 0.7, maxTtl: 0.7 });
  }

  update(dt) {
    for (let i = this.impacts.length - 1; i >= 0; i -= 1) {
      this.impacts[i].ttl -= dt;
      this.impacts[i].mesh.scale.multiplyScalar(1 + dt * 4);
      if (this.impacts[i].ttl <= 0) {
        this.scene.remove(this.impacts[i].mesh);
        this.impacts[i].mesh.geometry.dispose();
        this.impacts[i].mesh.material.dispose();
        this.impacts.splice(i, 1);
      }
    }

    for (let i = this.tracers.length - 1; i >= 0; i -= 1) {
      const tracer = this.tracers[i];
      tracer.ttl -= dt;
      tracer.material.opacity = Math.max(0, tracer.ttl / tracer.maxTtl) * 0.86;
      tracer.mesh.scale.x = 1 + (1 - tracer.ttl / tracer.maxTtl) * 0.8;
      tracer.mesh.scale.z = tracer.mesh.scale.x;
      if (tracer.ttl <= 0) {
        this.scene.remove(tracer.mesh);
        tracer.mesh.geometry.dispose();
        tracer.material.dispose();
        this.tracers.splice(i, 1);
      }
    }

    for (let i = this.damageTexts.length - 1; i >= 0; i -= 1) {
      const text = this.damageTexts[i];
      text.ttl -= dt;
      text.sprite.position.y += dt * 0.95;
      text.material.opacity = Math.max(0, text.ttl / text.maxTtl);
      if (text.ttl <= 0) {
        this.scene.remove(text.sprite);
        text.texture.dispose();
        text.material.dispose();
        this.damageTexts.splice(i, 1);
      }
    }
  }

  randomSpawn() {
    const base = this.spawnPoints[Math.floor(rand(0, this.spawnPoints.length))];
    return base.clone().add(new THREE.Vector3(rand(-0.8, 0.8), 0, rand(-0.8, 0.8)));
  }

  isCircleBlocked(position, radius = 0.36, height = 1.72) {
    const probe = new THREE.Vector3(position.x, height * 0.5, position.z);
    for (const box of this.colliders) {
      const closest = box.clampPoint(probe, new THREE.Vector3());
      const dx = probe.x - closest.x;
      const dz = probe.z - closest.z;
      const distSq = dx * dx + dz * dz;
      if (distSq < radius * radius && probe.y < box.max.y + 0.15) return true;
    }
    return false;
  }

  resolveActorMovement(position, previous, radius = 0.36) {
    const candidate = previous.clone();
    candidate.x = position.x;
    if (this.isCircleBlocked(candidate, radius)) candidate.x = previous.x;
    candidate.z = position.z;
    if (this.isCircleBlocked(candidate, radius)) candidate.z = previous.z;
    position.x = candidate.x;
    position.z = candidate.z;
  }

  isInPlayerSafeZone(position) {
    return position.z > 7 && Math.abs(position.x) < 8;
  }
}
