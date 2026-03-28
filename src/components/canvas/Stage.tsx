'use client';

import { useState, useRef } from 'react';
import { ThreeEvent, Canvas } from '@react-three/fiber';
import { Vector3, Quaternion } from 'three';
import { OrbitControls, Grid } from '@react-three/drei';
import { useSceneStore } from '@/store/useSceneStore';
import { Snapping } from '@/core/engine/Snapping';
import { isPointOnEdgeBody, isSegmentColliding } from '@/core/engine/CollisionUtils';
import Pipe from './Pipe';
import Connector from './Connector';

const AXES = [
  [0, 1, 0], [0, -1, 0],
  [1, 0, 0], [-1, 0, 0],
  [0, 0, 1], [0, 0, -1]
];

interface AxisCrosshairProps {
  startPoint: [number, number, number];
  length: number;
  onHover: (target: [number, number, number]) => void;
  onClick: (target: [number, number, number]) => void;
}

function AxisCrosshair({ startPoint, length, onHover, onClick }: AxisCrosshairProps) {
  if (!startPoint || length <= 0) return null;
  return (
    <group position={startPoint}>
      {AXES.map((v, i) => {
        const target: [number, number, number] = [
          startPoint[0] + v[0] * length,
          startPoint[1] + v[1] * length,
          startPoint[2] + v[2] * length,
        ];
        
        const midPoint: [number, number, number] = [v[0] * length / 2, v[1] * length / 2, v[2] * length / 2];
        const quaternion = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), new Vector3(...v));
        return (
          <group 
            key={i} 
            position={midPoint} 
            quaternion={quaternion}
          >
            {/* 视觉细线渲染层 (使用高亮橙黄色) */}
            <mesh>
              <cylinderGeometry args={[8, 8, length, 8]} />
              <meshBasicMaterial color="#fbbf24" transparent opacity={0.6} depthTest={false} />
            </mesh>
            {/* 物理碰撞隐形层 (极其肥大的半径 100，专门拯救平行射线的细线点不中问题) */}
            <mesh 
              onPointerMove={(e) => { e.stopPropagation(); onHover(target); }}
              onClick={(e) => { e.stopPropagation(); onClick(target); }}
            >
              <cylinderGeometry args={[100, 100, length, 8]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';

export default function Stage() {
  const selectedTool = useSceneStore(s => s.selectedTool);
  const placePipe = useSceneStore(s => s.placePipe);
  const nodes = useSceneStore(s => s.nodes);
  const edges = useSceneStore(s => s.edges);

  const [startPoint, setStartPoint] = useState<[number, number, number] | null>(null);
  const [currentPoint, setCurrentPoint] = useState<[number, number, number] | null>(null);
  
  const orbitRef = useRef<OrbitControlsImpl>(null);

  // 预判错误状态
  const isStartHoverError = selectedTool !== 'NONE' && !startPoint && currentPoint
    ? isPointOnEdgeBody(currentPoint, edges, nodes) 
    : false;

  const isSegmentError = startPoint && currentPoint 
    ? isSegmentColliding(startPoint, currentPoint, edges, nodes)
    : false;

  const handleResetCamera = () => {
    if (orbitRef.current) {
      orbitRef.current.reset();
    }
    setStartPoint(null);
    setCurrentPoint(null);
    useSceneStore.getState().setSelectedTool('NONE');
  };

  const getTargetLength = () => {
    if (selectedTool === 'PIPE_LONG') return 8;
    if (selectedTool === 'PIPE_MEDIUM') return 6;
    if (selectedTool === 'PIPE_SHORT') return 4;
    return 0;
  };

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (selectedTool === 'NONE') {
      setCurrentPoint(null);
      return;
    }
    
    // point 是射线物理撞击平面的确切三维浮点坐标
    const snapped = Snapping.snapToGrid([e.point.x, e.point.y, e.point.z]);
    
    if (!startPoint) {
      setCurrentPoint(snapped);
    } else {
      const len = getTargetLength();
      if (len > 0) {
        const axisSnapped = Snapping.snapToAxis(startPoint, snapped, len);
        setCurrentPoint(axisSnapped);
      }
    }
  };

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (selectedTool === 'NONE') return;

    if (!startPoint && currentPoint) {
      if (isStartHoverError) return; // 拦截非法起点
      setStartPoint(currentPoint); // 锁定起点
    } else if (startPoint && currentPoint) {
      // 若距离仍为0，阻止放置
      if (startPoint[0] === currentPoint[0] && startPoint[1] === currentPoint[1] && startPoint[2] === currentPoint[2]) return;
      
      if (isSegmentError) return; // 拦截穿模路线
      
      placePipe(startPoint, currentPoint, getTargetLength());
      setStartPoint(currentPoint); // 管子绘制完成后，让当前结束点直接成为下一个新起点（连续绘制）
    }
  };
  
  const handleContextMenu = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    // 如果正在画管子，右键取消第一点；否则退回空闲工具
    if (startPoint) {
      setStartPoint(null);
    } else {
      useSceneStore.getState().setSelectedTool('NONE');
      setCurrentPoint(null);
    }
  };

  return (
    <div className="w-full h-full bg-neutral-900 border-none outline-none overflow-hidden m-0 p-0" onContextMenu={(e) => e.preventDefault()}>
      
      {/* 视角复位与中心追踪按钮 */}
      <div className="absolute top-6 right-[350px] z-10 flex gap-4">
        <button 
          onClick={handleResetCamera}
          className="bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white text-sm px-6 py-2 rounded-full shadow-xl transition-all font-semibold tracking-wide"
        >
          回到中心 (Center View)
        </button>
      </div>

      {/* 将初始摄像机移动至 [4000, 2500, 5000] 形成经典的 30 度角侧下斜视距，避免强烈的上帝视角俯视感 */}
      <Canvas camera={{ position: [4000, 2500, 5000], fov: 45, near: 50, far: 30000 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        
        {/* 地面坐标网格定位：放大到 8m x 8m (160LU x 160LU) 提升视野宏大感，将其放置在 Y=-24 */}
        <Grid
          args={[8000, 8000]}
          position={[0, -24, 0]}
          cellSize={50}
          cellThickness={1}
          sectionSize={500} 
          sectionThickness={1.5}
          sectionColor="#3b82f6" 
          cellColor="#333333"
          fadeDistance={9000}
          infiniteGrid={false}
        />
        
        {/* 蓝光边框：8040 放置于 Y=-40 与底板拉开巨大差距避免深度撕裂闪烁 */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -40, 0]}>
          <planeGeometry args={[8040, 8040]} />
          <meshBasicMaterial color="#3b82f6" />
        </mesh>

        {/* 黑底底板 放置在 Y=-30 (与上方网格保持 6mm 精确级景深拉开差) */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -30, 0]}>
          <planeGeometry args={[8000, 8000]} />
          <meshStandardMaterial color="#111111" roughness={0.9} />
        </mesh>
        
        {/* 透明射线碰撞接收器 保持在 Y=-25 让射线的交互逻辑平面完美卡在中间 */}
        <mesh 
          rotation={[-Math.PI / 2, 0, 0]} 
          position={[0, -25, 0]} 
          onPointerMove={handlePointerMove}
          onClick={handleClick}
          onContextMenu={handleContextMenu}
          visible={false}
        >
          <planeGeometry args={[8000, 8000]} />
          <meshBasicMaterial />
        </mesh>
        
        {Object.values(nodes).map(node => (
          <Connector 
            key={node.id} 
            position={node.position} 
            isPreview={false}
            onClick={(e) => {
              if (selectedTool !== 'NONE' && !startPoint) {
                e.stopPropagation();
                setStartPoint(node.position);
              }
            }}
          />
        ))}
        {Object.values(edges).map(edge => {
          const startPos = nodes[edge.start]?.position || [0,0,0];
          const endPos = nodes[edge.end]?.position || [0,0,0];
          return <Pipe key={edge.id} start={startPos} end={endPos} isPreview={false} />;
        })}
        {/* 交互过程的幻影渲染 */}
        {selectedTool !== 'NONE' && currentPoint && !startPoint && (
          <Connector position={currentPoint} isPreview isError={isStartHoverError} />
        )}
        {startPoint && currentPoint && (
          <group>
            <Connector position={startPoint} isPreview />
            <Pipe start={startPoint} end={currentPoint} isPreview isError={isSegmentError} />
            <Connector position={currentPoint} isPreview isError={isSegmentError} />
          </group>
        )}
        
        {/* 全新垂直向导十字线（覆盖全向） */}
        {startPoint && (
          <AxisCrosshair 
            startPoint={startPoint} 
            length={getTargetLength() * 50} 
            onHover={(target: [number, number, number]) => setCurrentPoint(target)}
            onClick={(target: [number, number, number]) => {
              if (isSegmentColliding(startPoint, target, edges, nodes)) return;
              placePipe(startPoint, target, getTargetLength());
              setStartPoint(target); // 保持操作锚点，允许顺藤摸瓜连续往天空造塔
            }}
          />
        )}
        
        <OrbitControls 
          ref={orbitRef}
          makeDefault 
          maxPolarAngle={Math.PI / 2 - 0.05} 
          minDistance={200} 
          maxDistance={12000} // 允许极大地拉远视角
          enablePan={true}
        />
      </Canvas>
    </div>
  );
}
