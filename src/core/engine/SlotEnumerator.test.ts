import { describe, it, expect } from 'vitest';
import { enumeratePanelSlots } from './SlotEnumerator';
import { createTestEdge, createTestPanel } from '@/__tests__/factories';
import type { EdgeInstance, PanelInstance } from '@/store/useSceneStore';

// 注意: SlotEnumerator 的 nodeId 是世界坐标(mm)，内部通过 parseNodeIdToLogicPosition 转换
// 8 逻辑格 = 400mm, 4 逻辑格 = 200mm

function makeEdges(defs: { id: string; start: string; end: string; length?: number }[]): Record<string, EdgeInstance> {
  const edges: Record<string, EdgeInstance> = {};
  for (const d of defs) {
    edges[d.id] = createTestEdge(d.id, d.start, d.end, d.length ?? 8);
  }
  return edges;
}

describe('enumeratePanelSlots', () => {
  it('空 edges -> 空结果', () => {
    expect(enumeratePanelSlots({}, [8, 8], {})).toEqual([]);
  });

  it('8x8 框架 -> 1 个 slot (Y 轴法线)', () => {
    // Y=0 平面上的 8x8 矩形 (世界坐标: 8格=400mm)
    const edges = makeEdges([
      { id: 'bottom', start: '0,0,0', end: '400,0,0' },
      { id: 'top', start: '0,0,400', end: '400,0,400' },
      { id: 'left', start: '0,0,0', end: '0,0,400' },
      { id: 'right', start: '400,0,0', end: '400,0,400' },
    ]);
    const result = enumeratePanelSlots(edges, [8, 8], {});
    expect(result).toHaveLength(1);
    expect(result[0].axis).toBe('y');
    expect(result[0].size).toEqual([8, 8]);
  });

  it('非正方形框架 (8x4) -> 8x4 面板', () => {
    // 8x4 框架 (400mm x 200mm)
    const edges = makeEdges([
      { id: 'bottom', start: '0,0,0', end: '400,0,0' },
      { id: 'top', start: '0,0,200', end: '400,0,200' },
      { id: 'left', start: '0,0,0', end: '0,0,200' },
      { id: 'right', start: '400,0,0', end: '400,0,200' },
    ]);
    const result = enumeratePanelSlots(edges, [8, 4], {});
    // [8,4] 匹配, [4,8] 不匹配 (框架 8x4 不够容纳 4x8)
    expect(result.length).toBeGreaterThanOrEqual(1);
  });

  it('已占用面板排除', () => {
    const edges = makeEdges([
      { id: 'bottom', start: '0,0,0', end: '400,0,0' },
      { id: 'top', start: '0,0,400', end: '400,0,400' },
      { id: 'left', start: '0,0,0', end: '0,0,400' },
      { id: 'right', start: '400,0,0', end: '400,0,400' },
    ]);
    const existing: Record<string, PanelInstance> = {
      'panel--0,0,0-y-8,8': createTestPanel('panel--0,0,0-y-8,8', [0, 0, 0], [8, 8], 'y'),
    };
    const result = enumeratePanelSlots(edges, [8, 8], existing);
    expect(result).toHaveLength(0);
  });

  it('管不够长 -> 空结果', () => {
    // 4 格=200mm 的边，无法容纳 8 格=400mm 面板
    const edges = makeEdges([
      { id: 'bottom', start: '0,0,0', end: '200,0,0' },
      { id: 'top', start: '0,0,200', end: '200,0,200' },
      { id: 'left', start: '0,0,0', end: '0,0,200' },
      { id: 'right', start: '200,0,0', end: '200,0,200' },
    ]);
    const result = enumeratePanelSlots(edges, [8, 8], {});
    expect(result).toEqual([]);
  });

  it('管刚好够长 -> 1 个 slot (4x4)', () => {
    const edges = makeEdges([
      { id: 'bottom', start: '0,0,0', end: '200,0,0' },
      { id: 'top', start: '0,0,200', end: '200,0,200' },
      { id: 'left', start: '0,0,0', end: '0,0,200' },
      { id: 'right', start: '200,0,0', end: '200,0,200' },
    ]);
    const result = enumeratePanelSlots(edges, [4, 4], {});
    expect(result).toHaveLength(1);
  });

  it('带内部支撑的长框架 -> 多个 slot', () => {
    // 16 格=800mm 长, 8 格=400mm 宽, 中间有垂直支撑
    const edges = makeEdges([
      { id: 'bottom', start: '0,0,0', end: '800,0,0' },
      { id: 'top', start: '0,0,400', end: '800,0,400' },
      { id: 'left', start: '0,0,0', end: '0,0,400' },
      { id: 'right', start: '800,0,0', end: '800,0,400' },
      { id: 'mid', start: '400,0,0', end: '400,0,400' },
    ]);
    const result = enumeratePanelSlots(edges, [8, 8], {});
    expect(result).toHaveLength(2);
  });

  it('X 轴法线面板 (YZ 平面)', () => {
    const edges = makeEdges([
      { id: 'bottom', start: '0,0,0', end: '0,0,400' },
      { id: 'top', start: '0,400,0', end: '0,400,400' },
      { id: 'left', start: '0,0,0', end: '0,400,0' },
      { id: 'right', start: '0,0,400', end: '0,400,400' },
    ]);
    const result = enumeratePanelSlots(edges, [8, 8], {});
    expect(result).toHaveLength(1);
    expect(result[0].axis).toBe('x');
  });

  it('Z 轴法线面板 (XY 平面)', () => {
    const edges = makeEdges([
      { id: 'bottom', start: '0,0,0', end: '400,0,0' },
      { id: 'top', start: '0,400,0', end: '400,400,0' },
      { id: 'left', start: '0,0,0', end: '0,400,0' },
      { id: 'right', start: '400,0,0', end: '400,400,0' },
    ]);
    const result = enumeratePanelSlots(edges, [8, 8], {});
    expect(result).toHaveLength(1);
    expect(result[0].axis).toBe('z');
  });

  it('去重: 相同 slotId 只出现一次', () => {
    const edges = makeEdges([
      { id: 'bottom', start: '0,0,0', end: '400,0,0' },
      { id: 'top', start: '0,0,400', end: '400,0,400' },
      { id: 'left', start: '0,0,0', end: '0,0,400' },
      { id: 'right', start: '400,0,0', end: '400,0,400' },
    ]);
    const result = enumeratePanelSlots(edges, [8, 8], {});
    const ids = result.map(s => `slot--${s.position.join(',')}-${s.axis}-${s.size.join(',')}`);
    const uniqueIds = new Set(ids);
    expect(ids.length).toBe(uniqueIds.size);
  });

  it('isEdgeContaining 匹配更长的边子段', () => {
    // 16x8 框架 (800mm x 400mm), 中间有垂直支撑
    // 左半和右半各形成一个 8x8 slot
    const edges = makeEdges([
      { id: 'bottom', start: '0,0,0', end: '800,0,0' },
      { id: 'top', start: '0,0,400', end: '800,0,400' },
      { id: 'left', start: '0,0,0', end: '0,0,400' },
      { id: 'mid', start: '400,0,0', end: '400,0,400' },
      { id: 'right', start: '800,0,0', end: '800,0,400' },
    ]);
    const result = enumeratePanelSlots(edges, [8, 8], {});
    // 长底边 [0,0,0]->[800,0,0] 包含子段 [0,0,0]->[400,0,0] 和 [400,0,0]->[800,0,0]
    expect(result).toHaveLength(2);
  });
});
