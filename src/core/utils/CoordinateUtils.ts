import { LU } from '../constants';

export const CoordinateUtils = {
  // 世界坐标 -> 逻辑网格坐标
  toLogic: (v: number) => Math.round(v / LU),
  
  // 逻辑网格坐标 -> 世界坐标 (用于渲染)
  toWorld: (l: number) => l * LU,

  // 生成管子的唯一 ID (确保两点之间只有一根管子)
  getEdgeKey: (p1: number[], p2: number[]) => {
    return [p1.join(','), p2.join(',')].sort().join('--');
  }
};
