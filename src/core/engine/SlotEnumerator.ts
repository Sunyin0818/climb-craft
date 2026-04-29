import { CoordinateUtils } from '../utils/CoordinateUtils';
import type { EdgeInstance, PanelInstance } from '@/store/useSceneStore';

export interface PanelSlot {
  position: [number, number, number];
  size: [number, number];
  axis: 'x' | 'y' | 'z';
}

export type Axis = 'x' | 'y' | 'z';

const AXES: Axis[] = ['y', 'x', 'z'];
export const AXIS_IDX: Record<Axis, number> = { x: 0, y: 1, z: 2 };

function getEdgeAxis(a: [number, number, number], b: [number, number, number]): Axis | null {
  if (a[0] !== b[0]) return 'x';
  if (a[1] !== b[1]) return 'y';
  if (a[2] !== b[2]) return 'z';
  return null;
}

function isBetween(p: number, a: number, b: number): boolean {
  return p >= Math.min(a, b) && p <= Math.max(a, b);
}

/**
 * 检查是否存在一条边完全包含 [p1, p2] 子段
 */
function isEdgeContaining(
  p1: [number, number, number],
  p2: [number, number, number],
  edges: Record<string, EdgeInstance>,
  nodeMap: Record<string, [number, number, number]>
): boolean {
  const exactKey = CoordinateUtils.getEdgeKey(p1, p2);
  if (edges[exactKey]) return true;

  const axis = getEdgeAxis(p1, p2);
  if (!axis) return false;

  const ai = AXIS_IDX[axis];
  const otherAxes = [0, 1, 2].filter(i => i !== ai);

  for (const edge of Object.values(edges)) {
    const a = nodeMap[edge.start];
    const b = nodeMap[edge.end];
    if (!a || !b) continue;
    if (getEdgeAxis(a, b) !== axis) continue;
    if (a[otherAxes[0]] !== p1[otherAxes[0]] || a[otherAxes[1]] !== p1[otherAxes[1]]) continue;
    if (isBetween(p1[ai], a[ai], b[ai]) && isBetween(p2[ai], a[ai], b[ai])) {
      return true;
    }
  }
  return false;
}

function makePanelId(pos: [number, number, number], axis: Axis, size: [number, number]): string {
  return `panel--${pos.join(',')}-${axis}-${size.join(',')}`;
}

function parseNodeIdToLogicPosition(nodeId: string): [number, number, number] {
  const [x, y, z] = nodeId.split(',').map(Number);
  return [
    CoordinateUtils.toLogic(x),
    CoordinateUtils.toLogic(y),
    CoordinateUtils.toLogic(z),
  ];
}

function getRectCorners(
  origin: [number, number, number],
  w: number,
  h: number,
  axis: Axis
): [[number, number, number], [number, number, number], [number, number, number], [number, number, number]] {
  const [ox, oy, oz] = origin;
  if (axis === 'y') {
    return [[ox, oy, oz], [ox + w, oy, oz], [ox + w, oy, oz + h], [ox, oy, oz + h]];
  } else if (axis === 'x') {
    return [[ox, oy, oz], [ox, oy + w, oz], [ox, oy + w, oz + h], [ox, oy, oz + h]];
  } else {
    return [[ox, oy, oz], [ox + w, oy, oz], [ox + w, oy + h, oz], [ox, oy + h, oz]];
  }
}

/**
 * 枚举所有合法面板槽位
 *
 * 对每个轴平面，分别收集沿两个维度轴的管子，以面板尺寸为步长生成候选位置，
 * 交叉组合后用 isEdgeContaining 验证矩形四边。
 */
export function enumeratePanelSlots(
  edges: Record<string, EdgeInstance>,
  targetSize: [number, number],
  existingPanels: Record<string, PanelInstance>
): PanelSlot[] {
  const nodeMap: Record<string, [number, number, number]> = {};
  for (const edge of Object.values(edges)) {
    if (!nodeMap[edge.start]) nodeMap[edge.start] = parseNodeIdToLogicPosition(edge.start);
    if (!nodeMap[edge.end]) nodeMap[edge.end] = parseNodeIdToLogicPosition(edge.end);
  }

  const sizes: [number, number][] = targetSize[0] === targetSize[1]
    ? [targetSize]
    : [targetSize, [targetSize[1], targetSize[0]]];

  const seen = new Set<string>();
  const result: PanelSlot[] = [];

  for (const axis of AXES) {
    const dim0: Axis = axis === 'y' ? 'x' : axis === 'x' ? 'y' : 'x';
    const dim1: Axis = axis === 'y' ? 'z' : axis === 'x' ? 'z' : 'y';
    const constIdx = AXIS_IDX[axis];
    const d0Idx = AXIS_IDX[dim0];
    const d1Idx = AXIS_IDX[dim1];

    for (const [w, h] of sizes) {
      // 收集沿 dim0 和 dim1 的管子
      // 每条记录: [constVal, lo, hi]
      const dim0Edges: [number, number, number][] = [];
      const dim1Edges: [number, number, number][] = [];

      for (const edge of Object.values(edges)) {
        const a = nodeMap[edge.start];
        const b = nodeMap[edge.end];
        if (!a || !b) continue;

        const eAxis = getEdgeAxis(a, b);
        if (!eAxis) continue;

        if (eAxis === dim0) {
          dim0Edges.push([a[constIdx], Math.min(a[d0Idx], b[d0Idx]), Math.max(a[d0Idx], b[d0Idx])]);
        } else if (eAxis === dim1) {
          dim1Edges.push([a[constIdx], Math.min(a[d1Idx], b[d1Idx]), Math.max(a[d1Idx], b[d1Idx])]);
        }
      }

      // 从 dim0 管子生成候选: [constVal, dim0Pos]
      const dim0Candidates: [number, number][] = [];
      for (const [cv, lo, hi] of dim0Edges) {
        for (let v = lo; v + w <= hi + 0.01; v += w) {
          dim0Candidates.push([cv, v]);
        }
      }

      // 从 dim1 管子生成候选: [constVal, dim1Pos]
      const dim1Candidates: [number, number][] = [];
      for (const [cv, lo, hi] of dim1Edges) {
        for (let v = lo; v + h <= hi + 0.01; v += h) {
          dim1Candidates.push([cv, v]);
        }
      }

      // 交叉组合 constVal 相同的候选
      for (const [cv0, d0Pos] of dim0Candidates) {
        for (const [cv1, d1Pos] of dim1Candidates) {
          if (cv0 !== cv1) continue;

          const pos = [0, 0, 0] as [number, number, number];
          pos[constIdx] = cv0;
          pos[d0Idx] = d0Pos;
          pos[d1Idx] = d1Pos;

          const slotId = `slot--${pos.join(',')}-${axis}-${w},${h}`;
          if (seen.has(slotId)) continue;
          seen.add(slotId);

          if (existingPanels[makePanelId(pos, axis, [w, h])]) continue;

          const [c0, c1, c2, c3] = getRectCorners(pos, w, h, axis);

          if (
            isEdgeContaining(c0, c1, edges, nodeMap) &&
            isEdgeContaining(c1, c2, edges, nodeMap) &&
            isEdgeContaining(c2, c3, edges, nodeMap) &&
            isEdgeContaining(c3, c0, edges, nodeMap)
          ) {
            result.push({ position: pos, size: [w, h], axis });
          }
        }
      }
    }
  }

  return result;
}
