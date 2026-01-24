/**
 * Effect Preset Utilities for SVG Composer
 *
 * Provides convenient factory functions for creating common filter effects.
 * These utilities create properly typed effect presets that can be passed
 * directly to SVGComposer.addEffect() or SVGComposer.setEffect().
 */

import type {
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
} from './types.js';

// ============================================================
// Blur Effects
// ============================================================

/**
 * Creates a blur effect
 *
 * @param radius - Blur radius in viewBox units
 * @returns Blur effect preset
 *
 * @example
 * editor.addEffect(elementId, blur(5));
 */
export function blur(radius: number): BlurEffect {
  return { type: 'blur', radius };
}

// ============================================================
// Shadow Effects
// ============================================================

/**
 * Creates a drop shadow effect
 *
 * @param options - Shadow options
 * @returns Drop shadow effect preset
 *
 * @example
 * editor.addEffect(elementId, dropShadow({
 *   offsetX: 4,
 *   offsetY: 4,
 *   blur: 8,
 *   color: 'rgba(0,0,0,0.5)'
 * }));
 */
export function dropShadow(options: {
  offsetX?: number;
  offsetY?: number;
  blur?: number;
  color?: string;
  opacity?: number;
}): DropShadowEffect {
  const result: DropShadowEffect = {
    type: 'dropShadow',
    offsetX: options.offsetX ?? 4,
    offsetY: options.offsetY ?? 4,
    blur: options.blur ?? 4,
    color: options.color ?? 'rgba(0,0,0,0.5)',
  };
  if (options.opacity !== undefined) {
    result.opacity = options.opacity;
  }
  return result;
}

/**
 * Creates an inner shadow effect
 *
 * @param options - Shadow options
 * @returns Inner shadow effect preset
 */
export function innerShadow(options: {
  offsetX?: number;
  offsetY?: number;
  blur?: number;
  color?: string;
  opacity?: number;
}): InnerShadowEffect {
  const result: InnerShadowEffect = {
    type: 'innerShadow',
    offsetX: options.offsetX ?? 2,
    offsetY: options.offsetY ?? 2,
    blur: options.blur ?? 4,
    color: options.color ?? 'rgba(0,0,0,0.5)',
  };
  if (options.opacity !== undefined) {
    result.opacity = options.opacity;
  }
  return result;
}

/**
 * Creates a glow effect
 *
 * @param options - Glow options
 * @returns Glow effect preset
 *
 * @example
 * editor.addEffect(elementId, glow({ radius: 10, color: '#00ff00' }));
 */
export function glow(options: {
  radius?: number;
  color?: string;
  opacity?: number;
  inner?: boolean;
}): GlowEffect {
  const result: GlowEffect = {
    type: 'glow',
    radius: options.radius ?? 8,
    color: options.color ?? '#ffffff',
  };
  if (options.opacity !== undefined) {
    result.opacity = options.opacity;
  }
  if (options.inner !== undefined) {
    result.inner = options.inner;
  }
  return result;
}

/**
 * Creates an outline/stroke effect
 *
 * @param options - Outline options
 * @returns Outline effect preset
 */
export function outline(options: { width?: number; color?: string }): OutlineEffect {
  return {
    type: 'outline',
    width: options.width ?? 2,
    color: options.color ?? '#000000',
  };
}

// ============================================================
// Color Effects
// ============================================================

/**
 * Creates a grayscale effect
 *
 * @param amount - Amount of grayscale (0 to 1, where 1 is fully grayscale)
 * @returns Grayscale effect preset
 *
 * @example
 * editor.addEffect(elementId, grayscale(1)); // Full grayscale
 * editor.addEffect(elementId, grayscale(0.5)); // 50% grayscale
 */
export function grayscale(amount?: number): GrayscaleEffect {
  const result: GrayscaleEffect = { type: 'grayscale' };
  if (amount !== undefined) {
    result.amount = amount;
  }
  return result;
}

/**
 * Creates a sepia effect
 *
 * @param amount - Amount of sepia (0 to 1, where 1 is fully sepia)
 * @returns Sepia effect preset
 */
export function sepia(amount?: number): SepiaEffect {
  const result: SepiaEffect = { type: 'sepia' };
  if (amount !== undefined) {
    result.amount = amount;
  }
  return result;
}

