import { useLogStore } from '@/store/useLogStore';

function append(entry: Parameters<ReturnType<typeof useLogStore.getState>['append']>[0]) {
  useLogStore.getState().append(entry);
}

// ---- 成功操作 ----

export function logPipePlaced(start: number[], end: number[], length: number, edgeId: string) {
  append({
    action: 'pipe:place',
    result: 'success',
    payload: { start, end, length, edgeId },
  });
}

export function logPipeRemoved(edgeId: string, startNodeId: string, endNodeId: string, length: number) {
  append({
    action: 'pipe:remove',
    result: 'success',
    payload: { edgeId, startNodeId, endNodeId, length },
  });
}

export function logPanelPlaced(position: number[], size: number[], axis: string, panelId: string) {
  append({
    action: 'panel:place',
    result: 'success',
    payload: { position, size, axis, panelId },
  });
}

export function logPanelRemoved(panelId: string, position: number[], size: number[], axis: string) {
  append({
    action: 'panel:remove',
    result: 'success',
    payload: { panelId, position, size, axis },
  });
}

export function logUndo() {
  append({ action: 'undo', result: 'success' });
}

export function logRedo() {
  append({ action: 'redo', result: 'success' });
}

export function logToolChanged(tool: string) {
  append({
    action: 'tool:changed',
    result: 'success',
    payload: { tool },
  });
}

export function logSceneLoaded(nodeCount: number, edgeCount: number, panelCount: number) {
  append({
    action: 'scene:loaded',
    result: 'success',
    payload: { nodeCount, edgeCount, panelCount },
  });
}

export function logSceneCleared(nodeCount: number, edgeCount: number, panelCount: number) {
  append({
    action: 'scene:cleared',
    result: 'success',
    payload: { nodeCount, edgeCount, panelCount },
  });
}

// ---- 验证失败 ----

export function logValidationRejected(reason: string, context?: Record<string, unknown>) {
  append({
    action: 'validation:rejected',
    result: 'rejected',
    payload: context,
    reason,
  });
}
