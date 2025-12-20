/**
 * Hit testing for elements and selection handles
 */

import type { BoundingBox } from '../core/types.js';
import type { BaseElement, ImageElement, TextElement, ShapeElement } from '../elements/types.js';
import type { ViewBoxPoint, HitTestResult, HandleType, HandleConfig } from './types.js';
import type { CoordinateTransformer } from './CoordinateTransformer.js';

/**
 * Configuration for the hit tester
 */
export interface HitTesterConfig {
  /** Function to get all elements */
  getElements: () => BaseElement[];
  /** Function to get currently selected element IDs */
  getSelection: () => string[];
  /** Function to get the bounding box of the current selection */
  getSelectionBounds: () => BoundingBox | null;
  /** Function to get the rotation of the current selection */
  getSelectionRotation: () => number;
  /** Coordinate transformer for screen-to-viewBox conversion */
  coordinateTransformer: CoordinateTransformer;
  /** Handle configuration for sizing */
  handleConfig: HandleConfig;
}

/**
 * All resize handle types (excludes 'rotate')
 */
const RESIZE_HANDLES: HandleType[] = ['nw', 'n', 'ne', 'w', 'e', 'sw', 's', 'se'];

/**
 * HitTester determines what the user clicked on - an element, a selection handle,
 * or the background.
 */
export class HitTester {
  private readonly _config: HitTesterConfig;

  constructor(config: HitTesterConfig) {
    this._config = config;
  }

  /**
   * Performs a hit test at the given point
   *
   * @param point - Point in viewBox coordinates
   * @returns Hit test result indicating what was hit
   */
  hitTest(point: ViewBoxPoint): HitTestResult {
    // First, check handles if there's a selection
    const selection = this._config.getSelection();
    if (selection.length > 0) {
      const bounds = this._config.getSelectionBounds();
      if (bounds) {
        const handleResult = this.hitTestHandle(point, bounds);
        if (handleResult) {
          const firstSelected = selection[0];
          if (selection.length === 1 && firstSelected !== undefined) {
            return {
              type: 'handle',
              elementId: firstSelected,
              handleType: handleResult,
            };
          }
          return {
            type: 'handle',
            handleType: handleResult,
          };
        }
      }
    }

    // Then check elements (topmost first based on z-index)
    const elementId = this.hitTestElement(point);
    if (elementId !== null) {
      return {
        type: 'element',
        elementId,
      };
    }

    // Nothing hit - background
    return { type: 'background' };
  }

  /**
   * Hit tests against selection handles
   *
   * @param point - Point in viewBox coordinates
   * @param bounds - Bounding box of the selection
   * @returns Handle type if a handle was hit, null otherwise
   */
  hitTestHandle(point: ViewBoxPoint, bounds: BoundingBox): HandleType | null {
    const handlePositions = this._getHandlePositions(bounds);
    const handleHitRadius = this._getHandleHitRadius();
    const rotation = this._config.getSelectionRotation();

    // Transform the click point to the selection's local coordinate system
    // by rotating it in the opposite direction around the selection center
    const testPoint = this._transformPointForRotation(point, bounds, rotation);

    // Check rotation handle first (it's above the selection)
    const rotatePos = handlePositions.get('rotate');
    if (rotatePos && this._isPointInRadius(testPoint, rotatePos, handleHitRadius)) {
      return 'rotate';
    }

    // Check resize handles
    for (const handleType of RESIZE_HANDLES) {
      const pos = handlePositions.get(handleType);
      if (pos && this._isPointInRadius(testPoint, pos, handleHitRadius)) {
        return handleType;
      }
    }

    return null;
  }

