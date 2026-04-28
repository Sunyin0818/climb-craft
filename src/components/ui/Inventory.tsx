'use client';

import { useState } from 'react';
import { useSceneStore, type ConnectorShape } from '@/store/useSceneStore';
import { useLocaleStore } from '@/store/useLocaleStore';
import { useInventoryStore, PartType } from '@/store/useInventoryStore';

export default function Inventory() {
  const nodes = useSceneStore((state) => state.nodes);
  const edges = useSceneStore((state) => state.edges);
  const panels = useSceneStore((state) => state.panels);
  const t = useLocaleStore((state) => state.t);
  const { stock, price } = useInventoryStore();
  const [collapsed, setCollapsed] = useState(false);

  const connCounts: Record<string, number> = {};
  Object.values(nodes).forEach(node => {
    const shape = node.shape || 'UNKNOWN';
    connCounts[shape] = (connCounts[shape] || 0) + 1;
  });

  const pipeCounts: Record<number, number> = {};
  Object.values(edges).forEach(edge => {
    pipeCounts[edge.length] = (pipeCounts[edge.length] || 0) + 1;
  });

  const pnlCounts: Record<string, number> = {};
  Object.values(panels).forEach(panel => {
    const pnlType = `PANEL_${panel.size[0]}x${panel.size[1]}`;
    pnlCounts[pnlType] = (pnlCounts[pnlType] || 0) + 1;
  });

  const getPipeName = (len: number) => {
    if (len === 8) return t.sidebar.pipeLong.name;
    if (len === 6) return t.sidebar.pipeMedium.name;
    if (len === 4) return t.sidebar.pipeShort.name;
    return `${t.inventory.pipe} (${len * 50}mm)`;
  };

  const stockBom: { name: string, count: number }[] = [];
  const excessBom: { name: string, count: number, price: number, totalLinePrice: number }[] = [];

  Object.entries(pipeCounts).forEach(([lenStr, count]) => {
    const len = Number(lenStr);
    const pType = lenStr as PartType;
    const available = stock[pType] || 0;
    const unitPrice = price[pType] || 0;
    const usedStock = Math.min(count, available);
    const excess = Math.max(0, count - available);
    const name = getPipeName(len);
    if (usedStock > 0) stockBom.push({ name, count: usedStock });
    if (excess > 0) excessBom.push({ name, count: excess, price: unitPrice, totalLinePrice: excess * unitPrice });
  });

  Object.entries(connCounts).forEach(([shape, count]) => {
    if (shape === 'UNKNOWN') return;
    const pType = shape as PartType;
    const available = stock[pType] || 0;
    const unitPrice = price[pType] || 0;
    const usedStock = Math.min(count, available);
    const excess = Math.max(0, count - available);
    const name = t.inventory.connectors[shape as ConnectorShape] || shape;
    if (usedStock > 0) stockBom.push({ name, count: usedStock });
    if (excess > 0) excessBom.push({ name, count: excess, price: unitPrice, totalLinePrice: excess * unitPrice });
  });

  Object.entries(pnlCounts).forEach(([pType, count]) => {
    const available = stock[pType as PartType] || 0;
    const unitPrice = price[pType as PartType] || 0;
    const usedStock = Math.min(count, available);
    const excess = Math.max(0, count - available);
    const isLarge = pType.includes('8x8');
    const name = isLarge ? t.sidebar.panelLarge.name : t.sidebar.panelSmall.name;
    if (usedStock > 0) stockBom.push({ name, count: usedStock });
    if (excess > 0) excessBom.push({ name, count: excess, price: unitPrice, totalLinePrice: excess * unitPrice });
  });

  const totalItems = stockBom.length + excessBom.length;

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="absolute top-4 right-4 z-10 bg-white/10 backdrop-blur-md border border-white/20 text-white px-4 py-2 rounded-xl shadow-xl transition-all hover:bg-white/20 flex items-center gap-2"
        aria-label="展开物料清单"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-sm font-medium">BOM</span>
        {totalItems > 0 && (
          <span className="bg-cyan-500/30 text-cyan-200 text-xs font-mono px-1.5 py-0.5 rounded">{totalItems}</span>
        )}
      </button>
    );
  }

  return (
    <div className="absolute top-0 right-0 max-h-[100%] max-w-[360px] w-[360px] bg-white/10 backdrop-blur-md border-b border-l border-white/20 p-6 flex flex-col gap-4 text-white z-10 rounded-bl-3xl shadow-2xl overflow-y-auto">
      <div className="flex items-center justify-between border-b border-white/10 pb-2">
        <h3 className="font-semibold tracking-wide text-white/90">{t.inventory.title}</h3>
        <button
          onClick={() => setCollapsed(true)}
          className="p-1 text-white/40 hover:text-white transition-colors rounded hover:bg-white/10"
          aria-label="收起物料清单"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      <div className="space-y-4">
        {stockBom.length > 0 && (
          <div>
            <div className="text-xs uppercase tracking-widest text-emerald-400 font-bold mb-2">{t.inventory.stockSection}</div>
            <ul className="text-sm space-y-2">
              {stockBom.map((item, idx) => (
                <li key={idx} className="flex justify-between items-center bg-white/5 px-3 py-2 rounded-lg border border-emerald-500/20">
                  <span className="text-white/80">{item.name}</span>
                  <span className="font-mono bg-emerald-500/10 text-emerald-300 px-2 py-0.5 rounded">x{item.count}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {excessBom.length > 0 && (
          <div>
            <div className="text-xs uppercase tracking-widest text-red-400 font-bold mb-2 flex justify-between">
              <span>{t.inventory.excessSection}</span>
              <span className="text-red-300">{t.inventory.excessLabel}</span>
            </div>
            <ul className="text-sm space-y-2">
              {excessBom.map((item, idx) => (
                <li key={`ex-${idx}`} className="flex flex-col bg-red-500/10 px-3 py-2 rounded-lg border border-red-500/30 gap-1">
                  <div className="flex justify-between items-center w-full">
                    <span className="text-white/90 font-medium">{item.name}</span>
                    <span className="font-mono bg-red-500/20 text-red-300 px-2 py-0.5 rounded font-bold text-xs">x{item.count}</span>
                  </div>
                  <div className="flex justify-between items-center w-full text-xs text-white/50">
                    <span>@{t.priceTag.currency}{item.price.toFixed(2)}</span>
                    <span className="text-red-400 font-mono font-bold">{t.priceTag.currency}{item.totalLinePrice.toFixed(2)}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {totalItems === 0 && (
          <div className="text-white/40 italic text-center py-4">{t.inventory.empty}</div>
        )}
      </div>
    </div>
  );
}
