'use client';

import { useSceneStore, type ConnectorShape } from '@/store/useSceneStore';
import { useLocaleStore } from '@/store/useLocaleStore';

export default function Inventory() {
  const nodes = useSceneStore((state) => state.nodes);
  const edges = useSceneStore((state) => state.edges);
  const t = useLocaleStore((state) => state.t);
  
  const connCounts: Record<string, number> = {};
  Object.values(nodes).forEach(node => {
    const shape = node.shape || 'UNKNOWN';
    connCounts[shape] = (connCounts[shape] || 0) + 1;
  });

  const bom = [
    { name: t.inventory.pipe, count: Object.keys(edges).length, price: 10.0 },
    ...Object.entries(connCounts).map(([shape, count]) => ({
      name: t.inventory.connectors[shape as ConnectorShape],
      count,
      price: 5.0
    }))
  ].filter(item => item.count > 0);

  return (
    <div className="absolute top-0 right-0 max-h-[50%] w-72 bg-white/10 backdrop-blur-md border-b border-l border-white/20 p-6 flex flex-col gap-4 text-white z-10 rounded-bl-3xl shadow-2xl">
      <h3 className="font-semibold tracking-wide text-white/90 border-b border-white/10 pb-2">{t.inventory.title}</h3>
      <ul className="text-sm space-y-3 mt-2">
        {bom.map((item, idx) => (
          <li key={idx} className="flex justify-between items-center bg-white/5 px-3 py-2 rounded-lg border border-white/5">
            <span className="text-white/80">{item.name}</span>
            <span className="font-mono bg-white/10 px-2 py-0.5 rounded text-cyan-200">x{item.count}</span>
          </li>
        ))}
        {bom.length === 0 && (
          <li className="text-white/40 italic text-center py-4">{t.inventory.empty}</li>
        )}
      </ul>
    </div>
  );
}
