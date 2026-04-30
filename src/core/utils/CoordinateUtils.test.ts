import { describe, it, expect } from 'vitest';
import { CoordinateUtils } from './CoordinateUtils';

describe('CoordinateUtils', () => {
  describe('toLogic', () => {
    it('正值对齐', () => {
      expect(CoordinateUtils.toLogic(50)).toBe(1);
    });
    it('负值对齐', () => {
      expect(CoordinateUtils.toLogic(-50)).toBe(-1);
    });
    it('中间向下舍入', () => {
      expect(CoordinateUtils.toLogic(24)).toBe(0);
    });
    it('中间向上舍入', () => {
      expect(CoordinateUtils.toLogic(25)).toBe(1);
    });
    it('零', () => {
      expect(CoordinateUtils.toLogic(0)).toBe(0);
    });
    it('大值', () => {
      expect(CoordinateUtils.toLogic(400)).toBe(8);
    });
  });

  describe('toWorld', () => {
    it('正值', () => {
      expect(CoordinateUtils.toWorld(3)).toBe(150);
    });
    it('零', () => {
      expect(CoordinateUtils.toWorld(0)).toBe(0);
    });
    it('负值', () => {
      expect(CoordinateUtils.toWorld(-2)).toBe(-100);
    });
  });

  describe('getEdgeKey', () => {
    it('顺序无关', () => {
      const key1 = CoordinateUtils.getEdgeKey([0, 0, 0], [8, 0, 0]);
      const key2 = CoordinateUtils.getEdgeKey([8, 0, 0], [0, 0, 0]);
      expect(key1).toBe(key2);
    });
    it('格式正确', () => {
      expect(CoordinateUtils.getEdgeKey([1, 2, 3], [4, 5, 6])).toBe('1,2,3--4,5,6');
    });
    it('相同点生成合法 key', () => {
      const key = CoordinateUtils.getEdgeKey([0, 0, 0], [0, 0, 0]);
      expect(key).toBe('0,0,0--0,0,0');
    });
  });
});
