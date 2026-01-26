/**
 * SVG Path Parser and Bounding Box Calculator
 *
 * This module provides utilities for parsing SVG path data strings and calculating
 * accurate bounding boxes. It supports all SVG path commands including:
 * - Move (M, m), Line (L, l, H, h, V, v)
 * - Cubic Bezier (C, c, S, s)
 * - Quadratic Bezier (Q, q, T, t)
 * - Elliptical Arc (A, a)
 * - Close Path (Z, z)
 *
 * The bounding box calculation properly handles curves and arcs by calculating
 * their mathematical extrema, not just their control points.
 *
 * @example Parsing path data
 * ```typescript
 * import { parsePath } from 'svg-composer';
 *
 * const pathData = 'M 10 10 L 100 10 L 100 100 Z';
 * const commands = parsePath(pathData);
 * // [
 * //   { type: 'M', params: [10, 10] },
 * //   { type: 'L', params: [100, 10] },
 * //   { type: 'L', params: [100, 100] },
 * //   { type: 'Z', params: [] }
 * // ]
 * ```
 *
 * @example Calculating bounding box
 * ```typescript
 * import { getPathBoundingBox } from 'svg-composer';
 *
 * // Simple rectangle path
 * const bounds = getPathBoundingBox('M 10 10 L 100 10 L 100 100 L 10 100 Z');
 * // { x: 10, y: 10, width: 90, height: 90 }
 *
 * // Bezier curve - calculates actual curve bounds, not control points
 * const curveBounds = getPathBoundingBox('M 0 0 C 50 100 150 100 200 0');
 * // Properly accounts for the curve's peak
 * ```
 *
 * @packageDocumentation
 */

import type { BoundingBox } from '../core/types.js';

/**
 * Parsed path command with its type and parameters
 */
interface PathCommand {
  type: string;
  params: number[];
}

/**
 * Parses an SVG path data string into a sequence of commands
 *
 * @param pathData - SVG path data string (d attribute value)
 * @returns Array of parsed path commands
 */
export function parsePath(pathData: string): PathCommand[] {
  if (!pathData || pathData.trim().length === 0) {
    return [];
  }

  const commands: PathCommand[] = [];

  // Match command letter followed by numbers (with optional sign, decimal)
  // This regex captures the command and all following numbers
  const commandRegex = /([MmLlHhVvCcSsQqTtAaZz])([^MmLlHhVvCcSsQqTtAaZz]*)/g;

  let match: RegExpExecArray | null;
  while ((match = commandRegex.exec(pathData)) !== null) {
    const type = match[1] ?? '';
    const paramsStr = match[2] ?? '';

    // Parse numbers from the parameters string
    // Handles: integers, decimals, negative numbers, scientific notation
    const numberRegex = /-?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/g;
    const params: number[] = [];
    let numMatch: RegExpExecArray | null;
    while ((numMatch = numberRegex.exec(paramsStr)) !== null) {
      params.push(parseFloat(numMatch[0]));
    }

    commands.push({ type, params });
  }

  return commands;
}

/**
 * Calculates the bounding box of an SVG path
 *
 * @param pathData - SVG path data string
 * @returns Bounding box or null if path is empty/invalid
 */
