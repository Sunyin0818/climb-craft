'use client';

// 渲染具有插槽的接头模型 (或简单的立方体/球体占位)
export default function Connector({ position }: { position: [number, number, number] }) {
  return (
    <mesh position={position}>
      <boxGeometry args={[50, 50, 50]} />
      <meshStandardMaterial color="orange" />
    </mesh>
  );
}
