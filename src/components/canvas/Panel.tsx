'use client';

import { Vector3, Euler } from 'three';

interface PanelProps {
  position: [number, number, number];
  size: [number, number];
  axis: 'x' | 'y' | 'z';
  color?: string;
  isPreview?: boolean;
}

export default function Panel({ position, size, axis, color = '#3b82f6', isPreview }: PanelProps) {
  // 核心几何逻辑：
  // size 是 [width_in_LU, height_in_LU]，1 LU = 50mm
  // axis 是法线方向：
  // y: 水平放置 (XZ 平面)，宽沿 X，高沿 Z
  // x: 垂直放置 (YZ 平面)，宽沿 Y，高沿 Z
  // z: 垂直放置 (XY 平面)，宽沿 X，高沿 Y

  const width = size[0] * 50;
  const height = size[1] * 50;
  const thickness = 10; // 10mm 厚度

  let rotation = new Euler(0, 0, 0);
  let offset = new Vector3(width / 2, 0, height / 2); // 默认 y 轴

  if (axis === 'y') {
    rotation.set(0, 0, 0);
    offset.set(width / 2, 0, height / 2);
  } else if (axis === 'x') {
    rotation.set(0, 0, Math.PI / 2);
    offset.set(0, width / 2, height / 2);
  } else if (axis === 'z') {
    rotation.set(Math.PI / 2, 0, 0);
    offset.set(width / 2, height / 2, 0);
  }

  return (
    <mesh 
      position={[
        position[0] * 50 + offset.x, 
        position[1] * 50 + offset.y, 
        position[2] * 50 + offset.z
      ]} 
      rotation={rotation}
    >
      <boxGeometry args={[axis === 'x' ? thickness : width, axis === 'y' ? thickness : height, (axis === 'x' || axis === 'y') ? height : thickness]} />
      <meshStandardMaterial 
        color={color} 
        transparent={isPreview} 
        opacity={isPreview ? 0.6 : 1}
        roughness={0.7}
      />
    </mesh>
  );
}
