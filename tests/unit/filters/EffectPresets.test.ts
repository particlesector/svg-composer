/**
 * EffectPresets utility tests
 */

import { describe, it, expect } from 'vitest';
import {
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
} from '../../../src/filters/EffectPresets.js';

describe('EffectPresets', () => {
  // ============================================================
  // Blur Effects
  // ============================================================

  describe('blur', () => {
    it('should create a blur effect with the given radius', () => {
      const effect = blur(5);
      expect(effect.type).toBe('blur');
      expect(effect.radius).toBe(5);
    });
  });

  // ============================================================
  // Shadow Effects
  // ============================================================

  describe('dropShadow', () => {
    it('should create a drop shadow with default values', () => {
      const effect = dropShadow({});
      expect(effect.type).toBe('dropShadow');
      expect(effect.offsetX).toBe(4);
      expect(effect.offsetY).toBe(4);
      expect(effect.blur).toBe(4);
      expect(effect.color).toBe('rgba(0,0,0,0.5)');
    });

    it('should create a drop shadow with custom values', () => {
      const effect = dropShadow({
        offsetX: 10,
        offsetY: 10,
        blur: 20,
        color: '#ff0000',
        opacity: 0.8,
      });
      expect(effect.offsetX).toBe(10);
      expect(effect.offsetY).toBe(10);
      expect(effect.blur).toBe(20);
      expect(effect.color).toBe('#ff0000');
      expect(effect.opacity).toBe(0.8);
    });
  });

  describe('innerShadow', () => {
    it('should create an inner shadow with default values', () => {
      const effect = innerShadow({});
      expect(effect.type).toBe('innerShadow');
      expect(effect.offsetX).toBe(2);
      expect(effect.offsetY).toBe(2);
      expect(effect.blur).toBe(4);
    });

    it('should create an inner shadow with custom values', () => {
      const effect = innerShadow({
        offsetX: 5,
        offsetY: 5,
        blur: 10,
        color: '#000000',
      });
      expect(effect.offsetX).toBe(5);
      expect(effect.offsetY).toBe(5);
      expect(effect.blur).toBe(10);
      expect(effect.color).toBe('#000000');
    });
  });

  describe('glow', () => {
    it('should create a glow effect with default values', () => {
      const effect = glow({});
      expect(effect.type).toBe('glow');
      expect(effect.radius).toBe(8);
      expect(effect.color).toBe('#ffffff');
    });

    it('should create an inner glow when specified', () => {
      const effect = glow({ inner: true });
      expect(effect.inner).toBe(true);
    });
  });

  describe('outline', () => {
    it('should create an outline effect with default values', () => {
      const effect = outline({});
      expect(effect.type).toBe('outline');
      expect(effect.width).toBe(2);
      expect(effect.color).toBe('#000000');
    });

    it('should create an outline effect with custom values', () => {
      const effect = outline({ width: 5, color: '#ff0000' });
      expect(effect.width).toBe(5);
      expect(effect.color).toBe('#ff0000');
    });
  });

  // ============================================================
  // Color Effects
  // ============================================================

  describe('grayscale', () => {
    it('should create a grayscale effect with default amount', () => {
      const effect = grayscale();
      expect(effect.type).toBe('grayscale');
      expect(effect.amount).toBeUndefined();
    });

    it('should create a grayscale effect with custom amount', () => {
      const effect = grayscale(0.5);
      expect(effect.amount).toBe(0.5);
    });
  });

  describe('sepia', () => {
    it('should create a sepia effect', () => {
      const effect = sepia(0.8);
      expect(effect.type).toBe('sepia');
      expect(effect.amount).toBe(0.8);
    });
  });

  describe('saturate', () => {
    it('should create a saturate effect', () => {
      const effect = saturate(2);
      expect(effect.type).toBe('saturate');
      expect(effect.amount).toBe(2);
    });
  });

  describe('hueRotate', () => {
    it('should create a hue rotate effect', () => {
      const effect = hueRotate(90);
      expect(effect.type).toBe('hueRotate');
      expect(effect.angle).toBe(90);
    });
  });

  describe('invert', () => {
    it('should create an invert effect', () => {
      const effect = invert(1);
      expect(effect.type).toBe('invert');
      expect(effect.amount).toBe(1);
    });
  });

  // ============================================================
  // Brightness & Contrast
  // ============================================================

  describe('brightness', () => {
    it('should create a brightness effect', () => {
      const effect = brightness(1.5);
      expect(effect.type).toBe('brightness');
      expect(effect.amount).toBe(1.5);
    });
  });

  describe('contrast', () => {
    it('should create a contrast effect', () => {
      const effect = contrast(1.5);
      expect(effect.type).toBe('contrast');
      expect(effect.amount).toBe(1.5);
    });
  });

  describe('brightnessContrast', () => {
    it('should create a combined brightness/contrast effect with defaults', () => {
      const effect = brightnessContrast({});
      expect(effect.type).toBe('brightnessContrast');
      expect(effect.brightness).toBe(1);
      expect(effect.contrast).toBe(1);
    });

    it('should create a combined brightness/contrast effect with custom values', () => {
      const effect = brightnessContrast({ brightness: 1.2, contrast: 1.5 });
      expect(effect.brightness).toBe(1.2);
      expect(effect.contrast).toBe(1.5);
    });
  });

  // ============================================================
  // Enhancement Effects
  // ============================================================

  describe('sharpen', () => {
    it('should create a sharpen effect', () => {
      const effect = sharpen(0.5);
      expect(effect.type).toBe('sharpen');
      expect(effect.amount).toBe(0.5);
    });
  });

  describe('emboss', () => {
    it('should create an emboss effect with defaults', () => {
      const effect = emboss();
      expect(effect.type).toBe('emboss');
    });

    it('should create an emboss effect with custom values', () => {
      const effect = emboss({ strength: 2, angle: 45 });
      expect(effect.strength).toBe(2);
      expect(effect.angle).toBe(45);
    });
  });

  describe('noise', () => {
    it('should create a noise effect', () => {
      const effect = noise({ intensity: 0.3 });
      expect(effect.type).toBe('noise');
      expect(effect.intensity).toBe(0.3);
    });

    it('should create a noise effect with fractal type', () => {
      const effect = noise({ intensity: 0.3, noiseType: 'fractal' });
      expect(effect.noiseType).toBe('fractal');
    });
  });

  // ============================================================
  // Stylized Effects
  // ============================================================

  describe('vintage', () => {
    it('should create a vintage effect', () => {
      const effect = vintage(0.8);
      expect(effect.type).toBe('vintage');
      expect(effect.intensity).toBe(0.8);
    });
  });

  describe('duotone', () => {
    it('should create a duotone effect', () => {
      const effect = duotone('#000000', '#ffffff');
      expect(effect.type).toBe('duotone');
      expect(effect.shadowColor).toBe('#000000');
      expect(effect.highlightColor).toBe('#ffffff');
    });
  });

  // ============================================================
  // Preset Collections
  // ============================================================

  describe('presets', () => {
    it('should have cardShadow preset', () => {
      const effect = presets.cardShadow();
      expect(effect.type).toBe('dropShadow');
    });

    it('should have floatingShadow preset', () => {
      const effect = presets.floatingShadow();
      expect(effect.type).toBe('dropShadow');
    });

    it('should have textShadow preset', () => {
      const effect = presets.textShadow();
      expect(effect.type).toBe('dropShadow');
    });

    it('should have neonGlow preset', () => {
      const effect = presets.neonGlow('#ff00ff');
      expect(effect.type).toBe('glow');
      expect(effect.color).toBe('#ff00ff');
    });

    it('should have innerGlow preset', () => {
      const effect = presets.innerGlow('#ffffff');
      expect(effect.type).toBe('glow');
      expect(effect.inner).toBe(true);
    });

    it('should have blackAndWhite preset', () => {
      const effect = presets.blackAndWhite();
      expect(effect.type).toBe('grayscale');
      expect(effect.amount).toBe(1);
    });

    it('should have faded preset', () => {
      const effect = presets.faded();
      expect(effect.type).toBe('brightnessContrast');
    });

    it('should have dramatic preset', () => {
      const effect = presets.dramatic();
      expect(effect.type).toBe('brightnessContrast');
    });

    it('should have warm preset', () => {
      const effect = presets.warm();
      expect(effect.type).toBe('hueRotate');
      expect(effect.angle).toBe(-15);
    });

    it('should have cool preset', () => {
      const effect = presets.cool();
      expect(effect.type).toBe('hueRotate');
      expect(effect.angle).toBe(15);
    });

    it('should have vintagePhoto preset', () => {
      const effect = presets.vintagePhoto();
      expect(effect.type).toBe('vintage');
    });

    it('should have backgroundBlur preset', () => {
      const effect = presets.backgroundBlur();
      expect(effect.type).toBe('blur');
    });

    it('should have filmGrain preset', () => {
      const effect = presets.filmGrain();
      expect(effect.type).toBe('noise');
    });

    it('should have cyberpunk preset', () => {
      const effect = presets.cyberpunk();
      expect(effect.type).toBe('duotone');
    });

    it('should have ocean preset', () => {
      const effect = presets.ocean();
      expect(effect.type).toBe('duotone');
    });

    it('should have sunset preset', () => {
      const effect = presets.sunset();
      expect(effect.type).toBe('duotone');
    });

    it('should have nashville preset returning array', () => {
      const effects = presets.nashville();
      expect(Array.isArray(effects)).toBe(true);
      expect(effects.length).toBe(2);
    });
  });

  // ============================================================
  // Type Guard
  // ============================================================

  describe('isEffectPreset', () => {
    it('should return true for valid effect presets', () => {
      expect(isEffectPreset(blur(5))).toBe(true);
      expect(isEffectPreset(dropShadow({}))).toBe(true);
      expect(isEffectPreset(grayscale())).toBe(true);
    });

    it('should return false for non-objects', () => {
      expect(isEffectPreset(null)).toBe(false);
      expect(isEffectPreset(undefined)).toBe(false);
      expect(isEffectPreset('string')).toBe(false);
      expect(isEffectPreset(123)).toBe(false);
    });

    it('should return false for objects without type', () => {
      expect(isEffectPreset({})).toBe(false);
      expect(isEffectPreset({ radius: 5 })).toBe(false);
    });

    it('should return false for objects with invalid type', () => {
      expect(isEffectPreset({ type: 'invalid' })).toBe(false);
    });
  });
});
