import { nanoid } from 'nanoid';
import { create } from 'zustand';

export type ShellType =
  | 'peony'
  | 'ring'
  | 'willow'
  | 'palm'
  | 'crossette'
  | 'comet';

export interface PaletteColor {
  id: string;
  color: string;
  weight: number;
  glow: number;
  gradient?: [string, string?];
}

export interface ShellConfig {
  enabled: boolean;
  weight: number;
}

export interface ShellParameterConfig {
  particles: number;
  velocity: number;
  spread: number;
  fuseDelay: number;
  trailLength: number;
  trailPersistence: number;
  sparkLifetime: number;
  turbulence: number;
  drag: number;
  gravity: number;
  glow: number;
  fragmentCount: number;
  sparkleChance: number;
}

export interface SchedulerSettings {
  playing: boolean;
  minSimultaneous: number;
  maxSimultaneous: number;
  staggerMin: number;
  staggerMax: number;
  globalRate: number;
  seed: number;
  reduceMotion: boolean;
  fullscreen: boolean;
  fps: number;
}

export interface InteractionSettings {
  clickToBurst: boolean;
  burstAltitudeMultiplier: number;
  followCursor: boolean;
}

export interface SpawnLayoutSettings {
  launchRadius: number;
  minDistance: number;
  launchHeightMin: number;
  launchHeightMax: number;
  targetAltitudeMin: number;
  targetAltitudeMax: number;
  lateralSpread: number;
  poissonRadius: number;
}

export interface PhysicsEnvironmentSettings {
  gravity: number;
  drag: number;
  wind: [number, number, number];
  turbulenceStrength: number;
  turbulenceFrequency: number;
  groundCollision: 'fade' | 'rebound';
}

export interface PostFXSettings {
  exposure: number;
  bloomEnabled: boolean;
  bloomStrength: number;
  bloomThreshold: number;
  bloomRadius: number;
  dofEnabled: boolean;
  dofFocus: number;
  dofAperture: number;
  motionBlur: boolean;
  motionBlurStrength: number;
  motionBlurSamples: number;
  glowGlobal: number;
  particleSize: number;
  hdr: boolean;
}

export interface BackgroundSettings {
  mode: 'solid' | 'gradient';
  solidColor: string;
  gradientStops: [string, string, string?];
  gradientAngle: number;
  starfield: boolean;
}

export interface PresetDefinition {
  name: string;
  description: string;
  data: () => Partial<SettingsState>;
}

export interface SettingsState {
  scheduler: SchedulerSettings;
  interaction: InteractionSettings;
  spawnLayout: SpawnLayoutSettings;
  shellTypes: Record<ShellType, ShellConfig>;
  shellParams: ShellParameterConfig;
  physics: PhysicsEnvironmentSettings;
  postFx: PostFXSettings;
  palettes: PaletteColor[];
  background: BackgroundSettings;
  presets: PresetDefinition[];
  savedPresets: Record<string, Partial<SettingsState>>;
  updateSetting: (path: (string | number)[], value: unknown) => void;
  setSchedulerPlaying: (playing: boolean) => void;
  setFps: (fps: number) => void;
  addPaletteColor: (color?: Partial<PaletteColor>) => void;
  removePaletteColor: (id: string) => void;
  setPaletteColor: (id: string, patch: Partial<PaletteColor>) => void;
  savePreset: (name: string) => void;
  loadPreset: (name: string) => void;
}

const defaultPalette: PaletteColor[] = [
  { id: nanoid(), color: '#1b38a8', weight: 0.3, glow: 2.4 },
  { id: nanoid(), color: '#f4c542', weight: 0.25, glow: 3 },
  { id: nanoid(), color: '#d1d5ff', weight: 0.2, glow: 2.2 },
  { id: nanoid(), color: '#d45bff', weight: 0.15, glow: 2.8 },
  { id: nanoid(), color: '#5fd7ff', weight: 0.1, glow: 2.5 }
];

