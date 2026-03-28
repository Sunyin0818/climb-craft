'use client';

import React, { useState } from 'react';
import { ThreeEvent } from '@react-three/fiber';
import type { ConnectorShape } from '@/store/useSceneStore';

interface ConnectorProps {
  position: [number, number, number];
  shape?: ConnectorShape;
  isPreview?: boolean;
  isError?: boolean;
  onClick?: (e: ThreeEvent<MouseEvent>) => void;
  onPointerEnter?: (e: ThreeEvent<PointerEvent>) => void;
  onPointerLeave?: (e: ThreeEvent<PointerEvent>) => void;
}

export default function Connector({ position, isPreview, isError, onClick, onPointerEnter, onPointerLeave }: ConnectorProps) {
  const [isHovered, setHovered] = useState(false);

  let finalColor = "#111111"; // Default black
  if (isError) finalColor = "#ef4444"; // Red error
  else if (isPreview) finalColor = "lightgreen";

  const scaleMultiplier = isHovered && !isPreview ? 1.3 : 1;

  return (
    <mesh 
      position={position}
      scale={[scaleMultiplier, scaleMultiplier, scaleMultiplier]}
      onClick={onClick}
      onPointerEnter={(e) => {
        setHovered(true);
        if (onPointerEnter) onPointerEnter(e);
      }}
      onPointerLeave={(e) => {
        setHovered(false);
        if (onPointerLeave) onPointerLeave(e);
      }}
    >
      <sphereGeometry args={[25, 32, 32]} />
      <meshStandardMaterial 
        color={finalColor} 
        emissive={isHovered ? finalColor : "#000000"}
        emissiveIntensity={isHovered ? 0.3 : 0}
        transparent={isPreview || isError} 
        opacity={(isPreview || isError) ? 0.6 : 1} 
        roughness={0.2}
        metalness={0.8}
      />
    </mesh>
  );
}
