# AI Agent Development Rules & Guidelines

## 1. 核心设计原则 (Core Design Principles)
- **如无必要，勿增实体 (Occam's Razor)**：不要引入不必要的包、多余的抽象层级或复杂的生命周期流转。
- **精简与专注 (Minimal & Focused)**：严格聚焦于当前任务的核心目标，保持代码精炼直观，不用花费大量代码去处理“未来可能存在”的场景。
- **拒绝冗余设计 (No Over-Engineering)**：不做过度设计，抛弃花哨无用的模式，采用最直接有效、性能最好且最易读的解决方案。

## 2. Next.js 专属规范 (Next.js Specific Rules)
<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## 3. Git 提交规范 (Git Commit Rules)
- **提交者信息 (Author Info)**：
  - `user.name`：必须使用当前大模型的名称（例如：`gemini` 或其他对应的模型名）。
  - `user.email`：必须固定为 `工具名称@example.com`（例如：`gemini-cli@example.com`）。
- **换行符处理 (Line Endings)**：
  - 始终依赖项目根目录的 `.gitattributes` 文件统一处理跨平台问题，强制文本文件在代码库中保持为 LF。
