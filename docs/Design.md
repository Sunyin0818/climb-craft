# climb-craft 项目设计文档 (v1.1)

## 1. 项目愿景 (Project Vision)
**climb-craft** 是一款专为儿童室内攀爬架（基于 Quadro 兼容系统）设计的 3D 建模与物料管理工具。它通过严谨的几何网格逻辑，将复杂的物理组装过程数字化，帮助用户快速生成安全、合规的设计方案及采购清单。

---

## 2. 核心物理与几何规范
为了确保“所见即所得”，软件内部遵循以下数学逻辑：

### 2.1 逻辑单位 (Logical Unit - LU)
* **1 LU = 50mm** (连接件的基础边长)。
* **中心距 (C2C) 优先：** 所有的定位和距离计算均基于零件中心点。
* **标准跨度定义：**
    * **350mm 管子：** 逻辑跨度为 **8 LU** (即 400mm C2C)。
    * **150mm 管子：** 逻辑跨度为 **4 LU** (即 200mm C2C)。
* **模型渲染缩进：** 连接件插槽深度为 **0.5 LU** (25mm)。管子模型在渲染时，两端需向内各缩进 25mm。

### 2.2 坐标系统
* **整数网格：** 所有零件的坐标点 $(x, y, z)$ 必须为 $LU$ 的整数倍。
* **对齐约束：** 仅支持 90° 旋转（初始版本），确保所有管子与连接件处于标准笛卡尔坐标系平面内。
* **物理防呆：** 系统会自动拦截不在轴线上、长度不匹配、或存在物理碰撞的连线操作，并触发实时 UI 提示。


---

## 3. 技术栈 (Technical Stack)
| 层级         | 选型                     | 说明                                            |
| :----------- | :----------------------- | :---------------------------------------------- |
| **基础框架** | **Next.js 15**           | App Router 架构，支持 PWA 离线运行。            |
| **3D 渲染**  | **React Three Fiber**    | Three.js 的声明式封装，负责场景管理。           |
| **状态管理** | **Zustand**              | 响应式存储场景树（Nodes & Edges）及选中的状态。 |
| **几何计算** | **自研碰撞检测**         | CollisionUtils.ts 实现线段碰撞检测（取代 three-mesh-bvh）。 |
| **本地存储** | **Dexie.js**             | 封装 IndexedDB，支持浏览器端百万级数据存储。    |
| **UI 组件**  | **shadcn/ui + Tailwind** | 构建 2D 侧边栏零件库与统计面板。                |

---

## 4. 视觉与交互设计

### 4.1 四色防重系统
为了增加辨识度并辅助物理搭建，管子在拼接时会自动分配颜色：
* **色彩池：** 红 (`#ef4444`)、黄 (`#eab308`)、蓝 (`#3b82f6`)、绿 (`#22c55e`)。
* **分配逻辑：** 优先选取与相连管子不冲突的颜色。如遇极端复杂节点（连接数 > 4），则随机抽取。

### 4.2 UI/UX 优化
* **防干扰交互：**
    * 旋转视角（Orbit）时自动屏蔽点击判定，位移阈值设为 3 像素。
    * 起点锁定：已设定起点后，地平面的任意点击被忽略，必须点击”十字引导轴”或”连接节点”方可完成闭环。
* **选择/视角工具：** 侧边栏顶部新增”选择/视角”（Select / Orbit）工具卡。激活时（`selectedTool='NONE'`）允许正常的轨道旋转与点选操作，不触发任何放置逻辑。
* **可折叠物料面板：** Inventory 面板支持折叠/展开。折叠状态下显示一个精简的 “BOM” 标签页及物品计数徽章，释放约 360px 画布空间。
* **反馈系统：** 采用轻量化 Toast 浮层（`role=”alert” aria-live=”polite”`），实时反馈连接失败的具体原因（如：错层、跨度不均、碰撞）。
* **物理尺寸实时统计：** 在界面的合适位置（如侧边统计面板上方）实时计算并展示当前模型的**整体高度**与**占地面积**，让用户直观掌控其实际占据的物理空间大小。
* **无障碍访问（Accessibility）：**
    * 工具卡使用 `<button role=”radio” aria-checked>` 替代 `<div onClick>`，带焦点环。
    * 工具组包裹在 `<div role=”radiogroup”>` 中。
    * 所有图标按钮添加 `aria-label`（ProjectManager、InventorySettings、删除按钮、居中视角、折叠切换等）。
    * 低对比度文字颜色从 `text-white/40` 调整为 `text-white/50` 以满足 WCAG AA 标准。
