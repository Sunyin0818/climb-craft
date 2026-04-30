import { create } from 'zustand';
import { CoordinateUtils } from '@/core/utils/CoordinateUtils';

export type ConnectorShape = '3WAY' | '4WAY' | '5WAY' | '6WAY' | 'L' | 'T' | 'STRAIGHT' | 'UNKNOWN';
export type SelectedTool = 'NONE' | 'PIPE_LONG' | 'PIPE_MEDIUM' | 'PIPE_SHORT' | 'PANEL_LARGE' | 'PANEL_SMALL';


export interface NodeInstance {
  id: string; // 逻辑坐标组合 "x,y,z"
  position: [number, number, number];
  type: 'CONN';
  shape?: ConnectorShape; // 预留设计：未来由相连的管线自动推导，不依赖用户拖拽
}

export interface EdgeInstance {
  id: string; // 由两个 NodeInstance 的 id 组合
  start: string;
  end: string;
  type: 'PIPE';
  length: number; // 实际需要的连杆长度（例如 350mm / 150mm 等）
  color?: string; // 拼接时选用的颜色
}

export interface PanelInstance {
  id: string; // 坐标与轴向标识
  position: [number, number, number]; // 最小逻辑坐标 [minX, minY, minZ]
  size: [number, number]; // [8, 8] 或 [8, 4]
  axis: 'x' | 'y' | 'z'; // 法线轴：x意味着是在 YZ 平面，y意味着是在 XZ 平面，z意味着是在 XY 平面
  color: string;
}

type SceneSnapshot = {
  nodes: Record<string, NodeInstance>;
  edges: Record<string, EdgeInstance>;
  panels: Record<string, PanelInstance>;
};

const MAX_UNDO = 50;

interface SceneState {
  nodes: Record<string, NodeInstance>;
  edges: Record<string, EdgeInstance>;
  panels: Record<string, PanelInstance>;

  selectedTool: SelectedTool;
  setSelectedTool: (tool: SelectedTool) => void;

  placePipe: (start: [number, number, number], end: [number, number, number], length: number) => void;
  removePipe: (edgeId: string) => void;

  placePanel: (position: [number, number, number], size: [number, number], axis: 'x' | 'y' | 'z') => string;
  removePanel: (panelId: string) => void;

  loadScene: (nodes: Record<string, NodeInstance>, edges: Record<string, EdgeInstance>, panels?: Record<string, PanelInstance>) => void;
  clearScene: () => void;

  undoStack: SceneSnapshot[];
  redoStack: SceneSnapshot[];
  pushUndo: () => void;
  undo: () => void;
  redo: () => void;
}

export const recalculateNodeShapes = (nodes: Record<string, NodeInstance>, edges: Record<string, EdgeInstance>) => {
  const newNodes = { ...nodes };
  
  Object.keys(newNodes).forEach(nodeId => {
    const node = newNodes[nodeId];
    // 找出所有连接到此节点 Edge
    const connectedEdges = Object.values(edges).filter(e => e.start === nodeId || e.end === nodeId);
    const count = connectedEdges.length;
    
    // 提取所有出射归一化向量
    const D: [number, number, number][] = connectedEdges.map(e => {
      const isStart = e.start === nodeId;
      const otherId = isStart ? e.end : e.start;
      const otherNode = newNodes[otherId] || { position: otherId.split(',').map(Number) };
      
      const dx = otherNode.position[0] - node.position[0];
      const dy = otherNode.position[1] - node.position[1];
      const dz = otherNode.position[2] - node.position[2];
      const len = Math.sqrt(dx*dx + dy*dy + dz*dz) || 1;
      return [Math.round(dx/len), Math.round(dy/len), Math.round(dz/len)] as [number, number, number];
    });

    // 判断两个向量是否互为反义（共线）
    const isOpposite = (v1: number[], v2: number[]) => v1[0] === -v2[0] && v1[1] === -v2[1] && v1[2] === -v2[2];

    let shape: ConnectorShape = 'UNKNOWN';
    if (count === 1) {
      shape = 'STRAIGHT'; // 单管默认插在一字通
    } else if (count === 2) {
      if (isOpposite(D[0], D[1])) shape = 'STRAIGHT'; // 180度直线对穿
      else shape = 'L'; // 90度直角
    } else if (count === 3) {
      // 检查里面是否有任意两个是180度共线的
      const hasLine = isOpposite(D[0], D[1]) || isOpposite(D[0], D[2]) || isOpposite(D[1], D[2]);
      if (hasLine) shape = 'T'; // 平面 T字形
      else shape = '3WAY'; // 空间直角三面三通
    }
    else if (count === 4) shape = '4WAY';
    else if (count === 5) shape = '5WAY';
    else if (count === 6) shape = '6WAY';
    
    newNodes[nodeId] = { ...node, shape };
  });
  
  return newNodes;
};

