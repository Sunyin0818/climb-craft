'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';

export default function Stage() {
  return (
    <div className="w-full h-full bg-neutral-900 border-none outline-none overflow-hidden m-0 p-0">
      <Canvas camera={{ position: [500, 500, 500], fov: 45 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        
        <Grid 
          renderOrder={-1} 
          position={[0, -25, 0]} 
          infiniteGrid 
          cellSize={50} // 1 LU = 50mm
          cellThickness={1}
          sectionSize={250} // 5 LU
          sectionThickness={1.5}
          sectionColor="#8080ff"
          cellColor="#999999"
        />
        
        {/* TODO: 渲染 Nodes (连接件) 和 Edges (管子) */}
        
        <OrbitControls makeDefault />
      </Canvas>
    </div>
  );
}
