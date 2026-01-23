/**
 * Snapping Manager for handling snap-to-guides, grid, and element snapping
 */

import type {
  BoundingBox,
  SnapTarget,
  SnapResult,
  SnappingConfig,
  CanvasState,
} from '../core/types.js';
import type { BaseElement } from '../elements/types.js';
import type { SnapLines } from '../rendering/types.js';

/**
 * Points of interest on an element or selection bounds that can snap
 */
interface SnapPoints {
  /** Left edge X position */
  left: number;
  /** Right edge X position */
  right: number;
  /** Top edge Y position */
  top: number;
  /** Bottom edge Y position */
  bottom: number;
  /** Center X position */
  centerX: number;
  /** Center Y position */
  centerY: number;
}

/**
 * Active snap lines to display during interaction.
 * This is an alias for SnapLines - prefer using SnapLines from rendering/types.
 */
export type ActiveSnapLines = SnapLines;

/**
 * Type for a function that retrieves element bounds
 */
export type BoundsGetter = (element: BaseElement) => BoundingBox | null;

/**
 * SnappingManager calculates snap positions during element manipulation.
 *
 * Supports snapping to:
 * - Guide lines (horizontal and vertical)
 * - Grid (configurable spacing)
 * - Other element edges and centers
 * - Canvas edges and center
 */
export class SnappingManager {
  private _config: SnappingConfig;
  private _activeSnapLines: SnapLines = { vertical: [], horizontal: [] };

  /**
   * Creates a new SnappingManager instance
   *
   * @param config - Snapping configuration options
   */
  constructor(config: SnappingConfig) {
    this._config = { ...config };
  }

  /**
   * Gets the current snapping configuration
   */
  get config(): SnappingConfig {
    return { ...this._config };
  }

  /**
   * Updates the snapping configuration
   *
   * @param updates - Partial configuration updates
   */
  updateConfig(updates: Partial<SnappingConfig>): void {
    this._config = { ...this._config, ...updates };
  }

  /**
   * Gets the active snap lines (for rendering snap indicators)
   */
  get activeSnapLines(): SnapLines {
    return this._activeSnapLines;
  }

  /**
   * Clears active snap lines
   */
  clearActiveSnapLines(): void {
    this._activeSnapLines = { vertical: [], horizontal: [] };
  }

  /**
   * Calculates snap adjustment for a point being dragged
   *
   * @param x - Current X position in viewBox units
   * @param y - Current Y position in viewBox units
   * @param bounds - Bounding box of the element(s) being dragged
   * @param state - Current canvas state (for guides and canvas dimensions)
   * @param excludeIds - Element IDs to exclude from snap targets (usually the dragged elements)
   * @param getBounds - Function to get element bounds
   * @returns Snap result with adjusted positions
   */
  calculateSnap(
    x: number,
    y: number,
    bounds: BoundingBox,
    state: CanvasState,
    excludeIds: Set<string>,
    getBounds: BoundsGetter,
  ): SnapResult {
    if (!this._config.enabled) {
      return { snappedX: false, snappedY: false, x, y };
    }

    // Calculate snap points for the dragged element(s)
    const snapPoints = this._getSnapPoints(bounds);

    // Collect all snap targets (pass bounds for grid optimization)
    const targets = this._collectSnapTargets(state, excludeIds, getBounds, bounds);

    // Find best snaps for X and Y axes
    const snapX = this._findBestSnapX(snapPoints, targets.vertical);
    const snapY = this._findBestSnapY(snapPoints, targets.horizontal);

    // Update active snap lines for rendering
    this._updateActiveSnapLines(snapX, snapY);

    // Calculate adjusted positions
    const result: SnapResult = {
      snappedX: snapX !== null,
      snappedY: snapY !== null,
      x: snapX !== null ? x + snapX.adjustment : x,
      y: snapY !== null ? y + snapY.adjustment : y,
    };

    if (snapX !== null) {
      result.snapTargetX = snapX.target;
    }
    if (snapY !== null) {
      result.snapTargetY = snapY.target;
    }

    return result;
  }

