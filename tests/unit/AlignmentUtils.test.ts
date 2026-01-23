/**
 * AlignmentUtils unit tests
 */

import { describe, it, expect } from 'vitest';
import {
  getCombinedBounds,
  getReferenceBounds,
  alignLeft,
  alignRight,
  alignTop,
  alignBottom,
  alignCenterHorizontal,
  alignCenterVertical,
  alignCenter,
  distributeLeft,
  distributeCenterHorizontal,
  distributeRight,
  distributeTop,
  distributeCenterVertical,
  distributeBottom,
  distributeHorizontalGaps,
  distributeVerticalGaps,
  type ElementBounds,
} from '../../src/utils/AlignmentUtils.js';
import type { BoundingBox } from '../../src/core/types.js';

// Helper to create element bounds
function createElementBounds(
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
): ElementBounds {
  return { id, bounds: { x, y, width, height } };
}

// Default canvas bounds for tests
const canvasBounds: BoundingBox = { x: 0, y: 0, width: 1200, height: 1200 };

describe('AlignmentUtils', () => {
  // ============================================================
  // getCombinedBounds
  // ============================================================
  describe('getCombinedBounds', () => {
    it('should return null for empty array', () => {
      expect(getCombinedBounds([])).toBeNull();
    });

    it('should return bounds for single element', () => {
      const elements = [createElementBounds('a', 100, 100, 50, 50)];
      const result = getCombinedBounds(elements);
      expect(result).toEqual({ x: 100, y: 100, width: 50, height: 50 });
    });

    it('should calculate combined bounds for multiple elements', () => {
      const elements = [
        createElementBounds('a', 100, 100, 50, 50),
        createElementBounds('b', 200, 200, 100, 100),
        createElementBounds('c', 50, 150, 30, 30),
      ];
      const result = getCombinedBounds(elements);
      // Min x = 50, min y = 100, max x = 300, max y = 300
      expect(result).toEqual({ x: 50, y: 100, width: 250, height: 200 });
    });
  });

  // ============================================================
  // getReferenceBounds
  // ============================================================
  describe('getReferenceBounds', () => {
    const elements = [
      createElementBounds('a', 100, 100, 50, 50),
      createElementBounds('b', 200, 200, 100, 100),
    ];

    it('should return selection bounds by default', () => {
      const result = getReferenceBounds(elements, canvasBounds);
      expect(result).toEqual(getCombinedBounds(elements));
    });

    it('should return selection bounds when relativeTo is selection', () => {
      const result = getReferenceBounds(elements, canvasBounds, { relativeTo: 'selection' });
      expect(result).toEqual(getCombinedBounds(elements));
    });

    it('should return canvas bounds when relativeTo is canvas', () => {
      const result = getReferenceBounds(elements, canvasBounds, { relativeTo: 'canvas' });
      expect(result).toEqual(canvasBounds);
    });

    it('should return first element bounds when relativeTo is first', () => {
      const result = getReferenceBounds(elements, canvasBounds, { relativeTo: 'first' });
      expect(result).toEqual(elements[0].bounds);
    });

    it('should return null when relativeTo is first and no elements', () => {
      const result = getReferenceBounds([], canvasBounds, { relativeTo: 'first' });
      expect(result).toBeNull();
    });
  });

  // ============================================================
  // Alignment Operations
  // ============================================================
  describe('alignLeft', () => {
    it('should return empty array for less than 2 elements (default options)', () => {
      const elements = [createElementBounds('a', 100, 100, 50, 50)];
      const results = alignLeft(elements, canvasBounds);
      expect(results).toEqual([]);
    });

    it('should align single element to canvas left when relativeTo is canvas', () => {
      const elements = [createElementBounds('a', 100, 100, 50, 50)];
      const results = alignLeft(elements, canvasBounds, { relativeTo: 'canvas' });
      expect(results).toHaveLength(1);
      expect(results[0].newX).toBe(0);
      expect(results[0].deltaX).toBe(-100);
    });

    it('should align elements to leftmost element', () => {
      const elements = [
        createElementBounds('a', 100, 100, 50, 50),
        createElementBounds('b', 200, 200, 100, 100),
        createElementBounds('c', 50, 150, 30, 30),
      ];
      const results = alignLeft(elements, canvasBounds);

      // All should align to x=50 (leftmost)
      expect(results).toHaveLength(3);
      expect(results.find((r) => r.id === 'a')?.newX).toBe(50);
      expect(results.find((r) => r.id === 'b')?.newX).toBe(50);
      expect(results.find((r) => r.id === 'c')?.newX).toBe(50);
    });

    it('should align elements to first element when relativeTo is first', () => {
      const elements = [
        createElementBounds('a', 100, 100, 50, 50),
        createElementBounds('b', 200, 200, 100, 100),
      ];
      const results = alignLeft(elements, canvasBounds, { relativeTo: 'first' });

      expect(results).toHaveLength(2);
      expect(results.find((r) => r.id === 'a')?.deltaX).toBe(0);
      expect(results.find((r) => r.id === 'b')?.newX).toBe(100);
    });
  });

  describe('alignRight', () => {
    it('should return empty array for less than 2 elements', () => {
      const elements = [createElementBounds('a', 100, 100, 50, 50)];
      const results = alignRight(elements, canvasBounds);
      expect(results).toEqual([]);
    });

    it('should align single element to canvas right when relativeTo is canvas', () => {
      const elements = [createElementBounds('a', 100, 100, 50, 50)];
      const results = alignRight(elements, canvasBounds, { relativeTo: 'canvas' });
      // Element right edge should be at 1200, so x = 1200 - 50 = 1150
      expect(results).toHaveLength(1);
      expect(results[0].newX).toBe(1150);
    });

    it('should align elements to rightmost element', () => {
      const elements = [
        createElementBounds('a', 100, 100, 50, 50), // right = 150
        createElementBounds('b', 200, 200, 100, 100), // right = 300
      ];
      const results = alignRight(elements, canvasBounds);

      // All should align right edge to x=300 (rightmost)
      expect(results.find((r) => r.id === 'a')?.newX).toBe(250); // 300 - 50
      expect(results.find((r) => r.id === 'b')?.newX).toBe(200); // no change
    });
  });

  describe('alignTop', () => {
    it('should return empty array for less than 2 elements', () => {
      const elements = [createElementBounds('a', 100, 100, 50, 50)];
      const results = alignTop(elements, canvasBounds);
      expect(results).toEqual([]);
    });

    it('should align single element to canvas top when relativeTo is canvas', () => {
      const elements = [createElementBounds('a', 100, 100, 50, 50)];
      const results = alignTop(elements, canvasBounds, { relativeTo: 'canvas' });
      expect(results).toHaveLength(1);
      expect(results[0].newY).toBe(0);
      expect(results[0].deltaY).toBe(-100);
    });

    it('should align elements to topmost element', () => {
      const elements = [
        createElementBounds('a', 100, 100, 50, 50),
        createElementBounds('b', 200, 200, 100, 100),
        createElementBounds('c', 150, 50, 30, 30),
      ];
      const results = alignTop(elements, canvasBounds);

      // All should align to y=50 (topmost)
      expect(results.find((r) => r.id === 'a')?.newY).toBe(50);
      expect(results.find((r) => r.id === 'b')?.newY).toBe(50);
      expect(results.find((r) => r.id === 'c')?.newY).toBe(50);
    });
  });

  describe('alignBottom', () => {
    it('should return empty array for less than 2 elements', () => {
      const elements = [createElementBounds('a', 100, 100, 50, 50)];
      const results = alignBottom(elements, canvasBounds);
      expect(results).toEqual([]);
    });

    it('should align single element to canvas bottom when relativeTo is canvas', () => {
      const elements = [createElementBounds('a', 100, 100, 50, 50)];
      const results = alignBottom(elements, canvasBounds, { relativeTo: 'canvas' });
      // Element bottom edge should be at 1200, so y = 1200 - 50 = 1150
      expect(results).toHaveLength(1);
      expect(results[0].newY).toBe(1150);
    });

    it('should align elements to bottommost element', () => {
      const elements = [
        createElementBounds('a', 100, 100, 50, 50), // bottom = 150
        createElementBounds('b', 200, 200, 100, 100), // bottom = 300
      ];
      const results = alignBottom(elements, canvasBounds);

      // All should align bottom edge to y=300 (bottommost)
      expect(results.find((r) => r.id === 'a')?.newY).toBe(250); // 300 - 50
      expect(results.find((r) => r.id === 'b')?.newY).toBe(200); // no change
    });
  });

  describe('alignCenterHorizontal', () => {
    it('should return empty array for less than 2 elements', () => {
      const elements = [createElementBounds('a', 100, 100, 50, 50)];
      const results = alignCenterHorizontal(elements, canvasBounds);
      expect(results).toEqual([]);
    });

    it('should align single element to canvas center when relativeTo is canvas', () => {
      const elements = [createElementBounds('a', 100, 100, 50, 50)];
      const results = alignCenterHorizontal(elements, canvasBounds, { relativeTo: 'canvas' });
      // Element center should be at 600, so x = 600 - 25 = 575
      expect(results).toHaveLength(1);
      expect(results[0].newX).toBe(575);
    });

    it('should align elements to horizontal center of selection', () => {
      const elements = [
        createElementBounds('a', 100, 100, 50, 50), // center = 125
        createElementBounds('b', 200, 200, 100, 100), // center = 250
      ];
      const results = alignCenterHorizontal(elements, canvasBounds);

      // Selection bounds: x=100, width=200, center = 200
      // Element a: new center = 200, new x = 200 - 25 = 175
      // Element b: new center = 200, new x = 200 - 50 = 150
      expect(results.find((r) => r.id === 'a')?.newX).toBe(175);
      expect(results.find((r) => r.id === 'b')?.newX).toBe(150);
    });
  });

  describe('alignCenterVertical', () => {
    it('should return empty array for less than 2 elements', () => {
      const elements = [createElementBounds('a', 100, 100, 50, 50)];
      const results = alignCenterVertical(elements, canvasBounds);
      expect(results).toEqual([]);
    });

    it('should align single element to canvas center when relativeTo is canvas', () => {
      const elements = [createElementBounds('a', 100, 100, 50, 50)];
      const results = alignCenterVertical(elements, canvasBounds, { relativeTo: 'canvas' });
      // Element center should be at 600, so y = 600 - 25 = 575
      expect(results).toHaveLength(1);
      expect(results[0].newY).toBe(575);
    });

    it('should align elements to vertical center of selection', () => {
      const elements = [
        createElementBounds('a', 100, 100, 50, 50), // center = 125
        createElementBounds('b', 200, 200, 100, 100), // center = 250
      ];
      const results = alignCenterVertical(elements, canvasBounds);

      // Selection bounds: y=100, height=200, center = 200
      expect(results.find((r) => r.id === 'a')?.newY).toBe(175);
      expect(results.find((r) => r.id === 'b')?.newY).toBe(150);
    });
  });

  describe('alignCenter', () => {
    it('should return empty array for less than 2 elements', () => {
      const elements = [createElementBounds('a', 100, 100, 50, 50)];
      const results = alignCenter(elements, canvasBounds);
      expect(results).toEqual([]);
    });

    it('should align single element to canvas center when relativeTo is canvas', () => {
      const elements = [createElementBounds('a', 100, 100, 50, 50)];
      const results = alignCenter(elements, canvasBounds, { relativeTo: 'canvas' });
      // Element center should be at (600, 600)
      expect(results).toHaveLength(1);
      expect(results[0].newX).toBe(575);
      expect(results[0].newY).toBe(575);
    });

    it('should align elements to center of selection', () => {
      const elements = [
        createElementBounds('a', 100, 100, 50, 50),
        createElementBounds('b', 200, 200, 100, 100),
      ];
      const results = alignCenter(elements, canvasBounds);

      // Selection bounds: x=100, y=100, width=200, height=200, center = (200, 200)
      expect(results.find((r) => r.id === 'a')?.newX).toBe(175);
      expect(results.find((r) => r.id === 'a')?.newY).toBe(175);
      expect(results.find((r) => r.id === 'b')?.newX).toBe(150);
      expect(results.find((r) => r.id === 'b')?.newY).toBe(150);
    });
  });

  // ============================================================
  // Distribution Operations
  // ============================================================
  describe('distributeLeft', () => {
    it('should return empty array for less than 3 elements', () => {
      const elements = [
        createElementBounds('a', 100, 100, 50, 50),
        createElementBounds('b', 200, 200, 50, 50),
      ];
      expect(distributeLeft(elements)).toEqual([]);
    });

    it('should distribute elements evenly by left edge', () => {
      const elements = [
        createElementBounds('a', 0, 100, 50, 50),
        createElementBounds('b', 300, 100, 50, 50),
        createElementBounds('c', 100, 100, 50, 50),
      ];
      const results = distributeLeft(elements);

      // Left edges at 0, 300 with one in between
      // Spacing = 300 / 2 = 150
      // Elements should be at x = 0, 150, 300
      expect(results).toHaveLength(3);
      expect(results[0].newX).toBe(0); // first stays
      expect(results[1].newX).toBe(150); // middle
      expect(results[2].newX).toBe(300); // last stays
    });
  });

  describe('distributeCenterHorizontal', () => {
    it('should return empty array for less than 3 elements', () => {
      const elements = [
        createElementBounds('a', 100, 100, 50, 50),
        createElementBounds('b', 200, 200, 50, 50),
      ];
      expect(distributeCenterHorizontal(elements)).toEqual([]);
    });

    it('should distribute elements evenly by center', () => {
      const elements = [
        createElementBounds('a', 0, 100, 100, 50), // center = 50
        createElementBounds('b', 400, 100, 100, 50), // center = 450
        createElementBounds('c', 100, 100, 100, 50), // center = 150
      ];
      const results = distributeCenterHorizontal(elements);

      // Centers at 50, 450. Spacing = 400 / 2 = 200
      // Centers should be at 50, 250, 450
      // x positions should be 0, 200, 400
      expect(results).toHaveLength(3);
      expect(results[0].newX).toBe(0); // center 50
      expect(results[1].newX).toBe(200); // center 250
      expect(results[2].newX).toBe(400); // center 450
    });
  });

  describe('distributeRight', () => {
    it('should return empty array for less than 3 elements', () => {
      const elements = [
        createElementBounds('a', 100, 100, 50, 50),
        createElementBounds('b', 200, 200, 50, 50),
      ];
      expect(distributeRight(elements)).toEqual([]);
    });

    it('should distribute elements evenly by right edge', () => {
      const elements = [
        createElementBounds('a', 0, 100, 50, 50), // right = 50
        createElementBounds('b', 350, 100, 50, 50), // right = 400
        createElementBounds('c', 100, 100, 50, 50), // right = 150
      ];
      const results = distributeRight(elements);

      // Right edges at 50, 400. Spacing = 350 / 2 = 175
      // Right edges should be at 50, 225, 400
      // x positions should be 0, 175, 350
      expect(results).toHaveLength(3);
      expect(results[0].newX).toBe(0); // right 50
      expect(results[1].newX).toBe(175); // right 225
      expect(results[2].newX).toBe(350); // right 400
    });
  });

  describe('distributeTop', () => {
    it('should return empty array for less than 3 elements', () => {
      const elements = [
        createElementBounds('a', 100, 100, 50, 50),
        createElementBounds('b', 200, 200, 50, 50),
      ];
      expect(distributeTop(elements)).toEqual([]);
    });

    it('should distribute elements evenly by top edge', () => {
      const elements = [
        createElementBounds('a', 100, 0, 50, 50),
        createElementBounds('b', 100, 300, 50, 50),
        createElementBounds('c', 100, 100, 50, 50),
      ];
      const results = distributeTop(elements);

      // Top edges at 0, 300. Spacing = 300 / 2 = 150
      expect(results).toHaveLength(3);
      expect(results[0].newY).toBe(0);
      expect(results[1].newY).toBe(150);
      expect(results[2].newY).toBe(300);
    });
  });

  describe('distributeCenterVertical', () => {
    it('should return empty array for less than 3 elements', () => {
      const elements = [
        createElementBounds('a', 100, 100, 50, 50),
        createElementBounds('b', 200, 200, 50, 50),
      ];
      expect(distributeCenterVertical(elements)).toEqual([]);
    });

    it('should distribute elements evenly by vertical center', () => {
      const elements = [
        createElementBounds('a', 100, 0, 50, 100), // center = 50
        createElementBounds('b', 100, 400, 50, 100), // center = 450
        createElementBounds('c', 100, 100, 50, 100), // center = 150
      ];
      const results = distributeCenterVertical(elements);

      // Centers at 50, 450. Spacing = 400 / 2 = 200
      // Centers should be at 50, 250, 450
      // y positions should be 0, 200, 400
      expect(results).toHaveLength(3);
      expect(results[0].newY).toBe(0);
      expect(results[1].newY).toBe(200);
      expect(results[2].newY).toBe(400);
    });
  });

  describe('distributeBottom', () => {
    it('should return empty array for less than 3 elements', () => {
      const elements = [
        createElementBounds('a', 100, 100, 50, 50),
        createElementBounds('b', 200, 200, 50, 50),
      ];
      expect(distributeBottom(elements)).toEqual([]);
    });

    it('should distribute elements evenly by bottom edge', () => {
      const elements = [
        createElementBounds('a', 100, 0, 50, 50), // bottom = 50
        createElementBounds('b', 100, 350, 50, 50), // bottom = 400
        createElementBounds('c', 100, 100, 50, 50), // bottom = 150
      ];
      const results = distributeBottom(elements);

      // Bottom edges at 50, 400. Spacing = 350 / 2 = 175
      // Bottom edges should be at 50, 225, 400
      // y positions should be 0, 175, 350
      expect(results).toHaveLength(3);
      expect(results[0].newY).toBe(0);
      expect(results[1].newY).toBe(175);
      expect(results[2].newY).toBe(350);
    });
  });

  describe('distributeHorizontalGaps', () => {
    it('should return empty array for less than 3 elements', () => {
      const elements = [
        createElementBounds('a', 100, 100, 50, 50),
        createElementBounds('b', 200, 200, 50, 50),
      ];
      expect(distributeHorizontalGaps(elements)).toEqual([]);
    });

    it('should distribute elements with equal horizontal gaps', () => {
      // Three elements with different widths
      const elements = [
        createElementBounds('a', 0, 100, 50, 50), // width 50
        createElementBounds('b', 200, 100, 100, 50), // width 100
        createElementBounds('c', 400, 100, 50, 50), // width 50
      ];
      const results = distributeHorizontalGaps(elements);

      // Total space: 0 to 450 = 450
      // Total element width: 50 + 100 + 50 = 200
      // Available gap space: 450 - 200 = 250
      // Number of gaps: 2
      // Gap size: 125

      // Positions: 0, 50+125=175, 175+100+125=400
      expect(results).toHaveLength(3);
      expect(results[0].newX).toBe(0);
      expect(results[1].newX).toBe(175);
      expect(results[2].newX).toBe(400);
    });

    it('should handle overlapping elements', () => {
      // Elements that overlap
      const elements = [
        createElementBounds('a', 0, 100, 100, 50),
        createElementBounds('b', 50, 100, 100, 50), // overlaps with a
        createElementBounds('c', 200, 100, 100, 50),
      ];
      const results = distributeHorizontalGaps(elements);

      // Total space: 0 to 300 = 300
      // Total element width: 100 + 100 + 100 = 300
      // Available gap space: 300 - 300 = 0
      // Gap size: 0

      expect(results).toHaveLength(3);
      expect(results[0].newX).toBe(0);
      expect(results[1].newX).toBe(100);
      expect(results[2].newX).toBe(200);
    });
  });

  describe('distributeVerticalGaps', () => {
    it('should return empty array for less than 3 elements', () => {
      const elements = [
        createElementBounds('a', 100, 100, 50, 50),
        createElementBounds('b', 200, 200, 50, 50),
      ];
      expect(distributeVerticalGaps(elements)).toEqual([]);
    });

    it('should distribute elements with equal vertical gaps', () => {
      // Three elements with different heights
      const elements = [
        createElementBounds('a', 100, 0, 50, 50), // height 50
        createElementBounds('b', 100, 200, 50, 100), // height 100
        createElementBounds('c', 100, 400, 50, 50), // height 50
      ];
      const results = distributeVerticalGaps(elements);

      // Total space: 0 to 450 = 450
      // Total element height: 50 + 100 + 50 = 200
      // Available gap space: 450 - 200 = 250
      // Number of gaps: 2
      // Gap size: 125

      // Positions: 0, 50+125=175, 175+100+125=400
      expect(results).toHaveLength(3);
      expect(results[0].newY).toBe(0);
      expect(results[1].newY).toBe(175);
      expect(results[2].newY).toBe(400);
    });
  });

  // ============================================================
  // Edge Cases
  // ============================================================
  describe('edge cases', () => {
    it('should handle elements at same position', () => {
      const elements = [
        createElementBounds('a', 100, 100, 50, 50),
        createElementBounds('b', 100, 100, 50, 50),
      ];
      const results = alignLeft(elements, canvasBounds);

      // Both at same position, no movement needed
      expect(results.find((r) => r.id === 'a')?.deltaX).toBe(0);
      expect(results.find((r) => r.id === 'b')?.deltaX).toBe(0);
    });

    it('should preserve Y when aligning horizontally', () => {
      const elements = [
        createElementBounds('a', 100, 50, 50, 50),
        createElementBounds('b', 200, 150, 50, 50),
      ];
      const results = alignLeft(elements, canvasBounds);

      expect(results.find((r) => r.id === 'a')?.newY).toBe(50);
      expect(results.find((r) => r.id === 'b')?.newY).toBe(150);
    });

    it('should preserve X when aligning vertically', () => {
      const elements = [
        createElementBounds('a', 50, 100, 50, 50),
        createElementBounds('b', 150, 200, 50, 50),
      ];
      const results = alignTop(elements, canvasBounds);

      expect(results.find((r) => r.id === 'a')?.newX).toBe(50);
      expect(results.find((r) => r.id === 'b')?.newX).toBe(150);
    });

    it('should handle elements with different sizes', () => {
      const elements = [
        createElementBounds('small', 100, 100, 20, 20),
        createElementBounds('medium', 200, 100, 50, 50),
        createElementBounds('large', 300, 100, 100, 100),
      ];
      const results = alignCenterHorizontal(elements, canvasBounds);

      // All centers should align to selection center
      // Selection: x=100, width=300, center = 250
      expect(results).toHaveLength(3);
      // Verify all have same center X
      const getCenterX = (id: string): number => {
        const r = results.find((r) => r.id === id);
        const el = elements.find((e) => e.id === id);
        return r ? r.newX + (el?.bounds.width ?? 0) / 2 : 0;
      };
      expect(getCenterX('small')).toBe(getCenterX('medium'));
      expect(getCenterX('medium')).toBe(getCenterX('large'));
    });
  });
});
