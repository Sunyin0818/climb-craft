'use client';

import { useLocaleStore } from '@/store/useLocaleStore';
import { useSceneStore } from '@/store/useSceneStore';
import clsx from 'clsx';
import { useState } from 'react';
import InventorySettings from './InventorySettings';

export default function Sidebar() {
  const t = useLocaleStore((state) => state.t);
  const selectedTool = useSceneStore((state) => state.selectedTool);
  const setSelectedTool = useSceneStore((state) => state.setSelectedTool);
  const [showSettings, setShowSettings] = useState(false);

  return (
    <div className="absolute top-0 left-0 h-full w-80 bg-white/10 backdrop-blur-md border-r border-white/20 p-6 flex flex-col gap-6 text-white z-10 shadow-2xl">
      <div className="text-2xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-indigo-400 to-cyan-300">
        {t.app.title}
      </div>
      
      <div className="flex-1 overflow-y-auto space-y-4">
        <h3 className="text-xs uppercase tracking-widest text-white/50 font-semibold mb-2">{t.sidebar.title}</h3>
        
        {/* Mock Draggable Items */}
        <div 
          onClick={() => setSelectedTool('PIPE_LONG')}
          className={clsx("p-4 rounded-xl bg-white/5 border transition-colors cursor-pointer group", 
            selectedTool === 'PIPE_LONG' ? "border-cyan-400 bg-cyan-900/40" : "border-white/10 hover:bg-white/10"
          )}
        >
          <div className="text-sm font-medium mb-1 group-hover:text-cyan-300 transition-colors">{t.sidebar.pipeLong.name}</div>
          <div className="text-xs text-white/40">{t.sidebar.pipeLong.desc}</div>
        </div>

        <div 
          onClick={() => setSelectedTool('PIPE_MEDIUM')}
          className={clsx("p-4 rounded-xl bg-white/5 border transition-colors cursor-pointer group", 
            selectedTool === 'PIPE_MEDIUM' ? "border-cyan-400 bg-cyan-900/40" : "border-white/10 hover:bg-white/10"
          )}
        >
          <div className="text-sm font-medium mb-1 group-hover:text-cyan-300 transition-colors">{t.sidebar.pipeMedium.name}</div>
          <div className="text-xs text-white/40">{t.sidebar.pipeMedium.desc}</div>
        </div>

        <div 
          onClick={() => setSelectedTool('PIPE_SHORT')}
          className={clsx("p-4 rounded-xl bg-white/5 border transition-colors cursor-pointer group", 
            selectedTool === 'PIPE_SHORT' ? "border-cyan-400 bg-cyan-900/40" : "border-white/10 hover:bg-white/10"
          )}
        >
          <div className="text-sm font-medium mb-1 group-hover:text-cyan-300 transition-colors">{t.sidebar.pipeShort.name}</div>
          <div className="text-xs text-white/40">{t.sidebar.pipeShort.desc}</div>
        </div>
      </div>
      <button 
        onClick={() => setShowSettings(true)}
        className="mt-auto flex items-center justify-center gap-2 p-3 text-sm font-medium text-white/60 hover:text-cyan-300 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/10 hover:border-cyan-500/30 group"
      >
        <svg className="w-5 h-5 group-hover:rotate-90 transition-transform duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
        库存配置与价格
      </button>
      
      <div className="text-xs text-white/30 text-center mt-2">
        {t.app.version}
      </div>

      {showSettings && <InventorySettings onClose={() => setShowSettings(false)} />}
    </div>
  );
}
