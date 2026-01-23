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
  | 'panning'
  | 'drawing';

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

/**
 * Zoom limits for viewport
 */
export const ZOOM_LIMITS = {
  /** Minimum zoom level (10%) */
  MIN: 0.1,
  /** Maximum zoom level (1000%) */
  MAX: 10,
} as const;

/**
 * Tracked pointer information for multi-touch gestures
 */
export interface PointerInfo {
  /** Unique pointer identifier */
  pointerId: number;
  /** Pointer type (mouse, touch, pen) */
  pointerType: string;
  /** Current X position in screen coordinates */
  clientX: number;
  /** Current Y position in screen coordinates */
  clientY: number;
  /** Current position in viewBox coordinates */
  viewBoxPoint: ViewBoxPoint;
  /** Whether this is the primary pointer */
  isPrimary: boolean;
}

/**
 * State for tracking multi-touch gestures
 */
export interface GestureState {
  /** Type of gesture being performed */
  type: 'pinch' | 'pan';
  /** Initial distance between two touch points (for pinch) */
  initialDistance: number;
  /** Current distance between two touch points (for pinch) */
  currentDistance: number;
  /** Initial zoom level when gesture started */
  initialZoom: number;
  /** Center point of the gesture in viewBox coordinates */
  centerPoint: ViewBoxPoint;
  /** Initial pan offset when gesture started */
  initialPan: { x: number; y: number };
}

/**
 * Configuration for gesture recognition
 */
export interface GestureConfig {
  /** Minimum distance change in pixels to trigger pinch zoom */
  pinchThreshold: number;
  /** Minimum angle change in degrees to trigger rotation */
  rotationThreshold: number;
}

/**
 * Default gesture configuration
 */
export const DEFAULT_GESTURE_CONFIG: GestureConfig = {
  pinchThreshold: 10,
  rotationThreshold: 5,
};
