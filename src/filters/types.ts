/**
 * Filter and effect type definitions for SVG Composer
 *
 * SVG filters allow for sophisticated visual effects by combining
 * filter primitives. This module defines types for both low-level
 * filter primitives and high-level effect presets.
 */

// ============================================================
// Filter Primitive Types
// ============================================================

/**
 * Base interface for all filter primitives
 */
export interface BaseFilterPrimitive {
  /** Discriminator for filter primitive type */
  type: FilterPrimitiveType;
  /** Optional input source (SourceGraphic, SourceAlpha, or result from previous primitive) */
  in?: FilterInput;
  /** Optional name for this primitive's result (to be used as input to other primitives) */
  result?: string;
}

/**
 * All available filter primitive types
 */
export type FilterPrimitiveType =
  | 'gaussianBlur'
  | 'dropShadow'
  | 'colorMatrix'
  | 'componentTransfer'
  | 'morphology'
  | 'turbulence'
  | 'displacement'
  | 'blend'
  | 'composite'
  | 'flood'
  | 'merge'
  | 'offset'
  | 'convolveMatrix'
  | 'lighting';

/**
 * Standard filter input sources
 * Can be a standard SVG filter input ('SourceGraphic', 'SourceAlpha', etc.)
 * or a result name from another primitive
 */
export type FilterInput = string;

// ============================================================
// Individual Filter Primitives
// ============================================================

/**
 * Gaussian blur filter primitive (feGaussianBlur)
 */
export interface GaussianBlurPrimitive extends BaseFilterPrimitive {
  type: 'gaussianBlur';
  /** Blur radius (standard deviation). Can be a single value or [x, y] */
  stdDeviation: number | [number, number];
  /** Edge mode for handling boundaries */
  edgeMode?: 'duplicate' | 'wrap' | 'none';
}

/**
 * Drop shadow filter primitive (feDropShadow)
 */
export interface DropShadowPrimitive extends BaseFilterPrimitive {
  type: 'dropShadow';
  /** Horizontal offset */
  dx: number;
  /** Vertical offset */
  dy: number;
  /** Blur radius (standard deviation) */
  stdDeviation: number;
  /** Shadow color (CSS color string) */
  floodColor: string;
  /** Shadow opacity (0.0 to 1.0) */
  floodOpacity?: number;
}

/**
 * Color matrix operation types
 */
export type ColorMatrixType = 'matrix' | 'saturate' | 'hueRotate' | 'luminanceToAlpha';

/**
 * Color matrix filter primitive (feColorMatrix)
 */
export interface ColorMatrixPrimitive extends BaseFilterPrimitive {
  type: 'colorMatrix';
  /** Type of color matrix operation */
  matrixType: ColorMatrixType;
  /**
   * Values for the operation:
   * - matrix: 20 values for 5x4 matrix (RGBA + offset)
   * - saturate: single value 0-1 (0 = grayscale, 1 = original)
   * - hueRotate: single value in degrees
   * - luminanceToAlpha: no values needed
   */
  values?: number | number[];
}

/**
 * Transfer function types for component transfer
 */
export type TransferFunctionType = 'identity' | 'table' | 'discrete' | 'linear' | 'gamma';

/**
 * Transfer function for a single color channel
 */
export interface TransferFunction {
  type: TransferFunctionType;
  /** Table values for 'table' and 'discrete' types */
  tableValues?: number[];
  /** Slope for 'linear' type */
  slope?: number;
  /** Intercept for 'linear' type */
  intercept?: number;
  /** Amplitude for 'gamma' type */
  amplitude?: number;
  /** Exponent for 'gamma' type */
  exponent?: number;
  /** Offset for 'gamma' type */
  offset?: number;
}

/**
 * Component transfer filter primitive (feComponentTransfer)
 * Used for brightness, contrast, and gamma adjustments
 */
export interface ComponentTransferPrimitive extends BaseFilterPrimitive {
  type: 'componentTransfer';
  /** Red channel transfer function */
  funcR?: TransferFunction;
  /** Green channel transfer function */
  funcG?: TransferFunction;
  /** Blue channel transfer function */
  funcB?: TransferFunction;
  /** Alpha channel transfer function */
  funcA?: TransferFunction;
}

/**
 * Morphology operation types
 */
export type MorphologyOperator = 'erode' | 'dilate';

/**
 * Morphology filter primitive (feMorphology)
 * Used for growing or shrinking shapes
 */
