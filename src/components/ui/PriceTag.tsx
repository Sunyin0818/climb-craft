'use client';

import { useSceneStore } from '@/store/useSceneStore';
import { useLocaleStore } from '@/store/useLocaleStore';
import { useInventoryStore, computeUsedCounts, PartType } from '@/store/useInventoryStore';

export default function PriceTag() {
  const nodes = useSceneStore((state) => state.nodes);
  const edges = useSceneStore((state) => state.edges);
  const panels = useSceneStore((state) => state.panels);
  const t = useLocaleStore((state) => state.t);
  const { stock, price } = useInventoryStore();
  
  const counts = computeUsedCounts(nodes, edges, panels);
  let totalPrice = 0;

  // 计算所有物料超出库存部分的增量成本
  Object.keys(counts).forEach((key) => {
    const pt = key as PartType;
    if (counts[pt] > 0) {
      const stored = stock[pt] || 0;
      const excess = Math.max(0, counts[pt] - stored);
      totalPrice += excess * (price[pt] || 0);
    }
  });

  if (totalPrice === 0) return null;

  return (
    <div className="absolute bottom-6 right-6 bg-gradient-to-r from-emerald-500 to-teal-400 text-white font-bold px-8 py-4 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.3)] z-10 border border-white/20 flex flex-col items-end transform hover:scale-105 transition-transform cursor-default">
      <span className="text-xs uppercase tracking-widest text-emerald-100 mb-1">{t.priceTag.title}</span>
      <span className="text-3xl font-mono">{t.priceTag.currency}{totalPrice.toFixed(2)}</span>
    </div>
  );
}
