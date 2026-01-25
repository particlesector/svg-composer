/**
 * Filter Manager for SVG Composer
 *
 * Manages filter definitions and converts effect presets to SVG filter primitives.
 */

import { LRUCache } from '../utils/LRUCache.js';
import type { CacheStats } from '../utils/LRUCache.js';
import { generateId } from '../utils/IdGenerator.js';
import type {
  FilterDefinition,
  FilterPrimitive,
  EffectPreset,
  GaussianBlurPrimitive,
  DropShadowPrimitive,
  ColorMatrixPrimitive,
  ComponentTransferPrimitive,
  MorphologyPrimitive,
  MergePrimitive,
  OffsetPrimitive,
  FloodPrimitive,
  CompositePrimitive,
  TurbulencePrimitive,
  BlendPrimitive,
  ConvolveMatrixPrimitive,
  TransferFunction,
  ElementFilter,
} from './types.js';

/**
 * Configuration options for FilterManager
 */
export interface FilterManagerOptions {
  /** Maximum number of entries in the preset filter cache (default: 128) */
  presetCacheSize?: number;
  /** Maximum number of entries in the composite filter cache (default: 64) */
  compositeCacheSize?: number;
}

/** Default preset cache size */
const DEFAULT_PRESET_CACHE_SIZE = 128;

/** Default composite cache size */
const DEFAULT_COMPOSITE_CACHE_SIZE = 64;

/**
 * Manages filter definitions and effect preset conversion.
 *
 * Uses LRU caches for preset and composite filters to limit memory usage.
 * When a cache entry is evicted, its corresponding filter definition is
 * automatically cleaned up.
 */
export class FilterManager {
  /** Map of filter IDs to filter definitions */
  private readonly _filters = new Map<string, FilterDefinition>();

  /** LRU cache of effect preset keys to generated filter IDs */
  private readonly _presetCache: LRUCache<string, string>;

  /** LRU cache of composite filter keys to generated filter IDs */
  private readonly _compositeCache: LRUCache<string, string>;

  /**
   * Creates a new FilterManager instance
   *
   * @param options - Optional configuration for cache sizes
   *
   * @example
   * ```typescript
   * const fm = new FilterManager({ presetCacheSize: 256 });
   * ```
   */
  constructor(options: FilterManagerOptions = {}) {
    const presetSize = options.presetCacheSize ?? DEFAULT_PRESET_CACHE_SIZE;
    const compositeSize = options.compositeCacheSize ?? DEFAULT_COMPOSITE_CACHE_SIZE;

    this._presetCache = new LRUCache<string, string>({
      maxSize: presetSize,
      onEvict: (_key: string, filterId: string): void => {
        this._filters.delete(filterId);
      },
    });

    this._compositeCache = new LRUCache<string, string>({
      maxSize: compositeSize,
      onEvict: (_key: string, filterId: string): void => {
        this._filters.delete(filterId);
      },
    });
  }

  // ============================================================
  // Filter Management
  // ============================================================

  /**
   * Adds a custom filter definition
   *
   * @param filter - Filter definition without ID
   * @returns The generated filter ID
   */
  addFilter(filter: Omit<FilterDefinition, 'id'>): string {
    const id = `filter-${generateId()}`;
    const fullFilter: FilterDefinition = { ...filter, id };
    this._filters.set(id, fullFilter);
    return id;
  }

  /**
   * Adds a filter with a specific ID
   *
   * @param filter - Complete filter definition
   */
  addFilterWithId(filter: FilterDefinition): void {
    this._filters.set(filter.id, filter);
  }

  /**
   * Gets a filter by ID
   *
   * @param id - Filter ID
   * @returns Filter definition or undefined
   */
  getFilter(id: string): FilterDefinition | undefined {
    return this._filters.get(id);
  }

  /**
   * Gets all filters
   *
   * @returns Array of all filter definitions
   */
  getAllFilters(): FilterDefinition[] {
    return Array.from(this._filters.values());
  }

  /**
   * Removes a filter by ID
   *
   * @param id - Filter ID to remove
   * @returns true if filter was removed, false if not found
   */
  removeFilter(id: string): boolean {
    // Also remove from preset cache if present
    for (const [key, cachedId] of this._presetCache) {
      if (cachedId === id) {
        this._presetCache.delete(key);
        break;
      }
    }
    // Also remove from composite cache if present
    for (const [key, cachedId] of this._compositeCache) {
      if (cachedId === id) {
        this._compositeCache.delete(key);
        break;
      }
    }
    return this._filters.delete(id);
  }

  /**
   * Updates a filter definition
   *
   * @param id - Filter ID to update
   * @param updates - Partial filter properties to update
   * @returns true if filter was updated, false if not found
   */
  updateFilter(id: string, updates: Partial<Omit<FilterDefinition, 'id'>>): boolean {
    const existing = this._filters.get(id);
    if (!existing) {
      return false;
    }

    const updated: FilterDefinition = {
      ...existing,
      ...updates,
      id, // Ensure ID cannot be changed
    };
    this._filters.set(id, updated);
    return true;
  }

