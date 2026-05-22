import * as THREE from 'three';
import './styles.css';
import { DIFFICULTIES, GAME_MODES, PLAYER, WEAPON, WEAPONS } from './config.js';
import { BotManager } from './botAI.js';
import { Player } from './player.js';
import { StatsTracker } from './stats.js';
import { TrainingMap } from './map.js';
import { UI } from './UI.js';
import { createAudio } from './utils.js';
import { Weapon } from './weapon.js';

class Game {
  constructor() {
    this.root = document.querySelector('#app');
    this.ui = new UI(this.root);
    this.clock = new THREE.Clock();
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x96bdc6);
    this.scene.fog = new THREE.Fog(0x96bdc6, 38, 78);

    this.camera = new THREE.PerspectiveCamera(WEAPON.baseFov, window.innerWidth / window.innerHeight, 0.05, 180);
    this.scene.add(this.camera);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.ui.mountCanvas(this.renderer.domElement);

    this.map = new TrainingMap(this.scene);
    this.audio = createAudio();
    this.player = new Player(this.camera);
    this.weapon = new Weapon(this.camera, this.audio);
    this.stats = new StatsTracker();
    this.bots = new BotManager(this.scene, this.map, this.audio, this.stats);
    this.input = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      jump: false,
      run: true,
      ads: false,
      fire: false
    };
    this.isTouchDevice = this.shouldUseTouchControls();
    this.touchLook = {
      active: false,
      pointerId: null,
      x: 0,
      y: 0
    };
    this.weaponSlots = Object.values(WEAPONS).sort((a, b) => a.slot - b.slot);
    this.running = false;
    this.paused = true;
    this.modeKey = 'static';
    this.difficultyKey = 'normal';
    this.endsAt = 0;
    this.messageTimer = 0;
    this.message = '';

    this.bindEvents();
    this.animate();
  }

  bindEvents() {
    window.addEventListener('resize', () => this.resize());
    document.addEventListener('keydown', (event) => this.onKey(event, true));
    document.addEventListener('keyup', (event) => this.onKey(event, false));
    document.addEventListener('mousemove', (event) => {
      if (document.pointerLockElement === this.renderer.domElement && this.running && !this.paused) {
        this.player.addLook(event.movementX, event.movementY, this.input.ads);
      }
    });
    document.addEventListener('mousedown', (event) => {
      if (!this.running || this.paused) return;
      if (event.button === 0) this.input.fire = true;
      if (event.button === 2) this.input.ads = true;
    });
    document.addEventListener('mouseup', (event) => {
      if (event.button === 0) this.input.fire = false;
      if (event.button === 2) this.input.ads = false;
    });
    document.addEventListener('contextmenu', (event) => event.preventDefault());
    document.addEventListener('pointerlockchange', () => {
      if (this.running && document.pointerLockElement !== this.renderer.domElement) {
        this.pauseToMenu('일시정지됨');
      }
    });
    this.renderer.domElement.addEventListener('click', () => {
      if (!this.isTouchDevice && this.running && !this.paused && document.pointerLockElement !== this.renderer.domElement) {
        this.requestPointerLock();
      }
    });
    this.bindTouchControls();
    this.ui.on('start', ({ mode, difficulty }) => this.start(mode, difficulty));
    this.ui.on('restart', () => this.start(this.modeKey, this.difficultyKey));
    this.ui.on('menu', () => this.stop());
  }

  shouldUseTouchControls() {
    return window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window || window.innerWidth <= 900;
  }

  bindTouchControls() {
    const touchMap = {
      forward: 'forward',
      backward: 'backward',
      left: 'left',
      right: 'right',
      jump: 'jump',
      fire: 'fire',
      ads: 'ads'
    };

    this.root.querySelectorAll('[data-touch]').forEach((button) => {
      const inputKey = touchMap[button.dataset.touch];
      const setPressed = (pressed, event) => {
        event.preventDefault();
        if (!inputKey) return;
        this.input[inputKey] = pressed;
        button.classList.toggle('active', pressed);
      };
      button.addEventListener('pointerdown', (event) => {
        button.setPointerCapture?.(event.pointerId);
        setPressed(true, event);
      });
      button.addEventListener('pointerup', (event) => setPressed(false, event));
      button.addEventListener('pointercancel', (event) => setPressed(false, event));
      button.addEventListener('pointerleave', (event) => {
        if (event.buttons === 0) setPressed(false, event);
      });
    });

    this.root.querySelector('[data-touch-tap="reload"]')?.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      if (this.running && !this.paused) this.weapon.reload();
    });

    this.root.querySelector('[data-touch-tap="weapon"]')?.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      if (this.running && !this.paused) this.switchToNextWeapon();
    });

    this.renderer.domElement.addEventListener('pointerdown', (event) => {
      if (!this.isTouchDevice || !this.running || this.paused || event.pointerType === 'mouse') return;
      this.touchLook.active = true;
      this.touchLook.pointerId = event.pointerId;
      this.touchLook.x = event.clientX;
      this.touchLook.y = event.clientY;
      this.renderer.domElement.setPointerCapture?.(event.pointerId);
      event.preventDefault();
    });

    this.renderer.domElement.addEventListener('pointermove', (event) => {
      if (!this.touchLook.active || event.pointerId !== this.touchLook.pointerId) return;
      const dx = event.clientX - this.touchLook.x;
      const dy = event.clientY - this.touchLook.y;
      this.touchLook.x = event.clientX;
      this.touchLook.y = event.clientY;
      this.player.addLook(dx * 1.35, dy * 1.35, this.input.ads);
      event.preventDefault();
    });

    const endLook = (event) => {
      if (event.pointerId !== this.touchLook.pointerId) return;
      this.touchLook.active = false;
      this.touchLook.pointerId = null;
    };
    this.renderer.domElement.addEventListener('pointerup', endLook);
    this.renderer.domElement.addEventListener('pointercancel', endLook);
  }

  onKey(event, isDown) {
    const key = event.code;
    if (key === 'KeyW') this.input.forward = isDown;
    if (key === 'KeyS') this.input.backward = isDown;
    if (key === 'KeyA') this.input.left = isDown;
    if (key === 'KeyD') this.input.right = isDown;
    if (key === 'Space') {
      this.input.jump = isDown;
      if (isDown) event.preventDefault();
    }
    if (key === 'ShiftLeft' && isDown) this.input.run = !this.input.run;
    if (key === 'KeyR' && isDown && this.running && !this.paused) this.weapon.reload();
    const slot = Number(key.replace('Digit', ''));
    if (slot >= 1 && slot <= 7 && isDown && this.running && !this.paused) {
      const weapon = Object.values(WEAPONS).find((item) => item.slot === slot);
      if (weapon && this.weapon.switchWeapon(weapon.id)) this.flashMessage(`${this.weapon.config.name} 장착`, 1.2);
    }
    if (key === 'Escape' && isDown && this.running) this.pauseToMenu('메뉴 열림');
  }

  start(modeKey, difficultyKey) {
    this.modeKey = modeKey;
    const mode = GAME_MODES[modeKey];
    this.difficultyKey = mode.forceDifficulty ?? difficultyKey;
    const difficulty = DIFFICULTIES[this.difficultyKey];
    this.running = true;
    this.paused = false;
    this.stats.reset();
    this.player.reset(performance.now() / 1000);
    this.weapon.resetAmmo();
    this.bots.configure(mode, this.difficultyKey);
    this.endsAt = performance.now() / 1000 + mode.duration;
    this.message = this.isTouchDevice ? '왼쪽 버튼 이동 / 오른쪽 버튼 발사와 정조준' : '좌클릭 발사 / 우클릭 정조준';
    this.messageTimer = 3;
    this.ui.showHud(mode, difficulty);
    if (!this.isTouchDevice) this.requestPointerLock();
  }

  switchToNextWeapon() {
    const currentIndex = this.weaponSlots.findIndex((item) => item.id === this.weapon.activeWeaponId);
    const next = this.weaponSlots[(currentIndex + 1) % this.weaponSlots.length];
    if (next && this.weapon.switchWeapon(next.id)) this.flashMessage(`${this.weapon.config.name} 장착`, 1.2);
  }

  flashMessage(message, duration = 2) {
    this.message = message;
    this.messageTimer = duration;
  }

  requestPointerLock() {
    try {
      const lock = this.renderer.domElement.requestPointerLock?.();
      if (lock?.catch) {
        lock.catch(() => {
          this.message = '게임 화면을 한 번 클릭하면 마우스가 고정됩니다.';
          this.messageTimer = 4;
        });
      }
    } catch (error) {
      this.message = '게임 화면을 한 번 클릭하면 마우스가 고정됩니다.';
      this.messageTimer = 4;
    }
  }

  stop() {
    this.running = false;
    this.paused = true;
    this.input.fire = false;
    this.input.ads = false;
    this.input.forward = false;
    this.input.backward = false;
    this.input.left = false;
    this.input.right = false;
    this.input.jump = false;
    this.root.querySelectorAll('.touch-button.active').forEach((button) => button.classList.remove('active'));
    if (document.pointerLockElement === this.renderer.domElement) document.exitPointerLock();
  }

  pauseToMenu(message) {
    this.paused = true;
    this.input.fire = false;
    this.input.ads = false;
    this.message = message;
    this.messageTimer = 2;
    this.ui.showMenu();
  }

  resize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.isTouchDevice = this.shouldUseTouchControls();
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    const dt = Math.min(0.05, this.clock.getDelta());
    const now = performance.now() / 1000;
    this.update(dt, now);
    this.renderer.render(this.scene, this.camera);
  }

  update(dt, now) {
    this.map.update(dt);
    if (!this.running || this.paused) return;

    this.messageTimer = Math.max(0, this.messageTimer - dt);
    const mode = GAME_MODES[this.modeKey];
    const remaining = this.endsAt - now;
    if (remaining <= 0) {
      this.finish(now);
      return;
    }

    this.player.update(dt, this.input, this.map.colliders, now, this.weapon.config);
    this.weapon.update(dt, this.player.isAds);
    if (this.input.fire) {
      const origin = this.camera.position.clone();
      const hit = this.weapon.shoot(origin, this.player.viewDirection(), this.player.isAds, this.stats, this.bots.bots, this.map);
      if (hit || this.weapon.cooldown > 0) this.weapon.applyRecoil(this.player);
    }
    this.bots.update(dt, this.player, now);
    this.updateScreenEffects();
    this.ui.updateHud({
      player: this.player,
      weapon: this.weapon,
      stats: this.stats,
      remaining,
      weaponName: this.weapon.config.name,
      scoped: this.player.isAds && this.weapon.config.zoomFov <= 35,
      message: this.messageTimer > 0 ? this.message : ''
    });

    if (mode.duel && this.stats.kills >= 15) this.finish(now);
  }

  finish(now) {
    this.running = false;
    this.paused = true;
    this.input.fire = false;
    this.input.ads = false;
    if (document.pointerLockElement === this.renderer.domElement) document.exitPointerLock();
    this.ui.showResults(this.stats, now);
  }

  updateScreenEffects() {
    const intensity = this.player.damageFlash;
    if (intensity <= 0) {
      this.renderer.domElement.style.filter = '';
      return;
    }
    this.renderer.domElement.style.filter = `saturate(${1 + intensity * 0.8}) brightness(${1 - intensity * 0.18})`;
  }
}

new Game();
