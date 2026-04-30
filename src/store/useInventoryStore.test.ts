import { describe, it, expect, beforeEach } from 'vitest';
import { useInventoryStore, computeUsedCounts } from './useInventoryStore';
import { createTestNode, createTestEdge, createTestPanel } from '@/__tests__/factories';

describe('useInventoryStore', () => {
  beforeEach(() => {
    useInventoryStore.setState({
      stock: {
        '8': 0, '6': 0, '4': 0,
        'STRAIGHT': 0, 'L': 0, 'T': 0, '3WAY': 0, '4WAY': 0, '5WAY': 0, '6WAY': 0,
        'PANEL_8x8': 0, 'PANEL_8x4': 0,
      },
      price: {
        '8': 15.0, '6': 12.0, '4': 10.0,
        'STRAIGHT': 2.0, 'L': 3.0, 'T': 4.0, '3WAY': 5.0, '4WAY': 6.0, '5WAY': 7.0, '6WAY': 8.0,
        'PANEL_8x8': 45.0, 'PANEL_8x4': 25.0,
      },
    });
  });

  describe('setStock', () => {
    it('更新库存', () => {
      useInventoryStore.getState().setStock('8', 10);
      expect(useInventoryStore.getState().stock['8']).toBe(10);
    });
    it('负值 clamp 到 0', () => {
      useInventoryStore.getState().setStock('8', -5);
      expect(useInventoryStore.getState().stock['8']).toBe(0);
    });
    it('零值', () => {
      useInventoryStore.getState().setStock('8', 0);
      expect(useInventoryStore.getState().stock['8']).toBe(0);
    });
  });

  describe('setPrice', () => {
    it('更新单价', () => {
      useInventoryStore.getState().setPrice('L', 5.0);
      expect(useInventoryStore.getState().price['L']).toBe(5.0);
    });
    it('负值 clamp 到 0', () => {
      useInventoryStore.getState().setPrice('L', -1);
      expect(useInventoryStore.getState().price['L']).toBe(0);
    });
  });
});

describe('computeUsedCounts', () => {
  it('按长度统计管子', () => {
    const edges = {
      a: createTestEdge('a', '0,0,0', '8,0,0', 8),
      b: createTestEdge('b', '8,0,0', '16,0,0', 8),
      c: createTestEdge('c', '16,0,0', '22,0,0', 6),
    };
    const counts = computeUsedCounts({}, edges, {});
    expect(counts['8']).toBe(2);
    expect(counts['6']).toBe(1);
    expect(counts['4']).toBe(0);
  });

  it('按 shape 统计连接器（跳过 UNKNOWN）', () => {
    const nodes = {
      n1: createTestNode('n1', [0, 0, 0], 'L'),
      n2: createTestNode('n2', [8, 0, 0], 'T'),
      n3: createTestNode('n3', [16, 0, 0], 'UNKNOWN'),
    };
    const counts = computeUsedCounts(nodes, {}, {});
    expect(counts['L']).toBe(1);
    expect(counts['T']).toBe(1);
    // UNKNOWN 被跳过
    expect(counts['L'] + counts['T']).toBe(2);
  });

  it('按尺寸统计面板', () => {
    const panels = {
      p1: createTestPanel('p1', [0, 0, 0], [8, 8], 'y'),
      p2: createTestPanel('p2', [8, 0, 0], [8, 4], 'y'),
    };
    const counts = computeUsedCounts({}, {}, panels);
    expect(counts['PANEL_8x8']).toBe(1);
    expect(counts['PANEL_8x4']).toBe(1);
  });

  it('全空场景', () => {
    const counts = computeUsedCounts({}, {}, {});
    expect(Object.values(counts).every(v => v === 0)).toBe(true);
  });

  it('非 [8,8] 面板归入 8x4', () => {
    const panels = {
      p1: createTestPanel('p1', [0, 0, 0], [6, 4], 'y'),
    };
    const counts = computeUsedCounts({}, {}, panels);
    expect(counts['PANEL_8x8']).toBe(0);
    expect(counts['PANEL_8x4']).toBe(1);
  });

  it('pipe length=4 统计', () => {
    const edges = {
      a: createTestEdge('a', '0,0,0', '4,0,0', 4),
    };
    const counts = computeUsedCounts({}, edges, {});
    expect(counts['4']).toBe(1);
  });

  it('所有 connector shape 分别统计', () => {
    const shapes = ['STRAIGHT', 'L', 'T', '3WAY', '4WAY', '5WAY', '6WAY'] as const;
    const nodes: Record<string, any> = {};
    shapes.forEach((s, i) => {
      nodes[`n${i}`] = createTestNode(`n${i}`, [i, 0, 0], s);
    });
    const counts = computeUsedCounts(nodes, {}, {});
    shapes.forEach(s => {
      expect(counts[s]).toBe(1);
    });
  });
});
