/**
 * Interaction layer type definitions for SVG Composer
 */

import type { BoundingBox } from '../core/types.js';

/**
 * Represents a point in screen/client coordinates
 */
export interface ScreenPoint {
  screenX: number;
  screenY: number;
}

/**
 * Represents a point in viewBox coordinates
 */
export interface ViewBoxPoint {
  x: number;
  y: number;
}

/**
 * Current interaction state
 */
export type InteractionState =
  | 'idle'
  | 'selecting'
  | 'dragging'
  | 'resizing'
  | 'rotating'
  | 'panning';

/**
 * Handle types for resize and rotate operations
 */
export type HandleType = 'nw' | 'n' | 'ne' | 'w' | 'e' | 'sw' | 's' | 'se' | 'rotate';

/**
 * Result of a hit test operation
 */
export interface HitTestResult {
  /** What was hit */
  type: 'element' | 'handle' | 'background';
  /** Element ID if an element or its handle was hit */
  elementId?: string;
  /** Handle type if a handle was hit */
  handleType?: HandleType;
}

/**
 * State tracked during a drag operation
 */
export interface DragState {
  /** Point where drag started */
  startPoint: ViewBoxPoint;
  /** Current drag point */
  currentPoint: ViewBoxPoint;
  /** Initial positions of elements being dragged */
  elementStartPositions: Map<string, { x: number; y: number }>;
}

/**
 * State tracked during a resize operation
 */
export interface ResizeState {
  /** Element being resized */
  elementId: string;
  /** Which handle is being dragged */
  handleType: HandleType;
  /** Point where resize started */
  startPoint: ViewBoxPoint;
  /** Original bounding box of the element */
  originalBounds: BoundingBox;
  /** Original transform values */
  originalTransform: {
    x: number;
    y: number;
    scaleX: number;
    scaleY: number;
  };
}

/**
 * State tracked during a rotate operation
 */
export interface RotateState {
  /** Element being rotated */
  elementId: string;
  /** Center point of rotation */
  centerPoint: ViewBoxPoint;
  /** Angle at start of rotation (degrees) */
  startAngle: number;
  /** Original rotation of element (degrees) */
  originalRotation: number;
}

/**
 * Viewport state for pan and zoom
 */
export interface ViewportState {
  /** Horizontal pan offset in viewBox units */
  panX: number;
  /** Vertical pan offset in viewBox units */
  panY: number;
  /** Zoom level (1.0 = 100%) */
  zoom: number;
}

/**
 * Configuration for transform handles
 */
export interface HandleConfig {
  /** Handle size in pixels (screen space) */
  size: number;
  /** Stroke color for handles */
  strokeColor: string;
  /** Fill color for handles */
  fillColor: string;
  /** Distance of rotation handle above selection box */
  rotateHandleOffset: number;
}

/**
 * Default handle configuration
 */
export const DEFAULT_HANDLE_CONFIG: HandleConfig = {
  size: 8,
  strokeColor: '#0066ff',
  fillColor: '#ffffff',
  rotateHandleOffset: 25,
};

/**
 * Default viewport state
 */
export const DEFAULT_VIEWPORT_STATE: ViewportState = {
  panX: 0,
  panY: 0,
  zoom: 1,
};
