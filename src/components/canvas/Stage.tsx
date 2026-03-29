'use client';

import { useState, useRef, useEffect } from 'react';
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
            {/* 视觉细线渲染层: 极细的紫色高亮射线，与任何实体管件(红绿橙)彻底拉开视觉差距 */}
            <mesh>
              <cylinderGeometry args={[2, 2, length, 8]} />
              <meshBasicMaterial color="#d946ef" transparent opacity={0.8} depthTest={false} />
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

const checkWebGLSupport = () => {
  if (typeof window === 'undefined') return true;
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext && 
      (canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch (e) {
    return false;
  }
};

export default function Stage() {
  const [hasWebGL] = useState(checkWebGLSupport);
  const selectedTool = useSceneStore(s => s.selectedTool);
  const placePipe = useSceneStore(s => s.placePipe);
  const removePipe = useSceneStore(s => s.removePipe);
  const nodes = useSceneStore(s => s.nodes);
  const edges = useSceneStore(s => s.edges);

  const [startPoint, setStartPoint] = useState<[number, number, number] | null>(null);
  const [currentPoint, setCurrentPoint] = useState<[number, number, number] | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  
  const orbitRef = useRef<OrbitControlsImpl>(null);


  // 预判错误状态
  const isStartHoverError = selectedTool !== 'NONE' && !startPoint && currentPoint
    ? isPointOnEdgeBody(currentPoint, edges, nodes) 
    : false;

  const isSegmentError = startPoint && currentPoint 
    ? isSegmentColliding(startPoint, currentPoint, edges, nodes)
    : false;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 当按下 Delete 或 Backspace 且有选中的边时执行删除
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedEdgeId) {
        removePipe(selectedEdgeId);
        setSelectedEdgeId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedEdgeId, removePipe]);

  const handleResetCamera = () => {
    if (orbitRef.current) {
      orbitRef.current.reset();
    }
    setStartPoint(null);
    setCurrentPoint(null);
    setSelectedEdgeId(null);
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
    
    // point 是射线物理撞击平面的确切三维浮点坐标。
    // BUG FIX: 地面碰撞器位于 Y=-25，由于渲染精度波动偶尔会变成 -25.01，
    // 这会导致 Math.round(-25.01/50) = -1，从而将吸附点计算为 y=-50，
    // 新建的管子会彻底卡进地砖底面(y=-30)下方导致视觉消失。
    // 所以当我们捕获地面投射时，直接霸道地将其物理 Y 坐标锁死为 0。
    const snapped = Snapping.snapToGrid([e.point.x, 0, e.point.z]);
    
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
    
    // 如果点在空白处，清理当前选中的管子
    if (selectedEdgeId) {
      setSelectedEdgeId(null);
    }

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
    // 取消选中状态或取消起画点
    if (selectedEdgeId) {
      setSelectedEdgeId(null);
    } else if (startPoint) {
      setStartPoint(null);
    } else {
      useSceneStore.getState().setSelectedTool('NONE');
      setCurrentPoint(null);
    }
  };

  const selectedEdge = selectedEdgeId ? edges[selectedEdgeId] : null;
  const edgeStartNode = selectedEdge ? nodes[selectedEdge.start] : null;
  const edgeEndNode = selectedEdge ? nodes[selectedEdge.end] : null;

  if (!hasWebGL) {
    return (
      <div className="w-full h-full bg-neutral-900 border-none flex flex-col items-center justify-center p-8 m-0 text-white font-sans">
        <svg className="w-20 h-20 text-red-500 mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <h2 className="text-2xl font-bold mb-4 tracking-wider">3D 引擎启动失败</h2>
        <p className="text-white/70 max-w-lg text-center leading-relaxed mb-6">
          您的浏览器设备未能创建 WebGL 渲染上下文。这通常是因为您的设备不支持硬件图形加速、显卡驱动异常，或是浏览器禁用了此项功能。<br/>攀爬架模型渲染依赖该核心底层。
        </p>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 w-full max-w-md">
          <h4 className="font-semibold text-emerald-400 mb-2">解决方案指南：</h4>
          <ul className="text-sm text-white/60 space-y-2 list-disc list-inside">
            <li>请使用最新稳定版的 Chrome、Edge 或 Firefox 浏览器</li>
            <li>进入浏览器设置，搜索并确保开启了<strong>“使用硬件加速”</strong></li>
            <li>如果您在使用安全沙盒/远程连接，请确保穿透了 GPU 设备</li>
            <li>尝试更新系统显卡驱动</li>
          </ul>
        </div>
      </div>
    );
  }

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

      {/* 选中时的浮动删除按钮 */}
      {selectedEdgeId && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-10 flex gap-4">
          <button 
            onClick={() => {
              removePipe(selectedEdgeId);
              setSelectedEdgeId(null);
            }}
            className="bg-red-500/80 hover:bg-red-500 backdrop-blur-md border border-red-400 text-white text-sm px-8 py-3 rounded-full shadow-2xl transition-all font-semibold tracking-wide flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            拆除当前管路 (Del)
          </button>
        </div>
      )}

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
                setSelectedEdgeId(null);
              }
            }}
          />
        ))}
        {Object.values(edges).map(edge => {
          const startPos = nodes[edge.start]?.position || [0,0,0];
          const endPos = nodes[edge.end]?.position || [0,0,0];
          return (
            <Pipe 
              key={edge.id} 
              start={startPos} 
              end={endPos} 
              isPreview={false}
              isSelected={selectedEdgeId === edge.id}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedEdgeId(edge.id);
                setStartPoint(null); // 点了管子就放弃原有的独立起点
              }}
            />
          );
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
        
        {/* 全新垂直向导十字线（单点延伸） */}
        {startPoint && !selectedEdgeId && (
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
        
        {/* 选中管子状态：两端双法线辅助线 */}
        {selectedEdgeId && edgeStartNode && edgeEndNode && !startPoint && (
          <group>
            <AxisCrosshair 
              startPoint={edgeStartNode.position} 
              length={getTargetLength() > 0 ? getTargetLength() * 50 : 150} 
              onHover={(target: [number, number, number]) => getTargetLength() > 0 && setCurrentPoint(target)}
              onClick={(target: [number, number, number]) => {
                if (getTargetLength() === 0) return;
                if (isSegmentColliding(edgeStartNode.position, target, edges, nodes)) return;
                placePipe(edgeStartNode.position, target, getTargetLength());
                setSelectedEdgeId(null);
                setStartPoint(target);
              }}
            />
            <AxisCrosshair 
              startPoint={edgeEndNode.position} 
              length={getTargetLength() > 0 ? getTargetLength() * 50 : 150} 
              onHover={(target: [number, number, number]) => getTargetLength() > 0 && setCurrentPoint(target)}
              onClick={(target: [number, number, number]) => {
                if (getTargetLength() === 0) return;
                if (isSegmentColliding(edgeEndNode.position, target, edges, nodes)) return;
                placePipe(edgeEndNode.position, target, getTargetLength());
                setSelectedEdgeId(null);
                setStartPoint(target);
              }}
            />
          </group>
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
