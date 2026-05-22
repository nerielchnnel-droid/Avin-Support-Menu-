import * as THREE from 'three';
import { DAMAGE, WEAPONS } from './config.js';
import { rand } from './utils.js';

export class Weapon {
  constructor(camera, audio) {
    this.camera = camera;
    this.audio = audio;
    this.activeWeaponId = 'woodCarbine';
    this.states = Object.fromEntries(Object.entries(WEAPONS).map(([id, config]) => [
      id,
      { ammo: config.magazineSize, reserve: config.reserveAmmo }
    ]));
    this.reloadTimer = 0;
    this.cooldown = 0;
    this.recoilKick = 0;
    this.recoilTilt = 0;
    this.recoilSide = 0;
    this.mesh = this.createViewModel(this.config);
    camera.add(this.mesh);
  }

  get config() {
    return WEAPONS[this.activeWeaponId];
  }

  get ammo() {
    return this.states[this.activeWeaponId].ammo;
  }

  set ammo(value) {
    this.states[this.activeWeaponId].ammo = value;
  }

  get reserve() {
    return this.states[this.activeWeaponId].reserve;
  }

  set reserve(value) {
    this.states[this.activeWeaponId].reserve = value;
  }

  createViewModel(config) {
    const group = new THREE.Group();
    const dark = new THREE.MeshStandardMaterial({ color: 0x172522, roughness: 0.82, metalness: 0.25 });
    const frame = new THREE.MeshStandardMaterial({ color: 0x2b4641, roughness: 0.72, metalness: 0.18 });
    const gripMat = new THREE.MeshStandardMaterial({ color: 0x101716, roughness: 0.9, metalness: 0.05 });
    const accent = new THREE.MeshStandardMaterial({ color: modelColor(config), roughness: 0.48, metalness: 0.15 });
    const glass = new THREE.MeshStandardMaterial({ color: 0x8fd0ff, roughness: 0.2, metalness: 0.05, transparent: true, opacity: 0.72 });
    const wood = new THREE.MeshStandardMaterial({ color: 0x9b6034, roughness: 0.78, metalness: 0.02 });
    const wrap = new THREE.MeshStandardMaterial({ color: 0xbab09a, roughness: 0.92, metalness: 0.02 });
    const olive = new THREE.MeshStandardMaterial({ color: 0x58634a, roughness: 0.86, metalness: 0.04 });
    const model = config.model ?? 'woodCarbine';

    const box = (size, position, material, rotation = [0, 0, 0]) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z), material);
      mesh.position.set(position.x, position.y, position.z);
      mesh.rotation.set(rotation[0], rotation[1], rotation[2]);
      group.add(mesh);
      return mesh;
    };

    const cyl = (radius, depth, position, material, rotation = [Math.PI / 2, 0, 0], segments = 12) => {
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, depth, segments), material);
      mesh.position.set(position.x, position.y, position.z);
      mesh.rotation.set(rotation[0], rotation[1], rotation[2]);
      group.add(mesh);
      return mesh;
    };

    if (model === 'sidearm') {
      box({ x: 0.18, y: 0.16, z: 0.42 }, { x: 0.22, y: -0.27, z: -0.5 }, frame);
      box({ x: 0.2, y: 0.09, z: 0.5 }, { x: 0.22, y: -0.18, z: -0.55 }, dark);
      cyl(0.027, 0.32, { x: 0.22, y: -0.17, z: -0.85 }, dark, [Math.PI / 2, 0, 0], 12);
      box({ x: 0.1, y: 0.28, z: 0.14 }, { x: 0.22, y: -0.45, z: -0.37 }, gripMat, [-0.18, 0, 0]);
      box({ x: 0.12, y: 0.05, z: 0.16 }, { x: 0.22, y: -0.12, z: -0.58 }, accent);
      box({ x: 0.04, y: 0.03, z: 0.05 }, { x: 0.22, y: -0.11, z: -0.35 }, dark);
    } else if (model === 'marksman') {
      box({ x: 0.17, y: 0.15, z: 1.06 }, { x: 0.28, y: -0.28, z: -0.7 }, frame);
      box({ x: 0.2, y: 0.13, z: 0.72 }, { x: 0.28, y: -0.31, z: -0.18 }, wood, [0.06, 0, 0]);
      box({ x: 0.12, y: 0.09, z: 0.42 }, { x: 0.28, y: -0.23, z: -1.28 }, dark);
      cyl(0.026, 0.95, { x: 0.28, y: -0.22, z: -1.58 }, dark, [Math.PI / 2, 0, 0], 16);
      cyl(0.041, 0.12, { x: 0.28, y: -0.22, z: -2.08 }, dark, [Math.PI / 2, 0, 0], 16);
      box({ x: 0.16, y: 0.04, z: 0.78 }, { x: 0.28, y: -0.14, z: -0.88 }, dark);
      cyl(0.064, 0.5, { x: 0.28, y: -0.11, z: -0.88 }, accent, [Math.PI / 2, 0, 0], 18);
      cyl(0.048, 0.03, { x: 0.28, y: -0.11, z: -1.15 }, glass, [Math.PI / 2, 0, 0], 18);
      cyl(0.048, 0.03, { x: 0.28, y: -0.11, z: -0.61 }, glass, [Math.PI / 2, 0, 0], 18);
      box({ x: 0.08, y: 0.2, z: 0.16 }, { x: 0.28, y: -0.43, z: -0.42 }, gripMat, [-0.2, 0, 0]);
      box({ x: 0.14, y: 0.32, z: 0.12 }, { x: 0.28, y: -0.45, z: -0.68 }, dark, [0.12, 0, 0]);
      box({ x: 0.3, y: 0.16, z: 0.18 }, { x: 0.28, y: -0.32, z: 0.12 }, wood, [0.08, 0, 0]);
      box({ x: 0.18, y: 0.035, z: 0.32 }, { x: 0.28, y: -0.17, z: -1.38 }, accent);
    } else if (model === 'carry' || model === 'grenadier' || model === 'compact') {
      const compact = model === 'compact';
      const grenadier = model === 'grenadier';
      box({ x: 0.18, y: 0.16, z: compact ? 0.55 : 0.78 }, { x: 0.28, y: -0.28, z: compact ? -0.48 : -0.62 }, frame);
      box({ x: 0.14, y: 0.13, z: compact ? 0.25 : 0.36 }, { x: 0.28, y: -0.25, z: compact ? -0.82 : -1.03 }, dark);
      cyl(0.03, compact ? 0.3 : 0.58, { x: 0.28, y: -0.24, z: compact ? -1.05 : -1.36 }, dark, [Math.PI / 2, 0, 0], 14);
      cyl(0.043, 0.08, { x: 0.28, y: -0.24, z: compact ? -1.24 : -1.7 }, dark, [Math.PI / 2, 0, 0], 14);
      box({ x: 0.18, y: 0.05, z: compact ? 0.48 : 0.62 }, { x: 0.28, y: -0.13, z: compact ? -0.54 : -0.68 }, dark);
      box({ x: 0.28, y: 0.18, z: 0.13 }, { x: 0.28, y: -0.07, z: compact ? -0.5 : -0.6 }, dark);
      box({ x: 0.18, y: 0.045, z: 0.09 }, { x: 0.28, y: 0.03, z: compact ? -0.5 : -0.6 }, accent);
      box({ x: 0.08, y: 0.22, z: 0.14 }, { x: 0.28, y: -0.44, z: -0.35 }, gripMat, [-0.24, 0, 0]);
      box({ x: 0.13, y: compact ? 0.2 : 0.3, z: 0.12 }, { x: 0.28, y: compact ? -0.4 : -0.46, z: compact ? -0.52 : -0.58 }, dark, [0.16, 0, 0]);
      box({ x: compact ? 0.14 : 0.2, y: 0.12, z: compact ? 0.25 : 0.42 }, { x: 0.28, y: -0.31, z: compact ? -0.12 : -0.06 }, compact ? olive : dark, [0.08, 0, 0]);
      if (grenadier) {
        cyl(0.075, 0.54, { x: 0.28, y: -0.37, z: -0.95 }, dark, [Math.PI / 2, 0, 0], 16);
        box({ x: 0.19, y: 0.08, z: 0.48 }, { x: 0.28, y: -0.36, z: -0.94 }, dark);
        box({ x: 0.22, y: 0.035, z: 0.24 }, { x: 0.28, y: -0.13, z: -1.08 }, wrap);
      } else {
        box({ x: 0.18, y: 0.035, z: compact ? 0.2 : 0.28 }, { x: 0.28, y: -0.18, z: compact ? -0.86 : -1.1 }, wrap);
      }
    } else {
      box({ x: 0.2, y: 0.17, z: 0.74 }, { x: 0.28, y: -0.28, z: -0.58 }, frame);
      box({ x: 0.17, y: 0.13, z: 0.28 }, { x: 0.28, y: -0.23, z: -0.93 }, wood);
      box({ x: 0.16, y: 0.11, z: 0.34 }, { x: 0.28, y: -0.24, z: -1.0 }, dark);
      cyl(0.033, 0.46, { x: 0.28, y: -0.24, z: -1.28 }, dark, [Math.PI / 2, 0, 0], 14);
      cyl(0.047, 0.08, { x: 0.28, y: -0.24, z: -1.54 }, dark, [Math.PI / 2, 0, 0], 14);
      box({ x: 0.18, y: 0.035, z: 0.54 }, { x: 0.28, y: -0.16, z: -0.68 }, dark);
      box({ x: 0.09, y: 0.06, z: 0.15 }, { x: 0.28, y: -0.11, z: -0.72 }, accent);
      box({ x: 0.07, y: 0.19, z: 0.18 }, { x: 0.28, y: -0.43, z: -0.35 }, wood, [-0.24, 0, 0]);
      box({ x: 0.15, y: 0.34, z: 0.12 }, { x: 0.28, y: -0.47, z: -0.58 }, dark, [0.28, 0, 0]);
      box({ x: 0.42, y: 0.16, z: 0.17 }, { x: 0.28, y: -0.33, z: 0.02 }, wood, [0.08, 0, 0]);
      box({ x: 0.23, y: 0.035, z: 0.07 }, { x: 0.28, y: -0.2, z: -1.05 }, accent);
      if (model === 'bayonet') {
        box({ x: 0.035, y: 0.025, z: 0.58 }, { x: 0.28, y: -0.2, z: -1.88 }, glass, [0.08, 0, 0]);
        box({ x: 0.14, y: 0.03, z: 0.05 }, { x: 0.28, y: -0.24, z: -1.58 }, dark);
      } else {
        box({ x: 0.18, y: 0.035, z: 0.22 }, { x: 0.28, y: -0.18, z: -1.18 }, wrap);
      }
    }
    group.position.set(0, 0, 0);
    return group;
  }

  switchWeapon(id) {
    if (!WEAPONS[id] || id === this.activeWeaponId || this.reloadTimer > 0) return false;
    this.activeWeaponId = id;
    this.cooldown = Math.max(this.cooldown, 0.18);
    this.recoilKick = 0;
    this.recoilTilt = 0;
    this.recoilSide = 0;
    this.disposeViewModel();
    this.mesh = this.createViewModel(this.config);
    this.camera.add(this.mesh);
    return true;
  }

  disposeViewModel() {
    this.camera.remove(this.mesh);
    this.mesh.traverse((child) => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) child.material.forEach((mat) => mat.dispose());
        else child.material.dispose();
      }
    });
  }

  resetAmmo() {
    Object.entries(WEAPONS).forEach(([id, config]) => {
      this.states[id].ammo = config.magazineSize;
      this.states[id].reserve = config.reserveAmmo;
    });
    this.activeWeaponId = 'woodCarbine';
    this.reloadTimer = 0;
    this.cooldown = 0;
    this.disposeViewModel();
    this.mesh = this.createViewModel(this.config);
    this.camera.add(this.mesh);
  }

  update(dt, isAds) {
    this.cooldown = Math.max(0, this.cooldown - dt);
    if (this.reloadTimer > 0) {
      this.reloadTimer -= dt;
      if (this.reloadTimer <= 0) {
        const needed = this.config.magazineSize - this.ammo;
        const loaded = Math.min(needed, this.reserve);
        this.ammo += loaded;
        this.reserve -= loaded;
      }
    }
    this.recoilKick *= Math.pow(0.02, dt);
    this.recoilTilt *= Math.pow(0.025, dt);
    this.recoilSide *= Math.pow(0.035, dt);
    const scoped = isAds && this.config.zoomFov <= 35;
    this.mesh.visible = !scoped;
    const adsOffset = this.config.adsOffset ?? { x: -0.27, y: 0.08, z: 0 };
    this.mesh.position.x = isAds ? adsOffset.x : 0;
    this.mesh.position.y = isAds ? adsOffset.y : 0;
    this.mesh.position.z = this.recoilKick + (isAds ? adsOffset.z : 0);
    this.mesh.rotation.x = this.recoilTilt;
    this.mesh.rotation.y = this.recoilSide;
  }

  canShoot() {
    return this.cooldown <= 0 && this.reloadTimer <= 0 && this.ammo > 0;
  }

  reload() {
    if (this.reloadTimer > 0 || this.ammo >= this.config.magazineSize || this.reserve <= 0) return false;
    this.reloadTimer = this.config.reloadTime;
    this.audio.reload();
    return true;
  }

  shoot(origin, direction, isAds, stats, bots, world) {
    if (!this.canShoot()) {
      if (this.ammo <= 0) this.reload();
      return null;
    }

    this.ammo -= 1;
    this.cooldown = 1 / this.config.fireRate;
    this.recoilKick = isAds ? this.config.weaponKickAds : this.config.weaponKickHip;
    this.recoilTilt = isAds ? -0.045 : -0.085;
    this.recoilSide = rand(-0.028, 0.028) * (isAds ? 0.45 : 1);
    this.audio.shot();
    stats.recordShot();

    const spread = isAds ? this.config.spreadAds : this.config.spreadHip;
    const finalDirection = direction.clone();
    finalDirection.x += rand(-spread, spread);
    finalDirection.y += rand(-spread, spread);
    finalDirection.z += rand(-spread, spread);
    finalDirection.normalize();

    const ray = new THREE.Raycaster(origin, finalDirection, 0, this.config.range);
    const wallHits = ray.intersectObjects(world.occluders, false);
    const wallDistance = wallHits[0]?.distance ?? Infinity;

    let best = null;
    for (const bot of bots) {
      if (!bot.alive) continue;
      const hit = bot.intersectRay(ray);
      if (hit && hit.distance < wallDistance && (!best || hit.distance < best.distance)) best = hit;
    }

    if (best) {
      world.spawnTracer(this.muzzlePosition(), best.point, this.config.tracerColor, this.config.model === 'marksman' ? 0.038 : 0.026, this.config.model === 'marksman' ? 0.11 : 0.075);
      const damage = DAMAGE[best.part];
      const killed = best.bot.takeDamage(damage);
      stats.recordHit({ headshot: best.part === 'head', damage });
      if (best.part === 'head') this.audio.head();
      else this.audio.hit();
      if (killed) stats.recordKill();
      world.spawnImpact(best.point, best.part === 'head' ? 0xfff2a1 : best.part === 'legs' ? 0x8fd0ff : 0x78e9c0);
      world.spawnDamageText(best.point, `${best.part.toUpperCase()} ${damage}`, best.part === 'head' ? '#fff2a1' : best.part === 'legs' ? '#8fd0ff' : '#78e9c0');
      return best;
    }

    const missPoint = wallHits[0]?.point ?? origin.clone().add(finalDirection.multiplyScalar(this.config.range));
    world.spawnTracer(this.muzzlePosition(), missPoint, this.config.tracerColor, this.config.model === 'marksman' ? 0.034 : 0.022, this.config.model === 'marksman' ? 0.1 : 0.07);
    world.spawnImpact(missPoint, 0xdfe9e6);
    return null;
  }

  muzzlePosition() {
    return new THREE.Vector3(this.config.muzzleOffset.x, this.config.muzzleOffset.y, this.config.muzzleOffset.z)
      .applyQuaternion(this.camera.quaternion)
      .add(this.camera.position);
  }

  applyRecoil(player) {
    const factor = player.isAds ? this.config.viewKickAds : this.config.viewKickHip;
    player.pitch = Math.min(1.45, player.pitch + factor);
    player.yaw += rand(-factor * 0.75, factor * 0.75);
  }
}

function modelColor(config) {
  if (config.model === 'marksman') return 0xfff2a1;
  if (config.model === 'sidearm') return 0xffd28a;
  return 0x78e9c0;
}
