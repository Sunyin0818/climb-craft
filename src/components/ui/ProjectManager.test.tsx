import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProjectManager from './ProjectManager';
import { useSceneStore } from '@/store/useSceneStore';
import { useLocaleStore } from '@/store/useLocaleStore';
import { db } from '@/db/schema';

function getT() {
  return useLocaleStore.getState().t;
}

describe('ProjectManager', () => {
  const onClose = vi.fn();

  beforeEach(async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    // 清理 IndexedDB
    await db.projects.clear();
    useSceneStore.setState({
      nodes: {}, edges: {}, panels: {},
      undoStack: [], redoStack: [], selectedTool: 'NONE',
    });
    onClose.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('空状态', () => {
    it('无历史项目 -> 显示 empty 文案', async () => {
      render(<ProjectManager onClose={onClose} />);
      const t = getT();
      await waitFor(() => {
        expect(screen.getByText(t.projectManager.empty)).toBeInTheDocument();
      });
    });
  });

  describe('Portal 渲染', () => {
    it('通过 createPortal 渲染到 document.body', async () => {
      const { container } = render(<ProjectManager onClose={onClose} />);
      // 组件内部用 portal 渲染到 body，不在 container 内
      const t = getT();
      await waitFor(() => {
        expect(screen.getByText(t.projectManager.title)).toBeInTheDocument();
      });
      // body 下应有 fixed 定位弹窗
      expect(document.body.querySelector('.fixed')).toBeTruthy();
    });
  });

  describe('保存新项目', () => {
    it('输入名称 + 保存 -> 出现在列表中', async () => {
      const user = userEvent.setup();
      render(<ProjectManager onClose={onClose} />);
      const t = getT();
      const input = screen.getByPlaceholderText(t.projectManager.placeholder);
      await user.type(input, '我的攀岩墙');
      await user.click(screen.getByText(t.projectManager.saveAsNew));
      await waitFor(() => {
        expect(screen.getByText('我的攀岩墙')).toBeInTheDocument();
      });
    });

    it('空名称 -> 保存按钮禁用', () => {
      render(<ProjectManager onClose={onClose} />);
      const t = getT();
      const btn = screen.getByText(t.projectManager.saveAsNew);
      expect(btn).toBeDisabled();
    });

    it('纯空格名称 -> 保存按钮禁用', async () => {
      const user = userEvent.setup();
      render(<ProjectManager onClose={onClose} />);
      const t = getT();
      const input = screen.getByPlaceholderText(t.projectManager.placeholder);
      await user.type(input, '   ');
      const btn = screen.getByText(t.projectManager.saveAsNew);
      expect(btn).toBeDisabled();
    });

    it('保存后输入框清空', async () => {
      const user = userEvent.setup();
      render(<ProjectManager onClose={onClose} />);
      const t = getT();
      const input = screen.getByPlaceholderText(t.projectManager.placeholder);
      await user.type(input, '测试项目');
      await user.click(screen.getByText(t.projectManager.saveAsNew));
      await waitFor(() => {
        expect(input).toHaveValue('');
      });
    });
  });

  describe('覆盖已有项目', () => {
    it('点击覆盖 -> 更新 DB', async () => {
      const user = userEvent.setup();
      render(<ProjectManager onClose={onClose} />);
      const t = getT();

      // 先保存一个项目
      const input = screen.getByPlaceholderText(t.projectManager.placeholder);
      await user.type(input, '项目A');
      await user.click(screen.getByText(t.projectManager.saveAsNew));
      await waitFor(() => {
        expect(screen.getByText('项目A')).toBeInTheDocument();
      });

      // 修改场景
      useSceneStore.getState().placePipe([0, 0, 0], [8, 0, 0], 8);

      // 点击覆盖按钮 (title=overwrite)
      const overwriteBtn = screen.getByTitle(t.projectManager.overwrite);
      await user.click(overwriteBtn);

      // 验证 DB 中 data 已更新
      await waitFor(async () => {
        const projects = await db.projects.toArray();
        expect(projects).toHaveLength(1);
        expect(projects[0].data.edges).toBeDefined();
        expect(Object.keys(projects[0].data.edges as any)).toHaveLength(1);
      });
    });
  });

  describe('加载项目', () => {
    it('点击加载 -> loadScene 被调用, 弹窗关闭', async () => {
      const user = userEvent.setup();
      render(<ProjectManager onClose={onClose} />);
      const t = getT();

      // 先保存
      const input = screen.getByPlaceholderText(t.projectManager.placeholder);
      await user.type(input, '项目B');
      await user.click(screen.getByText(t.projectManager.saveAsNew));
      await waitFor(() => {
        expect(screen.getByText('项目B')).toBeInTheDocument();
      });

      // 点击加载
      const loadBtn = screen.getByTitle(t.projectManager.load);
      await user.click(loadBtn);

      expect(onClose).toHaveBeenCalled();
    });

    it('加载无效 data (无 nodes/edges) -> 不崩溃', async () => {
      // 手动插入一个无效数据
      await db.projects.add({
        name: '无效项目',
        data: { invalid: true },
        updatedAt: Date.now(),
      });

      render(<ProjectManager onClose={onClose} />);
      const t = getT();

      await waitFor(() => {
        expect(screen.getByText('无效项目')).toBeInTheDocument();
      });

      // 点击加载不应崩溃
      const loadBtn = screen.getByTitle(t.projectManager.load);
      await userEvent.setup().click(loadBtn);

      // onClose 不应被调用（因为 data.nodes 不存在）
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('删除项目', () => {
    it('confirm=true -> 项目从列表消失', async () => {
      const origConfirm = window.confirm;
      window.confirm = vi.fn().mockReturnValue(true);
      try {
        const user = userEvent.setup();
        render(<ProjectManager onClose={onClose} />);
        const t = getT();

        const input = screen.getByPlaceholderText(t.projectManager.placeholder);
        await user.type(input, '待删除');
        await user.click(screen.getByText(t.projectManager.saveAsNew));
        await waitFor(() => {
          expect(screen.getByText('待删除')).toBeInTheDocument();
        });

        const deleteBtn = screen.getByTitle(t.projectManager.delete);
        await user.click(deleteBtn);

        await waitFor(() => {
          expect(screen.queryByText('待删除')).not.toBeInTheDocument();
        });
      } finally {
        window.confirm = origConfirm;
      }
    });

    it('confirm=false -> 项目仍在', async () => {
      const origConfirm = window.confirm;
      window.confirm = vi.fn().mockReturnValue(false);
      try {
        const user = userEvent.setup();
        render(<ProjectManager onClose={onClose} />);
        const t = getT();

        const input = screen.getByPlaceholderText(t.projectManager.placeholder);
        await user.type(input, '保留项目');
        await user.click(screen.getByText(t.projectManager.saveAsNew));
        await waitFor(() => {
          expect(screen.getByText('保留项目')).toBeInTheDocument();
        });

        const deleteBtn = screen.getByTitle(t.projectManager.delete);
        await user.click(deleteBtn);

        expect(screen.getByText('保留项目')).toBeInTheDocument();
      } finally {
        window.confirm = origConfirm;
      }
    });
  });

  describe('清空场景', () => {
    it('点击清空 + confirm -> clearScene + onClose', async () => {
      const origConfirm = window.confirm;
      window.confirm = vi.fn().mockReturnValue(true);
      try {
        const user = userEvent.setup();
        const clearSpy = vi.spyOn(useSceneStore.getState(), 'clearScene');
        render(<ProjectManager onClose={onClose} />);
        const t = getT();

        await user.click(screen.getByText(t.projectManager.clearScene));
        expect(clearSpy).toHaveBeenCalled();
        expect(onClose).toHaveBeenCalled();
        clearSpy.mockRestore();
      } finally {
        window.confirm = origConfirm;
      }
    });

    it('点击清空 + cancel -> 不操作', async () => {
      const origConfirm = window.confirm;
      window.confirm = vi.fn().mockReturnValue(false);
      try {
        const user = userEvent.setup();
        const clearSpy = vi.spyOn(useSceneStore.getState(), 'clearScene');
        render(<ProjectManager onClose={onClose} />);
        const t = getT();

        await user.click(screen.getByText(t.projectManager.clearScene));
        expect(clearSpy).not.toHaveBeenCalled();
        expect(onClose).not.toHaveBeenCalled();
        clearSpy.mockRestore();
      } finally {
        window.confirm = origConfirm;
      }
    });
  });

  describe('关闭按钮', () => {
    it('点击关闭按钮 -> onClose 被调用', async () => {
      const user = userEvent.setup();
      render(<ProjectManager onClose={onClose} />);
      // 关闭按钮在 header 右上角 (svg X 图标)
      const closeBtn = document.body.querySelector('.fixed button')!;
      await user.click(closeBtn);
      expect(onClose).toHaveBeenCalled();
    });
  });
});
