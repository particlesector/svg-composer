import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CoordinateTransformer } from '../../../src/interaction/CoordinateTransformer.js';
import type { ViewportState } from '../../../src/interaction/types.js';

describe('CoordinateTransformer', () => {
  let container: HTMLElement;
  let transformer: CoordinateTransformer;
  let viewportState: ViewportState;
  let canvasSize: { width: number; height: number };

  beforeEach(() => {
    // Create a mock container
    container = document.createElement('div');

    // Default viewport state (no pan, no zoom)
    viewportState = { panX: 0, panY: 0, zoom: 1 };

    // Default canvas size
    canvasSize = { width: 1200, height: 1200 };

    // Mock getBoundingClientRect to return a 600x600 container at position (100, 100)
    vi.spyOn(container, 'getBoundingClientRect').mockReturnValue({
      left: 100,
      top: 100,
      right: 700,
      bottom: 700,
      width: 600,
      height: 600,
      x: 100,
      y: 100,
      toJSON: () => ({}),
    });

    transformer = new CoordinateTransformer(container, {
      getViewportState: (): ViewportState => viewportState,
      getCanvasSize: (): { width: number; height: number } => canvasSize,
    });
  });

  describe('screenToViewBox', () => {
    it('should convert screen coordinates at container origin to viewBox origin', () => {
      // Click at top-left corner of container (100, 100 on screen)
      const result = transformer.screenToViewBox(100, 100);

      // With 1200x1200 viewBox in 600x600 container, scale is 2
      // Top-left of container maps to (0, 0) in viewBox
      expect(result.x).toBeCloseTo(0, 5);
      expect(result.y).toBeCloseTo(0, 5);
    });

    it('should convert screen coordinates at container center to viewBox center', () => {
      // Click at center of container (400, 400 on screen)
      const result = transformer.screenToViewBox(400, 400);

      // Center should map to (600, 600) in viewBox
      expect(result.x).toBeCloseTo(600, 5);
      expect(result.y).toBeCloseTo(600, 5);
    });

    it('should convert screen coordinates at container bottom-right to viewBox bottom-right', () => {
      // Click at bottom-right corner of container (700, 700 on screen)
      const result = transformer.screenToViewBox(700, 700);

      // Bottom-right should map to (1200, 1200) in viewBox
      expect(result.x).toBeCloseTo(1200, 5);
      expect(result.y).toBeCloseTo(1200, 5);
    });

    it('should account for pan offset', () => {
      viewportState = { panX: 100, panY: 50, zoom: 1 };

      // Click at container origin
      const result = transformer.screenToViewBox(100, 100);

      // With pan, the origin should be offset
      expect(result.x).toBeCloseTo(100, 5);
      expect(result.y).toBeCloseTo(50, 5);
    });

    it('should account for zoom level', () => {
      viewportState = { panX: 0, panY: 0, zoom: 2 };

      // Click at center of container
      const result = transformer.screenToViewBox(400, 400);

      // With 2x zoom, coordinates are halved
      expect(result.x).toBeCloseTo(300, 5);
      expect(result.y).toBeCloseTo(300, 5);
    });

    it('should account for both pan and zoom', () => {
      viewportState = { panX: 100, panY: 100, zoom: 2 };

      // Click at container origin
      const result = transformer.screenToViewBox(100, 100);

      // Pan offset is added after zoom scaling
      expect(result.x).toBeCloseTo(100, 5);
      expect(result.y).toBeCloseTo(100, 5);
    });

    it('should handle non-square aspect ratios', () => {
      // Container is 600x300 (wider than tall)
      vi.spyOn(container, 'getBoundingClientRect').mockReturnValue({
        left: 100,
        top: 100,
        right: 700,
        bottom: 400,
        width: 600,
        height: 300,
        x: 100,
        y: 100,
        toJSON: () => ({}),
      });

      // ViewBox is still 1200x1200 (square)
      // Scale will be based on height (1200/300 = 4) to preserve aspect ratio
      // Content will be centered horizontally

      const result = transformer.screenToViewBox(400, 250);

      // At center of container, should map to center of viewBox
      expect(result.x).toBeCloseTo(600, 5);
      expect(result.y).toBeCloseTo(600, 5);
    });

    it('should handle zero-dimension container gracefully', () => {
      vi.spyOn(container, 'getBoundingClientRect').mockReturnValue({
        left: 100,
        top: 100,
        right: 100,
        bottom: 100,
        width: 0,
        height: 0,
        x: 100,
        y: 100,
        toJSON: () => ({}),
      });

      const result = transformer.screenToViewBox(100, 100);

      expect(result.x).toBe(0);
      expect(result.y).toBe(0);
    });

    it('should handle zero-dimension canvas gracefully', () => {
      canvasSize = { width: 0, height: 0 };

      const result = transformer.screenToViewBox(400, 400);

      expect(result.x).toBe(0);
      expect(result.y).toBe(0);
    });

    it('should handle coordinates outside container bounds (left of container)', () => {
      // Click at (50, 400) which is left of container that starts at x=100
      const result = transformer.screenToViewBox(50, 400);

      // Container-relative x would be -50, should result in negative viewBox x
      expect(result.x).toBeLessThan(0);
      // Y should still be valid (center of container)
      expect(result.y).toBeCloseTo(600, 5);
    });

    it('should handle coordinates outside container bounds (above container)', () => {
      // Click at (400, 50) which is above container that starts at y=100
      const result = transformer.screenToViewBox(400, 50);

      // X should be valid (center of container)
      expect(result.x).toBeCloseTo(600, 5);
      // Container-relative y would be -50, should result in negative viewBox y
      expect(result.y).toBeLessThan(0);
    });

    it('should handle coordinates outside container bounds (right of container)', () => {
      // Click at (750, 400) which is right of container that ends at x=700
      const result = transformer.screenToViewBox(750, 400);

      // Should result in viewBox x > 1200
      expect(result.x).toBeGreaterThan(1200);
      expect(result.y).toBeCloseTo(600, 5);
    });

    it('should handle coordinates outside container bounds (below container)', () => {
      // Click at (400, 750) which is below container that ends at y=700
      const result = transformer.screenToViewBox(400, 750);

      expect(result.x).toBeCloseTo(600, 5);
      // Should result in viewBox y > 1200
      expect(result.y).toBeGreaterThan(1200);
    });
  });

  describe('viewBoxToScreen', () => {
    it('should convert viewBox origin to screen coordinates at container origin', () => {
      const result = transformer.viewBoxToScreen(0, 0);

      expect(result.screenX).toBeCloseTo(100, 5);
      expect(result.screenY).toBeCloseTo(100, 5);
    });

    it('should convert viewBox center to screen center', () => {
      const result = transformer.viewBoxToScreen(600, 600);

      expect(result.screenX).toBeCloseTo(400, 5);
      expect(result.screenY).toBeCloseTo(400, 5);
    });

    it('should convert viewBox bottom-right to container bottom-right', () => {
      const result = transformer.viewBoxToScreen(1200, 1200);

      expect(result.screenX).toBeCloseTo(700, 5);
      expect(result.screenY).toBeCloseTo(700, 5);
    });

    it('should account for pan offset', () => {
      viewportState = { panX: 100, panY: 50, zoom: 1 };

      const result = transformer.viewBoxToScreen(100, 50);

      // The panned point should appear at container origin
      expect(result.screenX).toBeCloseTo(100, 5);
      expect(result.screenY).toBeCloseTo(100, 5);
    });

    it('should account for zoom level', () => {
      viewportState = { panX: 0, panY: 0, zoom: 2 };

      const result = transformer.viewBoxToScreen(300, 300);

      // With 2x zoom, center of visible area moves
      expect(result.screenX).toBeCloseTo(400, 5);
      expect(result.screenY).toBeCloseTo(400, 5);
    });

    it('should handle zero-dimension container gracefully', () => {
      vi.spyOn(container, 'getBoundingClientRect').mockReturnValue({
        left: 100,
        top: 100,
        right: 100,
        bottom: 100,
        width: 0,
        height: 0,
        x: 100,
        y: 100,
        toJSON: () => ({}),
      });

      const result = transformer.viewBoxToScreen(600, 600);

      expect(result.screenX).toBe(100);
      expect(result.screenY).toBe(100);
    });

    it('should be the inverse of screenToViewBox', () => {
      // Test round-trip conversion
      const originalScreenX = 350;
      const originalScreenY = 450;

      const viewBoxPoint = transformer.screenToViewBox(originalScreenX, originalScreenY);
      const screenPoint = transformer.viewBoxToScreen(viewBoxPoint.x, viewBoxPoint.y);

      expect(screenPoint.screenX).toBeCloseTo(originalScreenX, 5);
      expect(screenPoint.screenY).toBeCloseTo(originalScreenY, 5);
    });

    it('should be the inverse of screenToViewBox with pan and zoom', () => {
      viewportState = { panX: 200, panY: -100, zoom: 1.5 };

      const originalScreenX = 300;
      const originalScreenY = 500;

      const viewBoxPoint = transformer.screenToViewBox(originalScreenX, originalScreenY);
      const screenPoint = transformer.viewBoxToScreen(viewBoxPoint.x, viewBoxPoint.y);

      expect(screenPoint.screenX).toBeCloseTo(originalScreenX, 5);
      expect(screenPoint.screenY).toBeCloseTo(originalScreenY, 5);
    });
  });

  describe('getScale', () => {
    it('should return correct scale for 1:1 mapping', () => {
      // Container is 600x600, viewBox is 1200x1200
      // Scale should be 2 (viewBox units per screen pixel)
      const scale = transformer.getScale();

      expect(scale).toBeCloseTo(2, 5);
    });

    it('should account for zoom', () => {
      viewportState = { panX: 0, panY: 0, zoom: 2 };

      const scale = transformer.getScale();

      // With 2x zoom, scale is halved
      expect(scale).toBeCloseTo(1, 5);
    });

    it('should return 1 for zero-dimension container', () => {
      vi.spyOn(container, 'getBoundingClientRect').mockReturnValue({
        left: 0,
        top: 0,
        right: 0,
        bottom: 0,
        width: 0,
        height: 0,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      });

      const scale = transformer.getScale();

      expect(scale).toBe(1);
    });

    it('should use max scale for non-square aspect ratios', () => {
      // Container is 600x300 (wider)
      vi.spyOn(container, 'getBoundingClientRect').mockReturnValue({
        left: 0,
        top: 0,
        right: 600,
        bottom: 300,
        width: 600,
        height: 300,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      });

      // ViewBox is 1200x1200
      // scaleX = 1200/600 = 2, scaleY = 1200/300 = 4
      // max(2, 4) = 4
      const scale = transformer.getScale();

      expect(scale).toBeCloseTo(4, 5);
    });
  });

  describe('screenDistanceToViewBox', () => {
    it('should convert screen distance to viewBox distance', () => {
      // Scale is 2, so 50 screen pixels = 100 viewBox units
      const result = transformer.screenDistanceToViewBox(50);

      expect(result).toBeCloseTo(100, 5);
    });

    it('should account for zoom', () => {
      viewportState = { panX: 0, panY: 0, zoom: 2 };

      // With 2x zoom, scale becomes 1, so 50 pixels = 50 units
      const result = transformer.screenDistanceToViewBox(50);

      expect(result).toBeCloseTo(50, 5);
    });

    it('should handle zero distance', () => {
      const result = transformer.screenDistanceToViewBox(0);

      expect(result).toBe(0);
    });
  });

  describe('viewBoxDistanceToScreen', () => {
    it('should convert viewBox distance to screen distance', () => {
      // Scale is 2, so 100 viewBox units = 50 screen pixels
      const result = transformer.viewBoxDistanceToScreen(100);

      expect(result).toBeCloseTo(50, 5);
    });

    it('should account for zoom', () => {
      viewportState = { panX: 0, panY: 0, zoom: 2 };

      // With 2x zoom, scale becomes 1, so 100 units = 100 pixels
      const result = transformer.viewBoxDistanceToScreen(100);

      expect(result).toBeCloseTo(100, 5);
    });

    it('should handle zero distance', () => {
      const result = transformer.viewBoxDistanceToScreen(0);

      expect(result).toBe(0);
    });

    it('should handle zero scale gracefully', () => {
      vi.spyOn(container, 'getBoundingClientRect').mockReturnValue({
        left: 0,
        top: 0,
        right: 0,
        bottom: 0,
        width: 0,
        height: 0,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      });

      // When scale is 1 (fallback), 100 units = 100 pixels
      const result = transformer.viewBoxDistanceToScreen(100);

      expect(result).toBeCloseTo(100, 5);
    });
  });
});
