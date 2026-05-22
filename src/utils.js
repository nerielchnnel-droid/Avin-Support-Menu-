import * as THREE from 'three';

export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export const lerp = (a, b, t) => a + (b - a) * t;
export const rand = (min, max) => min + Math.random() * (max - min);
export const chance = (value) => Math.random() < value;

export function randomFrom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

export function disposeObject(object) {
  object.traverse((child) => {
    if (child.geometry) child.geometry.dispose();
    if (child.material) {
      if (Array.isArray(child.material)) child.material.forEach((mat) => mat.dispose());
      else child.material.dispose();
    }
  });
}

export function makeBoxCollider(center, size) {
  const box = new THREE.Box3();
  box.setFromCenterAndSize(center, size);
  return box;
}

export function horizontalDistance(a, b) {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dz * dz);
}

export function formatPercent(numerator, denominator) {
  if (!denominator) return '0%';
  return `${Math.round((numerator / denominator) * 100)}%`;
}

export function createAudio() {
  let context;

  function ensure() {
    if (!context) context = new AudioContext();
    if (context.state === 'suspended') context.resume();
    return context;
  }

  function tone(freq, duration, type = 'square', volume = 0.04) {
    const ctx = ensure();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }

  return {
    shot: () => tone(145, 0.055, 'square', 0.035),
    hit: () => tone(530, 0.08, 'triangle', 0.035),
    head: () => tone(820, 0.1, 'sine', 0.04),
    reload: () => tone(220, 0.16, 'sawtooth', 0.025),
    hurt: () => tone(90, 0.18, 'sawtooth', 0.04)
  };
}