export const useSceneStore = create<SceneState>((set, get) => ({
  nodes: {},
  edges: {},
  panels: {},
  selectedTool: 'NONE',

  setSelectedTool: (tool) => set({ selectedTool: tool }),

  undoStack: [],
  redoStack: [],

  pushUndo: () => {
    const { nodes, edges, panels, undoStack } = get();
    const snapshot: SceneSnapshot = { nodes, edges, panels };
    const newStack = [...undoStack, snapshot];
    if (newStack.length > MAX_UNDO) newStack.shift();
    set({ undoStack: newStack, redoStack: [] });
  },

  undo: () => {
    const { undoStack, redoStack, nodes, edges, panels } = get();
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    const current: SceneSnapshot = { nodes, edges, panels };
    set({
      undoStack: undoStack.slice(0, -1),
      redoStack: [...redoStack, current],
      ...prev,
    });
  },

  redo: () => {
    const { undoStack, redoStack, nodes, edges, panels } = get();
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    const current: SceneSnapshot = { nodes, edges, panels };
    set({
      redoStack: redoStack.slice(0, -1),
      undoStack: [...undoStack, current],
      ...next,
    });
  },

  placePipe: (start, end, length) => {
    get().pushUndo();
    set((state) => {
    const startId = start.join(',');
    const endId = end.join(',');
    const edgeId = CoordinateUtils.getEdgeKey(start, end);
    
    // 如果边已存在，不重复添加
    if (state.edges[edgeId]) return state;
    
    const newNodes = { ...state.nodes };
    if (!newNodes[startId]) newNodes[startId] = { id: startId, position: start, type: 'CONN', shape: 'UNKNOWN' };
    if (!newNodes[endId]) newNodes[endId] = { id: endId, position: end, type: 'CONN', shape: 'UNKNOWN' };
    
    // 获取相连管子的颜色，避免重复
    const connectedEdges = Object.values(state.edges).filter(e => 
      e.start === startId || e.end === startId || e.start === endId || e.end === endId
    );
    const usedColors = new Set(connectedEdges.map(e => e.color).filter(Boolean));
    const availableColors = ['#ef4444', '#eab308', '#3b82f6', '#22c55e']; // 红、黄、蓝、绿
    let chosenColor = availableColors.find(c => !usedColors.has(c));
    if (!chosenColor) {
      chosenColor = availableColors[Math.floor(Math.random() * availableColors.length)];
    }

    const newEdges: Record<string, EdgeInstance> = {
      ...state.edges,
      [edgeId]: { id: edgeId, start: startId, end: endId, type: 'PIPE', length, color: chosenColor }
    };
    
    return {
      nodes: recalculateNodeShapes(newNodes, newEdges),
      edges: newEdges
    };
  });
  },

  placePanel: (position, size, axis) => {
    const panelId = `panel--${position.join(',')}-${axis}-${size.join(',')}`;
    get().pushUndo();
    set((state) => {
      if (state.panels[panelId]) return state;

      const availableColors = ['#ef4444', '#eab308', '#3b82f6', '#22c55e'];
      const chosenColor = availableColors[Math.floor(Math.random() * availableColors.length)];

      return {
        panels: {
          ...state.panels,
          [panelId]: { id: panelId, position, size, axis, color: chosenColor }
        }
      };
    });
    return panelId;
  },

  removePanel: (panelId) => {
    get().pushUndo();
    set((state) => {
      const newPanels = { ...state.panels };
      delete newPanels[panelId];
      return { panels: newPanels };
    });
  },

  removePipe: (edgeId) => {
    get().pushUndo();
    set((state) => {
      if (!state.edges[edgeId]) return state;

      const edge = state.edges[edgeId];
      const newEdges = { ...state.edges };
      delete newEdges[edgeId];

      const newNodes = { ...state.nodes };

      // 如果起点被孤立（无其他边连结），则安全消灭此节点
      const startOrphan = !Object.values(newEdges).some(e => e.start === edge.start || e.end === edge.start);
      if (startOrphan) delete newNodes[edge.start];

      // 如果终点被孤立，同理消灭此节点
      const endOrphan = !Object.values(newEdges).some(e => e.start === edge.end || e.end === edge.end);
      if (endOrphan) delete newNodes[edge.end];

      return {
        nodes: recalculateNodeShapes(newNodes, newEdges),
        edges: newEdges
      };
    });
  },

  loadScene: (nodes, edges, panels) => set({ nodes, edges, panels: panels || {}, undoStack: [], redoStack: [] }),

  clearScene: () => {
    get().pushUndo();
    set({ nodes: {}, edges: {}, panels: {}, selectedTool: 'NONE' });
  }
}));