  /**
   * Calculates snap adjustment for resize operations
   *
   * @param newBounds - The new bounds after resize
   * @param handleType - Which resize handle is being used
   * @param state - Current canvas state
   * @param excludeIds - Element IDs to exclude
   * @param getBounds - Function to get element bounds
   * @returns Snap result with adjusted positions
   */
  calculateResizeSnap(
    newBounds: BoundingBox,
    handleType: string,
    state: CanvasState,
    excludeIds: Set<string>,
    getBounds: BoundsGetter,
  ): SnapResult {
    if (!this._config.enabled) {
      return {
        snappedX: false,
        snappedY: false,
        x: newBounds.x,
        y: newBounds.y,
      };
    }

    // Collect all snap targets (pass bounds for grid optimization)
    const targets = this._collectSnapTargets(state, excludeIds, getBounds, newBounds);

    // For resize, we only snap the edges being moved
    const affectsLeft = handleType.includes('w');
    const affectsRight = handleType.includes('e');
    const affectsTop = handleType.includes('n');
    const affectsBottom = handleType.includes('s');

    let snapX: { adjustment: number; target: SnapTarget } | null = null;
    let snapY: { adjustment: number; target: SnapTarget } | null = null;

    // Find snap for affected edges
    if (affectsLeft || affectsRight) {
      const edgeX = affectsLeft ? newBounds.x : newBounds.x + newBounds.width;
      snapX = this._findBestSnapForPosition(edgeX, targets.vertical);
    }

    if (affectsTop || affectsBottom) {
      const edgeY = affectsTop ? newBounds.y : newBounds.y + newBounds.height;
      snapY = this._findBestSnapForPosition(edgeY, targets.horizontal);
    }

    // Update active snap lines
    this._updateActiveSnapLines(snapX, snapY);

    const result: SnapResult = {
      snappedX: snapX !== null,
      snappedY: snapY !== null,
      x: snapX !== null ? newBounds.x + (affectsLeft ? snapX.adjustment : 0) : newBounds.x,
      y: snapY !== null ? newBounds.y + (affectsTop ? snapY.adjustment : 0) : newBounds.y,
    };
    if (snapX !== null) {
      result.snapTargetX = snapX.target;
    }
    if (snapY !== null) {
      result.snapTargetY = snapY.target;
    }
    return result;
  }

  /**
   * Gets snap points for a bounding box
   */
  private _getSnapPoints(bounds: BoundingBox): SnapPoints {
    return {
      left: bounds.x,
      right: bounds.x + bounds.width,
      top: bounds.y,
      bottom: bounds.y + bounds.height,
      centerX: bounds.x + bounds.width / 2,
      centerY: bounds.y + bounds.height / 2,
    };
  }

