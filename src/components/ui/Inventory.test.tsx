import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Inventory from './Inventory';
import { useSceneStore } from '@/store/useSceneStore';
import { useInventoryStore } from '@/store/useInventoryStore';
import { useLocaleStore } from '@/store/useLocaleStore';
import { createTestNode, createTestEdge } from '@/__tests__/factories';

// 获取当前语言的翻译
function getT() {
  return useLocaleStore.getState().t;
}

describe('Inventory', () => {
  beforeEach(() => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    useSceneStore.setState({
      nodes: {}, edges: {}, panels: {},
      undoStack: [], redoStack: [], selectedTool: 'NONE',
    });
    useInventoryStore.setState({
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
    });
  });
  afterEach(() => { vi.restoreAllMocks(); });

  describe('空状态', () => {
    it('场景为空 -> 显示 empty 提示', () => {
      render(<Inventory />);
      const t = getT();
      expect(screen.getByText(t.inventory.empty)).toBeInTheDocument();
    });
  });

  describe('库存覆盖 vs 超出拆分', () => {
    it('需求量 <= 库存 -> 全在覆盖区', () => {
      // 2 条 len=8 管, stock['8']=5
      useSceneStore.setState({
        nodes: {
          '0,0,0': createTestNode('0,0,0', [0, 0, 0]),
          '8,0,0': createTestNode('8,0,0', [8, 0, 0]),
          '16,0,0': createTestNode('16,0,0', [16, 0, 0]),
        },
        edges: {
          e1: createTestEdge('e1', '0,0,0', '8,0,0', 8),
          e2: createTestEdge('e2', '8,0,0', '16,0,0', 8),
        },
        panels: {},
      });
      useInventoryStore.setState({ stock: { ...useInventoryStore.getState().stock, '8': 5 } });
      render(<Inventory />);
      const t = getT();
      expect(screen.getByText(t.inventory.stockSection)).toBeInTheDocument();
      // 应显示 "x2" 在覆盖区
      expect(screen.getByText('x2')).toBeInTheDocument();
    });

    it('需求量 > 库存 -> 差额在超出区', () => {
      // 3 条 len=8 管, stock['8']=1
      useSceneStore.setState({
        nodes: {
          '0,0,0': createTestNode('0,0,0', [0, 0, 0]),
          '8,0,0': createTestNode('8,0,0', [8, 0, 0]),
          '16,0,0': createTestNode('16,0,0', [16, 0, 0]),
          '24,0,0': createTestNode('24,0,0', [24, 0, 0]),
        },
        edges: {
          e1: createTestEdge('e1', '0,0,0', '8,0,0', 8),
          e2: createTestEdge('e2', '8,0,0', '16,0,0', 8),
          e3: createTestEdge('e3', '16,0,0', '24,0,0', 8),
        },
        panels: {},
      });
      useInventoryStore.setState({ stock: { ...useInventoryStore.getState().stock, '8': 1 } });
      render(<Inventory />);
      const t = getT();
      expect(screen.getByText(t.inventory.excessSection)).toBeInTheDocument();
      // 超出 2 条, x2
      const excessItems = screen.getAllByText('x2');
      expect(excessItems.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('折叠状态', () => {
    it('点击收起 -> 显示 BOM 按钮', async () => {
      const user = userEvent.setup();
      render(<Inventory />);
      const collapseBtn = screen.getByLabelText('收起物料清单');
      await user.click(collapseBtn);
      expect(screen.getByLabelText('展开物料清单')).toBeInTheDocument();
    });

    it('折叠后点击展开 -> 恢复完整视图', async () => {
      const user = userEvent.setup();
      render(<Inventory />);
      await user.click(screen.getByLabelText('收起物料清单'));
      await user.click(screen.getByLabelText('展开物料清单'));
      const t = getT();
      expect(screen.getByText(t.inventory.title)).toBeInTheDocument();
    });
  });
});