  /**
   * Clears all filters
   */
  clearFilters(): void {
    this._filters.clear();
    this._presetCache.clear();
    this._compositeCache.clear();
  }

  /**
   * Creates a snapshot of all filters for serialization
   */
  snapshot(): Map<string, FilterDefinition> {
    return new Map(this._filters);
  }

  /**
   * Restores filters from a snapshot
   */
  restore(filters: Map<string, FilterDefinition>): void {
    this._filters.clear();
    this._presetCache.clear();
    this._compositeCache.clear();
    for (const [id, filter] of filters) {
      this._filters.set(id, filter);
    }
  }

  // ============================================================
  // Cache Statistics
  // ============================================================

  /**
   * Returns statistics for the preset filter cache
   *
   * @returns Cache performance statistics including size, capacity,
   *   hits, misses, and hit rate
   *
   * @example
   * ```typescript
   * const stats = filterManager.presetCacheStats();
   * console.log(`Hit rate: ${(stats.hitRate * 100).toFixed(1)}%`);
   * ```
   */
  presetCacheStats(): CacheStats {
    return this._presetCache.stats();
  }

  /**
   * Returns statistics for the composite filter cache
   *
   * @returns Cache performance statistics including size, capacity,
   *   hits, misses, and hit rate
   *
   * @example
   * ```typescript
   * const stats = filterManager.compositeCacheStats();
   * console.log(`Entries: ${stats.size}/${stats.capacity}`);
   * ```
   */
  compositeCacheStats(): CacheStats {
    return this._compositeCache.stats();
  }

  // ============================================================
  // Effect Preset Conversion
  // ============================================================

  /**
   * Gets or creates a filter for an effect preset.
   * Uses caching to avoid creating duplicate filters for identical presets.
   *
   * @param preset - Effect preset to convert
   * @returns Filter ID
   */
  getOrCreatePresetFilter(preset: EffectPreset): string {
    // Create a cache key from the preset
    const cacheKey = this._getPresetCacheKey(preset);

    // Check cache first - use has() to avoid inflating stats on stale entries
    if (this._presetCache.has(cacheKey)) {
      const cached = this._presetCache.get(cacheKey);
      if (cached !== undefined && this._filters.has(cached)) {
        return cached;
      }
    }

    // Create new filter from preset
    const filter = this.effectToFilter(preset);
    this._filters.set(filter.id, filter);
    this._presetCache.set(cacheKey, filter.id);

    return filter.id;
  }

  /**
   * Resolves an ElementFilter to a filter ID
   *
   * @param elementFilter - Element filter reference
   * @returns Filter ID
   */
  resolveElementFilter(elementFilter: ElementFilter): string {
    if (elementFilter.type === 'custom') {
      return elementFilter.filterId;
    }
    return this.getOrCreatePresetFilter(elementFilter.effect);
  }

  /**
   * Creates a composite filter that chains multiple element filters together.
   * Each filter's output feeds into the next filter's input, producing a
   * single SVG filter definition with all primitives properly connected.
   *
   * Uses caching to avoid creating duplicate composite filters.
   *
   * Element filters that reference non-existent filter IDs are silently
   * skipped. If all filters are invalid, an error is thrown. If only one
   * valid filter remains after skipping, its ID is returned directly
   * without creating a composite.
   *
   * @param elementFilters - Array of element filters to chain (must be non-empty)
   * @returns Filter ID of the composite filter (or the single resolved filter)
   * @throws Error if the array is empty or no valid filter definitions are found
   */
  createCompositeFilter(elementFilters: ElementFilter[]): string {
    if (elementFilters.length === 0) {
      throw new Error('Cannot create composite filter from empty filter list');
    }

    if (elementFilters.length === 1) {
      const first = elementFilters[0];
      if (first === undefined) {
        throw new Error('Cannot create composite filter from empty filter list');
      }
      return this.resolveElementFilter(first);
    }

    // Check composite cache - use has() to avoid inflating stats on stale entries
    const cacheKey = this._getCompositeCacheKey(elementFilters);
    if (this._compositeCache.has(cacheKey)) {
      const cached = this._compositeCache.get(cacheKey);
      if (cached !== undefined && this._filters.has(cached)) {
        return cached;
      }
    }

    // Resolve each element filter to its filter definition
    const filterDefs: FilterDefinition[] = [];
    for (const ef of elementFilters) {
      const filterId = this.resolveElementFilter(ef);
      const filterDef = this._filters.get(filterId);
      if (filterDef) {
        filterDefs.push(filterDef);
      }
    }

    if (filterDefs.length === 0) {
      throw new Error('No valid filter definitions found for composite filter');
    }

    if (filterDefs.length === 1) {
      const onlyDef = filterDefs[0];
      if (onlyDef === undefined) {
        throw new Error('No valid filter definitions found for composite filter');
      }
      return onlyDef.id;
    }

    // Chain all filter primitives together
    const chainedPrimitives = this._chainFilterPrimitives(filterDefs);

    // Compute the union filter region
    const region = this._computeUnionRegion(filterDefs);

    // Create the composite filter definition
    const id = `filter-composite-${generateId()}`;
    const compositeFilter: FilterDefinition = {
      id,
      primitives: chainedPrimitives,
      ...region,
      colorInterpolationFilters: 'sRGB',
    };

    this._filters.set(id, compositeFilter);
    this._compositeCache.set(cacheKey, id);

    return id;
  }

