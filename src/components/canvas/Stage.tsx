'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { ThreeEvent, Canvas } from '@react-three/fiber';
import { Vector3, Quaternion } from 'three';
import { OrbitControls, Grid } from '@react-three/drei';
import { useSceneStore, recalculateNodeShapes, ConnectorShape } from '@/store/useSceneStore';
import { useLocaleStore } from '@/store/useLocaleStore';
import { Snapping } from '@/core/engine/Snapping';
import { CoordinateUtils } from '@/core/utils/CoordinateUtils';
import { isPointOnEdgeBody, isSegmentColliding } from '@/core/engine/CollisionUtils';
import Pipe from './Pipe';
import InstancedPipes from './InstancedPipes';
import Connector from './Connector';
import InstancedConnectors from './InstancedConnectors';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';

const AXES = [
  new Vector3(0, 1, 0), new Vector3(0, -1, 0),
  new Vector3(1, 0, 0), new Vector3(-1, 0, 0),
  new Vector3(0, 0, 1), new Vector3(0, 0, -1)
];

const DEFAULT_UP = new Vector3(0, 1, 0);


interface AxisCrosshairProps {
  startPoint: [number, number, number];
  length: number;
  onHover: (target: [number, number, number]) => void;
  onClick: (target: [number, number, number]) => void;
  onError: (msg: string) => void;
  onPointerDown: (e: ThreeEvent<PointerEvent>) => void;
}

