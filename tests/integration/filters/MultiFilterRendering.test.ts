/**
 * Integration tests for multiple filter rendering
 * Tests that elements with multiple filters render correctly through the full pipeline
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SVGComposer } from '../../../src/core/SVGComposer.js';
import {
  blur,
  dropShadow,
  glow,
  grayscale,
  sepia,
  saturate,
  hueRotate,
  brightness,
  contrast,
  invert,
  outline,
  vintage,
} from '../../../src/filters/EffectPresets.js';
import type { Transform } from '../../../src/core/types.js';
import type { ImageElement } from '../../../src/elements/types.js';

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

describe('Multi-Filter Rendering Integration', () => {
  let container: HTMLDivElement;
  let editor: SVGComposer;

  beforeEach(() => {
    container = document.createElement('div');
    container.id = 'test-container';
    document.body.appendChild(container);

    editor = new SVGComposer({
      container,
      width: 1200,
      height: 1200,
    });
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  // ============================================================
  // Multiple Effects Applied to Same Element
  // ============================================================

  describe('multiple effects on one element', () => {
    it('should render element with two effects', () => {
      const elementId = editor.addElement(createTestImageElement());
      editor.addEffect(elementId, grayscale());
      editor.addEffect(elementId, blur(3));

      const svg = editor.toSVG();

      // Should contain a filter reference
      expect(svg).toContain('filter="url(#');

      // Should contain both grayscale (colorMatrix) and blur primitives
      expect(svg).toContain('feColorMatrix');
      expect(svg).toContain('feGaussianBlur');

      // Should be in a single composite filter (one filter element)
      const filterMatches = svg.match(/<filter /g);
      expect(filterMatches).not.toBeNull();
      expect(filterMatches!.length).toBe(1);
    });

    it('should render element with three effects', () => {
      const elementId = editor.addElement(createTestImageElement());
      editor.addEffect(elementId, brightness(1.5));
      editor.addEffect(elementId, contrast(1.2));
      editor.addEffect(elementId, grayscale());

      const svg = editor.toSVG();

      // All three filter types should be present
      expect(svg).toContain('feComponentTransfer'); // brightness + contrast
      expect(svg).toContain('feColorMatrix'); // grayscale

      // Single composite filter
      const filterMatches = svg.match(/<filter /g);
      expect(filterMatches).not.toBeNull();
      expect(filterMatches!.length).toBe(1);
    });

    it('should render drop shadow + grayscale combo', () => {
      const elementId = editor.addElement(createTestImageElement());
      editor.addEffect(elementId, dropShadow(5, 5, 3, 'black'));
      editor.addEffect(elementId, grayscale());

      const svg = editor.toSVG();

      expect(svg).toContain('feDropShadow');
      expect(svg).toContain('feColorMatrix');

      const filterMatches = svg.match(/<filter /g);
      expect(filterMatches!.length).toBe(1);
    });

    it('should render glow + sepia combo', () => {
      const elementId = editor.addElement(createTestImageElement());
      editor.addEffect(elementId, glow(5, 'blue'));
      editor.addEffect(elementId, sepia());

      const svg = editor.toSVG();

      // Glow components
      expect(svg).toContain('feGaussianBlur');
      expect(svg).toContain('feFlood');
      expect(svg).toContain('feComposite');
      expect(svg).toContain('feMerge');

      // Sepia
      expect(svg).toContain('feColorMatrix');

      // Single composite filter
      const filterMatches = svg.match(/<filter /g);
      expect(filterMatches!.length).toBe(1);
    });

    it('should render outline + vintage combo', () => {
      const elementId = editor.addElement(createTestImageElement());
      editor.addEffect(elementId, outline(2, 'red'));
      editor.addEffect(elementId, vintage());

      const svg = editor.toSVG();

      // Outline components
      expect(svg).toContain('feMorphology');

      // Vintage components (saturation + color matrix + contrast)
      expect(svg).toContain('feColorMatrix');
      expect(svg).toContain('feComponentTransfer');

      const filterMatches = svg.match(/<filter /g);
      expect(filterMatches!.length).toBe(1);
    });
  });

  // ============================================================
  // Filter Chaining Order
  // ============================================================

  describe('filter chaining order', () => {
    it('should apply filters in order: effect chaining connects primitives', () => {
      const elementId = editor.addElement(createTestImageElement());

      // Apply grayscale first, then blur
      editor.addEffect(elementId, grayscale());
      editor.addEffect(elementId, blur(5));

      const svg = editor.toSVG();

      // The blur should reference the chain output from grayscale
      // (not SourceGraphic directly)
      expect(svg).toContain('_chain0');
    });

    it('should produce different SVG for different effect orderings', () => {
      // Element 1: grayscale then blur
      const id1 = editor.addElement(createTestImageElement());
      editor.addEffect(id1, grayscale());
      editor.addEffect(id1, blur(5));

      const svg1 = editor.toSVG();

      // Reset
      editor.removeElement(id1);

      // Element 2: blur then grayscale
      const id2 = editor.addElement(createTestImageElement());
      editor.addEffect(id2, blur(5));
      editor.addEffect(id2, grayscale());

      const svg2 = editor.toSVG();

      // Both should produce valid SVG with both primitives
      expect(svg1).toContain('feColorMatrix');
      expect(svg1).toContain('feGaussianBlur');
      expect(svg2).toContain('feColorMatrix');
      expect(svg2).toContain('feGaussianBlur');

      // But they should use different composite filters
      // (the chaining order changes the result names)
      expect(svg1).not.toBe(svg2);
    });
  });

  // ============================================================
  // Multiple Elements with Multiple Filters
  // ============================================================

  describe('multiple elements with multiple filters', () => {
    it('should render two elements each with multiple effects', () => {
      const id1 = editor.addElement(createTestImageElement());
      editor.addEffect(id1, grayscale());
      editor.addEffect(id1, blur(3));

      const id2 = editor.addElement(
        createTestImageElement({ transform: createTestTransform({ x: 200 }) }),
      );
      editor.addEffect(id2, sepia());
      editor.addEffect(id2, brightness(1.5));

      const svg = editor.toSVG();

      // Should have two filter references on two elements
      const filterUrlMatches = svg.match(/filter="url\(#[^)]+\)"/g);
      expect(filterUrlMatches).not.toBeNull();
      expect(filterUrlMatches!.length).toBe(2);
    });

    it('should share composite filter when two elements have identical effect chains', () => {
      const id1 = editor.addElement(createTestImageElement());
      editor.addEffect(id1, grayscale());
      editor.addEffect(id1, blur(3));

      const id2 = editor.addElement(
        createTestImageElement({ transform: createTestTransform({ x: 200 }) }),
      );
      editor.addEffect(id2, grayscale());
      editor.addEffect(id2, blur(3));

      const svg = editor.toSVG();

      // Both elements should reference the same composite filter
      const filterUrlMatches = svg.match(/filter="url\(#[^)]+\)"/g);
      expect(filterUrlMatches).not.toBeNull();
      expect(filterUrlMatches!.length).toBe(2);
      // Same filter ID used by both
      expect(filterUrlMatches![0]).toBe(filterUrlMatches![1]);

      // Only one filter definition in defs
      const filterDefMatches = svg.match(/<filter /g);
      expect(filterDefMatches!.length).toBe(1);
    });
  });

  // ============================================================
  // Single Filter Backward Compatibility
  // ============================================================

  describe('single filter backward compatibility', () => {
    it('should still render single filter correctly', () => {
      const elementId = editor.addElement(createTestImageElement());
      editor.addEffect(elementId, blur(5));

      const svg = editor.toSVG();

      expect(svg).toContain('feGaussianBlur');
      expect(svg).toContain('filter="url(#');

      // Single filter, not a composite
      const filterMatches = svg.match(/<filter /g);
      expect(filterMatches!.length).toBe(1);
    });

    it('should render element with no filters', () => {
      editor.addElement(createTestImageElement());
      const svg = editor.toSVG();

      // No filter attribute
      expect(svg).not.toContain('filter="url(#');
    });
  });

  // ============================================================
  // Custom + Preset Mixed Filters
  // ============================================================

  describe('custom and preset mixed filters', () => {
    it('should chain a custom filter with a preset effect', () => {
      const elementId = editor.addElement(createTestImageElement());

      // Add custom filter
      const customFilterId = editor.addFilter({
        primitives: [
          {
            type: 'colorMatrix',
            matrixType: 'hueRotate',
            in: 'SourceGraphic',
            values: 180,
          },
        ],
      });
      editor.applyFilter(elementId, customFilterId);

      // Add preset effect
      editor.addEffect(elementId, blur(3));

      const svg = editor.toSVG();

      // Should contain both hueRotate and blur
      expect(svg).toContain('feColorMatrix');
      expect(svg).toContain('feGaussianBlur');

      // Single composite filter
      const filterMatches = svg.match(/<filter /g);
      expect(filterMatches!.length).toBe(1);
    });
  });

  // ============================================================
  // Filter Removal with Multi-Filters
  // ============================================================

  describe('filter removal with multi-filters', () => {
    it('should fall back to single filter when second filter is removed', () => {
      const elementId = editor.addElement(createTestImageElement());
      editor.addEffect(elementId, grayscale());
      editor.addEffect(elementId, blur(3));

      // Verify both are present
      let svg = editor.toSVG();
      expect(svg).toContain('feColorMatrix');
      expect(svg).toContain('feGaussianBlur');

      // Remove the second filter (blur at index 1)
      editor.removeFilterFromElement(elementId, 1);

      svg = editor.toSVG();
      // Should only have grayscale now
      expect(svg).toContain('feColorMatrix');
      expect(svg).not.toContain('feGaussianBlur');
    });

    it('should switch to second filter when first filter is removed', () => {
      const elementId = editor.addElement(createTestImageElement());
      editor.addEffect(elementId, grayscale());
      editor.addEffect(elementId, blur(3));

      // Remove first filter (grayscale at index 0)
      editor.removeFilterFromElement(elementId, 0);

      const svg = editor.toSVG();
      // Should only have blur now
      expect(svg).toContain('feGaussianBlur');
    });
  });

  // ============================================================
  // Undo/Redo with Multi-Filters
  // ============================================================

  describe('undo/redo with multi-filters', () => {
    it('should undo adding second filter', () => {
      const elementId = editor.addElement(createTestImageElement());
      editor.addEffect(elementId, grayscale());
      editor.addEffect(elementId, blur(3));

      // Verify composite filter
      let svg = editor.toSVG();
      expect(svg).toContain('feColorMatrix');
      expect(svg).toContain('feGaussianBlur');

      // Undo the blur addition
      editor.undo();

      svg = editor.toSVG();
      // Should only have grayscale now
      expect(svg).toContain('feColorMatrix');
      expect(svg).not.toContain('feGaussianBlur');
    });

    it('should redo restoring multi-filter state', () => {
      const elementId = editor.addElement(createTestImageElement());
      editor.addEffect(elementId, grayscale());
      editor.addEffect(elementId, blur(3));

      // Undo both
      editor.undo();
      editor.undo();

      let svg = editor.toSVG();
      expect(svg).not.toContain('feColorMatrix');
      expect(svg).not.toContain('feGaussianBlur');

      // Redo both
      editor.redo();
      editor.redo();

      svg = editor.toSVG();
      expect(svg).toContain('feColorMatrix');
      expect(svg).toContain('feGaussianBlur');
    });
  });
});
