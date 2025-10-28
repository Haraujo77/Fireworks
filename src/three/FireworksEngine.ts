import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { AfterimagePass } from 'three/examples/jsm/postprocessing/AfterimagePass.js';
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
import { PaletteColor, ShellType, useSettingsStore } from '../store/settings';

const MAX_PARTICLES = 24000;

const tempVelocity = new THREE.Vector3();
const tempColor = new THREE.Color();
const up = new THREE.Vector3(0, 1, 0);

interface Burst {
  id: number;
  type: ShellType;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  exploded: boolean;
  fuseTime: number;
  age: number;
  particleCount: number;
  color: PaletteColor;
  glow: number;
  sparkleChance: number;
  fragmentCount: number;
  indices: number[];
  trailAge: number;
  launchTime: number;
  reduceMotion: boolean;
}

const mulberry32 = (a: number) => {
  return () => {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const randomOnSphere = (rand: () => number) => {
  const u = rand();
  const v = rand();
  const theta = 2 * Math.PI * u;
  const phi = Math.acos(2 * v - 1);
  const x = Math.sin(phi) * Math.cos(theta);
  const y = Math.cos(phi);
  const z = Math.sin(phi) * Math.sin(theta);
  return new THREE.Vector3(x, y, z);
};

const burstDirections: Record<ShellType, (rand: () => number) => THREE.Vector3[]> = {
  peony: (rand) => {
    const result: THREE.Vector3[] = [];
    for (let i = 0; i < 128; i++) {
      const dir = randomOnSphere(rand);
      result.push(dir);
    }
    return result;
  },
  ring: (rand) => {
    const result: THREE.Vector3[] = [];
    const radius = 1;
    for (let i = 0; i < 128; i++) {
      const angle = (i / 128) * Math.PI * 2;
      result.push(new THREE.Vector3(Math.cos(angle) * radius, (rand() - 0.5) * 0.2, Math.sin(angle) * radius));
    }
    return result;
  },
  willow: (rand) => {
    const result: THREE.Vector3[] = [];
    for (let i = 0; i < 128; i++) {
      const dir = randomOnSphere(rand);
      dir.y = Math.abs(dir.y) * 0.6 + 0.1;
      dir.multiplyScalar(0.6 + rand() * 0.4);
      result.push(dir);
    }
    return result;
  },
  palm: (rand) => {
    const result: THREE.Vector3[] = [];
    for (let i = 0; i < 128; i++) {
      const dir = randomOnSphere(rand);
      dir.y = Math.abs(dir.y);
      dir.x *= 1.4;
      dir.z *= 1.4;
      result.push(dir.normalize());
    }
    return result;
  },
  crossette: (rand) => {
    const result: THREE.Vector3[] = [];
    const axes = [
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(0, 0, 1)
    ];
    for (let i = 0; i < 128; i++) {
      const axis = axes[i % axes.length];
      const angle = (i / 128) * Math.PI * 2;
      const dir = axis.clone().applyAxisAngle(up, angle);
      result.push(dir);
    }
    return result;
  },
  comet: (rand) => {
    const result: THREE.Vector3[] = [];
    for (let i = 0; i < 128; i++) {
      const dir = randomOnSphere(rand);
      dir.y = Math.abs(dir.y);
      result.push(dir.normalize());
    }
    return result;
  }
};

export class FireworksEngine {
  private renderer: THREE.WebGLRenderer;
  private composer: EffectComposer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderPass: RenderPass;
  private bloomPass: UnrealBloomPass;
  private dofPass: BokehPass;
  private motionPass: AfterimagePass;
  private smaaPass: SMAAPass | null = null;

  private geometry: THREE.BufferGeometry;
  private material: THREE.ShaderMaterial;
  private points: THREE.Points;

  private positions: Float32Array;
  private velocities: Float32Array;
  private colors: Float32Array;
  private extras: Float32Array; // life, age, size, glow
  private owners: Int32Array;
  private activeIndices: number[] = [];
  private freeIndices: number[] = [];

  private bursts: Burst[] = [];
  private burstMap = new Map<number, Burst>();
  private nextBurstTime = 0;
  private rand: () => number;
  private clock = new THREE.Clock();
  private elapsed = 0;
  private frameCount = 0;
  private fpsAccumulator = 0;

  private canvas: HTMLCanvasElement;

  private pointerDown = false;
  private pointerLast = new THREE.Vector2();
  private pointerDownHandler = (event: PointerEvent) => this.onPointerDown(event);
  private pointerMoveHandler = (event: PointerEvent) => this.onPointerMove(event);
  private pointerUpHandler = (event: PointerEvent) => this.onPointerUp();
  private unsubscribeSeed: (() => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const { innerWidth, innerHeight, devicePixelRatio } = window;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: true
    });
    this.renderer.setPixelRatio(Math.min(2, devicePixelRatio));
    this.renderer.setSize(innerWidth, innerHeight, false);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.autoClear = false;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 2000);
    this.camera.position.set(0, 180, 420);
    this.camera.lookAt(0, 200, 0);

    this.renderPass = new RenderPass(this.scene, this.camera);
    this.bloomPass = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 1.2, 0.85, 0.7);
    this.dofPass = new BokehPass(this.scene, this.camera, {
      focus: 300,
      aperture: 0.00015,
      maxblur: 0.005
    });
    this.motionPass = new AfterimagePass(0.92);

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(this.renderPass);
    this.composer.addPass(this.bloomPass);
    this.composer.addPass(this.motionPass);

    this.rand = mulberry32(useSettingsStore.getState().scheduler.seed);
    this.unsubscribeSeed = useSettingsStore.subscribe(
      (state) => state.scheduler.seed,
      (seed) => {
        this.rand = mulberry32(seed);
      }
    );

    if ((this.renderer.capabilities.isWebGL2 ?? false) && window.devicePixelRatio > 1) {
      this.smaaPass = new SMAAPass(innerWidth * this.renderer.getPixelRatio(), innerHeight * this.renderer.getPixelRatio());
      this.composer.addPass(this.smaaPass);
    }

    this.geometry = new THREE.BufferGeometry();
    this.positions = new Float32Array(MAX_PARTICLES * 3);
    this.velocities = new Float32Array(MAX_PARTICLES * 3);
    this.colors = new Float32Array(MAX_PARTICLES * 3);
    this.extras = new Float32Array(MAX_PARTICLES * 4);
    this.owners = new Int32Array(MAX_PARTICLES).fill(-1);
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.freeIndices.push(i);
    }

    this.geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(this.positions, 3).setUsage(THREE.DynamicDrawUsage)
    );
    this.geometry.setAttribute(
      'color',
      new THREE.BufferAttribute(this.colors, 3).setUsage(THREE.DynamicDrawUsage)
    );
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.extras, 4).setUsage(THREE.DynamicDrawUsage));

    const vertexShader = `
      attribute vec3 color;
      attribute vec4 size;
      varying vec3 vColor;
      varying float vGlow;
      varying float vLife;
      void main() {
        vColor = color;
        vGlow = size.z;
        vLife = 1.0 - clamp(size.y / max(size.x, 0.0001), 0.0, 1.0);
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size.w * (300.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `;

    const fragmentShader = `
      varying vec3 vColor;
      varying float vGlow;
      varying float vLife;
      void main() {
        vec2 uv = gl_PointCoord - vec2(0.5);
        float dist = length(uv);
        if (dist > 0.5) discard;
        float alpha = smoothstep(0.5, 0.0, dist);
        float glow = mix(0.8, 1.4, vGlow);
        vec3 color = vColor * glow;
        color *= mix(0.7, 1.4, vLife);
        gl_FragColor = vec4(color, alpha * 1.2);
      }
    `;

    this.material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {},
      vertexShader,
      fragmentShader,
      vertexColors: true
    });
    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
    this.scene.add(this.points);

    this.canvas.addEventListener('pointerdown', this.pointerDownHandler);
    this.canvas.addEventListener('pointermove', this.pointerMoveHandler);
    window.addEventListener('pointerup', this.pointerUpHandler);

    this.animate = this.animate.bind(this);
    this.clock.start();
    this.animate();
  }

  private allocateParticle(): number | null {
    return this.freeIndices.pop() ?? null;
  }

  private releaseParticle(index: number) {
    const ownerId = this.owners[index];
    if (ownerId !== -1) {
      const burst = this.burstMap.get(ownerId);
      if (burst) {
        const idx = burst.indices.indexOf(index);
        if (idx !== -1) {
          burst.indices.splice(idx, 1);
        }
      }
    }
    this.owners[index] = -1;
    this.freeIndices.push(index);
  }

  private setParticle(
    index: number,
    position: THREE.Vector3,
    velocity: THREE.Vector3,
    color: THREE.Color,
    life: number,
    size: number,
    glow: number,
    ownerId: number
  ) {
    const pIndex = index * 3;
    const eIndex = index * 4;
    this.positions[pIndex] = position.x;
    this.positions[pIndex + 1] = position.y;
    this.positions[pIndex + 2] = position.z;
    this.velocities[pIndex] = velocity.x;
    this.velocities[pIndex + 1] = velocity.y;
    this.velocities[pIndex + 2] = velocity.z;
    this.colors[pIndex] = color.r;
    this.colors[pIndex + 1] = color.g;
    this.colors[pIndex + 2] = color.b;
    this.extras[eIndex] = life;
    this.extras[eIndex + 1] = 0; // age
    this.extras[eIndex + 2] = glow;
    this.extras[eIndex + 3] = size;
    this.owners[index] = ownerId;
    this.activeIndices.push(index);
  }

  private burstDirections(type: ShellType): THREE.Vector3[] {
    return burstDirections[type](this.rand).map((dir) => dir.normalize());
  }

  private pickPaletteColor(): PaletteColor {
    const palette = useSettingsStore.getState().palettes;
    const total = palette.reduce((sum, c) => sum + c.weight, 0);
    const r = this.rand() * total;
    let accum = 0;
    for (const color of palette) {
      accum += color.weight;
      if (r <= accum) return color;
    }
    return palette[palette.length - 1];
  }

  private spawnBurst(position?: THREE.Vector3, altitudeOverride?: number): boolean {
    const settings = useSettingsStore.getState();
    const { shellParams, scheduler, physics, spawnLayout, shellTypes } = settings;

    const enabledTypes = (Object.keys(shellTypes) as ShellType[]).filter((key) => shellTypes[key].enabled);
    if (enabledTypes.length === 0) return false;

    const weights = enabledTypes.map((key) => shellTypes[key].weight);
    const total = weights.reduce((a, b) => a + b, 0);
    let type: ShellType = enabledTypes[0];
    let random = this.rand() * total;
    for (let i = 0; i < enabledTypes.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        type = enabledTypes[i];
        break;
      }
    }

    const spawnPos = position?.clone() ?? this.sampleLaunchPosition();
    if (!spawnPos) return false;

    const fuseDelay = shellParams.fuseDelay + this.rand() * 0.4 - 0.2;
    const targetAltitude = altitudeOverride ?? THREE.MathUtils.lerp(spawnLayout.targetAltitudeMin, spawnLayout.targetAltitudeMax, this.rand());
    const vertical = targetAltitude - spawnPos.y;
    const velocity = new THREE.Vector3((this.rand() - 0.5) * spawnLayout.lateralSpread, shellParams.velocity + vertical * 0.3, (this.rand() - 0.5) * spawnLayout.lateralSpread);

    const color = this.pickPaletteColor();
    const burst: Burst = {
      id: performance.now() + Math.floor(this.rand() * 100000),
      type,
      position: spawnPos,
      velocity,
      exploded: false,
      fuseTime: fuseDelay,
      age: 0,
      particleCount: Math.floor(shellParams.particles),
      color,
      glow: shellParams.glow,
      sparkleChance: shellParams.sparkleChance,
      fragmentCount: shellParams.fragmentCount,
      indices: [],
      trailAge: 0,
      launchTime: this.elapsed,
      reduceMotion: scheduler.reduceMotion
    };

    this.bursts.push(burst);
    this.burstMap.set(burst.id, burst);
    this.scheduleNext();
    return true;
  }

  private sampleLaunchPosition(): THREE.Vector3 | null {
    const settings = useSettingsStore.getState();
    const { spawnLayout } = settings;
    const attempts = 8;
    for (let i = 0; i < attempts; i++) {
      const angle = this.rand() * Math.PI * 2;
      const radius = spawnLayout.launchRadius * Math.sqrt(this.rand());
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = THREE.MathUtils.lerp(spawnLayout.launchHeightMin, spawnLayout.launchHeightMax, this.rand());
      const pos = new THREE.Vector3(x, y, z);
      if (this.validatePosition(pos, spawnLayout.poissonRadius)) {
        return pos;
      }
    }
    return null;
  }

  private validatePosition(position: THREE.Vector3, minDistance: number) {
    for (const burst of this.bursts) {
      const distance = burst.position.distanceTo(position);
      if (distance < minDistance) {
        return false;
      }
    }
    return true;
  }

  private enforceSparsity(position: THREE.Vector3) {
    const { spawnLayout } = useSettingsStore.getState();
    const result = position.clone();
    for (const burst of this.bursts) {
      const distance = burst.position.distanceTo(result);
      if (distance < spawnLayout.minDistance) {
        const direction = result.clone().sub(burst.position).normalize();
        if (!Number.isFinite(direction.length())) {
          direction.set(1, 0, 0);
        }
        result.copy(burst.position).addScaledVector(direction, spawnLayout.minDistance);
      }
    }
    return result;
  }

  private explodeBurst(burst: Burst) {
    const settings = useSettingsStore.getState();
    const { shellParams, physics, postFx } = settings;

    const baseColor = new THREE.Color(burst.color.color);
    const glowMultiplier = (burst.color.glow ?? 1) * shellParams.glow * postFx.glowGlobal;

    const directionSet = this.burstDirections(burst.type);
    const count = Math.min(
      Math.floor(burst.particleCount * (burst.reduceMotion ? 0.6 : 1)),
      MAX_PARTICLES / 4
    );
    const colorVariance = 0.15;

    for (let i = 0; i < count; i++) {
      const dir = directionSet[i % directionSet.length].clone();
      const spread = shellParams.spread * (0.7 + this.rand() * 0.6);
      const speed = shellParams.velocity * 0.6 + this.rand() * 40;
      const velocity = dir.multiplyScalar(speed * spread);
      velocity.x += physics.wind[0] * 0.1;
      velocity.y += Math.abs(physics.wind[1]) * 0.1;
      velocity.z += physics.wind[2] * 0.1;
      const life = shellParams.sparkLifetime * (0.8 + this.rand() * 0.6);
      const size = 16 * useSettingsStore.getState().postFx.particleSize * (0.7 + this.rand() * 0.6);
      const color = baseColor.clone();
      color.r = THREE.MathUtils.clamp(color.r + (this.rand() - 0.5) * colorVariance, 0, 1.5);
      color.g = THREE.MathUtils.clamp(color.g + (this.rand() - 0.5) * colorVariance, 0, 1.5);
      color.b = THREE.MathUtils.clamp(color.b + (this.rand() - 0.5) * colorVariance, 0, 1.5);
      const index = this.allocateParticle();
      if (index === null) continue;
      this.setParticle(index, burst.position, velocity, color, life, size, glowMultiplier, burst.id);
      burst.indices.push(index);

      if (burst.type === 'crossette' && this.rand() < 0.25) {
        for (let f = 0; f < burst.fragmentCount; f++) {
          const fragIndex = this.allocateParticle();
          if (fragIndex === null) break;
          const offset = new THREE.Vector3((this.rand() - 0.5) * 40, (this.rand() - 0.2) * 30, (this.rand() - 0.5) * 40);
          const fragVelocity = velocity.clone().multiplyScalar(0.6).add(offset.multiplyScalar(0.05));
          const fragLife = life * 0.6;
          const fragSize = size * 0.7;
          this.setParticle(fragIndex, burst.position.clone(), fragVelocity, color.clone().multiplyScalar(1.1), fragLife, fragSize, glowMultiplier * 1.1, burst.id);
          burst.indices.push(fragIndex);
        }
      }
    }
    burst.exploded = true;
  }

  private updateBurst(burst: Burst, delta: number) {
    const settings = useSettingsStore.getState();
    const { physics, shellParams } = settings;

    if (!burst.exploded) {
      burst.age += delta;
      tempVelocity.copy(burst.velocity);
      tempVelocity.x += physics.wind[0] * delta;
      tempVelocity.y += physics.gravity * delta;
      tempVelocity.z += physics.wind[2] * delta;
      tempVelocity.multiplyScalar(1 - physics.drag * delta);
      burst.position.addScaledVector(tempVelocity, delta);
      burst.velocity.copy(tempVelocity);

      if (burst.age >= burst.fuseTime || burst.position.y >= useSettingsStore.getState().spawnLayout.targetAltitudeMax) {
        this.explodeBurst(burst);
      } else {
        // emit ascent trail
        if (!burst.reduceMotion) {
          if (this.rand() < shellParams.sparkleChance) {
            const trailIndex = this.allocateParticle();
            if (trailIndex !== null) {
              tempColor.set(burst.color.color).multiplyScalar(0.8);
              const vel = new THREE.Vector3(
                (this.rand() - 0.5) * 12,
                -10 - this.rand() * 15,
                (this.rand() - 0.5) * 12
              );
              const persistence = THREE.MathUtils.lerp(0.2, 1.4, shellParams.trailPersistence);
              const trailLife = 0.4 + shellParams.trailLength * 0.5;
              const trailSize = 12 * THREE.MathUtils.lerp(0.5, 1.5, shellParams.trailLength);
              this.setParticle(trailIndex, burst.position.clone(), vel, tempColor, trailLife * persistence, trailSize, burst.glow * 0.6, burst.id);
              burst.indices.push(trailIndex);
            }
          }
        }
      }
    }
  }

  private updateParticles(delta: number) {
    const settings = useSettingsStore.getState();
    const { physics, shellParams } = settings;
    const drag = Math.max(0, physics.drag + shellParams.drag * 0.1);
    const turbulence = physics.turbulenceStrength * (0.5 + shellParams.turbulence);
    const gravity = physics.gravity + shellParams.gravity * 0.05;

    for (let i = this.activeIndices.length - 1; i >= 0; i--) {
      const index = this.activeIndices[i];
      const pIndex = index * 3;
      const eIndex = index * 4;
      const life = this.extras[eIndex];
      const age = this.extras[eIndex + 1];
      const glow = this.extras[eIndex + 2];
      const size = this.extras[eIndex + 3];

      if (life <= 0) {
        this.activeIndices.splice(i, 1);
        this.releaseParticle(index);
        continue;
      }

      const velocity = tempVelocity.set(this.velocities[pIndex], this.velocities[pIndex + 1], this.velocities[pIndex + 2]);
      velocity.x += physics.wind[0] * delta;
      velocity.y +=
        gravity * delta +
        Math.sin((age + this.elapsed) * physics.turbulenceFrequency) * turbulence * delta;
      velocity.z += physics.wind[2] * delta;
      velocity.multiplyScalar(Math.max(0, 1 - drag * delta));

      this.velocities[pIndex] = velocity.x;
      this.velocities[pIndex + 1] = velocity.y;
      this.velocities[pIndex + 2] = velocity.z;

      this.positions[pIndex] += velocity.x * delta;
      this.positions[pIndex + 1] += velocity.y * delta;
      this.positions[pIndex + 2] += velocity.z * delta;

      const newAge = age + delta;
      this.extras[eIndex + 1] = newAge;

      if (this.positions[pIndex + 1] < 0) {
        if (useSettingsStore.getState().physics.groundCollision === 'fade') {
          this.extras[eIndex] = Math.min(0.2, this.extras[eIndex]);
        } else {
          this.positions[pIndex + 1] = 0;
          this.velocities[pIndex + 1] = Math.abs(this.velocities[pIndex + 1]) * 0.4;
        }
      }

      if (newAge >= life) {
        this.activeIndices.splice(i, 1);
        this.releaseParticle(index);
      }
    }

    (this.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.getAttribute('size') as THREE.BufferAttribute).needsUpdate = true;
  }

  private maintainScheduler(delta: number) {
    const settings = useSettingsStore.getState();
    const { scheduler } = settings;

    const visibleBursts = this.bursts.filter((b) => !b.exploded || b.indices.length > 0);

    if (visibleBursts.length < scheduler.minSimultaneous) {
      for (let i = visibleBursts.length; i < scheduler.minSimultaneous; i++) {
        this.spawnBurst();
      }
    }

    if (!scheduler.playing) return;

    if (visibleBursts.length < scheduler.maxSimultaneous && this.elapsed >= this.nextBurstTime) {
      this.spawnBurst();
    }
  }

  private scheduleNext() {
    const { scheduler } = useSettingsStore.getState();
    const stagger = THREE.MathUtils.lerp(scheduler.staggerMin, scheduler.staggerMax, this.rand());
    const rate = Math.max(0.2, scheduler.globalRate);
    this.nextBurstTime = this.elapsed + stagger / rate;
  }

  private animate() {
    const delta = Math.min(0.05, this.clock.getDelta());
    this.elapsed += delta;
    this.frameCount++;
    this.fpsAccumulator += delta;
    if (this.fpsAccumulator >= 0.5) {
      const fps = this.frameCount / this.fpsAccumulator;
      useSettingsStore.getState().setFps(fps);
      this.frameCount = 0;
      this.fpsAccumulator = 0;
    }

    this.maintainScheduler(delta);

    for (let i = this.bursts.length - 1; i >= 0; i--) {
      const burst = this.bursts[i];
      this.updateBurst(burst, delta);
      if (burst.exploded && burst.indices.length === 0) {
        this.burstMap.delete(burst.id);
        this.bursts.splice(i, 1);
      }
    }

    this.updateParticles(delta);
    this.applyPostProcessingSettings();
    this.updateBackground();
    this.composer.render();

    requestAnimationFrame(this.animate);
  }

  private applyPostProcessingSettings() {
    const { postFx } = useSettingsStore.getState();

    this.renderer.toneMapping = postFx.hdr ? THREE.ACESFilmicToneMapping : THREE.NoToneMapping;
    this.renderer.toneMappingExposure = postFx.exposure;
    this.bloomPass.enabled = postFx.bloomEnabled;
    this.bloomPass.strength = postFx.bloomStrength;
    this.bloomPass.threshold = postFx.bloomThreshold;
    this.bloomPass.radius = postFx.bloomRadius;

    this.motionPass.enabled = postFx.motionBlur;
    this.motionPass.uniforms['damp'].value = THREE.MathUtils.lerp(0.6, 0.98, postFx.motionBlurStrength);

    if (postFx.dofEnabled) {
      if (!this.composer.passes.includes(this.dofPass)) {
        this.composer.addPass(this.dofPass);
      }
      this.dofPass.materialBokeh.uniforms['focus'].value = postFx.dofFocus;
      this.dofPass.materialBokeh.uniforms['aperture'].value = postFx.dofAperture;
    } else if (this.composer.passes.includes(this.dofPass)) {
      this.composer.removePass(this.dofPass);
    }

    this.material.uniformsNeedUpdate = true;
  }

  private updateBackground() {
    const { background } = useSettingsStore.getState();
    if (background.mode === 'solid') {
      this.renderer.setClearColor(new THREE.Color(background.solidColor), 1);
      document.body.style.background = background.solidColor;
    } else {
      const stops = background.gradientStops.filter(Boolean).join(', ');
      document.body.style.background = `linear-gradient(${background.gradientAngle}deg, ${stops})`;
      this.renderer.setClearColor(new THREE.Color('#000000'), 0);
    }

    if (background.starfield) {
      document.body.style.backgroundImage =
        'radial-gradient(circle at top, rgba(8,8,24,0.8) 0%, rgba(2,2,10,0.95) 60%, rgba(0,0,0,1) 100%)';
    } else {
      document.body.style.backgroundImage = 'none';
    }
  }

  resize(width: number, height: number) {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
    this.composer.setSize(width, height);
    if (this.smaaPass) {
      this.smaaPass.setSize(width * window.devicePixelRatio, height * window.devicePixelRatio);
    }
  }

  triggerBurstAtScreen(x: number, y: number) {
    const rect = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((x - rect.left) / rect.width) * 2 - 1, -(((y - rect.top) / rect.height) * 2 - 1));
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(ndc, this.camera);
    const targetPlaneY = THREE.MathUtils.lerp(
      useSettingsStore.getState().spawnLayout.targetAltitudeMin,
      useSettingsStore.getState().spawnLayout.targetAltitudeMax,
      useSettingsStore.getState().interaction.burstAltitudeMultiplier
    );
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -targetPlaneY);
    const intersection = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, intersection);
    if (!intersection) return;
    const sparse = this.enforceSparsity(intersection);
    this.spawnBurst(sparse, targetPlaneY);
  }

  private onPointerDown(event: PointerEvent) {
    const { interaction } = useSettingsStore.getState();
    if (!interaction.clickToBurst) return;
    this.pointerDown = true;
    this.triggerBurstAtScreen(event.clientX, event.clientY);
    this.pointerLast.set(event.clientX, event.clientY);
  }

  private onPointerMove(event: PointerEvent) {
    const { interaction } = useSettingsStore.getState();
    if (interaction.followCursor && this.pointerDown) {
      const dx = event.clientX - this.pointerLast.x;
      const dy = event.clientY - this.pointerLast.y;
      const distance = Math.hypot(dx, dy);
      if (distance > 24) {
        this.triggerBurstAtScreen(event.clientX, event.clientY);
        this.pointerLast.set(event.clientX, event.clientY);
      }
    }
  }

  private onPointerUp() {
    this.pointerDown = false;
  }

  getRenderer() {
    return this.renderer;
  }

  getComposer() {
    return this.composer;
  }

  captureScreenshot() {
    const dataUrl = this.renderer.domElement.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `fireworks-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  captureVideo(duration = 5) {
    const stream = this.renderer.domElement.captureStream(60);
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
      }
    };
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fireworks-${Date.now()}.webm`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    };
    recorder.start();
    setTimeout(() => recorder.stop(), duration * 1000);
  }

  dispose() {
    cancelAnimationFrame(this.animationFrameId);
    this.canvas.removeEventListener('pointerdown', this.pointerDownHandler);
    this.canvas.removeEventListener('pointermove', this.pointerMoveHandler);
    window.removeEventListener('pointerup', this.pointerUpHandler);
    this.unsubscribeSeed?.();
    this.geometry.dispose();
    this.material.dispose();
    this.renderer.dispose();
  }
}
