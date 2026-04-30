import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  escapeMarkdown,
  makeTitle,
  formatLogTable,
  buildIssueBody,
} from './route';

// Mock fetch for route handler tests
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// We need to dynamically import POST to get a fresh module with env vars
async function importPost() {
  vi.resetModules();
  const mod = await import('./route');
  return mod.POST;
}

describe('escapeMarkdown', () => {
  it('转义 | 字符', () => {
    expect(escapeMarkdown('a|b')).toBe('a\\|b');
  });

  it('转义 < 和 >', () => {
    expect(escapeMarkdown('<script>')).toBe('\\<script\\>');
  });

  it('换行替换为空格', () => {
    expect(escapeMarkdown('line1\nline2')).toBe('line1 line2');
  });

  it('普通文本不变', () => {
    expect(escapeMarkdown('hello world')).toBe('hello world');
  });

  it('转义反引号', () => {
    expect(escapeMarkdown('`code`')).toBe('\\`code\\`');
  });

  it('转义方括号', () => {
    expect(escapeMarkdown('[link]')).toBe('\\[link\\]');
  });

  it('转义星号和下划线', () => {
    expect(escapeMarkdown('*bold* _italic_')).toBe('\\*bold\\* \\_italic\\_');
  });
});

describe('makeTitle', () => {
  it('短描述原样加前缀', () => {
    expect(makeTitle('有个 bug')).toBe('[Feedback] 有个 bug');
  });

  it('超长描述截断加 ...', () => {
    const long = 'a'.repeat(100);
    const title = makeTitle(long);
    // '[Feedback] ' is 11 chars, maxLen = 60 - 11 = 49
    expect(title).toBe('[Feedback] ' + 'a'.repeat(49) + '...');
    expect(title.length).toBe(63);
  });

  it('正好 49 字符不截断', () => {
    const exact = 'a'.repeat(49);
    expect(makeTitle(exact)).toBe('[Feedback] ' + exact);
  });
});

describe('formatLogTable', () => {
  it('空数组返回空字符串', () => {
    expect(formatLogTable([])).toBe('');
  });

  it('渲染表头、分隔线和数据行', () => {
    const entries = [
      { id: '1', timestamp: 1714500000000, action: 'pipe:place', result: 'success' as const },
    ];
    const table = formatLogTable(entries);
    expect(table).toContain('| 时间 | 操作 | 结果 | 原因 | 详情 |');
    expect(table).toContain('|------|------|------|------|------|');
    expect(table).toContain('pipe:place');
    expect(table).toContain('success');
  });

  it('超过 50 条只取最后 50', () => {
    const entries = Array.from({ length: 60 }, (_, i) => ({
      id: String(i),
      timestamp: 1714500000000 + i,
      action: `action-${i}`,
      result: 'success' as const,
    }));
    const table = formatLogTable(entries);
    expect(table).not.toContain('action-0');
    expect(table).not.toContain('action-9');
    expect(table).toContain('action-10');
    expect(table).toContain('action-59');
  });

  it('reason 和 payload 正确显示', () => {
    const entries = [
      {
        id: '1',
        timestamp: 1714500000000,
        action: 'validation:rejected',
        result: 'rejected' as const,
        reason: 'collision',
        payload: { start: [0, 0, 0] },
      },
    ];
    const table = formatLogTable(entries);
    expect(table).toContain('collision');
    expect(table).toContain('"start"');
  });

  it('action/result/reason 中的 markdown 字符被转义', () => {
    const entries = [
      {
        id: '1',
        timestamp: 1714500000000,
        action: 'test`action',
        result: 'success' as const,
        reason: 'reason*with_pecial',
      },
    ];
    const table = formatLogTable(entries);
    expect(table).toContain('test\\`action');
    expect(table).toContain('reason\\*with\\_pecial');
  });
});

describe('buildIssueBody', () => {
  it('包含描述和 sessionId', () => {
    const body = buildIssueBody({
      description: '测试问题',
      sessionId: 'sess-123',
    });
    expect(body).toContain('## 问题描述');
    expect(body).toContain('测试问题');
    expect(body).toContain('sess-123');
  });

  it('包含邮箱（如有）', () => {
    const body = buildIssueBody({
      description: '问题',
      sessionId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      email: 'test@example.com',
    });
    expect(body).toContain('test@example.com');
  });

  it('不含邮箱时无邮箱行', () => {
    const body = buildIssueBody({
      description: '问题',
      sessionId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    });
    expect(body).not.toContain('联系邮箱');
  });

  it('包含 userAgent（如有）', () => {
    const body = buildIssueBody({
      description: '问题',
      sessionId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      userAgent: 'Mozilla/5.0',
    });
    expect(body).toContain('Mozilla/5.0');
  });

  it('包含日志表格（如有）', () => {
    const body = buildIssueBody({
      description: '问题',
      sessionId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      entries: [
        { id: '1', timestamp: 1714500000000, action: 'pipe:place', result: 'success' },
      ],
    });
    expect(body).toContain('## 操作日志');
    expect(body).toContain('pipe:place');
  });

  it('无日志时不含日志段', () => {
    const body = buildIssueBody({
      description: '问题',
      sessionId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    });
    expect(body).not.toContain('操作日志');
  });
});