* **真实尺寸描述：** 零件库中的描述已替换为真实物理尺寸（如”适合 350mm 长管”取代”逻辑跨度 8 LU”、”40x40cm 大面板”取代”逻辑尺寸 8x8 LU”），降低用户理解门槛。
* **完整国际化覆盖：** Toast 消息、按钮标签、项目管理器字符串、库存设置字符串等全部使用 `t.xxx` 国际化键值，无硬编码中文。
* **WebGL 容错：** `WebGLFallback` 检测 WebGL 支持情况，不支持时显示友好降级 UI；`CanvasErrorBoundary` 捕获 Canvas 渲染异常并展示重试提示。


---

## 4. 工程目录结构
```text
climb-craft/
├── src/
│   ├── core/                     # 【逻辑层】纯 TS 编写，不依赖 UI
│   │   ├── utils/                # CoordinateUtils.ts (坐标转换)
│   │   ├── engine/               # Snapping.ts (吸附逻辑), CollisionUtils.ts (碰撞检测)
│   │   ├── i18n/                 # dict.ts (中英双语词典)
│   │   └── constants.ts          # 零件元数据、LU 尺寸定义
│   ├── store/                    # 【状态层】Zustand Stores
│   │   ├── useSceneStore.ts      # 核心场景树（Nodes, Edges, Panels）+ Undo/Redo
│   │   ├── useInventoryStore.ts  # 库存与价格配置
│   │   └── useLocaleStore.ts     # 语言切换
│   ├── components/               # 【视图层】React 组件
│   │   ├── canvas/               # 3D 渲染组件
│   │   │   ├── Stage.tsx         # 场景组合（Canvas, Grid, InstancedMesh, OrbitControls）
│   │   │   ├── StageDynamic.tsx  # 动态导入包装
│   │   │   ├── useStageInteraction.ts  # 交互状态与事件处理 Hook
│   │   │   ├── AxisCrosshair.tsx      # 轴向十字引导线
│   │   │   ├── WebGLFallback.tsx      # WebGL 检测与降级 UI
│   │   │   ├── CanvasErrorBoundary.tsx # Canvas 渲染错误边界
│   │   │   ├── Pipe.tsx               # 单根管子组件
│   │   │   ├── Connector.tsx          # 单个连接件组件
│   │   │   ├── Panel.tsx              # 单块面板组件
│   │   │   ├── InstancedPipes.tsx     # 管子实例化渲染
│   │   │   ├── InstancedConnectors.tsx # 连接件实例化渲染
│   │   │   └── InstancedPanels.tsx    # 面板实例化渲染
│   │   └── ui/                   # 2D 面板
│   │       ├── Sidebar.tsx       # 侧边栏（工具选择、物理尺寸统计）
│   │       ├── Inventory.tsx     # 物料清单（可折叠）
│   │       ├── InventorySettings.tsx # 库存配置与价格设置
│   │       ├── PriceTag.tsx      # 价格标签
│   │       └── ProjectManager.tsx # 项目管理器（保存/加载/删除）
│   └── db/                       # 【持久化】Dexie 配置
│       └── schema.ts
```


## 5. 核心逻辑伪代码

### 5.1 坐标转换器 (CoordinateUtils.ts)
```typescript
export const LU = 50;

export const CoordinateUtils = {
  // 世界坐标 -> 逻辑网格坐标
  toLogic: (v: number) => Math.round(v / LU),
  
  // 逻辑网格坐标 -> 世界坐标 (用于渲染)
  toWorld: (l: number) => l * LU,

  // 生成管子的唯一 ID (确保两点之间只有一根管子)
  getEdgeKey: (p1: number[], p2: number[]) => {
    return [p1.join(','), p2.join(',')].sort().join('--');
  }
};
```