/**
 * Creates a saturation adjustment effect
 *
 * @param amount - Saturation level (0 = grayscale, 1 = original, >1 = supersaturated)
 * @returns Saturate effect preset
 *
 * @example
 * editor.addEffect(elementId, saturate(2)); // Double saturation
 * editor.addEffect(elementId, saturate(0.5)); // Half saturation
 */
export function saturate(amount: number): SaturateEffect {
  return { type: 'saturate', amount };
}

/**
 * Creates a hue rotation effect
 *
 * @param angle - Rotation angle in degrees
 * @returns Hue rotate effect preset
 *
 * @example
 * editor.addEffect(elementId, hueRotate(90)); // Rotate hue by 90 degrees
 */
export function hueRotate(angle: number): HueRotateEffect {
  return { type: 'hueRotate', angle };
}

/**
 * Creates a color inversion effect
 *
 * @param amount - Amount of inversion (0 to 1, where 1 is fully inverted)
 * @returns Invert effect preset
 */
export function invert(amount?: number): InvertEffect {
  const result: InvertEffect = { type: 'invert' };
  if (amount !== undefined) {
    result.amount = amount;
  }
  return result;
}

// ============================================================
// Brightness & Contrast
// ============================================================

/**
 * Creates a brightness adjustment effect
 *
 * @param amount - Brightness multiplier (0 = black, 1 = original, >1 = brighter)
 * @returns Brightness effect preset
 *
 * @example
 * editor.addEffect(elementId, brightness(1.5)); // 50% brighter
 * editor.addEffect(elementId, brightness(0.5)); // 50% darker
 */
export function brightness(amount: number): BrightnessEffect {
  return { type: 'brightness', amount };
}

/**
 * Creates a contrast adjustment effect
 *
 * @param amount - Contrast multiplier (0 = gray, 1 = original, >1 = more contrast)
 * @returns Contrast effect preset
 */
export function contrast(amount: number): ContrastEffect {
  return { type: 'contrast', amount };
}

/**
 * Creates a combined brightness and contrast adjustment effect
 *
 * @param options - Brightness and contrast values
 * @returns Brightness/contrast effect preset
 *
 * @example
 * editor.addEffect(elementId, brightnessContrast({ brightness: 1.2, contrast: 1.5 }));
 */
export function brightnessContrast(options: {
  brightness?: number;
  contrast?: number;
}): BrightnessContrastEffect {
  return {
    type: 'brightnessContrast',
    brightness: options.brightness ?? 1,
    contrast: options.contrast ?? 1,
  };
}

// ============================================================
// Enhancement Effects
// ============================================================

/**
 * Creates a sharpening effect
 *
 * @param amount - Sharpening amount (0 = no sharpening, 1+ = more sharp)
 * @returns Sharpen effect preset
 */
export function sharpen(amount: number): SharpenEffect {
  return { type: 'sharpen', amount };
}

/**
 * Creates an emboss effect
 *
 * @param options - Emboss options
 * @returns Emboss effect preset
 */
export function emboss(options?: { strength?: number; angle?: number }): EmbossEffect {
  const result: EmbossEffect = { type: 'emboss' };
  if (options?.strength !== undefined) {
    result.strength = options.strength;
  }
  if (options?.angle !== undefined) {
    result.angle = options.angle;
  }
  return result;
}

/**
 * Creates a noise/grain effect
 *
 * @param options - Noise options
 * @returns Noise effect preset
 *
 * @example
 * editor.addEffect(elementId, noise({ intensity: 0.3 }));
 */
export function noise(options: {
  intensity: number;
  noiseType?: 'fractal' | 'turbulence';
  frequency?: number;
}): NoiseEffect {
  const result: NoiseEffect = {
    type: 'noise',
    intensity: options.intensity,
  };
  if (options.noiseType !== undefined) {
    result.noiseType = options.noiseType;
  }
  if (options.frequency !== undefined) {
    result.frequency = options.frequency;
  }
  return result;
}

// ============================================================
// Stylized Effects
// ============================================================

/**
 * Creates a vintage/retro photo effect
 *
 * @param intensity - Effect intensity (0 to 1)
 * @returns Vintage effect preset
 */
