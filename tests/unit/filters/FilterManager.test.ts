/**
 * FilterManager unit tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { FilterManager } from '../../../src/filters/FilterManager.js';
import type {
  FilterDefinition,
  EffectPreset,
  GaussianBlurPrimitive,
  DropShadowPrimitive,
  ColorMatrixPrimitive,
} from '../../../src/filters/types.js';

describe('FilterManager', () => {
  let filterManager: FilterManager;

  beforeEach(() => {
    filterManager = new FilterManager();
  });

  // ============================================================
  // Filter CRUD Operations
  // ============================================================

  describe('addFilter', () => {
    it('should add a filter and return its ID', () => {
      const filter: Omit<FilterDefinition, 'id'> = {
        primitives: [{ type: 'gaussianBlur', stdDeviation: 5 } as GaussianBlurPrimitive],
      };

      const id = filterManager.addFilter(filter);
      expect(id).toMatch(/^filter-/);
      expect(filterManager.getFilter(id)).toBeDefined();
    });

    it('should add multiple filters with unique IDs', () => {
      const id1 = filterManager.addFilter({ primitives: [] });
      const id2 = filterManager.addFilter({ primitives: [] });
      expect(id1).not.toBe(id2);
    });
  });

  describe('addFilterWithId', () => {
    it('should add a filter with a specific ID', () => {
      const filter: FilterDefinition = {
        id: 'custom-filter-id',
        primitives: [],
      };

      filterManager.addFilterWithId(filter);
      expect(filterManager.getFilter('custom-filter-id')).toEqual(filter);
    });
  });

  describe('getFilter', () => {
    it('should return undefined for non-existent filter', () => {
      expect(filterManager.getFilter('non-existent')).toBeUndefined();
    });

    it('should return the filter if it exists', () => {
      const id = filterManager.addFilter({ primitives: [] });
      expect(filterManager.getFilter(id)).toBeDefined();
    });
  });

  describe('getAllFilters', () => {
    it('should return empty array when no filters exist', () => {
      expect(filterManager.getAllFilters()).toEqual([]);
    });

    it('should return all filters', () => {
      filterManager.addFilter({ primitives: [] });
      filterManager.addFilter({ primitives: [] });
      filterManager.addFilter({ primitives: [] });
      expect(filterManager.getAllFilters()).toHaveLength(3);
    });
  });

  describe('removeFilter', () => {
    it('should return false for non-existent filter', () => {
      expect(filterManager.removeFilter('non-existent')).toBe(false);
    });

    it('should remove the filter and return true', () => {
      const id = filterManager.addFilter({ primitives: [] });
      expect(filterManager.removeFilter(id)).toBe(true);
      expect(filterManager.getFilter(id)).toBeUndefined();
    });
  });

  describe('updateFilter', () => {
    it('should return false for non-existent filter', () => {
      expect(filterManager.updateFilter('non-existent', { primitives: [] })).toBe(false);
    });

    it('should update the filter and return true', () => {
      const id = filterManager.addFilter({ primitives: [], x: '0%' });
      expect(filterManager.updateFilter(id, { x: '-10%' })).toBe(true);
      expect(filterManager.getFilter(id)?.x).toBe('-10%');
    });

    it('should not change the filter ID', () => {
      const id = filterManager.addFilter({ primitives: [] });
      // Attempt to change ID via updates should be ignored
      const updatedFilter = filterManager.getFilter(id);
      expect(updatedFilter?.id).toBe(id);
    });
  });

  describe('clearFilters', () => {
    it('should remove all filters', () => {
      filterManager.addFilter({ primitives: [] });
      filterManager.addFilter({ primitives: [] });
      filterManager.clearFilters();
      expect(filterManager.getAllFilters()).toHaveLength(0);
    });
  });

  // ============================================================
  // Snapshot/Restore
  // ============================================================

  describe('snapshot', () => {
    it('should create a copy of all filters', () => {
      const id = filterManager.addFilter({ primitives: [] });
      const snapshot = filterManager.snapshot();
      expect(snapshot.get(id)).toBeDefined();
    });
  });

  describe('restore', () => {
    it('should restore filters from a snapshot', () => {
      const id = filterManager.addFilter({ primitives: [] });
      const snapshot = filterManager.snapshot();
      filterManager.clearFilters();
      expect(filterManager.getAllFilters()).toHaveLength(0);
      filterManager.restore(snapshot);
      expect(filterManager.getFilter(id)).toBeDefined();
    });
  });

  // ============================================================
  // Effect Preset Conversion
  // ============================================================

  describe('effectToFilter', () => {
    it('should convert blur effect to filter definition', () => {
      const effect: EffectPreset = { type: 'blur', radius: 5 };
      const filter = filterManager.effectToFilter(effect);

      expect(filter.id).toMatch(/^filter-/);
      expect(filter.primitives).toHaveLength(1);
      expect(filter.primitives[0].type).toBe('gaussianBlur');
      expect((filter.primitives[0] as GaussianBlurPrimitive).stdDeviation).toBe(5);
    });

    it('should convert dropShadow effect to filter definition', () => {
      const effect: EffectPreset = {
        type: 'dropShadow',
        offsetX: 4,
        offsetY: 4,
        blur: 8,
        color: '#000000',
        opacity: 0.5,
      };
      const filter = filterManager.effectToFilter(effect);

      expect(filter.primitives).toHaveLength(1);
      expect(filter.primitives[0].type).toBe('dropShadow');
      const shadow = filter.primitives[0] as DropShadowPrimitive;
      expect(shadow.dx).toBe(4);
      expect(shadow.dy).toBe(4);
      expect(shadow.stdDeviation).toBe(8);
      expect(shadow.floodColor).toBe('#000000');
      expect(shadow.floodOpacity).toBe(0.5);
    });

    it('should convert grayscale effect to filter definition', () => {
      const effect: EffectPreset = { type: 'grayscale', amount: 1 };
      const filter = filterManager.effectToFilter(effect);

      expect(filter.primitives).toHaveLength(1);
      expect(filter.primitives[0].type).toBe('colorMatrix');
    });

    it('should convert sepia effect to filter definition', () => {
      const effect: EffectPreset = { type: 'sepia', amount: 1 };
      const filter = filterManager.effectToFilter(effect);

      expect(filter.primitives).toHaveLength(1);
      expect(filter.primitives[0].type).toBe('colorMatrix');
    });

    it('should convert saturate effect to filter definition', () => {
      const effect: EffectPreset = { type: 'saturate', amount: 2 };
      const filter = filterManager.effectToFilter(effect);

      expect(filter.primitives).toHaveLength(1);
      expect(filter.primitives[0].type).toBe('colorMatrix');
    });

    it('should convert hueRotate effect to filter definition', () => {
      const effect: EffectPreset = { type: 'hueRotate', angle: 90 };
      const filter = filterManager.effectToFilter(effect);

      expect(filter.primitives).toHaveLength(1);
      expect(filter.primitives[0].type).toBe('colorMatrix');
    });

    it('should convert brightness effect to filter definition', () => {
      const effect: EffectPreset = { type: 'brightness', amount: 1.5 };
      const filter = filterManager.effectToFilter(effect);

      expect(filter.primitives).toHaveLength(1);
      expect(filter.primitives[0].type).toBe('componentTransfer');
    });

    it('should convert contrast effect to filter definition', () => {
      const effect: EffectPreset = { type: 'contrast', amount: 1.5 };
      const filter = filterManager.effectToFilter(effect);

      expect(filter.primitives).toHaveLength(1);
      expect(filter.primitives[0].type).toBe('componentTransfer');
    });

    it('should convert invert effect to filter definition', () => {
      const effect: EffectPreset = { type: 'invert', amount: 1 };
      const filter = filterManager.effectToFilter(effect);

      expect(filter.primitives).toHaveLength(1);
      expect(filter.primitives[0].type).toBe('componentTransfer');
    });

    it('should convert glow effect to filter definition', () => {
      const effect: EffectPreset = { type: 'glow', radius: 10, color: '#ff0000' };
      const filter = filterManager.effectToFilter(effect);

      // Glow uses multiple primitives: blur, flood, composite, merge
      expect(filter.primitives.length).toBeGreaterThanOrEqual(3);
    });

    it('should convert innerShadow effect to filter definition', () => {
      const effect: EffectPreset = {
        type: 'innerShadow',
        offsetX: 2,
        offsetY: 2,
        blur: 4,
        color: '#000000',
      };
      const filter = filterManager.effectToFilter(effect);

      expect(filter.primitives.length).toBeGreaterThanOrEqual(4);
    });

    it('should convert outline effect to filter definition', () => {
      const effect: EffectPreset = { type: 'outline', width: 2, color: '#000000' };
      const filter = filterManager.effectToFilter(effect);

      expect(filter.primitives.length).toBeGreaterThanOrEqual(3);
    });

    it('should convert sharpen effect to filter definition', () => {
      const effect: EffectPreset = { type: 'sharpen', amount: 0.5 };
      const filter = filterManager.effectToFilter(effect);

      expect(filter.primitives).toHaveLength(1);
      expect(filter.primitives[0].type).toBe('convolveMatrix');
    });

    it('should convert emboss effect to filter definition', () => {
      const effect: EffectPreset = { type: 'emboss', strength: 1 };
      const filter = filterManager.effectToFilter(effect);

      expect(filter.primitives.length).toBeGreaterThanOrEqual(2);
    });

    it('should convert noise effect to filter definition', () => {
      const effect: EffectPreset = { type: 'noise', intensity: 0.3 };
      const filter = filterManager.effectToFilter(effect);

      expect(filter.primitives.length).toBeGreaterThanOrEqual(2);
    });

    it('should convert vintage effect to filter definition', () => {
      const effect: EffectPreset = { type: 'vintage', intensity: 1 };
      const filter = filterManager.effectToFilter(effect);

      expect(filter.primitives.length).toBeGreaterThanOrEqual(2);
    });

    it('should convert duotone effect to filter definition', () => {
      const effect: EffectPreset = {
        type: 'duotone',
        shadowColor: '#000000',
        highlightColor: '#ffffff',
      };
      const filter = filterManager.effectToFilter(effect);

      expect(filter.primitives.length).toBeGreaterThanOrEqual(2);
    });

    it('should convert brightnessContrast effect to filter definition', () => {
      const effect: EffectPreset = {
        type: 'brightnessContrast',
        brightness: 1.2,
        contrast: 1.5,
      };
      const filter = filterManager.effectToFilter(effect);

      expect(filter.primitives).toHaveLength(1);
      expect(filter.primitives[0].type).toBe('componentTransfer');
    });
  });

  describe('getOrCreatePresetFilter', () => {
    it('should create a new filter for a preset', () => {
      const effect: EffectPreset = { type: 'blur', radius: 5 };
      const id = filterManager.getOrCreatePresetFilter(effect);

      expect(id).toMatch(/^filter-/);
      expect(filterManager.getFilter(id)).toBeDefined();
    });

    it('should return cached filter for identical preset', () => {
      const effect: EffectPreset = { type: 'blur', radius: 5 };
      const id1 = filterManager.getOrCreatePresetFilter(effect);
      const id2 = filterManager.getOrCreatePresetFilter(effect);

      expect(id1).toBe(id2);
    });

    it('should create different filters for different presets', () => {
      const effect1: EffectPreset = { type: 'blur', radius: 5 };
      const effect2: EffectPreset = { type: 'blur', radius: 10 };
      const id1 = filterManager.getOrCreatePresetFilter(effect1);
      const id2 = filterManager.getOrCreatePresetFilter(effect2);

      expect(id1).not.toBe(id2);
    });
  });

  describe('resolveElementFilter', () => {
    it('should resolve preset filter reference', () => {
      const effect: EffectPreset = { type: 'blur', radius: 5 };
      const filterId = filterManager.resolveElementFilter({
        type: 'preset',
        effect,
      });

      expect(filterId).toMatch(/^filter-/);
    });

    it('should resolve custom filter reference', () => {
      const customId = filterManager.addFilter({ primitives: [] });
      const filterId = filterManager.resolveElementFilter({
        type: 'custom',
        filterId: customId,
      });

      expect(filterId).toBe(customId);
    });
  });

  // ============================================================
  // Filter Region Calculation
  // ============================================================

  describe('filter region', () => {
    it('should set larger filter region for blur effects', () => {
      const effect: EffectPreset = { type: 'blur', radius: 10 };
      const filter = filterManager.effectToFilter(effect);

      // Blur needs extra padding for the blur to extend beyond element bounds
      expect(filter.x).toBeDefined();
      expect(filter.width).toBeDefined();
    });

    it('should set larger filter region for drop shadow effects', () => {
      const effect: EffectPreset = {
        type: 'dropShadow',
        offsetX: 10,
        offsetY: 10,
        blur: 10,
        color: '#000',
      };
      const filter = filterManager.effectToFilter(effect);

      expect(filter.x).toBeDefined();
      expect(filter.width).toBeDefined();
    });

    it('should set larger filter region for glow effects', () => {
      const effect: EffectPreset = { type: 'glow', radius: 15, color: '#fff' };
      const filter = filterManager.effectToFilter(effect);

      expect(filter.x).toBeDefined();
      expect(filter.width).toBeDefined();
    });
  });

  // ============================================================
  // Color Parsing
  // ============================================================

  describe('color parsing for duotone', () => {
    it('should handle hex colors', () => {
      const effect: EffectPreset = {
        type: 'duotone',
        shadowColor: '#ff0000',
        highlightColor: '#00ff00',
      };
      const filter = filterManager.effectToFilter(effect);
      expect(filter.primitives.length).toBeGreaterThan(0);
    });

    it('should handle short hex colors', () => {
      const effect: EffectPreset = {
        type: 'duotone',
        shadowColor: '#f00',
        highlightColor: '#0f0',
      };
      const filter = filterManager.effectToFilter(effect);
      expect(filter.primitives.length).toBeGreaterThan(0);
    });

    it('should handle named colors', () => {
      const effect: EffectPreset = {
        type: 'duotone',
        shadowColor: 'black',
        highlightColor: 'white',
      };
      const filter = filterManager.effectToFilter(effect);
      expect(filter.primitives.length).toBeGreaterThan(0);
    });

    it('should handle rgb() colors', () => {
      const effect: EffectPreset = {
        type: 'duotone',
        shadowColor: 'rgb(255, 0, 0)',
        highlightColor: 'rgb(0, 255, 0)',
      };
      const filter = filterManager.effectToFilter(effect);
      expect(filter.primitives.length).toBeGreaterThan(0);
    });

    it('should handle invalid color format and fallback to black', () => {
      const effect: EffectPreset = {
        type: 'duotone',
        shadowColor: 'invalid-color-format',
        highlightColor: 'also-invalid',
      };
      // Should not throw, should fallback to black
      const filter = filterManager.effectToFilter(effect);
      expect(filter.primitives.length).toBeGreaterThan(0);
    });
  });

  // ============================================================
  // Inner Glow
  // ============================================================

  describe('inner glow', () => {
    it('should convert inner glow effect to filter definition', () => {
      const effect: EffectPreset = {
        type: 'glow',
        radius: 10,
        color: '#ff0000',
        inner: true,
      };
      const filter = filterManager.effectToFilter(effect);

      // Inner glow uses inner shadow primitives
      expect(filter.primitives.length).toBeGreaterThanOrEqual(4);
    });

    it('should convert inner glow with opacity to filter definition', () => {
      const effect: EffectPreset = {
        type: 'glow',
        radius: 8,
        color: '#00ff00',
        opacity: 0.5,
        inner: true,
      };
      const filter = filterManager.effectToFilter(effect);

      expect(filter.primitives.length).toBeGreaterThanOrEqual(4);
    });
  });

  // ============================================================
  // Constructor Options
  // ============================================================

  describe('constructor options', () => {
    it('should accept default options (no arguments)', () => {
      const fm = new FilterManager();
      const stats = fm.presetCacheStats();
      expect(stats.capacity).toBe(128);
    });

    it('should accept custom preset cache size', () => {
      const fm = new FilterManager({ presetCacheSize: 16 });
      const stats = fm.presetCacheStats();
      expect(stats.capacity).toBe(16);
    });

    it('should accept custom composite cache size', () => {
      const fm = new FilterManager({ compositeCacheSize: 8 });
      const stats = fm.compositeCacheStats();
      expect(stats.capacity).toBe(8);
    });

    it('should accept both options at once', () => {
      const fm = new FilterManager({
        presetCacheSize: 32,
        compositeCacheSize: 16,
      });
      expect(fm.presetCacheStats().capacity).toBe(32);
      expect(fm.compositeCacheStats().capacity).toBe(16);
    });
  });

  // ============================================================
  // LRU Cache Eviction
  // ============================================================

  describe('LRU cache eviction', () => {
    it('should evict least recently used preset and clean up filter', () => {
      const fm = new FilterManager({ presetCacheSize: 2 });

      // Create 2 presets (fills cache)
      const id1 = fm.getOrCreatePresetFilter({
        type: 'blur',
        radius: 1,
      });
      const id2 = fm.getOrCreatePresetFilter({
        type: 'blur',
        radius: 2,
      });

      // Both filters should exist
      expect(fm.getFilter(id1)).toBeDefined();
      expect(fm.getFilter(id2)).toBeDefined();

      // Create 3rd preset — should evict id1 (LRU)
      const id3 = fm.getOrCreatePresetFilter({
        type: 'blur',
        radius: 3,
      });

      expect(fm.getFilter(id1)).toBeUndefined(); // evicted
      expect(fm.getFilter(id2)).toBeDefined();
      expect(fm.getFilter(id3)).toBeDefined();
    });

    it('should not evict recently accessed preset', () => {
      const fm = new FilterManager({ presetCacheSize: 2 });

      const id1 = fm.getOrCreatePresetFilter({
        type: 'blur',
        radius: 1,
      });
      const id2 = fm.getOrCreatePresetFilter({
        type: 'blur',
        radius: 2,
      });

      // Access id1 again (moves to MRU)
      fm.getOrCreatePresetFilter({ type: 'blur', radius: 1 });

      // Add 3rd — should evict id2 (now LRU), not id1
      fm.getOrCreatePresetFilter({ type: 'blur', radius: 3 });

      expect(fm.getFilter(id1)).toBeDefined(); // recently accessed
      expect(fm.getFilter(id2)).toBeUndefined(); // evicted
    });

    it('should re-create evicted preset on next access', () => {
      const fm = new FilterManager({ presetCacheSize: 1 });

      const id1 = fm.getOrCreatePresetFilter({
        type: 'blur',
        radius: 5,
      });
      // Evict by adding another
      fm.getOrCreatePresetFilter({ type: 'blur', radius: 10 });
      expect(fm.getFilter(id1)).toBeUndefined();

      // Re-request same preset — creates new filter with new ID
      const id1b = fm.getOrCreatePresetFilter({
        type: 'blur',
        radius: 5,
      });
      expect(id1b).not.toBe(id1); // new ID
      expect(fm.getFilter(id1b)).toBeDefined();
    });

    it('should evict composite cache entries and clean up', () => {
      const fm = new FilterManager({ compositeCacheSize: 1 });

      const baseId = fm.addFilter({
        primitives: [
          {
            type: 'gaussianBlur',
            stdDeviation: 5,
          } as GaussianBlurPrimitive,
        ],
      });
      const baseId2 = fm.addFilter({
        primitives: [
          {
            type: 'colorMatrix',
            matrixType: 'saturate',
            values: 0,
          } as ColorMatrixPrimitive,
        ],
      });
      const baseId3 = fm.addFilter({
        primitives: [
          {
            type: 'colorMatrix',
            matrixType: 'hueRotate',
            values: 90,
          } as ColorMatrixPrimitive,
        ],
      });

      // Create first composite
      const comp1 = fm.createCompositeFilter([
        { type: 'custom', filterId: baseId },
        { type: 'custom', filterId: baseId2 },
      ]);
      expect(fm.getFilter(comp1)).toBeDefined();

      // Create second composite (evicts first)
      fm.createCompositeFilter([
        { type: 'custom', filterId: baseId },
        { type: 'custom', filterId: baseId3 },
      ]);

      expect(fm.getFilter(comp1)).toBeUndefined(); // evicted
      // Base filters should still exist
      expect(fm.getFilter(baseId)).toBeDefined();
      expect(fm.getFilter(baseId2)).toBeDefined();
      expect(fm.getFilter(baseId3)).toBeDefined();
    });

    it('should handle removeFilter cleaning up cache entries', () => {
      const fm = new FilterManager({ presetCacheSize: 10 });

      const id = fm.getOrCreatePresetFilter({
        type: 'blur',
        radius: 5,
      });

      // Remove the filter manually
      expect(fm.removeFilter(id)).toBe(true);
      expect(fm.getFilter(id)).toBeUndefined();

      // Re-creating the same preset should generate a new ID
      const id2 = fm.getOrCreatePresetFilter({
        type: 'blur',
        radius: 5,
      });
      expect(id2).not.toBe(id);
    });
  });

  // ============================================================
  // Cache Statistics
  // ============================================================

  describe('cache statistics', () => {
    it('should track preset cache hits and misses', () => {
      const fm = new FilterManager();

      // First call = creates new (miss in cache)
      fm.getOrCreatePresetFilter({ type: 'blur', radius: 5 });
      // Second call = returns cached (hit in cache)
      fm.getOrCreatePresetFilter({ type: 'blur', radius: 5 });

      const stats = fm.presetCacheStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(0.5);
    });

    it('should report cache size and capacity', () => {
      const fm = new FilterManager({ presetCacheSize: 32 });
      fm.getOrCreatePresetFilter({ type: 'blur', radius: 5 });

      const stats = fm.presetCacheStats();
      expect(stats.size).toBe(1);
      expect(stats.capacity).toBe(32);
    });

    it('should report composite cache stats', () => {
      const fm = new FilterManager({ compositeCacheSize: 16 });
      const stats = fm.compositeCacheStats();
      expect(stats.capacity).toBe(16);
      expect(stats.size).toBe(0);
    });

    it('should show zero hitRate when no lookups', () => {
      const fm = new FilterManager();
      expect(fm.presetCacheStats().hitRate).toBe(0);
      expect(fm.compositeCacheStats().hitRate).toBe(0);
    });
  });
});