  /**
   * Transforms a point to account for selection rotation.
   * Rotates the point around the selection center by the negative rotation angle,
   * effectively converting it to the selection's local coordinate system.
   */
  private _transformPointForRotation(
    point: ViewBoxPoint,
    bounds: BoundingBox,
    rotation: number,
  ): ViewBoxPoint {
    if (rotation === 0) {
      return point;
    }

    // Calculate center of selection
    const cx = bounds.x + bounds.width / 2;
    const cy = bounds.y + bounds.height / 2;

    // Rotate point around center in opposite direction
    const rad = (-rotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    const dx = point.x - cx;
    const dy = point.y - cy;

    return {
      x: cx + dx * cos - dy * sin,
      y: cy + dx * sin + dy * cos,
    };
  }

  /**
   * Hit tests against elements
   *
   * @param point - Point in viewBox coordinates
   * @returns Element ID if an element was hit, null otherwise
   */
  hitTestElement(point: ViewBoxPoint): string | null {
    const elements = this._config.getElements();

    // Sort by z-index descending (topmost first)
    const sortedElements = [...elements].sort((a, b) => b.zIndex - a.zIndex);

    for (const element of sortedElements) {
      // Skip invisible or locked elements
      if (!element.visible) {
        continue;
      }

      const bounds = this.getElementBounds(element);
      if (bounds && this._isPointInBounds(point, bounds, element.transform.rotation)) {
        return element.id;
      }
    }

    return null;
  }

  /**
   * Gets the bounding box of an element in viewBox coordinates
   *
   * @param element - Element to get bounds for
   * @returns Bounding box or null if bounds cannot be determined
   */
  getElementBounds(element: BaseElement): BoundingBox | null {
    const { x, y, scaleX, scaleY } = element.transform;

    switch (element.type) {
      case 'image': {
        const img = element as ImageElement;
        return {
          x,
          y,
          width: img.width * scaleX,
          height: img.height * scaleY,
        };
      }

      case 'text': {
        const text = element as TextElement;
        // Approximate text bounds - actual bounds would require DOM measurement
        const estimatedWidth = text.content.length * text.fontSize * 0.6 * scaleX;
        const estimatedHeight = text.fontSize * 1.2 * scaleY;

        // Adjust x based on text anchor
        let adjustedX = x;
        if (text.textAnchor === 'middle') {
          adjustedX = x - estimatedWidth / 2;
        } else if (text.textAnchor === 'end') {
          adjustedX = x - estimatedWidth;
        }

        return {
          x: adjustedX,
          y: y - estimatedHeight, // Text baseline is at y
          width: estimatedWidth,
          height: estimatedHeight,
        };
      }

      case 'shape': {
        const shape = element as ShapeElement;
        return this._getShapeBounds(shape);
      }

      case 'group': {
        // Group bounds would be the union of all children
        // For now, return null - groups need special handling
        return null;
      }

      default:
        return null;
    }
  }

  /**
   * Gets bounding box for shape elements
   */
  private _getShapeBounds(shape: ShapeElement): BoundingBox | null {
    const { x, y, scaleX, scaleY } = shape.transform;

    switch (shape.shapeType) {
      case 'rect':
        if (shape.width !== undefined && shape.height !== undefined) {
          return {
            x,
            y,
            width: shape.width * scaleX,
            height: shape.height * scaleY,
          };
        }
        return null;

      case 'circle':
        // When a circle is scaled non-uniformly, it becomes an ellipse visually.
        // Calculate bounds as if it were an ellipse with rx=ry=r to match visual appearance.
        if (shape.r !== undefined) {
          const scaledRx = shape.r * Math.abs(scaleX);
          const scaledRy = shape.r * Math.abs(scaleY);
          return {
            x: x - scaledRx,
            y: y - scaledRy,
            width: scaledRx * 2,
            height: scaledRy * 2,
          };
        }
        return null;

      case 'ellipse':
        if (shape.rx !== undefined && shape.ry !== undefined) {
          const scaledRx = shape.rx * Math.abs(scaleX);
          const scaledRy = shape.ry * Math.abs(scaleY);
          return {
            x: x - scaledRx,
            y: y - scaledRy,
            width: scaledRx * 2,
            height: scaledRy * 2,
          };
        }
        return null;

      case 'path':
        // Path bounds would require parsing the path data
        // Return a default small bounds at the transform position
        return {
          x,
          y,
          width: 100 * scaleX,
          height: 100 * scaleY,
        };

      default:
        return null;
    }
  }

  /**
   * Gets handle positions for the given bounding box
   */
  private _getHandlePositions(bounds: BoundingBox): Map<HandleType, ViewBoxPoint> {
    const { x, y, width, height } = bounds;
    const cx = x + width / 2;
    const cy = y + height / 2;
    const rotateOffset = this._config.coordinateTransformer.screenDistanceToViewBox(
      this._config.handleConfig.rotateHandleOffset,
    );

    return new Map<HandleType, ViewBoxPoint>([
      ['nw', { x, y }],
      ['n', { x: cx, y }],
      ['ne', { x: x + width, y }],
      ['w', { x, y: cy }],
      ['e', { x: x + width, y: cy }],
      ['sw', { x, y: y + height }],
      ['s', { x: cx, y: y + height }],
      ['se', { x: x + width, y: y + height }],
      ['rotate', { x: cx, y: y - rotateOffset }],
    ]);
  }

  /**
   * Gets the hit radius for handles in viewBox units
   */
  private _getHandleHitRadius(): number {
    // Use handle size plus some padding for easier clicking
    const handleSize = this._config.handleConfig.size;
    return this._config.coordinateTransformer.screenDistanceToViewBox(handleSize * 1.5);
  }

  /**
   * Checks if a point is within a radius of a target point
   */
  private _isPointInRadius(point: ViewBoxPoint, target: ViewBoxPoint, radius: number): boolean {
    const dx = point.x - target.x;
    const dy = point.y - target.y;
    return dx * dx + dy * dy <= radius * radius;
  }

  /**
   * Checks if a point is within a bounding box, accounting for rotation
   */
  private _isPointInBounds(point: ViewBoxPoint, bounds: BoundingBox, rotation: number): boolean {
    // If no rotation, simple bounds check
    if (rotation === 0) {
      return (
        point.x >= bounds.x &&
        point.x <= bounds.x + bounds.width &&
        point.y >= bounds.y &&
        point.y <= bounds.y + bounds.height
      );
    }

    // For rotated elements, transform the point to the element's local coordinate system
    const cx = bounds.x + bounds.width / 2;
    const cy = bounds.y + bounds.height / 2;

    // Rotate point around center in opposite direction
    const rad = (-rotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    const dx = point.x - cx;
    const dy = point.y - cy;

    const localX = cx + dx * cos - dy * sin;
    const localY = cy + dx * sin + dy * cos;

    // Now check against unrotated bounds
    return (
      localX >= bounds.x &&
      localX <= bounds.x + bounds.width &&
      localY >= bounds.y &&
      localY <= bounds.y + bounds.height
    );
  }
}
