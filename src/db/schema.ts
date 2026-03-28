import Dexie, { type EntityTable } from 'dexie';

interface Project {
  id?: number;
  name: string;
  data: Record<string, unknown>; // 暂存 JSON 快照
  updatedAt: number;
}

const db = new Dexie('ClimbCraftDB') as Dexie & {
  projects: EntityTable<Project, 'id'>;
};

db.version(1).stores({
  projects: '++id, name, updatedAt'
});

export type { Project };
export { db };
