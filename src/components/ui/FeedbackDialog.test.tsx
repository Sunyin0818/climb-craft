import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useLogStore } from '@/store/useLogStore';
import FeedbackDialog from './FeedbackDialog';

// Mock createPortal to render inline
vi.mock('react-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-dom')>();
  return {
    ...actual,
    createPortal: (node: React.ReactNode) => node,
  };
});

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('FeedbackDialog', () => {
  const onClose = vi.fn();

  beforeEach(() => {
    onClose.mockClear();
    mockFetch.mockReset();
    useLogStore.getState().clear();
    // Add some log entries for testing
    useLogStore.getState().append({ action: 'pipe:place', result: 'success' });
    useLogStore.getState().append({ action: 'undo', result: 'success' });
  });

  it('空描述时提交按钮禁用', () => {
    render(<FeedbackDialog onClose={onClose} />);
    const submitBtn = screen.getByText('发送反馈');
    expect(submitBtn).toBeDisabled();
  });

  it('输入描述后按钮启用', () => {
    render(<FeedbackDialog onClose={onClose} />);
    const textarea = screen.getByPlaceholderText('请描述你遇到的问题...');
    fireEvent.change(textarea, { target: { value: '有个 bug' } });
    const submitBtn = screen.getByText('发送反馈');
    expect(submitBtn).not.toBeDisabled();
  });

  it('Escape 关闭弹窗', () => {
    render(<FeedbackDialog onClose={onClose} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('场景快照复选框默认不勾选', () => {
    render(<FeedbackDialog onClose={onClose} />);
    const snapshotCheckbox = screen.getByLabelText('当前设计场景快照');
    expect(snapshotCheckbox).not.toBeChecked();
  });

  it('日志和浏览器信息默认勾选', () => {
    render(<FeedbackDialog onClose={onClose} />);
    const logsCheckbox = screen.getByLabelText('操作日志');
    const deviceCheckbox = screen.getByLabelText('浏览器与设备信息');
    expect(logsCheckbox).toBeChecked();
    expect(deviceCheckbox).toBeChecked();
  });

  it('字符计数显示', () => {
    render(<FeedbackDialog onClose={onClose} />);
    expect(screen.getByText('0 / 2000')).toBeTruthy();
    const textarea = screen.getByPlaceholderText('请描述你遇到的问题...');
    fireEvent.change(textarea, { target: { value: 'hello' } });
    expect(screen.getByText('5 / 2000')).toBeTruthy();
  });

  it('提交 payload 结构正确', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true });
    render(<FeedbackDialog onClose={onClose} />);

    const textarea = screen.getByPlaceholderText('请描述你遇到的问题...');
    fireEvent.change(textarea, { target: { value: '测试问题' } });

    const submitBtn = screen.getByText('发送反馈');
    fireEvent.click(submitBtn);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe('/api/feedback');
    expect(options.method).toBe('POST');

    const body = JSON.parse(options.body);
    expect(body.description).toBe('测试问题');
    expect(body.sessionId).toBeTruthy();
    expect(body.entries).toHaveLength(2);
    expect(body.userAgent).toBeTruthy();
    expect(body.sceneSnapshot).toBeUndefined(); // 默认不勾选
  });

  it('展开/收起日志预览', () => {
    render(<FeedbackDialog onClose={onClose} />);
    // 默认收起，日志表格不可见
    expect(screen.queryByRole('table')).toBeNull();

    // 点击展开
    const showBtn = screen.getByText(/展开日志/);
    fireEvent.click(showBtn);
    expect(screen.getByRole('table')).toBeTruthy();

    // 点击收起
    const hideBtn = screen.getByText(/收起日志/);
    fireEvent.click(hideBtn);
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('提交成功后显示成功提示并自动关闭', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true });
    render(<FeedbackDialog onClose={onClose} />);

    const textarea = screen.getByPlaceholderText('请描述你遇到的问题...');
    fireEvent.change(textarea, { target: { value: '测试问题' } });
    fireEvent.click(screen.getByText('发送反馈'));

    expect(await screen.findByText('反馈已提交，感谢！')).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();
    // 自动关闭需要等待 setTimeout
    await new Promise((r) => setTimeout(r, 1600));
    expect(onClose).toHaveBeenCalled();
  });

  it('提交失败显示错误信息和重试按钮', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));
    render(<FeedbackDialog onClose={onClose} />);

    const textarea = screen.getByPlaceholderText('请描述你遇到的问题...');
    fireEvent.change(textarea, { target: { value: '测试问题' } });
    fireEvent.click(screen.getByText('发送反馈'));

    expect(await screen.findByText('发送失败，请重试。')).toBeTruthy();
    expect(screen.getByText('重试')).toBeTruthy();
  });

  it('提交中按钮禁用', async () => {
    // Never-resolving fetch to keep submitting state
    mockFetch.mockReturnValueOnce(new Promise(() => {}));
    render(<FeedbackDialog onClose={onClose} />);

    const textarea = screen.getByPlaceholderText('请描述你遇到的问题...');
    fireEvent.change(textarea, { target: { value: '测试问题' } });
    fireEvent.click(screen.getByText('发送反馈'));

    // Button should show loading state
    expect(screen.getByText('发送中...')).toBeTruthy();
    expect(screen.getByText('发送中...')).toBeDisabled();
  });
});
