import { describe, it, expect } from 'vitest';
import { Snapping } from './Snapping';

describe('Snapping', () => {
  describe('snapToGrid', () => {
    it('正值对齐', () => {
      expect(Snapping.snapToGrid([120, 60, 0])).toEqual([100, 50, 0]);
    });
    it('负值舍入', () => {
      // Math.round(-0.24) = -0, 这是 JS 行为，功能上等同于 0
      const result = Snapping.snapToGrid([-12, 23, 0]);
      expect(result[0] === 0).toBe(true);
      expect(result[1]).toBe(0);
      expect(result[2]).toBe(0);
    });
    it('中间边界 24->0, 25->50', () => {
      expect(Snapping.snapToGrid([24, 25, 0])).toEqual([0, 50, 0]);
    });
    it('精确对齐不变', () => {
      expect(Snapping.snapToGrid([100, 200, 300])).toEqual([100, 200, 300]);
    });
    it('零', () => {
      expect(Snapping.snapToGrid([0, 0, 0])).toEqual([0, 0, 0]);
    });
  });

  describe('snapToAxis', () => {
    it('X 轴主导 (PIPE_LONG, span=8)', () => {
      expect(Snapping.snapToAxis([0, 0, 0], [300, 0, 0], 8)).toEqual([400, 0, 0]);
    });
    it('Y 轴主导 (PIPE_MEDIUM, span=6)', () => {
      expect(Snapping.snapToAxis([0, 0, 0], [0, 200, 0], 6)).toEqual([0, 300, 0]);
    });
    it('Z 轴主导 (PIPE_SHORT, span=4)', () => {
      expect(Snapping.snapToAxis([0, 0, 0], [0, 0, 150], 4)).toEqual([0, 0, 200]);
    });
    it('负方向', () => {
      expect(Snapping.snapToAxis([400, 0, 0], [100, 0, 0], 8)).toEqual([0, 0, 0]);
    });
    it('tie-breaking: dx=dy 时 X 轴优先', () => {
      expect(Snapping.snapToAxis([0, 0, 0], [300, 300, 0], 8)).toEqual([400, 0, 0]);
    });
    it('零位移返回原点', () => {
      expect(Snapping.snapToAxis([0, 0, 0], [0, 0, 0], 8)).toEqual([0, 0, 0]);
    });
    it('非原点起点 + 负方向', () => {
      expect(Snapping.snapToAxis([200, 100, 0], [0, 100, 0], 4)).toEqual([0, 100, 0]);
    });
  });
});
