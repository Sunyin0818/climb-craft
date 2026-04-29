'use client';

import { useRef, useLayoutEffect } from 'react';
import { InstancedMesh, Object3D, Color } from 'three';
import type { PanelSlot } from '@/core/engine/SlotEnumerator';

const tempObject = new Object3D();
const tempColor = new Color();

const SLOT_COLOR = new Color('#22c55e');
const SLOT_OPACITY = 0.15;

interface PanelSlotOverlaysProps {
  slots: PanelSlot[];
}

export default function PanelSlotOverlays({
  slots,
}: PanelSlotOverlaysProps) {
  const meshRef = useRef<InstancedMesh>(null);

  useLayoutEffect(() => {
    if (!meshRef.current) return;

    slots.forEach((slot, i) => {
      const width = slot.size[0] * 50;
      const height = slot.size[1] * 50;
      const thickness = 10;
      const { axis } = slot;

      tempObject.rotation.set(0, 0, 0);
      let ox = width / 2, oy = 0, oz = height / 2;

      if (axis === 'x') {
        tempObject.rotation.set(0, 0, Math.PI / 2);
        ox = 0; oy = width / 2; oz = height / 2;
      } else if (axis === 'z') {
        tempObject.rotation.set(Math.PI / 2, 0, 0);
        ox = width / 2; oy = height / 2; oz = 0;
      }

      tempObject.position.set(
        slot.position[0] * 50 + ox,
        slot.position[1] * 50 + oy,
        slot.position[2] * 50 + oz
      );

      tempObject.scale.set(
        axis === 'x' ? thickness : width,
        axis === 'y' ? thickness : height,
        (axis === 'x' || axis === 'y') ? height : thickness
      );

      tempObject.updateMatrix();
      meshRef.current?.setMatrixAt(i, tempObject.matrix);
      meshRef.current?.setColorAt(i, tempColor.copy(SLOT_COLOR));
    });

    if (meshRef.current) {
      meshRef.current.count = slots.length;
      meshRef.current.instanceMatrix.needsUpdate = true;
      if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
    }
  }, [slots]);

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, 1000]}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial
        color={SLOT_COLOR}
        transparent
        opacity={SLOT_OPACITY}
        depthTest={false}
      />
    </instancedMesh>
  );
}
