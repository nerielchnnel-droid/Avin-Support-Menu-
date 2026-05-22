import * as THREE from 'three';
import { DAMAGE, DIFFICULTIES, PLAYER, WEAPON } from './config.js';
import { chance, clamp, horizontalDistance, rand, randomFrom } from './utils.js';

const suitMat = new THREE.MeshStandardMaterial({ color: 0xb94e49, roughness: 0.82 });
const headMat = new THREE.MeshStandardMaterial({ color: 0xffc86b, roughness: 0.72 });
const armorMat = new THREE.MeshStandardMaterial({ color: 0x263d3b, roughness: 0.78, metalness: 0.08 });
const darkMat = new THREE.MeshStandardMaterial({ color: 0x111b1a, roughness: 0.9, metalness: 0.05 });
const visorMat = new THREE.MeshStandardMaterial({ color: 0x8fd0ff, roughness: 0.25, metalness: 0.12, transparent: true, opacity: 0.76 });
const accentMat = new THREE.MeshStandardMaterial({ color: 0x78e9c0, roughness: 0.58, metalness: 0.08 });

export class BotManager {
  constructor(scene, map, audio, stats) {
    this.scene = scene;
    this.map = map;
    this.audio = audio;
    this.stats = stats;
    this.bots = [];
    this.mode = null;
    this.difficulty = null;
    this.wave = 1;
    this.waveTimer = 0;
  }

  configure(mode, difficultyKey) {
    this.clear();
    this.mode = mode;
    this.difficulty = DIFFICULTIES[difficultyKey];
    this.wave = 1;
    this.waveTimer = 0;
    const count = mode.duel ? 1 : mode.bots;
    for (let i = 0; i < count; i += 1) this.spawnBot(i);
  }

  clear() {
    this.bots.forEach((bot) => bot.dispose());
    this.bots = [];
  }

  spawnBot(index = 0) {
    const peek = this.mode?.peek ? randomFrom(this.map.peekCovers) : null;
    const position = peek ? randomFrom([peek.left, peek.right]).clone() : this.map.randomSpawn();
    const bot = new Bot(this.scene, position, this.difficulty, {
      moving: this.mode?.moving,
      peek,
      duel: this.mode?.duel,
      index
    });
    this.bots.push(bot);
    return bot;
  }

  update(dt, player, now) {
    for (const bot of this.bots) {
      bot.update(dt, player, now, this.map, this.audio, this.stats);
      if (!bot.alive && bot.respawnAt <= now && !this.mode?.waves) bot.respawn(this.map, this.mode);
    }

    if (this.mode?.waves) {
      const aliveCount = this.bots.filter((bot) => bot.alive).length;
      if (aliveCount === 0) {
        this.waveTimer -= dt;
        if (this.waveTimer <= 0) {
          this.wave += 1;
          const count = clamp(3 + this.wave, 4, 12);
          this.clear();
          for (let i = 0; i < count; i += 1) this.spawnBot(i);
          this.waveTimer = 2.2;
        }
      } else {
        this.waveTimer = 1.5;
      }
    }
  }
}

export class Bot {
  constructor(scene, position, difficulty, behavior) {
    this.scene = scene;
    this.difficulty = difficulty;
    this.behavior = behavior;
    this.group = this.createMesh();
    this.group.position.copy(position);
    this.scene.add(this.group);
    this.health = PLAYER.maxHealth;
    this.alive = true;
    this.respawnAt = 0;
    this.ammo = WEAPON.magazineSize;
    this.reloadTimer = 0;
    this.fireCooldown = rand(0.15, 0.4);
    this.reactionTimer = rand(...difficulty.reaction);
    this.lastSeenAt = -999;
    this.memory = null;
    this.strafePhase = rand(0, Math.PI * 2);
    this.peekSide = chance(0.5) ? 'left' : 'right';
    this.peekTimer = rand(0.6, 1.8);
    this.exposure = 0;
    this.repeatPeekBonus = 0;
  }

