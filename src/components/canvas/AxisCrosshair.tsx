'use client';

import { useMemo } from 'react';
import { ThreeEvent } from '@react-three/fiber';
import { Vector3, Quaternion } from 'three';

const AXES = [
  new Vector3(0, 1, 0), new Vector3(0, -1, 0),
  new Vector3(1, 0, 0), new Vector3(-1, 0, 0),
  new Vector3(0, 0, 1), new Vector3(0, 0, -1)
];

const DEFAULT_UP = new Vector3(0, 1, 0);

interface AxisCrosshairProps {
  startPoint: [number, number, number];
  length: number;
  onHover: (target: [number, number, number]) => void;
  onClick: (target: [number, number, number]) => void;
  onPointerDown: (e: ThreeEvent<PointerEvent>) => void;
}

export default function AxisCrosshair({ startPoint, length, onHover, onClick, onPointerDown }: AxisCrosshairProps) {
  const midPoints = useMemo(() => {
    return AXES.map(v => new Vector3().copy(v).multiplyScalar(length / 2));
  }, [length]);

  const quaternions = useMemo(() => {
    return AXES.map(v => new Quaternion().setFromUnitVectors(DEFAULT_UP, v));
  }, []);

  if (!startPoint || length <= 0) return null;

  return (
    <group position={startPoint}>
      {AXES.map((v, i) => {
        const target: [number, number, number] = [
          startPoint[0] + v.x * length,
          startPoint[1] + v.y * length,
          startPoint[2] + v.z * length,
        ];

        return (
          <group
            key={i}
            position={midPoints[i]}
            quaternion={quaternions[i]}
          >
            <mesh>
              <cylinderGeometry args={[2, 2, length, 8]} />
              <meshBasicMaterial color="#d946ef" transparent opacity={0.8} depthTest={false} />
            </mesh>
            <mesh
              onPointerMove={(e) => { e.stopPropagation(); onHover(target); }}
              onPointerDown={onPointerDown}
              onClick={(e) => {
                e.stopPropagation();
                onClick(target);
              }}
            >
              <cylinderGeometry args={[40, 40, length, 8]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
