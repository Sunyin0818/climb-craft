'use client';

import { useState, useRef, useEffect } from 'react';
import { ThreeEvent, Canvas } from '@react-three/fiber';
import { Vector3, Quaternion } from 'three';
import { OrbitControls, Grid } from '@react-three/drei';
import { useSceneStore } from '@/store/useSceneStore';
import { useLocaleStore } from '@/store/useLocaleStore';
import { useInventoryStore, computeUsedCounts, PartType } from '@/store/useInventoryStore';
import { Snapping } from '@/core/engine/Snapping';
import { isPointOnEdgeBody, isSegmentColliding } from '@/core/engine/CollisionUtils';
import Pipe from './Pipe';
import Connector from './Connector';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';

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
            <mesh>
              <cylinderGeometry args={[2, 2, length, 8]} />
              <meshBasicMaterial color="#d946ef" transparent opacity={0.8} depthTest={false} />
            </mesh>
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
  const t = useLocaleStore(s => s.t);
  
  const { stock, allowedExcess, setAllowedExcess } = useInventoryStore();
  const [warningModal, setWarningModal] = useState<{ partType: PartType, label: string } | null>(null);

  const [startPoint, setStartPoint] = useState<[number, number, number] | null>(null);
  const [currentPoint, setCurrentPoint] = useState<[number, number, number] | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  
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
    const counts = computeUsedCounts(nodes, edges);
    const pipeType = String(length) as PartType;
    
    if (!allowedExcess[pipeType] && counts[pipeType] + 1 > stock[pipeType]) {
      setWarningModal({ 
        partType: pipeType, 
        label: length === 8 ? t.sidebar.pipeLong.name : length === 6 ? t.sidebar.pipeMedium.name : t.sidebar.pipeShort.name 
      });
      return false;
    }

    const startStr = start.join(',');
    const endStr = end.join(',');
    let newConns = 0;
    if (!nodes[startStr]) newConns++;
    if (!nodes[endStr]) newConns++;

    if (newConns > 0 && !allowedExcess['CONN'] && counts['CONN'] + newConns > stock['CONN']) {
      setWarningModal({ partType: 'CONN', label: '接头元件' });
      return false;
    }

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
    
    if (selectedEdgeId) {
      setSelectedEdgeId(null);
    }

    if (selectedTool === 'NONE') return;

    if (!startPoint && currentPoint) {
      if (isStartHoverError) return;
      setStartPoint(currentPoint);
    } else if (startPoint && currentPoint) {
      if (startPoint[0] === currentPoint[0] && startPoint[1] === currentPoint[1] && startPoint[2] === currentPoint[2]) return;
      if (isSegmentError) return;
      
      if (handleTryPlacePipe(startPoint, currentPoint, getTargetLength())) {
        setStartPoint(currentPoint);
      }
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

  if (!hasWebGL) {
    return (
      <div className="w-full h-full bg-neutral-900 border-none flex flex-col items-center justify-center p-8 m-0 text-white font-sans">
        <svg className="w-20 h-20 text-red-500 mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <h2 className="text-2xl font-bold mb-4 tracking-wider">3D 引擎启动失败</h2>
        <p className="text-white/70 max-w-lg text-center leading-relaxed mb-6">
          您的浏览器设备未能创建 WebGL 渲染上下文。
        </p>
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

      {warningModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-[#1e1e1e] border border-red-500/50 rounded-2xl w-[400px] shadow-[0_0_50px_rgba(239,68,68,0.2)] overflow-hidden">
            <div className="bg-red-500/10 p-6 flex flex-col items-center border-b border-red-500/20">
              <svg className="w-16 h-16 text-red-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              <h3 className="text-xl font-bold text-white tracking-wider">库存不足警告</h3>
            </div>
            <div className="p-6">
              <p className="text-white/80 text-center leading-relaxed">
                您的 <strong className="text-red-400 text-lg px-1">{warningModal.label}</strong> 预设库存量已耗尽。<br/><br/>
                如果不做设计删减并强行挂载，超发部分将被计入<strong className="text-cyan-400 px-1">外单采购成本</strong>。
              </p>
            </div>
            <div className="p-4 bg-black/20 flex gap-3 border-t border-white/5">
              <button onClick={() => setWarningModal(null)} className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 transition-colors font-medium">调整造型</button>
              <button 
                onClick={() => {
                  setAllowedExcess(warningModal.partType, true);
                  setWarningModal(null);
                }} 
                className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white transition-colors font-medium shadow-lg shadow-red-500/20"
              >
                继续添加 (算入成本)
              </button>
            </div>
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

      <Canvas camera={{ position: [4000, 2500, 5000], fov: 45, near: 50, far: 30000 }}>
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
                setStartPoint(null);
              }}
            />
          );
        })}
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
              if (isSegmentColliding(startPoint, target, edges, nodes)) return;
              if (handleTryPlacePipe(startPoint, target, getTargetLength())) {
                setStartPoint(target);
              }
            }}
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
                if (isSegmentColliding(edgeStartNode.position, target, edges, nodes)) return;
                if (handleTryPlacePipe(edgeStartNode.position, target, getTargetLength())) {
                  setSelectedEdgeId(null);
                  setStartPoint(target);
                }
              }}
            />
            <AxisCrosshair 
              startPoint={edgeEndNode.position} 
              length={getTargetLength() * 50} 
              onHover={(target) => getTargetLength() > 0 && setCurrentPoint(target)}
              onClick={(target) => {
                if (getTargetLength() === 0) return;
                if (isSegmentColliding(edgeEndNode.position, target, edges, nodes)) return;
                if (handleTryPlacePipe(edgeEndNode.position, target, getTargetLength())) {
                  setSelectedEdgeId(null);
                  setStartPoint(target);
                }
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
