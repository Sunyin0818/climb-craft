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
  }
};
