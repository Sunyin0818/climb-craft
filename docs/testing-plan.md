# ClimbCraft 自动化测试设计方案

> 联合 **Test Results Analyzer**、**Software Architect**、**Frontend Developer** 三个专业视角设计

## 一、基础设施搭建

### 1.1 安装依赖

```bash
npm i -D vitest @testing-library/react @testing-library/user-event \
  @testing-library/jest-dom fake-indexeddb happy-dom
```

### 1.2 Vitest 配置 (`vitest.config.ts`)

```ts
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
    coverage: {
      provider: 'v8',
      thresholds: {
        'src/core/**': { statements: 90 },
        'src/store/**': { statements: 80 },
      },
    },
  },
});
```

### 1.3 测试入口 (`src/__tests__/setup.ts`)

```ts
import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';
```

### 1.4 目录结构

```
src/
├── __tests__/           # 共享 setup + 工厂
│   ├── setup.ts
│   └── factories.ts     # createTestNodes, createTestEdges 等
├── core/
│   ├── utils/CoordinateUtils.ts
│   └── engine/
│       ├── CollisionUtils.ts
│       ├── SlotEnumerator.ts
│       └── Snapping.ts
├── store/
│   ├── useSceneStore.ts
│   └── useInventoryStore.ts
└── components/
    ├── canvas/useStageInteraction.ts
    └── ui/Inventory.tsx, ProjectManager.tsx, Sidebar.tsx, PriceTag.tsx
```

测试文件与源文件**同目录**放置（`xxx.test.ts` 与 `xxx.ts` 同目录）。

### 1.5 测试工厂 (`src/__tests__/factories.ts`)

```ts
import type { NodeInstance, EdgeInstance, PanelInstance } from '@/store/useSceneStore';

export const createTestNode = (id: string, position: [number,number,number], shape = 'UNKNOWN'): NodeInstance => ({
  id, position, type: 'CONN', shape: shape as any,
});

export const createTestEdge = (id: string, start: string, end: string, length = 8): EdgeInstance => ({
  id, start, end, type: 'PIPE', length, color: '#ef4444',
});

export const createTestPanel = (id: string, position: [number,number,number], size: [number,number], axis: 'x'|'y'|'z'): PanelInstance => ({
  id, position, size, axis, color: '#3b82f6',
});

export const createSimpleScene = () => {
  const nodes = {
    '0,0,0': createTestNode('0,0,0', [0,0,0]),
    '8,0,0': createTestNode('8,0,0', [8,0,0]),
  };
  const edges = {
    'edge-x': createTestEdge('edge-x', '0,0,0', '8,0,0', 8),
  };
  return { nodes, edges, panels: {} };
};
```

### 1.6 Math.random Mock

`placePipe` 和 `placePanel` 使用 `Math.random()` 分配颜色。测试中需 mock：

```ts
beforeEach(() => { vi.spyOn(Math, 'random').mockReturnValue(0); });
afterEach(() => { vi.restoreAllMocks(); });
```

---

## 二、P0 纯函数测试（最高优先级）

### 2.1 CoordinateUtils (`src/core/utils/CoordinateUtils.test.ts`)

| # | 测试用例 | 输入 | 期望 |
|---|---------|------|------|
| CU-01 | `toLogic` 正值对齐 | `toLogic(50)` | `1` |
| CU-02 | `toLogic` 负值对齐 | `toLogic(-50)` | `-1` |
| CU-03 | `toLogic` 中间向下舍入 | `toLogic(24)` | `0` |
| CU-04 | `toLogic` 中间向上舍入 | `toLogic(25)` | `1` |
| CU-05 | `toLogic` 零 | `toLogic(0)` | `0` |
| CU-06 | `toWorld` 正值 | `toWorld(3)` | `150` |
| CU-07 | `toWorld` 零 | `toWorld(0)` | `0` |
| CU-08 | `toWorld` 负值 | `toWorld(-2)` | `-100` |
| CU-09 | `getEdgeKey` 顺序无关 | `getEdgeKey([0,0,0],[8,0,0])` === `getEdgeKey([8,0,0],[0,0,0])` | `true` |
| CU-10 | `getEdgeKey` 格式 | `getEdgeKey([1,2,3],[4,5,6])` | `"1,2,3--4,5,6"` |

