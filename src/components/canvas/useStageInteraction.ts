'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { ThreeEvent } from '@react-three/fiber';
import { useSceneStore } from '@/store/useSceneStore';
import { useLocaleStore } from '@/store/useLocaleStore';
import { Snapping } from '@/core/engine/Snapping';
import { CoordinateUtils } from '@/core/utils/CoordinateUtils';
import { isPointOnEdgeBody, isSegmentColliding } from '@/core/engine/CollisionUtils';
import { enumeratePanelSlots } from '@/core/engine/SlotEnumerator';
import type { PanelSlot } from '@/core/engine/SlotEnumerator';
import { findSlotByRaycast } from './SlotRaycast';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { logUndo, logRedo, logPipeRemoved, logPanelRemoved, logPanelPlaced, logToolChanged, logValidationRejected } from '@/helpers/actionLog';

export function useStageInteraction(orbitRef: React.RefObject<OrbitControlsImpl | null>) {
  const selectedTool = useSceneStore(s => s.selectedTool);
  const placePipe = useSceneStore(s => s.placePipe);
  const removePipe = useSceneStore(s => s.removePipe);
  const nodes = useSceneStore(s => s.nodes);
  const edges = useSceneStore(s => s.edges);
  const panels = useSceneStore(s => s.panels);
  const placePanel = useSceneStore(s => s.placePanel);
  const removePanel = useSceneStore(s => s.removePanel);
  const t = useLocaleStore(s => s.t);

  const [startPoint, setStartPoint] = useState<[number, number, number] | null>(null);
  const [currentPoint, setCurrentPoint] = useState<[number, number, number] | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [selectedPanelId, setSelectedPanelId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const pointerDownPos = useRef<{ x: number, y: number } | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  }, []);

  const handlePointerDown = useCallback((e: ThreeEvent<PointerEvent>) => {
    pointerDownPos.current = { x: e.clientX, y: e.clientY };
  }, []);

  const isActuallyClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    if (!pointerDownPos.current) return true;
    const dx = e.clientX - pointerDownPos.current.x;
    const dy = e.clientY - pointerDownPos.current.y;
    return Math.sqrt(dx * dx + dy * dy) < 3;
  }, []);

  const getTargetLength = useCallback(() => {
    if (selectedTool === 'PIPE_LONG') return 8;
    if (selectedTool === 'PIPE_MEDIUM') return 6;
    if (selectedTool === 'PIPE_SHORT') return 4;
    return 0;
  }, [selectedTool]);

  const getPanelSize = useCallback((): [number, number] | null => {
    if (selectedTool === 'PANEL_LARGE') return [8, 8];
    if (selectedTool === 'PANEL_SMALL') return [8, 4];
    return null;
  }, [selectedTool]);

  // --- 槽位系统 ---
  const panelSlots = useMemo<PanelSlot[]>(() => {
    const size = getPanelSize();
    if (!size) return [];
    return enumeratePanelSlots(edges, size, panels);
  }, [edges, panels, selectedTool, getPanelSize]);

  const [hoveredSlotIndex, setHoveredSlotIndex] = useState<number | null>(null);

  const handleSlotClick = useCallback((index: number) => {
    const slot = panelSlots[index];
    if (!slot) return;
    const panelId = placePanel(slot.position, slot.size, slot.axis);
    logPanelPlaced(slot.position, slot.size, slot.axis, panelId);
  }, [panelSlots, placePanel]);
  // --- /槽位系统 ---

  const handleTryPlacePipe = useCallback((start: [number, number, number], end: [number, number, number], length: number): boolean => {
    const edgeId = CoordinateUtils.getEdgeKey(start, end);
    if (edges[edgeId]) {
      logValidationRejected('duplicate_edge', { start, end, length, edgeId });
      return false;
    }
    placePipe(start, end, length);
    return true;
  }, [edges, placePipe]);

  const isStartHoverError = selectedTool !== 'NONE' && !startPoint && currentPoint
    ? isPointOnEdgeBody(currentPoint, edges, nodes)
    : false;

  const isSegmentError = startPoint && currentPoint
    ? isSegmentColliding(startPoint, currentPoint, edges, nodes)
    : false;

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Undo/Redo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          const { redoStack } = useSceneStore.getState();
          if (redoStack.length > 0) {
            useSceneStore.getState().redo();
            logRedo();
          }
        } else {
          const { undoStack } = useSceneStore.getState();
          if (undoStack.length > 0) {
            useSceneStore.getState().undo();
            logUndo();
          }
        }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        const { redoStack } = useSceneStore.getState();
        if (redoStack.length > 0) {
          useSceneStore.getState().redo();
          logRedo();
        }
        return;
      }
      // Delete selected edge
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedEdgeId) {
        const edge = edges[selectedEdgeId];
        removePipe(selectedEdgeId);
        if (edge) logPipeRemoved(selectedEdgeId, edge.start, edge.end, edge.length);
        setSelectedEdgeId(null);
      }
      // Delete selected panel
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedPanelId) {
        const panel = panels[selectedPanelId];
        removePanel(selectedPanelId);
        if (panel) logPanelRemoved(selectedPanelId, panel.position, panel.size, panel.axis);
        setSelectedPanelId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedEdgeId, selectedPanelId, removePipe, removePanel]);

  const handleResetCamera = useCallback(() => {
    if (orbitRef.current) {
      orbitRef.current.reset();
    }
    setStartPoint(null);
    setCurrentPoint(null);
    setSelectedEdgeId(null);
    setSelectedPanelId(null);
    if (useSceneStore.getState().selectedTool !== 'NONE') {
      useSceneStore.getState().setSelectedTool('NONE');
      logToolChanged('NONE');
    }
  }, [orbitRef]);

  const handlePointerMove = useCallback((e: ThreeEvent<PointerEvent>) => {
    if (selectedTool === 'NONE') {
      setCurrentPoint(null);
      return;
    }

    // 面板工具：通过射线投射检测槽位
    if (getPanelSize()) {
      const isGroundNearest = e.intersections.length === 0 || e.intersections[0].object === e.eventObject;
      if (!isGroundNearest) { setHoveredSlotIndex(null); return; }
      const idx = findSlotByRaycast(e.ray, panelSlots);
      setHoveredSlotIndex(idx >= 0 ? idx : null);
      return;
    }

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
  }, [selectedTool, startPoint, getPanelSize, getTargetLength, panelSlots]);

  const handleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (!isActuallyClick(e)) return;

    if (selectedEdgeId) setSelectedEdgeId(null);
    if (selectedPanelId) setSelectedPanelId(null);
    if (selectedTool === 'NONE') return;

    // 面板工具：通过射线投射检测并放置槽位
    if (getPanelSize()) {
      if (startPoint) return;
      const isGroundNearest = e.intersections.length === 0 || e.intersections[0].object === e.eventObject;
      if (!isGroundNearest) return;
      const idx = findSlotByRaycast(e.ray, panelSlots);
      if (idx >= 0) handleSlotClick(idx);
      return;
    }

    if (!startPoint && currentPoint) {
      if (isStartHoverError) return;
      setStartPoint(currentPoint);
    } else if (startPoint && currentPoint) {
      return;
    }
  }, [isActuallyClick, selectedEdgeId, selectedPanelId, selectedTool, startPoint, currentPoint, isStartHoverError, getPanelSize, panelSlots, handleSlotClick]);

  const handleContextMenu = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (selectedEdgeId) {
      setSelectedEdgeId(null);
    } else if (selectedPanelId) {
      setSelectedPanelId(null);
    } else if (startPoint) {
      setStartPoint(null);
    } else {
      if (useSceneStore.getState().selectedTool !== 'NONE') {
        useSceneStore.getState().setSelectedTool('NONE');
        logToolChanged('NONE');
      }
      setCurrentPoint(null);
    }
  }, [selectedEdgeId, selectedPanelId, startPoint]);

  const edgeStartNode = selectedEdgeId ? nodes[edges[selectedEdgeId]?.start] : null;
  const edgeEndNode = selectedEdgeId ? nodes[edges[selectedEdgeId]?.end] : null;

  return {
    // State
    startPoint, setStartPoint,
    currentPoint, setCurrentPoint,
    selectedEdgeId, setSelectedEdgeId,
    selectedPanelId, setSelectedPanelId,
    toastMsg,
    // Slot system
    panelSlots,
    hoveredSlotIndex, setHoveredSlotIndex,
    handleSlotClick,
    // Derived
    isStartHoverError,
    isSegmentError,
    edgeStartNode,
    edgeEndNode,
    getTargetLength,
    // Handlers
    handlePointerDown,
    isActuallyClick,
    handlePointerMove,
    handleClick,
    handleContextMenu,
    handleTryPlacePipe,
    handleResetCamera,
    showToast,
    // Store data
    selectedTool,
    nodes, edges, panels,
    placePipe, removePipe, placePanel, removePanel,
    t,
  };
}
