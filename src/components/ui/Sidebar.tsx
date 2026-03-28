'use client';

import { useLocaleStore } from '@/store/useLocaleStore';
import { useSceneStore } from '@/store/useSceneStore';
import clsx from 'clsx';

export default function Sidebar() {
  const t = useLocaleStore((state) => state.t);
  const selectedTool = useSceneStore((state) => state.selectedTool);
  const setSelectedTool = useSceneStore((state) => state.setSelectedTool);

  return (
    <div className="absolute top-0 left-0 h-full w-64 bg-white/10 backdrop-blur-md border-r border-white/20 p-6 flex flex-col gap-6 text-white z-10 shadow-2xl">
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
      
      <div className="mt-auto text-xs text-white/30 text-center">
        {t.app.version}
      </div>
    </div>
  );
}