  /**
   * Chains primitives from multiple filters, rewriting in/result references
   * so each filter's output feeds into the next filter's input.
   */
  private _chainFilterPrimitives(filterDefs: FilterDefinition[]): FilterPrimitive[] {
    const allPrimitives: FilterPrimitive[] = [];
    const filterCount = filterDefs.length;

    for (let i = 0; i < filterCount; i++) {
      const filterDef = filterDefs[i];
      if (filterDef === undefined) {
        continue;
      }
      const isLast = i === filterCount - 1;
      const chainInputName = i > 0 ? `_chain${String(i - 1)}` : null;
      const chainOutputName = `_chain${String(i)}`;
      const prefix = `_f${String(i)}_`;

      // Deep clone primitives to avoid mutating originals
      const primitives = this._clonePrimitives(filterDef.primitives);

      // Step 1: Prefix all internal result names to avoid collisions between filters
      this._prefixInternalNames(primitives, prefix);

      // Step 2: Replace SourceGraphic references with previous chain output
      if (chainInputName !== null) {
        this._replaceSourceGraphic(primitives, chainInputName);
      }

      // Step 3: Set chain output on last primitive (for non-last filters)
      if (!isLast && primitives.length > 0) {
        const lastPrimitive = primitives[primitives.length - 1];
        if (lastPrimitive !== undefined) {
          lastPrimitive.result = chainOutputName;
        }
      }

      allPrimitives.push(...primitives);
    }

    return allPrimitives;
  }

  /**
   * Deep clones an array of filter primitives
   */
  private _clonePrimitives(primitives: FilterPrimitive[]): FilterPrimitive[] {
    return primitives.map((p) => this._clonePrimitive(p));
  }

  /**
   * Deep clones a single filter primitive
   */
  private _clonePrimitive(p: FilterPrimitive): FilterPrimitive {
    if (p.type === 'merge') {
      return {
        ...p,
        nodes: p.nodes.map((n) => ({ ...n })),
      };
    }
    if (p.type === 'componentTransfer') {
      const clone: ComponentTransferPrimitive = { ...p };
      if (p.funcR) {
        clone.funcR = { ...p.funcR };
      }
      if (p.funcG) {
        clone.funcG = { ...p.funcG };
      }
      if (p.funcB) {
        clone.funcB = { ...p.funcB };
      }
      if (p.funcA) {
        clone.funcA = { ...p.funcA };
      }
      return clone;
    }
    if (p.type === 'convolveMatrix') {
      return {
        ...p,
        kernelMatrix: [...p.kernelMatrix],
        order: [...p.order] as [number, number],
      };
    }
    // For other primitives, shallow clone is sufficient
    return { ...p };
  }

  private static readonly _SOURCE_NAMES = new Set([
    'SourceGraphic',
    'SourceAlpha',
    'BackgroundImage',
    'BackgroundAlpha',
    'FillPaint',
    'StrokePaint',
  ]);

  /**
   * Checks if a name is a built-in SVG filter input source
   */
  private _isBuiltinSource(name: string): boolean {
    return FilterManager._SOURCE_NAMES.has(name);
  }

  /**
   * Prefixes all internal (non-builtin) result and in/in2 names in primitives
   * to avoid collisions when combining filters.
   */
  private _prefixInternalNames(primitives: FilterPrimitive[], prefix: string): void {
    // Collect all internal result names first
    const internalNames = new Set<string>();
    for (const p of primitives) {
      if (p.result !== undefined && p.result.length > 0 && !this._isBuiltinSource(p.result)) {
        internalNames.add(p.result);
      }
    }

    // Now rewrite all references
    for (const p of primitives) {
      // Rewrite result
      if (p.result !== undefined && p.result.length > 0 && internalNames.has(p.result)) {
        p.result = prefix + p.result;
      }

      // Rewrite in
      if (p.in !== undefined && p.in.length > 0 && internalNames.has(p.in)) {
        p.in = prefix + p.in;
      }

      // Rewrite in2 for composite, blend, displacement
      const withIn2 = p as { in2?: string };
      if (withIn2.in2 !== undefined && withIn2.in2.length > 0 && internalNames.has(withIn2.in2)) {
        withIn2.in2 = prefix + withIn2.in2;
      }

      // Rewrite merge node in references
      if (p.type === 'merge') {
        for (const node of p.nodes) {
          if (node.in.length > 0 && internalNames.has(node.in)) {
            node.in = prefix + node.in;
          }
        }
      }
    }
  }