### 2.2 CollisionUtils (`src/core/engine/CollisionUtils.test.ts`)

| # | 测试用例 | 场景 | 期望 |
|---|---------|------|------|
| CC-01 | 点在管子中间 | p=[2,0,0], edge [0,0,0]→[4,0,0] | `true` |
| CC-02 | 点在管子端点（strict 排除） | p=[0,0,0], edge [0,0,0]→[4,0,0] | `false` |
| CC-03 | 点不在管子线上 | p=[2,1,0], edge [0,0,0]→[4,0,0] | `false` |
| CC-04 | 空 edges | 任意点, edges={} | `false` |
| CC-05 | 新管穿过已有管中间 | seg [2,0,-1]→[2,0,1], 已有 [0,0,0]→[4,0,0] | `true` |
| CC-06 | 共线重叠 | seg [2,0,0]→[6,0,0], 已有 [0,0,0]→[4,0,0] | `true` |
| CC-07 | 端点在已有管中间 | seg [2,0,0]→[2,0,4], 已有 [0,0,0]→[4,0,0] | `true` |
| CC-08 | 穿越已有节点 | seg [0,0,0]→[4,0,0], 节点 [2,0,0] | `true` |
| CC-09 | 正交不相交 | seg [0,1,0]→[4,1,0], 已有 [0,0,0]→[4,0,0] | `false` |
| CC-10 | 端点共享（无严格内部交） | seg [0,0,0]→[0,0,4], 已有 [0,0,0]→[4,0,0] | `false` |
| CC-11 | 空 edges | seg [0,0,0]→[4,0,0], edges={} | `false` |
| CC-12 | 零长度段 | seg [2,0,0]→[2,0,0] | `false` |

### 2.3 Snapping (`src/core/engine/Snapping.test.ts`)

| # | 测试用例 | 输入 | 期望 |
|---|---------|------|------|
| SN-01 | 正值对齐 | `snapToGrid([120, 60, 0])` | `[100, 50, 0]` |
| SN-02 | 负值舍入 | `snapToGrid([-12, 23, 0])` | `[0, 0, 0]` |
| SN-03 | 中间边界 | `snapToGrid([24, 25, 0])` | `[0, 50, 0]` |
| SN-04 | X 轴主导 | `snapToAxis([0,0,0], [300,0,0], 8)` | `[400, 0, 0]` |
| SN-05 | Y 轴主导 | `snapToAxis([0,0,0], [0,200,0], 6)` | `[0, 300, 0]` |
| SN-06 | Z 轴主导 | `snapToAxis([0,0,0], [0,0,150], 4)` | `[0, 0, 200]` |
| SN-07 | 负方向 | `snapToAxis([400,0,0], [100,0,0], 8)` | `[0, 0, 0]` |
| SN-08 | tie-breaking (dx=dy) | `snapToAxis([0,0,0], [300,300,0], 8)` | `[400, 0, 0]` |
| SN-09 | 零位移 | `snapToAxis([0,0,0], [0,0,0], 8)` | `[0, 0, 0]` |

### 2.4 recalculateNodeShapes (`src/store/useSceneStore.test.ts` 中)

| # | 测试用例 | 场景 | 期望 shape |
|---|---------|------|-----------|
| RS-01 | 单边 | 1 条边连接 | `'STRAIGHT'` |
| RS-02 | 两正交 | X + Y 管共享节点 | `'L'` |
| RS-03 | 两反向 | X+ 和 X- 管共享节点 | `'STRAIGHT'` |
| RS-04 | T 形 | 3 边，其中 2 条反向 | `'T'` |
| RS-05 | 3WAY | 3 边，无反向对 | `'3WAY'` |
| RS-06 | 4WAY | 4 边 | `'4WAY'` |
| RS-07 | 5WAY | 5 边 | `'5WAY'` |
| RS-08 | 6WAY | 6 边 | `'6WAY'` |

