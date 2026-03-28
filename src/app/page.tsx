import Stage from '@/components/canvas/Stage';
import Sidebar from '@/components/ui/Sidebar';
import Inventory from '@/components/ui/Inventory';
import PriceTag from '@/components/ui/PriceTag';

export default function Home() {
  return (
    <main className="relative w-screen h-screen overflow-hidden bg-neutral-950 font-sans">
      {/* 3D Canvas Layer */}
      <div className="absolute inset-0 z-0">
        <Stage />
      </div>

      {/* 2D UI Overlay Layer */}
      <Sidebar />
      <Inventory />
      <PriceTag />
    </main>
  );
}
