import { describe, it, expect } from 'vitest';
import { isPointOnEdgeBody, isSegmentColliding } from './CollisionUtils';
import { createTestNode, createTestEdge } from '@/__tests__/factories';
import type { NodeInstance, EdgeInstance } from '@/store/useSceneStore';

// 辅助：快速构建 nodes + edges
function makeScene(
  edgeDefs: { id: string; start: [number, number, number]; end: [number, number, number] }[]
) {
  const nodes: Record<string, NodeInstance> = {};
  const edges: Record<string, EdgeInstance> = {};
  for (const e of edgeDefs) {
    const startId = e.start.join(',');
    const endId = e.end.join(',');
    if (!nodes[startId]) nodes[startId] = createTestNode(startId, e.start);
    if (!nodes[endId]) nodes[endId] = createTestNode(endId, e.end);
    edges[e.id] = createTestEdge(e.id, startId, endId, 8);
  }
  return { nodes, edges };
}

describe('isPointOnEdgeBody', () => {
  const { nodes, edges } = makeScene([{ id: 'e1', start: [0, 0, 0], end: [4, 0, 0] }]);

  it('点在管子中间 -> true', () => {
    expect(isPointOnEdgeBody([2, 0, 0], edges, nodes)).toBe(true);
  });
  it('点在管子端点 -> false (strict)', () => {
    expect(isPointOnEdgeBody([0, 0, 0], edges, nodes)).toBe(false);
  });
  it('点在另一端点 -> false', () => {
    expect(isPointOnEdgeBody([4, 0, 0], edges, nodes)).toBe(false);
  });
  it('点不在管子所在直线上 -> false', () => {
    expect(isPointOnEdgeBody([2, 1, 0], edges, nodes)).toBe(false);
  });
  it('空 edges -> false', () => {
    expect(isPointOnEdgeBody([2, 0, 0], {}, {})).toBe(false);
  });
  it('Y 轴管子', () => {
    const scene = makeScene([{ id: 'e1', start: [0, 0, 0], end: [0, 4, 0] }]);
    expect(isPointOnEdgeBody([0, 2, 0], scene.edges, scene.nodes)).toBe(true);
    expect(isPointOnEdgeBody([0, 0, 0], scene.edges, scene.nodes)).toBe(false);
  });
  it('Z 轴管子', () => {
    const scene = makeScene([{ id: 'e1', start: [0, 0, 0], end: [0, 0, 4] }]);
    expect(isPointOnEdgeBody([0, 0, 2], scene.edges, scene.nodes)).toBe(true);
  });
});

describe('isSegmentColliding', () => {
  // Case 1: 端点在已有管子 body 上
  describe('Case 1: 端点在已有管子 body', () => {
    const scene = makeScene([{ id: 'e1', start: [0, 0, 0], end: [4, 0, 0] }]);

    it('起点在已有管中间 -> true', () => {
      expect(isSegmentColliding([2, 0, 0], [2, 4, 0], scene.edges, scene.nodes)).toBe(true);
    });
    it('终点在已有管中间 -> true', () => {
      expect(isSegmentColliding([2, 4, 0], [2, 0, 0], scene.edges, scene.nodes)).toBe(true);
    });
  });

  // Case 2: 新管穿越已有节点
  describe('Case 2: 穿越已有节点', () => {
    const scene = makeScene([
      { id: 'e1', start: [0, 0, 0], end: [2, 0, 0] },
      { id: 'e2', start: [2, 0, 0], end: [4, 0, 0] },
    ]);

    it('新管穿过已有节点 -> true', () => {
      expect(isSegmentColliding([2, 0, -2], [2, 0, 2], scene.edges, scene.nodes)).toBe(true);
    });
  });

  // Case 3a: 共线重叠
  describe('Case 3a: 共线重叠', () => {
    const scene = makeScene([{ id: 'e1', start: [0, 0, 0], end: [4, 0, 0] }]);

    it('部分重叠 -> true', () => {
      expect(isSegmentColliding([2, 0, 0], [6, 0, 0], scene.edges, scene.nodes)).toBe(true);
    });
    it('完全包含已有 -> true', () => {
      expect(isSegmentColliding([-1, 0, 0], [5, 0, 0], scene.edges, scene.nodes)).toBe(true);
    });
  });

  // Case 3b: 正交交叉
  describe('Case 3b: 正交交叉', () => {
    const scene = makeScene([{ id: 'e1', start: [0, 0, 0], end: [4, 0, 0] }]);

    it('正交穿过中间 -> true', () => {
      expect(isSegmentColliding([2, 0, -1], [2, 0, 1], scene.edges, scene.nodes)).toBe(true);
    });
    it('正交但不相交 -> false', () => {
      expect(isSegmentColliding([0, 1, 0], [4, 1, 0], scene.edges, scene.nodes)).toBe(false);
    });
  });

  // 无碰撞场景
  describe('无碰撞', () => {
    it('空 edges -> false', () => {
      expect(isSegmentColliding([0, 0, 0], [4, 0, 0], {}, {})).toBe(false);
    });
    it('端点共享但无内部交 -> false', () => {
      const scene = makeScene([{ id: 'e1', start: [0, 0, 0], end: [4, 0, 0] }]);
      expect(isSegmentColliding([0, 0, 0], [0, 4, 0], scene.edges, scene.nodes)).toBe(false);
    });
    it('平行不重叠 -> false', () => {
      const scene = makeScene([{ id: 'e1', start: [0, 0, 0], end: [4, 0, 0] }]);
      expect(isSegmentColliding([0, 0, 1], [4, 0, 1], scene.edges, scene.nodes)).toBe(false);
    });
    it('零长度段 -> false', () => {
      const scene = makeScene([{ id: 'e1', start: [0, 0, 0], end: [4, 0, 0] }]);
      expect(isSegmentColliding([2, 0, 0], [2, 0, 0], scene.edges, scene.nodes)).toBe(true);
    });
  });
});
