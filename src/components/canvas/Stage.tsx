'use client';

import { useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import { isSegmentColliding } from '@/core/engine/CollisionUtils';
import Pipe from './Pipe';
import InstancedPipes from './InstancedPipes';
import Connector from './Connector';
import InstancedConnectors from './InstancedConnectors';
import Panel from './Panel';
import InstancedPanels from './InstancedPanels';
import PanelSlotOverlays from './PanelSlotOverlays';
import AxisCrosshair from './AxisCrosshair';
import WebGLFallback, { useWebGLState } from './WebGLFallback';
import CanvasErrorBoundary from './CanvasErrorBoundary';
import { useStageInteraction } from './useStageInteraction';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';

export default function Stage() {
  const { hasWebGL, contextLost, setContextLost } = useWebGLState();
  const orbitRef = useRef<OrbitControlsImpl>(null);
  const {
    startPoint, setStartPoint,
    currentPoint, setCurrentPoint,
    selectedEdgeId, setSelectedEdgeId,
    selectedPanelId, setSelectedPanelId,
    toastMsg,
    panelSlots,
    hoveredSlotIndex,
    isStartHoverError,
    isSegmentError,
    edgeStartNode,
    edgeEndNode,
    getTargetLength,
    handlePointerDown,
    isActuallyClick,
    handlePointerMove,
    handleClick,
    handleContextMenu,
    handleTryPlacePipe,
    handleResetCamera,
    showToast,
    selectedTool,
    nodes, edges, panels,
    removePipe, removePanel,
    t,
  } = useStageInteraction(orbitRef);

  if (!hasWebGL || contextLost) {
    return <WebGLFallback contextLost={contextLost} />;
  }

  return (
    <div className="w-full h-full bg-neutral-900 border-none outline-none overflow-hidden m-0 p-0" onContextMenu={(e) => e.preventDefault()}>

      {/* Top-right controls */}
      <div className="absolute top-6 right-[350px] z-10 flex gap-4">
        <button
          onClick={handleResetCamera}
          aria-label={t.button.centerView}
          className="bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white text-sm px-6 py-2 rounded-full shadow-xl transition-all font-semibold tracking-wide"
        >
          {t.button.centerView}
        </button>
      </div>

      {/* Toast notification */}
      {toastMsg && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
          <div role="alert" aria-live="polite" className="bg-red-500/90 text-white px-6 py-3 rounded-full shadow-2xl backdrop-blur-md border border-red-400 font-medium flex items-center gap-3">
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            {toastMsg}
          </div>
        </div>
      )}

      {/* Delete edge button */}
      {selectedEdgeId && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-10 flex gap-4">
          <button
            aria-label={t.button.deletePipe}
            onClick={() => {
              removePipe(selectedEdgeId);
              setSelectedEdgeId(null);
            }}
            className="bg-red-500/80 hover:bg-red-500 backdrop-blur-md border border-red-400 text-white text-sm px-8 py-3 rounded-full shadow-2xl transition-all font-semibold tracking-wide flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            {t.button.deletePipe}
          </button>
        </div>
      )}

      {/* Delete panel button */}
      {selectedPanelId && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-10 flex gap-4">
          <button
            aria-label={t.button.deletePanel}
            onClick={() => {
              removePanel(selectedPanelId);
              setSelectedPanelId(null);
            }}
            className="bg-red-500/80 hover:bg-red-500 backdrop-blur-md border border-red-400 text-white text-sm px-8 py-3 rounded-full shadow-2xl transition-all font-semibold tracking-wide flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            {t.button.deletePanel}
          </button>
        </div>
      )}

      <CanvasErrorBoundary>
      <Canvas
        camera={{ position: [4000, 2500, 5000], fov: 45, near: 50, far: 30000 }}
        gl={{ powerPreference: 'high-performance', antialias: true, stencil: false, alpha: false }}
        onCreated={({ gl }) => {
          const canvas = gl.domElement;
          canvas.addEventListener('webglcontextlost', (e) => {
            e.preventDefault();
            setContextLost(true);
          }, false);
          canvas.addEventListener('webglcontextrestored', () => {
            setContextLost(false);
          }, false);
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

        {/* Ground plane border */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -40, 0]} renderOrder={-1}>
          <planeGeometry args={[8040, 8040]} />
          <meshBasicMaterial color="#3b82f6" depthWrite={false} />
        </mesh>

        {/* Ground plane */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -30, 0]}>
          <planeGeometry args={[8000, 8000]} />
          <meshStandardMaterial color="#111111" roughness={0.9} depthWrite={false} />
        </mesh>

        {/* Invisible interaction plane */}
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
              const dx = Math.abs(target[0] - startPoint[0]);
              const dy = Math.abs(target[1] - startPoint[1]);
              const dz = Math.abs(target[2] - startPoint[2]);

              const nonZeroDiffs = [dx, dy, dz].filter(d => d > 0.01).length;
              const actualDistance = Math.sqrt(dx * dx + dy * dy + dz * dz);
              const targetLen = getTargetLength() * 50;

              if (nonZeroDiffs > 1) {
                if (dy > 0.01) showToast(t.toast.notSameLevel);
                else showToast(t.toast.notOnAxis);
                return;
              }
              if (Math.abs(actualDistance - targetLen) > 0.1) {
                showToast(t.toast.lengthMismatch(getTargetLength(), Math.round(actualDistance / 50)));
                return;
              }
              if (isSegmentColliding(startPoint, target, edges, nodes)) {
                showToast(t.toast.collision);
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
        <InstancedPanels
          panels={panels}
          onPointerDown={handlePointerDown}
          onPanelClick={(panelId, e) => {
            e.stopPropagation();
            if (!isActuallyClick(e)) return;
            setSelectedPanelId(panelId);
            setStartPoint(null);
          }}
        />

        {/* Preview ghost: connector at cursor */}
        {selectedTool !== 'NONE' && currentPoint && !startPoint && (
          <Connector position={currentPoint} isPreview isError={isStartHoverError} />
        )}

        {/* Preview ghost: pipe segment being placed */}
        {startPoint && currentPoint && (
          <group>
            <Connector position={startPoint} isPreview />
            <Pipe start={startPoint} end={currentPoint} isPreview isError={isSegmentError} />
            <Connector position={currentPoint} isPreview isError={isSegmentError} />
          </group>
        )}

        {/* Panel slot overlays */}
        {panelSlots.length > 0 && (
          <PanelSlotOverlays
            slots={panelSlots}
          />
        )}

        {/* Hover preview on slot */}
        {hoveredSlotIndex !== null && panelSlots[hoveredSlotIndex] && (
          <Panel
            position={panelSlots[hoveredSlotIndex].position}
            size={panelSlots[hoveredSlotIndex].size}
            axis={panelSlots[hoveredSlotIndex].axis}
            isPreview
          />
        )}

        {/* Axis crosshair for active placement */}
        {startPoint && !selectedEdgeId && (
          <AxisCrosshair
            startPoint={startPoint}
            length={getTargetLength() * 50}
            onHover={(target) => setCurrentPoint(target)}
            onClick={(target) => {
              if (isSegmentColliding(startPoint, target, edges, nodes)) {
                showToast(t.toast.collision);
                return;
              }
              if (handleTryPlacePipe(startPoint, target, getTargetLength())) {
                setStartPoint(target);
              }
            }}
            onPointerDown={handlePointerDown}
          />
        )}

        {/* Axis crosshairs at selected edge endpoints */}
        {selectedEdgeId && edgeStartNode && edgeEndNode && !startPoint && (
          <group>
            <AxisCrosshair
              startPoint={edgeStartNode.position}
              length={getTargetLength() * 50}
              onHover={(target) => getTargetLength() > 0 && setCurrentPoint(target)}
              onClick={(target) => {
                if (getTargetLength() === 0) return;
                if (isSegmentColliding(edgeStartNode.position, target, edges, nodes)) {
                  showToast(t.toast.collision);
                  return;
                }
                if (handleTryPlacePipe(edgeStartNode.position, target, getTargetLength())) {
                  setSelectedEdgeId(null);
                  setStartPoint(target);
                }
              }}
              onPointerDown={handlePointerDown}
            />
            <AxisCrosshair
              startPoint={edgeEndNode.position}
              length={getTargetLength() * 50}
              onHover={(target) => getTargetLength() > 0 && setCurrentPoint(target)}
              onClick={(target) => {
                if (getTargetLength() === 0) return;
                if (isSegmentColliding(edgeEndNode.position, target, edges, nodes)) {
                  showToast(t.toast.collision);
                  return;
                }
                if (handleTryPlacePipe(edgeEndNode.position, target, getTargetLength())) {
                  setSelectedEdgeId(null);
                  setStartPoint(target);
                }
              }}
              onPointerDown={handlePointerDown}
            />
          </group>
        )}

        <OrbitControls
          ref={orbitRef}
          makeDefault
          maxPolarAngle={Math.PI / 2 - 0.05}
          minDistance={200}
          maxDistance={12000}
          enablePan={true}
        />
      </Canvas>
      </CanvasErrorBoundary>
    </div>
  );
}
