import { create } from 'zustand';

export type ConnectorShape = '3WAY' | '4WAY' | '5WAY' | '6WAY' | 'L' | 'T' | 'STRAIGHT' | 'UNKNOWN';

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
}

interface SceneState {
  nodes: Record<string, NodeInstance>;
  edges: Record<string, EdgeInstance>;
  
  addPart: (type: 'PIPE' | 'CONN', position: [number, number, number]) => void;
}

export const useSceneStore = create<SceneState>((_set) => ({
  nodes: {},
  edges: {},
  
  addPart: (type, position) => {
    console.log('TODO: implement addPart', type, position);
  }
}));
