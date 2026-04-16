'use client';

import React, { useMemo, useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import { ThreeEvent } from '@react-three/fiber';

interface InstancedPipesProps {
  edges: Record<string, any>;
  nodes: Record<string, any>;
  selectedEdgeId: string | null;
  onPipeClick: (edgeId: string, e: ThreeEvent<MouseEvent>) => void;
}

const UNIT_CYLINDER = new THREE.CylinderGeometry(15, 15, 1, 32);
const TEMP_MATRIX = new THREE.Matrix4();
const TEMP_POSITION = new THREE.Vector3();
const TEMP_QUATERNION = new THREE.Quaternion();
const TEMP_SCALE = new THREE.Vector3();
const TEMP_COLOR = new THREE.Color();
const DEFAULT_UP = new THREE.Vector3(0, 1, 0);

export default function InstancedPipes({ edges, nodes, selectedEdgeId, onPipeClick }: InstancedPipesProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  
  const edgesArray = useMemo(() => Object.values(edges), [edges]);

  // Effect to update matrix transforms
  useEffect(() => {
    if (!meshRef.current || edgesArray.length === 0) return;
    
    meshRef.current.count = edgesArray.length;

    edgesArray.forEach((edge, i) => {
      const start = nodes[edge.start]?.position;
      const end = nodes[edge.end]?.position;
      if (!start || !end) return;

      const dx = end[0] - start[0];
      const dy = end[1] - start[1];
      const dz = end[2] - start[2];
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
      
      const midX = start[0] + dx / 2;
      const midY = start[1] + dy / 2;
      const midZ = start[2] + dz / 2;

      TEMP_POSITION.set(midX, midY, midZ);
      const direction = new THREE.Vector3(dx, dy, dz).normalize();
      TEMP_QUATERNION.setFromUnitVectors(DEFAULT_UP, direction);
      
      const pipeLength = Math.max(0.1, distance);
      TEMP_SCALE.set(1, pipeLength, 1);
      
      TEMP_MATRIX.compose(TEMP_POSITION, TEMP_QUATERNION, TEMP_SCALE);
      meshRef.current!.setMatrixAt(i, TEMP_MATRIX);
    });
    
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [edgesArray, nodes]);

  // Effect to update colors dynamically (including active/hover state)
  useEffect(() => {
    if (!meshRef.current || edgesArray.length === 0) return;

    edgesArray.forEach((edge, i) => {
      const start = nodes[edge.start]?.position;
      const end = nodes[edge.end]?.position;
      if (!start || !end) {
        TEMP_COLOR.set("#ffffff");
        meshRef.current!.setColorAt(i, TEMP_COLOR);
        return;
      }

      const dx = end[0] - start[0];
      const dy = end[1] - start[1];
      const dz = end[2] - start[2];
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const logicSpan = Math.round(distance / 50);

      let baseColor = edge.color;
      if (!baseColor) {
        baseColor = "#eeeeee";
        if (logicSpan === 8) baseColor = "#ef4444";
        else if (logicSpan === 6) baseColor = "#10b981";
        else if (logicSpan === 4) baseColor = "#f59e0b";
      }

      TEMP_COLOR.set(baseColor);
      
      const isSelected = selectedEdgeId === edge.id;
      const isHovered = hoveredIndex === i;

      if (isSelected || isHovered) {
        // Blend with white to emulate the emissive highlight
        TEMP_COLOR.lerp(new THREE.Color(0xffffff), 0.5);
      }

      meshRef.current!.setColorAt(i, TEMP_COLOR);
    });
    
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  }, [edgesArray, nodes, selectedEdgeId, hoveredIndex]);

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
    e.stopPropagation();
    if (e.instanceId !== undefined) {
      const edge = edgesArray[e.instanceId];
      if (edge) {
        onPipeClick(edge.id, e);
      }
    }
  };

  if (edgesArray.length === 0) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[UNIT_CYLINDER, undefined, 20000]} // Max 20,000 pipes support
      onPointerMove={handlePointerMove}
      onPointerOut={handlePointerOut}
      onClick={handleClick}
      // Ensure bounding sphere encompasses everything to avoid frustum culling bugs
      frustumCulled={false} 
    >
      <meshStandardMaterial 
        metalness={0.2}
        roughness={0.5}
      />
    </instancedMesh>
  );
}