export interface MorphologyPrimitive extends BaseFilterPrimitive {
  type: 'morphology';
  /** Operation type */
  operator: MorphologyOperator;
  /** Radius of operation. Can be a single value or [x, y] */
  radius: number | [number, number];
}

/**
 * Turbulence types
 */
export type TurbulenceType = 'fractalNoise' | 'turbulence';

/**
 * Turbulence filter primitive (feTurbulence)
 * Generates Perlin noise patterns
 */
export interface TurbulencePrimitive extends BaseFilterPrimitive {
  type: 'turbulence';
  /** Type of noise */
  turbulenceType: TurbulenceType;
  /** Base frequency. Can be a single value or [x, y] */
  baseFrequency: number | [number, number];
  /** Number of octaves (detail levels) */
  numOctaves?: number;
  /** Seed for random number generator */
  seed?: number;
  /** Stitching tiles setting */
  stitchTiles?: 'stitch' | 'noStitch';
}

/**
 * Displacement map channel selectors
 */
export type DisplacementChannelSelector = 'R' | 'G' | 'B' | 'A';

/**
 * Displacement map filter primitive (feDisplacementMap)
 * Displaces pixels based on values from another image
 */
export interface DisplacementPrimitive extends BaseFilterPrimitive {
  type: 'displacement';
  /** Second input (displacement map) */
  in2: FilterInput;
  /** Scale factor for displacement */
  scale: number;
  /** Channel to use for X displacement */
  xChannelSelector?: DisplacementChannelSelector;
  /** Channel to use for Y displacement */
  yChannelSelector?: DisplacementChannelSelector;
}

/**
 * Blend mode types
 */
export type BlendMode =
  | 'normal'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'darken'
  | 'lighten'
  | 'color-dodge'
  | 'color-burn'
  | 'hard-light'
  | 'soft-light'
  | 'difference'
  | 'exclusion'
  | 'hue'
  | 'saturation'
  | 'color'
  | 'luminosity';

/**
 * Blend filter primitive (feBlend)
 * Composites two images using blend modes
 */
export interface BlendPrimitive extends BaseFilterPrimitive {
  type: 'blend';
  /** Second input */
  in2: FilterInput;
  /** Blend mode */
  mode: BlendMode;
}

/**
 * Composite operation types
 */
export type CompositeOperator = 'over' | 'in' | 'out' | 'atop' | 'xor' | 'lighter' | 'arithmetic';

/**
 * Composite filter primitive (feComposite)
 * Combines images using Porter-Duff operations
 */
export interface CompositePrimitive extends BaseFilterPrimitive {
  type: 'composite';
  /** Second input */
  in2: FilterInput;
  /** Composite operator */
  operator: CompositeOperator;
  /** k1 value for arithmetic mode */
  k1?: number;
  /** k2 value for arithmetic mode */
  k2?: number;
  /** k3 value for arithmetic mode */
  k3?: number;
  /** k4 value for arithmetic mode */
  k4?: number;
}

/**
 * Flood filter primitive (feFlood)
 * Fills the filter region with a color
 */
export interface FloodPrimitive extends BaseFilterPrimitive {
  type: 'flood';
  /** Fill color */
  floodColor: string;
  /** Fill opacity (0.0 to 1.0) */
  floodOpacity?: number;
}

/**
 * Merge node (for feMerge)
 */
export interface MergeNode {
  /** Input to merge */
  in: FilterInput;
}

/**
 * Merge filter primitive (feMerge)
 * Layers multiple filter results together
 */
export interface MergePrimitive extends BaseFilterPrimitive {
  type: 'merge';
  /** Nodes to merge (rendered in order, first on bottom) */
  nodes: MergeNode[];
}

/**
 * Offset filter primitive (feOffset)
 * Offsets the input image
 */
export interface OffsetPrimitive extends BaseFilterPrimitive {
  type: 'offset';
  /** Horizontal offset */
  dx: number;
  /** Vertical offset */
  dy: number;
}

/**
 * Edge mode for convolve matrix
 */
export type ConvolveEdgeMode = 'duplicate' | 'wrap' | 'none';

/**
 * Convolve matrix filter primitive (feConvolveMatrix)
 * Applies a matrix convolution filter (sharpening, edge detection, etc.)
 */
