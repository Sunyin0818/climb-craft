import { create } from 'zustand';
import { ConnectorShape, useSceneStore } from './useSceneStore';

export type PartType = '8' | '6' | '4' | 'STRAIGHT' | 'L' | 'T' | '3WAY' | '4WAY' | '5WAY' | '6WAY' | 'PANEL_8x8' | 'PANEL_8x4';

interface InventoryState {
  stock: Record<PartType, number>;
  price: Record<PartType, number>;

  setStock: (part: PartType, val: number) => void;
  setPrice: (part: PartType, val: number) => void;
}

export const useInventoryStore = create<InventoryState>((set) => ({
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

  setStock: (part, MathMaxVal) => set((state) => ({ stock: { ...state.stock, [part]: Math.max(0, MathMaxVal) } })),
  setPrice: (part, MathMaxVal) => set((state) => ({ price: { ...state.price, [part]: Math.max(0, MathMaxVal) } })),
}));

/**
 * 帮助函数：基于当前的 nodes 和 edges，计算全局的物料消耗件数
 */
export const computeUsedCounts = (nodes: Record<string, any>, edges: Record<string, any>): Record<PartType, number> => {
  const counts: Record<PartType, number> = { 
    '8': 0, '6': 0, '4': 0, 
    'STRAIGHT': 0, 'L': 0, 'T': 0, '3WAY': 0, '4WAY': 0, '5WAY': 0, '6WAY': 0,
    'PANEL_8x8': 0, 'PANEL_8x4': 0
  };
  
  Object.values(nodes).forEach(node => {
    const shape = node.shape as ConnectorShape;
    if (shape && shape !== 'UNKNOWN' && shape in counts) {
      counts[shape as PartType] += 1;
    }
  });
  
  Object.values(edges).forEach(edge => {
    if (edge.length === 8) counts['8'] += 1;
    else if (edge.length === 6) counts['6'] += 1;
    else if (edge.length === 4) counts['4'] += 1;
  });

  // 统计面板
  const panels = useSceneStore.getState().panels;
  Object.values(panels).forEach(panel => {
    if (panel.size[0] === 8 && panel.size[1] === 8) counts['PANEL_8x8'] += 1;
    else counts['PANEL_8x4'] += 1;
  });

  return counts;
};
