/**
 * Alignment and Distribution Utilities for SVG Composer
 *
 * This module provides utility functions for aligning and distributing elements
 * on the canvas. It supports alignment to selection bounds, canvas boundaries,
 * or a specific reference element.
 *
 * Alignment operations:
 * - **Horizontal**: left, center, right
 * - **Vertical**: top, middle, bottom
 *
 * Distribution operations:
 * - **Horizontal**: Space elements evenly along X axis
 * - **Vertical**: Space elements evenly along Y axis
 *
 * @example Aligning elements
 * ```typescript
 * // Align selected elements to the left edge of the selection
 * composer.alignElements('left', { reference: 'selection' });
 *
 * // Center elements horizontally on the canvas
 * composer.alignElements('center', { reference: 'canvas' });
 *
 * // Align elements to a specific reference element
 * composer.alignElements('top', { reference: 'element', elementId: 'header' });
 * ```
 *
 * @example Distributing elements
 * ```typescript
 * // Distribute elements horizontally with equal spacing
 * composer.distributeElements('horizontal');
 *
 * // Distribute vertically
 * composer.distributeElements('vertical');
 * ```
 *
 * @example Using the utility functions directly
 * ```typescript
 * import { alignLeft, distributeHorizontally } from 'svg-composer';
 *
 * // Calculate alignment adjustments
 * const elements: ElementBounds[] = [
 *   { id: 'el1', bounds: { x: 10, y: 10, width: 50, height: 50 } },
 *   { id: 'el2', bounds: { x: 100, y: 20, width: 30, height: 40 } }
 * ];
 *
 * const results = alignLeft(elements, referenceBounds);
 * // Apply results to move elements
 * ```
 *
 * @packageDocumentation
 */

import type { BoundingBox, AlignmentOptions, AlignmentReference } from '../core/types.js';

// Re-export types for convenience
export type { AlignmentOptions, AlignmentReference };

/**
 * Represents an element with its ID and bounding box
 */
export interface ElementBounds {
  id: string;
  bounds: BoundingBox;
}

/**
 * Result of an alignment calculation
 */
export interface AlignmentResult {
  /** Element ID */
  id: string;
  /** New X position (used for testing/preview) */
  newX: number;
  /** New Y position (used for testing/preview) */
  newY: number;
  /** Delta X from original position (used by _applyAlignmentResults) */
  deltaX: number;
  /** Delta Y from original position (used by _applyAlignmentResults) */
  deltaY: number;
}

/**
 * Gets the combined bounding box of multiple elements
 *
 * @param elements - Array of element bounds
 * @returns Combined bounding box or null if no elements
 */
