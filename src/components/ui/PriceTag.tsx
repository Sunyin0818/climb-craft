'use client';

import { useSceneStore, type ConnectorShape } from '@/store/useSceneStore';
import { useLocaleStore } from '@/store/useLocaleStore';
import { useInventoryStore, computeUsedCounts, PartType } from '@/store/useInventoryStore';

export default function PriceTag() {
  const nodes = useSceneStore((state) => state.nodes);
  const edges = useSceneStore((state) => state.edges);
  const t = useLocaleStore((state) => state.t);
  const { stock, price } = useInventoryStore();
  
  const counts = computeUsedCounts(nodes, edges);
  let totalPrice = 0;

  // 计算管线超出部分的成本
  ['8', '6', '4'].forEach((partType) => {
    const pt = partType as PartType;
    if (counts[pt] > 0) {
      const stored = stock[pt] || 0;
      const excess = Math.max(0, counts[pt] - stored);
      totalPrice += excess * (price[pt] || 0);
    }
  });

  // 计算接头超出部分的成本 (统扣)
  const totalConnUsed = counts['CONN'];
  const storedConn = stock['CONN'] || 0;
  const excessConn = Math.max(0, totalConnUsed - storedConn);
  totalPrice += excessConn * (price['CONN'] || 0);

  if (totalPrice === 0) return null;

  return (
    <div className="absolute bottom-6 right-6 bg-gradient-to-r from-emerald-500 to-teal-400 text-white font-bold px-8 py-4 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.3)] z-10 border border-white/20 flex flex-col items-end transform hover:scale-105 transition-transform cursor-default">
      <span className="text-xs uppercase tracking-widest text-emerald-100 mb-1">{t.priceTag.title}</span>
      <span className="text-3xl font-mono">{t.priceTag.currency}{totalPrice.toFixed(2)}</span>
    </div>
  );
}