  /**
   * Replaces SourceGraphic references with a named input from the previous chain.
   * SourceAlpha is kept as-is since it refers to the original element's alpha channel.
   */
  private _replaceSourceGraphic(primitives: FilterPrimitive[], chainInput: string): void {
    for (const p of primitives) {
      // Replace in
      if (p.in === 'SourceGraphic') {
        p.in = chainInput;
      }

      // Replace in2 for composite, blend, displacement
      const withIn2 = p as { in2?: string };
      if (withIn2.in2 === 'SourceGraphic') {
        withIn2.in2 = chainInput;
      }

      // Replace merge node references
      if (p.type === 'merge') {
        for (const node of p.nodes) {
          if (node.in === 'SourceGraphic') {
            node.in = chainInput;
          }
        }
      }
    }
  }

  /**
   * Computes the union of filter regions from multiple filter definitions.
   * Calculates the bounding box that encompasses all individual filter regions.
   */
  private _computeUnionRegion(
    filterDefs: FilterDefinition[],
  ): Pick<FilterDefinition, 'x' | 'y' | 'width' | 'height'> {
    let minX = 0;
    let minY = 0;
    let maxRight = 100;
    let maxBottom = 100;

    for (const def of filterDefs) {
      const x = this._parsePercentage(def.x, 0);
      const y = this._parsePercentage(def.y, 0);
      const w = this._parsePercentage(def.width, 100);
      const h = this._parsePercentage(def.height, 100);

      const right = x + w;
      const bottom = y + h;

      if (x < minX) {
        minX = x;
      }
      if (y < minY) {
        minY = y;
      }
      if (right > maxRight) {
        maxRight = right;
      }
      if (bottom > maxBottom) {
        maxBottom = bottom;
      }
    }

    return {
      x: `${String(minX)}%`,
      y: `${String(minY)}%`,
      width: `${String(maxRight - minX)}%`,
      height: `${String(maxBottom - minY)}%`,
    };
  }

  /**
   * Parses a percentage string or number to a numeric value
   */
  private _parsePercentage(value: string | number | undefined, defaultValue: number): number {
    if (value === undefined) {
      return defaultValue;
    }
    if (typeof value === 'number') {
      return value;
    }
    const match = /^(-?\d+(?:\.\d+)?)%$/.exec(value);
    if (match?.[1] !== undefined) {
      return parseFloat(match[1]);
    }
    return defaultValue;
  }

  /**
   * Creates a deterministic cache key for a composite filter.
   * Uses resolved filter IDs to avoid JSON property ordering sensitivity.
   */
  private _getCompositeCacheKey(elementFilters: ElementFilter[]): string {
    const ids = elementFilters.map((ef) => this.resolveElementFilter(ef));
    return `composite:${ids.join('+')}`;
  }

  /**
   * Converts an effect preset to a filter definition
   *
   * @param preset - Effect preset to convert
   * @returns Complete filter definition
   */
  effectToFilter(preset: EffectPreset): FilterDefinition {
    const id = `filter-${generateId()}`;
    const primitives = this._presetToPrimitives(preset);

    // Determine filter region based on effect type
    const region = this._getFilterRegion(preset);

    return {
      id,
      primitives,
      ...region,
      colorInterpolationFilters: 'sRGB',
    };
  }

  /**
   * Creates a cache key for a preset
   */
  private _getPresetCacheKey(preset: EffectPreset): string {
    return JSON.stringify(preset);
  }

  /**
   * Determines appropriate filter region for an effect
   */
  private _getFilterRegion(
    preset: EffectPreset,
  ): Pick<FilterDefinition, 'x' | 'y' | 'width' | 'height'> {
    // Effects that extend beyond the element bounds need larger filter regions
    switch (preset.type) {
      case 'blur': {
        const padding = Math.ceil(preset.radius * 3);
        return {
          x: `-${String(padding)}%`,
          y: `-${String(padding)}%`,
          width: `${String(100 + padding * 2)}%`,
          height: `${String(100 + padding * 2)}%`,
        };
      }
      case 'dropShadow': {
        const maxOffset = Math.max(Math.abs(preset.offsetX), Math.abs(preset.offsetY));
        const padding = Math.ceil(preset.blur * 3) + maxOffset;
        return {
          x: `-${String(padding)}%`,
          y: `-${String(padding)}%`,
          width: `${String(100 + padding * 2)}%`,
          height: `${String(100 + padding * 2)}%`,
        };
      }
      case 'glow': {
        const padding = Math.ceil(preset.radius * 3);
        return {
          x: `-${String(padding)}%`,
          y: `-${String(padding)}%`,
          width: `${String(100 + padding * 2)}%`,
          height: `${String(100 + padding * 2)}%`,
        };
      }
      case 'outline': {
        const padding = Math.ceil(preset.width * 2);
        return {
          x: `-${String(padding)}%`,
          y: `-${String(padding)}%`,
          width: `${String(100 + padding * 2)}%`,
          height: `${String(100 + padding * 2)}%`,
        };
      }
      default:
        // Most effects don't need extra space
        return {
          x: '0%',
          y: '0%',
          width: '100%',
          height: '100%',
        };
    }
  }