export interface ConvolveMatrixPrimitive extends BaseFilterPrimitive {
  type: 'convolveMatrix';
  /** Convolution kernel matrix (flat array) */
  kernelMatrix: number[];
  /** Kernel size [columns, rows] */
  order: [number, number];
  /** Divisor for normalizing kernel */
  divisor?: number;
  /** Bias added after division */
  bias?: number;
  /** Target pixel in kernel [x, y] */
  targetX?: number;
  targetY?: number;
  /** Edge mode */
  edgeMode?: ConvolveEdgeMode;
  /** Preserve alpha channel */
  preserveAlpha?: boolean;
}

/**
 * Lighting source types
 */
export type LightType = 'distant' | 'point' | 'spot';

/**
 * Distant light source
 */
export interface DistantLight {
  type: 'distant';
  /** Azimuth angle in degrees */
  azimuth: number;
  /** Elevation angle in degrees */
  elevation: number;
}

/**
 * Point light source
 */
export interface PointLight {
  type: 'point';
  x: number;
  y: number;
  z: number;
}

/**
 * Spot light source
 */
export interface SpotLight {
  type: 'spot';
  x: number;
  y: number;
  z: number;
  /** Point at coordinates */
  pointsAtX: number;
  pointsAtY: number;
  pointsAtZ: number;
  /** Specular exponent */
  specularExponent?: number;
  /** Limiting cone angle */
  limitingConeAngle?: number;
}

export type LightSource = DistantLight | PointLight | SpotLight;

/**
 * Lighting filter primitive (feDiffuseLighting or feSpecularLighting)
 */
export interface LightingPrimitive extends BaseFilterPrimitive {
  type: 'lighting';
  /** Lighting type */
  lightingType: 'diffuse' | 'specular';
  /** Surface scale factor */
  surfaceScale?: number;
  /** Diffuse constant (for diffuse lighting) */
  diffuseConstant?: number;
  /** Specular constant (for specular lighting) */
  specularConstant?: number;
  /** Specular exponent (for specular lighting) */
  specularExponent?: number;
  /** Light color */
  lightingColor?: string;
  /** Light source */
  light: LightSource;
}

/**
 * Union type for all filter primitives
 */
export type FilterPrimitive =
  | GaussianBlurPrimitive
  | DropShadowPrimitive
  | ColorMatrixPrimitive
  | ComponentTransferPrimitive
  | MorphologyPrimitive
  | TurbulencePrimitive
  | DisplacementPrimitive
  | BlendPrimitive
  | CompositePrimitive
  | FloodPrimitive
  | MergePrimitive
  | OffsetPrimitive
  | ConvolveMatrixPrimitive
  | LightingPrimitive;

// ============================================================
// Filter Definition
// ============================================================

/**
 * Filter units options
 */
export type FilterUnits = 'userSpaceOnUse' | 'objectBoundingBox';

/**
 * Complete filter definition
 */
export interface FilterDefinition {
  /** Unique identifier */
  id: string;
  /** Filter primitives (applied in order) */
  primitives: FilterPrimitive[];
  /** Filter region x (default: -10%) */
  x?: string | number;
  /** Filter region y (default: -10%) */
  y?: string | number;
  /** Filter region width (default: 120%) */
  width?: string | number;
  /** Filter region height (default: 120%) */
  height?: string | number;
  /** Units for filter region */
  filterUnits?: FilterUnits;
  /** Units for primitive coordinates */
  primitiveUnits?: FilterUnits;
  /** Color interpolation mode */
  colorInterpolationFilters?: 'auto' | 'sRGB' | 'linearRGB';
}

/**
 * Input type for creating a new filter
 */
export type FilterInput_Create = Omit<FilterDefinition, 'id'>;

// ============================================================
// Effect Presets
// ============================================================

/**
 * Blur effect preset
 */
export interface BlurEffect {
  type: 'blur';
  /** Blur radius in viewBox units */
  radius: number;
}

/**
 * Drop shadow effect preset
 */
export interface DropShadowEffect {
  type: 'dropShadow';
  /** Horizontal offset */
  offsetX: number;
  /** Vertical offset */
  offsetY: number;
  /** Blur radius */
  blur: number;
  /** Shadow color */
  color: string;
  /** Shadow opacity (0.0 to 1.0) */
  opacity?: number;
}

/**
 * Inner shadow effect preset
 */
export interface InnerShadowEffect {
  type: 'innerShadow';
  /** Horizontal offset */
  offsetX: number;
  /** Vertical offset */
  offsetY: number;
  /** Blur radius */
  blur: number;
  /** Shadow color */
  color: string;
  /** Shadow opacity (0.0 to 1.0) */
  opacity?: number;
}

/**
 * Glow effect preset
 */
