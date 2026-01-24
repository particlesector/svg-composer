/**
 * SVGComposer filter functionality tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SVGComposer } from '../../../src/core/SVGComposer.js';
import { blur, dropShadow, grayscale } from '../../../src/filters/EffectPresets.js';
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

describe('SVGComposer Filters', () => {
  let container: HTMLDivElement;
  let editor: SVGComposer;

  beforeEach(() => {
    container = document.createElement('div');
    container.id = 'test-container';
    document.body.appendChild(container);
    editor = new SVGComposer(container);
  });

  // ============================================================
  // addEffect
  // ============================================================

  describe('addEffect', () => {
    it('should add an effect to an element', () => {
      const elementId = editor.addElement(createTestImageElement());
      const effect = blur(5);

      const filterId = editor.addEffect(elementId, effect);

      expect(filterId).toMatch(/^filter-/);
      expect(editor.hasFilters(elementId)).toBe(true);
    });

    it('should throw error for non-existent element', () => {
      expect(() => editor.addEffect('non-existent', blur(5))).toThrow(
        'Element not found: non-existent',
      );
    });

    it('should allow adding multiple effects to an element', () => {
      const elementId = editor.addElement(createTestImageElement());

      editor.addEffect(elementId, blur(5));
      editor.addEffect(elementId, grayscale());

      const filters = editor.getElementFilters(elementId);
      expect(filters).toHaveLength(2);
    });

    it('should emit element:updated event', () => {
      const elementId = editor.addElement(createTestImageElement());
      const listener = vi.fn();
      editor.on('element:updated', listener);

      editor.addEffect(elementId, blur(5));

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          id: elementId,
        }),
      );
    });

    it('should create history entry', () => {
      const elementId = editor.addElement(createTestImageElement());
      expect(editor.canUndo()).toBe(true); // From addElement

      editor.addEffect(elementId, blur(5));

      expect(editor.canUndo()).toBe(true);
    });
  });

  // ============================================================
  // setEffect
  // ============================================================

  describe('setEffect', () => {
    it('should replace all filters with a single effect', () => {
      const elementId = editor.addElement(createTestImageElement());
      editor.addEffect(elementId, blur(5));
      editor.addEffect(elementId, grayscale());

      editor.setEffect(elementId, dropShadow({ offsetX: 4, offsetY: 4, blur: 8, color: '#000' }));

      const filters = editor.getElementFilters(elementId);
      expect(filters).toHaveLength(1);
      expect(filters[0].type).toBe('preset');
    });

    it('should clear all filters when null is passed', () => {
      const elementId = editor.addElement(createTestImageElement());
      editor.addEffect(elementId, blur(5));

      editor.setEffect(elementId, null);

      expect(editor.hasFilters(elementId)).toBe(false);
    });

    it('should throw error for non-existent element', () => {
      expect(() => editor.setEffect('non-existent', blur(5))).toThrow(
        'Element not found: non-existent',
      );
    });
  });

  // ============================================================
  // Custom Filters
  // ============================================================

  describe('addFilter', () => {
    it('should add a custom filter definition', () => {
      const filterId = editor.addFilter({
        primitives: [{ type: 'gaussianBlur', stdDeviation: 10 } as GaussianBlurPrimitive],
      });

      expect(filterId).toMatch(/^filter-/);
      expect(editor.getFilter(filterId)).toBeDefined();
    });
  });

  describe('getFilter', () => {
    it('should return undefined for non-existent filter', () => {
      expect(editor.getFilter('non-existent')).toBeUndefined();
    });

    it('should return the filter definition', () => {
      const filterId = editor.addFilter({ primitives: [] });
      const filter = editor.getFilter(filterId);

      expect(filter).toBeDefined();
      expect(filter?.id).toBe(filterId);
    });
  });

  describe('getAllFilters', () => {
    it('should return empty array when no filters exist', () => {
      expect(editor.getAllFilters()).toEqual([]);
    });

    it('should return all filter definitions', () => {
      editor.addFilter({ primitives: [] });
      editor.addFilter({ primitives: [] });

      expect(editor.getAllFilters()).toHaveLength(2);
    });
  });

  describe('removeFilter', () => {
    it('should return false for non-existent filter', () => {
      expect(editor.removeFilter('non-existent')).toBe(false);
    });

    it('should remove the filter', () => {
      const filterId = editor.addFilter({ primitives: [] });
      expect(editor.removeFilter(filterId)).toBe(true);
      expect(editor.getFilter(filterId)).toBeUndefined();
    });
  });

  describe('applyFilter', () => {
    it('should apply a custom filter to an element', () => {
      const elementId = editor.addElement(createTestImageElement());
      const filterId = editor.addFilter({ primitives: [] });

      editor.applyFilter(elementId, filterId);

      expect(editor.hasFilters(elementId)).toBe(true);
      const filters = editor.getElementFilters(elementId);
      expect(filters[0].type).toBe('custom');
    });

    it('should throw error for non-existent element', () => {
      const filterId = editor.addFilter({ primitives: [] });
      expect(() => {
        editor.applyFilter('non-existent', filterId);
      }).toThrow('Element not found: non-existent');
    });

    it('should throw error for non-existent filter', () => {
      const elementId = editor.addElement(createTestImageElement());
      expect(() => {
        editor.applyFilter(elementId, 'non-existent');
      }).toThrow('Filter not found: non-existent');
    });
  });

  // ============================================================
  // clearFilters
  // ============================================================

  describe('clearFilters', () => {
    it('should remove all filters from an element', () => {
      const elementId = editor.addElement(createTestImageElement());
      editor.addEffect(elementId, blur(5));
      editor.addEffect(elementId, grayscale());

      editor.clearFilters(elementId);

      expect(editor.hasFilters(elementId)).toBe(false);
    });

    it('should throw error for non-existent element', () => {
      expect(() => {
        editor.clearFilters('non-existent');
      }).toThrow('Element not found: non-existent');
    });

    it('should do nothing if element has no filters', () => {
      const elementId = editor.addElement(createTestImageElement());
      // Should not throw
      editor.clearFilters(elementId);
      expect(editor.hasFilters(elementId)).toBe(false);
    });
  });

  // ============================================================
  // removeFilterFromElement
  // ============================================================

  describe('removeFilterFromElement', () => {
    it('should remove a specific filter by index', () => {
      const elementId = editor.addElement(createTestImageElement());
      editor.addEffect(elementId, blur(5));
      editor.addEffect(elementId, grayscale());
      editor.addEffect(elementId, dropShadow({}));

      editor.removeFilterFromElement(elementId, 1); // Remove grayscale

      const filters = editor.getElementFilters(elementId);
      expect(filters).toHaveLength(2);
    });

    it('should throw error for non-existent element', () => {
      expect(() => {
        editor.removeFilterFromElement('non-existent', 0);
      }).toThrow('Element not found: non-existent');
    });

    it('should throw error for out of bounds index', () => {
      const elementId = editor.addElement(createTestImageElement());
      editor.addEffect(elementId, blur(5));

      expect(() => {
        editor.removeFilterFromElement(elementId, 5);
      }).toThrow('Filter index out of bounds: 5');
    });

    it('should throw error for negative index', () => {
      const elementId = editor.addElement(createTestImageElement());
      editor.addEffect(elementId, blur(5));

      expect(() => {
        editor.removeFilterFromElement(elementId, -1);
      }).toThrow('Filter index out of bounds: -1');
    });

    it('should clear filters property when last filter is removed', () => {
      const elementId = editor.addElement(createTestImageElement());
      editor.addEffect(elementId, blur(5));

      editor.removeFilterFromElement(elementId, 0);

      expect(editor.hasFilters(elementId)).toBe(false);
    });
  });

  // ============================================================
  // getElementFilters
  // ============================================================

  describe('getElementFilters', () => {
    it('should return empty array for element without filters', () => {
      const elementId = editor.addElement(createTestImageElement());
      expect(editor.getElementFilters(elementId)).toEqual([]);
    });

    it('should return filters array for element with filters', () => {
      const elementId = editor.addElement(createTestImageElement());
      editor.addEffect(elementId, blur(5));
      editor.addEffect(elementId, grayscale());

      const filters = editor.getElementFilters(elementId);
      expect(filters).toHaveLength(2);
    });

    it('should return empty array for non-existent element', () => {
      expect(editor.getElementFilters('non-existent')).toEqual([]);
    });
  });

  // ============================================================
  // hasFilters
  // ============================================================

  describe('hasFilters', () => {
    it('should return false for element without filters', () => {
      const elementId = editor.addElement(createTestImageElement());
      expect(editor.hasFilters(elementId)).toBe(false);
    });

    it('should return true for element with filters', () => {
      const elementId = editor.addElement(createTestImageElement());
      editor.addEffect(elementId, blur(5));
      expect(editor.hasFilters(elementId)).toBe(true);
    });

    it('should return false for non-existent element', () => {
      expect(editor.hasFilters('non-existent')).toBe(false);
    });
  });

  // ============================================================
  // SVG Export with Filters
  // ============================================================

  describe('toSVG with filters', () => {
    it('should include filter definitions in SVG output', () => {
      const elementId = editor.addElement(createTestImageElement());
      editor.addEffect(elementId, blur(5));

      const svg = editor.toSVG();

      expect(svg).toContain('<filter');
      expect(svg).toContain('feGaussianBlur');
    });

    it('should apply filter attribute to elements', () => {
      const elementId = editor.addElement(createTestImageElement());
      editor.addEffect(elementId, blur(5));

      const svg = editor.toSVG();

      expect(svg).toContain('filter="url(#');
    });

    it('should include drop shadow filter correctly', () => {
      const elementId = editor.addElement(createTestImageElement());
      editor.addEffect(elementId, dropShadow({ offsetX: 4, offsetY: 4, blur: 8, color: '#000' }));

      const svg = editor.toSVG();

      expect(svg).toContain('feDropShadow');
    });

    it('should include color matrix filters correctly', () => {
      const elementId = editor.addElement(createTestImageElement());
      editor.addEffect(elementId, grayscale(1));

      const svg = editor.toSVG();

      expect(svg).toContain('feColorMatrix');
    });
  });

  // ============================================================
  // Undo/Redo with Filters
  // ============================================================

  describe('undo/redo with filters', () => {
    it('should undo adding a filter', () => {
      const elementId = editor.addElement(createTestImageElement());
      editor.addEffect(elementId, blur(5));

      expect(editor.hasFilters(elementId)).toBe(true);

      editor.undo();

      expect(editor.hasFilters(elementId)).toBe(false);
    });

    it('should redo adding a filter', () => {
      const elementId = editor.addElement(createTestImageElement());
      editor.addEffect(elementId, blur(5));
      editor.undo();

      expect(editor.hasFilters(elementId)).toBe(false);

      editor.redo();

      expect(editor.hasFilters(elementId)).toBe(true);
    });

    it('should undo clearing filters', () => {
      const elementId = editor.addElement(createTestImageElement());
      editor.addEffect(elementId, blur(5));
      editor.addEffect(elementId, grayscale());
      editor.clearFilters(elementId);

      expect(editor.hasFilters(elementId)).toBe(false);

      editor.undo();

      expect(editor.hasFilters(elementId)).toBe(true);
      expect(editor.getElementFilters(elementId)).toHaveLength(2);
    });
  });
});