  /**
   * Converts an effect preset to filter primitives
   */
  private _presetToPrimitives(preset: EffectPreset): FilterPrimitive[] {
    switch (preset.type) {
      case 'blur':
        return this._createBlurPrimitives(preset.radius);

      case 'dropShadow':
        return this._createDropShadowPrimitives(
          preset.offsetX,
          preset.offsetY,
          preset.blur,
          preset.color,
          preset.opacity ?? 1,
        );

      case 'innerShadow':
        return this._createInnerShadowPrimitives(
          preset.offsetX,
          preset.offsetY,
          preset.blur,
          preset.color,
          preset.opacity ?? 1,
        );

      case 'glow':
        return this._createGlowPrimitives(
          preset.radius,
          preset.color,
          preset.opacity ?? 1,
          preset.inner ?? false,
        );

      case 'grayscale':
        return this._createGrayscalePrimitives(preset.amount ?? 1);

      case 'sepia':
        return this._createSepiaPrimitives(preset.amount ?? 1);

      case 'saturate':
        return this._createSaturatePrimitives(preset.amount);

      case 'hueRotate':
        return this._createHueRotatePrimitives(preset.angle);

      case 'brightness':
        return this._createBrightnessPrimitives(preset.amount);

      case 'contrast':
        return this._createContrastPrimitives(preset.amount);

      case 'invert':
        return this._createInvertPrimitives(preset.amount ?? 1);

      case 'sharpen':
        return this._createSharpenPrimitives(preset.amount);

      case 'emboss':
        return this._createEmbossPrimitives(preset.strength ?? 1, preset.angle ?? 135);

      case 'noise':
        return this._createNoisePrimitives(
          preset.intensity,
          preset.noiseType ?? 'turbulence',
          preset.frequency ?? 0.05,
        );

      case 'outline':
        return this._createOutlinePrimitives(preset.width, preset.color);

      case 'brightnessContrast':
        return this._createBrightnessContrastPrimitives(preset.brightness, preset.contrast);

      case 'vintage':
        return this._createVintagePrimitives(preset.intensity ?? 1);

      case 'duotone':
        return this._createDuotonePrimitives(preset.shadowColor, preset.highlightColor);

      default:
        return [];
    }
  }

  // ============================================================
  // Primitive Creation Methods
  // ============================================================

  private _createBlurPrimitives(radius: number): FilterPrimitive[] {
    const blur: GaussianBlurPrimitive = {
      type: 'gaussianBlur',
      stdDeviation: radius,
      in: 'SourceGraphic',
    };
    return [blur];
  }

  private _createDropShadowPrimitives(
    dx: number,
    dy: number,
    blur: number,
    color: string,
    opacity: number,
  ): FilterPrimitive[] {
    const dropShadow: DropShadowPrimitive = {
      type: 'dropShadow',
      dx,
      dy,
      stdDeviation: blur,
      floodColor: color,
      floodOpacity: opacity,
      in: 'SourceGraphic',
    };
    return [dropShadow];
  }

  private _createInnerShadowPrimitives(
    dx: number,
    dy: number,
    blur: number,
    color: string,
    opacity: number,
  ): FilterPrimitive[] {
    // Inner shadow is created by:
    // 1. Blur the source alpha
    // 2. Offset it
    // 3. Invert it (composite out with source alpha)
    // 4. Colorize with flood
    // 5. Clip to source alpha
    // 6. Merge with source graphic

    const primitives: FilterPrimitive[] = [
      // Create blur of source alpha, offset it
      {
        type: 'offset',
        dx,
        dy,
        in: 'SourceAlpha',
        result: 'offsetBlur',
      } as OffsetPrimitive,
      {
        type: 'gaussianBlur',
        stdDeviation: blur,
        in: 'offsetBlur',
        result: 'blurred',
      } as GaussianBlurPrimitive,
      // Invert by subtracting from source alpha
      {
        type: 'composite',
        operator: 'out',
        in: 'SourceAlpha',
        in2: 'blurred',
        result: 'invertedBlur',
      } as CompositePrimitive,
      // Colorize with flood
      {
        type: 'flood',
        floodColor: color,
        floodOpacity: opacity,
        result: 'color',
      } as FloodPrimitive,
      // Clip color to inverted blur
      {
        type: 'composite',
        operator: 'in',
        in: 'color',
        in2: 'invertedBlur',
        result: 'shadow',
      } as CompositePrimitive,
      // Merge shadow with original
      {
        type: 'merge',
        nodes: [{ in: 'SourceGraphic' }, { in: 'shadow' }],
      } as MergePrimitive,
    ];

    return primitives;
  }

