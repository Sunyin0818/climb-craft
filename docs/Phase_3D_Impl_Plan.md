# 核心引擎 3D 绘制模块设计方案

我们将全面切入 `Design.md` 的 Phase 1，开始基于 React Three Fiber 构建 3D 鼠标射线检测、50mm 网格强制吸附以及连杆自动生成节点的引擎交互逻辑。

## Goal (设计目标)
1. **全自动连通器生成网**：用户不再手工放置接头，而是从侧边栏选择不同长度的连杆（管子）后，在 `Stage` 中点击定点放线。引擎自动在两端推断并生成需要的连接件。
2. **50mm 网格强制吸附定位系统**：使用 `Grid` 和透明的碰撞平面接收射线碰撞（Raycasting），计算出最接近的逻辑倍数点位。
3. **连线预览交互体验**：当用户选定工具并在三维网格下移动鼠标时，展示对应的绿色（合法）或红色（非法）半透明幻影预览模型。

## User Review Required
> [!IMPORTANT]
> 针对交互操作的逻辑细节：
> - **第一下点击**：决定起点位置，立刻吸附最近的 `LU` (50mm)。
> - **滑动鼠标**：实时计算起点到鼠标当前悬停点的位移，**将其强制约束到 X、Y、Z 中偏移最大的主要轴上**（因为 `Design` 规定只能是 90 度连接），并强制作长度补齐（只能是 4 LU, 6 LU 或 8 LU）。
> - **第二下点击**：在预览合法时放置管道（Edge）和两端的接头（Nodes）。
> 
> 请问您是否赞成这种“两点制绘制交互设计（Two-Clicks Placement）”？

## Proposed Changes

### 1. 状态增加选定工具 (`src/store/useSceneStore.ts`)
#### [MODIFY] `src/store/useSceneStore.ts`
添加当前选定的活跃绘制工具（如长管/中管/短管），以及核心的 `placePipe(start: [number, number, number], end: [number, number, number], type: string)` 行动方法：
- 该行动需要在起始点自动建立/查找 `Node`（连接件）
- 建立 `Edge`（管子）。
- **执行接头形状重算引擎**：查找此节点附着的所有 `Edge` 的方向，推断并更新该 `Node` 的表现形状（如 L 通、T 通、一字通）。

### 2. 实现核心网格吸附器 (`src/core/engine/Snapping.ts`)
#### [MODIFY] `src/core/engine/Snapping.ts`
扩充现有的骨架。利用场景全局平面产生的 `PointerEvent` 中的 `point`（即空间确切被射线击中的三维向量），将其转换为逻辑上最近的以 50mm 为步长的吸附点。若正在绘制连杆第二点，还将附加长度与轴向强制吸附（Axis-Locking）算法。

### 3. 三维互动层与渲染舞台 (`src/components/canvas/Stage.tsx`)
#### [MODIFY] `src/components/canvas/Stage.tsx`
加入 `onPointerMove` 和 `onClick` 接口，将一个透明、占据巨大覆盖面积的不可见 `<mesh>` 作为鼠标事件拦截器床（Raycast Target）。
利用状态机分情况渲染出正在被鼠标移动拖拽的“动态半透明线管阴影”给用户所见即所得的反馈。

### 4. 连接件与管子的数据驱动渲染
#### [MODIFY] `src/components/canvas/Pipe.tsx` & `Connector.tsx`
结合 `useSceneStore` 中的数据，遍历渲染所有的 `nodes` 为方块连接件（目前暂代物理模型），所有 `edges` 渲染为圆环收缩管子。

## Open Questions
> [!WARNING]
> 为了实现良好的三维画图体验，初始方案我们将在 X-Z 平面（即地面）放置一个不可见平铺网格接收鼠标点击。如果想要“长高”（向 Y 轴方向画），我们通常需要用户鼠标吸附到已放置的连接件表面去作为起点，再向法线拉伸。
> 初期 MVP 我先保证地面（二维平面高度 `Y=0`）的网格铺设以及现有节点的连接操作，后续是否需要增加专门的高程操作升降控制手柄？

## Verification Plan
1. 点击左侧工具栏选中【长管 8 LU】。
2. 鼠标移动到网格上，能看见起点高亮的方块，每次跳变距离是 50 毫米。
3. 点击，随便朝一侧划动，出现只允许在正交坐标系（X/Z轴）伸出一段长管阴影的效果。
4. 再次点击，舞台中固定出新管子，两头出现接头。
5. 去看右侧 BOM 面板，将增加物料清单以及价格总计。
