import React, { useRef } from 'react';
import ControlPanel from './components/ControlPanel';
import FireworksCanvas from './components/FireworksCanvas';
import { FireworksEngine } from './three/FireworksEngine';
import { useSettingsStore } from './store/settings';

const App: React.FC = () => {
  const engineRef = useRef<FireworksEngine | null>(null);
  const clickEnabled = useSettingsStore((state) => state.interaction.clickToBurst);

  return (
    <div className="app-shell">
      <ControlPanel engineRef={engineRef} />
      <div className="canvas-layer">
        <FireworksCanvas onEngineReady={(engine) => (engineRef.current = engine)} />
        <div className="canvas-overlay">
          <div className="instructions">
            <span>Continuous fireworks show active.</span>
            {clickEnabled ? <span>Click anywhere to launch a custom burst.</span> : <span>Click-to-burst disabled.</span>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