  private _createGlowPrimitives(
    radius: number,
    color: string,
    opacity: number,
    inner: boolean,
  ): FilterPrimitive[] {
    if (inner) {
      // Inner glow: similar to inner shadow but centered
      return this._createInnerShadowPrimitives(0, 0, radius, color, opacity);
    }

    // Outer glow: blur source alpha, colorize, merge behind source
    const primitives: FilterPrimitive[] = [
      {
        type: 'gaussianBlur',
        stdDeviation: radius,
        in: 'SourceAlpha',
        result: 'blur',
      } as GaussianBlurPrimitive,
      {
        type: 'flood',
        floodColor: color,
        floodOpacity: opacity,
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
    ];

    return primitives;
  }

  private _createGrayscalePrimitives(amount: number): FilterPrimitive[] {
    // Grayscale using luminance coefficients
    // Interpolate between identity and grayscale matrix
    const r = 0.2126;
    const g = 0.7152;
    const b = 0.0722;

    const matrix: ColorMatrixPrimitive = {
      type: 'colorMatrix',
      matrixType: 'matrix',
      in: 'SourceGraphic',
      values: [
        r + (1 - r) * (1 - amount),
        g * amount,
        b * amount,
        0,
        0,
        r * amount,
        g + (1 - g) * (1 - amount),
        b * amount,
        0,
        0,
        r * amount,
        g * amount,
        b + (1 - b) * (1 - amount),
        0,
        0,
        0,
        0,
        0,
        1,
        0,
      ],
    };
    return [matrix];
  }

  private _createSepiaPrimitives(amount: number): FilterPrimitive[] {
    // Sepia tone matrix (interpolated with identity based on amount)
    const matrix: ColorMatrixPrimitive = {
      type: 'colorMatrix',
      matrixType: 'matrix',
      in: 'SourceGraphic',
      values: [
        0.393 + 0.607 * (1 - amount),
        0.769 * amount,
        0.189 * amount,
        0,
        0,
        0.349 * amount,
        0.686 + 0.314 * (1 - amount),
        0.168 * amount,
        0,
        0,
        0.272 * amount,
        0.534 * amount,
        0.131 + 0.869 * (1 - amount),
        0,
        0,
        0,
        0,
        0,
        1,
        0,
      ],
    };
    return [matrix];
  }

  private _createSaturatePrimitives(amount: number): FilterPrimitive[] {
    const saturate: ColorMatrixPrimitive = {
      type: 'colorMatrix',
      matrixType: 'saturate',
      in: 'SourceGraphic',
      values: amount,
    };
    return [saturate];
  }

  private _createHueRotatePrimitives(angle: number): FilterPrimitive[] {
    const hueRotate: ColorMatrixPrimitive = {
      type: 'colorMatrix',
      matrixType: 'hueRotate',
      in: 'SourceGraphic',
      values: angle,
    };
    return [hueRotate];
  }

  private _createBrightnessPrimitives(amount: number): FilterPrimitive[] {
    // Brightness via component transfer with linear function
    const linearFunc: TransferFunction = {
      type: 'linear',
      slope: amount,
      intercept: 0,
    };

    const transfer: ComponentTransferPrimitive = {
      type: 'componentTransfer',
      in: 'SourceGraphic',
      funcR: linearFunc,
      funcG: linearFunc,
      funcB: linearFunc,
    };
    return [transfer];
  }

  private _createContrastPrimitives(amount: number): FilterPrimitive[] {
    // Contrast via component transfer with linear function
    // intercept = 0.5 * (1 - amount) keeps midtones stable
    const linearFunc: TransferFunction = {
      type: 'linear',
      slope: amount,
      intercept: 0.5 * (1 - amount),
    };

    const transfer: ComponentTransferPrimitive = {
      type: 'componentTransfer',
      in: 'SourceGraphic',
      funcR: linearFunc,
      funcG: linearFunc,
      funcB: linearFunc,
    };
    return [transfer];
  }

  private _createInvertPrimitives(amount: number): FilterPrimitive[] {
    // Invert using table transfer function interpolated with identity
    // At amount=1: [1, 0] (fully inverted)
    // At amount=0: [0, 1] (identity)
    const tableFunc: TransferFunction = {
      type: 'table',
      tableValues: [amount, 1 - amount],
    };

    const transfer: ComponentTransferPrimitive = {
      type: 'componentTransfer',
      in: 'SourceGraphic',
      funcR: tableFunc,
      funcG: tableFunc,
      funcB: tableFunc,
    };
    return [transfer];
  }

  private _createSharpenPrimitives(amount: number): FilterPrimitive[] {
    // Sharpening using convolution matrix (unsharp mask)
    // Center value is 1 + 4 * amount, edges are -amount
    const center = 1 + 4 * amount;
    const edge = -amount;

    const convolve: ConvolveMatrixPrimitive = {
      type: 'convolveMatrix',
      in: 'SourceGraphic',
      order: [3, 3],
      kernelMatrix: [0, edge, 0, edge, center, edge, 0, edge, 0],
      preserveAlpha: true,
    };
    return [convolve];
  }

  private _createEmbossPrimitives(strength: number, angle: number): FilterPrimitive[] {
    // Convert angle to radians
    const rad = (angle * Math.PI) / 180;
    const dx = Math.cos(rad) * strength;
    const dy = Math.sin(rad) * strength;

    // Emboss kernel based on angle
    // This creates a 3x3 kernel that emphasizes edges from the specified direction
    const primitives: FilterPrimitive[] = [
      // First, convert to grayscale for better emboss effect
      {
        type: 'colorMatrix',
        matrixType: 'saturate',
        in: 'SourceGraphic',
        values: 0,
        result: 'gray',
      } as ColorMatrixPrimitive,
      // Apply emboss convolution
      {
        type: 'convolveMatrix',
        in: 'gray',
        order: [3, 3],
        kernelMatrix: [-1 * dx, -1 * dy, 0, -1 * dy, 1, 1 * dy, 0, 1 * dy, 1 * dx],
        divisor: 1,
        bias: 0.5, // Shift to mid-gray
        preserveAlpha: true,
        result: 'embossed',
      } as ConvolveMatrixPrimitive,
      // Blend with original to preserve some color
      {
        type: 'blend',
        mode: 'overlay',
        in: 'SourceGraphic',
        in2: 'embossed',
      } as BlendPrimitive,
    ];
    return primitives;
  }

  private _createNoisePrimitives(
    intensity: number,
    noiseType: 'fractal' | 'turbulence',
    frequency: number,
  ): FilterPrimitive[] {
    const primitives: FilterPrimitive[] = [
      // Generate noise pattern
      {
        type: 'turbulence',
        turbulenceType: noiseType === 'fractal' ? 'fractalNoise' : 'turbulence',
        baseFrequency: frequency,
        numOctaves: 4,
        seed: 0,
        result: 'noise',
      } as TurbulencePrimitive,
      // Convert noise to grayscale and adjust intensity
      {
        type: 'colorMatrix',
        matrixType: 'matrix',
        in: 'noise',
        values: [0, 0, 0, 0, 0.5, 0, 0, 0, 0, 0.5, 0, 0, 0, 0, 0.5, 0, 0, 0, intensity, 0],
        result: 'adjustedNoise',
      } as ColorMatrixPrimitive,
      // Blend noise with source
      {
        type: 'blend',
        mode: 'overlay',
        in: 'SourceGraphic',
        in2: 'adjustedNoise',
      } as BlendPrimitive,
    ];
    return primitives;
  }

  private _createOutlinePrimitives(width: number, color: string): FilterPrimitive[] {
    const primitives: FilterPrimitive[] = [
      // Dilate the source alpha to create outline
      {
        type: 'morphology',
        operator: 'dilate',
        radius: width,
        in: 'SourceAlpha',
        result: 'dilated',
      } as MorphologyPrimitive,
      // Colorize the dilated alpha
      {
        type: 'flood',
        floodColor: color,
        floodOpacity: 1,
        result: 'outlineColor',
      } as FloodPrimitive,
      // Clip color to dilated shape
      {
        type: 'composite',
        operator: 'in',
        in: 'outlineColor',
        in2: 'dilated',
        result: 'outline',
      } as CompositePrimitive,
      // Merge outline behind source
      {
        type: 'merge',
        nodes: [{ in: 'outline' }, { in: 'SourceGraphic' }],
      } as MergePrimitive,
    ];
    return primitives;
  }

  private _createBrightnessContrastPrimitives(
    brightness: number,
    contrast: number,
  ): FilterPrimitive[] {
    // Combined brightness and contrast in one transfer
    const slope = brightness * contrast;
    const intercept = 0.5 * (1 - contrast) + (brightness - 1) * 0.5;

    const linearFunc: TransferFunction = {
      type: 'linear',
      slope,
      intercept,
    };

    const transfer: ComponentTransferPrimitive = {
      type: 'componentTransfer',
      in: 'SourceGraphic',
      funcR: linearFunc,
      funcG: linearFunc,
      funcB: linearFunc,
    };
    return [transfer];
  }

  private _createVintagePrimitives(intensity: number): FilterPrimitive[] {
    // Vintage effect: sepia + vignette-like color shift + reduced saturation
    const primitives: FilterPrimitive[] = [
      // Reduce saturation
      {
        type: 'colorMatrix',
        matrixType: 'saturate',
        in: 'SourceGraphic',
        values: 1 - 0.3 * intensity,
        result: 'desaturated',
      } as ColorMatrixPrimitive,
      // Apply warm sepia-like toning
      {
        type: 'colorMatrix',
        matrixType: 'matrix',
        in: 'desaturated',
        values: [
          1 + 0.1 * intensity,
          0.05 * intensity,
          0,
          0,
          0.02 * intensity,
          0.05 * intensity,
          1,
          0.02 * intensity,
          0,
          0,
          0,
          0.02 * intensity,
          1 - 0.1 * intensity,
          0,
          -0.02 * intensity,
          0,
          0,
          0,
          1,
          0,
        ],
        result: 'toned',
      } as ColorMatrixPrimitive,
      // Add slight contrast boost
      {
        type: 'componentTransfer',
        in: 'toned',
        funcR: { type: 'linear', slope: 1 + 0.1 * intensity, intercept: -0.05 * intensity },
        funcG: { type: 'linear', slope: 1 + 0.1 * intensity, intercept: -0.05 * intensity },
        funcB: { type: 'linear', slope: 1 + 0.1 * intensity, intercept: -0.05 * intensity },
      } as ComponentTransferPrimitive,
    ];
    return primitives;
  }

  private _createDuotonePrimitives(shadowColor: string, highlightColor: string): FilterPrimitive[] {
    // Parse colors to RGB (simplified - assumes hex colors)
    const shadowRGB = this._parseColor(shadowColor);
    const highlightRGB = this._parseColor(highlightColor);

    const primitives: FilterPrimitive[] = [
      // Convert to grayscale first
      {
        type: 'colorMatrix',
        matrixType: 'saturate',
        in: 'SourceGraphic',
        values: 0,
        result: 'gray',
      } as ColorMatrixPrimitive,
      // Map grayscale to duotone using table transfer
      // Shadow color for dark values, highlight for light values
      {
        type: 'componentTransfer',
        in: 'gray',
        funcR: {
          type: 'table',
          tableValues: [shadowRGB.r / 255, highlightRGB.r / 255],
        },
        funcG: {
          type: 'table',
          tableValues: [shadowRGB.g / 255, highlightRGB.g / 255],
        },
        funcB: {
          type: 'table',
          tableValues: [shadowRGB.b / 255, highlightRGB.b / 255],
        },
      } as ComponentTransferPrimitive,
    ];
    return primitives;
  }

  /**
   * Parses a color string to RGB values
   */
  private _parseColor(color: string): { r: number; g: number; b: number } {
    // Handle hex colors
    if (color.startsWith('#')) {
      const hex = color.slice(1);
      if (hex.length === 3) {
        // Short hex (#RGB)
        const r = hex[0];
        const g = hex[1];
        const b = hex[2];
        if (r !== undefined && g !== undefined && b !== undefined) {
          return {
            r: parseInt(r + r, 16),
            g: parseInt(g + g, 16),
            b: parseInt(b + b, 16),
          };
        }
      } else if (hex.length === 6) {
        // Full hex (#RRGGBB)
        return {
          r: parseInt(hex.slice(0, 2), 16),
          g: parseInt(hex.slice(2, 4), 16),
          b: parseInt(hex.slice(4, 6), 16),
        };
      }
    }

    // Handle named colors (basic ones)
    const namedColors: Record<string, { r: number; g: number; b: number }> = {
      black: { r: 0, g: 0, b: 0 },
      white: { r: 255, g: 255, b: 255 },
      red: { r: 255, g: 0, b: 0 },
      green: { r: 0, g: 128, b: 0 },
      blue: { r: 0, g: 0, b: 255 },
      yellow: { r: 255, g: 255, b: 0 },
      cyan: { r: 0, g: 255, b: 255 },
      magenta: { r: 255, g: 0, b: 255 },
      orange: { r: 255, g: 165, b: 0 },
      purple: { r: 128, g: 0, b: 128 },
      pink: { r: 255, g: 192, b: 203 },
      brown: { r: 139, g: 69, b: 19 },
      gray: { r: 128, g: 128, b: 128 },
      grey: { r: 128, g: 128, b: 128 },
    };

    const named = namedColors[color.toLowerCase()];
    if (named) {
      return named;
    }

    // Handle rgb() format
    const rgbRegex = /rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/;
    const rgbMatch = rgbRegex.exec(color);
    const r = rgbMatch?.[1];
    const g = rgbMatch?.[2];
    const b = rgbMatch?.[3];
    if (r !== undefined && g !== undefined && b !== undefined) {
      return {
        r: parseInt(r, 10),
        g: parseInt(g, 10),
        b: parseInt(b, 10),
      };
    }

    // Default to black if parsing fails
    return { r: 0, g: 0, b: 0 };
  }
}
