import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { findSlotByRaycast } from './SlotRaycast';
import type { PanelSlot } from '@/core/engine/SlotEnumerator';

const LU = 50;

function makeRay(origin: [number, number, number], dir: [number, number, number]): THREE.Ray {
  return new THREE.Ray(
    new THREE.Vector3(...origin),
    new THREE.Vector3(...dir).normalize(),
  );
}

describe('findSlotByRaycast', () => {
  describe('基本命中检测', () => {
    it('正对 YZ 平面 (axis=x) 的射线应命中对应槽位', () => {
      // 槽位在 x=0 平面, 逻辑坐标 [0,0,0], 大小 [8,8]
      // 世界坐标: position=[0,0,0]*50=[0,0,0], 范围 [0,400]x[0,400]
      const slots: PanelSlot[] = [{ position: [0, 0, 0], size: [8, 8], axis: 'x' }];
      // 射线从 x=-100 出发，沿 +X 方向，y=200, z=200 (在槽位范围内)
      const ray = makeRay([-100, 200, 200], [1, 0, 0]);
      expect(findSlotByRaycast(ray, slots)).toBe(0);
    });

    it('射线方向与平面平行时应跳过 (dirComp ≈ 0)', () => {
      const slots: PanelSlot[] = [{ position: [0, 0, 0], size: [8, 8], axis: 'x' }];
      // 沿 Y 方向，与 X=0 平面平行
      const ray = makeRay([0, 0, 0], [0, 1, 0]);
      expect(findSlotByRaycast(ray, slots)).toBe(-1);
    });

    it('命中点在槽位边界外时返回 -1', () => {
      const slots: PanelSlot[] = [{ position: [0, 0, 0], size: [8, 8], axis: 'x' }];
      // y=5000 远超槽位范围 [0,400]
      const ray = makeRay([-100, 5000, 5000], [1, 0, 0]);
      expect(findSlotByRaycast(ray, slots)).toBe(-1);
    });
  });

  describe('多槽位选择', () => {
    it('应返回最近的 (t 最小的) 槽位', () => {
      const slots: PanelSlot[] = [
        { position: [0, 0, 0], size: [8, 8], axis: 'x' },  // x=0 平面
        { position: [5, 0, 0], size: [8, 8], axis: 'x' },  // x=250 平面
      ];
      const ray = makeRay([-100, 200, 200], [1, 0, 0]);
      expect(findSlotByRaycast(ray, slots)).toBe(0);
    });

    it('较远的槽位在前面时返回较远的', () => {
      const slots: PanelSlot[] = [
        { position: [5, 0, 0], size: [8, 8], axis: 'x' },  // x=250 平面
        { position: [0, 0, 0], size: [8, 8], axis: 'x' },  // x=0 平面
      ];
      const ray = makeRay([-100, 200, 200], [1, 0, 0]);
      // x=0 更近，index=1
      expect(findSlotByRaycast(ray, slots)).toBe(1);
    });
  });

  describe('边界情况', () => {
    it('空槽位数组返回 -1', () => {
      expect(findSlotByRaycast(makeRay([0, 0, 0], [1, 0, 0]), [])).toBe(-1);
    });

    it('射线 t <= 0 (起点在平面之后) 时跳过', () => {
      const slots: PanelSlot[] = [{ position: [0, 0, 0], size: [8, 8], axis: 'x' }];
      // 起点 x=100，方向 +X，平面在 x=0 -> t < 0
      const ray = makeRay([100, 200, 200], [1, 0, 0]);
      expect(findSlotByRaycast(ray, slots)).toBe(-1);
    });

    it('Y 轴法线槽位', () => {
      const slots: PanelSlot[] = [{ position: [0, 0, 0], size: [8, 8], axis: 'y' }];
      // Y=0 平面，从下方沿 +Y 射线
      const ray = makeRay([200, -100, 200], [0, 1, 0]);
      expect(findSlotByRaycast(ray, slots)).toBe(0);
    });

    it('Z 轴法线槽位', () => {
      const slots: PanelSlot[] = [{ position: [0, 0, 0], size: [8, 8], axis: 'z' }];
      // Z=0 平面，从 -Z 方向射线
      const ray = makeRay([200, 200, -100], [0, 0, 1]);
      expect(findSlotByRaycast(ray, slots)).toBe(0);
    });
  });
});
