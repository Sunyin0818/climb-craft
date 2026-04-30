import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useSceneStore, recalculateNodeShapes } from './useSceneStore';
import type { NodeInstance, EdgeInstance } from './useSceneStore';

// ── recalculateNodeShapes 纯函数测试 ──────────────────────────────

describe('recalculateNodeShapes', () => {
  const makeNode = (id: string, position: [number, number, number]): NodeInstance => ({
    id, position, type: 'CONN', shape: 'UNKNOWN',
  });
  const makeEdge = (id: string, start: string, end: string): EdgeInstance => ({
    id, start, end, type: 'PIPE', length: 8, color: '#ef4444',
  });

  it('单边 -> STRAIGHT', () => {
    const nodes = { '0,0,0': makeNode('0,0,0', [0, 0, 0]), '8,0,0': makeNode('8,0,0', [8, 0, 0]) };
    const edges = { e1: makeEdge('e1', '0,0,0', '8,0,0') };
    const result = recalculateNodeShapes(nodes, edges);
    expect(result['0,0,0'].shape).toBe('STRAIGHT');
    expect(result['8,0,0'].shape).toBe('STRAIGHT');
  });

  it('两正交 -> L', () => {
    const nodes = {
      '0,0,0': makeNode('0,0,0', [0, 0, 0]),
      '8,0,0': makeNode('8,0,0', [8, 0, 0]),
      '0,8,0': makeNode('0,8,0', [0, 8, 0]),
    };
    const edges = {
      e1: makeEdge('e1', '0,0,0', '8,0,0'),
      e2: makeEdge('e2', '0,0,0', '0,8,0'),
    };
    const result = recalculateNodeShapes(nodes, edges);
    expect(result['0,0,0'].shape).toBe('L');
  });

  it('两反向 -> STRAIGHT', () => {
    const nodes = {
      '8,0,0': makeNode('8,0,0', [8, 0, 0]),
      '0,0,0': makeNode('0,0,0', [0, 0, 0]),
      '-8,0,0': makeNode('-8,0,0', [-8, 0, 0]),
    };
    const edges = {
      e1: makeEdge('e1', '8,0,0', '0,0,0'),
      e2: makeEdge('e2', '0,0,0', '-8,0,0'),
    };
    const result = recalculateNodeShapes(nodes, edges);
    expect(result['0,0,0'].shape).toBe('STRAIGHT');
  });

  it('T 形: 3 边含反向对 -> T', () => {
    const nodes = {
      '-8,0,0': makeNode('-8,0,0', [-8, 0, 0]),
      '0,0,0': makeNode('0,0,0', [0, 0, 0]),
      '8,0,0': makeNode('8,0,0', [8, 0, 0]),
      '0,8,0': makeNode('0,8,0', [0, 8, 0]),
    };
    const edges = {
      e1: makeEdge('e1', '-8,0,0', '0,0,0'),
      e2: makeEdge('e2', '0,0,0', '8,0,0'),
      e3: makeEdge('e3', '0,0,0', '0,8,0'),
    };
    const result = recalculateNodeShapes(nodes, edges);
    expect(result['0,0,0'].shape).toBe('T');
  });

  it('3WAY: 3 边无反向对', () => {
    const nodes = {
      '0,0,0': makeNode('0,0,0', [0, 0, 0]),
      '8,0,0': makeNode('8,0,0', [8, 0, 0]),
      '0,8,0': makeNode('0,8,0', [0, 8, 0]),
      '0,0,8': makeNode('0,0,8', [0, 0, 8]),
    };
    const edges = {
      e1: makeEdge('e1', '0,0,0', '8,0,0'),
      e2: makeEdge('e2', '0,0,0', '0,8,0'),
      e3: makeEdge('e3', '0,0,0', '0,0,8'),
    };
    const result = recalculateNodeShapes(nodes, edges);
    expect(result['0,0,0'].shape).toBe('3WAY');
  });

  it('4WAY', () => {
    const nodes = {
      '0,0,0': makeNode('0,0,0', [0, 0, 0]),
      '8,0,0': makeNode('8,0,0', [8, 0, 0]),
      '-8,0,0': makeNode('-8,0,0', [-8, 0, 0]),
      '0,8,0': makeNode('0,8,0', [0, 8, 0]),
      '0,-8,0': makeNode('0,-8,0', [0, -8, 0]),
    };
    const edges = {
      e1: makeEdge('e1', '0,0,0', '8,0,0'),
      e2: makeEdge('e2', '0,0,0', '-8,0,0'),
      e3: makeEdge('e3', '0,0,0', '0,8,0'),
      e4: makeEdge('e4', '0,0,0', '0,-8,0'),
    };
    const result = recalculateNodeShapes(nodes, edges);
    expect(result['0,0,0'].shape).toBe('4WAY');
  });

  it('5WAY', () => {
    const nodes: Record<string, NodeInstance> = {
      '0,0,0': makeNode('0,0,0', [0, 0, 0]),
      '8,0,0': makeNode('8,0,0', [8, 0, 0]),
      '-8,0,0': makeNode('-8,0,0', [-8, 0, 0]),
      '0,8,0': makeNode('0,8,0', [0, 8, 0]),
      '0,-8,0': makeNode('0,-8,0', [0, -8, 0]),
      '0,0,8': makeNode('0,0,8', [0, 0, 8]),
    };
    const edges: Record<string, EdgeInstance> = {
      e1: makeEdge('e1', '0,0,0', '8,0,0'),
      e2: makeEdge('e2', '0,0,0', '-8,0,0'),
      e3: makeEdge('e3', '0,0,0', '0,8,0'),
      e4: makeEdge('e4', '0,0,0', '0,-8,0'),
      e5: makeEdge('e5', '0,0,0', '0,0,8'),
    };
    const result = recalculateNodeShapes(nodes, edges);
    expect(result['0,0,0'].shape).toBe('5WAY');
  });

  it('6WAY', () => {
    const nodes: Record<string, NodeInstance> = {
      '0,0,0': makeNode('0,0,0', [0, 0, 0]),
      '8,0,0': makeNode('8,0,0', [8, 0, 0]),
      '-8,0,0': makeNode('-8,0,0', [-8, 0, 0]),
      '0,8,0': makeNode('0,8,0', [0, 8, 0]),
      '0,-8,0': makeNode('0,-8,0', [0, -8, 0]),
      '0,0,8': makeNode('0,0,8', [0, 0, 8]),
      '0,0,-8': makeNode('0,0,-8', [0, 0, -8]),
    };
    const edges: Record<string, EdgeInstance> = {
      e1: makeEdge('e1', '0,0,0', '8,0,0'),
      e2: makeEdge('e2', '0,0,0', '-8,0,0'),
      e3: makeEdge('e3', '0,0,0', '0,8,0'),
      e4: makeEdge('e4', '0,0,0', '0,-8,0'),
      e5: makeEdge('e5', '0,0,0', '0,0,8'),
      e6: makeEdge('e6', '0,0,0', '0,0,-8'),
    };
    const result = recalculateNodeShapes(nodes, edges);
    expect(result['0,0,0'].shape).toBe('6WAY');
  });

  it('零边节点 -> UNKNOWN', () => {
    const nodes = { '0,0,0': makeNode('0,0,0', [0, 0, 0]) };
    const result = recalculateNodeShapes(nodes, {});
    expect(result['0,0,0'].shape).toBe('UNKNOWN');
  });
});

