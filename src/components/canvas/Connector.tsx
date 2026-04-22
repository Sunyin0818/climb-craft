'use client';

import React, { useMemo } from 'react';
import * as THREE from 'three';
import type { ConnectorShape } from '@/store/useSceneStore';

interface ConnectorProps {
  position: [number, number, number];
  shape?: ConnectorShape;
  isPreview?: boolean;
  isError?: boolean;
}

export default function Connector({ position, isPreview, isError }: ConnectorProps) {
  // 静态复用几何体
  const geometry = useMemo(() => new THREE.SphereGeometry(25, 32, 32), []);

  let finalColor = "#111111"; // Default black
  if (isError) finalColor = "#ef4444"; // Red error
  else if (isPreview) finalColor = "lightgreen";

  return (
    <mesh 
      position={position}
      geometry={geometry}
      /* 移除冗余鼠标事件，强制禁用射线检测防止预览模型遮挡下方点击 */
      raycast={() => null}
    >
      <meshStandardMaterial 
        color={finalColor} 
        transparent={isPreview || isError} 
        opacity={(isPreview || isError) ? 0.6 : 1} 
        roughness={0.2}
        metalness={0.8}
      />
    </mesh>
  );
}
