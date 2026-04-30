import type { NodeInstance, EdgeInstance, PanelInstance } from '@/store/useSceneStore';

export const createTestNode = (id: string, position: [number, number, number], shape = 'UNKNOWN'): NodeInstance => ({
  id, position, type: 'CONN', shape: shape as NodeInstance['shape'],
});

export const createTestEdge = (id: string, start: string, end: string, length = 8): EdgeInstance => ({
  id, start, end, type: 'PIPE', length, color: '#ef4444',
});

export const createTestPanel = (id: string, position: [number, number, number], size: [number, number], axis: 'x' | 'y' | 'z'): PanelInstance => ({
  id, position, size, axis, color: '#3b82f6',
});

export const createSimpleScene = () => {
  const nodes = {
    '0,0,0': createTestNode('0,0,0', [0, 0, 0]),
    '8,0,0': createTestNode('8,0,0', [8, 0, 0]),
  };
  const edges = {
    '0,0,0--8,0,0': createTestEdge('0,0,0--8,0,0', '0,0,0', '8,0,0', 8),
  };
  return { nodes, edges, panels: {} };
};
