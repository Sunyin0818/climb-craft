'use client';

import React, { useMemo } from 'react';
import * as THREE from 'three';

interface PipeProps {
  start: [number, number, number];
  end: [number, number, number];
  isPreview?: boolean;
  isError?: boolean;
}

const UNIT_CYLINDER = new THREE.CylinderGeometry(15, 15, 1, 32);

export default function Pipe({ start, end, isPreview, isError }: PipeProps) {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const dz = end[2] - start[2];
  const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
  
  const midX = start[0] + dx / 2;
  const midY = start[1] + dy / 2;
  const midZ = start[2] + dz / 2;

  const quaternion = useMemo(() => {
    const defaultUp = new THREE.Vector3(0, 1, 0);
    const direction = new THREE.Vector3(dx, dy, dz).normalize();
    return new THREE.Quaternion().setFromUnitVectors(defaultUp, direction);
  }, [dx, dy, dz]);

  const pipeLength = Math.max(0.1, distance);

  const logicSpan = Math.round(distance / 50);
  let baseColor = "#eeeeee";
  if (isError) {
    baseColor = "#ef4444";
  } else {
    if (logicSpan === 8) baseColor = "#ef4444";
    else if (logicSpan === 6) baseColor = "#10b981";
    else if (logicSpan === 4) baseColor = "#f59e0b";
  }

  const matColor = isPreview && !isError ? "lightgreen" : baseColor;

  return (
    <mesh 
      position={[midX, midY, midZ]} 
      quaternion={quaternion}
      scale={[1, pipeLength, 1]}
      geometry={UNIT_CYLINDER}
      /* 移除冗余鼠标事件，强制禁用射线检测防止预览模型遮挡下方点击 */
      raycast={() => null}
    >
      <meshStandardMaterial 
        color={matColor} 
        transparent={isPreview || isError} 
        opacity={(isPreview || isError) ? 0.6 : 1} 
        metalness={0.2}
        roughness={0.5}
      />
    </mesh>
  );
}
