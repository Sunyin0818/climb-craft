import { NodeInstance, EdgeInstance } from '@/store/useSceneStore';

type Point = [number, number, number];

/**
 * Check if a point is strictly inside an interval (a, b)
 */
function isBetweenStrict(p: number, a: number, b: number) {
  return p > Math.min(a, b) && p < Math.max(a, b);
}

/**
 * Returns true if point P lies strictly on the body of the edge (excluding endpoints)
 */
export function isPointOnEdgeBody(
  p: Point,
  edges: Record<string, EdgeInstance>,
  nodes: Record<string, NodeInstance>
): boolean {
  for (const edge of Object.values(edges)) {
    const A = nodes[edge.start]?.position;
    const B = nodes[edge.end]?.position;
    if (!A || !B) continue;

    if (A[0] !== B[0]) { // X-axis line
      if (p[1] === A[1] && p[2] === A[2] && isBetweenStrict(p[0], A[0], B[0])) return true;
    } else if (A[1] !== B[1]) { // Y-axis line
      if (p[0] === A[0] && p[2] === A[2] && isBetweenStrict(p[1], A[1], B[1])) return true;
    } else if (A[2] !== B[2]) { // Z-axis line
      if (p[0] === A[0] && p[1] === A[1] && isBetweenStrict(p[2], A[2], B[2])) return true;
    }
  }
  return false;
}

/**
 * Check if two intervals [a1, b1] and [a2, b2] overlap with a shared interior
 */
function doIntervalsOverlapStrictly(a1: number, b1: number, a2: number, b2: number) {
  const min1 = Math.min(a1, b1), max1 = Math.max(a1, b1);
  const min2 = Math.min(a2, b2), max2 = Math.max(a2, b2);
  return Math.max(min1, min2) < Math.min(max1, max2);
}

/**
 * Returns true if the segment [start, end] structurally collides with any existing edge.
 */
export function isSegmentColliding(
  start: Point,
  end: Point,
  edges: Record<string, EdgeInstance>,
  nodes: Record<string, NodeInstance>
): boolean {
  // Case 1: Start or End point tries to intersect the body of an existing edge
  if (isPointOnEdgeBody(start, edges, nodes)) return true;
  if (isPointOnEdgeBody(end, edges, nodes)) return true;

  let axisNew = -1;
  if (start[0] !== end[0]) axisNew = 0;
  else if (start[1] !== end[1]) axisNew = 1;
  else if (start[2] !== end[2]) axisNew = 2;

  if (axisNew === -1) return false;

  // Case 2: The new segment engulfs an existing node (passes THROUGH a node seamlessly)
  for (const node of Object.values(nodes)) {
    const P = node.position;
    const otherAxes = [0, 1, 2].filter((i) => i !== axisNew);
    if (P[otherAxes[0]] === start[otherAxes[0]] && P[otherAxes[1]] === start[otherAxes[1]]) {
      if (isBetweenStrict(P[axisNew], start[axisNew], end[axisNew])) {
        return true; 
      }
    }
  }

  // Case 3: Overlaps or Orthogonal Crossings with existing edges
  for (const edge of Object.values(edges)) {
    const A = nodes[edge.start]?.position;
    const B = nodes[edge.end]?.position;
    if (!A || !B) continue;

    let axisOld = -1;
    if (A[0] !== B[0]) axisOld = 0;
    else if (A[1] !== B[1]) axisOld = 1;
    else if (A[2] !== B[2]) axisOld = 2;

    if (axisOld === -1) continue;

    if (axisNew === axisOld) {
      // Collinear Check
      const otherAxes = [0, 1, 2].filter((i) => i !== axisNew);
      const isSameLine = start[otherAxes[0]] === A[otherAxes[0]] && start[otherAxes[1]] === A[otherAxes[1]];
      if (isSameLine) {
        if (doIntervalsOverlapStrictly(start[axisNew], end[axisNew], A[axisOld], B[axisOld])) {
          return true;
        }
      }
    } else {
      // Orthogonal Cross Check
      const constAxis = [0, 1, 2].find((i) => i !== axisNew && i !== axisOld);
      if (constAxis === undefined) continue;
      
      if (start[constAxis] !== A[constAxis]) continue;

      const intersectPoint = [...start];
      intersectPoint[axisNew] = A[axisNew];
      intersectPoint[axisOld] = start[axisOld];

      if (isBetweenStrict(intersectPoint[axisNew], start[axisNew], end[axisNew]) &&
          isBetweenStrict(intersectPoint[axisOld], A[axisOld], B[axisOld])) {
        return true;
      }
    }
  }

  return false;
}