### 5.2 状态管理逻辑 (useSceneStore.ts)
```typescript
interface SceneState {
  nodes: Record<string, NodeInstance>;   // 连接件数据
  edges: Record<string, EdgeInstance>;   // 管子数据
  panels: Record<string, PanelInstance>; // 面板数据

  // 工具选择
  selectedTool: SelectedTool;
  setSelectedTool: (tool: SelectedTool) => void;

  // 动作：添加/删除零件（自动推送 undo 快照）
  placePipe: (start, end, length) => void;
  removePipe: (edgeId) => void;
  placePanel: (position, size, axis) => void;
  removePanel: (panelId) => void;

  // 场景管理
  loadScene: (nodes, edges, panels?) => void; // 加载时清空 undo/redo 栈
  clearScene: () => void;

  // Undo/Redo 系统（栈上限 50 条）
  undoStack: SceneSnapshot[];
  redoStack: SceneSnapshot[];
  pushUndo: () => void;
  undo: () => void;
  redo: () => void;
}
```

### 5.3 Undo/Redo 系统
所有场景变更操作（`placePipe`、`removePipe`、`placePanel`、`removePanel`、`clearScene`）在执行前自动调用 `pushUndo()`，将当前 `{ nodes, edges, panels }` 快照压入 `undoStack`（上限 50 条，溢出时丢弃最早的快照），同时清空 `redoStack`。

* **撤销（Undo）：** `Ctrl+Z` → 从 `undoStack` 弹出栈顶快照，将当前状态压入 `redoStack`，恢复弹出的快照。
* **重做（Redo）：** `Ctrl+Shift+Z` 或 `Ctrl+Y` → 从 `redoStack` 弹出栈顶快照，将当前状态压入 `undoStack`，恢复弹出的快照。
* **加载场景：** `loadScene` 会清空两个栈（因为加载是整体替换，撤销无意义）。

键盘快捷键通过 `useStageInteraction.ts` 中的 `useEffect` 监听 `keydown` 事件绑定。

## 6. 核心功能 Roadmap

### Phase 1: 核心引擎 (MVP)
- [x] 基础 3D 舞台与网格参考线。
- [x] 50mm 整数倍强制吸附逻辑。
- [x] 管子与连接件的“影子预览”放置功能。
- [x] 物料防呆校验与 Toast 提示。

### Phase 2: 物料与管理
- [x] 基于 InstancedMesh 的超大型场景渲染优化。
- [x] 管子自动避重上色系统。
- [x] 侧边栏零件库（拖拽或点击放置）。
- [x] 实时属性计算：自动提取最远边界坐标计算并展示占地面积与高度。
- [x] 实时价格面板（根据当前设计稿自动计算总价）。
- [x] 本地设计稿保存与重载。

### Phase 3: 扩充元件与增强体验
- [x] 自动补全功能（在点击已有连接件或引导轴时自动生成管子）。
- [x] **面板元件扩展**：
    - 类型：40x40cm (8x8 LU) 大板、40x20cm (8x4 LU) 小板。
    - 用途：围挡、承托平台、台阶。
    - 特性：遵循四色随机上色逻辑，与管子系统色彩保持一致。
- [x] **高级物料管理**：支持面板的物料统计与价格计算。
- [x] **Undo/Redo 系统**：支持最多 50 步撤销/重做，键盘快捷键 `Ctrl+Z` / `Ctrl+Shift+Z`。
- [x] **Stage.tsx 重构**：从 645 行精简至 ~295 行，拆分为 `useStageInteraction` Hook、`AxisCrosshair`、`WebGLFallback`、`CanvasErrorBoundary` 等独立模块。
- [x] **UI/UX 增强**：可折叠物料面板、选择/视角工具卡、真实尺寸描述、完整国际化、无障碍访问改进。
- [x] **面板持久化修复**：ProjectManager 现在正确保存/加载 `panels` 数据。
- [ ] **导出与分享**：
    - 生成 PDF 规格说明书与采购清单。
    - 导出 GLB 模型（用于在其他 3D 软件渲染）。