export function vintage(intensity?: number): VintageEffect {
  const result: VintageEffect = { type: 'vintage' };
  if (intensity !== undefined) {
    result.intensity = intensity;
  }
  return result;
}

/**
 * Creates a duotone color effect
 *
 * @param shadowColor - Color for dark areas
 * @param highlightColor - Color for light areas
 * @returns Duotone effect preset
 *
 * @example
 * editor.addEffect(elementId, duotone('#1a1a2e', '#f0e68c'));
 */
export function duotone(shadowColor: string, highlightColor: string): DuotoneEffect {
  return { type: 'duotone', shadowColor, highlightColor };
}

// ============================================================
// Preset Combinations
// ============================================================

/**
 * Common preset effect collections
 */
export const presets = {
  /**
   * Soft shadow for cards and elevated elements
   */
  cardShadow: (): DropShadowEffect =>
    dropShadow({ offsetX: 0, offsetY: 2, blur: 8, color: 'rgba(0,0,0,0.15)' }),

  /**
   * Strong shadow for floating elements
   */
  floatingShadow: (): DropShadowEffect =>
    dropShadow({ offsetX: 0, offsetY: 8, blur: 24, color: 'rgba(0,0,0,0.25)' }),

  /**
   * Subtle text shadow
   */
  textShadow: (): DropShadowEffect =>
    dropShadow({ offsetX: 1, offsetY: 1, blur: 2, color: 'rgba(0,0,0,0.3)' }),

  /**
   * Neon glow effect
   */
  neonGlow: (color: string = '#00ff00'): GlowEffect =>
    glow({ radius: 12, color, opacity: 0.8 }),

  /**
   * Soft inner glow
   */
  innerGlow: (color: string = '#ffffff'): GlowEffect =>
    glow({ radius: 6, color, opacity: 0.6, inner: true }),

  /**
   * Black and white photo effect
   */
  blackAndWhite: (): GrayscaleEffect => grayscale(1),

  /**
   * Faded/washed out look
   */
  faded: (): BrightnessContrastEffect =>
    brightnessContrast({ brightness: 1.1, contrast: 0.8 }),

  /**
   * High contrast dramatic look
   */
  dramatic: (): BrightnessContrastEffect =>
    brightnessContrast({ brightness: 0.95, contrast: 1.4 }),

  /**
   * Warm color temperature shift
   */
  warm: (): HueRotateEffect => hueRotate(-15),

  /**
   * Cool color temperature shift
   */
  cool: (): HueRotateEffect => hueRotate(15),

  /**
   * Vintage photo look
   */
  vintagePhoto: (): VintageEffect => vintage(0.7),

  /**
   * Instagram-style filter (warm sepia tones)
   */
  nashville: (): EffectPreset[] => [
    brightnessContrast({ brightness: 1.1, contrast: 1.2 }),
    sepia(0.3),
  ],

  /**
   * Soft blur for backgrounds
   */
  backgroundBlur: (): BlurEffect => blur(8),

  /**
   * Film grain effect
   */
  filmGrain: (): NoiseEffect => noise({ intensity: 0.15, noiseType: 'fractal', frequency: 0.8 }),

  /**
   * Cyberpunk duotone
   */
  cyberpunk: (): DuotoneEffect => duotone('#0d0221', '#ff00ff'),

  /**
   * Ocean duotone
   */
  ocean: (): DuotoneEffect => duotone('#001529', '#00d4ff'),

  /**
   * Sunset duotone
   */
  sunset: (): DuotoneEffect => duotone('#1a0a0a', '#ff6b35'),
};

/**
 * Type guard to check if a value is an EffectPreset
 */
export function isEffectPreset(value: unknown): value is EffectPreset {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const obj = value as Record<string, unknown>;
  const typeValue = obj['type'];
  if (typeof typeValue !== 'string') {
    return false;
  }

  const validTypes = [
    'blur',
    'dropShadow',
    'innerShadow',
    'glow',
    'grayscale',
    'sepia',
    'saturate',
    'hueRotate',
    'brightness',
    'contrast',
    'invert',
    'sharpen',
    'emboss',
    'noise',
    'outline',
    'brightnessContrast',
    'vintage',
    'duotone',
  ];

  return validTypes.includes(typeValue);
}