function AxisCrosshair({ startPoint, length, onHover, onClick, onError, onPointerDown }: AxisCrosshairProps) {
  const midPoints = useMemo(() => {
    return AXES.map(v => new Vector3().copy(v).multiplyScalar(length / 2));
  }, [length]);

  const quaternions = useMemo(() => {
    return AXES.map(v => new Quaternion().setFromUnitVectors(DEFAULT_UP, v));
  }, []);

  if (!startPoint || length <= 0) return null;
  
  return (
    <group position={startPoint}>
      {AXES.map((v, i) => {
        const target: [number, number, number] = [
          startPoint[0] + v.x * length,
          startPoint[1] + v.y * length,
          startPoint[2] + v.z * length,
        ];
        
        return (
          <group 
            key={i} 
            position={midPoints[i]} 
            quaternion={quaternions[i]}
          >
            <mesh>
              <cylinderGeometry args={[2, 2, length, 8]} />
              <meshBasicMaterial color="#d946ef" transparent opacity={0.8} depthTest={false} />
            </mesh>
            <mesh 
              onPointerMove={(e) => { e.stopPropagation(); onHover(target); }}
              onPointerDown={onPointerDown}
              onClick={(e) => { 
                e.stopPropagation(); 
                // Don't just click silently, let's let the parent validate collision.
                onClick(target); 
              }}
            >
              <cylinderGeometry args={[40, 40, length, 8]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}


let cachedWebGLSupport: boolean | null = null;
const checkWebGLSupport = () => {
  if (cachedWebGLSupport !== null) return cachedWebGLSupport;
  if (typeof window === 'undefined') return true;
  try {
    const canvas = document.createElement('canvas');
    const gl = (canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
    const support = !!(window.WebGLRenderingContext && gl);
    // 强制丢弃临时上下文
    if (gl) {
      const loseContext = gl.getExtension('WEBGL_lose_context');
      if (loseContext) loseContext.loseContext();
    }
    cachedWebGLSupport = support;
    return support;
  } catch (e) {
    cachedWebGLSupport = false;
    return false;
  }
};


export default function Stage() {
  const [hasWebGL] = useState(checkWebGLSupport);
  const [contextLost, setContextLost] = useState(false);
  const selectedTool = useSceneStore(s => s.selectedTool);
  const placePipe = useSceneStore(s => s.placePipe);
  const removePipe = useSceneStore(s => s.removePipe);
  const nodes = useSceneStore(s => s.nodes);
  const edges = useSceneStore(s => s.edges);
  const t = useLocaleStore(s => s.t);

  const [startPoint, setStartPoint] = useState<[number, number, number] | null>(null);
  const [currentPoint, setCurrentPoint] = useState<[number, number, number] | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const pointerDownPos = useRef<{ x: number, y: number } | null>(null);

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    pointerDownPos.current = { x: e.clientX, y: e.clientY };
  };

  const isActuallyClick = (e: ThreeEvent<MouseEvent>) => {
    if (!pointerDownPos.current) return true;
    const dx = e.clientX - pointerDownPos.current.x;
    const dy = e.clientY - pointerDownPos.current.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return dist < 3;
  };


  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };


  
  const orbitRef = useRef<OrbitControlsImpl>(null);

  const isStartHoverError = selectedTool !== 'NONE' && !startPoint && currentPoint
    ? isPointOnEdgeBody(currentPoint, edges, nodes) 
    : false;

  const isSegmentError = startPoint && currentPoint 
    ? isSegmentColliding(startPoint, currentPoint, edges, nodes)
    : false;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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

  const handleTryPlacePipe = (start: [number, number, number], end: [number, number, number], length: number): boolean => {
    // 防止重复连线带来的重复扣减错误
    const edgeId = CoordinateUtils.getEdgeKey(start, end);
    if (edges[edgeId]) return false;
    
    // 直接执行搭建变更（一切溢出计算全部交由 Inventory 和 PriceTag 渲染层静默分列成本）
    placePipe(start, end, length);
    return true;
  };

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (selectedTool === 'NONE') {
      setCurrentPoint(null);
      return;
    }
    
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
    if (!isActuallyClick(e)) return;
    
    if (selectedEdgeId) {
      setSelectedEdgeId(null);
    }

    if (selectedTool === 'NONE') return;

    if (!startPoint && currentPoint) {
      if (isStartHoverError) return;
      setStartPoint(currentPoint);
    } else if (startPoint && currentPoint) {
      // 当已经有起点时，地面的点击不再触发新增管子，必须点击在引导线（AxisCrosshair）上
      return;
    }
  };
  
  const handleContextMenu = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
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

  if (!hasWebGL || contextLost) {
    return (
      <div className="w-full h-full bg-neutral-900 border-none flex flex-col items-center justify-center p-8 m-0 text-white font-sans">
        <svg className="w-20 h-20 text-red-500 mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <h2 className="text-2xl font-bold mb-4 tracking-wider">{contextLost ? 'WebGL 上下文丢失' : '3D 引擎启动失败'}</h2>
        <p className="text-white/70 max-w-lg text-center leading-relaxed mb-6">
          {contextLost 
            ? '由于 GPU 资源不足或 RDP 连接环境变化，3D 视图已断开。' 
            : '您的浏览器设备未能创建 WebGL 渲染上下文。'}
        </p>
        {contextLost && (
          <button 
            onClick={() => window.location.reload()}
            className="bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white px-8 py-3 rounded-full transition-all font-bold"
          >
            刷新以恢复 (Reload)
          </button>
        )}
      </div>
    );
  }


  return (
    <div className="w-full h-full bg-neutral-900 border-none outline-none overflow-hidden m-0 p-0" onContextMenu={(e) => e.preventDefault()}>
      
      <div className="absolute top-6 right-[350px] z-10 flex gap-4">
        <button 
          onClick={handleResetCamera}
          className="bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white text-sm px-6 py-2 rounded-full shadow-xl transition-all font-semibold tracking-wide"
        >
          回到中心 (Center View)
        </button>
      </div>

      {toastMsg && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="bg-red-500/90 text-white px-6 py-3 rounded-full shadow-2xl backdrop-blur-md border border-red-400 font-medium flex items-center gap-3">
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            {toastMsg}
          </div>
        </div>
      )}

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

      <Canvas 
        camera={{ position: [4000, 2500, 5000], fov: 45, near: 50, far: 30000 }}
        gl={{ powerPreference: 'high-performance', antialias: true, stencil: false, alpha: false }}
        onCreated={({ gl }) => {
          const canvas = gl.domElement;
          const handleContextLost = (e: Event) => {
            e.preventDefault();
            console.warn("WebGL Context Lost!");
            setContextLost(true);
          };
          const handleContextRestored = () => {
             console.log("WebGL Context Restored");
             setContextLost(false);
          };
          canvas.addEventListener('webglcontextlost', handleContextLost, false);
          canvas.addEventListener('webglcontextrestored', handleContextRestored, false);
        }}
      >

        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        
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
        
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -40, 0]}>
          <planeGeometry args={[8040, 8040]} />
          <meshBasicMaterial color="#3b82f6" />
        </mesh>

        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -30, 0]}>
          <planeGeometry args={[8000, 8000]} />
          <meshStandardMaterial color="#111111" roughness={0.9} />
        </mesh>
        
        <mesh 
          rotation={[-Math.PI / 2, 0, 0]} 
          position={[0, -25, 0]} 
          onPointerMove={handlePointerMove}
          onPointerDown={handlePointerDown}
          onClick={handleClick}
          onContextMenu={handleContextMenu}
          visible={false}
        >
          <planeGeometry args={[8000, 8000]} />
          <meshBasicMaterial />
        </mesh>
        
        <InstancedConnectors 
          nodes={nodes}
          onPointerDown={handlePointerDown}
          onNodeClick={(nodeId, e) => {
            if (selectedTool === 'NONE') return;
            e.stopPropagation();
            if (!isActuallyClick(e)) return;
            if (!startPoint) {
              setStartPoint(nodes[nodeId].position);
              setSelectedEdgeId(null);
            } else {
              const target = nodes[nodeId].position;
              // Check exact target point logic
              const dx = Math.abs(target[0] - startPoint[0]);
              const dy = Math.abs(target[1] - startPoint[1]);
              const dz = Math.abs(target[2] - startPoint[2]);
              
              const nonZeroDiffs = [dx, dy, dz].filter(d => d > 0.01).length;
              const actualDistance = Math.sqrt(dx*dx + dy*dy + dz*dz);
              const targetLen = getTargetLength() * 50;

              if (nonZeroDiffs > 1) {
                if (dy > 0.01) showToast('不在同一个水平面或未精确对齐，无法接上！');
                else showToast('未在同一条轴线上，无法接上！');
                return;
              }
              if (Math.abs(actualDistance - targetLen) > 0.1) {
                showToast(`管子长度不匹配（当前管子跨度为 ${getTargetLength()}，但目标距离跨度为 ${Math.round(actualDistance / 50)}），无法接上！`);
                return;
              }
              if (isSegmentColliding(startPoint, target, edges, nodes)) {
                showToast('连线路径上存在遮挡碰撞，无法接上！');
                return;
              }
              if (handleTryPlacePipe(startPoint, target, getTargetLength())) {
                setStartPoint(target);
              }
            }
          }}
        />
        <InstancedPipes
          edges={edges}
          nodes={nodes}
          selectedEdgeId={selectedEdgeId}
          onPointerDown={handlePointerDown}
          onPipeClick={(edgeId, e) => {
            e.stopPropagation();
            if (!isActuallyClick(e)) return;
            setSelectedEdgeId(edgeId);
            setStartPoint(null);
          }}
        />
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
        
        {startPoint && !selectedEdgeId && (
          <AxisCrosshair 
            startPoint={startPoint} 
            length={getTargetLength() * 50} 
            onHover={(target: [number, number, number]) => setCurrentPoint(target)}
            onClick={(target: [number, number, number]) => {
              // Note: AxisCrosshair handles its own internal structure, 
              // but we pass down the drag validation logic indirectly if needed.
              // For now, grid/node clicks are the main concern.
              if (isSegmentColliding(startPoint, target, edges, nodes)) {
                showToast('连线路径上存在遮挡碰撞，无法接上！');
                return;
              }
              if (handleTryPlacePipe(startPoint, target, getTargetLength())) {
                setStartPoint(target);
              }
            }}
            onError={showToast}
            onPointerDown={handlePointerDown}
          />
        )}
        
        {selectedEdgeId && edgeStartNode && edgeEndNode && !startPoint && (
          <group>
            <AxisCrosshair 
              startPoint={edgeStartNode.position} 
              length={getTargetLength() * 50} 
              onHover={(target) => getTargetLength() > 0 && setCurrentPoint(target)}
              onClick={(target) => {
                if (getTargetLength() === 0) return;
                if (isSegmentColliding(edgeStartNode.position, target, edges, nodes)) {
                  showToast('连线路径上存在遮挡碰撞，无法接上！');
                  return;
                }
                if (handleTryPlacePipe(edgeStartNode.position, target, getTargetLength())) {
                  setSelectedEdgeId(null);
                  setStartPoint(target);
                }
              }}
              onError={showToast}
              onPointerDown={handlePointerDown}
            />
            <AxisCrosshair 
              startPoint={edgeEndNode.position} 
              length={getTargetLength() * 50} 
              onHover={(target) => getTargetLength() > 0 && setCurrentPoint(target)}
              onClick={(target) => {
                if (getTargetLength() === 0) return;
                if (isSegmentColliding(edgeEndNode.position, target, edges, nodes)) {
                  showToast('连线路径上存在遮挡碰撞，无法接上！');
                  return;
                }
                if (handleTryPlacePipe(edgeEndNode.position, target, getTargetLength())) {
                  setSelectedEdgeId(null);
                  setStartPoint(target);
                }
              }}
              onError={showToast}
              onPointerDown={handlePointerDown}
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
