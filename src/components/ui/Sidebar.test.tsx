import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Sidebar from './Sidebar';
import { useSceneStore } from '@/store/useSceneStore';
import { createTestNode } from '@/__tests__/factories';

describe('Sidebar', () => {
  beforeEach(() => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    useSceneStore.setState({
      nodes: {}, edges: {}, panels: {},
      undoStack: [], redoStack: [], selectedTool: 'NONE',
    });
  });
  afterEach(() => { vi.restoreAllMocks(); });

  describe('工具选择', () => {
    it('渲染 5 个 radio 按钮', () => {
      render(<Sidebar />);
      expect(screen.getAllByRole('radio')).toHaveLength(5);
    });

    it('初始状态无选中', () => {
      render(<Sidebar />);
      const radios = screen.getAllByRole('radio');
      radios.forEach(r => expect(r).toHaveAttribute('aria-checked', 'false'));
    });

    it('点击第一个工具 -> selectedTool 切换', async () => {
      const user = userEvent.setup();
      render(<Sidebar />);
      const radios = screen.getAllByRole('radio');
      await user.click(radios[0]);
      expect(radios[0]).toHaveAttribute('aria-checked', 'true');
    });

    it('管子组和面板组之间有分隔线', () => {
      const { container } = render(<Sidebar />);
      const dividers = container.querySelectorAll('.h-px');
      expect(dividers.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('尺寸显示', () => {
    it('无节点 -> "0 x 0 cm" 和 "0 cm"', () => {
      render(<Sidebar />);
      expect(screen.getByText('0 × 0 cm')).toBeInTheDocument();
      expect(screen.getByText('0 cm')).toBeInTheDocument();
    });

    it('有节点 -> 计算后的尺寸', () => {
      // 节点 [0,0,0] 和 [5,3,2] (逻辑坐标)
      // width = (5-0)*50 + 50 = 300mm -> 30cm
      // depth = (2-0)*50 + 50 = 150mm -> 15cm
      // height = (3-0)*50 + 50 = 200mm -> 20cm
      useSceneStore.setState({
        nodes: {
          '0,0,0': createTestNode('0,0,0', [0, 0, 0]),
          '250,150,100': createTestNode('250,150,100', [250, 150, 100]),
        },
      });
      render(<Sidebar />);
      expect(screen.getByText('30 × 15 cm')).toBeInTheDocument();
      expect(screen.getByText('20 cm')).toBeInTheDocument();
    });
  });

  describe('弹窗切换', () => {
    it('点击 "本地设计草稿库" -> 显示 ProjectManager', async () => {
      const user = userEvent.setup();
      render(<Sidebar />);
      await user.click(screen.getByLabelText('本地设计草稿库'));
      // ProjectManager 有标题
      expect(screen.getByText(/项目管理|Project Manager|草稿库/i)).toBeInTheDocument();
    });

    it('点击 "库存配置与价格" -> 显示 InventorySettings', async () => {
      const user = userEvent.setup();
      render(<Sidebar />);
      await user.click(screen.getByLabelText('库存配置与价格'));
      // InventorySettings 有标题
      expect(screen.getByText(/库存配置|Inventory|价格/i)).toBeInTheDocument();
    });
  });
});
