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

## 3. 自动化测试规范 (Testing Standards)
- **测试框架**：使用 Vitest + happy-dom，配合 @testing-library/react 进行组件测试。
- **测试方案文档**：完整测试设计详见 `docs/testing-plan.md`，所有测试用例按 P0/P1/P2 优先级分级。
- **覆盖率门槛**：核心引擎层 (`src/core/`) ≥ 90%，Store 层 (`src/store/`) ≥ 80%，组件层 ≥ 60%。
- **测试文件位置**：测试文件与源文件同目录放置（`xxx.test.ts` 与 `xxx.ts` 同目录）。
- **纯函数优先**：核心引擎函数（CoordinateUtils、CollisionUtils、Snapping、SlotEnumerator、recalculateNodeShapes）是纯函数，必须有完整单元测试。
- **Store 测试隔离**：每个测试用例必须在 `beforeEach` 中重置 Store 状态，避免测试间污染。
- **Math.random Mock**：`placePipe` 和 `placePanel` 使用 `Math.random()` 分配颜色，测试中必须 mock 为确定性值。
- **Dexie 测试**：使用 `fake-indexeddb` polyfill，`beforeEach` 中 `db.projects.clear()` 清理数据。

## 4. Git 提交规范 (Git Commit Rules)
- **提交者信息 (Author Info)**：
  - `user.name`：必须使用当前大模型的名称（例如：`gemini` 或其他对应的模型名）。
  - `user.email`：必须固定为 `工具名称@example.com`（例如：`gemini-cli@example.com`）。
- **换行符处理 (Line Endings)**：
  - 始终依赖项目根目录的 `.gitattributes` 文件统一处理跨平台问题，强制文本文件在代码库中保持为 LF。
