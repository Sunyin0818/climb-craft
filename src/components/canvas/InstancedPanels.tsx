'use client';

import { useRef, useLayoutEffect, useMemo } from 'react';
import { InstancedMesh, Object3D, Color } from 'three';
import { PanelInstance } from '@/store/useSceneStore';

interface InstancedPanelsProps {
  panels: Record<string, PanelInstance>;
  onPointerDown?: (e: any) => void;
  onPanelClick?: (panelId: string, e: any) => void;
}

const tempObject = new Object3D();
const tempColor = new Color();

export default function InstancedPanels({ panels, onPointerDown, onPanelClick }: InstancedPanelsProps) {
  const meshRef = useRef<InstancedMesh>(null);
  const panelList = useMemo(() => Object.values(panels), [panels]);
  
  useLayoutEffect(() => {
    if (!meshRef.current) return;
    
    panelList.forEach((panel, i) => {
      const width = panel.size[0] * 50;
      const height = panel.size[1] * 50;
      const thickness = 10;
      const axis = panel.axis;

      // 确定旋转与位置偏移
      tempObject.rotation.set(0, 0, 0);
      let ox = width / 2, oy = 0, oz = height / 2;
      let sx = width, sy = thickness, sz = height;

      if (axis === 'x') {
        ox = 0; oy = width / 2; oz = height / 2;
        sx = thickness; sy = width; sz = height;
      } else if (axis === 'z') {
        ox = width / 2; oy = height / 2; oz = 0;
        sx = width; sy = height; sz = thickness;
      }

      tempObject.position.set(
        panel.position[0] * 50 + ox,
        panel.position[1] * 50 + oy,
        panel.position[2] * 50 + oz
      );

      // 设置缩放以匹配 size
      tempObject.scale.set(sx, sy, sz);

      tempObject.updateMatrix();
      meshRef.current?.setMatrixAt(i, tempObject.matrix);
      meshRef.current?.setColorAt(i, tempColor.set(panel.color));
    });

    meshRef.current.count = panelList.length;
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  }, [panelList]);

  // 为了让 scale.set 正常工作，我们需要一个 1x1x1 的 box
  return (
    <instancedMesh 
      ref={meshRef} 
      args={[undefined, undefined, 1000]} 
      onPointerDown={onPointerDown}
      onClick={(e) => {
        if (onPanelClick && e.instanceId !== undefined) {
          const panel = panelList[e.instanceId];
          if (panel) onPanelClick(panel.id, e);
        }
      }}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial roughness={0.7} />
    </instancedMesh>
  );
}
