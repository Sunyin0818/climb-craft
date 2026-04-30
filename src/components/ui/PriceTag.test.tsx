import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import PriceTag from './PriceTag';
import { useSceneStore } from '@/store/useSceneStore';
import { useInventoryStore } from '@/store/useInventoryStore';
import { createTestNode, createTestEdge } from '@/__tests__/factories';

describe('PriceTag', () => {
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

  describe('null 渲染条件', () => {
    it('场景为空 -> 不渲染', () => {
      const { container } = render(<PriceTag />);
      expect(container.firstChild).toBeNull();
    });

    it('所有物料库存充足 -> 不渲染', () => {
      useSceneStore.setState({
        nodes: { '0,0,0': createTestNode('0,0,0', [0, 0, 0]) },
        edges: { e1: createTestEdge('e1', '0,0,0', '8,0,0', 8) },
        panels: {},
      });
      useInventoryStore.setState({
        stock: { ...useInventoryStore.getState().stock, '8': 10 },
      });
      const { container } = render(<PriceTag />);
      expect(container.firstChild).toBeNull();
    });

    it('总价恰好为 0 (单价为 0) -> 不渲染', () => {
      useSceneStore.setState({
        nodes: { '0,0,0': createTestNode('0,0,0', [0, 0, 0]) },
        edges: { e1: createTestEdge('e1', '0,0,0', '8,0,0', 8) },
        panels: {},
      });
      useInventoryStore.setState({
        price: { ...useInventoryStore.getState().price, '8': 0 },
      });
      const { container } = render(<PriceTag />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('超出成本计算', () => {
    it('需求 > 库存 -> 渲染超出金额', () => {
      // 1 条 len=8, stock=0, price=15 -> excess=1, total=15
      useSceneStore.setState({
        nodes: { '0,0,0': createTestNode('0,0,0', [0, 0, 0]) },
        edges: { e1: createTestEdge('e1', '0,0,0', '8,0,0', 8) },
        panels: {},
      });
      render(<PriceTag />);
      expect(screen.getByText('¥15.00')).toBeInTheDocument();
    });

    it('多品类累加', () => {
      // 1 条 len=8 (excess 1*15=15) + 1 个 L connector (excess 1*3=3) = 18
      useSceneStore.setState({
        nodes: {
          '0,0,0': createTestNode('0,0,0', [0, 0, 0], 'L'),
          '8,0,0': createTestNode('8,0,0', [8, 0, 0]),
        },
        edges: { e1: createTestEdge('e1', '0,0,0', '8,0,0', 8) },
        panels: {},
      });
      render(<PriceTag />);
      expect(screen.getByText('¥18.00')).toBeInTheDocument();
    });
  });

  describe('显示格式', () => {
    it('货币符号 + 两位小数', () => {
      useSceneStore.setState({
        nodes: { '0,0,0': createTestNode('0,0,0', [0, 0, 0]) },
        edges: { e1: createTestEdge('e1', '0,0,0', '8,0,0', 8) },
        panels: {},
      });
      render(<PriceTag />);
      // price=15.0, excess=1 -> ¥15.00
      expect(screen.getByText('¥15.00')).toBeInTheDocument();
    });
  });
});
