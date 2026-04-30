import { describe, it, expect, beforeEach } from 'vitest';
import { useLogStore } from './useLogStore';

describe('useLogStore', () => {
  beforeEach(() => {
    useLogStore.getState().clear();
  });

  it('append() 创建正确条目', () => {
    useLogStore.getState().append({
      action: 'pipe:place',
      result: 'success',
      payload: { start: [0, 0, 0], end: [8, 0, 0] },
    });

    const entries = useLogStore.getState().entries;
    expect(entries).toHaveLength(1);
    expect(entries[0].action).toBe('pipe:place');
    expect(entries[0].result).toBe('success');
    expect(entries[0].payload).toEqual({ start: [0, 0, 0], end: [8, 0, 0] });
    expect(entries[0].id).toBeTruthy();
    expect(entries[0].timestamp).toBeGreaterThan(0);
  });

  it('append() 记录 rejected 条目带 reason', () => {
    useLogStore.getState().append({
      action: 'validation:rejected',
      result: 'rejected',
      reason: 'collision',
      payload: { start: [0, 0, 0], end: [8, 0, 0] },
    });

    const entries = useLogStore.getState().entries;
    expect(entries).toHaveLength(1);
    expect(entries[0].result).toBe('rejected');
    expect(entries[0].reason).toBe('collision');
  });

  it('环形缓冲区上限 200 条', () => {
    const state = useLogStore.getState();
    for (let i = 0; i < 210; i++) {
      state.append({ action: `action-${i}`, result: 'success' });
    }

    const entries = useLogStore.getState().entries;
    expect(entries).toHaveLength(200);
    // 最旧的 10 条被丢弃
    expect(entries[0].action).toBe('action-10');
    expect(entries[199].action).toBe('action-209');
  });

  it('clear() 清空缓冲区', () => {
    useLogStore.getState().append({ action: 'test', result: 'success' });
    expect(useLogStore.getState().entries).toHaveLength(1);

    useLogStore.getState().clear();
    expect(useLogStore.getState().entries).toHaveLength(0);
  });

  it('sessionId 在模块加载时生成', () => {
    const sessionId = useLogStore.getState().sessionId;
    expect(typeof sessionId).toBe('string');
    expect(sessionId.length).toBeGreaterThan(0);
    // 两次读取应相同
    expect(useLogStore.getState().sessionId).toBe(sessionId);
  });

  it('id 唯一性', () => {
    useLogStore.getState().append({ action: 'a', result: 'success' });
    useLogStore.getState().append({ action: 'b', result: 'success' });

    const entries = useLogStore.getState().entries;
    expect(entries[0].id).not.toBe(entries[1].id);
  });
});
