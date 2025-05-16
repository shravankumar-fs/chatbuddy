import React from 'react';
import { Canvas } from '@react-three/fiber';
import Plane from './components/Plane';
import { OrbitControls } from '@react-three/drei';

const App: React.FC = () => {
  return (
    <Canvas
      style={{ height: '100vh', width: '100vw' }}
      camera={{ position: [0, 0, 5] }}
    >
      <Plane />
      <OrbitControls />
    </Canvas>
  );
};

export default App;
