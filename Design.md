# climb-craft 项目设计文档 (v1.0)

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

---

## 3. 技术栈 (Technical Stack)
| 层级         | 选型                     | 说明                                            |
| :----------- | :----------------------- | :---------------------------------------------- |
| **基础框架** | **Next.js 15**           | App Router 架构，支持 PWA 离线运行。            |
| **3D 渲染**  | **React Three Fiber**    | Three.js 的声明式封装，负责场景管理。           |
| **状态管理** | **Zustand**              | 响应式存储场景树（Nodes & Edges）及选中的状态。 |
| **几何计算** | **Three-mesh-bvh**       | 用于高频的射线碰撞检测（吸附逻辑核心）。        |
| **本地存储** | **Dexie.js**             | 封装 IndexedDB，支持浏览器端百万级数据存储。    |
| **UI 组件**  | **shadcn/ui + Tailwind** | 构建 2D 侧边栏零件库与统计面板。                |

---

## 4. 工程目录结构
```text
climb-craft/
├── src/
│   ├── core/                # 【逻辑层】纯 TS 编写，不依赖 UI
│   │   ├── utils/           # CoordinateUtils.ts (坐标转换)
│   │   ├── engine/          # Snapping.ts (吸附逻辑), Collision.ts (碰撞)
│   │   └── constants.ts     # 零件元数据、LU 尺寸定义
│   ├── store/               # 【状态层】Zustand Stores
│   │   └── useSceneStore.ts # 核心场景树（Nodes: 连接件, Edges: 管子）
│   ├── components/          # 【视图层】React 组件
│   │   ├── canvas/          # 3D 渲染组件 (Stage, Pipe, Connector)
│   │   └── ui/              # 2D 面板 (Sidebar, Inventory, PriceTag)
│   └── db/                  # 【持久化】Dexie 配置
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
  nodes: Record<string, NodeInstance>; // 连接件数据
  edges: Record<string, EdgeInstance>; // 管子数据
  
  // 动作：添加零件
  addPart: (type: 'PIPE' | 'CONN', position: [number, number, number]) => void;
  // 动作：实时物料统计
  getBOM: () => Array<{ name: string, count: number, price: number }>;
}
```

## 6. 核心功能 Roadmap

### Phase 1: 核心引擎 (MVP)
- [ ] 基础 3D 舞台与网格参考线。
- [ ] 50mm 整数倍强制吸附逻辑。
- [ ] 管子与连接件的“影子预览”放置功能。

### Phase 2: 物料与管理
- [ ] 侧边栏零件库（拖拽或点击放置）。
- [ ] 实时价格面板（根据当前设计稿自动计算总价）。
- [ ] 本地设计稿保存与重载  。

### Phase 3: 体验与导出
- [ ] 自动补全功能（在两个连接件间点击自动生成管子）。
- [ ] 生成 PDF 规格说明书与清单。
- [ ] 导出 GLB 模型（用于在其他 3D 软件渲染）。