const presetLibrary: PresetDefinition[] = [
  {
    name: 'Festival',
    description: 'Vibrant multi-shell celebration with varied bursts.',
    data: () => ({
      scheduler: {
        minSimultaneous: 5,
        maxSimultaneous: 8,
        globalRate: 1.1,
        staggerMin: 0.4,
        staggerMax: 1.2
      },
      shellParams: {
        particles: 320,
        velocity: 220,
        spread: 1.2,
        fuseDelay: 1.2,
        trailLength: 0.9,
        trailPersistence: 0.65,
        sparkLifetime: 2.4,
        turbulence: 0.9,
        drag: 0.22,
        gravity: -9.8,
        glow: 3.2,
        fragmentCount: 5,
        sparkleChance: 0.4
      },
      postFx: {
        exposure: 1.1,
        bloomStrength: 1.1,
        bloomRadius: 0.85,
        bloomThreshold: 0.6,
        glowGlobal: 3.2
      }
    })
  },
  {
    name: 'Golden Hour',
    description: 'Soft gold and amber tones with slow drifts.',
    data: () => ({
      palettes: [
        { id: nanoid(), color: '#f5d67b', weight: 0.4, glow: 3.4 },
        { id: nanoid(), color: '#ffb347', weight: 0.35, glow: 3 },
        { id: nanoid(), color: '#ffe0b5', weight: 0.25, glow: 2.8 }
      ],
      shellParams: {
        particles: 240,
        velocity: 160,
        spread: 0.9,
        fuseDelay: 1.4,
        trailLength: 1.2,
        trailPersistence: 0.75,
        sparkLifetime: 2.8,
        turbulence: 0.6,
        drag: 0.25,
        gravity: -7.4,
        glow: 3.6,
        fragmentCount: 4,
        sparkleChance: 0.35
      },
      postFx: {
        exposure: 1.2,
        bloomStrength: 1.3,
        bloomThreshold: 0.55,
        bloomRadius: 0.92,
        glowGlobal: 3.6
      },
      background: {
        mode: 'gradient',
        gradientStops: ['#130d2a', '#281a36', '#4a2b4f'],
        gradientAngle: 70
      }
    })
  },
  {
    name: 'Minimal Mono',
    description: 'Monochrome with focused bursts and low motion.',
    data: () => ({
      palettes: [
        { id: nanoid(), color: '#ffffff', weight: 1, glow: 2.5 }
      ],
      scheduler: {
        minSimultaneous: 3,
        maxSimultaneous: 4,
        globalRate: 0.8,
        staggerMin: 0.8,
        staggerMax: 1.4
      },
      shellParams: {
        particles: 180,
        velocity: 180,
        spread: 0.7,
        fuseDelay: 1,
        trailLength: 0.8,
        trailPersistence: 0.55,
        sparkLifetime: 1.6,
        turbulence: 0.4,
        drag: 0.18,
        gravity: -9.8,
        glow: 2,
        fragmentCount: 3,
        sparkleChance: 0.2
      }
    })
  },
  {
    name: 'Neon Galaxy',
    description: 'High-glow neon bursts with deep space backdrop.',
    data: () => ({
      palettes: [
        { id: nanoid(), color: '#61d0ff', weight: 0.3, glow: 4.2 },
        { id: nanoid(), color: '#ff61f6', weight: 0.3, glow: 4 },
        { id: nanoid(), color: '#9cff4d', weight: 0.25, glow: 3.8 },
        { id: nanoid(), color: '#d7d2ff', weight: 0.15, glow: 3.5 }
      ],
      postFx: {
        exposure: 1.3,
        bloomStrength: 1.5,
        bloomRadius: 1.1,
        bloomThreshold: 0.5,
        glowGlobal: 4.2
      },
      background: {
        mode: 'gradient',
        gradientStops: ['#020311', '#080b28', '#120d33'],
        gradientAngle: 110,
        starfield: true
      }
    })
  }
];

const deepMerge = (target: any, source: any) => {
  if (source === undefined) return target;
  if (Array.isArray(source)) {
    return source;
  }
  if (typeof source !== 'object' || source === null) {
    return source;
  }
  const output = { ...target };
  Object.keys(source).forEach((key) => {
    const value = (source as any)[key];
    if (value === undefined) return;
    output[key] = deepMerge(target?.[key], value);
  });
  return output;
};

const setNested = (state: any, path: (string | number)[], value: unknown) => {
  if (path.length === 0) return;
  const [head, ...rest] = path;
  if (rest.length === 0) {
    state[head] = value;
    return;
  }
  if (state[head] === undefined) {
    state[head] = typeof rest[0] === 'number' ? [] : {};
  }
  setNested(state[head], rest, value);
};

const cloneState = <T>(value: T): T =>
  typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value));

