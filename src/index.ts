/**
 * SVG Composer - A zero-dependency, TypeScript-based SVG canvas editor library
 *
 * @packageDocumentation
 */

// Main class
export { SVGComposer } from './core/SVGComposer.js';

// Core types
export type {
  Point,
  Transform,
  BoundingBox,
  ToolType,
  EditorEvents,
  SVGComposerOptions,
  CanvasState,
} from './core/types.js';

// Element types
export type {
  BaseElement,
  ImageElement,
  TextElement,
  ShapeElement,
  GroupElement,
  Element,
  ClipPath,
} from './elements/types.js';

// Utilities (export when implemented)
export { generateId } from './utils/IdGenerator.js';

// Internal classes (for advanced usage)
export { State, DEFAULT_OPTIONS } from './core/State.js';
export { History } from './core/History.js';
export { EventEmitter, EditorEventEmitter } from './core/EventEmitter.js';

// Interaction types
export type {
  ScreenPoint,
  ViewBoxPoint,
  InteractionState,
  HandleType,
  HitTestResult,
  DragState,
  ResizeState,
  RotateState,
  ViewportState,
  HandleConfig,
} from './interaction/types.js';

export { DEFAULT_HANDLE_CONFIG, DEFAULT_VIEWPORT_STATE } from './interaction/types.js';

// Interaction utilities
export {
  CoordinateTransformer,
  type CoordinateTransformerConfig,
} from './interaction/CoordinateTransformer.js';
