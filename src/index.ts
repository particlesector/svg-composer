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
  Guide,
  GuideInput,
  GuideOrientation,
  SnapTarget,
  SnapTargetType,
  SnapResult,
  SnappingConfig,
} from './core/types.js';

export { DEFAULT_SNAPPING_CONFIG } from './core/types.js';

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

// Rendering
export { SVGRenderer } from './rendering/SVGRenderer.js';
export type {
  SVGRendererConfig,
  ClipPathDef,
  RenderContext,
  ElementGetter,
  GuideRenderConfig,
  SnapLines,
} from './rendering/types.js';
export { DEFAULT_GUIDE_RENDER_CONFIG } from './rendering/types.js';

// Snapping
export {
  SnappingManager,
  type ActiveSnapLines,
  type BoundsGetter,
} from './interaction/SnappingManager.js';

// Filters & Effects
export type {
  // Filter types
  FilterPrimitiveType,
  FilterInput,
  BaseFilterPrimitive,
  GaussianBlurPrimitive,
  DropShadowPrimitive,
  ColorMatrixPrimitive,
  ComponentTransferPrimitive,
  MorphologyPrimitive,
  TurbulencePrimitive,
  DisplacementPrimitive,
  BlendPrimitive,
  CompositePrimitive,
  FloodPrimitive,
  MergePrimitive,
  OffsetPrimitive,
  ConvolveMatrixPrimitive,
  LightingPrimitive,
  FilterPrimitive,
  FilterDefinition,
  // Effect presets
  BlurEffect,
  DropShadowEffect,
  InnerShadowEffect,
  GlowEffect,
  GrayscaleEffect,
  SepiaEffect,
  SaturateEffect,
  HueRotateEffect,
  BrightnessEffect,
  ContrastEffect,
  InvertEffect,
  SharpenEffect,
  EmbossEffect,
  NoiseEffect,
  OutlineEffect,
  BrightnessContrastEffect,
  VintageEffect,
  DuotoneEffect,
  EffectPreset,
  EffectType,
  ElementFilter,
} from './filters/index.js';

export {
  FilterManager,
  // Effect preset utilities
  blur,
  dropShadow,
  innerShadow,
  glow,
  outline,
  grayscale,
  sepia,
  saturate,
  hueRotate,
  invert,
  brightness,
  contrast,
  brightnessContrast,
  sharpen,
  emboss,
  noise,
  vintage,
  duotone,
  presets,
  isEffectPreset,
} from './filters/index.js';
