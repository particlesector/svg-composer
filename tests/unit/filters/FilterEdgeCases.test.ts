/**
 * Edge case tests for filters and effects
 * Tests boundary values, error handling, and unusual configurations
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SVGComposer } from '../../../src/core/SVGComposer.js';
import { FilterManager } from '../../../src/filters/FilterManager.js';
import {
  blur,
  dropShadow,
  glow,
  innerShadow,
  outline,
  grayscale,
  saturate,
  hueRotate,
  brightness,
  contrast,
  brightnessContrast,
  sharpen,
  emboss,
  noise,
  duotone,
  isEffectPreset,
} from '../../../src/filters/EffectPresets.js';
import type { Transform } from '../../../src/core/types.js';
import type { ImageElement } from '../../../src/elements/types.js';
import type { EffectPreset, GaussianBlurPrimitive } from '../../../src/filters/types.js';

// Helper to create test transforms
function createTestTransform(overrides?: Partial<Transform>): Transform {
  return {
    x: 100,
    y: 100,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    ...overrides,
  };
}

// Helper to create test image element data
function createTestImageElement(
  overrides?: Partial<Omit<ImageElement, 'id'>>,
): Omit<ImageElement, 'id'> {
  return {
    type: 'image',
    src: 'test.jpg',
    width: 100,
    height: 100,
    transform: createTestTransform(),
    opacity: 1,
    zIndex: 0,
    locked: false,
    visible: true,
    ...overrides,
  };
}

describe('Filter Edge Cases', () => {
  let container: HTMLDivElement;
  let editor: SVGComposer;

  beforeEach(() => {
    container = document.createElement('div');
    container.id = 'test-container';
    document.body.appendChild(container);
    editor = new SVGComposer(container);
  });

  // ============================================================
  // Boundary Values - Zero
  // ============================================================

  describe('Zero Values', () => {
    it('should handle blur with radius 0', () => {
      const effect = blur(0);
      expect(effect.radius).toBe(0);

      const elementId = editor.addElement(createTestImageElement());
      editor.addEffect(elementId, effect);

      const svg = editor.toSVG();
      expect(svg).toContain('stdDeviation="0"');
    });

    it('should handle dropShadow with zero blur', () => {
      const effect = dropShadow({ offsetX: 4, offsetY: 4, blur: 0, color: '#000' });
      expect(effect.blur).toBe(0);

      const elementId = editor.addElement(createTestImageElement());
      editor.addEffect(elementId, effect);

      const svg = editor.toSVG();
      expect(svg).toContain('stdDeviation="0"');
    });

    it('should handle dropShadow with zero offsets', () => {
      const effect = dropShadow({ offsetX: 0, offsetY: 0, blur: 4, color: '#000' });
      expect(effect.offsetX).toBe(0);
      expect(effect.offsetY).toBe(0);

      const elementId = editor.addElement(createTestImageElement());
      editor.addEffect(elementId, effect);

      const svg = editor.toSVG();
      expect(svg).toContain('dx="0"');
      expect(svg).toContain('dy="0"');
    });

    it('should handle glow with radius 0', () => {
      const effect = glow({ radius: 0, color: '#fff' });
      expect(effect.radius).toBe(0);

      const elementId = editor.addElement(createTestImageElement());
      editor.addEffect(elementId, effect);

      const svg = editor.toSVG();
      expect(svg).toContain('<filter');
    });

    it('should handle outline with width 0', () => {
      const effect = outline({ width: 0, color: '#000' });
      expect(effect.width).toBe(0);

      const elementId = editor.addElement(createTestImageElement());
      editor.addEffect(elementId, effect);

      const svg = editor.toSVG();
      expect(svg).toContain('radius="0"');
    });

    it('should handle grayscale with amount 0 (no effect)', () => {
      const effect = grayscale(0);
      expect(effect.amount).toBe(0);

      const elementId = editor.addElement(createTestImageElement());
      editor.addEffect(elementId, effect);

      const svg = editor.toSVG();
      // Grayscale 0 should produce identity matrix: 1 0 0 0 0 | 0 1 0 0 0 | 0 0 1 0 0 | 0 0 0 1 0
      expect(svg).toContain('type="matrix"');
      expect(svg).toContain('values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0"');
    });

    it('should handle brightness with amount 0 (black)', () => {
      const effect = brightness(0);
      expect(effect.amount).toBe(0);

      const elementId = editor.addElement(createTestImageElement());
      editor.addEffect(elementId, effect);

      const svg = editor.toSVG();
      expect(svg).toContain('slope="0"');
    });

    it('should handle contrast with amount 0', () => {
      const effect = contrast(0);
      expect(effect.amount).toBe(0);

      const elementId = editor.addElement(createTestImageElement());
      editor.addEffect(elementId, effect);

      const svg = editor.toSVG();
      expect(svg).toContain('<feComponentTransfer');
    });

    it('should handle sharpen with amount 0', () => {
      const effect = sharpen(0);
      expect(effect.amount).toBe(0);

      const elementId = editor.addElement(createTestImageElement());
      editor.addEffect(elementId, effect);

      const svg = editor.toSVG();
      expect(svg).toContain('<feConvolveMatrix');
    });
  });

  // ============================================================
  // Boundary Values - Large Numbers
  // ============================================================

  describe('Large Values', () => {
    it('should handle very large blur radius', () => {
      const effect = blur(1000);
      expect(effect.radius).toBe(1000);

      const elementId = editor.addElement(createTestImageElement());
      editor.addEffect(elementId, effect);

      const svg = editor.toSVG();
      expect(svg).toContain('stdDeviation="1000"');
    });

    it('should handle very large drop shadow offsets', () => {
      const effect = dropShadow({ offsetX: 500, offsetY: 500, blur: 10, color: '#000' });

      const elementId = editor.addElement(createTestImageElement());
      editor.addEffect(elementId, effect);

      const svg = editor.toSVG();
      expect(svg).toContain('dx="500"');
      expect(svg).toContain('dy="500"');
    });

    it('should handle saturate with very high value (oversaturation)', () => {
      const effect = saturate(10);
      expect(effect.amount).toBe(10);

      const elementId = editor.addElement(createTestImageElement());
      editor.addEffect(elementId, effect);

      const svg = editor.toSVG();
      expect(svg).toContain('values="10"');
    });

    it('should handle hueRotate with 360+ degrees', () => {
      const effect = hueRotate(720);
      expect(effect.angle).toBe(720);

      const elementId = editor.addElement(createTestImageElement());
      editor.addEffect(elementId, effect);

      const svg = editor.toSVG();
      expect(svg).toContain('values="720"');
    });

    it('should handle brightness with very high value', () => {
      const effect = brightness(10);
      expect(effect.amount).toBe(10);

      const elementId = editor.addElement(createTestImageElement());
      editor.addEffect(elementId, effect);

      const svg = editor.toSVG();
      expect(svg).toContain('slope="10"');
    });
  });

  // ============================================================
  // Boundary Values - Negative Numbers
  // ============================================================

  describe('Negative Values', () => {
    it('should handle negative drop shadow offsets', () => {
      const effect = dropShadow({ offsetX: -10, offsetY: -10, blur: 5, color: '#000' });

      const elementId = editor.addElement(createTestImageElement());
      editor.addEffect(elementId, effect);

      const svg = editor.toSVG();
      expect(svg).toContain('dx="-10"');
      expect(svg).toContain('dy="-10"');
    });

    it('should handle negative hueRotate angle', () => {
      const effect = hueRotate(-45);
      expect(effect.angle).toBe(-45);

      const elementId = editor.addElement(createTestImageElement());
      editor.addEffect(elementId, effect);

      const svg = editor.toSVG();
      expect(svg).toContain('values="-45"');
    });

    it('should handle innerShadow with negative offsets', () => {
      const effect = innerShadow({ offsetX: -3, offsetY: -3, blur: 5, color: '#000' });

      const elementId = editor.addElement(createTestImageElement());
      editor.addEffect(elementId, effect);

      const svg = editor.toSVG();
      expect(svg).toContain('dx="-3"');
      expect(svg).toContain('dy="-3"');
    });
  });

  // ============================================================
  // Boundary Values - Decimal/Fractional
  // ============================================================

  describe('Decimal Values', () => {
    it('should handle blur with decimal radius', () => {
      const effect = blur(2.5);
      expect(effect.radius).toBe(2.5);

      const elementId = editor.addElement(createTestImageElement());
      editor.addEffect(elementId, effect);

      const svg = editor.toSVG();
      expect(svg).toContain('stdDeviation="2.5"');
    });

    it('should handle grayscale with decimal amount', () => {
      const effect = grayscale(0.33);
      expect(effect.amount).toBe(0.33);

      const elementId = editor.addElement(createTestImageElement());
      editor.addEffect(elementId, effect);

      const svg = editor.toSVG();
      // Grayscale uses matrix interpolation with luminance coefficients
      expect(svg).toContain('type="matrix"');
      expect(svg).toMatch(/values="[\d.\s-]+"/);
    });

    it('should handle opacity with small decimal', () => {
      const effect = dropShadow({ offsetX: 4, offsetY: 4, blur: 4, color: '#000', opacity: 0.1 });
      expect(effect.opacity).toBe(0.1);

      const elementId = editor.addElement(createTestImageElement());
      editor.addEffect(elementId, effect);

      const svg = editor.toSVG();
      expect(svg).toContain('flood-opacity="0.1"');
    });

    it('should handle noise with very small intensity', () => {
      const effect = noise({ intensity: 0.01 });
      expect(effect.intensity).toBe(0.01);

      const elementId = editor.addElement(createTestImageElement());
      editor.addEffect(elementId, effect);

      const svg = editor.toSVG();
      expect(svg).toContain('<feTurbulence');
    });
  });

  // ============================================================
  // Color Edge Cases
  // ============================================================

  describe('Color Edge Cases', () => {
    it('should handle 3-digit hex color', () => {
      const effect = dropShadow({ offsetX: 4, offsetY: 4, blur: 4, color: '#f00' });

      const elementId = editor.addElement(createTestImageElement());
      editor.addEffect(elementId, effect);

      const svg = editor.toSVG();
      expect(svg).toContain('flood-color="#f00"');
    });

    it('should handle rgba color string', () => {
      const effect = dropShadow({
        offsetX: 4,
        offsetY: 4,
        blur: 4,
        color: 'rgba(255, 0, 0, 0.5)',
      });

      const elementId = editor.addElement(createTestImageElement());
      editor.addEffect(elementId, effect);

      const svg = editor.toSVG();
      expect(svg).toContain('rgba(255, 0, 0, 0.5)');
    });

    it('should handle named colors', () => {
      const effect = glow({ radius: 10, color: 'red' });

      const elementId = editor.addElement(createTestImageElement());
      editor.addEffect(elementId, effect);

      const svg = editor.toSVG();
      expect(svg).toContain('flood-color="red"');
    });

    it('should handle duotone with white and black', () => {
      const effect = duotone('#000000', '#ffffff');

      const elementId = editor.addElement(createTestImageElement());
      editor.addEffect(elementId, effect);

      const svg = editor.toSVG();
      expect(svg).toContain('<feComponentTransfer');
    });

    it('should handle duotone with rgb() colors', () => {
      const effect = duotone('rgb(0, 0, 255)', 'rgb(255, 255, 0)');

      const elementId = editor.addElement(createTestImageElement());
      editor.addEffect(elementId, effect);

      const svg = editor.toSVG();
      expect(svg).toContain('<feComponentTransfer');
    });
  });

  // ============================================================
  // Empty and Missing Values
  // ============================================================

  describe('Empty and Default Values', () => {
    it('should handle grayscale with no amount (default)', () => {
      const effect = grayscale();
      expect(effect.amount).toBeUndefined();

      const elementId = editor.addElement(createTestImageElement());
      editor.addEffect(elementId, effect);

      const svg = editor.toSVG();
      expect(svg).toContain('<feColorMatrix');
    });

    it('should handle dropShadow with empty options object', () => {
      const effect = dropShadow({});

      expect(effect.offsetX).toBe(4); // default
      expect(effect.offsetY).toBe(4); // default
      expect(effect.blur).toBe(4); // default

      const elementId = editor.addElement(createTestImageElement());
      editor.addEffect(elementId, effect);

      const svg = editor.toSVG();
      expect(svg).toContain('<feDropShadow');
    });

    it('should handle emboss with no options', () => {
      const effect = emboss();

      const elementId = editor.addElement(createTestImageElement());
      editor.addEffect(elementId, effect);

      const svg = editor.toSVG();
      expect(svg).toContain('<feConvolveMatrix');
    });

    it('should handle brightnessContrast with empty options', () => {
      const effect = brightnessContrast({});

      expect(effect.brightness).toBe(1);
      expect(effect.contrast).toBe(1);

      const elementId = editor.addElement(createTestImageElement());
      editor.addEffect(elementId, effect);

      const svg = editor.toSVG();
      expect(svg).toContain('<feComponentTransfer');
    });
  });

  // ============================================================
  // Filter Operations Edge Cases
  // ============================================================

  describe('Filter Operations Edge Cases', () => {
    it('should handle removing filter at index 0 with multiple filters', () => {
      const elementId = editor.addElement(createTestImageElement());
      editor.addEffect(elementId, blur(5));
      editor.addEffect(elementId, grayscale(1));
      editor.addEffect(elementId, dropShadow({}));

      editor.removeFilterFromElement(elementId, 0);

      const filters = editor.getElementFilters(elementId);
      expect(filters).toHaveLength(2);
    });

    it('should handle removing last filter in list', () => {
      const elementId = editor.addElement(createTestImageElement());
      editor.addEffect(elementId, blur(5));
      editor.addEffect(elementId, grayscale(1));
      editor.addEffect(elementId, dropShadow({}));

      editor.removeFilterFromElement(elementId, 2);

      const filters = editor.getElementFilters(elementId);
      expect(filters).toHaveLength(2);
    });

    it('should handle clearing filters on element with no filters', () => {
      const elementId = editor.addElement(createTestImageElement());

      // Should not throw
      editor.clearFilters(elementId);

      expect(editor.hasFilters(elementId)).toBe(false);
    });

    it('should handle setEffect replacing multiple filters', () => {
      const elementId = editor.addElement(createTestImageElement());
      editor.addEffect(elementId, blur(5));
      editor.addEffect(elementId, grayscale(1));
      editor.addEffect(elementId, dropShadow({}));

      editor.setEffect(elementId, contrast(1.5));

      const filters = editor.getElementFilters(elementId);
      expect(filters).toHaveLength(1);
    });

    it('should handle adding same effect multiple times', () => {
      const elementId = editor.addElement(createTestImageElement());
      const effect = blur(5);

      editor.addEffect(elementId, effect);
      editor.addEffect(elementId, effect);
      editor.addEffect(elementId, effect);

      const filters = editor.getElementFilters(elementId);
      expect(filters).toHaveLength(3);
    });
  });

  // ============================================================
  // FilterManager Edge Cases
  // ============================================================

  describe('FilterManager Edge Cases', () => {
    let filterManager: FilterManager;

    beforeEach(() => {
      filterManager = new FilterManager();
    });

    it('should handle empty primitives array', () => {
      const id = filterManager.addFilter({ primitives: [] });
      expect(id).toMatch(/^filter-/);

      const filter = filterManager.getFilter(id);
      expect(filter?.primitives).toHaveLength(0);
    });

    it('should handle updating filter with partial data', () => {
      const id = filterManager.addFilter({
        primitives: [{ type: 'gaussianBlur', stdDeviation: 5 } as GaussianBlurPrimitive],
        x: '-10%',
      });

      filterManager.updateFilter(id, { y: '-10%' });

      const filter = filterManager.getFilter(id);
      expect(filter?.x).toBe('-10%');
      expect(filter?.y).toBe('-10%');
    });

    it('should handle snapshot and restore with empty state', () => {
      const snapshot = filterManager.snapshot();
      expect(snapshot.size).toBe(0);

      filterManager.addFilter({ primitives: [] });
      expect(filterManager.getAllFilters()).toHaveLength(1);

      filterManager.restore(snapshot);
      expect(filterManager.getAllFilters()).toHaveLength(0);
    });

    it('should handle getOrCreatePresetFilter with identical effects returning same id', () => {
      const effect1: EffectPreset = { type: 'blur', radius: 5 };
      const effect2: EffectPreset = { type: 'blur', radius: 5 };

      const id1 = filterManager.getOrCreatePresetFilter(effect1);
      const id2 = filterManager.getOrCreatePresetFilter(effect2);

      expect(id1).toBe(id2);
    });

    it('should handle preset filter cache with different effects', () => {
      const blurEffect: EffectPreset = { type: 'blur', radius: 5 };
      const grayscaleEffect: EffectPreset = { type: 'grayscale', amount: 1 };

      const blurId = filterManager.getOrCreatePresetFilter(blurEffect);
      const grayscaleId = filterManager.getOrCreatePresetFilter(grayscaleEffect);

      expect(blurId).not.toBe(grayscaleId);
    });
  });

  // ============================================================
  // isEffectPreset Type Guard Edge Cases
  // ============================================================

  describe('isEffectPreset Type Guard Edge Cases', () => {
    it('should return false for empty object', () => {
      expect(isEffectPreset({})).toBe(false);
    });

    it('should return false for object with only type but invalid value', () => {
      expect(isEffectPreset({ type: 'notARealEffect' })).toBe(false);
    });

    it('should return false for array', () => {
      expect(isEffectPreset([])).toBe(false);
    });

    it('should return false for function', () => {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      const emptyFn = (): void => {};
      expect(isEffectPreset(emptyFn)).toBe(false);
    });

    it('should return false for Date object', () => {
      expect(isEffectPreset(new Date())).toBe(false);
    });

    it('should return true for valid effect with extra properties', () => {
      expect(isEffectPreset({ type: 'blur', radius: 5, extraProp: 'ignored' })).toBe(true);
    });

    it('should handle all valid effect types', () => {
      const validTypes = [
        'blur',
        'dropShadow',
        'innerShadow',
        'glow',
        'outline',
        'grayscale',
        'sepia',
        'saturate',
        'hueRotate',
        'invert',
        'brightness',
        'contrast',
        'brightnessContrast',
        'sharpen',
        'emboss',
        'noise',
        'vintage',
        'duotone',
      ];

      for (const type of validTypes) {
        expect(isEffectPreset({ type })).toBe(true);
      }
    });
  });

  // ============================================================
  // Undo/Redo Edge Cases with Filters
  // ============================================================

  describe('Undo/Redo Edge Cases', () => {
    it('should undo multiple filter additions in reverse order', () => {
      const elementId = editor.addElement(createTestImageElement());

      editor.addEffect(elementId, blur(5));
      editor.addEffect(elementId, grayscale(1));
      editor.addEffect(elementId, dropShadow({}));

      expect(editor.getElementFilters(elementId)).toHaveLength(3);

      editor.undo(); // undo dropShadow
      expect(editor.getElementFilters(elementId)).toHaveLength(2);

      editor.undo(); // undo grayscale
      expect(editor.getElementFilters(elementId)).toHaveLength(1);

      editor.undo(); // undo blur
      expect(editor.getElementFilters(elementId)).toHaveLength(0);
    });

    it('should handle redo after undo of filter clear', () => {
      const elementId = editor.addElement(createTestImageElement());
      editor.addEffect(elementId, blur(5));
      editor.addEffect(elementId, grayscale(1));

      editor.clearFilters(elementId);
      expect(editor.hasFilters(elementId)).toBe(false);

      editor.undo(); // undo clear
      expect(editor.hasFilters(elementId)).toBe(true);
      expect(editor.getElementFilters(elementId)).toHaveLength(2);

      editor.redo(); // redo clear
      expect(editor.hasFilters(elementId)).toBe(false);
    });

    it('should handle undo/redo of setEffect', () => {
      const elementId = editor.addElement(createTestImageElement());
      editor.addEffect(elementId, blur(5));
      editor.addEffect(elementId, grayscale(1));

      editor.setEffect(elementId, dropShadow({}));
      expect(editor.getElementFilters(elementId)).toHaveLength(1);

      editor.undo();
      expect(editor.getElementFilters(elementId)).toHaveLength(2);

      editor.redo();
      expect(editor.getElementFilters(elementId)).toHaveLength(1);
    });
  });
});
