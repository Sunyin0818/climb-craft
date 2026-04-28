# Changelog

All notable changes to the climb-craft project are documented in this file.

## [Unreleased] - 2026-04-28

### Added

- **Undo/Redo system** in `useSceneStore`: `undoStack` / `redoStack` (capped at 50 entries) with `pushUndo()`, `undo()`, `redo()` actions. All mutations (`placePipe`, `removePipe`, `placePanel`, `removePanel`, `clearScene`) automatically push undo snapshots before executing. `loadScene` clears both stacks.
- **Keyboard shortcuts**: `Ctrl+Z` for undo, `Ctrl+Shift+Z` / `Ctrl+Y` for redo, wired in `useStageInteraction.ts`.
- **Pointer tool card** ("选择 / 视角") as the first tool in Sidebar. When selected (`selectedTool='NONE'`), allows normal orbit/view interaction without triggering placement logic.
- **Collapsible inventory panel**: Inventory.tsx now supports collapse/expand toggle. Collapsed state shows a slim "BOM" tab with item count badge, recovering ~360px of canvas space.
- **CanvasErrorBoundary**: React error boundary (`src/components/canvas/CanvasErrorBoundary.tsx`) wrapping the Canvas, shows fallback UI on render errors with a reload button.
- **Accessibility improvements**:
  - Tool cards: `<div onClick>` replaced with `<button role="radio" aria-checked>` and focus ring styling.
  - Tool group wrapped in `<div role="radiogroup" aria-label>`.
  - `aria-label` added to all icon buttons (ProjectManager, InventorySettings, delete buttons, center view, collapse toggle).
  - Toast notification uses `role="alert" aria-live="polite"`.
- **Full i18n coverage**: Added keys for toast messages, button labels, project manager strings, inventory settings strings. All hardcoded Chinese strings in components now use `t.xxx` from dict.ts.
- **Expanded i18n dictionary**: Real-world physical dimensions in descriptions (e.g., "适合 350mm 长管" instead of "逻辑跨度 8 LU", "40x40cm 大面板" instead of "逻辑尺寸 8x8 LU").

### Changed

- **Stage.tsx decomposed** (645 → ~295 lines):
  - Extracted `AxisCrosshair` sub-component with `AXES` / `DEFAULT_UP` constants into `src/components/canvas/AxisCrosshair.tsx`.
  - Extracted `useStageInteraction` custom hook (all interaction state and handlers) into `src/components/canvas/useStageInteraction.ts`.
  - Extracted WebGL detection (`checkWebGLSupport`) and fallback UI into `src/components/canvas/WebGLFallback.tsx`.
  - Stage.tsx is now purely scene composition: Canvas setup, Grid, InstancedMesh components, preview ghosts, AxisCrosshair placement, OrbitControls.
- **`computeUsedCounts` decoupled**: Now takes `panels` as a 3rd parameter instead of internally calling `useSceneStore.getState().panels`, removing cross-store coupling.
- **Contrast fix**: Low-contrast text color `text-white/40` changed to `text-white/50` for WCAG AA compliance.
- **Collision engine**: Replaced `three-mesh-bvh` dependency with self-contained `CollisionUtils.ts` implementation (the `Collision.ts` stub was always returning false and has been removed).

### Fixed

- **Panel persistence**: `ProjectManager.tsx` now saves and loads `panels` alongside `nodes` / `edges` in IndexedDB. Previously, panels were lost on save/load.
- **Cross-store coupling**: `computeUsedCounts()` in `useInventoryStore.ts` no longer directly reads from `useSceneStore`; it receives `panels` as a parameter from the caller.
- **Dead import**: Removed unused `computeUsedCounts` import from `Inventory.tsx`.

### Removed

- **Unused npm dependencies**: `lucide-react`, `tailwind-merge`, `three-mesh-bvh` removed from package.json.
- **Stub file**: `src/core/engine/Collision.ts` deleted (always returned `false`, never imported anywhere).
