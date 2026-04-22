import { LU } from '../constants';
import { CoordinateUtils } from '../utils/CoordinateUtils';

export const Snapping = {
  // 返回吸附后的 3D 逻辑网格坐标
  snapToGrid: (position: [number, number, number]): [number, number, number] => {
    return [
      CoordinateUtils.toLogic(position[0]) * LU,
      CoordinateUtils.toLogic(position[1]) * LU,
      CoordinateUtils.toLogic(position[2]) * LU,
    ];
  },
  
  // 给定起点和当前悬停点，计算在一个主轴向上最接近的长度吸附点
  snapToAxis: (start: [number, number, number], current: [number, number, number], targetLengthSpan: number): [number, number, number] => {
    const dx = current[0] - start[0];
    const dy = current[1] - start[1];
    const dz = current[2] - start[2];
    
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    const absDz = Math.abs(dz);
    
    // 找出最大偏移轴 (锁定方向)
    const max = Math.max(absDx, absDy, absDz);
    const fixedLength = targetLengthSpan * LU;
    
    if (max === absDx) return [start[0] + Math.sign(dx) * fixedLength, start[1], start[2]];
    if (max === absDy) return [start[0], start[1] + Math.sign(dy) * fixedLength, start[2]];
    return [start[0], start[1], start[2] + Math.sign(dz) * fixedLength];
  }
};
