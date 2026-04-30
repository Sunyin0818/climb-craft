import { AXIS_IDX } from '@/core/engine/SlotEnumerator';
import type { PanelSlot, Axis } from '@/core/engine/SlotEnumerator';
import type { Ray } from 'three';

const LU = 50;

/**
 * 通过射线-平面交叉检测鼠标悬停在哪个槽位上。
 * 对每个槽位所在的平面测试射线交叉，找到最近的有效槽位。
 */
export function findSlotByRaycast(
  ray: Ray,
  slots: PanelSlot[],
): number {
  const origin = ray.origin;
  const direction = ray.direction;
  let bestT = Infinity;
  let bestIdx = -1;

  for (let i = 0; i < slots.length; i++) {
    const s = slots[i];
    const ci = AXIS_IDX[s.axis as Axis];
    const dirComp = direction.getComponent(ci);
    if (Math.abs(dirComp) < 1e-10) continue;

    const planeVal = s.position[ci] * LU;
    const t = (planeVal - origin.getComponent(ci)) / dirComp;
    if (t <= 0 || t >= bestT) continue;

    const d0Idx = ci === 0 ? 1 : 0;
    const d1Idx = ci === 2 ? 1 : 2;
    const hitD0 = origin.getComponent(d0Idx) + t * direction.getComponent(d0Idx);
    const hitD1 = origin.getComponent(d1Idx) + t * direction.getComponent(d1Idx);

    const sD0 = s.position[d0Idx] * LU;
    const sD1 = s.position[d1Idx] * LU;
    const sW = s.size[0] * LU;
    const sH = s.size[1] * LU;

    if (hitD0 >= sD0 && hitD0 < sD0 + sW && hitD1 >= sD1 && hitD1 < sD1 + sH) {
      bestT = t;
      bestIdx = i;
    }
  }
  return bestIdx;
}
