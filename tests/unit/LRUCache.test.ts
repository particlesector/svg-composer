/**
 * LRUCache unit tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LRUCache } from '../../src/utils/LRUCache.js';
import type { CacheStats } from '../../src/utils/LRUCache.js';

describe('LRUCache', () => {
  // ============================================================
  // Constructor Validation
  // ============================================================

  describe('constructor', () => {
    it('should create a cache with the specified maxSize', () => {
      const cache = new LRUCache<string, number>({ maxSize: 10 });
      expect(cache.capacity).toBe(10);
      expect(cache.size).toBe(0);
    });

    it('should throw on maxSize of 0', () => {
      expect(() => new LRUCache({ maxSize: 0 })).toThrow(
        'LRUCache maxSize must be at least 1',
      );
    });

    it('should throw on negative maxSize', () => {
      expect(() => new LRUCache({ maxSize: -5 })).toThrow(
        'LRUCache maxSize must be at least 1',
      );
    });

    it('should floor fractional maxSize', () => {
      const cache = new LRUCache<string, number>({ maxSize: 3.7 });
      expect(cache.capacity).toBe(3);
    });

    it('should throw when fractional maxSize floors to 0', () => {
      expect(() => new LRUCache({ maxSize: 0.5 })).toThrow(
        'LRUCache maxSize must be at least 1',
      );
    });

    it('should accept maxSize of 1', () => {
      const cache = new LRUCache<string, number>({ maxSize: 1 });
      expect(cache.capacity).toBe(1);
    });
  });

  // ============================================================
  // Basic Operations
  // ============================================================

  describe('get and set', () => {
    let cache: LRUCache<string, number>;

    beforeEach(() => {
      cache = new LRUCache({ maxSize: 5 });
    });

    it('should set and get a value', () => {
      cache.set('a', 1);
      expect(cache.get('a')).toBe(1);
    });

    it('should return undefined for missing key', () => {
      expect(cache.get('missing')).toBeUndefined();
    });

    it('should overwrite existing key with new value', () => {
      cache.set('a', 1);
      cache.set('a', 2);
      expect(cache.get('a')).toBe(2);
    });

    it('should not increase size when overwriting', () => {
      cache.set('a', 1);
      cache.set('a', 2);
      expect(cache.size).toBe(1);
    });

    it('should support chaining on set', () => {
      const result = cache.set('a', 1).set('b', 2);
      expect(result).toBe(cache);
      expect(cache.size).toBe(2);
    });
  });

  describe('has', () => {
    it('should return true for existing key', () => {
      const cache = new LRUCache<string, number>({ maxSize: 5 });
      cache.set('a', 1);
      expect(cache.has('a')).toBe(true);
    });

    it('should return false for missing key', () => {
      const cache = new LRUCache<string, number>({ maxSize: 5 });
      expect(cache.has('missing')).toBe(false);
    });

    it('should not update LRU order', () => {
      const cache = new LRUCache<string, number>({ maxSize: 2 });
      cache.set('a', 1);
      cache.set('b', 2);

      // has() should NOT refresh 'a', so 'a' is still LRU
      cache.has('a');

      // Adding 'c' should evict 'a' (not 'b')
      cache.set('c', 3);
      expect(cache.has('a')).toBe(false);
      expect(cache.has('b')).toBe(true);
      expect(cache.has('c')).toBe(true);
    });
  });

  describe('delete', () => {
    it('should delete an existing key and return true', () => {
      const cache = new LRUCache<string, number>({ maxSize: 5 });
      cache.set('a', 1);
      expect(cache.delete('a')).toBe(true);
      expect(cache.has('a')).toBe(false);
      expect(cache.size).toBe(0);
    });

    it('should return false for missing key', () => {
      const cache = new LRUCache<string, number>({ maxSize: 5 });
      expect(cache.delete('missing')).toBe(false);
    });
  });

  describe('clear', () => {
    it('should remove all entries', () => {
      const cache = new LRUCache<string, number>({ maxSize: 5 });
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);
      cache.clear();
      expect(cache.size).toBe(0);
      expect(cache.get('a')).toBeUndefined();
    });
  });

  describe('size and capacity', () => {
    it('should track size correctly', () => {
      const cache = new LRUCache<string, number>({ maxSize: 10 });
      expect(cache.size).toBe(0);
      cache.set('a', 1);
      expect(cache.size).toBe(1);
      cache.set('b', 2);
      expect(cache.size).toBe(2);
      cache.delete('a');
      expect(cache.size).toBe(1);
    });

    it('should never exceed maxSize', () => {
      const cache = new LRUCache<string, number>({ maxSize: 3 });
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);
      cache.set('d', 4);
      cache.set('e', 5);
      expect(cache.size).toBe(3);
    });
  });

  // ============================================================
  // LRU Eviction Behavior
  // ============================================================

  describe('eviction', () => {
    it('should evict the least recently used entry', () => {
      const cache = new LRUCache<string, number>({ maxSize: 3 });
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);

      // 'a' is LRU, should be evicted
      cache.set('d', 4);
      expect(cache.has('a')).toBe(false);
      expect(cache.has('b')).toBe(true);
      expect(cache.has('c')).toBe(true);
      expect(cache.has('d')).toBe(true);
    });

    it('should evict correct entry after get() refreshes order', () => {
      const cache = new LRUCache<string, number>({ maxSize: 3 });
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);

      // Access 'a' to move it to MRU
      cache.get('a');

      // Now 'b' is LRU, should be evicted
      cache.set('d', 4);
      expect(cache.has('a')).toBe(true);
      expect(cache.has('b')).toBe(false);
      expect(cache.has('c')).toBe(true);
      expect(cache.has('d')).toBe(true);
    });

    it('should evict correct entry after set() refreshes order', () => {
      const cache = new LRUCache<string, number>({ maxSize: 3 });
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);

      // Update 'a' to move it to MRU
      cache.set('a', 10);

      // Now 'b' is LRU, should be evicted
      cache.set('d', 4);
      expect(cache.has('a')).toBe(true);
      expect(cache.get('a')).toBe(10);
      expect(cache.has('b')).toBe(false);
    });

    it('should handle multiple sequential evictions', () => {
      const cache = new LRUCache<string, number>({ maxSize: 2 });
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3); // evicts 'a'
      cache.set('d', 4); // evicts 'b'
      cache.set('e', 5); // evicts 'c'

      expect(cache.has('a')).toBe(false);
      expect(cache.has('b')).toBe(false);
      expect(cache.has('c')).toBe(false);
      expect(cache.has('d')).toBe(true);
      expect(cache.has('e')).toBe(true);
    });

    it('should evict on every new unique key with maxSize 1', () => {
      const cache = new LRUCache<string, number>({ maxSize: 1 });
      cache.set('a', 1);
      expect(cache.size).toBe(1);
      cache.set('b', 2);
      expect(cache.size).toBe(1);
      expect(cache.has('a')).toBe(false);
      expect(cache.get('b')).toBe(2);
    });

    it('should not evict when setting existing key', () => {
      const cache = new LRUCache<string, number>({ maxSize: 2 });
      cache.set('a', 1);
      cache.set('b', 2);

      // Re-setting 'a' should not evict anything
      cache.set('a', 10);
      expect(cache.size).toBe(2);
      expect(cache.has('a')).toBe(true);
      expect(cache.has('b')).toBe(true);
    });

    it('should not evict when at exactly capacity', () => {
      const cache = new LRUCache<string, number>({ maxSize: 3 });
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);
      expect(cache.size).toBe(3);
      expect(cache.has('a')).toBe(true);
      expect(cache.has('b')).toBe(true);
      expect(cache.has('c')).toBe(true);
    });
  });

  // ============================================================
  // onEvict Callback
  // ============================================================

  describe('onEvict callback', () => {
    it('should call onEvict with correct key and value on eviction', () => {
      const onEvict = vi.fn();
      const cache = new LRUCache<string, number>({
        maxSize: 2,
        onEvict,
      });

      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3); // evicts 'a'

      expect(onEvict).toHaveBeenCalledOnce();
      expect(onEvict).toHaveBeenCalledWith('a', 1);
    });

    it('should NOT call onEvict on manual delete', () => {
      const onEvict = vi.fn();
      const cache = new LRUCache<string, number>({
        maxSize: 5,
        onEvict,
      });

      cache.set('a', 1);
      cache.delete('a');

      expect(onEvict).not.toHaveBeenCalled();
    });

    it('should NOT call onEvict on clear', () => {
      const onEvict = vi.fn();
      const cache = new LRUCache<string, number>({
        maxSize: 5,
        onEvict,
      });

      cache.set('a', 1);
      cache.set('b', 2);
      cache.clear();

      expect(onEvict).not.toHaveBeenCalled();
    });

    it('should call onEvict once per eviction', () => {
      const onEvict = vi.fn();
      const cache = new LRUCache<string, number>({
        maxSize: 2,
        onEvict,
      });

      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3); // evicts 'a'
      cache.set('d', 4); // evicts 'b'

      expect(onEvict).toHaveBeenCalledTimes(2);
      expect(onEvict).toHaveBeenNthCalledWith(1, 'a', 1);
      expect(onEvict).toHaveBeenNthCalledWith(2, 'b', 2);
    });

    it('should work without onEvict callback', () => {
      const cache = new LRUCache<string, number>({ maxSize: 1 });
      cache.set('a', 1);
      // Should not throw
      cache.set('b', 2);
      expect(cache.has('a')).toBe(false);
      expect(cache.has('b')).toBe(true);
    });
  });

  // ============================================================
  // Cache Statistics
  // ============================================================

  describe('statistics', () => {
    let cache: LRUCache<string, number>;

    beforeEach(() => {
      cache = new LRUCache({ maxSize: 10 });
    });

    it('should track hits on successful get', () => {
      cache.set('a', 1);
      cache.get('a');
      cache.get('a');

      const stats = cache.stats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(0);
    });

    it('should track misses on failed get', () => {
      cache.get('missing');
      cache.get('also-missing');

      const stats = cache.stats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(2);
    });

    it('should not track has() in stats', () => {
      cache.set('a', 1);
      cache.has('a');
      cache.has('missing');

      const stats = cache.stats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
    });

    it('should calculate hitRate correctly', () => {
      cache.set('a', 1);
      cache.get('a'); // hit
      cache.get('b'); // miss
      cache.get('a'); // hit
      cache.get('c'); // miss

      const stats = cache.stats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(2);
      expect(stats.hitRate).toBe(0.5);
    });

    it('should return 0 hitRate when no lookups', () => {
      const stats = cache.stats();
      expect(stats.hitRate).toBe(0);
    });

    it('should report size and capacity', () => {
      cache.set('a', 1);
      cache.set('b', 2);

      const stats = cache.stats();
      expect(stats.size).toBe(2);
      expect(stats.capacity).toBe(10);
    });

    it('should reset stats without clearing data', () => {
      cache.set('a', 1);
      cache.get('a');
      cache.get('missing');

      cache.resetStats();

      const stats = cache.stats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      // Data should still be present
      expect(cache.get('a')).toBe(1);
      expect(cache.size).toBe(1);
    });

    it('should not reset stats on clear', () => {
      cache.set('a', 1);
      cache.get('a'); // hit
      cache.get('missing'); // miss

      cache.clear();

      const stats = cache.stats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.size).toBe(0);
    });
  });

  // ============================================================
  // Iteration
  // ============================================================

  describe('iteration', () => {
    it('should iterate over all entries with for...of', () => {
      const cache = new LRUCache<string, number>({ maxSize: 5 });
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);

      const entries: [string, number][] = [];
      for (const entry of cache) {
        entries.push(entry);
      }

      expect(entries).toHaveLength(3);
      expect(entries).toEqual([
        ['a', 1],
        ['b', 2],
        ['c', 3],
      ]);
    });

    it('should iterate in LRU-to-MRU order', () => {
      const cache = new LRUCache<string, number>({ maxSize: 5 });
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);

      // Access 'a' to move it to MRU
      cache.get('a');

      const keys: string[] = [];
      for (const [key] of cache) {
        keys.push(key);
      }

      // 'b' is now LRU, then 'c', then 'a' (MRU)
      expect(keys).toEqual(['b', 'c', 'a']);
    });

    it('should yield nothing for empty cache', () => {
      const cache = new LRUCache<string, number>({ maxSize: 5 });
      const entries: [string, number][] = [];
      for (const entry of cache) {
        entries.push(entry);
      }
      expect(entries).toHaveLength(0);
    });

    it('should support forEach', () => {
      const cache = new LRUCache<string, number>({ maxSize: 5 });
      cache.set('a', 1);
      cache.set('b', 2);

      const result: [string, number][] = [];
      cache.forEach((value, key) => {
        result.push([key, value]);
      });

      expect(result).toEqual([
        ['a', 1],
        ['b', 2],
      ]);
    });

    it('should allow delete during for...of iteration', () => {
      const cache = new LRUCache<string, number>({ maxSize: 5 });
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);

      // Delete matching entries during iteration (like FilterManager does)
      for (const [key, value] of cache) {
        if (value === 2) {
          cache.delete(key);
          break;
        }
      }

      expect(cache.has('a')).toBe(true);
      expect(cache.has('b')).toBe(false);
      expect(cache.has('c')).toBe(true);
    });
  });

  // ============================================================
  // Edge Cases
  // ============================================================

  describe('edge cases', () => {
    it('should handle set then delete then get', () => {
      const cache = new LRUCache<string, number>({ maxSize: 5 });
      cache.set('a', 1);
      cache.delete('a');
      expect(cache.get('a')).toBeUndefined();
    });

    it('should handle re-setting same key multiple times', () => {
      const cache = new LRUCache<string, number>({ maxSize: 3 });
      cache.set('a', 1);
      cache.set('a', 2);
      cache.set('a', 3);
      cache.set('a', 4);
      expect(cache.size).toBe(1);
      expect(cache.get('a')).toBe(4);
    });

    it('should handle numeric keys', () => {
      const cache = new LRUCache<number, string>({ maxSize: 3 });
      cache.set(1, 'one');
      cache.set(2, 'two');
      expect(cache.get(1)).toBe('one');
      expect(cache.get(2)).toBe('two');
    });

    it('should handle complex value types', () => {
      const cache = new LRUCache<string, { name: string; count: number }>({
        maxSize: 3,
      });
      const obj = { name: 'test', count: 42 };
      cache.set('key', obj);
      expect(cache.get('key')).toBe(obj);
    });

    it('should correctly report stats after many operations', () => {
      const cache = new LRUCache<string, number>({ maxSize: 2 });

      cache.set('a', 1);
      cache.set('b', 2);
      cache.get('a'); // hit
      cache.get('c'); // miss
      cache.set('c', 3); // evicts 'b'
      cache.get('b'); // miss (evicted)
      cache.get('a'); // hit

      const stats: CacheStats = cache.stats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(2);
      expect(stats.hitRate).toBe(0.5);
      expect(stats.size).toBe(2);
      expect(stats.capacity).toBe(2);
    });
  });
});
