import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useStageInteraction } from './useStageInteraction';
import { useSceneStore } from '@/store/useSceneStore';

// Mock ThreeEvent
function mockThreeEvent(clientX: number, clientY: number, overrides: Record<string, any> = {}) {
  return {
    clientX,
    clientY,
    stopPropagation: vi.fn(),
    point: { x: 0, y: 0, z: 0 },
    intersections: [],
    ray: { origin: { getComponent: () => 0 }, direction: { getComponent: () => 0 } },
    eventObject: {},
    ...overrides,
  } as any;
}

describe('useStageInteraction', () => {
  beforeEach(() => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    useSceneStore.setState({
      nodes: {},
      edges: {},
      panels: {},
      undoStack: [],
      redoStack: [],
      selectedTool: 'NONE',
    });
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('isActuallyClick', () => {
    it('pointerDownPos 为 null 时返回 true', () => {
      const { result } = renderHook(() => useStageInteraction({ current: null } as any));
      // 未调用 handlePointerDown, pointerDownPos.current = null
      expect(result.current.isActuallyClick(mockThreeEvent(0, 0))).toBe(true);
    });

    it('同一点 (距离=0) -> true', () => {
      const { result } = renderHook(() => useStageInteraction({ current: null } as any));
      act(() => {
        result.current.handlePointerDown(mockThreeEvent(100, 100) as any);
      });
      expect(result.current.isActuallyClick(mockThreeEvent(100, 100))).toBe(true);
    });

    it('偏移 2px -> true', () => {
      const { result } = renderHook(() => useStageInteraction({ current: null } as any));
      act(() => {
        result.current.handlePointerDown(mockThreeEvent(100, 100) as any);
      });
      expect(result.current.isActuallyClick(mockThreeEvent(102, 100))).toBe(true);
    });

    it('偏移 3px -> false', () => {
      const { result } = renderHook(() => useStageInteraction({ current: null } as any));
      act(() => {
        result.current.handlePointerDown(mockThreeEvent(100, 100) as any);
      });
      expect(result.current.isActuallyClick(mockThreeEvent(103, 100))).toBe(false);
    });

    it('对角偏移 sqrt(2)≈1.41 -> true', () => {
      const { result } = renderHook(() => useStageInteraction({ current: null } as any));
      act(() => {
        result.current.handlePointerDown(mockThreeEvent(100, 100) as any);
      });
      expect(result.current.isActuallyClick(mockThreeEvent(101, 101))).toBe(true);
    });
  });

  describe('handleClick FSM', () => {
    it('NONE 工具 -> 忽略点击', () => {
      const { result } = renderHook(() => useStageInteraction({ current: null } as any));
      act(() => {
        result.current.handleClick(mockThreeEvent(50, 50));
      });
      expect(result.current.startPoint).toBeNull();
    });

    it('有选中边时点击 -> 取消选中', () => {
      const { result } = renderHook(() => useStageInteraction({ current: null } as any));
      act(() => {
        result.current.setSelectedEdgeId('some-edge');
      });
      act(() => {
        result.current.handleClick(mockThreeEvent(50, 50));
      });
      expect(result.current.selectedEdgeId).toBeNull();
    });

    it('有选中面板时点击 -> 取消选中', () => {
      const { result } = renderHook(() => useStageInteraction({ current: null } as any));
      act(() => {
        result.current.setSelectedPanelId('some-panel');
      });
      act(() => {
        result.current.handleClick(mockThreeEvent(50, 50));
      });
      expect(result.current.selectedPanelId).toBeNull();
    });
  });

  describe('handleTryPlacePipe', () => {
    it('合法放置 -> 调用 placePipe, 返回 true', () => {
      const { result } = renderHook(() => useStageInteraction({ current: null } as any));
      let success: boolean = false;
      act(() => {
        success = result.current.handleTryPlacePipe([0, 0, 0], [8, 0, 0], 8);
      });
      expect(success).toBe(true);
      expect(Object.keys(useSceneStore.getState().edges)).toHaveLength(1);
    });

    it('重复放置同一条边 -> 返回 false', () => {
      const { result } = renderHook(() => useStageInteraction({ current: null } as any));
      act(() => {
        result.current.handleTryPlacePipe([0, 0, 0], [8, 0, 0], 8);
      });
      let success: boolean = true;
      act(() => {
        success = result.current.handleTryPlacePipe([0, 0, 0], [8, 0, 0], 8);
      });
      expect(success).toBe(false);
    });
  });

  describe('getTargetLength', () => {
    it('PIPE_LONG -> 8', () => {
      useSceneStore.getState().setSelectedTool('PIPE_LONG');
      const { result } = renderHook(() => useStageInteraction({ current: null } as any));
      expect(result.current.getTargetLength()).toBe(8);
    });
    it('PIPE_MEDIUM -> 6', () => {
      useSceneStore.getState().setSelectedTool('PIPE_MEDIUM');
      const { result } = renderHook(() => useStageInteraction({ current: null } as any));
      expect(result.current.getTargetLength()).toBe(6);
    });
    it('PIPE_SHORT -> 4', () => {
      useSceneStore.getState().setSelectedTool('PIPE_SHORT');
      const { result } = renderHook(() => useStageInteraction({ current: null } as any));
      expect(result.current.getTargetLength()).toBe(4);
    });
    it('NONE -> 0', () => {
      const { result } = renderHook(() => useStageInteraction({ current: null } as any));
      expect(result.current.getTargetLength()).toBe(0);
    });
  });

  describe('键盘快捷键', () => {
    const press = (key: string, opts: KeyboardEventInit = {}) => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key, ...opts }));
    };

    it('Ctrl+Z -> undo', () => {
      // 先放管子产生 undo 栈
      useSceneStore.getState().placePipe([0, 0, 0], [8, 0, 0], 8);
      const spy = vi.spyOn(useSceneStore.getState(), 'undo');
      renderHook(() => useStageInteraction({ current: null } as any));
      press('z', { ctrlKey: true });
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    it('Ctrl+Shift+Z -> redo', () => {
      // 先放管子再撤销，产生 redo 栈
      useSceneStore.getState().placePipe([0, 0, 0], [8, 0, 0], 8);
      useSceneStore.getState().undo();
      const spy = vi.spyOn(useSceneStore.getState(), 'redo');
      renderHook(() => useStageInteraction({ current: null } as any));
      press('z', { ctrlKey: true, shiftKey: true });
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    it('Ctrl+Y -> redo', () => {
      // 先放管子再撤销，产生 redo 栈
      useSceneStore.getState().placePipe([0, 0, 0], [8, 0, 0], 8);
      useSceneStore.getState().undo();
      const spy = vi.spyOn(useSceneStore.getState(), 'redo');
      renderHook(() => useStageInteraction({ current: null } as any));
      press('y', { ctrlKey: true });
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    it('Cmd+Z (macOS) -> undo', () => {
      // 先放管子产生 undo 栈
      useSceneStore.getState().placePipe([0, 0, 0], [8, 0, 0], 8);
      const spy = vi.spyOn(useSceneStore.getState(), 'undo');
      renderHook(() => useStageInteraction({ current: null } as any));
      press('z', { metaKey: true });
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    it('Delete + 选中边 -> removePipe + 清空选中', async () => {
      // 先放一条管
      useSceneStore.getState().placePipe([0, 0, 0], [8, 0, 0], 8);
      const edgeId = Object.keys(useSceneStore.getState().edges)[0];
      const { result } = renderHook(() => useStageInteraction({ current: null } as any));
      // 设置选中并等待 effect 重新注册键盘监听
      await act(async () => {
        result.current.setSelectedEdgeId(edgeId);
      });
      await act(async () => {
        press('Delete');
      });
      expect(result.current.selectedEdgeId).toBeNull();
    });

    it('无选中时 Delete -> 不调用 remove', () => {
      const { result } = renderHook(() => useStageInteraction({ current: null } as any));
      const edgesBefore = useSceneStore.getState().edges;
      press('Delete');
      expect(useSceneStore.getState().edges).toEqual(edgesBefore);
    });

    it('空栈 Ctrl+Z -> 不调用 undo', () => {
      const spy = vi.spyOn(useSceneStore.getState(), 'undo');
      renderHook(() => useStageInteraction({ current: null } as any));
      press('z', { ctrlKey: true });
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });

    it('空栈 Ctrl+Shift+Z -> 不调用 redo', () => {
      const spy = vi.spyOn(useSceneStore.getState(), 'redo');
      renderHook(() => useStageInteraction({ current: null } as any));
      press('z', { ctrlKey: true, shiftKey: true });
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });

    it('空栈 Ctrl+Y -> 不调用 redo', () => {
      const spy = vi.spyOn(useSceneStore.getState(), 'redo');
      renderHook(() => useStageInteraction({ current: null } as any));
      press('y', { ctrlKey: true });
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });
  });
});