### 2.5 SlotEnumerator (`src/core/engine/SlotEnumerator.test.ts`)

| # | 测试用例 | 场景 | 期望 |
|---|---------|------|------|
| SE-01 | 空 edges | edges={} | `[]` |
| SE-02 | 矩形框架 | 4 条边围成 8x8 框 | 1 个 slot |
| SE-03 | 非正方形双旋转 | targetSize=[8,4] | 两个方向都尝试 |
| SE-04 | 已占用面板排除 | 已有 panel 占位 | 对应 slot 不出现 |
| SE-05 | 管不够长 | 边长 < 面板尺寸 | `[]` |
| SE-06 | 去重 | 相同 slotId 多次命中 | 只出现 1 次 |

---

## 三、P0 Store 测试

### 3.1 useSceneStore (`src/store/useSceneStore.test.ts`)

| # | 测试用例 | 操作 | 断言 |
|---|---------|------|------|
| SS-01 | placePipe 创建节点+边 | `placePipe([0,0,0],[400,0,0],8)` | nodes=2, edges=1 |
| SS-02 | placePipe 幂等 | 放两次同一条边 | edges=1 |
| SS-03 | placePipe 颜色分配 | 连接边用过的颜色不重选 | chosenColor 正确 |
| SS-04 | removePipe 删除边+孤立节点 | 放一条管再删 | nodes=0, edges=0 |
| SS-05 | removePipe 保留共享节点 | 两条正交管，删一条 | 共享节点仍在 |
| SS-06 | removePipe 不存在的 ID | `removePipe('fake')` | 不抛错，状态不变 |
| SS-07 | placePanel 添加 | `placePanel([0,0,0],[8,8],'y')` | panels=1 |
| SS-08 | placePanel 幂等 | 放两次同位置 | panels=1 |
| SS-09 | removePanel 删除 | 放一个面板再删 | panels=0 |
| SS-10 | undo 恢复快照 | 放管 -> undo | edges=0 |
| SS-11 | redo 重做 | 放管 -> undo -> redo | edges=1 |
| SS-12 | undo 空栈不抛错 | 直接 undo | `not.toThrow()` |
| SS-13 | 新操作清空 redo 栈 | 放管->undo->放管 | redoStack=[] |
| SS-14 | clearScene 清空所有 | 放管->clear | nodes/edges/panels 全空, tool=NONE |
| SS-15 | clearScene 可 undo | 放管->clear->undo | 管恢复 |
| SS-16 | loadScene 覆盖状态 | loadScene(n,e,p) | 状态完全替换, undo/redo 清空 |
| SS-17 | undo 上限 50 | 连续 51 次操作->undo | undoStack 长度 <= 50 |

### 3.2 useInventoryStore (`src/store/useInventoryStore.test.ts`)

| # | 测试用例 | 操作 | 断言 |
|---|---------|------|------|
| IS-01 | setStock 更新 | `setStock('8', 10)` | stock['8']=10 |
| IS-02 | setStock 负值 clamp | `setStock('8', -5)` | stock['8']=0 |
| IS-03 | setPrice 更新 | `setPrice('L', 5.0)` | price['L']=5.0 |
| IS-04 | setPrice 负值 clamp | `setPrice('L', -1)` | price['L']=0 |

### 3.3 computeUsedCounts (`src/store/useInventoryStore.test.ts`)

