# Vector Range

Original browser-based tactical FPS aim trainer built with Vite and Three.js.

This project intentionally avoids names, logos, maps, weapon names, UI, sounds, characters, and other unique resources from existing commercial games. All visuals are simple procedural low-poly geometry.

## Features

- First-person WebGL gameplay with pointer lock
- WASD movement, jump, walk/run toggle, ADS, fire, reload, and weapon switching
- Seven original classic-inspired weapons with separate magazines, recoil, spread, ADS zoom, ADS movement penalty, and reload timing
- Health, damage, death, and respawn
- 150 max health with head/body/leg damage: 150 / 40 / 10
- Head/body/leg hitboxes with damage popups
- Bots with sight checks, wall occlusion, reaction delay, accuracy, headshot chance, prediction, strafing, peeking, ammo, and reloads
- Easy, Normal, Hard, and Nightmare difficulty values in `src/config.js`
- Static Bots, Moving Bots, Peek Training, Duel Mode, Wave Mode, and Nightmare Challenge
- HUD and result screen with shots, hits, accuracy, headshots, kills, deaths, average survival, and score
- Lightweight generated firing, hit, hurt, and reload sounds using Web Audio

## Controls

### PC

- `W A S D`: Move
- `Mouse`: Look
- `Space`: Jump
- `Shift`: Toggle walk/run
- `R`: Reload
- `1`: Woodline Carbine
- `2`: Pioneer Bayonet
- `3`: Carryline Rifle
- `4`: Grenadier Rifle
- `5`: Compact Carbine
- `6`: Marksman Rifle
- `7`: Service Pistol
- `Left click`: Fire
- `Right click`: Aim down sights
- `ESC`: Open menu / release pointer lock

### Mobile / Touch

- Left on-screen arrows: Move
- Drag empty screen: Look
- `발사`: Fire
- `정조준`: Aim down sights
- `점프`: Jump
- `장전`: Reload
- `무기`: Cycle weapon

## Run

```bash
npm install
npm run dev
```

Open the local URL shown by Vite.

On Windows PowerShell, if `npm` is blocked by the execution policy, use:

```bash
npm.cmd install
npm.cmd run dev
```

## Build

```bash
npm run build
```

The generated `dist` folder can be deployed to Vercel, Netlify, or GitHub Pages.

## Project Structure

```text
src/
  main.js       Game loop, renderer, input, pointer lock
  player.js     First-person movement, health, respawn
  weapon.js     Rifle ammo, reload, recoil, spread, ray hits
  botAI.js      Difficulty-aware bot combat logic
  map.js        Original low-poly training map and colliders
  UI.js         Menu, HUD, result screen
  config.js     Modes, difficulties, player, weapon values
  stats.js      Match statistics and final score
  utils.js      Shared helpers and procedural audio
```
