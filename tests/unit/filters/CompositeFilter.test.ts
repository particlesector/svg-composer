/**
 * Unit tests for composite filter chaining
 * Tests FilterManager.createCompositeFilter and primitive chaining logic
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { FilterManager } from '../../../src/filters/FilterManager.js';
import type {
  ElementFilter,
  GaussianBlurPrimitive,
  ColorMatrixPrimitive,
  MergePrimitive,
  CompositePrimitive,
  FloodPrimitive,
  ComponentTransferPrimitive,
  BlendPrimitive,
  TurbulencePrimitive,
  MorphologyPrimitive,
} from '../../../src/filters/types.js';

describe('Composite Filter Chaining', () => {
  let filterManager: FilterManager;

  beforeEach(() => {
    filterManager = new FilterManager();
  });

  // ============================================================
  // createCompositeFilter - Basic Behavior
  // ============================================================

  describe('createCompositeFilter - basic behavior', () => {
    it('should throw for empty filter list', () => {
      expect(() => filterManager.createCompositeFilter([])).toThrow(
        'Cannot create composite filter from empty filter list',
      );
    });

    it('should resolve single filter directly without creating composite', () => {
      const filterId = filterManager.addFilter({
        primitives: [{ type: 'gaussianBlur', stdDeviation: 5 } as GaussianBlurPrimitive],
      });

      const elementFilter: ElementFilter = { type: 'custom', filterId };
      const result = filterManager.createCompositeFilter([elementFilter]);

      expect(result).toBe(filterId);
    });

    it('should return a composite filter ID for multiple filters', () => {
      const id1 = filterManager.addFilter({
        primitives: [
          { type: 'colorMatrix', matrixType: 'saturate', values: 0 } as ColorMatrixPrimitive,
        ],
      });
      const id2 = filterManager.addFilter({
        primitives: [{ type: 'gaussianBlur', stdDeviation: 5 } as GaussianBlurPrimitive],
      });

      const result = filterManager.createCompositeFilter([
        { type: 'custom', filterId: id1 },
        { type: 'custom', filterId: id2 },
      ]);

      expect(result).toMatch(/^filter-composite-/);
      expect(filterManager.getFilter(result)).toBeDefined();
    });

    it('should cache composite filters for identical inputs', () => {
      const id1 = filterManager.addFilter({
        primitives: [
          { type: 'colorMatrix', matrixType: 'saturate', values: 0 } as ColorMatrixPrimitive,
        ],
      });
      const id2 = filterManager.addFilter({
        primitives: [{ type: 'gaussianBlur', stdDeviation: 5 } as GaussianBlurPrimitive],
      });

      const filters: ElementFilter[] = [
        { type: 'custom', filterId: id1 },
        { type: 'custom', filterId: id2 },
      ];

      const result1 = filterManager.createCompositeFilter(filters);
      const result2 = filterManager.createCompositeFilter(filters);

      expect(result1).toBe(result2);
    });

    it('should work with preset filters', () => {
      const filters: ElementFilter[] = [
        { type: 'preset', effect: { type: 'grayscale', amount: 1 } },
        { type: 'preset', effect: { type: 'blur', radius: 3 } },
      ];

      const result = filterManager.createCompositeFilter(filters);
      expect(result).toMatch(/^filter-composite-/);

      const composite = filterManager.getFilter(result);
      expect(composite).toBeDefined();
      expect(composite!.primitives.length).toBeGreaterThan(1);
    });

    it('should work with mixed preset and custom filters', () => {
      const customId = filterManager.addFilter({
        primitives: [
          { type: 'colorMatrix', matrixType: 'saturate', values: 0 } as ColorMatrixPrimitive,
        ],
      });

      const filters: ElementFilter[] = [
        { type: 'custom', filterId: customId },
        { type: 'preset', effect: { type: 'blur', radius: 5 } },
      ];

      const result = filterManager.createCompositeFilter(filters);
      expect(result).toMatch(/^filter-composite-/);

      const composite = filterManager.getFilter(result);
      expect(composite).toBeDefined();
      expect(composite!.primitives.length).toBe(2); // colorMatrix + gaussianBlur
    });
  });

  // ============================================================
  // Primitive Chaining
  // ============================================================

  describe('primitive chaining', () => {
    it('should chain two simple single-primitive filters', () => {
      // grayscale -> blur
      const id1 = filterManager.addFilter({
        primitives: [
          {
            type: 'colorMatrix',
            matrixType: 'saturate',
            in: 'SourceGraphic',
            values: 0,
          } as ColorMatrixPrimitive,
        ],
      });
      const id2 = filterManager.addFilter({
        primitives: [
          {
            type: 'gaussianBlur',
            stdDeviation: 5,
            in: 'SourceGraphic',
          } as GaussianBlurPrimitive,
        ],
      });

      const result = filterManager.createCompositeFilter([
        { type: 'custom', filterId: id1 },
        { type: 'custom', filterId: id2 },
      ]);

      const composite = filterManager.getFilter(result)!;
      expect(composite.primitives).toHaveLength(2);

      // First primitive should keep SourceGraphic and output to chain name
      const p0 = composite.primitives[0] as ColorMatrixPrimitive;
      expect(p0.type).toBe('colorMatrix');
      expect(p0.in).toBe('SourceGraphic');
      expect(p0.result).toBe('_chain0');

      // Second primitive should use chain output as input
      const p1 = composite.primitives[1] as GaussianBlurPrimitive;
      expect(p1.type).toBe('gaussianBlur');
      expect(p1.in).toBe('_chain0');
    });

    it('should chain three filters', () => {
      const id1 = filterManager.addFilter({
        primitives: [
          {
            type: 'colorMatrix',
            matrixType: 'saturate',
            in: 'SourceGraphic',
            values: 0,
          } as ColorMatrixPrimitive,
        ],
      });
      const id2 = filterManager.addFilter({
        primitives: [
          {
            type: 'colorMatrix',
            matrixType: 'hueRotate',
            in: 'SourceGraphic',
            values: 90,
          } as ColorMatrixPrimitive,
        ],
      });
      const id3 = filterManager.addFilter({
        primitives: [
          {
            type: 'gaussianBlur',
            stdDeviation: 3,
            in: 'SourceGraphic',
          } as GaussianBlurPrimitive,
        ],
      });

      const result = filterManager.createCompositeFilter([
        { type: 'custom', filterId: id1 },
        { type: 'custom', filterId: id2 },
        { type: 'custom', filterId: id3 },
      ]);

      const composite = filterManager.getFilter(result)!;
      expect(composite.primitives).toHaveLength(3);

      // First: SourceGraphic -> _chain0
      expect((composite.primitives[0] as ColorMatrixPrimitive).in).toBe('SourceGraphic');
      expect(composite.primitives[0]!.result).toBe('_chain0');

      // Second: _chain0 -> _chain1
      expect((composite.primitives[1] as ColorMatrixPrimitive).in).toBe('_chain0');
      expect(composite.primitives[1]!.result).toBe('_chain1');

      // Third: _chain1 (no forced result on last filter)
      expect((composite.primitives[2] as GaussianBlurPrimitive).in).toBe('_chain1');
    });

    it('should preserve SourceAlpha references when chaining', () => {
      // First filter: simple brightness
      const id1 = filterManager.addFilter({
        primitives: [
          {
            type: 'componentTransfer',
            in: 'SourceGraphic',
            funcR: { type: 'linear', slope: 1.5, intercept: 0 },
            funcG: { type: 'linear', slope: 1.5, intercept: 0 },
            funcB: { type: 'linear', slope: 1.5, intercept: 0 },
          } as ComponentTransferPrimitive,
        ],
      });

      // Second filter: glow (uses SourceAlpha)
      const id2 = filterManager.addFilter({
        primitives: [
          {
            type: 'gaussianBlur',
            stdDeviation: 5,
            in: 'SourceAlpha',
            result: 'blur',
          } as GaussianBlurPrimitive,
          {
            type: 'flood',
            floodColor: 'red',
            floodOpacity: 1,
            result: 'color',
          } as FloodPrimitive,
          {
            type: 'composite',
            operator: 'in',
            in: 'color',
            in2: 'blur',
            result: 'glow',
          } as CompositePrimitive,
          {
            type: 'merge',
            nodes: [{ in: 'glow' }, { in: 'SourceGraphic' }],
          } as MergePrimitive,
        ],
      });

      const result = filterManager.createCompositeFilter([
        { type: 'custom', filterId: id1 },
        { type: 'custom', filterId: id2 },
      ]);

      const composite = filterManager.getFilter(result)!;
      expect(composite.primitives).toHaveLength(5);

      // Second filter's first primitive should still reference SourceAlpha (not replaced)
      const blurPrimitive = composite.primitives[1] as GaussianBlurPrimitive;
      expect(blurPrimitive.in).toBe('SourceAlpha');

      // Second filter's merge should reference _chain0 instead of SourceGraphic
      const mergePrimitive = composite.primitives[4] as MergePrimitive;
      expect(mergePrimitive.nodes[1]!.in).toBe('_chain0');
    });

    it('should namespace internal result names to avoid collisions', () => {
      // Two filters that both use 'blur' as internal result name
      const id1 = filterManager.addFilter({
        primitives: [
          {
            type: 'gaussianBlur',
            stdDeviation: 3,
            in: 'SourceGraphic',
            result: 'blur',
          } as GaussianBlurPrimitive,
          {
            type: 'colorMatrix',
            matrixType: 'saturate',
            in: 'blur',
            values: 0,
          } as ColorMatrixPrimitive,
        ],
      });
      const id2 = filterManager.addFilter({
        primitives: [
          {
            type: 'gaussianBlur',
            stdDeviation: 5,
            in: 'SourceGraphic',
            result: 'blur',
          } as GaussianBlurPrimitive,
          {
            type: 'colorMatrix',
            matrixType: 'hueRotate',
            in: 'blur',
            values: 90,
          } as ColorMatrixPrimitive,
        ],
      });

      const result = filterManager.createCompositeFilter([
        { type: 'custom', filterId: id1 },
        { type: 'custom', filterId: id2 },
      ]);

      const composite = filterManager.getFilter(result)!;
      expect(composite.primitives).toHaveLength(4);

      // Filter 0: result names prefixed with _f0_
      expect(composite.primitives[0]!.result).toBe('_f0_blur');
      expect((composite.primitives[1] as ColorMatrixPrimitive).in).toBe('_f0_blur');

      // Filter 1: result names prefixed with _f1_
      expect(composite.primitives[2]!.result).toBe('_f1_blur');
      expect((composite.primitives[3] as ColorMatrixPrimitive).in).toBe('_f1_blur');
    });

    it('should namespace in2 references for composite and blend primitives', () => {
      const id1 = filterManager.addFilter({
        primitives: [
          {
            type: 'colorMatrix',
            matrixType: 'saturate',
            in: 'SourceGraphic',
            values: 0.5,
          } as ColorMatrixPrimitive,
        ],
      });

      // Filter with blend that uses in2
      const id2 = filterManager.addFilter({
        primitives: [
          {
            type: 'turbulence',
            turbulenceType: 'turbulence',
            baseFrequency: 0.05,
            numOctaves: 4,
            result: 'noise',
          } as TurbulencePrimitive,
          {
            type: 'blend',
            mode: 'overlay',
            in: 'SourceGraphic',
            in2: 'noise',
          } as BlendPrimitive,
        ],
      });

      const result = filterManager.createCompositeFilter([
        { type: 'custom', filterId: id1 },
        { type: 'custom', filterId: id2 },
      ]);

      const composite = filterManager.getFilter(result)!;
      expect(composite.primitives).toHaveLength(3);

      // Filter 1's turbulence should have prefixed result
      expect(composite.primitives[1]!.result).toBe('_f1_noise');

      // Filter 1's blend should have prefixed in2 and chain input
      const blendPrimitive = composite.primitives[2] as BlendPrimitive;
      expect(blendPrimitive.in).toBe('_chain0');
      expect(blendPrimitive.in2).toBe('_f1_noise');
    });

    it('should handle merge nodes with SourceGraphic references', () => {
      const id1 = filterManager.addFilter({
        primitives: [
          {
            type: 'colorMatrix',
            matrixType: 'saturate',
            in: 'SourceGraphic',
            values: 0,
          } as ColorMatrixPrimitive,
        ],
      });

      // Outline filter with merge referencing SourceGraphic
      const id2 = filterManager.addFilter({
        primitives: [
          {
            type: 'morphology',
            operator: 'dilate',
            radius: 2,
            in: 'SourceAlpha',
            result: 'dilated',
          } as MorphologyPrimitive,
          {
            type: 'flood',
            floodColor: 'red',
            floodOpacity: 1,
            result: 'outlineColor',
          } as FloodPrimitive,
          {
            type: 'composite',
            operator: 'in',
            in: 'outlineColor',
            in2: 'dilated',
            result: 'outline',
          } as CompositePrimitive,
          {
            type: 'merge',
            nodes: [{ in: 'outline' }, { in: 'SourceGraphic' }],
          } as MergePrimitive,
        ],
      });

      const result = filterManager.createCompositeFilter([
        { type: 'custom', filterId: id1 },
        { type: 'custom', filterId: id2 },
      ]);

      const composite = filterManager.getFilter(result)!;

      // Merge should reference prefixed 'outline' and chain output '_chain0'
      const merge = composite.primitives[composite.primitives.length - 1] as MergePrimitive;
      expect(merge.nodes[0]!.in).toBe('_f1_outline');
      expect(merge.nodes[1]!.in).toBe('_chain0');
    });
  });

  // ============================================================
  // Filter Region Union
  // ============================================================

  describe('filter region union', () => {
    it('should compute union of filter regions', () => {
      // Blur with large padding
      const id1 = filterManager.addFilter({
        primitives: [{ type: 'gaussianBlur', stdDeviation: 5 } as GaussianBlurPrimitive],
        x: '-15%',
        y: '-15%',
        width: '130%',
        height: '130%',
      });

      // Drop shadow with even larger padding
      const id2 = filterManager.addFilter({
        primitives: [{ type: 'gaussianBlur', stdDeviation: 3 } as GaussianBlurPrimitive],
        x: '-25%',
        y: '-20%',
        width: '150%',
        height: '140%',
      });

      const result = filterManager.createCompositeFilter([
        { type: 'custom', filterId: id1 },
        { type: 'custom', filterId: id2 },
      ]);

      const composite = filterManager.getFilter(result)!;
      // Should use the most generous bounds
      expect(composite.x).toBe('-25%');
      expect(composite.y).toBe('-20%');
      expect(composite.width).toBe('150%');
      expect(composite.height).toBe('140%');
    });

    it('should handle filters with default regions', () => {
      // Filter with no explicit region
      const id1 = filterManager.addFilter({
        primitives: [
          { type: 'colorMatrix', matrixType: 'saturate', values: 0 } as ColorMatrixPrimitive,
        ],
      });

      // Filter with explicit expanded region
      const id2 = filterManager.addFilter({
        primitives: [{ type: 'gaussianBlur', stdDeviation: 5 } as GaussianBlurPrimitive],
        x: '-10%',
        y: '-10%',
        width: '120%',
        height: '120%',
      });

      const result = filterManager.createCompositeFilter([
        { type: 'custom', filterId: id1 },
        { type: 'custom', filterId: id2 },
      ]);

      const composite = filterManager.getFilter(result)!;
      expect(composite.x).toBe('-10%');
      expect(composite.y).toBe('-10%');
      expect(composite.width).toBe('120%');
      expect(composite.height).toBe('120%');
    });
  });

  // ============================================================
  // Deep Clone Safety
  // ============================================================

  describe('deep clone safety', () => {
    it('should not mutate original filter primitives', () => {
      const originalPrimitives = [
        {
          type: 'gaussianBlur' as const,
          stdDeviation: 5,
          in: 'SourceGraphic',
          result: 'blur',
        },
        {
          type: 'colorMatrix' as const,
          matrixType: 'saturate' as const,
          in: 'blur',
          values: 0,
        },
      ];

      const id1 = filterManager.addFilter({
        primitives: originalPrimitives as [GaussianBlurPrimitive, ColorMatrixPrimitive],
      });
      const id2 = filterManager.addFilter({
        primitives: [
          { type: 'gaussianBlur', stdDeviation: 3, in: 'SourceGraphic' } as GaussianBlurPrimitive,
        ],
      });

      filterManager.createCompositeFilter([
        { type: 'custom', filterId: id1 },
        { type: 'custom', filterId: id2 },
      ]);

      // Original filter should be unchanged
      const originalFilter = filterManager.getFilter(id1)!;
      expect(originalFilter.primitives[0]!.result).toBe('blur');
      expect((originalFilter.primitives[0] as GaussianBlurPrimitive).in).toBe('SourceGraphic');
      expect((originalFilter.primitives[1] as ColorMatrixPrimitive).in).toBe('blur');
    });

    it('should clone merge node arrays deeply', () => {
      const id1 = filterManager.addFilter({
        primitives: [
          {
            type: 'merge',
            nodes: [{ in: 'SourceGraphic' }, { in: 'SourceAlpha' }],
          } as MergePrimitive,
        ],
      });
      const id2 = filterManager.addFilter({
        primitives: [
          { type: 'gaussianBlur', stdDeviation: 3, in: 'SourceGraphic' } as GaussianBlurPrimitive,
        ],
      });

      filterManager.createCompositeFilter([
        { type: 'custom', filterId: id1 },
        { type: 'custom', filterId: id2 },
      ]);

      // Original merge nodes should be unchanged
      const original = filterManager.getFilter(id1)!;
      const merge = original.primitives[0] as MergePrimitive;
      expect(merge.nodes[0]!.in).toBe('SourceGraphic');
      expect(merge.nodes[1]!.in).toBe('SourceAlpha');
    });

    it('should clone component transfer functions deeply', () => {
      const id1 = filterManager.addFilter({
        primitives: [
          {
            type: 'componentTransfer',
            in: 'SourceGraphic',
            funcR: { type: 'linear', slope: 1.5, intercept: 0 },
            funcG: { type: 'linear', slope: 1.5, intercept: 0 },
            funcB: { type: 'linear', slope: 1.5, intercept: 0 },
          } as ComponentTransferPrimitive,
        ],
      });
      const id2 = filterManager.addFilter({
        primitives: [
          { type: 'gaussianBlur', stdDeviation: 3, in: 'SourceGraphic' } as GaussianBlurPrimitive,
        ],
      });

      filterManager.createCompositeFilter([
        { type: 'custom', filterId: id1 },
        { type: 'custom', filterId: id2 },
      ]);

      // Original component transfer functions should be unchanged
      const original = filterManager.getFilter(id1)!;
      const transfer = original.primitives[0] as ComponentTransferPrimitive;
      expect(transfer.in).toBe('SourceGraphic');
      expect(transfer.funcR!.slope).toBe(1.5);
    });
  });

  // ============================================================
  // Cache Management
  // ============================================================

  describe('cache management', () => {
    it('should invalidate composite cache on clearFilters', () => {
      const id1 = filterManager.addFilter({
        primitives: [
          { type: 'colorMatrix', matrixType: 'saturate', values: 0 } as ColorMatrixPrimitive,
        ],
      });
      const id2 = filterManager.addFilter({
        primitives: [{ type: 'gaussianBlur', stdDeviation: 5 } as GaussianBlurPrimitive],
      });

      const compositeId = filterManager.createCompositeFilter([
        { type: 'custom', filterId: id1 },
        { type: 'custom', filterId: id2 },
      ]);

      expect(filterManager.getFilter(compositeId)).toBeDefined();

      filterManager.clearFilters();

      expect(filterManager.getFilter(compositeId)).toBeUndefined();
    });

    it('should invalidate composite cache on restore', () => {
      const id1 = filterManager.addFilter({
        primitives: [
          { type: 'colorMatrix', matrixType: 'saturate', values: 0 } as ColorMatrixPrimitive,
        ],
      });
      const id2 = filterManager.addFilter({
        primitives: [{ type: 'gaussianBlur', stdDeviation: 5 } as GaussianBlurPrimitive],
      });

      const compositeId = filterManager.createCompositeFilter([
        { type: 'custom', filterId: id1 },
        { type: 'custom', filterId: id2 },
      ]);

      expect(filterManager.getFilter(compositeId)).toBeDefined();

      // Restore with empty snapshot
      filterManager.restore(new Map());

      expect(filterManager.getFilter(compositeId)).toBeUndefined();
    });

    it('should create different composite filters for different orderings', () => {
      const id1 = filterManager.addFilter({
        primitives: [
          { type: 'colorMatrix', matrixType: 'saturate', values: 0 } as ColorMatrixPrimitive,
        ],
      });
      const id2 = filterManager.addFilter({
        primitives: [{ type: 'gaussianBlur', stdDeviation: 5 } as GaussianBlurPrimitive],
      });

      const compositeA = filterManager.createCompositeFilter([
        { type: 'custom', filterId: id1 },
        { type: 'custom', filterId: id2 },
      ]);
      const compositeB = filterManager.createCompositeFilter([
        { type: 'custom', filterId: id2 },
        { type: 'custom', filterId: id1 },
      ]);

      expect(compositeA).not.toBe(compositeB);
    });
  });

  // ============================================================
  // Color Interpolation
  // ============================================================

  describe('composite filter properties', () => {
    it('should set colorInterpolationFilters to sRGB', () => {
      const id1 = filterManager.addFilter({
        primitives: [
          { type: 'colorMatrix', matrixType: 'saturate', values: 0 } as ColorMatrixPrimitive,
        ],
      });
      const id2 = filterManager.addFilter({
        primitives: [{ type: 'gaussianBlur', stdDeviation: 5 } as GaussianBlurPrimitive],
      });

      const result = filterManager.createCompositeFilter([
        { type: 'custom', filterId: id1 },
        { type: 'custom', filterId: id2 },
      ]);

      const composite = filterManager.getFilter(result)!;
      expect(composite.colorInterpolationFilters).toBe('sRGB');
    });
  });

  // ============================================================
  // Preset Effect Chaining
  // ============================================================

  describe('preset effect chaining', () => {
    it('should chain grayscale + blur presets', () => {
      const filters: ElementFilter[] = [
        { type: 'preset', effect: { type: 'grayscale', amount: 1 } },
        { type: 'preset', effect: { type: 'blur', radius: 5 } },
      ];

      const result = filterManager.createCompositeFilter(filters);
      const composite = filterManager.getFilter(result)!;

      // grayscale = 1 colorMatrix, blur = 1 gaussianBlur
      expect(composite.primitives).toHaveLength(2);
      expect(composite.primitives[0]!.type).toBe('colorMatrix');
      expect(composite.primitives[1]!.type).toBe('gaussianBlur');

      // Blur should use chain output from grayscale
      expect((composite.primitives[1] as GaussianBlurPrimitive).in).toBe('_chain0');
    });

    it('should chain drop shadow + grayscale presets', () => {
      const filters: ElementFilter[] = [
        {
          type: 'preset',
          effect: { type: 'dropShadow', offsetX: 5, offsetY: 5, blur: 3, color: 'black' },
        },
        { type: 'preset', effect: { type: 'grayscale', amount: 1 } },
      ];

      const result = filterManager.createCompositeFilter(filters);
      const composite = filterManager.getFilter(result)!;

      // Drop shadow is 1 primitive (feDropShadow), grayscale is 1 (colorMatrix)
      expect(composite.primitives).toHaveLength(2);
      expect(composite.primitives[0]!.type).toBe('dropShadow');
      expect(composite.primitives[1]!.type).toBe('colorMatrix');

      // Grayscale should read from chain output
      expect((composite.primitives[1] as ColorMatrixPrimitive).in).toBe('_chain0');
    });

    it('should chain glow + sepia (multi-primitive + single-primitive)', () => {
      const filters: ElementFilter[] = [
        { type: 'preset', effect: { type: 'glow', radius: 5, color: 'blue' } },
        { type: 'preset', effect: { type: 'sepia', amount: 0.8 } },
      ];

      const result = filterManager.createCompositeFilter(filters);
      const composite = filterManager.getFilter(result)!;

      // Outer glow = 4 primitives, sepia = 1
      expect(composite.primitives).toHaveLength(5);

      // Last primitive of glow chain should be merge
      const glowMerge = composite.primitives[3] as MergePrimitive;
      expect(glowMerge.type).toBe('merge');

      // Sepia should read from chain output
      const sepia = composite.primitives[4] as ColorMatrixPrimitive;
      expect(sepia.type).toBe('colorMatrix');
      expect(sepia.in).toBe('_chain0');
    });

    it('should handle three preset effects', () => {
      const filters: ElementFilter[] = [
        { type: 'preset', effect: { type: 'brightness', amount: 1.5 } },
        { type: 'preset', effect: { type: 'contrast', amount: 1.2 } },
        { type: 'preset', effect: { type: 'saturate', amount: 0.5 } },
      ];

      const result = filterManager.createCompositeFilter(filters);
      const composite = filterManager.getFilter(result)!;

      // brightness = 1 componentTransfer, contrast = 1 componentTransfer, saturate = 1 colorMatrix
      expect(composite.primitives).toHaveLength(3);

      expect(composite.primitives[0]!.type).toBe('componentTransfer');
      expect(composite.primitives[1]!.type).toBe('componentTransfer');
      expect(composite.primitives[2]!.type).toBe('colorMatrix');

      // Chain inputs
      expect((composite.primitives[0] as ComponentTransferPrimitive).in).toBe('SourceGraphic');
      expect(composite.primitives[0]!.result).toBe('_chain0');

      expect((composite.primitives[1] as ComponentTransferPrimitive).in).toBe('_chain0');
      expect(composite.primitives[1]!.result).toBe('_chain1');

      expect((composite.primitives[2] as ColorMatrixPrimitive).in).toBe('_chain1');
    });
  });
});
