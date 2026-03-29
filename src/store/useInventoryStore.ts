import { create } from 'zustand';

export type PartType = '8' | '6' | '4' | 'CONN';

interface InventoryState {
  stock: Record<PartType, number>;
  price: Record<PartType, number>;
  allowedExcess: Record<PartType, boolean>;

  setStock: (part: PartType, val: number) => void;
  setPrice: (part: PartType, val: number) => void;
  setAllowedExcess: (part: PartType, val: boolean) => void;
}

export const useInventoryStore = create<InventoryState>((set) => ({
  // 默认初始库存设为 0（代表所有东西都需要花钱新买结算）
  stock: {
    '8': 0, 
    '6': 0, 
    '4': 0, 
    'CONN': 0,
  },
  // 默认单价
  price: {
    '8': 15.0,
    '6': 12.0,
    '4': 10.0,
    'CONN': 5.0,
  },
  // 超发允许状态。如果在警告弹窗中点击了“继续添加”，对应类型会变成 true
  allowedExcess: {
    '8': false,
    '6': false,
    '4': false,
    'CONN': false,
  },

  setStock: (part, MathMaxVal) => set((state) => ({ stock: { ...state.stock, [part]: Math.max(0, MathMaxVal) } })),
  setPrice: (part, MathMaxVal) => set((state) => ({ price: { ...state.price, [part]: Math.max(0, MathMaxVal) } })),
  setAllowedExcess: (part, val) => set((state) => ({ allowedExcess: { ...state.allowedExcess, [part]: val } })),
}));

/**
 * 帮助函数：基于当前的 nodes 和 edges，计算全局的物料消耗件数
 */
export const computeUsedCounts = (nodes: Record<string, any>, edges: Record<string, any>): Record<PartType, number> => {
  const counts: Record<PartType, number> = { '8': 0, '6': 0, '4': 0, 'CONN': 0 };
  counts['CONN'] = Object.keys(nodes).length;
  
  Object.values(edges).forEach(edge => {
    if (edge.length === 8) counts['8'] += 1;
    else if (edge.length === 6) counts['6'] += 1;
    else if (edge.length === 4) counts['4'] += 1;
  });

  return counts;
};
