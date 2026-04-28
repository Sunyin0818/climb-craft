'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { ThreeEvent } from '@react-three/fiber';
import { useSceneStore } from '@/store/useSceneStore';
import { useLocaleStore } from '@/store/useLocaleStore';
import { Snapping } from '@/core/engine/Snapping';
import { CoordinateUtils } from '@/core/utils/CoordinateUtils';
import { isPointOnEdgeBody, isSegmentColliding } from '@/core/engine/CollisionUtils';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';

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
  const [panelPreview, setPanelPreview] = useState<{
    position: [number, number, number];
    size: [number, number];
    axis: 'x' | 'y' | 'z';
  } | null>(null);
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

  const findValidPanelHole = useCallback((point: [number, number, number], size: [number, number]) => {
    const [W, H] = size;
    const planes: ('x' | 'y' | 'z')[] = ['x', 'y', 'z'];

    for (const axis of planes) {
      const checkRectangle = (origin: [number, number, number], w: number, h: number, ax: 'x' | 'y' | 'z') => {
        const boundaryEdges: string[] = [];
        if (ax === 'y') {
          boundaryEdges.push(CoordinateUtils.getEdgeKey(origin, [origin[0] + w, origin[1], origin[2]]));
          boundaryEdges.push(CoordinateUtils.getEdgeKey([origin[0] + w, origin[1], origin[2]], [origin[0] + w, origin[1], origin[2] + h]));
          boundaryEdges.push(CoordinateUtils.getEdgeKey([origin[0] + w, origin[1], origin[2] + h], [origin[0], origin[1], origin[2] + h]));
          boundaryEdges.push(CoordinateUtils.getEdgeKey([origin[0], origin[1], origin[2] + h], origin));
        } else if (ax === 'x') {
          boundaryEdges.push(CoordinateUtils.getEdgeKey(origin, [origin[0], origin[1] + w, origin[2]]));
          boundaryEdges.push(CoordinateUtils.getEdgeKey([origin[0], origin[1] + w, origin[2]], [origin[0], origin[1] + w, origin[2] + h]));
          boundaryEdges.push(CoordinateUtils.getEdgeKey([origin[0], origin[1] + w, origin[2] + h], [origin[0], origin[1], origin[2] + h]));
          boundaryEdges.push(CoordinateUtils.getEdgeKey([origin[0], origin[1], origin[2] + h], origin));
        } else if (ax === 'z') {
          boundaryEdges.push(CoordinateUtils.getEdgeKey(origin, [origin[0] + w, origin[1], origin[2]]));
          boundaryEdges.push(CoordinateUtils.getEdgeKey([origin[0] + w, origin[1], origin[2]], [origin[0] + w, origin[1] + h, origin[2]]));
          boundaryEdges.push(CoordinateUtils.getEdgeKey([origin[0] + w, origin[1] + h, origin[2]], [origin[0], origin[1] + h, origin[2]]));
          boundaryEdges.push(CoordinateUtils.getEdgeKey([origin[0], origin[1] + h, origin[2]], origin));
        }
        return boundaryEdges.every(key => edges[key]);
      };

      const sizesToTry: [number, number][] = W === H ? [[W, H]] : [[W, H], [H, W]];

      for (const [sw, sh] of sizesToTry) {
        const offsets = [-8, -4, 0];
        for (const ox of offsets) {
          for (const oy of offsets) {
            for (const oz of offsets) {
              const testOrigin: [number, number, number] = [point[0] + ox, point[1] + oy, point[2] + oz];
              if (checkRectangle(testOrigin, sw, sh, axis)) {
                return { position: testOrigin, size: [sw, sh] as [number, number], axis };
              }
            }
          }
        }
      }
    }
    return null;
  }, [edges]);

  const handleTryPlacePipe = useCallback((start: [number, number, number], end: [number, number, number], length: number): boolean => {
    const edgeId = CoordinateUtils.getEdgeKey(start, end);
    if (edges[edgeId]) return false;
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
          useSceneStore.getState().redo();
        } else {
          useSceneStore.getState().undo();
        }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        useSceneStore.getState().redo();
        return;
      }
      // Delete selected edge
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedEdgeId) {
        removePipe(selectedEdgeId);
        setSelectedEdgeId(null);
      }
      // Delete selected panel
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedPanelId) {
        removePanel(selectedPanelId);
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
    useSceneStore.getState().setSelectedTool('NONE');
  }, [orbitRef]);

  const handlePointerMove = useCallback((e: ThreeEvent<PointerEvent>) => {
    if (selectedTool === 'NONE') {
      setCurrentPoint(null);
      setPanelPreview(null);
      return;
    }

    const snapped = Snapping.snapToGrid([e.point.x, e.point.y, e.point.z]);

    const panelSize = getPanelSize();
    if (panelSize) {
      const hole = findValidPanelHole(snapped, panelSize);
      if (hole) {
        setPanelPreview(hole);
        setCurrentPoint(null);
        return;
      } else {
        setPanelPreview(null);
      }
    }

    if (!startPoint) {
      setCurrentPoint(snapped);
    } else {
      const len = getTargetLength();
      if (len > 0) {
        const axisSnapped = Snapping.snapToAxis(startPoint, snapped, len);
        setCurrentPoint(axisSnapped);
      }
    }
  }, [selectedTool, startPoint, getPanelSize, getTargetLength, findValidPanelHole]);

  const handleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (!isActuallyClick(e)) return;

    if (selectedEdgeId) setSelectedEdgeId(null);
    if (selectedPanelId) setSelectedPanelId(null);
    if (selectedTool === 'NONE') return;

    if (panelPreview) {
      placePanel(panelPreview.position, panelPreview.size, panelPreview.axis);
      return;
    }

    if (!startPoint && currentPoint) {
      if (isStartHoverError) return;
      setStartPoint(currentPoint);
    } else if (startPoint && currentPoint) {
      return;
    }
  }, [isActuallyClick, selectedEdgeId, selectedPanelId, selectedTool, panelPreview, startPoint, currentPoint, isStartHoverError, placePanel]);

  const handleContextMenu = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (selectedEdgeId) {
      setSelectedEdgeId(null);
    } else if (selectedPanelId) {
      setSelectedPanelId(null);
    } else if (startPoint) {
      setStartPoint(null);
    } else {
      useSceneStore.getState().setSelectedTool('NONE');
      setCurrentPoint(null);
      setPanelPreview(null);
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
    panelPreview,
    toastMsg,
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