export const useSettingsStore = create<SettingsState>((set, get) => ({
  scheduler: {
    playing: true,
    minSimultaneous: 3,
    maxSimultaneous: 6,
    staggerMin: 0.5,
    staggerMax: 1.4,
    globalRate: 1,
    seed: 1337,
    reduceMotion: false,
    fullscreen: false,
    fps: 0
  },
  interaction: {
    clickToBurst: true,
    burstAltitudeMultiplier: 1,
    followCursor: false
  },
  spawnLayout: {
    launchRadius: 160,
    minDistance: 45,
    launchHeightMin: 0,
    launchHeightMax: 60,
    targetAltitudeMin: 180,
    targetAltitudeMax: 320,
    lateralSpread: 120,
    poissonRadius: 55
  },
  shellTypes: {
    peony: { enabled: true, weight: 0.28 },
    ring: { enabled: true, weight: 0.2 },
    willow: { enabled: true, weight: 0.16 },
    palm: { enabled: true, weight: 0.14 },
    crossette: { enabled: true, weight: 0.12 },
    comet: { enabled: true, weight: 0.1 }
  },
  shellParams: {
    particles: 260,
    velocity: 190,
    spread: 1,
    fuseDelay: 1.1,
    trailLength: 1,
    trailPersistence: 0.6,
    sparkLifetime: 2.2,
    turbulence: 0.8,
    drag: 0.2,
    gravity: -9.8,
    glow: 3,
    fragmentCount: 4,
    sparkleChance: 0.35
  },
  physics: {
    gravity: -9.8,
    drag: 0.22,
    wind: [4, 0, 0],
    turbulenceStrength: 0.8,
    turbulenceFrequency: 0.45,
    groundCollision: 'fade'
  },
  postFx: {
    exposure: 1,
    bloomEnabled: true,
    bloomStrength: 1.2,
    bloomThreshold: 0.7,
    bloomRadius: 0.85,
    dofEnabled: false,
    dofFocus: 300,
    dofAperture: 0.025,
    motionBlur: true,
    motionBlurStrength: 0.85,
    motionBlurSamples: 16,
    glowGlobal: 3,
    particleSize: 1,
    hdr: true
  },
  palettes: defaultPalette,
  background: {
    mode: 'gradient',
    solidColor: '#02030d',
    gradientStops: ['#02030d', '#050724', '#0d0638'],
    gradientAngle: 90,
    starfield: true
  },
  presets: presetLibrary,
  savedPresets: {},
  updateSetting: (path, value) =>
    set((state) => {
      const next = cloneState(state);
      setNested(next, path, value);
      return next;
    }),
  setSchedulerPlaying: (playing) =>
    set((state) => ({
      scheduler: { ...state.scheduler, playing }
    })),
  setFps: (fps) =>
    set((state) => ({
      scheduler: { ...state.scheduler, fps }
    })),
  addPaletteColor: (color) =>
    set((state) => ({
      palettes: [
        ...state.palettes,
        {
          id: nanoid(),
          color: color?.color ?? '#ffffff',
          weight: color?.weight ?? 0.2,
          glow: color?.glow ?? 2.5,
          gradient: color?.gradient
        }
      ]
    })),
  removePaletteColor: (id) =>
    set((state) => ({
      palettes: state.palettes.filter((c) => c.id !== id)
    })),
  setPaletteColor: (id, patch) =>
    set((state) => ({
      palettes: state.palettes.map((c) => (c.id === id ? { ...c, ...patch } : c))
    })),
  savePreset: (name) => {
    const snapshot = get();
    const { presets, savedPresets, updateSetting, setSchedulerPlaying, setFps, addPaletteColor, removePaletteColor, setPaletteColor, savePreset, loadPreset, ...rest } = snapshot;
    set((state) => ({
      savedPresets: {
        ...state.savedPresets,
        [name]: JSON.parse(JSON.stringify(rest))
      }
    }));
  },
  loadPreset: (name) =>
    set((state) => {
      const preset = state.savedPresets[name] ?? state.presets.find((p) => p.name === name)?.data();
      if (!preset) return state;
      const merged = deepMerge(state, preset);
      return {
        ...merged,
        presets: state.presets,
        savedPresets: state.savedPresets
      };
    })
}));

export type SettingsSelector<T> = (state: SettingsState) => T;
