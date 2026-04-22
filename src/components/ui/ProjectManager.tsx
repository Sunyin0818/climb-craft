'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { db, type Project } from '@/db/schema';
import { useSceneStore } from '@/store/useSceneStore';

interface ProjectManagerProps {
  onClose: () => void;
}

export default function ProjectManager({ onClose }: ProjectManagerProps) {
  const [mounted, setMounted] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [newProjectName, setNewProjectName] = useState('');
  
  const nodes = useSceneStore((state) => state.nodes);
  const edges = useSceneStore((state) => state.edges);
  const loadScene = useSceneStore((state) => state.loadScene);
  const clearScene = useSceneStore((state) => state.clearScene);

  useEffect(() => {
    setMounted(true);
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const all = await db.projects.orderBy('updatedAt').reverse().toArray();
      setProjects(all);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveAsNew = async () => {
    if (!newProjectName.trim()) return;
    await db.projects.add({
      name: newProjectName.trim(),
      data: { nodes, edges },
      updatedAt: Date.now()
    });
    setNewProjectName('');
    fetchProjects();
  };

  const handleUpdate = async (id: number) => {
    await db.projects.update(id, {
      data: { nodes, edges },
      updatedAt: Date.now()
    });
    fetchProjects();
  };

  const handleLoad = (data: any) => {
    if (data && data.nodes && data.edges) {
      loadScene(data.nodes, data.edges);
      onClose();
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('确定要删除该设计草稿吗？')) {
      await db.projects.delete(id);
      fetchProjects();
    }
  };

  const handleClear = () => {
    if (confirm('确定要清空当前场景吗？未保存的进度将丢失。')) {
      clearScene();
      onClose();
    }
  };

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleString('zh-CN', { 
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
    });
  };

  if (!mounted) return null;

  const content = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-neutral-950/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-[#1a1c23] border border-white/10 shadow-2xl rounded-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
          <h2 className="text-xl font-bold text-white tracking-wide">本地设计库</h2>
          <button onClick={onClose} className="p-2 -mr-2 text-white/50 hover:text-white transition-colors rounded-lg hover:bg-white/10">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto overflow-x-hidden space-y-6">
          <div className="flex gap-4">
            <input 
              type="text" 
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="输入新设计稿名称..."
              className="flex-1 min-w-0 bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all font-medium"
            />
            <button 
              onClick={handleSaveAsNew}
              disabled={!newProjectName.trim()}
              className="bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 disabled:hover:bg-cyan-500 text-neutral-950 font-bold px-6 py-3 rounded-xl transition-colors shadow-lg whitespace-nowrap shrink-0"
            >
              保存为新草稿
            </button>
          </div>

          <div className="space-y-3">
            <div className="text-xs uppercase tracking-widest text-white/40 font-semibold mb-2 px-1">历史草稿清单</div>
            {projects.length === 0 ? (
              <div className="text-center py-10 text-white/30 text-sm">
                暂无保存的设计稿
              </div>
            ) : (
              projects.map(p => (
                <div key={p.id} className="group bg-white/5 border border-white/10 hover:border-white/20 p-4 rounded-xl flex items-center justify-between transition-all gap-4">
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-white font-medium text-lg truncate">{p.name}</span>
                    <span className="text-xs text-white/40 mt-1 truncate">最后修改: {formatDate(p.updatedAt)}</span>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button 
                      onClick={() => p.id && handleUpdate(p.id)}
                      title="用当前界面状态覆盖此草稿"
                      className="p-2 text-white/50 hover:text-cyan-300 hover:bg-cyan-500/10 rounded-lg transition-colors border border-transparent hover:border-cyan-500/30"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                      </svg>
                    </button>
                    <button 
                      onClick={() => handleLoad(p.data)}
                      title="载入此草稿"
                      className="p-2 text-white/50 hover:text-emerald-300 hover:bg-emerald-500/10 rounded-lg transition-colors border border-transparent hover:border-emerald-500/30"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                    </button>
                    <button 
                      onClick={() => p.id && handleDelete(p.id)}
                      title="删除此草稿"
                      className="p-2 text-white/50 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors border border-transparent hover:border-red-500/30"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="p-4 border-t border-white/10 bg-white/5 flex justify-center">
          <button 
            onClick={handleClear}
            className="flex items-center gap-2 text-red-400 hover:text-red-300 px-4 py-2 hover:bg-red-500/10 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="text-sm font-bold">清空当前场景</span>
          </button>
        </div>

      </div>
    </div>
  );

  return createPortal(content, document.body);
}