export interface GlowEffect {
  type: 'glow';
  /** Glow radius */
  radius: number;
  /** Glow color */
  color: string;
  /** Glow opacity (0.0 to 1.0) */
  opacity?: number;
  /** Whether glow is inside (inner glow) or outside */
  inner?: boolean;
}

/**
 * Grayscale effect preset
 */
export interface GrayscaleEffect {
  type: 'grayscale';
  /** Amount of grayscale (0.0 to 1.0, where 1.0 is fully grayscale) */
  amount?: number;
}

/**
 * Sepia effect preset
 */
export interface SepiaEffect {
  type: 'sepia';
  /** Amount of sepia (0.0 to 1.0, where 1.0 is fully sepia) */
  amount?: number;
}

/**
 * Saturation adjustment effect preset
 */
export interface SaturateEffect {
  type: 'saturate';
  /** Saturation level (0 = grayscale, 1 = original, >1 = supersaturated) */
  amount: number;
}

/**
 * Hue rotation effect preset
 */
export interface HueRotateEffect {
  type: 'hueRotate';
  /** Rotation angle in degrees */
  angle: number;
}

/**
 * Brightness adjustment effect preset
 */
export interface BrightnessEffect {
  type: 'brightness';
  /** Brightness multiplier (0 = black, 1 = original, >1 = brighter) */
  amount: number;
}

/**
 * Contrast adjustment effect preset
 */
export interface ContrastEffect {
  type: 'contrast';
  /** Contrast multiplier (0 = gray, 1 = original, >1 = more contrast) */
  amount: number;
}

/**
 * Invert colors effect preset
 */
export interface InvertEffect {
  type: 'invert';
  /** Amount of inversion (0.0 to 1.0, where 1.0 is fully inverted) */
  amount?: number;
}

/**
 * Sharpen effect preset
 */
export interface SharpenEffect {
  type: 'sharpen';
  /** Sharpening amount (0.0 to 1.0+) */
  amount: number;
}

/**
 * Emboss effect preset
 */
export interface EmbossEffect {
  type: 'emboss';
  /** Emboss strength */
  strength?: number;
  /** Light angle in degrees */
  angle?: number;
}

/**
 * Noise/grain effect preset
 */
export interface NoiseEffect {
  type: 'noise';
  /** Noise intensity (0.0 to 1.0) */
  intensity: number;
  /** Noise type */
  noiseType?: 'fractal' | 'turbulence';
  /** Base frequency */
  frequency?: number;
}

/**
 * Outline/stroke effect preset
 */
export interface OutlineEffect {
  type: 'outline';
  /** Outline width */
  width: number;
  /** Outline color */
  color: string;
}

/**
 * Combined brightness and contrast adjustment
 */
export interface BrightnessContrastEffect {
  type: 'brightnessContrast';
  /** Brightness multiplier (0 = black, 1 = original, >1 = brighter) */
  brightness: number;
  /** Contrast multiplier (0 = gray, 1 = original, >1 = more contrast) */
  contrast: number;
}

/**
 * Vintage/retro photo effect
 */
export interface VintageEffect {
  type: 'vintage';
  /** Intensity of the effect (0.0 to 1.0) */
  intensity?: number;
}

/**
 * Duotone color effect
 */
export interface DuotoneEffect {
  type: 'duotone';
  /** Shadow/dark color */
  shadowColor: string;
  /** Highlight/light color */
  highlightColor: string;
}

/**
 * Union type for all effect presets
 */
export type EffectPreset =
  | BlurEffect
  | DropShadowEffect
  | InnerShadowEffect
  | GlowEffect
  | GrayscaleEffect
  | SepiaEffect
  | SaturateEffect
  | HueRotateEffect
  | BrightnessEffect
  | ContrastEffect
  | InvertEffect
  | SharpenEffect
  | EmbossEffect
  | NoiseEffect
  | OutlineEffect
  | BrightnessContrastEffect
  | VintageEffect
  | DuotoneEffect;

/**
 * All effect preset types
 */
export type EffectType = EffectPreset['type'];

// ============================================================
// Element Filter Reference
// ============================================================

/**
 * Filter reference that can be applied to an element.
 * Can be either a direct effect preset or a reference to a custom filter.
 */
export type ElementFilter =
  | { type: 'preset'; effect: EffectPreset }
  | { type: 'custom'; filterId: string };

/**
 * Multiple filters applied to an element (applied in order)
 */
export interface ElementFilters {
  /** List of filters to apply */
  filters: ElementFilter[];
}
