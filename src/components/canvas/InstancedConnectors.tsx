'use client';

import React, { useMemo, useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import { ThreeEvent } from '@react-three/fiber';

interface InstancedConnectorsProps {
  nodes: Record<string, any>;
  onNodeClick: (nodeId: string, e: ThreeEvent<MouseEvent>) => void;
}

const UNIT_SPHERE = new THREE.SphereGeometry(25, 32, 32);
const TEMP_MATRIX = new THREE.Matrix4();
const TEMP_POSITION = new THREE.Vector3();
const TEMP_QUATERNION = new THREE.Quaternion(); // Identity
const TEMP_SCALE = new THREE.Vector3();
const TEMP_COLOR = new THREE.Color();

export default function InstancedConnectors({ nodes, onNodeClick }: InstancedConnectorsProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  
  const nodesArray = useMemo(() => Object.values(nodes), [nodes]);

  useEffect(() => {
    if (!meshRef.current || nodesArray.length === 0) return;
    
    meshRef.current.count = nodesArray.length;

    nodesArray.forEach((node, i) => {
      const pos = node.position;
      TEMP_POSITION.set(pos[0], pos[1], pos[2]);
      
      const isHovered = hoveredIndex === i;
      const scaleMultiplier = isHovered ? 1.3 : 1;
      TEMP_SCALE.set(scaleMultiplier, scaleMultiplier, scaleMultiplier);
      
      TEMP_MATRIX.compose(TEMP_POSITION, TEMP_QUATERNION, TEMP_SCALE);
      meshRef.current!.setMatrixAt(i, TEMP_MATRIX);

      const finalColor = "#111111";
      TEMP_COLOR.set(finalColor);
      
      if (isHovered) {
        // Emulate emissive highlight for nodes as well
        TEMP_COLOR.lerp(new THREE.Color(0xffffff), 0.3);
      }

      meshRef.current!.setColorAt(i, TEMP_COLOR);
    });
    
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  }, [nodesArray, hoveredIndex]);

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (e.instanceId !== undefined && e.instanceId !== hoveredIndex) {
      setHoveredIndex(e.instanceId);
    }
  };

  const handlePointerOut = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHoveredIndex(null);
  };

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    if (e.instanceId !== undefined) {
      const node = nodesArray[e.instanceId];
      if (node) {
        onNodeClick(node.id, e);
      }
    }
  };

  if (nodesArray.length === 0) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[UNIT_SPHERE, undefined, 20000]} // Max capacity 20,000 nodes
      onPointerMove={handlePointerMove}
      onPointerOut={handlePointerOut}
      onClick={handleClick}
      frustumCulled={false}
    >
      <meshStandardMaterial 
        roughness={0.2}
        metalness={0.8}
      />
    </instancedMesh>
  );
}
