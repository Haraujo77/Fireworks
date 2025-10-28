import React, { useMemo, useState } from 'react';
import classNames from 'classnames';
import { FireworksEngine } from '../three/FireworksEngine';
import {
  PaletteColor,
  ShellType,
  useSettingsStore
} from '../store/settings';

interface ControlPanelProps {
  engineRef: React.MutableRefObject<FireworksEngine | null>;
}

const shellTypeLabels: Record<ShellType, string> = {
  peony: 'Peony',
  ring: 'Ring',
  willow: 'Willow',
  palm: 'Palm',
  crossette: 'Crossette',
  comet: 'Comet'
};

const formatNumber = (value: number, digits = 2) => Number.parseFloat(value.toFixed(digits));

const Section: React.FC<{ title: string; defaultOpen?: boolean }> = ({ title, defaultOpen = true, children }) => (
  <details className="panel-section" open={defaultOpen}>
    <summary>{title}</summary>
    <div className="section-content">{children}</div>
  </details>
);

const ControlRow: React.FC<{ label: string; description?: string; inline?: boolean }> = ({
  label,
  description,
  inline = false,
  children
}) => (
  <div className={classNames('control-row', { inline })}>
    <div className="control-label">
      <span>{label}</span>
      {description && <small>{description}</small>}
    </div>
    <div className="control-input">{children}</div>
  </div>
);

