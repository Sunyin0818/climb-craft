# climb-craft

**climb-craft** 是一款专为儿童室内攀爬架（基于 Quadro 兼容系统）设计的 3D 建模与物料管理工具。它通过严谨的几何网格逻辑（LU），帮助用户快速生成安全、合规的设计方案及采购清单。

---

## 🛠 开发环境初始化 (Environment Setup)

本项目依赖 Node.js 和 npm。

### 1. 安装依赖
在项目根目录下运行：

```bash
npm install
```

### 2. 启动开发服务器
```bash
npm run dev
```

启动后，访问 [http://localhost:3000](http://localhost:3000) 查看实时预览。

---

## 📐 核心物理与几何规范

*   **1 LU (Logical Unit) = 50mm**。
*   **350mm 管子** = 8 LU (400mm 中心距)。
*   **150mm 管子** = 4 LU (200mm 中心距)。
*   **坐标约束**：所有零件坐标必须为 LU 的整数倍，仅支持 90° 旋转。

---

## 🚀 技术栈 (Technical Stack)

*   **框架**：Next.js 15+ (App Router)
*   **3D 渲染**：React Three Fiber (R3F)
*   **状态管理**：Zustand
*   **碰撞检测**：Three-mesh-bvh
*   **UI 组件**：shadcn/ui + Tailwind CSS

---

## 📄 参考文档
*   [Design.md](./Design.md) - 详细设计文档与路线图。
*   [AGENTS.md](./AGENTS.md) - AI 代理协作准则（包含 Next.js 版本的特殊说明）。
