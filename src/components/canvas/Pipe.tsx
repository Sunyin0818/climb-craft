'use client';

import React, { useMemo, useState } from 'react';
import * as THREE from 'three';

interface PipeProps {
  start: [number, number, number];
  end: [number, number, number];
  isPreview?: boolean;
  isError?: boolean;
  isSelected?: boolean;
  onClick?: (e: any) => void;
}

const Pipe: React.FC<PipeProps> = ({ start, end, isPreview, isError, isSelected, onClick }) => {
  const [isHovered, setHovered] = useState(false);

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
    const q = new THREE.Quaternion().setFromUnitVectors(defaultUp, direction);
    return q;
  }, [dx, dy, dz]);

  // 管子渲染长度（接头中心到接头中心，实际减去一点避免完全重叠）
  const pipeLength = Math.max(0, distance);

  // 判断实际逻辑跨度（C2C距离/50）以赋予不同管线颜色
  const logicSpan = Math.round(distance / 50);
  let baseColor = "#eeeeee";
  if (isError) {
    baseColor = "#ef4444"; // 错误警示红
  } else {
    // 放弃蓝色以避免和地面混淆。修改为更为鲜明的色阶
    if (logicSpan === 8) baseColor = "#ef4444"; // 长管红色
    else if (logicSpan === 6) baseColor = "#10b981"; // 中管绿色
    else if (logicSpan === 4) baseColor = "#f59e0b"; // 短管橙色
  }

  const matColor = isPreview && !isError ? "lightgreen" : baseColor;

  return (
    <mesh 
      position={[midX, midY, midZ]} 
      quaternion={quaternion}
      onPointerEnter={(e) => { e.stopPropagation(); setHovered(true); }}
      onPointerLeave={(e) => { e.stopPropagation(); setHovered(false); }}
      onClick={onClick}
    >
      <cylinderGeometry args={[15, 15, pipeLength, 32]} />
      <meshStandardMaterial 
        color={matColor} 
        emissive={matColor}
        emissiveIntensity={isHovered || isSelected ? 0.4 : 0}
        transparent={isPreview || isError} 
        opacity={(isPreview || isError) ? 0.6 : 1} 
        metalness={0.2}
        roughness={0.5}
      />
    </mesh>
  );
};

export default Pipe;
