import * as THREE from 'three';
import { PLAYER, WEAPON } from './config.js';
import { clamp, lerp } from './utils.js';

export class Player {
  constructor(camera) {
    this.camera = camera;
    this.position = new THREE.Vector3(PLAYER.spawn.x, PLAYER.spawn.y, PLAYER.spawn.z);
    this.velocity = new THREE.Vector3();
    this.yaw = 0;
    this.pitch = 0;
    this.health = PLAYER.maxHealth;
    this.dead = false;
    this.respawnAt = 0;
    this.invulnerableUntil = 0;
    this.onGround = false;
    this.isAds = false;
    this.isRunning = true;
    this.damageFlash = 0;
    this.lastPositions = [];
    this.applyCamera();
  }

  reset(now) {
    this.position.set(PLAYER.spawn.x, PLAYER.spawn.y, PLAYER.spawn.z);
    this.velocity.set(0, 0, 0);
    this.yaw = 0;
    this.pitch = 0;
    this.health = PLAYER.maxHealth;
    this.dead = false;
    this.respawnAt = now;
    this.invulnerableUntil = now + PLAYER.spawnProtection;
    this.applyCamera();
  }

  addLook(dx, dy, ads) {
    const sensitivity = ads ? 0.00115 : 0.00185;
    this.yaw -= dx * sensitivity;
    this.pitch -= dy * sensitivity;
    this.pitch = clamp(this.pitch, -1.45, 1.45);
  }

  forward() {
    return new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)).normalize();
  }

  right() {
    return new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw)).normalize();
  }

  viewDirection() {
    return new THREE.Vector3(
      -Math.sin(this.yaw) * Math.cos(this.pitch),
      Math.sin(this.pitch),
      -Math.cos(this.yaw) * Math.cos(this.pitch)
    ).normalize();
  }

  update(dt, input, colliders, now, weaponConfig = WEAPON) {
    if (this.dead) {
      if (now >= this.respawnAt) this.reset(now);
      return;
    }

    this.isAds = input.ads;
    this.isRunning = input.run;
    const move = new THREE.Vector3();
    if (input.forward) move.add(this.forward());
    if (input.backward) move.sub(this.forward());
    if (input.right) move.add(this.right());
    if (input.left) move.sub(this.right());
    if (move.lengthSq() > 0) move.normalize();

    const speed = this.isAds ? PLAYER.adsSpeed : (this.isRunning ? PLAYER.runSpeed : PLAYER.walkSpeed);
    this.velocity.x = move.x * speed;
    this.velocity.z = move.z * speed;
    this.velocity.y -= PLAYER.gravity * dt;
    if (input.jump && this.onGround) {
      this.velocity.y = PLAYER.jumpVelocity;
      this.onGround = false;
    }

    const next = this.position.clone();
    next.x += this.velocity.x * dt;
    this.resolveHorizontal(next, colliders, 'x');
    next.z += this.velocity.z * dt;
    this.resolveHorizontal(next, colliders, 'z');
    next.y += this.velocity.y * dt;

    if (next.y <= PLAYER.height) {
      next.y = PLAYER.height;
      this.velocity.y = 0;
      this.onGround = true;
    }

    this.position.copy(next);
    this.damageFlash = Math.max(0, this.damageFlash - dt * 2.6);
    this.camera.fov = lerp(this.camera.fov, this.isAds ? weaponConfig.zoomFov : weaponConfig.baseFov, Math.min(1, dt * 12));
    this.camera.updateProjectionMatrix();
    this.applyCamera();

    this.lastPositions.push({ time: now, position: this.position.clone() });
    while (this.lastPositions.length > 80 || (this.lastPositions[0] && now - this.lastPositions[0].time > 4)) {
      this.lastPositions.shift();
    }
  }

  resolveHorizontal(next, colliders, axis) {
    const probe = new THREE.Vector3(this.position.x, PLAYER.height * 0.5, this.position.z);
    probe[axis] = next[axis];
    for (const box of colliders) {
      const closest = box.clampPoint(probe, new THREE.Vector3());
      const dx = probe.x - closest.x;
      const dz = probe.z - closest.z;
      const distSq = dx * dx + dz * dz;
      if (distSq < PLAYER.radius * PLAYER.radius && probe.y < box.max.y + 0.15) {
        next[axis] = this.position[axis];
        return;
      }
    }
  }

  applyCamera() {
    this.camera.position.copy(this.position);
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;
  }

  takeDamage(amount, now) {
    if (this.dead) return false;
    if (now < this.invulnerableUntil) return false;
    this.health = Math.max(0, this.health - amount);
    this.damageFlash = 1;
    if (this.health <= 0) {
      this.dead = true;
      this.respawnAt = now + PLAYER.respawnDelay;
      return true;
    }
    return false;
  }
}
