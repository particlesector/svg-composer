import { describe, it, expect } from 'vitest';
import { calculatePinchZoom } from '../../../src/interaction/utils/zoomUtils.js';
import { ZOOM_LIMITS } from '../../../src/interaction/types.js';

describe('calculatePinchZoom', () => {
  const defaultViewport = { panX: 0, panY: 0, zoom: 1 };

  describe('zoom calculation', () => {
    it('should zoom in when scale > 1', () => {
      const result = calculatePinchZoom({ x: 600, y: 600 }, 1.5, 1, defaultViewport);

      expect(result.zoom).toBe(1.5);
      expect(result.changed).toBe(true);
    });

    it('should zoom out when scale < 1', () => {
      const viewport = { panX: 0, panY: 0, zoom: 2 };
      const result = calculatePinchZoom({ x: 600, y: 600 }, 0.5, 2, viewport);

      expect(result.zoom).toBe(1);
      expect(result.changed).toBe(true);
    });

    it('should return changed=false when scale=1 (no change)', () => {
      const result = calculatePinchZoom({ x: 600, y: 600 }, 1, 1, defaultViewport);

      expect(result.zoom).toBe(1);
      expect(result.changed).toBe(false);
    });

    it('should use initialZoom for calculation, not currentViewport.zoom', () => {
      const viewport = { panX: 0, panY: 0, zoom: 2 };
      // Scale of 1.5 applied to initialZoom of 1 should give 1.5, not 3
      const result = calculatePinchZoom({ x: 600, y: 600 }, 1.5, 1, viewport);

      expect(result.zoom).toBe(1.5);
    });
  });

  describe('zoom clamping', () => {
    it('should clamp zoom to minimum', () => {
      const result = calculatePinchZoom({ x: 600, y: 600 }, 0.01, 0.5, defaultViewport);

      expect(result.zoom).toBe(ZOOM_LIMITS.MIN);
      expect(result.changed).toBe(true);
    });

    it('should clamp zoom to maximum', () => {
      const result = calculatePinchZoom({ x: 600, y: 600 }, 100, 5, defaultViewport);

      expect(result.zoom).toBe(ZOOM_LIMITS.MAX);
      expect(result.changed).toBe(true);
    });

    it('should return changed=false when already at MIN and trying to zoom out', () => {
      const viewport = { panX: 0, panY: 0, zoom: ZOOM_LIMITS.MIN };
      const result = calculatePinchZoom({ x: 600, y: 600 }, 0.5, ZOOM_LIMITS.MIN, viewport);

      expect(result.zoom).toBe(ZOOM_LIMITS.MIN);
      expect(result.changed).toBe(false);
    });

    it('should return changed=false when already at MAX and trying to zoom in', () => {
      const viewport = { panX: 0, panY: 0, zoom: ZOOM_LIMITS.MAX };
      const result = calculatePinchZoom({ x: 600, y: 600 }, 2, ZOOM_LIMITS.MAX, viewport);

      expect(result.zoom).toBe(ZOOM_LIMITS.MAX);
      expect(result.changed).toBe(false);
    });

    it('should handle zoom exactly at MIN boundary', () => {
      const result = calculatePinchZoom({ x: 600, y: 600 }, ZOOM_LIMITS.MIN, 1, defaultViewport);

      expect(result.zoom).toBe(ZOOM_LIMITS.MIN);
      expect(result.changed).toBe(true);
    });

    it('should handle zoom exactly at MAX boundary', () => {
      const viewport = { panX: 0, panY: 0, zoom: 5 };
      const result = calculatePinchZoom({ x: 600, y: 600 }, 2, 5, viewport);

      expect(result.zoom).toBe(ZOOM_LIMITS.MAX);
      expect(result.changed).toBe(true);
    });
  });

  describe('pan adjustment (zoom toward center point)', () => {
    it('should adjust pan to zoom toward center point', () => {
      const centerPoint = { x: 100, y: 100 };
      const result = calculatePinchZoom(centerPoint, 2, 1, defaultViewport);

      // When zooming in 2x toward (100, 100) from pan (0, 0):
      // newPan = center - (center - currentPan) * zoomRatio
      // newPan = 100 - (100 - 0) * 2 = 100 - 200 = -100
      expect(result.panX).toBe(-100);
      expect(result.panY).toBe(-100);
    });

    it('should keep center point fixed when zooming', () => {
      const viewport = { panX: 50, panY: 50, zoom: 1 };
      const centerPoint = { x: 200, y: 200 };
      const result = calculatePinchZoom(centerPoint, 2, 1, viewport);

      // The center point should remain visually fixed after zoom
      // newPan = 200 - (200 - 50) * 2 = 200 - 300 = -100
      expect(result.panX).toBe(-100);
      expect(result.panY).toBe(-100);
    });

    it('should not adjust pan when zoom unchanged', () => {
      const viewport = { panX: 100, panY: 100, zoom: ZOOM_LIMITS.MIN };
      const result = calculatePinchZoom({ x: 600, y: 600 }, 0.5, ZOOM_LIMITS.MIN, viewport);

      expect(result.panX).toBe(100);
      expect(result.panY).toBe(100);
      expect(result.changed).toBe(false);
    });
  });

  describe('floating point precision', () => {
    it('should handle very small scale values', () => {
      const result = calculatePinchZoom({ x: 600, y: 600 }, 0.0001, 1, defaultViewport);

      expect(result.zoom).toBe(ZOOM_LIMITS.MIN);
      expect(result.changed).toBe(true);
    });

    it('should handle very large scale values', () => {
      const result = calculatePinchZoom({ x: 600, y: 600 }, 10000, 1, defaultViewport);

      expect(result.zoom).toBe(ZOOM_LIMITS.MAX);
      expect(result.changed).toBe(true);
    });

    it('should handle fractional zoom levels correctly', () => {
      const result = calculatePinchZoom({ x: 600, y: 600 }, 1.333333, 1, defaultViewport);

      expect(result.zoom).toBeCloseTo(1.333333, 5);
      expect(result.changed).toBe(true);
    });
  });
});