export function getCombinedBounds(elements: ElementBounds[]): BoundingBox | null {
  if (elements.length === 0) {
    return null;
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const { bounds } of elements) {
    minX = Math.min(minX, bounds.x);
    minY = Math.min(minY, bounds.y);
    maxX = Math.max(maxX, bounds.x + bounds.width);
    maxY = Math.max(maxY, bounds.y + bounds.height);
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Gets the reference bounds based on alignment options
 *
 * @param elements - Array of element bounds
 * @param canvasBounds - Canvas bounding box
 * @param options - Alignment options
 * @returns Reference bounding box
 */
export function getReferenceBounds(
  elements: ElementBounds[],
  canvasBounds: BoundingBox,
  options: AlignmentOptions = {},
): BoundingBox | null {
  const relativeTo = options.relativeTo ?? 'selection';

  switch (relativeTo) {
    case 'canvas':
      return canvasBounds;
    case 'first':
      return elements[0]?.bounds ?? null;
    case 'selection':
    default:
      return getCombinedBounds(elements);
  }
}

// ============================================================
// Alignment Operations
// ============================================================

/**
 * Aligns elements to the left edge
 *
 * @param elements - Elements to align (with current positions stored in bounds.x)
 * @param canvasBounds - Canvas bounding box
 * @param options - Alignment options
 * @returns Array of alignment results with new positions
 */
export function alignLeft(
  elements: ElementBounds[],
  canvasBounds: BoundingBox,
  options: AlignmentOptions = {},
): AlignmentResult[] {
  if (elements.length < 2 && options.relativeTo !== 'canvas') {
    return [];
  }

  const refBounds = getReferenceBounds(elements, canvasBounds, options);
  if (!refBounds) {
    return [];
  }

  const targetX = refBounds.x;

  return elements.map(({ id, bounds }) => {
    const deltaX = targetX - bounds.x;
    return {
      id,
      newX: bounds.x + deltaX,
      newY: bounds.y,
      deltaX,
      deltaY: 0,
    };
  });
}

/**
 * Aligns elements to the right edge
 *
 * @param elements - Elements to align
 * @param canvasBounds - Canvas bounding box
 * @param options - Alignment options
 * @returns Array of alignment results with new positions
 */
export function alignRight(
  elements: ElementBounds[],
  canvasBounds: BoundingBox,
  options: AlignmentOptions = {},
): AlignmentResult[] {
  if (elements.length < 2 && options.relativeTo !== 'canvas') {
    return [];
  }

  const refBounds = getReferenceBounds(elements, canvasBounds, options);
  if (!refBounds) {
    return [];
  }

  const targetRight = refBounds.x + refBounds.width;

  return elements.map(({ id, bounds }) => {
    const elementRight = bounds.x + bounds.width;
    const deltaX = targetRight - elementRight;
    return {
      id,
      newX: bounds.x + deltaX,
      newY: bounds.y,
      deltaX,
      deltaY: 0,
    };
  });
}

/**
 * Aligns elements to the top edge
 *
 * @param elements - Elements to align
 * @param canvasBounds - Canvas bounding box
 * @param options - Alignment options
 * @returns Array of alignment results with new positions
 */
export function alignTop(
  elements: ElementBounds[],
  canvasBounds: BoundingBox,
  options: AlignmentOptions = {},
): AlignmentResult[] {
  if (elements.length < 2 && options.relativeTo !== 'canvas') {
    return [];
  }

  const refBounds = getReferenceBounds(elements, canvasBounds, options);
  if (!refBounds) {
    return [];
  }

  const targetY = refBounds.y;

  return elements.map(({ id, bounds }) => {
    const deltaY = targetY - bounds.y;
    return {
      id,
      newX: bounds.x,
      newY: bounds.y + deltaY,
      deltaX: 0,
      deltaY,
    };
  });
}

/**
 * Aligns elements to the bottom edge
 *
 * @param elements - Elements to align
 * @param canvasBounds - Canvas bounding box
 * @param options - Alignment options
 * @returns Array of alignment results with new positions
 */
export function alignBottom(
  elements: ElementBounds[],
  canvasBounds: BoundingBox,
  options: AlignmentOptions = {},
): AlignmentResult[] {
  if (elements.length < 2 && options.relativeTo !== 'canvas') {
    return [];
  }

  const refBounds = getReferenceBounds(elements, canvasBounds, options);
  if (!refBounds) {
    return [];
  }

  const targetBottom = refBounds.y + refBounds.height;

  return elements.map(({ id, bounds }) => {
    const elementBottom = bounds.y + bounds.height;
    const deltaY = targetBottom - elementBottom;
    return {
      id,
      newX: bounds.x,
      newY: bounds.y + deltaY,
      deltaX: 0,
      deltaY,
    };
  });
}

/**
 * Aligns elements to the horizontal center
 *
 * @param elements - Elements to align
 * @param canvasBounds - Canvas bounding box
 * @param options - Alignment options
 * @returns Array of alignment results with new positions
 */
export function alignCenterHorizontal(
  elements: ElementBounds[],
  canvasBounds: BoundingBox,
  options: AlignmentOptions = {},
): AlignmentResult[] {
  if (elements.length < 2 && options.relativeTo !== 'canvas') {
    return [];
  }

  const refBounds = getReferenceBounds(elements, canvasBounds, options);
  if (!refBounds) {
    return [];
  }

  const targetCenterX = refBounds.x + refBounds.width / 2;

  return elements.map(({ id, bounds }) => {
    const elementCenterX = bounds.x + bounds.width / 2;
    const deltaX = targetCenterX - elementCenterX;
    return {
      id,
      newX: bounds.x + deltaX,
      newY: bounds.y,
      deltaX,
      deltaY: 0,
    };
  });
}

/**
 * Aligns elements to the vertical center
 *
 * @param elements - Elements to align
 * @param canvasBounds - Canvas bounding box
 * @param options - Alignment options
 * @returns Array of alignment results with new positions
 */
export function alignCenterVertical(
  elements: ElementBounds[],
  canvasBounds: BoundingBox,
  options: AlignmentOptions = {},
): AlignmentResult[] {
  if (elements.length < 2 && options.relativeTo !== 'canvas') {
    return [];
  }

  const refBounds = getReferenceBounds(elements, canvasBounds, options);
  if (!refBounds) {
    return [];
  }

  const targetCenterY = refBounds.y + refBounds.height / 2;

  return elements.map(({ id, bounds }) => {
    const elementCenterY = bounds.y + bounds.height / 2;
    const deltaY = targetCenterY - elementCenterY;
    return {
      id,
      newX: bounds.x,
      newY: bounds.y + deltaY,
      deltaX: 0,
      deltaY,
    };
  });
}

/**
 * Aligns elements to both horizontal and vertical center
 *
 * @param elements - Elements to align
 * @param canvasBounds - Canvas bounding box
 * @param options - Alignment options
 * @returns Array of alignment results with new positions
 */
export function alignCenter(
  elements: ElementBounds[],
  canvasBounds: BoundingBox,
  options: AlignmentOptions = {},
): AlignmentResult[] {
  if (elements.length < 2 && options.relativeTo !== 'canvas') {
    return [];
  }

  const refBounds = getReferenceBounds(elements, canvasBounds, options);
  if (!refBounds) {
    return [];
  }

  const targetCenterX = refBounds.x + refBounds.width / 2;
  const targetCenterY = refBounds.y + refBounds.height / 2;

  return elements.map(({ id, bounds }) => {
    const elementCenterX = bounds.x + bounds.width / 2;
    const elementCenterY = bounds.y + bounds.height / 2;
    const deltaX = targetCenterX - elementCenterX;
    const deltaY = targetCenterY - elementCenterY;
    return {
      id,
      newX: bounds.x + deltaX,
      newY: bounds.y + deltaY,
      deltaX,
      deltaY,
    };
  });
}

// ============================================================
// Distribution Operations
// ============================================================

/**
 * Distributes elements evenly by their left edges (horizontal)
 *
 * @param elements - Elements to distribute (must have at least 3)
 * @returns Array of alignment results with new positions
 */
export function distributeLeft(elements: ElementBounds[]): AlignmentResult[] {
  if (elements.length < 3) {
    return [];
  }

  // Sort by left edge (x position)
  const sorted = [...elements].sort((a, b) => a.bounds.x - b.bounds.x);

  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  if (!first || !last) {
    return [];
  }

  const firstX = first.bounds.x;
  const lastX = last.bounds.x;
  const spacing = (lastX - firstX) / (sorted.length - 1);

  return sorted.map(({ id, bounds }, index) => {
    const targetX = firstX + spacing * index;
    const deltaX = targetX - bounds.x;
    return {
      id,
      newX: bounds.x + deltaX,
      newY: bounds.y,
      deltaX,
      deltaY: 0,
    };
  });
}

/**
 * Distributes elements evenly by their horizontal centers
 *
 * @param elements - Elements to distribute (must have at least 3)
 * @returns Array of alignment results with new positions
 */
export function distributeCenterHorizontal(elements: ElementBounds[]): AlignmentResult[] {
  if (elements.length < 3) {
    return [];
  }

  // Sort by center X position
  const sorted = [...elements].sort((a, b) => {
    const aCenterX = a.bounds.x + a.bounds.width / 2;
    const bCenterX = b.bounds.x + b.bounds.width / 2;
    return aCenterX - bCenterX;
  });

  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  if (!first || !last) {
    return [];
  }

  const firstCenterX = first.bounds.x + first.bounds.width / 2;
  const lastCenterX = last.bounds.x + last.bounds.width / 2;
  const spacing = (lastCenterX - firstCenterX) / (sorted.length - 1);

  return sorted.map(({ id, bounds }, index) => {
    const currentCenterX = bounds.x + bounds.width / 2;
    const targetCenterX = firstCenterX + spacing * index;
    const deltaX = targetCenterX - currentCenterX;
    return {
      id,
      newX: bounds.x + deltaX,
      newY: bounds.y,
      deltaX,
      deltaY: 0,
    };
  });
}

/**
 * Distributes elements evenly by their right edges (horizontal)
 *
 * @param elements - Elements to distribute (must have at least 3)
 * @returns Array of alignment results with new positions
 */
export function distributeRight(elements: ElementBounds[]): AlignmentResult[] {
  if (elements.length < 3) {
    return [];
  }

  // Sort by right edge
  const sorted = [...elements].sort((a, b) => {
    const aRight = a.bounds.x + a.bounds.width;
    const bRight = b.bounds.x + b.bounds.width;
    return aRight - bRight;
  });

  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  if (!first || !last) {
    return [];
  }

  const firstRight = first.bounds.x + first.bounds.width;
  const lastRight = last.bounds.x + last.bounds.width;
  const spacing = (lastRight - firstRight) / (sorted.length - 1);

  return sorted.map(({ id, bounds }, index) => {
    const currentRight = bounds.x + bounds.width;
    const targetRight = firstRight + spacing * index;
    const deltaX = targetRight - currentRight;
    return {
      id,
      newX: bounds.x + deltaX,
      newY: bounds.y,
      deltaX,
      deltaY: 0,
    };
  });
}

/**
 * Distributes elements evenly by their top edges (vertical)
 *
 * @param elements - Elements to distribute (must have at least 3)
 * @returns Array of alignment results with new positions
 */
export function distributeTop(elements: ElementBounds[]): AlignmentResult[] {
  if (elements.length < 3) {
    return [];
  }

  // Sort by top edge (y position)
  const sorted = [...elements].sort((a, b) => a.bounds.y - b.bounds.y);

  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  if (!first || !last) {
    return [];
  }

  const firstY = first.bounds.y;
  const lastY = last.bounds.y;
  const spacing = (lastY - firstY) / (sorted.length - 1);

  return sorted.map(({ id, bounds }, index) => {
    const targetY = firstY + spacing * index;
    const deltaY = targetY - bounds.y;
    return {
      id,
      newX: bounds.x,
      newY: bounds.y + deltaY,
      deltaX: 0,
      deltaY,
    };
  });
}

/**
 * Distributes elements evenly by their vertical centers
 *
 * @param elements - Elements to distribute (must have at least 3)
 * @returns Array of alignment results with new positions
 */
export function distributeCenterVertical(elements: ElementBounds[]): AlignmentResult[] {
  if (elements.length < 3) {
    return [];
  }

  // Sort by center Y position
  const sorted = [...elements].sort((a, b) => {
    const aCenterY = a.bounds.y + a.bounds.height / 2;
    const bCenterY = b.bounds.y + b.bounds.height / 2;
    return aCenterY - bCenterY;
  });

  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  if (!first || !last) {
    return [];
  }

  const firstCenterY = first.bounds.y + first.bounds.height / 2;
  const lastCenterY = last.bounds.y + last.bounds.height / 2;
  const spacing = (lastCenterY - firstCenterY) / (sorted.length - 1);

  return sorted.map(({ id, bounds }, index) => {
    const currentCenterY = bounds.y + bounds.height / 2;
    const targetCenterY = firstCenterY + spacing * index;
    const deltaY = targetCenterY - currentCenterY;
    return {
      id,
      newX: bounds.x,
      newY: bounds.y + deltaY,
      deltaX: 0,
      deltaY,
    };
  });
}

/**
 * Distributes elements evenly by their bottom edges (vertical)
 *
 * @param elements - Elements to distribute (must have at least 3)
 * @returns Array of alignment results with new positions
 */
export function distributeBottom(elements: ElementBounds[]): AlignmentResult[] {
  if (elements.length < 3) {
    return [];
  }

  // Sort by bottom edge
  const sorted = [...elements].sort((a, b) => {
    const aBottom = a.bounds.y + a.bounds.height;
    const bBottom = b.bounds.y + b.bounds.height;
    return aBottom - bBottom;
  });

  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  if (!first || !last) {
    return [];
  }

  const firstBottom = first.bounds.y + first.bounds.height;
  const lastBottom = last.bounds.y + last.bounds.height;
  const spacing = (lastBottom - firstBottom) / (sorted.length - 1);

  return sorted.map(({ id, bounds }, index) => {
    const currentBottom = bounds.y + bounds.height;
    const targetBottom = firstBottom + spacing * index;
    const deltaY = targetBottom - currentBottom;
    return {
      id,
      newX: bounds.x,
      newY: bounds.y + deltaY,
      deltaX: 0,
      deltaY,
    };
  });
}

/**
 * Distributes elements with equal horizontal gaps between them
 *
 * @param elements - Elements to distribute (must have at least 3)
 * @returns Array of alignment results with new positions
 */
export function distributeHorizontalGaps(elements: ElementBounds[]): AlignmentResult[] {
  if (elements.length < 3) {
    return [];
  }

  // Sort by left edge (x position)
  const sorted = [...elements].sort((a, b) => a.bounds.x - b.bounds.x);

  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  if (!first || !last) {
    return [];
  }

  // Calculate total width of all elements
  const totalElementWidth = sorted.reduce((sum, { bounds }) => sum + bounds.width, 0);

  // Calculate the available space (from leftmost left edge to rightmost right edge)
  const leftmostX = first.bounds.x;
  const rightmostX = last.bounds.x + last.bounds.width;
  const totalSpace = rightmostX - leftmostX;

  // Calculate the gap size
  const totalGaps = sorted.length - 1;
  const gapSize = (totalSpace - totalElementWidth) / totalGaps;

  // Position elements with equal gaps
  let currentX = leftmostX;
  return sorted.map(({ id, bounds }) => {
    const deltaX = currentX - bounds.x;
    const result: AlignmentResult = {
      id,
      newX: currentX,
      newY: bounds.y,
      deltaX,
      deltaY: 0,
    };
    currentX += bounds.width + gapSize;
    return result;
  });
}

/**
 * Distributes elements with equal vertical gaps between them
 *
 * @param elements - Elements to distribute (must have at least 3)
 * @returns Array of alignment results with new positions
 */
export function distributeVerticalGaps(elements: ElementBounds[]): AlignmentResult[] {
  if (elements.length < 3) {
    return [];
  }

  // Sort by top edge (y position)
  const sorted = [...elements].sort((a, b) => a.bounds.y - b.bounds.y);

  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  if (!first || !last) {
    return [];
  }

  // Calculate total height of all elements
  const totalElementHeight = sorted.reduce((sum, { bounds }) => sum + bounds.height, 0);

  // Calculate the available space (from topmost top edge to bottommost bottom edge)
  const topmostY = first.bounds.y;
  const bottommostY = last.bounds.y + last.bounds.height;
  const totalSpace = bottommostY - topmostY;

  // Calculate the gap size
  const totalGaps = sorted.length - 1;
  const gapSize = (totalSpace - totalElementHeight) / totalGaps;

  // Position elements with equal gaps
  let currentY = topmostY;
  return sorted.map(({ id, bounds }) => {
    const deltaY = currentY - bounds.y;
    const result: AlignmentResult = {
      id,
      newX: bounds.x,
      newY: currentY,
      deltaX: 0,
      deltaY,
    };
    currentY += bounds.height + gapSize;
    return result;
  });
}
