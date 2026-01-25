/**
 * Generic LRU (Least Recently Used) cache implementation
 *
 * Uses JavaScript Map insertion-order semantics for O(1) LRU operations.
 * The least recently used entry is always first in iteration order.
 * Entries are moved to the most-recently-used position on get() and set().
 *
 * @packageDocumentation
 */

/**
 * Configuration options for LRUCache
 */
export interface LRUCacheOptions<K, V> {
  /** Maximum number of entries the cache can hold (must be >= 1) */
  maxSize: number;
  /**
   * Callback invoked when an entry is automatically evicted
   * due to the cache exceeding its maximum size.
   * NOT called on manual delete() or clear().
   */
  onEvict?: (key: K, value: V) => void;
}

/**
 * Cache performance statistics
 */
export interface CacheStats {
  /** Current number of entries in the cache */
  size: number;
  /** Maximum capacity of the cache */
  capacity: number;
  /** Number of successful get() lookups */
  hits: number;
  /** Number of unsuccessful get() lookups */
  misses: number;
  /** Ratio of hits to total lookups (0 if no lookups performed) */
  hitRate: number;
}

/**
 * A generic Least Recently Used (LRU) cache.
 *
 * Provides a Map-compatible API subset with automatic eviction of the
 * least recently used entry when the cache exceeds its configured
 * maximum size. Tracks hit/miss statistics for monitoring.
 *
 * @example
 * ```typescript
 * const cache = new LRUCache<string, number>({ maxSize: 100 });
 * cache.set('a', 1);
 * cache.get('a'); // 1 (moves 'a' to most-recently-used)
 * ```
 */
export class LRUCache<K, V> {
  private readonly _map = new Map<K, V>();
  private readonly _maxSize: number;
  private readonly _onEvict: ((key: K, value: V) => void) | undefined;
  private _hits = 0;
  private _misses = 0;

  /**
   * Creates a new LRUCache instance
   *
   * @param options - Cache configuration
   * @throws Error if maxSize is less than 1
   *
   * @example
   * ```typescript
   * const cache = new LRUCache<string, string>({
   *   maxSize: 128,
   *   onEvict: (key, value) => console.log(`Evicted: ${key}`),
   * });
   * ```
   */
  constructor(options: LRUCacheOptions<K, V>) {
    const maxSize = Math.floor(options.maxSize);
    if (maxSize < 1) {
      throw new Error('LRUCache maxSize must be at least 1');
    }
    this._maxSize = maxSize;
    this._onEvict = options.onEvict;
  }

  /**
   * Gets a value by key, updating its position to most-recently-used.
   * Tracks hits and misses for statistics.
   *
   * @param key - The key to look up
   * @returns The value if found, undefined otherwise
   */
  get(key: K): V | undefined {
    if (!this._map.has(key)) {
      this._misses++;
      return undefined;
    }
    this._hits++;
    const value = this._map.get(key) as V;
    // Delete and re-insert to move to MRU position
    this._map.delete(key);
    this._map.set(key, value);
    return value;
  }

  /**
   * Sets a key-value pair, moving it to most-recently-used position.
   * If the cache exceeds maxSize, the least recently used entry is
   * evicted and the onEvict callback is invoked (if configured).
   *
   * @param key - The key to set
   * @param value - The value to store
   * @returns This cache instance for chaining
   */
  set(key: K, value: V): this {
    // If key already exists, delete first to prepare for re-insert at MRU
    if (this._map.has(key)) {
      this._map.delete(key);
    } else if (this._map.size >= this._maxSize) {
      // Evict the LRU entry (first in iteration order)
      const first = this._map.entries().next();
      if (first.done !== true) {
        const [evictKey, evictValue] = first.value;
        this._map.delete(evictKey);
        this._onEvict?.(evictKey, evictValue);
      }
    }
    this._map.set(key, value);
    return this;
  }

  /**
   * Checks whether a key exists in the cache.
   * Does NOT update LRU order or affect statistics.
   *
   * @param key - The key to check
   * @returns true if the key exists
   */
  has(key: K): boolean {
    return this._map.has(key);
  }

  /**
   * Deletes a key from the cache.
   * Does NOT invoke the onEvict callback.
   *
   * @param key - The key to delete
   * @returns true if the key was found and deleted
   */
  delete(key: K): boolean {
    return this._map.delete(key);
  }

  /**
   * Removes all entries from the cache.
   * Does NOT invoke the onEvict callback or reset statistics.
   */
  clear(): void {
    this._map.clear();
  }

  /** Current number of entries in the cache */
  get size(): number {
    return this._map.size;
  }

  /** Maximum capacity of the cache */
  get capacity(): number {
    return this._maxSize;
  }

  /**
   * Returns cache performance statistics
   *
   * @returns Statistics including size, capacity, hits, misses, and hit rate
   *
   * @example
   * ```typescript
   * const s = cache.stats();
   * console.log(`Hit rate: ${(s.hitRate * 100).toFixed(1)}%`);
   * ```
   */
  stats(): CacheStats {
    const total = this._hits + this._misses;
    return {
      size: this._map.size,
      capacity: this._maxSize,
      hits: this._hits,
      misses: this._misses,
      hitRate: total > 0 ? this._hits / total : 0,
    };
  }

  /**
   * Resets hit/miss counters to zero without clearing cached data
   */
  resetStats(): void {
    this._hits = 0;
    this._misses = 0;
  }

  /**
   * Iterates over all cache entries in insertion/access order
   * (least recently used first).
   */
  [Symbol.iterator](): IterableIterator<[K, V]> {
    return this._map[Symbol.iterator]();
  }

  /**
   * Calls the provided callback for each entry in the cache
   *
   * @param callback - Function called with (value, key) for each entry
   */
  forEach(callback: (value: V, key: K) => void): void {
    this._map.forEach(callback);
  }
}
