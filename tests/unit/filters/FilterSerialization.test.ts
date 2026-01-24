/**
 * Serialization tests for filters
 * Tests that filter state survives toJSON/fromJSON round-trips
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SVGComposer } from '../../../src/core/SVGComposer.js';
import {
  blur,
  dropShadow,
  glow,
  innerShadow,
  grayscale,
  sepia,
  saturate,
  hueRotate,
  brightness,
  contrast,
  emboss,
  noise,
  vintage,
  duotone,
} from '../../../src/filters/EffectPresets.js';
import type { Transform } from '../../../src/core/types.js';
import type { ImageElement } from '../../../src/elements/types.js';
import type { GaussianBlurPrimitive } from '../../../src/filters/types.js';

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

describe('Filter Serialization', () => {
  let container: HTMLDivElement;
  let editor: SVGComposer;

  beforeEach(() => {
    container = document.createElement('div');
    container.id = 'test-container';
    document.body.appendChild(container);
    editor = new SVGComposer(container);
  });

  afterEach(() => {
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  // ============================================================
  // Basic Serialization
  // ============================================================

  describe('Basic Serialization', () => {
    it('should serialize element with blur effect', () => {
      const elementId = editor.addElement(createTestImageElement());
      editor.addEffect(elementId, blur(5));

      const json = editor.toJSON();
      const parsed = JSON.parse(json);

      expect(parsed.elements[elementId]).toBeDefined();
      expect(parsed.elements[elementId].filters).toBeDefined();
      expect(parsed.elements[elementId].filters).toHaveLength(1);
    });

    it('should serialize element with multiple effects', () => {
      const elementId = editor.addElement(createTestImageElement());
      editor.addEffect(elementId, blur(5));
      editor.addEffect(elementId, grayscale(1));
      editor.addEffect(elementId, dropShadow({}));

      const json = editor.toJSON();
      const parsed = JSON.parse(json);

      expect(parsed.elements[elementId].filters).toHaveLength(3);
    });

    it('should serialize element without filters correctly', () => {
      const elementId = editor.addElement(createTestImageElement());

      const json = editor.toJSON();
      const parsed = JSON.parse(json);

      expect(parsed.elements[elementId]).toBeDefined();
      expect(parsed.elements[elementId].filters).toBeUndefined();
    });
  });

  // ============================================================
  // Round-trip Serialization
  // ============================================================

  describe('Round-trip Serialization', () => {
    it('should restore blur effect after round-trip', () => {
      const elementId = editor.addElement(createTestImageElement());
      editor.addEffect(elementId, blur(5));

      const json = editor.toJSON();

      // Create new editor and restore
      const container2 = document.createElement('div');
      document.body.appendChild(container2);
      const editor2 = new SVGComposer(container2);
      editor2.fromJSON(json);

      expect(editor2.hasFilters(elementId)).toBe(true);
      const filters = editor2.getElementFilters(elementId);
      expect(filters).toHaveLength(1);
      expect(filters[0].type).toBe('preset');

      container2.parentNode?.removeChild(container2);
    });

    it('should restore dropShadow effect after round-trip', () => {
      const elementId = editor.addElement(createTestImageElement());
      const effect = dropShadow({
        offsetX: 10,
        offsetY: 10,
        blur: 8,
        color: '#ff0000',
        opacity: 0.7,
      });
      editor.addEffect(elementId, effect);

      const json = editor.toJSON();

      const container2 = document.createElement('div');
      document.body.appendChild(container2);
      const editor2 = new SVGComposer(container2);
      editor2.fromJSON(json);

      const filters = editor2.getElementFilters(elementId);
      expect(filters).toHaveLength(1);
      expect(filters[0].type).toBe('preset');

      // Verify effect properties are preserved
      if (filters[0].type === 'preset') {
        const restoredEffect = filters[0].effect;
        expect(restoredEffect.type).toBe('dropShadow');
        if (restoredEffect.type === 'dropShadow') {
          expect(restoredEffect.offsetX).toBe(10);
          expect(restoredEffect.offsetY).toBe(10);
          expect(restoredEffect.blur).toBe(8);
          expect(restoredEffect.color).toBe('#ff0000');
          expect(restoredEffect.opacity).toBe(0.7);
        }
      }

      container2.parentNode?.removeChild(container2);
    });

    it('should restore multiple effects after round-trip', () => {
      const elementId = editor.addElement(createTestImageElement());
      editor.addEffect(elementId, blur(5));
      editor.addEffect(elementId, grayscale(0.5));
      editor.addEffect(elementId, hueRotate(45));

      const json = editor.toJSON();

      const container2 = document.createElement('div');
      document.body.appendChild(container2);
      const editor2 = new SVGComposer(container2);
      editor2.fromJSON(json);

      const filters = editor2.getElementFilters(elementId);
      expect(filters).toHaveLength(3);

      container2.parentNode?.removeChild(container2);
    });

    it('should restore glow effect after round-trip', () => {
      const elementId = editor.addElement(createTestImageElement());
      editor.addEffect(elementId, glow({ radius: 15, color: '#00ff00', opacity: 0.8 }));

      const json = editor.toJSON();

      const container2 = document.createElement('div');
      document.body.appendChild(container2);
      const editor2 = new SVGComposer(container2);
      editor2.fromJSON(json);

      const filters = editor2.getElementFilters(elementId);
      expect(filters).toHaveLength(1);
      if (filters[0].type === 'preset') {
        expect(filters[0].effect.type).toBe('glow');
      }

      container2.parentNode?.removeChild(container2);
    });

    it('should restore innerShadow effect after round-trip', () => {
      const elementId = editor.addElement(createTestImageElement());
      editor.addEffect(elementId, innerShadow({ offsetX: 3, offsetY: 3, blur: 6, color: '#000' }));

      const json = editor.toJSON();

      const container2 = document.createElement('div');
      document.body.appendChild(container2);
      const editor2 = new SVGComposer(container2);
      editor2.fromJSON(json);

      const filters = editor2.getElementFilters(elementId);
      expect(filters).toHaveLength(1);
      if (filters[0].type === 'preset') {
        expect(filters[0].effect.type).toBe('innerShadow');
      }

      container2.parentNode?.removeChild(container2);
    });

    it('should restore color effects after round-trip', () => {
      const elementId = editor.addElement(createTestImageElement());
      editor.addEffect(elementId, sepia(0.8));
      editor.addEffect(elementId, saturate(1.5));
      editor.addEffect(elementId, brightness(1.2));
      editor.addEffect(elementId, contrast(1.3));

      const json = editor.toJSON();

      const container2 = document.createElement('div');
      document.body.appendChild(container2);
      const editor2 = new SVGComposer(container2);
      editor2.fromJSON(json);

      const filters = editor2.getElementFilters(elementId);
      expect(filters).toHaveLength(4);

      container2.parentNode?.removeChild(container2);
    });

    it('should restore complex effects after round-trip', () => {
      const elementId = editor.addElement(createTestImageElement());
      editor.addEffect(elementId, emboss({ strength: 2, angle: 45 }));
      editor.addEffect(elementId, noise({ intensity: 0.2, noiseType: 'fractal' }));
      editor.addEffect(elementId, vintage(0.7));

      const json = editor.toJSON();

      const container2 = document.createElement('div');
      document.body.appendChild(container2);
      const editor2 = new SVGComposer(container2);
      editor2.fromJSON(json);

      const filters = editor2.getElementFilters(elementId);
      expect(filters).toHaveLength(3);

      container2.parentNode?.removeChild(container2);
    });

    it('should restore duotone effect after round-trip', () => {
      const elementId = editor.addElement(createTestImageElement());
      editor.addEffect(elementId, duotone('#001133', '#ffcc00'));

      const json = editor.toJSON();

      const container2 = document.createElement('div');
      document.body.appendChild(container2);
      const editor2 = new SVGComposer(container2);
      editor2.fromJSON(json);

      const filters = editor2.getElementFilters(elementId);
      expect(filters).toHaveLength(1);
      if (filters[0].type === 'preset') {
        const effect = filters[0].effect;
        expect(effect.type).toBe('duotone');
        if (effect.type === 'duotone') {
          expect(effect.shadowColor).toBe('#001133');
          expect(effect.highlightColor).toBe('#ffcc00');
        }
      }

      container2.parentNode?.removeChild(container2);
    });
  });

  // ============================================================
  // Custom Filter Serialization
  // ============================================================

  describe('Custom Filter Serialization', () => {
    it('should serialize custom filter applied to element', () => {
      const elementId = editor.addElement(createTestImageElement());
      const filterId = editor.addFilter({
        primitives: [
          {
            type: 'gaussianBlur',
            stdDeviation: 10,
          } as GaussianBlurPrimitive,
        ],
      });
      editor.applyFilter(elementId, filterId);

      const json = editor.toJSON();
      const parsed = JSON.parse(json);

      expect(parsed.elements[elementId].filters).toHaveLength(1);
      expect(parsed.elements[elementId].filters[0].type).toBe('custom');
    });

    it('should restore custom filter reference after round-trip', () => {
      const elementId = editor.addElement(createTestImageElement());
      const filterId = editor.addFilter({
        primitives: [
          {
            type: 'gaussianBlur',
            stdDeviation: 10,
          } as GaussianBlurPrimitive,
        ],
      });
      editor.applyFilter(elementId, filterId);

      const json = editor.toJSON();

      const container2 = document.createElement('div');
      document.body.appendChild(container2);
      const editor2 = new SVGComposer(container2);
      editor2.fromJSON(json);

      const filters = editor2.getElementFilters(elementId);
      expect(filters).toHaveLength(1);
      expect(filters[0].type).toBe('custom');

      container2.parentNode?.removeChild(container2);
    });
  });

  // ============================================================
  // Multiple Elements with Filters
  // ============================================================

  describe('Multiple Elements with Filters', () => {
    it('should serialize multiple elements each with filters', () => {
      const element1 = editor.addElement(createTestImageElement());
      const element2 = editor.addElement(createTestImageElement({ src: 'test2.jpg' }));
      const element3 = editor.addElement(createTestImageElement({ src: 'test3.jpg' }));

      editor.addEffect(element1, blur(5));
      editor.addEffect(element2, grayscale(1));
      editor.addEffect(element2, dropShadow({}));
      editor.addEffect(element3, glow({ radius: 10, color: '#fff' }));

      const json = editor.toJSON();
      const parsed = JSON.parse(json);

      expect(parsed.elements[element1].filters).toHaveLength(1);
      expect(parsed.elements[element2].filters).toHaveLength(2);
      expect(parsed.elements[element3].filters).toHaveLength(1);
    });

    it('should restore multiple elements each with filters after round-trip', () => {
      const element1 = editor.addElement(createTestImageElement());
      const element2 = editor.addElement(createTestImageElement({ src: 'test2.jpg' }));

      editor.addEffect(element1, blur(5));
      editor.addEffect(element1, contrast(1.5));
      editor.addEffect(element2, dropShadow({ offsetX: 8, offsetY: 8, blur: 16, color: '#000' }));

      const json = editor.toJSON();

      const container2 = document.createElement('div');
      document.body.appendChild(container2);
      const editor2 = new SVGComposer(container2);
      editor2.fromJSON(json);

      expect(editor2.getElementFilters(element1)).toHaveLength(2);
      expect(editor2.getElementFilters(element2)).toHaveLength(1);

      container2.parentNode?.removeChild(container2);
    });
  });

  // ============================================================
  // SVG Output After Restoration
  // ============================================================

  describe('SVG Output After Restoration', () => {
    it('should produce valid SVG output after restoring state with filters', () => {
      const elementId = editor.addElement(createTestImageElement());
      editor.addEffect(elementId, blur(5));

      const json = editor.toJSON();

      const container2 = document.createElement('div');
      document.body.appendChild(container2);
      const editor2 = new SVGComposer(container2);
      editor2.fromJSON(json);

      const svg = editor2.toSVG();

      expect(svg).toContain('<filter');
      expect(svg).toContain('feGaussianBlur');
      expect(svg).toContain('filter="url(#');

      container2.parentNode?.removeChild(container2);
    });

    it('should produce valid SVG with dropShadow after round-trip', () => {
      const elementId = editor.addElement(createTestImageElement());
      editor.addEffect(elementId, dropShadow({ offsetX: 4, offsetY: 4, blur: 8, color: '#000' }));

      const json = editor.toJSON();

      const container2 = document.createElement('div');
      document.body.appendChild(container2);
      const editor2 = new SVGComposer(container2);
      editor2.fromJSON(json);

      const svg = editor2.toSVG();

      expect(svg).toContain('<filter');
      expect(svg).toContain('feDropShadow');
      expect(svg).toContain('filter="url(#');

      container2.parentNode?.removeChild(container2);
    });

    it('should produce identical SVG output before and after round-trip', () => {
      const elementId = editor.addElement(createTestImageElement());
      editor.addEffect(elementId, grayscale(0.5));

      const svgBefore = editor.toSVG();
      const json = editor.toJSON();

      const container2 = document.createElement('div');
      document.body.appendChild(container2);
      const editor2 = new SVGComposer(container2);
      editor2.fromJSON(json);

      const svgAfter = editor2.toSVG();

      // Check that key filter elements are present in both
      expect(svgBefore).toContain('feColorMatrix');
      expect(svgAfter).toContain('feColorMatrix');

      // Both should have filter reference on the image
      expect(svgBefore).toContain('filter="url(#');
      expect(svgAfter).toContain('filter="url(#');

      container2.parentNode?.removeChild(container2);
    });
  });

  // ============================================================
  // Edge Cases
  // ============================================================

  describe('Serialization Edge Cases', () => {
    it('should handle serializing element after filters are cleared', () => {
      const elementId = editor.addElement(createTestImageElement());
      editor.addEffect(elementId, blur(5));
      editor.clearFilters(elementId);

      const json = editor.toJSON();
      const parsed = JSON.parse(json);

      expect(parsed.elements[elementId].filters).toBeUndefined();
    });

    it('should handle restoring state when element had filters then cleared', () => {
      const elementId = editor.addElement(createTestImageElement());
      editor.addEffect(elementId, blur(5));

      const jsonWithFilter = editor.toJSON();

      editor.clearFilters(elementId);
      const jsonWithoutFilter = editor.toJSON();

      // Restore state with filter
      editor.fromJSON(jsonWithFilter);
      expect(editor.hasFilters(elementId)).toBe(true);

      // Restore state without filter
      editor.fromJSON(jsonWithoutFilter);
      expect(editor.hasFilters(elementId)).toBe(false);
    });

    it('should preserve filter order after round-trip', () => {
      const elementId = editor.addElement(createTestImageElement());
      editor.addEffect(elementId, blur(5));
      editor.addEffect(elementId, grayscale(1));
      editor.addEffect(elementId, brightness(1.5));

      const json = editor.toJSON();

      const container2 = document.createElement('div');
      document.body.appendChild(container2);
      const editor2 = new SVGComposer(container2);
      editor2.fromJSON(json);

      const filters = editor2.getElementFilters(elementId);
      expect(filters).toHaveLength(3);

      if (filters[0].type === 'preset') {
        expect(filters[0].effect.type).toBe('blur');
      }
      if (filters[1].type === 'preset') {
        expect(filters[1].effect.type).toBe('grayscale');
      }
      if (filters[2].type === 'preset') {
        expect(filters[2].effect.type).toBe('brightness');
      }

      container2.parentNode?.removeChild(container2);
    });

    it('should handle special characters in color values', () => {
      const elementId = editor.addElement(createTestImageElement());
      editor.addEffect(
        elementId,
        dropShadow({ offsetX: 4, offsetY: 4, blur: 4, color: 'rgba(0,0,0,0.5)' }),
      );

      const json = editor.toJSON();

      const container2 = document.createElement('div');
      document.body.appendChild(container2);
      const editor2 = new SVGComposer(container2);
      editor2.fromJSON(json);

      const filters = editor2.getElementFilters(elementId);
      expect(filters).toHaveLength(1);

      container2.parentNode?.removeChild(container2);
    });

    it('should handle decimal values in effects', () => {
      const elementId = editor.addElement(createTestImageElement());
      editor.addEffect(elementId, blur(2.5));
      editor.addEffect(elementId, grayscale(0.333));
      editor.addEffect(elementId, brightness(1.125));

      const json = editor.toJSON();

      const container2 = document.createElement('div');
      document.body.appendChild(container2);
      const editor2 = new SVGComposer(container2);
      editor2.fromJSON(json);

      const filters = editor2.getElementFilters(elementId);
      expect(filters).toHaveLength(3);

      if (filters[0].type === 'preset' && filters[0].effect.type === 'blur') {
        expect(filters[0].effect.radius).toBe(2.5);
      }
      if (filters[1].type === 'preset' && filters[1].effect.type === 'grayscale') {
        expect(filters[1].effect.amount).toBe(0.333);
      }
      if (filters[2].type === 'preset' && filters[2].effect.type === 'brightness') {
        expect(filters[2].effect.amount).toBe(1.125);
      }

      container2.parentNode?.removeChild(container2);
    });
  });

  // ============================================================
  // Version Compatibility (future-proofing)
  // ============================================================

  describe('Version Compatibility', () => {
    it('should include version field in serialized JSON', () => {
      editor.addElement(createTestImageElement());

      const json = editor.toJSON();
      const parsed = JSON.parse(json);

      expect(parsed.version).toBeDefined();
      expect(typeof parsed.version).toBe('number');
    });
  });
});