// ── useSceneStore 状态测试 ────────────────────────────────────────

describe('useSceneStore', () => {
  beforeEach(() => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    useSceneStore.setState({
      nodes: {},
      edges: {},
      panels: {},
      undoStack: [],
      redoStack: [],
      selectedTool: 'NONE',
    });
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('setSelectedTool', () => {
    it('设置工具', () => {
      useSceneStore.getState().setSelectedTool('PIPE_LONG');
      expect(useSceneStore.getState().selectedTool).toBe('PIPE_LONG');
    });
  });

  describe('placePipe', () => {
    it('创建起点/终点节点 + 边', () => {
      useSceneStore.getState().placePipe([0, 0, 0], [8, 0, 0], 8);
      const state = useSceneStore.getState();
      expect(Object.keys(state.nodes)).toHaveLength(2);
      expect(Object.keys(state.edges)).toHaveLength(1);
    });

    it('节点 shape 被 recalculateNodeShapes 更新', () => {
      useSceneStore.getState().placePipe([0, 0, 0], [8, 0, 0], 8);
      const state = useSceneStore.getState();
      expect(state.nodes['0,0,0'].shape).toBe('STRAIGHT');
    });

    it('幂等: 放两次同一条边', () => {
      useSceneStore.getState().placePipe([0, 0, 0], [8, 0, 0], 8);
      useSceneStore.getState().placePipe([0, 0, 0], [8, 0, 0], 8);
      expect(Object.keys(useSceneStore.getState().edges)).toHaveLength(1);
    });

    it('颜色分配: 连接边用过的颜色不重选', () => {
      useSceneStore.getState().placePipe([0, 0, 0], [8, 0, 0], 8);
      useSceneStore.getState().placePipe([8, 0, 0], [16, 0, 0], 8);
      const edges = Object.values(useSceneStore.getState().edges);
      expect(edges[0].color).not.toBe(edges[1].color);
    });

    it('两条正交管 -> 共享节点 shape=L', () => {
      useSceneStore.getState().placePipe([0, 0, 0], [8, 0, 0], 8);
      useSceneStore.getState().placePipe([0, 0, 0], [0, 8, 0], 8);
      expect(useSceneStore.getState().nodes['0,0,0'].shape).toBe('L');
    });

    it('pushUndo 被调用', () => {
      useSceneStore.getState().placePipe([0, 0, 0], [8, 0, 0], 8);
      expect(useSceneStore.getState().undoStack).toHaveLength(1);
    });
  });

  describe('removePipe', () => {
    it('删除边 + 孤立节点', () => {
      useSceneStore.getState().placePipe([0, 0, 0], [8, 0, 0], 8);
      const edgeId = Object.keys(useSceneStore.getState().edges)[0];
      useSceneStore.getState().removePipe(edgeId);
      expect(useSceneStore.getState().edges).toEqual({});
      expect(useSceneStore.getState().nodes).toEqual({});
    });

    it('保留共享节点', () => {
      useSceneStore.getState().placePipe([0, 0, 0], [8, 0, 0], 8);
      useSceneStore.getState().placePipe([0, 0, 0], [0, 8, 0], 8);
      const edges = Object.values(useSceneStore.getState().edges);
      useSceneStore.getState().removePipe(edges[0].id);
      expect(useSceneStore.getState().nodes['0,0,0']).toBeDefined();
    });

    it('不存在的 ID 不抛错', () => {
      expect(() => useSceneStore.getState().removePipe('fake')).not.toThrow();
    });
  });

  describe('placePanel / removePanel', () => {
    it('placePanel 添加面板', () => {
      useSceneStore.getState().placePanel([0, 0, 0], [8, 8], 'y');
      expect(Object.keys(useSceneStore.getState().panels)).toHaveLength(1);
    });

    it('placePanel 幂等', () => {
      useSceneStore.getState().placePanel([0, 0, 0], [8, 8], 'y');
      useSceneStore.getState().placePanel([0, 0, 0], [8, 8], 'y');
      expect(Object.keys(useSceneStore.getState().panels)).toHaveLength(1);
    });

    it('removePanel 删除', () => {
      useSceneStore.getState().placePanel([0, 0, 0], [8, 8], 'y');
      const id = Object.keys(useSceneStore.getState().panels)[0];
      useSceneStore.getState().removePanel(id);
      expect(useSceneStore.getState().panels).toEqual({});
    });
  });

  describe('undo / redo', () => {
    it('undo 恢复快照', () => {
      useSceneStore.getState().placePipe([0, 0, 0], [8, 0, 0], 8);
      useSceneStore.getState().undo();
      expect(useSceneStore.getState().edges).toEqual({});
    });

    it('redo 重做', () => {
      useSceneStore.getState().placePipe([0, 0, 0], [8, 0, 0], 8);
      useSceneStore.getState().undo();
      useSceneStore.getState().redo();
      expect(Object.keys(useSceneStore.getState().edges)).toHaveLength(1);
    });

    it('空栈 undo 不抛错', () => {
      expect(() => useSceneStore.getState().undo()).not.toThrow();
    });

    it('空栈 redo 不抛错', () => {
      expect(() => useSceneStore.getState().redo()).not.toThrow();
    });

    it('新操作后 redo 栈清空', () => {
      useSceneStore.getState().placePipe([0, 0, 0], [8, 0, 0], 8);
      useSceneStore.getState().undo();
      useSceneStore.getState().placePipe([0, 0, 0], [0, 8, 0], 8);
      expect(useSceneStore.getState().redoStack).toHaveLength(0);
    });

    it('undo 上限 50', () => {
      for (let i = 0; i < 55; i++) {
        useSceneStore.getState().placePipe([i, 0, 0], [i + 1, 0, 0], 8);
      }
      expect(useSceneStore.getState().undoStack.length).toBeLessThanOrEqual(50);
    });
  });

  describe('clearScene', () => {
    it('清空所有数据 + 重置工具', () => {
      useSceneStore.getState().placePipe([0, 0, 0], [8, 0, 0], 8);
      useSceneStore.getState().setSelectedTool('PIPE_LONG');
      useSceneStore.getState().clearScene();
      expect(useSceneStore.getState().nodes).toEqual({});
      expect(useSceneStore.getState().edges).toEqual({});
      expect(useSceneStore.getState().panels).toEqual({});
      expect(useSceneStore.getState().selectedTool).toBe('NONE');
    });

    it('clearScene 可 undo', () => {
      useSceneStore.getState().placePipe([0, 0, 0], [8, 0, 0], 8);
      useSceneStore.getState().clearScene();
      useSceneStore.getState().undo();
      expect(Object.keys(useSceneStore.getState().edges)).toHaveLength(1);
    });
  });

  describe('loadScene', () => {
    it('覆盖状态 + 清空 undo/redo', () => {
      useSceneStore.getState().placePipe([0, 0, 0], [8, 0, 0], 8);
      const nodes = { '1,0,0': { id: '1,0,0', position: [1, 0, 0] as [number, number, number], type: 'CONN' as const } };
      const edges = {};
      useSceneStore.getState().loadScene(nodes, edges);
      expect(useSceneStore.getState().nodes).toEqual(nodes);
      expect(useSceneStore.getState().undoStack).toHaveLength(0);
      expect(useSceneStore.getState().redoStack).toHaveLength(0);
    });
  });
});