describe('POST route handler', () => {
  const origEnv = { ...process.env };

  beforeEach(() => {
    vi.restoreAllMocks();
    mockFetch.mockReset();
    process.env = { ...origEnv };
    delete process.env.GITHUB_TOKEN;
    delete process.env.GITHUB_REPO;
  });

  function makeRequest(body: unknown, headers?: Record<string, string>) {
    return new Request('http://localhost/api/feedback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(body),
    });
  }

  it('缺少 env vars → console.log 降级，返回 degraded', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const POST = await importPost();

    const res = await POST(
      makeRequest({ description: '问题', sessionId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' }),
    );
    const json = await res.json();

    expect(json).toEqual({ ok: true, degraded: true });
    expect(consoleSpy).toHaveBeenCalledWith(
      '[feedback-fallback]',
      expect.objectContaining({ sessionId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', description: '问题' }),
    );
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('正常提交 → 调用 GitHub Issues API', async () => {
    process.env.GITHUB_TOKEN = 'ghp_test';
    process.env.GITHUB_REPO = 'owner/repo';
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ number: 42 }),
    });

    const POST = await importPost();
    const res = await POST(
      makeRequest({ description: 'bug 描述', sessionId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' }),
    );
    const json = await res.json();

    expect(json).toEqual({ ok: true });
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe('https://api.github.com/repos/owner/repo/issues');
    expect(options.method).toBe('POST');
    expect(options.headers.Authorization).toBe('token ghp_test');

    const body = JSON.parse(options.body);
    expect(body.title).toContain('[Feedback]');
    expect(body.labels).toEqual(['feedback']);
    expect(body.body).toContain('bug 描述');
  });

  it('GitHub API 返回错误 → fail-open', async () => {
    process.env.GITHUB_TOKEN = 'ghp_test';
    process.env.GITHUB_REPO = 'owner/repo';
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      text: () => Promise.resolve('rate limited'),
    });

    const POST = await importPost();
    const res = await POST(
      makeRequest({ description: '问题', sessionId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' }),
    );
    const json = await res.json();

    expect(json).toEqual({ ok: true, degraded: true });
    expect(consoleSpy).toHaveBeenCalledWith(
      '[feedback] GitHub API error:',
      403,
      'rate limited',
    );
  });

  it('场景快照作为 comment 发布', async () => {
    process.env.GITHUB_TOKEN = 'ghp_test';
    process.env.GITHUB_REPO = 'owner/repo';
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ number: 99 }),
      })
      .mockResolvedValueOnce({ ok: true });

    const POST = await importPost();
    await POST(
      makeRequest({
        description: '问题',
        sessionId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        sceneSnapshot: { nodes: {}, edges: {}, panels: {} },
      }),
    );

    expect(mockFetch).toHaveBeenCalledTimes(2);
    const [commentUrl, commentOpts] = mockFetch.mock.calls[1];
    expect(commentUrl).toBe(
      'https://api.github.com/repos/owner/repo/issues/99/comments',
    );
    const commentBody = JSON.parse(commentOpts.body).body;
    expect(commentBody).toContain('<details>');
    expect(commentBody).toContain('场景快照');
  });

  it('超大 payload → 413', async () => {
    const POST = await importPost();
    const bigPayload = {
      description: '问题',
      sessionId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      snapshot: 'x'.repeat(110000),
    };
    const req = new Request('http://localhost/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bigPayload),
    });

    const res = await POST(req);
    expect(res.status).toBe(413);
  });

  it('无效 JSON → 400', async () => {
    const POST = await importPost();
    const req = new Request('http://localhost/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not json',
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('缺少 description → 400', async () => {
    const POST = await importPost();
    const res = await POST(makeRequest({ sessionId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' }));
    expect(res.status).toBe(400);
  });

  it('缺少 sessionId → 400', async () => {
    const POST = await importPost();
    const res = await POST(makeRequest({ description: '问题' }));
    expect(res.status).toBe(400);
  });

  it('sessionId 格式无效 → 400', async () => {
    const POST = await importPost();
    const res = await POST(makeRequest({ description: '问题', sessionId: 'not-a-uuid' }));
    expect(res.status).toBe(400);
  });

  it('sessionId 格式有效 → 通过校验', async () => {
    const POST = await importPost();
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const res = await POST(makeRequest({ description: '问题', sessionId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' }));
    expect(res.status).toBe(200);
    consoleSpy.mockRestore();
  });

  it('description 超长 → 400', async () => {
    const POST = await importPost();
    const res = await POST(
      makeRequest({ description: 'x'.repeat(2001), sessionId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' }),
    );
    expect(res.status).toBe(400);
  });

  it('Content-Length 超限 → 413（解析前拒绝）', async () => {
    const POST = await importPost();
    // 构造一个 Content-Length 超限的请求
    // 注意：测试环境中 Request 可能不保留 Content-Length header，
    // 所以同时测试 post-parse 的 fallback 检查
    const bigPayload = {
      description: '问题',
      sessionId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      snapshot: 'x'.repeat(110000),
    };
    const req = new Request('http://localhost/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bigPayload),
    });
    const res = await POST(req);
    expect(res.status).toBe(413);
  });

  it('缺失 env vars → 返回 degraded: true', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const POST = await importPost();
    const res = await POST(makeRequest({ description: '问题', sessionId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' }));
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.degraded).toBe(true);
    consoleSpy.mockRestore();
  });

  it('GitHub API 错误 → 返回 degraded: true', async () => {
    process.env.GITHUB_TOKEN = 'ghp_test';
    process.env.GITHUB_REPO = 'owner/repo';
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      text: () => Promise.resolve('rate limited'),
    });
    const POST = await importPost();
    const res = await POST(makeRequest({ description: '问题', sessionId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' }));
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.degraded).toBe(true);
  });

  it('速率限制：超过 5 次/分钟 → 429', async () => {
    const POST = await importPost();
    const reqs = Array.from({ length: 6 }, () =>
      POST(makeRequest({ description: '问题', sessionId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })),
    );
    const results = await Promise.all(reqs);
    const statuses = results.map((r) => r.status);
    expect(statuses.filter((s) => s === 200)).toHaveLength(5);
    expect(statuses.filter((s) => s === 429)).toHaveLength(1);
  });
});