| # | 测试用例 | 场景 | 断言 |
|---|---------|------|------|
| CU-01 | 按长度统计管 | 2xlen=8, 1xlen=6 | counts['8']=2, counts['6']=1 |
| CU-02 | 按 shape 统计连接器 | 1xL, 1xT, 1xUNKNOWN | L=1, T=1, UNKNOWN 跳过 |
| CU-03 | 按尺寸统计面板 | 1x[8,8], 1x[8,4] | PANEL_8x8=1, PANEL_8x4=1 |
| CU-04 | 全空场景 | nodes/edges/panels 全空 | 所有 counts=0 |
| CU-05 | 非 [8,8] 面板归入 8x4 | [6,4] 面板 | counts['PANEL_8x4']=1 |

---

## 四、P0 集成测试 -- useStageInteraction

### 4.1 findSlotByRaycast

| # | 测试用例 | 场景 | 期望 |
|---|---------|------|------|
| FS-01 | 正面命中 YZ 平面 | ray 沿 X 轴 -> axis=x slot | index=0 |
| FS-02 | 平行射线跳过 | ray 沿 Y -> axis=x slot | -1 |
| FS-03 | 命中点在槽位外 | 射线穿过平面但超出槽位边界 | -1 |
| FS-04 | 空槽位 | slots=[] | -1 |
| FS-05 | 负 t 值跳过 | 起点在平面正方向 | -1 |
| FS-06 | 多槽位取最近 | 两个不同距离的 slot | 返回较近的 |
| FS-07 | 三轴分别命中 | x/y/z 三个 slot | 各轴射线命中对应 slot |

### 4.2 isActuallyClick（3px 阈值）

| # | 场景 | 期望 |
|---|------|------|
| IC-01 | 同一点 (距离=0) | `true` |
| IC-02 | 偏移 2px | `true` |
| IC-03 | 偏移 3px | `false` |
| IC-04 | 对角 sqrt(2) | `true` |

### 4.3 handleClick FSM 状态转换

| # | 状态 | 场景 | 期望 |
|---|------|------|------|
| HC-01 | 无起点 + 有效 currentPoint | 点击 | startPoint 被设置 |
| HC-02 | 无起点 + currentPoint=null | 点击 | startPoint 保持 null |
| HC-03 | 无起点 + isStartHoverError | 点击 | 不设置起点 |
| HC-04 | 有起点 | 第二次点击 | 状态不变（由父组件处理） |
| HC-05 | 拖拽距离 >= 3px | 点击 | 不触发 |
| HC-06 | selectedTool=NONE | 点击 | 忽略 |
| HC-07 | 有选中边/面板 | 点击 | 取消选中 |

### 4.4 键盘快捷键

| # | 按键 | 期望 |
|---|------|------|
| KB-01 | Ctrl+Z | 调用 undo |
| KB-02 | Ctrl+Shift+Z | 调用 redo |
| KB-03 | Ctrl+Y | 调用 redo |
| KB-04 | Cmd+Z (macOS) | 调用 undo |
| KB-05 | Delete + 选中边 | removePipe + 清空选中 |
| KB-06 | Backspace + 选中面板 | removePanel + 清空选中 |
| KB-07 | Delete 无选中 | 不调用 remove |

---

## 五、P1 组件测试（React Testing Library）

### 5.1 Inventory (`src/components/ui/Inventory.test.tsx`)

| # | 测试用例 | 断言 |
|---|---------|------|
| INV-01 | 需求 <= 库存 -> 全在覆盖区 | 文案正确 |
| INV-02 | 需求 > 库存 -> 差额在超出区带价格 | "x3 @15.00 = 45.00" |
| INV-03 | 库存为 0 -> 全进超出区 | 覆盖区不显示 |
| INV-04 | 需求为 0 的物料不显示 | 行不出现 |
| INV-05 | UNKNOWN shape 跳过 | BOM 无 UNKNOWN 行 |
| INV-06 | 折叠/展开切换 | 点击按钮切换状态 |
| INV-07 | 空场景显示 empty 提示 | 文案出现 |

### 5.2 ProjectManager (`src/components/ui/ProjectManager.test.tsx`)

