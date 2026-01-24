/**
 * Filters & Effects module for SVG Composer
 *
 * This module provides SVG filter functionality including:
 * - Filter primitive types (blur, shadow, color matrix, etc.)
 * - Effect presets (easy-to-use common effects)
 * - FilterManager for managing filter definitions
 *
 * @packageDocumentation
 */

// Types
export type {
  // Filter primitive types
  FilterPrimitiveType,
  FilterInput,
  BaseFilterPrimitive,
  GaussianBlurPrimitive,
  DropShadowPrimitive,
  ColorMatrixType,
  ColorMatrixPrimitive,
  TransferFunctionType,
  TransferFunction,
  ComponentTransferPrimitive,
  MorphologyOperator,
  MorphologyPrimitive,
  TurbulenceType,
  TurbulencePrimitive,
  DisplacementChannelSelector,
  DisplacementPrimitive,
  BlendMode,
  BlendPrimitive,
  CompositeOperator,
  CompositePrimitive,
  FloodPrimitive,
  MergeNode,
  MergePrimitive,
  OffsetPrimitive,
  ConvolveEdgeMode,
  ConvolveMatrixPrimitive,
  LightType,
  DistantLight,
  PointLight,
  SpotLight,
  LightSource,
  LightingPrimitive,
  FilterPrimitive,
  // Filter definition
  FilterUnits,
  FilterDefinition,
  FilterInput_Create,
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
  // Element filter reference
  ElementFilter,
  ElementFilters,
} from './types.js';

// FilterManager
export { FilterManager } from './FilterManager.js';

// Effect preset utilities
export {
  // Basic effects
  blur,
  dropShadow,
  innerShadow,
  glow,
  outline,
  // Color effects
  grayscale,
  sepia,
  saturate,
  hueRotate,
  invert,
  // Brightness & contrast
  brightness,
  contrast,
  brightnessContrast,
  // Enhancement
  sharpen,
  emboss,
  noise,
  // Stylized
  vintage,
  duotone,
  // Preset collections
  presets,
  // Utilities
  isEffectPreset,
} from './EffectPresets.js';
