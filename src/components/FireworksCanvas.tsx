import React, { useEffect, useRef } from 'react';
import { FireworksEngine } from '../three/FireworksEngine';

type FireworksCanvasProps = {
  onEngineReady?: (engine: FireworksEngine) => void;
};

export const FireworksCanvas: React.FC<FireworksCanvasProps> = ({ onEngineReady }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<FireworksEngine | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new FireworksEngine(canvas);
    engineRef.current = engine;
    onEngineReady?.(engine);

    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      engine.resize(width, height);
    };

    handleResize();

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      engine.dispose();
      engineRef.current = null;
    };
  }, [onEngineReady]);

  return <canvas ref={canvasRef} className="fireworks-canvas" />;
};

export default FireworksCanvas;