  /**
   * Collects all available snap targets based on configuration
   *
   * @param state - Current canvas state
   * @param excludeIds - Element IDs to exclude from snap targets
   * @param getBounds - Function to get element bounds
   * @param dragBounds - Bounds of the element being dragged (for grid optimization)
   */
  private _collectSnapTargets(
    state: CanvasState,
    excludeIds: Set<string>,
    getBounds: BoundsGetter,
    dragBounds: BoundingBox,
  ): { vertical: SnapTarget[]; horizontal: SnapTarget[] } {
    const vertical: SnapTarget[] = [];
    const horizontal: SnapTarget[] = [];

    // Add guide targets
    // Note: Locked guides are still snap targets - locking prevents moving the guide,
    // not snapping to it. Users often lock guides to use as stable snap references.
    if (this._config.snapToGuides) {
      for (const guide of state.guides) {
        if (!guide.visible) {
          continue;
        }
        const target: SnapTarget = {
          type: 'guide',
          orientation: guide.orientation,
          position: guide.position,
          referenceId: guide.id,
        };
        if (guide.orientation === 'vertical') {
          vertical.push(target);
        } else {
          horizontal.push(target);
        }
      }
    }

    // Add grid targets (optimized to only include targets within snap distance)
    if (this._config.snapToGrid && this._config.gridSize > 0) {
      const gridSize = this._config.gridSize;
      const snapDistance = this._config.snapDistance;

      // Calculate the range of positions we need to check based on drag bounds
      // Include edges and center of the dragged element
      const relevantXPositions = [
        dragBounds.x,
        dragBounds.x + dragBounds.width,
        dragBounds.x + dragBounds.width / 2,
      ];
      const relevantYPositions = [
        dragBounds.y,
        dragBounds.y + dragBounds.height,
        dragBounds.y + dragBounds.height / 2,
      ];

      // Find grid lines near the relevant X positions
      const addedXPositions = new Set<number>();
      for (const xPos of relevantXPositions) {
        const nearestGridX = Math.round(xPos / gridSize) * gridSize;
        // Check grid lines within snap distance range
        for (let x = nearestGridX - gridSize; x <= nearestGridX + gridSize; x += gridSize) {
          if (
            x >= 0 &&
            x <= state.width &&
            Math.abs(x - xPos) <= snapDistance &&
            !addedXPositions.has(x)
          ) {
            addedXPositions.add(x);
            vertical.push({
              type: 'grid',
              orientation: 'vertical',
              position: x,
            });
          }
        }
      }

      // Find grid lines near the relevant Y positions
      const addedYPositions = new Set<number>();
      for (const yPos of relevantYPositions) {
        const nearestGridY = Math.round(yPos / gridSize) * gridSize;
        // Check grid lines within snap distance range
        for (let y = nearestGridY - gridSize; y <= nearestGridY + gridSize; y += gridSize) {
          if (
            y >= 0 &&
            y <= state.height &&
            Math.abs(y - yPos) <= snapDistance &&
            !addedYPositions.has(y)
          ) {
            addedYPositions.add(y);
            horizontal.push({
              type: 'grid',
              orientation: 'horizontal',
              position: y,
            });
          }
        }
      }
    }

    // Add element edge and center targets
    if (this._config.snapToElements || this._config.snapToElementCenters) {
      for (const element of state.elements.values()) {
        if (!element.visible || excludeIds.has(element.id)) {
          continue;
        }
        const elementBounds = getBounds(element);
        if (!elementBounds) {
          continue;
        }

        if (this._config.snapToElements) {
          // Add element edges
          vertical.push({
            type: 'element-edge',
            orientation: 'vertical',
            position: elementBounds.x,
            referenceId: element.id,
          });
          vertical.push({
            type: 'element-edge',
            orientation: 'vertical',
            position: elementBounds.x + elementBounds.width,
            referenceId: element.id,
          });
          horizontal.push({
            type: 'element-edge',
            orientation: 'horizontal',
            position: elementBounds.y,
            referenceId: element.id,
          });
          horizontal.push({
            type: 'element-edge',
            orientation: 'horizontal',
            position: elementBounds.y + elementBounds.height,
            referenceId: element.id,
          });
        }

        if (this._config.snapToElementCenters) {
          // Add element centers
          vertical.push({
            type: 'element-center',
            orientation: 'vertical',
            position: elementBounds.x + elementBounds.width / 2,
            referenceId: element.id,
          });
          horizontal.push({
            type: 'element-center',
            orientation: 'horizontal',
            position: elementBounds.y + elementBounds.height / 2,
            referenceId: element.id,
          });
        }
      }
    }

    // Add canvas edge targets
    if (this._config.snapToCanvasEdges) {
      vertical.push({
        type: 'canvas-edge',
        orientation: 'vertical',
        position: 0,
      });
      vertical.push({
        type: 'canvas-edge',
        orientation: 'vertical',
        position: state.width,
      });
      horizontal.push({
        type: 'canvas-edge',
        orientation: 'horizontal',
        position: 0,
      });
      horizontal.push({
        type: 'canvas-edge',
        orientation: 'horizontal',
        position: state.height,
      });
    }

    // Add canvas center targets
    if (this._config.snapToCanvasCenter) {
      vertical.push({
        type: 'canvas-center',
        orientation: 'vertical',
        position: state.width / 2,
      });
      horizontal.push({
        type: 'canvas-center',
        orientation: 'horizontal',
        position: state.height / 2,
      });
    }

    return { vertical, horizontal };
  }

