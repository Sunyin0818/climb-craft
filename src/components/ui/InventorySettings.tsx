'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useInventoryStore, PartType } from '@/store/useInventoryStore';
import { useLocaleStore } from '@/store/useLocaleStore';

export default function InventorySettings({ onClose }: { onClose: () => void }) {
  const { stock, price, setStock, setPrice } = useInventoryStore();
  const t = useLocaleStore(s => s.t);
  
  const [localStock, setLocalStock] = useState({ ...stock });
  const [localPrice, setLocalPrice] = useState({ ...price });

  const handleSave = () => {
    Object.keys(localStock).forEach(k => {
      setStock(k as PartType, Number(localStock[k as PartType]) || 0);
      setPrice(k as PartType, Number(localPrice[k as PartType]) || 0);
    });
    onClose();
  };

  const ConfigRow = ({ label, part }: { label: string, part: PartType }) => (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/5 p-4 rounded-xl border border-white/5">
      <span className="text-white/90 font-medium whitespace-nowrap min-w-[120px]">{label}</span>
      
      <div className="flex items-center gap-4 sm:gap-6 justify-between flex-1">
        <div className="flex items-center gap-3">
          <span className="text-white/50 text-sm whitespace-nowrap">库存额度:</span>
          <input 
            type="number" min="0" step="1"
            value={localStock[part]}
            onChange={e => setLocalStock({ ...localStock, [part]: parseInt(e.target.value) || 0 })}
            className="w-20 sm:w-24 bg-black/40 border border-white/20 rounded-lg px-2 sm:px-3 py-1.5 text-white focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all font-mono"
          />
        </div>
        
        <div className="flex items-center gap-3">
          <span className="text-white/50 text-sm whitespace-nowrap min-w-[50px] sm:min-w-[70px] text-right">单价 ({t.priceTag.currency}):</span>
          <input 
            type="number" min="0" step="0.1"
            value={localPrice[part]}
            onChange={e => setLocalPrice({ ...localPrice, [part]: parseFloat(e.target.value) || 0 })}
            className="w-20 sm:w-24 bg-black/40 border border-white/20 rounded-lg px-2 sm:px-3 py-1.5 text-white focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all font-mono text-right"
          />
        </div>
      </div>
    </div>
  );

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  
  if (!mounted) return null;

  const content = (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-white/20 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5 shrink-0">
          <h2 className="text-lg font-bold text-white tracking-wider flex items-center gap-2">
            <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            库存与成本设定
          </h2>
          <button onClick={onClose} className="text-white/50 hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          <ConfigRow label={t.sidebar.pipeLong.name} part="8" />
          <ConfigRow label={t.sidebar.pipeMedium.name} part="6" />
          <ConfigRow label={t.sidebar.pipeShort.name} part="4" />
          <ConfigRow label={t.inventory.connectors.STRAIGHT} part="STRAIGHT" />
          <ConfigRow label={t.inventory.connectors.L} part="L" />
          <ConfigRow label={t.inventory.connectors.T} part="T" />
          <ConfigRow label={t.inventory.connectors['3WAY']} part="3WAY" />
          <ConfigRow label={t.inventory.connectors['4WAY']} part="4WAY" />
          <ConfigRow label={t.inventory.connectors['5WAY']} part="5WAY" />
          <ConfigRow label={t.inventory.connectors['6WAY']} part="6WAY" />
        </div>

        <div className="px-6 py-4 border-t border-white/10 bg-black/20 flex justify-end gap-3 shrink-0">
          <button 
            onClick={onClose}
            className="px-6 py-2 rounded-lg text-sm text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            取消
          </button>
          <button 
            onClick={handleSave}
            className="px-6 py-2 rounded-lg text-sm bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-medium shadow-lg hover:shadow-cyan-500/25 transition-all"
          >
            保存并应用
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
