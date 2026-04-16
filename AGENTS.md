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