| # | 测试用例 | 断言 |
|---|---------|------|
| PM-01 | 保存新项目 | 出现在列表 |
| PM-02 | 空名称禁用保存 | 按钮 disabled |
| PM-03 | 覆盖已有项目 | DB data 更新 |
| PM-04 | 加载项目 | loadScene 被调用 |
| PM-05 | 删除项目 (confirm=true) | 项目消失 |
| PM-06 | 删除项目 (confirm=false) | 项目仍在 |
| PM-07 | 清空场景 | clearScene 被调用 |
| PM-08 | 空状态 | empty 文案显示 |

### 5.3 Sidebar (`src/components/ui/Sidebar.test.tsx`)

| # | 测试用例 | 断言 |
|---|---------|------|
| SB-01 | 渲染 5 个 radio | `getAllByRole('radio').length === 5` |
| SB-02 | 初始无选中 | 无 aria-checked=true |
| SB-03 | 点击工具切换 | selectedTool 正确 |
| SB-04 | 无节点尺寸显示 | "0 x 0 cm" |
| SB-05 | 有节点尺寸计算 | 数值正确 |
| SB-06 | 弹窗切换 | ProjectManager / InventorySettings 显示 |

### 5.4 PriceTag (`src/components/ui/PriceTag.test.tsx`)

| # | 测试用例 | 断言 |
|---|---------|------|
| PT-01 | 需求 <= 库存 | 不渲染 |
| PT-02 | 需求 > 库存 | 渲染超出金额 |
| PT-03 | 多品类累加 | 总价正确 |
| PT-04 | 场景为空 | 不渲染 |
| PT-05 | 货币格式 | 两位小数 |

---

## 六、P2 补充测试（~17 个）

- CoordinateUtils 浮点精度边界（`toLogic(24.9999999)`）
- CollisionUtils 对角线段（非 axis-aligned 的退化情况）
- SlotEnumerator 容差 `+0.01` 边界
- recalculateNodeShapes 零边节点 -> UNKNOWN
- Inventory 折叠后徽标数字正确性
- ProjectManager Portal 渲染到 body

---

## 七、关键发现与注意事项

1. **Math.random 依赖**：`placePipe`(L176) 和 `placePanel`(L198) 使用 `Math.random()` 分配颜色，测试必须 mock
2. **snapToAxis 零位移**：`dx=dy=dz=0` 时 `Math.sign(0)=0`，返回原点而非延伸 -- SA-08 边界行为
3. **computeUsedCounts 面板泛化**：L56 `else counts['PANEL_8x4']+=1` 将所有非 [8,8] 面板归入 8x4
4. **recalculateNodeShapes** 是关键纯函数，6 种 shape 推导逻辑必须每种覆盖
5. **Dexie 测试**：使用 `fake-indexeddb` 自动 polyfill，`beforeEach` 中 `db.projects.clear()` 清理

---

## 八、实施顺序

| 阶段 | 内容 | 预计用例 |
|------|------|---------|
| Step 1 | 安装 Vitest + 配置 + setup + factories | -- |
| Step 2 | P0 纯函数：CoordinateUtils -> Snapping -> CollisionUtils | ~30 |
| Step 3 | P0 Store：useSceneStore + useInventoryStore + computeUsedCounts | ~25 |
| Step 4 | P0 引擎：recalculateNodeShapes + SlotEnumerator | ~14 |
| Step 5 | P0 交互：findSlotByRaycast + handleClick FSM + 键盘快捷键 | ~25 |
| Step 6 | P1 组件：Inventory + ProjectManager + Sidebar + PriceTag | ~40 |
| Step 7 | P2 补充 | ~17 |

---

## 九、验证方式

```bash
# 运行所有测试
npx vitest run

# 带覆盖率
npx vitest run --coverage

# 监听模式开发
npx vitest watch

# 只跑纯函数测试
npx vitest run src/core
```

全部 P0 用例通过后即可视为测试基础设施就绪，可进入 CI 集成。
