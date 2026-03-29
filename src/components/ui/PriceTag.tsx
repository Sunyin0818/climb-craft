'use client';

import { useSceneStore, type ConnectorShape } from '@/store/useSceneStore';
import { useLocaleStore } from '@/store/useLocaleStore';

export default function PriceTag() {
  const nodes = useSceneStore((state) => state.nodes);
  const edges = useSceneStore((state) => state.edges);
  const t = useLocaleStore((state) => state.t);
  
  const connCounts: Record<string, number> = {};
  Object.values(nodes).forEach(node => {
    const shape = node.shape || 'UNKNOWN';
    connCounts[shape] = (connCounts[shape] || 0) + 1;
  });

  const pipeCounts: Record<number, number> = {};
  Object.values(edges).forEach(edge => {
    pipeCounts[edge.length] = (pipeCounts[edge.length] || 0) + 1;
  });

  const pipeBom = Object.entries(pipeCounts).map(([lenStr, count]) => {
    const len = Number(lenStr);
    let price = 10.0;
    if (len === 8) price = 15.0;
    else if (len === 6) price = 12.0;
    return { name: "", count, price }; // name is unused for total calculation
  });

  const bom = [
    ...pipeBom,
    ...Object.entries(connCounts).map(([shape, count]) => ({
      name: t.inventory.connectors[shape as ConnectorShape],
      count,
      price: 5.0
    }))
  ];
  
  const totalPrice = bom.reduce((acc, curr) => acc + curr.price * curr.count, 0);

  if (totalPrice === 0) return null;

  return (
    <div className="absolute bottom-6 right-6 bg-gradient-to-r from-emerald-500 to-teal-400 text-white font-bold px-8 py-4 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.3)] z-10 border border-white/20 flex flex-col items-end transform hover:scale-105 transition-transform cursor-default">
      <span className="text-xs uppercase tracking-widest text-emerald-100 mb-1">{t.priceTag.title}</span>
      <span className="text-3xl font-mono">{t.priceTag.currency}{totalPrice.toFixed(2)}</span>
    </div>
  );
}
