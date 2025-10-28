# Fireworks Playground

A modern, cinematic 3D fireworks sandbox built with React, Three.js, and Vite. The experience renders an endless fireworks show with post-processing bloom, depth-of-field, and accessibility options, while exposing an extensive glassmorphism control panel for live tuning.

## Features

- Continuous scheduler that keeps at least three fireworks bursts in the sky with staggered launches and spatial sparsity.
- Click anywhere (or drag with cursor trail enabled) to spawn fireworks at that sky position.
- Multiple burst archetypes (peony, ring, willow, palm, crossette, comet) with GPU-instanced particle rendering, turbulence, trails, and optional reduce-motion mode.
- Rich control sections covering show flow, interaction, spawn layout, shell physics, environment, post-processing, color palette editing, and preset management.
- Global and per-color glow controls, HDR rendering toggle, bloom strength/threshold/radius, and motion blur.
- Preset system with curated looks (Festival, Golden Hour, Minimal Mono, Neon Galaxy) plus user-defined JSON snapshots.
- Screenshot capture and lightweight WebM recording helper.

## Getting Started

1. Install dependencies (requires Node 18+):

   ```bash
   npm install
   ```

   > **Note:** Package installation may require outbound network access to npm. If registry access is restricted, configure the environment proxy or mirror before running the command.

2. Start the development server:

   ```bash
   npm run dev
   ```

3. Open the app at [http://localhost:5173](http://localhost:5173) to explore the playground. The UI is responsive and supports desktop or mobile layouts.

4. Build for production:

   ```bash
   npm run build
   ```

## Controls Overview

- **Show Control:** Play/pause, concurrency limits, launch staggering, rate, seed reseeding, reduce-motion, fullscreen, FPS readout.
- **Interaction:** Click-to-burst toggle, altitude multiplier, optional cursor-follow spawning.
- **Spawn & Layout:** Launch radius, spacing, altitude ranges, lateral spread, Poisson-disc radius.
- **Shell & Burst:** Burst type weights, particle counts, velocity, spread, fuse delay, trails, sparkle chance, fragmentation, per-shell glow.
- **Physics & Environment:** Gravity, drag, wind vector, turbulence settings, ground collision handling.
- **PostFX & Rendering:** Exposure, bloom controls, DOF, motion blur, glow override, particle size, HDR toggle.
- **Color Palettes:** Edit palette colors/weights/glow, manage gradient or solid backgrounds, starfield overlay.
- **Presets & Export:** Load curated looks, save/load JSON snapshots, take screenshots, capture short WebM clips.

## Accessibility

- Reduce Motion mode lowers particle counts and disables aggressive trails for motion-sensitive viewers.
- UI uses high-contrast glass styling, responsive layout, and supports keyboard navigation for inputs.

## License

Distributed under the MIT License. See `LICENSE.md` for details.
