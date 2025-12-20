/**
 * Interaction module exports
 */

// Types
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
} from './types.js';

export { DEFAULT_HANDLE_CONFIG, DEFAULT_VIEWPORT_STATE } from './types.js';

// Core classes
export {
  CoordinateTransformer,
  type CoordinateTransformerConfig,
} from './CoordinateTransformer.js';
export { HitTester, type HitTesterConfig } from './HitTester.js';
export {
  SelectionHandleRenderer,
  type SelectionHandleRendererConfig,
  getRotatedCursor,
} from './SelectionHandleRenderer.js';
export { InteractionManager, type InteractionManagerConfig } from './InteractionManager.js';

// Tools
export { BaseTool, type ToolContext, type ToolComposerAccess } from './tools/index.js';
export { SelectTool } from './tools/index.js';
export { PanTool } from './tools/index.js';
