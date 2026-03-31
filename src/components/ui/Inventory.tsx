'use client';

import { useSceneStore, type ConnectorShape } from '@/store/useSceneStore';
import { useLocaleStore } from '@/store/useLocaleStore';
import { useInventoryStore, computeUsedCounts, PartType } from '@/store/useInventoryStore';

export default function Inventory() {
  const nodes = useSceneStore((state) => state.nodes);
  const edges = useSceneStore((state) => state.edges);
  const t = useLocaleStore((state) => state.t);
  const { stock, price } = useInventoryStore();

  const connCounts: Record<string, number> = {};
  Object.values(nodes).forEach(node => {
    const shape = node.shape || 'UNKNOWN';
    connCounts[shape] = (connCounts[shape] || 0) + 1;
  });

  const pipeCounts: Record<number, number> = {};
  Object.values(edges).forEach(edge => {
    pipeCounts[edge.length] = (pipeCounts[edge.length] || 0) + 1;
  });

  const getPipeName = (len: number) => {
    if (len === 8) return t.sidebar.pipeLong.name;
    if (len === 6) return t.sidebar.pipeMedium.name;
    if (len === 4) return t.sidebar.pipeShort.name;
    return `${t.inventory.pipe} (${len * 50}mm)`;
  };

  const stockBom: { name: string, count: number }[] = [];
  const excessBom: { name: string, count: number, price: number, totalLinePrice: number }[] = [];

  // 计算管线
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

  // 计算接头（按具体型号分别统计）
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

  const totalItems = stockBom.length + excessBom.length;

  return (
    <div className="absolute top-0 right-0 max-h-[100%] max-w-[360px] w-[360px] bg-white/10 backdrop-blur-md border-b border-l border-white/20 p-6 flex flex-col gap-4 text-white z-10 rounded-bl-3xl shadow-2xl overflow-y-auto">
      <h3 className="font-semibold tracking-wide text-white/90 border-b border-white/10 pb-2">{t.inventory.title}</h3>
      
      <div className="space-y-4">
        {stockBom.length > 0 && (
          <div>
            <div className="text-xs uppercase tracking-widest text-emerald-400 font-bold mb-2">消耗自有库存 (无成本)</div>
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
              <span>需新购零件 (超限)</span>
              <span className="text-red-300">计价单</span>
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
