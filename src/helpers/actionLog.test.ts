import { describe, it, expect, beforeEach } from 'vitest';
import { useLogStore } from '@/store/useLogStore';
import {
  logPipePlaced,
  logPipeRemoved,
  logPanelPlaced,
  logPanelRemoved,
  logUndo,
  logRedo,
  logToolChanged,
  logSceneLoaded,
  logSceneCleared,
  logValidationRejected,
} from './actionLog';

describe('actionLog', () => {
  beforeEach(() => {
    useLogStore.getState().clear();
  });

  it('logPipePlaced 写入正确 action/payload', () => {
    logPipePlaced([0, 0, 0], [8, 0, 0], 8, 'edge-1');
    const entry = useLogStore.getState().entries[0];
    expect(entry.action).toBe('pipe:place');
    expect(entry.result).toBe('success');
    expect(entry.payload).toEqual({ start: [0, 0, 0], end: [8, 0, 0], length: 8, edgeId: 'edge-1' });
  });

  it('logPipeRemoved 写入正确 action/payload', () => {
    logPipeRemoved('edge-1', '0,0,0', '8,0,0', 8);
    const entry = useLogStore.getState().entries[0];
    expect(entry.action).toBe('pipe:remove');
    expect(entry.result).toBe('success');
    expect(entry.payload).toEqual({ edgeId: 'edge-1', startNodeId: '0,0,0', endNodeId: '8,0,0', length: 8 });
  });

  it('logPanelPlaced 写入正确 action/payload', () => {
    logPanelPlaced([0, 0, 0], [8, 8], 'z', 'panel-1');
    const entry = useLogStore.getState().entries[0];
    expect(entry.action).toBe('panel:place');
    expect(entry.result).toBe('success');
    expect(entry.payload).toEqual({ position: [0, 0, 0], size: [8, 8], axis: 'z', panelId: 'panel-1' });
  });

  it('logPanelRemoved 写入正确 action/payload', () => {
    logPanelRemoved('panel-1', [0, 0, 0], [8, 8], 'z');
    const entry = useLogStore.getState().entries[0];
    expect(entry.action).toBe('panel:remove');
    expect(entry.result).toBe('success');
    expect(entry.payload).toEqual({ panelId: 'panel-1', position: [0, 0, 0], size: [8, 8], axis: 'z' });
  });

  it('logUndo 记录 undo', () => {
    logUndo();
    expect(useLogStore.getState().entries[0].action).toBe('undo');
    expect(useLogStore.getState().entries[0].result).toBe('success');
  });

  it('logRedo 记录 redo', () => {
    logRedo();
    expect(useLogStore.getState().entries[0].action).toBe('redo');
    expect(useLogStore.getState().entries[0].result).toBe('success');
  });

  it('logToolChanged 记录工具切换', () => {
    logToolChanged('PIPE_LONG');
    const entry = useLogStore.getState().entries[0];
    expect(entry.action).toBe('tool:changed');
    expect(entry.payload).toEqual({ tool: 'PIPE_LONG' });
  });

  it('logSceneLoaded 记录场景加载', () => {
    logSceneLoaded(5, 4, 2);
    const entry = useLogStore.getState().entries[0];
    expect(entry.action).toBe('scene:loaded');
    expect(entry.payload).toEqual({ nodeCount: 5, edgeCount: 4, panelCount: 2 });
  });

  it('logSceneCleared 记录场景清空', () => {
    logSceneCleared(5, 4, 2);
    const entry = useLogStore.getState().entries[0];
    expect(entry.action).toBe('scene:cleared');
    expect(entry.payload).toEqual({ nodeCount: 5, edgeCount: 4, panelCount: 2 });
  });

  it('logValidationRejected 写入 reason', () => {
    logValidationRejected('collision', { start: [0, 0, 0], end: [8, 0, 0] });
    const entry = useLogStore.getState().entries[0];
    expect(entry.action).toBe('validation:rejected');
    expect(entry.result).toBe('rejected');
    expect(entry.reason).toBe('collision');
    expect(entry.payload).toEqual({ start: [0, 0, 0], end: [8, 0, 0] });
  });

  it('logValidationRejected 无 payload', () => {
    logValidationRejected('duplicate_edge');
    const entry = useLogStore.getState().entries[0];
    expect(entry.action).toBe('validation:rejected');
    expect(entry.reason).toBe('duplicate_edge');
    expect(entry.payload).toBeUndefined();
  });

  it('所有语义函数的 action 字符串与文档一致', () => {
    logPipePlaced([0, 0, 0], [8, 0, 0], 8, 'e1');
    logPipeRemoved('e1', '0,0,0', '8,0,0', 8);
    logPanelPlaced([0, 0, 0], [8, 8], 'z', 'p1');
    logPanelRemoved('p1', [0, 0, 0], [8, 8], 'z');
    logUndo();
    logRedo();
    logToolChanged('NONE');
    logSceneLoaded(1, 1, 0);
    logSceneCleared(1, 1, 0);
    logValidationRejected('test');

    const actions = useLogStore.getState().entries.map((e) => e.action);
    expect(actions).toEqual([
      'pipe:place',
      'pipe:remove',
      'panel:place',
      'panel:remove',
      'undo',
      'redo',
      'tool:changed',
      'scene:loaded',
      'scene:cleared',
      'validation:rejected',
    ]);
  });
});