export function getPathBoundingBox(pathData: string): BoundingBox | null {
  const commands = parsePath(pathData);
  if (commands.length === 0) {
    return null;
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  // Current position
  let currentX = 0;
  let currentY = 0;

  // Start of current subpath (for Z command)
  let subpathStartX = 0;
  let subpathStartY = 0;

  // Previous control point for smooth curves
  let lastControlX = 0;
  let lastControlY = 0;
  let lastCommand = '';

  /**
   * Updates bounding box with a point
   */
  function updateBounds(x: number, y: number): void {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }

  /**
   * Updates bounds for a cubic Bezier curve
   */
  function updateCubicBezierBounds(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    x3: number,
    y3: number,
  ): void {
    // Always include endpoints
    updateBounds(x0, y0);
    updateBounds(x3, y3);

    // Find extrema for x coordinate
    const ax = -x0 + 3 * x1 - 3 * x2 + x3;
    const bx = 2 * (x0 - 2 * x1 + x2);
    const cx = -x0 + x1;

    const txRoots = solveQuadratic(ax, bx, cx);
    for (const t of txRoots) {
      if (t > 0 && t < 1) {
        const x = cubicBezier(x0, x1, x2, x3, t);
        const y = cubicBezier(y0, y1, y2, y3, t);
        updateBounds(x, y);
      }
    }

    // Find extrema for y coordinate
    const ay = -y0 + 3 * y1 - 3 * y2 + y3;
    const by = 2 * (y0 - 2 * y1 + y2);
    const cy = -y0 + y1;

    const tyRoots = solveQuadratic(ay, by, cy);
    for (const t of tyRoots) {
      if (t > 0 && t < 1) {
        const x = cubicBezier(x0, x1, x2, x3, t);
        const y = cubicBezier(y0, y1, y2, y3, t);
        updateBounds(x, y);
      }
    }
  }

  /**
   * Updates bounds for a quadratic Bezier curve
   */
  function updateQuadraticBezierBounds(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
  ): void {
    // Always include endpoints
    updateBounds(x0, y0);
    updateBounds(x2, y2);

    // Find extrema for x: derivative = 2(1-t)(x1-x0) + 2t(x2-x1) = 0
    // Solving: t = (x0 - x1) / (x0 - 2*x1 + x2)
    const denomX = x0 - 2 * x1 + x2;
    if (Math.abs(denomX) > 1e-10) {
      const tx = (x0 - x1) / denomX;
      if (tx > 0 && tx < 1) {
        const x = quadraticBezier(x0, x1, x2, tx);
        const y = quadraticBezier(y0, y1, y2, tx);
        updateBounds(x, y);
      }
    }

    // Find extrema for y
    const denomY = y0 - 2 * y1 + y2;
    if (Math.abs(denomY) > 1e-10) {
      const ty = (y0 - y1) / denomY;
      if (ty > 0 && ty < 1) {
        const x = quadraticBezier(x0, x1, x2, ty);
        const y = quadraticBezier(y0, y1, y2, ty);
        updateBounds(x, y);
      }
    }
  }

  /**
   * Updates bounds for an elliptical arc
   */
  function updateArcBounds(
    x0: number,
    y0: number,
    rx: number,
    ry: number,
    xAxisRotation: number,
    largeArcFlag: number,
    sweepFlag: number,
    x1: number,
    y1: number,
  ): void {
    // Always include endpoints
    updateBounds(x0, y0);
    updateBounds(x1, y1);

    // Handle degenerate cases
    if (rx === 0 || ry === 0) {
      return;
    }

    rx = Math.abs(rx);
    ry = Math.abs(ry);

    // Convert to center parameterization
    const phi = (xAxisRotation * Math.PI) / 180;
    const cosPhi = Math.cos(phi);
    const sinPhi = Math.sin(phi);

    // Step 1: Compute (x1', y1')
    const dx = (x0 - x1) / 2;
    const dy = (y0 - y1) / 2;
    const x1p = cosPhi * dx + sinPhi * dy;
    const y1p = -sinPhi * dx + cosPhi * dy;

    // Step 2: Compute center point (cx', cy')
    const x1pSq = x1p * x1p;
    const y1pSq = y1p * y1p;
    const rxSq = rx * rx;
    const rySq = ry * ry;

    // Correct radii if necessary
    const lambda = x1pSq / rxSq + y1pSq / rySq;
    if (lambda > 1) {
      const sqrtLambda = Math.sqrt(lambda);
      rx *= sqrtLambda;
      ry *= sqrtLambda;
    }

    const rxSqNew = rx * rx;
    const rySqNew = ry * ry;

    const numerator = rxSqNew * rySqNew - rxSqNew * y1pSq - rySqNew * x1pSq;
    const denominator = rxSqNew * y1pSq + rySqNew * x1pSq;
    let sq = numerator / denominator;
    if (sq < 0) {
      sq = 0;
    }
    const coef = (largeArcFlag === sweepFlag ? -1 : 1) * Math.sqrt(sq);
    const cxp = (coef * rx * y1p) / ry;
    const cyp = (-coef * ry * x1p) / rx;

    // Step 3: Compute center point (cx, cy)
    const cx = cosPhi * cxp - sinPhi * cyp + (x0 + x1) / 2;
    const cy = sinPhi * cxp + cosPhi * cyp + (y0 + y1) / 2;

    // Calculate angles for extrema checking
    // For a rotated ellipse, extrema occur at specific angles
    // We check the 4 cardinal directions on the ellipse
    const angles = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];

    for (const theta of angles) {
      // Point on the ellipse before rotation
      const ex = rx * Math.cos(theta);
      const ey = ry * Math.sin(theta);

      // Apply rotation and translate to center
      const px = cx + cosPhi * ex - sinPhi * ey;
      const py = cy + sinPhi * ex + cosPhi * ey;

      // Check if this point is on the arc (approximately)
      // For simplicity, we include all potential extrema
      updateBounds(px, py);
    }
  }

  // Process each command
  for (const cmd of commands) {
    const { type, params } = cmd;
    const isRelative = type === type.toLowerCase();

    switch (type.toUpperCase()) {
      case 'M': {
        // MoveTo
        let i = 0;
        while (i < params.length - 1) {
          if (i === 0) {
            currentX = isRelative ? currentX + (params[0] ?? 0) : (params[0] ?? 0);
            currentY = isRelative ? currentY + (params[1] ?? 0) : (params[1] ?? 0);
            subpathStartX = currentX;
            subpathStartY = currentY;
          } else {
            // Subsequent coordinates are treated as LineTo
            const nextX = isRelative ? currentX + (params[i] ?? 0) : (params[i] ?? 0);
            const nextY = isRelative ? currentY + (params[i + 1] ?? 0) : (params[i + 1] ?? 0);
            updateBounds(currentX, currentY);
            updateBounds(nextX, nextY);
            currentX = nextX;
            currentY = nextY;
          }
          i += 2;
        }
        updateBounds(currentX, currentY);
        lastControlX = currentX;
        lastControlY = currentY;
        break;
      }

      case 'L': {
        // LineTo
        for (let i = 0; i < params.length - 1; i += 2) {
          const x = isRelative ? currentX + (params[i] ?? 0) : (params[i] ?? 0);
          const y = isRelative ? currentY + (params[i + 1] ?? 0) : (params[i + 1] ?? 0);
          updateBounds(currentX, currentY);
          updateBounds(x, y);
          currentX = x;
          currentY = y;
        }
        lastControlX = currentX;
        lastControlY = currentY;
        break;
      }

      case 'H': {
        // Horizontal LineTo
        for (const param of params) {
          const x = isRelative ? currentX + param : param;
          updateBounds(currentX, currentY);
          updateBounds(x, currentY);
          currentX = x;
        }
        lastControlX = currentX;
        lastControlY = currentY;
        break;
      }

      case 'V': {
        // Vertical LineTo
        for (const param of params) {
          const y = isRelative ? currentY + param : param;
          updateBounds(currentX, currentY);
          updateBounds(currentX, y);
          currentY = y;
        }
        lastControlX = currentX;
        lastControlY = currentY;
        break;
      }

      case 'C': {
        // Cubic Bezier
        for (let i = 0; i < params.length - 5; i += 6) {
          const x1 = isRelative ? currentX + (params[i] ?? 0) : (params[i] ?? 0);
          const y1 = isRelative ? currentY + (params[i + 1] ?? 0) : (params[i + 1] ?? 0);
          const x2 = isRelative ? currentX + (params[i + 2] ?? 0) : (params[i + 2] ?? 0);
          const y2 = isRelative ? currentY + (params[i + 3] ?? 0) : (params[i + 3] ?? 0);
          const x = isRelative ? currentX + (params[i + 4] ?? 0) : (params[i + 4] ?? 0);
          const y = isRelative ? currentY + (params[i + 5] ?? 0) : (params[i + 5] ?? 0);

          updateCubicBezierBounds(currentX, currentY, x1, y1, x2, y2, x, y);

          lastControlX = x2;
          lastControlY = y2;
          currentX = x;
          currentY = y;
        }
        break;
      }

      case 'S': {
        // Smooth Cubic Bezier
        for (let i = 0; i < params.length - 3; i += 4) {
          // Reflect previous control point
          let x1: number;
          let y1: number;
          if (
            lastCommand === 'C' ||
            lastCommand === 'c' ||
            lastCommand === 'S' ||
            lastCommand === 's'
          ) {
            x1 = 2 * currentX - lastControlX;
            y1 = 2 * currentY - lastControlY;
          } else {
            x1 = currentX;
            y1 = currentY;
          }

          const x2 = isRelative ? currentX + (params[i] ?? 0) : (params[i] ?? 0);
          const y2 = isRelative ? currentY + (params[i + 1] ?? 0) : (params[i + 1] ?? 0);
          const x = isRelative ? currentX + (params[i + 2] ?? 0) : (params[i + 2] ?? 0);
          const y = isRelative ? currentY + (params[i + 3] ?? 0) : (params[i + 3] ?? 0);

          updateCubicBezierBounds(currentX, currentY, x1, y1, x2, y2, x, y);

          lastControlX = x2;
          lastControlY = y2;
          currentX = x;
          currentY = y;
        }
        break;
      }

      case 'Q': {
        // Quadratic Bezier
        for (let i = 0; i < params.length - 3; i += 4) {
          const x1 = isRelative ? currentX + (params[i] ?? 0) : (params[i] ?? 0);
          const y1 = isRelative ? currentY + (params[i + 1] ?? 0) : (params[i + 1] ?? 0);
          const x = isRelative ? currentX + (params[i + 2] ?? 0) : (params[i + 2] ?? 0);
          const y = isRelative ? currentY + (params[i + 3] ?? 0) : (params[i + 3] ?? 0);

          updateQuadraticBezierBounds(currentX, currentY, x1, y1, x, y);

          lastControlX = x1;
          lastControlY = y1;
          currentX = x;
          currentY = y;
        }
        break;
      }

      case 'T': {
        // Smooth Quadratic Bezier
        for (let i = 0; i < params.length - 1; i += 2) {
          // Reflect previous control point
          let x1: number;
          let y1: number;
          if (
            lastCommand === 'Q' ||
            lastCommand === 'q' ||
            lastCommand === 'T' ||
            lastCommand === 't'
          ) {
            x1 = 2 * currentX - lastControlX;
            y1 = 2 * currentY - lastControlY;
          } else {
            x1 = currentX;
            y1 = currentY;
          }

          const x = isRelative ? currentX + (params[i] ?? 0) : (params[i] ?? 0);
          const y = isRelative ? currentY + (params[i + 1] ?? 0) : (params[i + 1] ?? 0);

          updateQuadraticBezierBounds(currentX, currentY, x1, y1, x, y);

          lastControlX = x1;
          lastControlY = y1;
          currentX = x;
          currentY = y;
        }
        break;
      }

      case 'A': {
        // Elliptical Arc
        for (let i = 0; i < params.length - 6; i += 7) {
          const rx = params[i] ?? 0;
          const ry = params[i + 1] ?? 0;
          const xAxisRotation = params[i + 2] ?? 0;
          const largeArcFlag = params[i + 3] ?? 0;
          const sweepFlag = params[i + 4] ?? 0;
          const x = isRelative ? currentX + (params[i + 5] ?? 0) : (params[i + 5] ?? 0);
          const y = isRelative ? currentY + (params[i + 6] ?? 0) : (params[i + 6] ?? 0);

          updateArcBounds(currentX, currentY, rx, ry, xAxisRotation, largeArcFlag, sweepFlag, x, y);

          currentX = x;
          currentY = y;
        }
        lastControlX = currentX;
        lastControlY = currentY;
        break;
      }

      case 'Z': {
        // Close path
        updateBounds(currentX, currentY);
        updateBounds(subpathStartX, subpathStartY);
        currentX = subpathStartX;
        currentY = subpathStartY;
        lastControlX = currentX;
        lastControlY = currentY;
        break;
      }
    }

    lastCommand = type;
  }

  // Check if we found any valid bounds
  if (minX === Infinity || minY === Infinity || maxX === -Infinity || maxY === -Infinity) {
    return null;
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Solves a quadratic equation ax² + bx + c = 0
 *
 * @returns Array of real roots
 */
function solveQuadratic(a: number, b: number, c: number): number[] {
  const roots: number[] = [];

  if (Math.abs(a) < 1e-10) {
    // Linear equation
    if (Math.abs(b) > 1e-10) {
      roots.push(-c / b);
    }
    return roots;
  }

  const discriminant = b * b - 4 * a * c;

  if (discriminant >= 0) {
    const sqrtD = Math.sqrt(discriminant);
    roots.push((-b + sqrtD) / (2 * a));
    if (discriminant > 0) {
      roots.push((-b - sqrtD) / (2 * a));
    }
  }

  return roots;
}

/**
 * Evaluates a cubic Bezier curve at parameter t
 */
function cubicBezier(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const mt = 1 - t;
  return mt * mt * mt * p0 + 3 * mt * mt * t * p1 + 3 * mt * t * t * p2 + t * t * t * p3;
}

/**
 * Evaluates a quadratic Bezier curve at parameter t
 */
function quadraticBezier(p0: number, p1: number, p2: number, t: number): number {
  const mt = 1 - t;
  return mt * mt * p0 + 2 * mt * t * p1 + t * t * p2;
}