  /**
   * Finds the best snap for X axis (vertical snap lines)
   */
  private _findBestSnapX(
    snapPoints: SnapPoints,
    targets: SnapTarget[],
  ): { adjustment: number; target: SnapTarget } | null {
    let bestSnap: { adjustment: number; target: SnapTarget; distance: number } | null = null;

    // Check left edge, right edge, and center
    const pointsToCheck = [
      { pos: snapPoints.left, name: 'left' },
      { pos: snapPoints.right, name: 'right' },
      { pos: snapPoints.centerX, name: 'center' },
    ];

    for (const point of pointsToCheck) {
      for (const target of targets) {
        const distance = Math.abs(point.pos - target.position);
        if (distance <= this._config.snapDistance) {
          if (!bestSnap || distance < bestSnap.distance) {
            bestSnap = {
              adjustment: target.position - point.pos,
              target,
              distance,
            };
          }
        }
      }
    }

    return bestSnap ? { adjustment: bestSnap.adjustment, target: bestSnap.target } : null;
  }

  /**
   * Finds the best snap for Y axis (horizontal snap lines)
   */
  private _findBestSnapY(
    snapPoints: SnapPoints,
    targets: SnapTarget[],
  ): { adjustment: number; target: SnapTarget } | null {
    let bestSnap: { adjustment: number; target: SnapTarget; distance: number } | null = null;

    // Check top edge, bottom edge, and center
    const pointsToCheck = [
      { pos: snapPoints.top, name: 'top' },
      { pos: snapPoints.bottom, name: 'bottom' },
      { pos: snapPoints.centerY, name: 'center' },
    ];

    for (const point of pointsToCheck) {
      for (const target of targets) {
        const distance = Math.abs(point.pos - target.position);
        if (distance <= this._config.snapDistance) {
          if (!bestSnap || distance < bestSnap.distance) {
            bestSnap = {
              adjustment: target.position - point.pos,
              target,
              distance,
            };
          }
        }
      }
    }

    return bestSnap ? { adjustment: bestSnap.adjustment, target: bestSnap.target } : null;
  }

  /**
   * Finds the best snap for a single position
   */
  private _findBestSnapForPosition(
    position: number,
    targets: SnapTarget[],
  ): { adjustment: number; target: SnapTarget } | null {
    let bestSnap: { adjustment: number; target: SnapTarget; distance: number } | null = null;

    for (const target of targets) {
      const distance = Math.abs(position - target.position);
      if (distance <= this._config.snapDistance) {
        if (!bestSnap || distance < bestSnap.distance) {
          bestSnap = {
            adjustment: target.position - position,
            target,
            distance,
          };
        }
      }
    }

    return bestSnap ? { adjustment: bestSnap.adjustment, target: bestSnap.target } : null;
  }

  /**
   * Updates active snap lines for rendering
   */
  private _updateActiveSnapLines(
    snapX: { adjustment: number; target: SnapTarget } | null,
    snapY: { adjustment: number; target: SnapTarget } | null,
  ): void {
    this._activeSnapLines = { vertical: [], horizontal: [] };

    if (this._config.showSnapIndicators) {
      if (snapX !== null) {
        this._activeSnapLines.vertical.push({
          x: snapX.target.position,
          target: snapX.target,
        });
      }
      if (snapY !== null) {
        this._activeSnapLines.horizontal.push({
          y: snapY.target.position,
          target: snapY.target,
        });
      }
    }
  }
}
