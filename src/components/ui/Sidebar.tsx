'use client';

import { useLocaleStore } from '@/store/useLocaleStore';
import { useSceneStore, type SelectedTool } from '@/store/useSceneStore';
import clsx from 'clsx';
import { useState, useMemo } from 'react';
import InventorySettings from './InventorySettings';
import ProjectManager from './ProjectManager';
import FeedbackDialog from './FeedbackDialog';
import { logToolChanged } from '@/helpers/actionLog';

const TOOL_LIST: { tool: SelectedTool; group: 'pipe' | 'panel' }[] = [
  { tool: 'PIPE_LONG', group: 'pipe' },
  { tool: 'PIPE_MEDIUM', group: 'pipe' },
  { tool: 'PIPE_SHORT', group: 'pipe' },
  { tool: 'PANEL_LARGE', group: 'panel' },
  { tool: 'PANEL_SMALL', group: 'panel' },
];

export default function Sidebar() {
  const t = useLocaleStore((state) => state.t);
  const selectedTool = useSceneStore((state) => state.selectedTool);
  const setSelectedTool = useSceneStore((state) => state.setSelectedTool);
  const nodes = useSceneStore((state) => state.nodes);
  const [showSettings, setShowSettings] = useState(false);
  const [showProjectManager, setShowProjectManager] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  const { width, depth, height } = useMemo(() => {
    const nodeValues = Object.values(nodes);
    if (nodeValues.length === 0) return { width: 0, depth: 0, height: 0 };
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;
    for (const node of nodeValues) {
      if (node.position[0] < minX) minX = node.position[0];
      if (node.position[0] > maxX) maxX = node.position[0];
      if (node.position[1] < minY) minY = node.position[1];
      if (node.position[1] > maxY) maxY = node.position[1];
      if (node.position[2] < minZ) minZ = node.position[2];
      if (node.position[2] > maxZ) maxZ = node.position[2];
    }
    return {
      width: (maxX - minX) + 50,
      depth: (maxZ - minZ) + 50,
      height: (maxY - minY) + 50
    };
  }, [nodes]);

  const getToolLabel = (tool: SelectedTool) => {
    if (tool === 'PIPE_LONG') return t.sidebar.pipeLong;
    if (tool === 'PIPE_MEDIUM') return t.sidebar.pipeMedium;
    if (tool === 'PIPE_SHORT') return t.sidebar.pipeShort;
    if (tool === 'PANEL_LARGE') return t.sidebar.panelLarge;
    if (tool === 'PANEL_SMALL') return t.sidebar.panelSmall;
    return { name: tool, desc: '' };
  };

  return (
    <div className="absolute top-0 left-0 h-full w-96 bg-white/10 backdrop-blur-md border-r border-white/20 p-6 flex flex-col gap-6 text-white z-10 shadow-2xl">
      <div className="text-2xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-indigo-400 to-cyan-300">
        {t.app.title}
      </div>

      <div className="grid grid-cols-2 gap-3 -mt-2 mb-2">
        <div className="bg-white/5 p-3 rounded-xl border border-white/10 flex flex-col min-w-0">
          <span className="text-[10px] text-white/50 uppercase tracking-wider mb-1 truncate">占地面积 (L×W)</span>
          <span className="text-sm font-bold text-cyan-50 truncate">
            {Object.keys(nodes).length > 0 ? `${(width/10).toFixed(0)} × ${(depth/10).toFixed(0)} cm` : '0 × 0 cm'}
          </span>
        </div>
        <div className="bg-white/5 p-3 rounded-xl border border-white/10 flex flex-col min-w-0">
          <span className="text-[10px] text-white/50 uppercase tracking-wider mb-1 truncate">最大高度 (H)</span>
          <span className="text-sm font-bold text-cyan-50 truncate">
            {Object.keys(nodes).length > 0 ? `${(height/10).toFixed(0)} cm` : '0 cm'}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden space-y-4 pr-1">
        <h3 className="text-xs uppercase tracking-widest text-white/50 font-semibold mb-2">{t.sidebar.title}</h3>

        <div role="radiogroup" aria-label={t.sidebar.title} className="space-y-3">
          {TOOL_LIST.map(({ tool }, idx) => {
            const label = getToolLabel(tool);
            const isActive = selectedTool === tool;
            const isAfterPipe = idx === 3;

            return (
              <span key={tool}>
                {isAfterPipe && <div className="h-px bg-white/5 my-2" />}
                <button
                  role="radio"
                  aria-checked={isActive}
                  onClick={() => {
                    if (selectedTool !== tool) {
                      setSelectedTool(tool);
                      logToolChanged(tool);
                    }
                  }}
                  className={clsx(
                    "w-full text-left p-4 rounded-xl bg-white/5 border transition-colors cursor-pointer group focus:outline-none focus:ring-2 focus:ring-cyan-400/50",
                    isActive ? "border-cyan-400 bg-cyan-900/40" : "border-white/10 hover:bg-white/10"
                  )}
                >
                  <div className="text-sm font-medium mb-1 group-hover:text-cyan-300 transition-colors">{label.name}</div>
                  <div className="text-xs text-white/50">{label.desc}</div>
                </button>
              </span>
            );
          })}
        </div>
      </div>
      <div className="flex flex-col gap-2 mt-auto">
        <button
          aria-label="本地设计草稿库"
          onClick={() => setShowProjectManager(true)}
          className="flex items-center justify-center gap-2 p-3 text-sm font-medium text-white/80 hover:text-white bg-indigo-500/20 hover:bg-indigo-500/40 rounded-xl transition-all border border-indigo-400/30 hover:border-indigo-400 group shadow-lg"
        >
          <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
          </svg>
          本地设计草稿库
        </button>

        <button
          aria-label="库存配置与价格"
          onClick={() => setShowSettings(true)}
          className="flex items-center justify-center gap-2 p-3 text-sm font-medium text-white/60 hover:text-cyan-300 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/10 hover:border-cyan-500/30 group"
        >
          <svg className="w-5 h-5 group-hover:rotate-90 transition-transform duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          库存配置与价格
        </button>

        <div className="h-px bg-white/5" />

        <button
          onClick={() => setShowFeedback(true)}
          className="flex items-center justify-center gap-2 p-3 text-sm font-medium text-amber-300 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 rounded-xl transition-all border border-amber-400/20 hover:border-amber-400/40 group"
        >
          <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          {t.feedback.open}
        </button>
      </div>

      <div className="text-xs text-white/30 text-center mt-2 shrink-0">
        {t.app.version}
      </div>

      {showSettings && <InventorySettings onClose={() => setShowSettings(false)} />}
      {showProjectManager && <ProjectManager onClose={() => setShowProjectManager(false)} />}
      {showFeedback && <FeedbackDialog onClose={() => setShowFeedback(false)} />}
    </div>
  );
}