export const ControlPanel: React.FC<ControlPanelProps> = ({ engineRef }) => {
  const scheduler = useSettingsStore((state) => state.scheduler);
  const interaction = useSettingsStore((state) => state.interaction);
  const spawnLayout = useSettingsStore((state) => state.spawnLayout);
  const shellTypes = useSettingsStore((state) => state.shellTypes);
  const shellParams = useSettingsStore((state) => state.shellParams);
  const physics = useSettingsStore((state) => state.physics);
  const postFx = useSettingsStore((state) => state.postFx);
  const palettes = useSettingsStore((state) => state.palettes);
  const background = useSettingsStore((state) => state.background);
  const presets = useSettingsStore((state) => state.presets);
  const savedPresets = useSettingsStore((state) => state.savedPresets);
  const updateSetting = useSettingsStore((state) => state.updateSetting);
  const setSchedulerPlaying = useSettingsStore((state) => state.setSchedulerPlaying);
  const addPaletteColor = useSettingsStore((state) => state.addPaletteColor);
  const removePaletteColor = useSettingsStore((state) => state.removePaletteColor);
  const setPaletteColor = useSettingsStore((state) => state.setPaletteColor);
  const savePreset = useSettingsStore((state) => state.savePreset);
  const loadPreset = useSettingsStore((state) => state.loadPreset);

  const [presetName, setPresetName] = useState('');

  const handleFullscreenToggle = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => undefined);
      updateSetting(['scheduler', 'fullscreen'], true);
    } else {
      document.exitFullscreen().catch(() => undefined);
      updateSetting(['scheduler', 'fullscreen'], false);
    }
  };

  const handleSeedReseed = () => {
    const seed = Math.floor(Math.random() * 1000000);
    updateSetting(['scheduler', 'seed'], seed);
  };

  const handleGlobalRateChange = (value: number) => {
    updateSetting(['scheduler', 'globalRate'], value);
  };

  const handlePaletteChange = (color: PaletteColor, key: keyof PaletteColor, value: string | number) => {
    setPaletteColor(color.id, { [key]: value } as Partial<PaletteColor>);
  };

  const handleSavePreset = () => {
    if (!presetName.trim()) return;
    savePreset(presetName.trim());
    setPresetName('');
  };

  const handleBackgroundMode = (mode: 'solid' | 'gradient') => {
    updateSetting(['background', 'mode'], mode);
  };

  const handleWindChange = (index: number, value: number) => {
    const next = [...physics.wind] as [number, number, number];
    next[index] = value;
    updateSetting(['physics', 'wind'], next);
  };

  const handleBurstRange = (key: 'staggerMin' | 'staggerMax', value: number) => {
    updateSetting(['scheduler', key], value);
  };

  const handleSpawnRange = (key: 'launchHeightMin' | 'launchHeightMax' | 'targetAltitudeMin' | 'targetAltitudeMax', value: number) => {
    updateSetting(['spawnLayout', key], value);
  };

  const handleBackgroundStop = (index: number, value: string) => {
    const stops = [...background.gradientStops] as [string, string, string?];
    stops[index] = value;
    updateSetting(['background', 'gradientStops'], stops);
  };

  const paletteTotal = useMemo(() => palettes.reduce((sum, c) => sum + c.weight, 0), [palettes]);

  return (
    <aside className="control-panel">
      <div className="panel-header">
        <h1>Fireworks Playground</h1>
        <p>Craft your own cinematic firework spectacle in real-time.</p>
      </div>
      <div className="panel-scroll">
        <Section title="Show Control">
          <div className="control-grid">
            <button
              className={classNames('pill-button', { primary: scheduler.playing })}
              onClick={() => setSchedulerPlaying(!scheduler.playing)}
            >
              {scheduler.playing ? 'Pause Show' : 'Play Show'}
            </button>
            <button className="pill-button" onClick={handleFullscreenToggle}>
              {document.fullscreenElement ? 'Exit Fullscreen' : 'Fullscreen'}
            </button>
          </div>
          <ControlRow label="Simultaneous Bursts" description="Min / Max shells">
            <div className="dual-input">
              <label>
                Min
                <input
                  type="number"
                  min={1}
                  max={scheduler.maxSimultaneous}
                  value={scheduler.minSimultaneous}
                  onChange={(event) => updateSetting(['scheduler', 'minSimultaneous'], Number(event.target.value))}
                />
              </label>
              <label>
                Max
                <input
                  type="number"
                  min={scheduler.minSimultaneous}
                  max={12}
                  value={scheduler.maxSimultaneous}
                  onChange={(event) => updateSetting(['scheduler', 'maxSimultaneous'], Number(event.target.value))}
                />
              </label>
            </div>
          </ControlRow>
          <ControlRow label="Launch Stagger" description="Seconds between bursts">
            <div className="dual-input">
              <label>
                Min
                <input
                  type="number"
                  step="0.1"
                  value={scheduler.staggerMin}
                  onChange={(event) => handleBurstRange('staggerMin', Number(event.target.value))}
                />
              </label>
              <label>
                Max
                <input
                  type="number"
                  step="0.1"
                  value={scheduler.staggerMax}
                  onChange={(event) => handleBurstRange('staggerMax', Number(event.target.value))}
                />
              </label>
            </div>
          </ControlRow>
          <ControlRow label="Global Rate" description="Overall spawn intensity">
            <input
              type="range"
              min={0.2}
              max={2.5}
              step={0.05}
              value={scheduler.globalRate}
              onChange={(event) => handleGlobalRateChange(Number(event.target.value))}
            />
            <span className="value-tag">{formatNumber(scheduler.globalRate, 2)}</span>
          </ControlRow>
          <ControlRow label="Show Options" inline>
            <label className="toggle">
              <input
                type="checkbox"
                checked={scheduler.reduceMotion}
                onChange={(event) => updateSetting(['scheduler', 'reduceMotion'], event.target.checked)}
              />
              <span>Reduce Motion</span>
            </label>
            <label className="toggle">
              <input
                type="checkbox"
                checked={interaction.clickToBurst}
                onChange={(event) => updateSetting(['interaction', 'clickToBurst'], event.target.checked)}
              />
              <span>Click to Burst</span>
            </label>
          </ControlRow>
          <div className="control-grid">
            <button className="pill-button" onClick={handleSeedReseed}>
              Reseed ({scheduler.seed})
            </button>
            <div className="fps-indicator">FPS: {formatNumber(scheduler.fps || 0, 1)}</div>
          </div>
        </Section>

        <Section title="Interaction">
          <ControlRow label="Altitude Multiplier" description="Height scaling for clicks">
            <input
              type="range"
              min={0}
              max={1.5}
              step={0.05}
              value={interaction.burstAltitudeMultiplier}
              onChange={(event) => updateSetting(['interaction', 'burstAltitudeMultiplier'], Number(event.target.value))}
            />
            <span className="value-tag">{formatNumber(interaction.burstAltitudeMultiplier, 2)}x</span>
          </ControlRow>
          <ControlRow label="Follow Cursor Trail" description="Continuous bursts while dragging">
            <label className="toggle">
              <input
                type="checkbox"
                checked={interaction.followCursor}
                onChange={(event) => updateSetting(['interaction', 'followCursor'], event.target.checked)}
              />
              <span>Enable trail bursts</span>
            </label>
          </ControlRow>
        </Section>

        <Section title="Spawn & Layout">
          <ControlRow label="Launch Radius" description="Ground launch spread">
            <input
              type="range"
              min={40}
              max={400}
              step={5}
              value={spawnLayout.launchRadius}
              onChange={(event) => updateSetting(['spawnLayout', 'launchRadius'], Number(event.target.value))}
            />
            <span className="value-tag">{spawnLayout.launchRadius} m</span>
          </ControlRow>
          <ControlRow label="Shell Separation" description="Minimum burst distance">
            <input
              type="range"
              min={10}
              max={150}
              step={5}
              value={spawnLayout.minDistance}
              onChange={(event) => updateSetting(['spawnLayout', 'minDistance'], Number(event.target.value))}
            />
            <span className="value-tag">{spawnLayout.minDistance} m</span>
          </ControlRow>
          <ControlRow label="Launch Elevation" description="Min / Max">
            <div className="dual-input">
              <label>
                Min
                <input
                  type="number"
                  value={spawnLayout.launchHeightMin}
                  onChange={(event) => handleSpawnRange('launchHeightMin', Number(event.target.value))}
                />
              </label>
              <label>
                Max
                <input
                  type="number"
                  value={spawnLayout.launchHeightMax}
                  onChange={(event) => handleSpawnRange('launchHeightMax', Number(event.target.value))}
                />
              </label>
            </div>
          </ControlRow>
          <ControlRow label="Target Altitude" description="Min / Max burst height">
            <div className="dual-input">
              <label>
                Min
                <input
                  type="number"
                  value={spawnLayout.targetAltitudeMin}
                  onChange={(event) => handleSpawnRange('targetAltitudeMin', Number(event.target.value))}
                />
              </label>
              <label>
                Max
                <input
                  type="number"
                  value={spawnLayout.targetAltitudeMax}
                  onChange={(event) => handleSpawnRange('targetAltitudeMax', Number(event.target.value))}
                />
              </label>
            </div>
          </ControlRow>
          <ControlRow label="Lateral Spread" description="Outward drift">
            <input
              type="range"
              min={0}
              max={220}
              step={5}
              value={spawnLayout.lateralSpread}
              onChange={(event) => updateSetting(['spawnLayout', 'lateralSpread'], Number(event.target.value))}
            />
            <span className="value-tag">{spawnLayout.lateralSpread}</span>
          </ControlRow>
          <ControlRow label="Poisson Radius" description="Spatial sparsity">
            <input
              type="range"
              min={10}
              max={150}
              step={5}
              value={spawnLayout.poissonRadius}
              onChange={(event) => updateSetting(['spawnLayout', 'poissonRadius'], Number(event.target.value))}
            />
            <span className="value-tag">{spawnLayout.poissonRadius}</span>
          </ControlRow>
        </Section>

        <Section title="Shell & Burst">
          <div className="shell-type-grid">
            {(Object.keys(shellTypes) as ShellType[]).map((type) => (
              <div key={type} className="shell-type-row">
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={shellTypes[type].enabled}
                    onChange={(event) => updateSetting(['shellTypes', type, 'enabled'], event.target.checked)}
                  />
                  <span>{shellTypeLabels[type]}</span>
                </label>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={shellTypes[type].weight}
                  onChange={(event) => updateSetting(['shellTypes', type, 'weight'], Number(event.target.value))}
                />
                <span className="value-tag">{formatNumber(shellTypes[type].weight, 2)}</span>
              </div>
            ))}
          </div>
          <ControlRow label="Particles per Burst">
            <input
              type="range"
              min={120}
              max={640}
              step={10}
              value={shellParams.particles}
              onChange={(event) => updateSetting(['shellParams', 'particles'], Number(event.target.value))}
            />
            <span className="value-tag">{shellParams.particles}</span>
          </ControlRow>
          <ControlRow label="Initial Velocity">
            <input
              type="range"
              min={80}
              max={320}
              step={5}
              value={shellParams.velocity}
              onChange={(event) => updateSetting(['shellParams', 'velocity'], Number(event.target.value))}
            />
            <span className="value-tag">{shellParams.velocity}</span>
          </ControlRow>
          <ControlRow label="Spread">
            <input
              type="range"
              min={0.4}
              max={2}
              step={0.05}
              value={shellParams.spread}
              onChange={(event) => updateSetting(['shellParams', 'spread'], Number(event.target.value))}
            />
            <span className="value-tag">{formatNumber(shellParams.spread)}</span>
          </ControlRow>
          <ControlRow label="Fuse Delay">
            <input
              type="range"
              min={0.4}
              max={2}
              step={0.05}
              value={shellParams.fuseDelay}
              onChange={(event) => updateSetting(['shellParams', 'fuseDelay'], Number(event.target.value))}
            />
            <span className="value-tag">{formatNumber(shellParams.fuseDelay)}</span>
          </ControlRow>
          <ControlRow label="Trail Length">
            <input
              type="range"
              min={0}
              max={2}
              step={0.05}
              value={shellParams.trailLength}
              onChange={(event) => updateSetting(['shellParams', 'trailLength'], Number(event.target.value))}
            />
            <span className="value-tag">{formatNumber(shellParams.trailLength)}</span>
          </ControlRow>
          <ControlRow label="Trail Persistence">
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={shellParams.trailPersistence}
              onChange={(event) => updateSetting(['shellParams', 'trailPersistence'], Number(event.target.value))}
            />
            <span className="value-tag">{formatNumber(shellParams.trailPersistence)}</span>
          </ControlRow>
          <ControlRow label="Spark Lifetime">
            <input
              type="range"
              min={0.6}
              max={4}
              step={0.1}
              value={shellParams.sparkLifetime}
              onChange={(event) => updateSetting(['shellParams', 'sparkLifetime'], Number(event.target.value))}
            />
            <span className="value-tag">{formatNumber(shellParams.sparkLifetime)}</span>
          </ControlRow>
          <ControlRow label="Turbulence">
            <input
              type="range"
              min={0}
              max={2}
              step={0.05}
              value={shellParams.turbulence}
              onChange={(event) => updateSetting(['shellParams', 'turbulence'], Number(event.target.value))}
            />
            <span className="value-tag">{formatNumber(shellParams.turbulence)}</span>
          </ControlRow>
          <ControlRow label="Drag">
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={shellParams.drag}
              onChange={(event) => updateSetting(['shellParams', 'drag'], Number(event.target.value))}
            />
            <span className="value-tag">{formatNumber(shellParams.drag)}</span>
          </ControlRow>
          <ControlRow label="Gravity Influence">
            <input
              type="range"
              min={-20}
              max={0}
              step={0.5}
              value={shellParams.gravity}
              onChange={(event) => updateSetting(['shellParams', 'gravity'], Number(event.target.value))}
            />
            <span className="value-tag">{formatNumber(shellParams.gravity)}</span>
          </ControlRow>
          <ControlRow label="Glow Intensity" description="Per shell">
            <input
              type="range"
              min={0}
              max={5}
              step={0.1}
              value={shellParams.glow}
              onChange={(event) => updateSetting(['shellParams', 'glow'], Number(event.target.value))}
            />
            <span className="value-tag">{formatNumber(shellParams.glow)}</span>
          </ControlRow>
          <ControlRow label="Fragment Count" description="For Crossette">
            <input
              type="range"
              min={2}
              max={12}
              step={1}
              value={shellParams.fragmentCount}
              onChange={(event) => updateSetting(['shellParams', 'fragmentCount'], Number(event.target.value))}
            />
            <span className="value-tag">{shellParams.fragmentCount}</span>
          </ControlRow>
          <ControlRow label="Crackle Chance">
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={shellParams.sparkleChance}
              onChange={(event) => updateSetting(['shellParams', 'sparkleChance'], Number(event.target.value))}
            />
            <span className="value-tag">{formatNumber(shellParams.sparkleChance)}</span>
          </ControlRow>
        </Section>

        <Section title="Physics & Environment">
          <ControlRow label="Gravity (World)">
            <input
              type="range"
              min={-20}
              max={0}
              step={0.5}
              value={physics.gravity}
              onChange={(event) => updateSetting(['physics', 'gravity'], Number(event.target.value))}
            />
            <span className="value-tag">{formatNumber(physics.gravity)}</span>
          </ControlRow>
          <ControlRow label="Drag Coefficient">
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={physics.drag}
              onChange={(event) => updateSetting(['physics', 'drag'], Number(event.target.value))}
            />
            <span className="value-tag">{formatNumber(physics.drag)}</span>
          </ControlRow>
          <ControlRow label="Wind Vector (XYZ)" inline>
            {['X', 'Y', 'Z'].map((axis, index) => (
              <label key={axis}>
                {axis}
                <input
                  type="number"
                  step={0.5}
                  value={physics.wind[index]}
                  onChange={(event) => handleWindChange(index, Number(event.target.value))}
                />
              </label>
            ))}
          </ControlRow>
          <ControlRow label="Turbulence Strength">
            <input
              type="range"
              min={0}
              max={3}
              step={0.05}
              value={physics.turbulenceStrength}
              onChange={(event) => updateSetting(['physics', 'turbulenceStrength'], Number(event.target.value))}
            />
            <span className="value-tag">{formatNumber(physics.turbulenceStrength)}</span>
          </ControlRow>
          <ControlRow label="Turbulence Frequency">
            <input
              type="range"
              min={0}
              max={2}
              step={0.05}
              value={physics.turbulenceFrequency}
              onChange={(event) => updateSetting(['physics', 'turbulenceFrequency'], Number(event.target.value))}
            />
            <span className="value-tag">{formatNumber(physics.turbulenceFrequency)}</span>
          </ControlRow>
          <ControlRow label="Ground Collision">
            <select
              value={physics.groundCollision}
              onChange={(event) => updateSetting(['physics', 'groundCollision'], event.target.value)}
            >
              <option value="fade">Fade at ground</option>
              <option value="rebound">Rebound sparks</option>
            </select>
          </ControlRow>
        </Section>

        <Section title="PostFX & Rendering">
          <ControlRow label="Exposure">
            <input
              type="range"
              min={0.4}
              max={2}
              step={0.05}
              value={postFx.exposure}
              onChange={(event) => updateSetting(['postFx', 'exposure'], Number(event.target.value))}
            />
            <span className="value-tag">{formatNumber(postFx.exposure)}</span>
          </ControlRow>
          <ControlRow label="Bloom" inline>
            <label className="toggle">
              <input
                type="checkbox"
                checked={postFx.bloomEnabled}
                onChange={(event) => updateSetting(['postFx', 'bloomEnabled'], event.target.checked)}
              />
              <span>Enable Bloom</span>
            </label>
          </ControlRow>
          {postFx.bloomEnabled && (
            <>
              <ControlRow label="Bloom Strength">
                <input
                  type="range"
                  min={0}
                  max={3}
                  step={0.05}
                  value={postFx.bloomStrength}
                  onChange={(event) => updateSetting(['postFx', 'bloomStrength'], Number(event.target.value))}
                />
                <span className="value-tag">{formatNumber(postFx.bloomStrength)}</span>
              </ControlRow>
              <ControlRow label="Bloom Threshold">
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={postFx.bloomThreshold}
                  onChange={(event) => updateSetting(['postFx', 'bloomThreshold'], Number(event.target.value))}
                />
                <span className="value-tag">{formatNumber(postFx.bloomThreshold)}</span>
              </ControlRow>
              <ControlRow label="Bloom Radius">
                <input
                  type="range"
                  min={0}
                  max={2}
                  step={0.05}
                  value={postFx.bloomRadius}
                  onChange={(event) => updateSetting(['postFx', 'bloomRadius'], Number(event.target.value))}
                />
                <span className="value-tag">{formatNumber(postFx.bloomRadius)}</span>
              </ControlRow>
            </>
          )}
          <ControlRow label="Depth of Field" inline>
            <label className="toggle">
              <input
                type="checkbox"
                checked={postFx.dofEnabled}
                onChange={(event) => updateSetting(['postFx', 'dofEnabled'], event.target.checked)}
              />
              <span>Enable DOF</span>
            </label>
          </ControlRow>
          {postFx.dofEnabled && (
            <>
              <ControlRow label="Focus Distance">
                <input
                  type="range"
                  min={50}
                  max={800}
                  step={5}
                  value={postFx.dofFocus}
                  onChange={(event) => updateSetting(['postFx', 'dofFocus'], Number(event.target.value))}
                />
                <span className="value-tag">{postFx.dofFocus}</span>
              </ControlRow>
              <ControlRow label="Aperture">
                <input
                  type="range"
                  min={0.0001}
                  max={0.01}
                  step={0.0001}
                  value={postFx.dofAperture}
                  onChange={(event) => updateSetting(['postFx', 'dofAperture'], Number(event.target.value))}
                />
                <span className="value-tag">{postFx.dofAperture.toFixed(4)}</span>
              </ControlRow>
            </>
          )}
          <ControlRow label="Motion Blur" inline>
            <label className="toggle">
              <input
                type="checkbox"
                checked={postFx.motionBlur}
                onChange={(event) => updateSetting(['postFx', 'motionBlur'], event.target.checked)}
              />
              <span>Enable Motion Blur</span>
            </label>
          </ControlRow>
          {postFx.motionBlur && (
            <>
              <ControlRow label="Blur Strength">
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={postFx.motionBlurStrength}
                  onChange={(event) => updateSetting(['postFx', 'motionBlurStrength'], Number(event.target.value))}
                />
                <span className="value-tag">{formatNumber(postFx.motionBlurStrength)}</span>
              </ControlRow>
              <ControlRow label="Sample Count">
                <input
                  type="range"
                  min={4}
                  max={32}
                  step={1}
                  value={postFx.motionBlurSamples}
                  onChange={(event) => updateSetting(['postFx', 'motionBlurSamples'], Number(event.target.value))}
                />
                <span className="value-tag">{postFx.motionBlurSamples}</span>
              </ControlRow>
            </>
          )}
          <ControlRow label="Glow Override" description="Global multiplier">
            <input
              type="range"
              min={0}
              max={5}
              step={0.1}
              value={postFx.glowGlobal}
              onChange={(event) => updateSetting(['postFx', 'glowGlobal'], Number(event.target.value))}
            />
            <span className="value-tag">{formatNumber(postFx.glowGlobal)}</span>
          </ControlRow>
          <ControlRow label="Particle Size">
            <input
              type="range"
              min={0.5}
              max={2.5}
              step={0.05}
              value={postFx.particleSize}
              onChange={(event) => updateSetting(['postFx', 'particleSize'], Number(event.target.value))}
            />
            <span className="value-tag">{formatNumber(postFx.particleSize)}</span>
          </ControlRow>
          <ControlRow label="HDR Rendering" inline>
            <label className="toggle">
              <input
                type="checkbox"
                checked={postFx.hdr}
                onChange={(event) => updateSetting(['postFx', 'hdr'], event.target.checked)}
              />
              <span>Enable HDR</span>
            </label>
          </ControlRow>
        </Section>

        <Section title="Color Palettes">
          <div className="palette-stats">Total Weight: {formatNumber(paletteTotal, 2)}</div>
          {palettes.map((color) => (
            <div key={color.id} className="palette-row">
              <div className="palette-preview" style={{ background: color.color }} />
              <input
                type="color"
                value={color.color}
                onChange={(event) => handlePaletteChange(color, 'color', event.target.value)}
              />
              <label>
                Weight
                <input
                  type="number"
                  step={0.05}
                  min={0}
                  value={color.weight}
                  onChange={(event) => handlePaletteChange(color, 'weight', Number(event.target.value))}
                />
              </label>
              <label>
                Glow
                <input
                  type="range"
                  min={0}
                  max={5}
                  step={0.1}
                  value={color.glow}
                  onChange={(event) => handlePaletteChange(color, 'glow', Number(event.target.value))}
                />
              </label>
              <span className="value-tag">{formatNumber(color.glow)}</span>
              <button className="icon-button" onClick={() => removePaletteColor(color.id)} title="Remove color">
                ✕
              </button>
            </div>
          ))}
          <button className="pill-button secondary" onClick={() => addPaletteColor()}>
            Add Color
          </button>

          <div className="background-settings">
            <h3>Background</h3>
            <div className="toggle-group">
              <label className={classNames('pill-radio', { active: background.mode === 'solid' })}>
                <input
                  type="radio"
                  checked={background.mode === 'solid'}
                  onChange={() => handleBackgroundMode('solid')}
                />
                Solid
              </label>
              <label className={classNames('pill-radio', { active: background.mode === 'gradient' })}>
                <input
                  type="radio"
                  checked={background.mode === 'gradient'}
                  onChange={() => handleBackgroundMode('gradient')}
                />
                Gradient
              </label>
            </div>
            {background.mode === 'solid' ? (
              <label className="background-field">
                Color
                <input
                  type="color"
                  value={background.solidColor}
                  onChange={(event) => updateSetting(['background', 'solidColor'], event.target.value)}
                />
              </label>
            ) : (
              <div className="gradient-controls">
                {background.gradientStops.map((stop, index) => (
                  <label key={index}>
                    Stop {index + 1}
                    <input type="color" value={stop || '#000000'} onChange={(event) => handleBackgroundStop(index, event.target.value)} />
                  </label>
                ))}
                <label>
                  Angle
                  <input
                    type="number"
                    value={background.gradientAngle}
                    onChange={(event) => updateSetting(['background', 'gradientAngle'], Number(event.target.value))}
                  />
                </label>
              </div>
            )}
            <label className="toggle">
              <input
                type="checkbox"
                checked={background.starfield}
                onChange={(event) => updateSetting(['background', 'starfield'], event.target.checked)}
              />
              <span>Starfield overlay</span>
            </label>
          </div>
        </Section>

        <Section title="Presets & Export">
          <div className="preset-grid">
            {presets.map((preset) => (
              <button key={preset.name} className="pill-button secondary" onClick={() => loadPreset(preset.name)}>
                {preset.name}
              </button>
            ))}
          </div>
          {Object.keys(savedPresets).length > 0 && (
            <div className="saved-presets">
              <h4>Saved</h4>
              <div className="preset-grid">
                {Object.keys(savedPresets).map((name) => (
                  <button key={name} className="pill-button tertiary" onClick={() => loadPreset(name)}>
                    {name}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="save-preset">
            <input
              type="text"
              placeholder="Preset name"
              value={presetName}
              onChange={(event) => setPresetName(event.target.value)}
            />
            <button className="pill-button" onClick={handleSavePreset}>
              Save Preset
            </button>
          </div>
          <div className="control-grid">
            <button className="pill-button secondary" onClick={() => engineRef.current?.captureScreenshot()}>
              Screenshot
            </button>
            <button className="pill-button secondary" onClick={() => engineRef.current?.captureVideo(5)}>
              Record 5s WebM
            </button>
          </div>
        </Section>
      </div>
    </aside>
  );
};

export default ControlPanel;
