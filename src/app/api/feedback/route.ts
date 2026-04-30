import { NextResponse } from 'next/server';

const MAX_BODY_BYTES = 100_000;

interface LogEntry {
  id: string;
  timestamp: number;
  action: string;
  result: 'success' | 'rejected';
  payload?: Record<string, unknown>;
  reason?: string;
}

interface FeedbackPayload {
  description: string;
  email?: string;
  sessionId: string;
  entries?: LogEntry[];
  userAgent?: string;
  sceneSnapshot?: Record<string, unknown>;
}

// --- pure formatters (exported for testing) ---

export function escapeMarkdown(text: string): string {
  return text.replace(/[|<>`*_\[\]]/g, '\\$&').replace(/\n/g, ' ');
}

export function makeTitle(description: string): string {
  const prefix = '[Feedback] ';
  const maxLen = 60 - prefix.length;
  const truncated =
    description.length > maxLen
      ? description.slice(0, maxLen) + '...'
      : description;
  return prefix + truncated;
}

export function formatLogTable(entries: LogEntry[]): string {
  if (!entries.length) return '';
  const rows = entries.slice(-50).map((e) => {
    const time = new Date(e.timestamp).toLocaleString('zh-CN');
    const payload = e.payload ? JSON.stringify(e.payload) : '-';
    return `| ${escapeMarkdown(time)} | ${escapeMarkdown(e.action)} | ${escapeMarkdown(e.result)} | ${escapeMarkdown(e.reason ?? '-')} | ${escapeMarkdown(payload)} |`;
  });
  return [
    '| 时间 | 操作 | 结果 | 原因 | 详情 |',
    '|------|------|------|------|------|',
    ...rows,
  ].join('\n');
}

export function buildIssueBody(data: FeedbackPayload): string {
  const parts: string[] = [`## 问题描述\n\n${escapeMarkdown(data.description)}`];
  if (data.email) parts.push(`**联系邮箱:** ${escapeMarkdown(data.email)}`);
  parts.push(`**Session ID:** \`${escapeMarkdown(data.sessionId)}\``);
  if (data.userAgent)
    parts.push(`**浏览器:** ${escapeMarkdown(data.userAgent)}`);
  if (data.entries?.length) {
    parts.push(`## 操作日志\n\n${formatLogTable(data.entries)}`);
  }
  return parts.join('\n\n');
}

// --- GitHub API helpers ---

async function ghFetch(path: string, body: unknown) {
  const token = process.env.GITHUB_TOKEN!;
  const repo = process.env.GITHUB_REPO!;
  return fetch(`https://api.github.com/repos/${repo}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `token ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'climb-craft-feedback',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  });
}

// --- rate limiting (in-memory, per-IP) ---

const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT = 5;
const RATE_WINDOW = 60_000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(ip) ?? [];
  const recent = timestamps.filter((t) => now - t < RATE_WINDOW);
  if (recent.length >= RATE_LIMIT) return false;
  recent.push(now);
  rateLimitMap.set(ip, recent);
  return true;
}

// --- route handler ---

export async function POST(request: Request) {
  // Content-Length pre-check before parsing
  const contentLength = request.headers.get('content-length');
  if (contentLength && parseInt(contentLength, 10) > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
  }

  let data: FeedbackPayload;
  try {
    data = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Post-parse size guard (fallback for when Content-Length is missing)
  if (JSON.stringify(data).length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
  }

  const { description, sessionId } = data;
  if (typeof description !== 'string' || !description.trim()) {
    return NextResponse.json({ error: 'Missing description' }, { status: 400 });
  }
  if (typeof sessionId !== 'string' || !sessionId) {
    return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
  }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sessionId)) {
    return NextResponse.json({ error: 'Invalid sessionId format' }, { status: 400 });
  }
  if (description.trim().length > 2000) {
    return NextResponse.json({ error: 'Description too long' }, { status: 400 });
  }

  // Rate limiting
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;

  // fail-open: no env vars → console.log only
  if (!token || !repo) {
    console.log('[feedback-fallback]', {
      sessionId,
      description: description.trim(),
      entryCount: data.entries?.length ?? 0,
      hasSnapshot: !!data.sceneSnapshot,
    });
    return NextResponse.json({ ok: true, degraded: true });
  }

  try {
    const title = makeTitle(description.trim());
    const body = buildIssueBody({ ...data, description: description.trim() });

    const res = await ghFetch('/issues', {
      title,
      body,
      labels: ['feedback'],
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error('[feedback] GitHub API error:', res.status, text);
      return NextResponse.json({ ok: true, degraded: true });
    }

    // post scene snapshot as separate comment
    if (data.sceneSnapshot) {
      const issue = await res.json();
      const snapshotJson = JSON.stringify(data.sceneSnapshot, null, 2);
      const commentBody = `## 场景快照\n\n<details>\n<summary>点击展开场景数据</summary>\n\n\`\`\`json\n${snapshotJson}\n\`\`\`\n\n</details>`;
      await ghFetch(`/issues/${issue.number}/comments`, {
        body: commentBody,
      }).catch((e) =>
        console.error('[feedback] Failed to post snapshot comment:', e),
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[feedback] Unexpected error:', e);
    return NextResponse.json({ ok: true, degraded: true });
  }
}