  createMesh() {
    const group = new THREE.Group();
    const box = (size, position, material, rotation = [0, 0, 0]) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z), material);
      mesh.position.set(position.x, position.y, position.z);
      mesh.rotation.set(rotation[0], rotation[1], rotation[2]);
      group.add(mesh);
      return mesh;
    };

    const cyl = (radius, depth, position, material, rotation = [0, 0, 0], segments = 12) => {
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, depth, segments), material);
      mesh.position.set(position.x, position.y, position.z);
      mesh.rotation.set(rotation[0], rotation[1], rotation[2]);
      group.add(mesh);
      return mesh;
    };

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.88, 0.34), suitMat);
    body.position.y = 1.08;
    body.name = 'bot-body';
    group.add(body);

    const neck = cyl(0.11, 0.18, { x: 0, y: 1.5, z: 0 }, headMat, [0, 0, 0], 10);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 14, 12), headMat);
    head.position.y = 1.72;
    head.name = 'bot-head';
    group.add(head);

    const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.265, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.58), darkMat);
    helmet.position.set(0, 1.79, 0);
    group.add(helmet);
    box({ x: 0.3, y: 0.08, z: 0.055 }, { x: 0, y: 1.72, z: -0.21 }, visorMat);
    box({ x: 0.36, y: 0.05, z: 0.07 }, { x: 0, y: 1.58, z: -0.11 }, armorMat);

    const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.72, 0.24), suitMat);
    leftLeg.position.set(-0.16, 0.36, 0);
    leftLeg.name = 'bot-legs';
    const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.72, 0.24), suitMat);
    rightLeg.position.set(0.16, 0.36, 0);
    rightLeg.name = 'bot-legs';
    group.add(leftLeg, rightLeg);

    box({ x: 0.74, y: 0.16, z: 0.28 }, { x: 0, y: 1.43, z: 0 }, armorMat);
    box({ x: 0.66, y: 0.44, z: 0.2 }, { x: 0, y: 1.13, z: -0.18 }, armorMat);
    box({ x: 0.44, y: 0.1, z: 0.035 }, { x: 0, y: 1.26, z: -0.3 }, accentMat);
    box({ x: 0.24, y: 0.16, z: 0.22 }, { x: -0.49, y: 1.34, z: 0 }, armorMat);
    box({ x: 0.24, y: 0.16, z: 0.22 }, { x: 0.49, y: 1.34, z: 0 }, armorMat);
    box({ x: 0.16, y: 0.62, z: 0.18 }, { x: -0.52, y: 0.98, z: -0.03 }, suitMat, [0.12, 0, -0.13]);
    box({ x: 0.16, y: 0.62, z: 0.18 }, { x: 0.52, y: 0.98, z: -0.03 }, suitMat, [0.12, 0, 0.13]);
    box({ x: 0.18, y: 0.12, z: 0.2 }, { x: -0.56, y: 0.63, z: -0.05 }, darkMat);
    box({ x: 0.18, y: 0.12, z: 0.2 }, { x: 0.56, y: 0.63, z: -0.05 }, darkMat);
    box({ x: 0.28, y: 0.1, z: 0.36 }, { x: -0.16, y: 0.05, z: -0.04 }, darkMat);
    box({ x: 0.28, y: 0.1, z: 0.36 }, { x: 0.16, y: 0.05, z: -0.04 }, darkMat);

    box({ x: 0.12, y: 0.1, z: 0.78 }, { x: 0.31, y: 1.2, z: -0.36 }, armorMat, [0.06, -0.08, 0]);
    cyl(0.035, 0.46, { x: 0.31, y: 1.22, z: -0.84 }, darkMat, [Math.PI / 2, 0, 0], 12);
    box({ x: 0.08, y: 0.18, z: 0.12 }, { x: 0.32, y: 1.03, z: -0.26 }, darkMat, [-0.2, 0, 0]);
    group.traverse((child) => {
      child.castShadow = true;
      child.receiveShadow = true;
    });
    this.body = body;
    this.head = head;
    this.legs = [leftLeg, rightLeg];
    return group;
  }

  dispose() {
    this.scene.remove(this.group);
    this.group.traverse((child) => {
      if (child.geometry) child.geometry.dispose();
    });
  }

  respawn(map, mode) {
    const peek = mode?.peek ? randomFrom(map.peekCovers) : null;
    this.behavior.peek = peek;
    this.group.position.copy(peek ? randomFrom([peek.left, peek.right]) : map.randomSpawn());
    this.health = PLAYER.maxHealth;
    this.alive = true;
    this.ammo = WEAPON.magazineSize;
    this.reloadTimer = 0;
    this.fireCooldown = rand(0.25, 0.7);
    this.reactionTimer = rand(...this.difficulty.reaction);
    this.group.visible = true;
  }

  update(dt, player, now, map, audio, stats) {
    if (!this.alive) return;
    if (player.dead) return;

    this.updateMovement(dt, player, map);
    this.face(player.position);
    if (now < player.invulnerableUntil) return;
    const visible = this.canSeePlayer(player, map);

    if (visible) {
      this.lastSeenAt = now;
      this.memory = player.position.clone();
      this.reactionTimer = Math.max(0, this.reactionTimer - dt);
      this.updateRepeatPeek(player, now);
    } else {
      this.reactionTimer = rand(...this.difficulty.reaction);
    }

    if (this.reloadTimer > 0) {
      this.reloadTimer -= dt;
      if (this.reloadTimer <= 0) this.ammo = WEAPON.magazineSize;
      return;
    }

    this.fireCooldown -= dt;
    if (visible && this.reactionTimer <= 0 && this.fireCooldown <= 0) {
      this.tryShoot(player, now, map, audio, stats);
    }
  }

  updateMovement(dt, player, map) {
    const pos = this.group.position;
    const previous = pos.clone();
    if (this.behavior.peek) {
      this.peekTimer -= dt;
      if (this.peekTimer <= 0) {
        this.peekSide = this.peekSide === 'left' ? 'right' : 'left';
        this.peekTimer = rand(0.65, 1.35);
      }
      const target = this.behavior.peek[this.peekSide].clone();
      const hide = this.behavior.peek.cover.clone();
      const shouldHide = this.peekTimer < 0.35;
      const goal = shouldHide ? hide : target;
      pos.lerp(goal, Math.min(1, dt * 5.5));
    } else if (this.behavior.moving || this.behavior.duel) {
      const toPlayer = player.position.clone().sub(pos);
      toPlayer.y = 0;
      const right = new THREE.Vector3(-toPlayer.z, 0, toPlayer.x).normalize();
      const speed = this.difficulty.strafe * (this.behavior.duel ? 1.15 : 0.8);
      pos.addScaledVector(right, Math.sin(performance.now() * 0.004 + this.strafePhase) * speed * dt);
      if (horizontalDistance(pos, player.position) > 26) pos.lerp(player.position, dt * 0.12);
    }

    pos.x = clamp(pos.x, -20, 20);
    pos.z = clamp(pos.z, -25, 24);
    if (map.isInPlayerSafeZone(pos)) {
      pos.z = Math.min(pos.z, 6.75);
      if (Math.abs(pos.x) < 8) pos.x = pos.x < 0 ? -8 : 8;
    }
    map.resolveActorMovement(pos, previous, 0.38);
  }

  face(target) {
    const dx = target.x - this.group.position.x;
    const dz = target.z - this.group.position.z;
    this.group.rotation.y = Math.atan2(dx, dz);
  }

  eyePosition() {
    return this.group.position.clone().add(new THREE.Vector3(0, 1.65, 0));
  }

  canSeePlayer(player, map) {
    const origin = this.eyePosition();
    const target = player.position.clone().add(new THREE.Vector3(0, -0.08, 0));
    const dir = target.clone().sub(origin);
    const distance = dir.length();
    if (distance > 42) return false;
    dir.normalize();

    const forward = new THREE.Vector3(Math.sin(this.group.rotation.y), 0, Math.cos(this.group.rotation.y)).normalize();
    const flatDir = dir.clone();
    flatDir.y = 0;
    flatDir.normalize();
    if (forward.dot(flatDir) < 0.48) return false;

    const ray = new THREE.Raycaster(origin, dir, 0, distance);
    const wallHit = ray.intersectObjects(map.occluders, false)[0];
    return !wallHit || wallHit.distance >= distance - 0.18;
  }

  updateRepeatPeek(player, now) {
    const recent = player.lastPositions.filter((item) => now - item.time < 2.7);
    if (recent.length < 12) {
      this.repeatPeekBonus = Math.max(0, this.repeatPeekBonus - 0.02);
      return;
    }
    const avg = recent.reduce((sum, item) => sum.add(item.position), new THREE.Vector3()).multiplyScalar(1 / recent.length);
    const variance = recent.reduce((sum, item) => sum + horizontalDistance(avg, item.position), 0) / recent.length;
    this.repeatPeekBonus = variance < 1.1 ? clamp(this.repeatPeekBonus + 0.015, 0, 0.18) : Math.max(0, this.repeatPeekBonus - 0.018);
  }

  tryShoot(player, now, map, audio, stats) {
    if (this.ammo <= 0) {
      this.reloadTimer = WEAPON.reloadTime * rand(0.85, 1.25);
      audio.reload();
      return;
    }

    this.ammo -= 1;
    this.fireCooldown = this.difficulty.burstDelay * rand(0.82, 1.22);
    audio.shot();

    const origin = this.eyePosition();
    const target = player.position.clone();
    const predictionChance = clamp(this.difficulty.predict + this.repeatPeekBonus, 0, 0.88);
    if (chance(predictionChance) && player.lastPositions.length > 4) {
      const latest = player.lastPositions[player.lastPositions.length - 1];
      const older = player.lastPositions[Math.max(0, player.lastPositions.length - 10)];
      const velocity = latest.position.clone().sub(older.position).multiplyScalar(1 / Math.max(0.01, latest.time - older.time));
      target.addScaledVector(velocity, rand(0.08, 0.24));
    }

    const wantsHead = chance(clamp(this.difficulty.headshot + this.repeatPeekBonus * 0.7, 0, 0.78));
    target.y += wantsHead ? -0.02 : -0.55;

    const distance = origin.distanceTo(target);
    const accuracy = clamp(this.difficulty.accuracy - distance * 0.006, 0.1, 0.94);
    const miss = chance(1 - accuracy);
    const aimError = this.difficulty.spread * (miss ? rand(2.0, 4.5) : rand(0.2, 1.1));
    target.x += rand(-aimError, aimError) * distance;
    target.y += rand(-aimError, aimError) * distance * 0.55;
    target.z += rand(-aimError, aimError) * distance;

    const dir = target.sub(origin).normalize();
    const ray = new THREE.Raycaster(origin, dir, 0, WEAPON.range);
    const wallHit = ray.intersectObjects(map.occluders, false)[0];
    const playerDistance = origin.distanceTo(player.position);
    if (wallHit && wallHit.distance < playerDistance - 0.2) return;

    const headCenter = player.position.clone().add(new THREE.Vector3(0, 0.03, 0));
    const bodyCenter = player.position.clone().add(new THREE.Vector3(0, -0.55, 0));
    const legCenter = player.position.clone().add(new THREE.Vector3(0, -1.08, 0));
    const rayToHead = distanceFromRay(ray.ray, headCenter);
    const rayToBody = distanceFromRay(ray.ray, bodyCenter);
    const rayToLegs = distanceFromRay(ray.ray, legCenter);

    let damage = 0;
    let tracerEnd = origin.clone().addScaledVector(dir, Math.min(WEAPON.range, playerDistance + 3));
    let part = 'body';
    if (rayToHead < 0.16) {
      damage = DAMAGE.head;
      part = 'head';
    } else if (rayToBody < 0.36) {
      damage = DAMAGE.body;
      part = 'body';
    } else if (rayToLegs < 0.3) {
      damage = DAMAGE.legs;
      part = 'legs';
    }

    if (damage > 0) {
      tracerEnd = player.position.clone().add(new THREE.Vector3(0, part === 'head' ? 0 : part === 'legs' ? -1.08 : -0.55, 0));
      const killed = player.takeDamage(Math.round(damage), now);
      audio.hurt();
      if (killed) stats.recordDeath(now);
      map.spawnImpact(tracerEnd, part === 'head' ? 0xffc86b : part === 'legs' ? 0x8fd0ff : 0xbe514b);
      map.spawnDamageText(tracerEnd, `-${damage}`, part === 'head' ? '#ffc86b' : part === 'legs' ? '#8fd0ff' : '#ff6b4d');
    }
    map.spawnTracer(origin, tracerEnd, 0xff6b4d, 0.032, 0.14);
  }

  intersectRay(raycaster) {
    const hits = raycaster.intersectObjects([this.head, this.body, ...this.legs], false);
    if (!hits.length) return null;
    const hit = hits[0];
    return {
      bot: this,
      distance: hit.distance,
      point: hit.point,
      part: hit.object === this.head ? 'head' : this.legs.includes(hit.object) ? 'legs' : 'body'
    };
  }

  takeDamage(amount) {
    if (!this.alive) return false;
    this.health -= amount;
    this.group.scale.setScalar(0.96);
    window.setTimeout(() => this.group.scale.setScalar(1), 65);
    if (this.health <= 0) {
      this.alive = false;
      this.group.visible = false;
      this.respawnAt = performance.now() / 1000 + rand(0.65, 1.4);
      return true;
    }
    return false;
  }
}

function distanceFromRay(ray, point) {
  const projected = new THREE.Vector3();
  ray.closestPointToPoint(point, projected);
  return projected.distanceTo(point);
}
