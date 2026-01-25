/**
 * Integration tests for alignment and distribution
 * Validates that alignment and distribution operations work end-to-end
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SVGComposer } from '../../src/core/SVGComposer.js';
import type { Transform } from '../../src/core/types.js';
import type { ShapeElement } from '../../src/elements/types.js';

// Helper to create test transforms
function createTestTransform(overrides?: Partial<Transform>): Transform {
  return {
    x: 0,
    y: 0,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    ...overrides,
  };
}

// Helper to create test shape element data (rect for predictable bounds)
function createTestRect(
  x: number,
  y: number,
  width: number,
  height: number,
): Omit<ShapeElement, 'id'> {
  return {
    type: 'shape',
    shapeType: 'rect',
    width,
    height,
    rx: 0,
    fill: '#ff0000',
    stroke: '#000000',
    strokeWidth: 0,
    transform: createTestTransform({ x, y }),
    opacity: 1,
    zIndex: 0,
    locked: false,
    visible: true,
  };
}

describe('Alignment & Distribution Integration', () => {
  let container: HTMLDivElement;
  let editor: SVGComposer;

  beforeEach(() => {
    container = document.createElement('div');
    container.id = 'test-container';
    document.body.appendChild(container);
    editor = new SVGComposer(container, {
      width: 1200,
      height: 1200,
    });
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  // ============================================================
  // Horizontal Alignment
  // ============================================================

  describe('Horizontal Alignment', () => {
    it('should align elements to left edge', () => {
      const id1 = editor.addElement(createTestRect(100, 100, 50, 50));
      const id2 = editor.addElement(createTestRect(200, 200, 50, 50));
      const id3 = editor.addElement(createTestRect(150, 300, 50, 50));

      editor.alignLeft([id1, id2, id3]);

      const el1 = editor.getElement(id1);
      const el2 = editor.getElement(id2);
      const el3 = editor.getElement(id3);

      // All elements should have the same left edge (x position)
      expect(el1?.transform.x).toBe(el2?.transform.x);
      expect(el2?.transform.x).toBe(el3?.transform.x);
    });

    it('should align elements to right edge', () => {
      const id1 = editor.addElement(createTestRect(100, 100, 50, 50));
      const id2 = editor.addElement(createTestRect(200, 200, 100, 50));
      const id3 = editor.addElement(createTestRect(150, 300, 75, 50));

      editor.alignRight([id1, id2, id3]);

      const el1 = editor.getElement(id1);
      const el2 = editor.getElement(id2);
      const el3 = editor.getElement(id3);

      // Right edges should align: x + width should be equal
      const right1 = el1!.transform.x + (el1 as ShapeElement).width!;
      const right2 = el2!.transform.x + (el2 as ShapeElement).width!;
      const right3 = el3!.transform.x + (el3 as ShapeElement).width!;

      expect(right1).toBeCloseTo(right2, 1);
      expect(right2).toBeCloseTo(right3, 1);
    });

    it('should align elements to horizontal center', () => {
      const id1 = editor.addElement(createTestRect(100, 100, 50, 50));
      const id2 = editor.addElement(createTestRect(200, 200, 100, 50));
      const id3 = editor.addElement(createTestRect(150, 300, 75, 50));

      editor.alignCenterHorizontal([id1, id2, id3]);

      const el1 = editor.getElement(id1);
      const el2 = editor.getElement(id2);
      const el3 = editor.getElement(id3);

      // Centers should align: x + width/2 should be equal
      const center1 = el1!.transform.x + (el1 as ShapeElement).width! / 2;
      const center2 = el2!.transform.x + (el2 as ShapeElement).width! / 2;
      const center3 = el3!.transform.x + (el3 as ShapeElement).width! / 2;

      expect(center1).toBeCloseTo(center2, 1);
      expect(center2).toBeCloseTo(center3, 1);
    });
  });

  // ============================================================
  // Vertical Alignment
  // ============================================================

  describe('Vertical Alignment', () => {
    it('should align elements to top edge', () => {
      const id1 = editor.addElement(createTestRect(100, 100, 50, 50));
      const id2 = editor.addElement(createTestRect(200, 200, 50, 50));
      const id3 = editor.addElement(createTestRect(300, 150, 50, 50));

      editor.alignTop([id1, id2, id3]);

      const el1 = editor.getElement(id1);
      const el2 = editor.getElement(id2);
      const el3 = editor.getElement(id3);

      // All elements should have the same top edge (y position)
      expect(el1?.transform.y).toBe(el2?.transform.y);
      expect(el2?.transform.y).toBe(el3?.transform.y);
    });

    it('should align elements to bottom edge', () => {
      const id1 = editor.addElement(createTestRect(100, 100, 50, 50));
      const id2 = editor.addElement(createTestRect(200, 200, 50, 100));
      const id3 = editor.addElement(createTestRect(300, 150, 50, 75));

      editor.alignBottom([id1, id2, id3]);

      const el1 = editor.getElement(id1);
      const el2 = editor.getElement(id2);
      const el3 = editor.getElement(id3);

      // Bottom edges should align: y + height should be equal
      const bottom1 = el1!.transform.y + (el1 as ShapeElement).height!;
      const bottom2 = el2!.transform.y + (el2 as ShapeElement).height!;
      const bottom3 = el3!.transform.y + (el3 as ShapeElement).height!;

      expect(bottom1).toBeCloseTo(bottom2, 1);
      expect(bottom2).toBeCloseTo(bottom3, 1);
    });

    it('should align elements to vertical center', () => {
      const id1 = editor.addElement(createTestRect(100, 100, 50, 50));
      const id2 = editor.addElement(createTestRect(200, 200, 50, 100));
      const id3 = editor.addElement(createTestRect(300, 150, 50, 75));

      editor.alignCenterVertical([id1, id2, id3]);

      const el1 = editor.getElement(id1);
      const el2 = editor.getElement(id2);
      const el3 = editor.getElement(id3);

      // Centers should align: y + height/2 should be equal
      const center1 = el1!.transform.y + (el1 as ShapeElement).height! / 2;
      const center2 = el2!.transform.y + (el2 as ShapeElement).height! / 2;
      const center3 = el3!.transform.y + (el3 as ShapeElement).height! / 2;

      expect(center1).toBeCloseTo(center2, 1);
      expect(center2).toBeCloseTo(center3, 1);
    });
  });

  // ============================================================
  // Center Alignment (Both Axes)
  // ============================================================

  describe('Center Alignment (Both Axes)', () => {
    it('should align elements to center on both axes', () => {
      const id1 = editor.addElement(createTestRect(100, 100, 50, 50));
      const id2 = editor.addElement(createTestRect(200, 200, 100, 100));
      const id3 = editor.addElement(createTestRect(300, 300, 75, 75));

      editor.alignCenter([id1, id2, id3]);

      const el1 = editor.getElement(id1);
      const el2 = editor.getElement(id2);
      const el3 = editor.getElement(id3);

      // Both horizontal and vertical centers should align
      const centerX1 = el1!.transform.x + (el1 as ShapeElement).width! / 2;
      const centerX2 = el2!.transform.x + (el2 as ShapeElement).width! / 2;
      const centerX3 = el3!.transform.x + (el3 as ShapeElement).width! / 2;

      const centerY1 = el1!.transform.y + (el1 as ShapeElement).height! / 2;
      const centerY2 = el2!.transform.y + (el2 as ShapeElement).height! / 2;
      const centerY3 = el3!.transform.y + (el3 as ShapeElement).height! / 2;

      expect(centerX1).toBeCloseTo(centerX2, 1);
      expect(centerX2).toBeCloseTo(centerX3, 1);
      expect(centerY1).toBeCloseTo(centerY2, 1);
      expect(centerY2).toBeCloseTo(centerY3, 1);
    });
  });

  // ============================================================
  // Alignment Relative To
  // ============================================================

  describe('Alignment Relative To', () => {
    it('should align to canvas left edge', () => {
      const id1 = editor.addElement(createTestRect(100, 100, 50, 50));
      const id2 = editor.addElement(createTestRect(200, 200, 50, 50));

      editor.alignLeft([id1, id2], { relativeTo: 'canvas' });

      const el1 = editor.getElement(id1);
      const el2 = editor.getElement(id2);

      // Both should be at x = 0 (canvas left edge)
      expect(el1?.transform.x).toBe(0);
      expect(el2?.transform.x).toBe(0);
    });

    it('should align to canvas center horizontally', () => {
      const id1 = editor.addElement(createTestRect(100, 100, 50, 50));
      const id2 = editor.addElement(createTestRect(200, 200, 100, 50));

      editor.alignCenterHorizontal([id1, id2], { relativeTo: 'canvas' });

      const el1 = editor.getElement(id1);
      const el2 = editor.getElement(id2);

      // Centers should be at canvas center (600)
      const center1 = el1!.transform.x + (el1 as ShapeElement).width! / 2;
      const center2 = el2!.transform.x + (el2 as ShapeElement).width! / 2;

      expect(center1).toBe(600);
      expect(center2).toBe(600);
    });

    it('should align to first element', () => {
      const id1 = editor.addElement(createTestRect(100, 100, 50, 50));
      const id2 = editor.addElement(createTestRect(200, 200, 50, 50));
      const id3 = editor.addElement(createTestRect(300, 300, 50, 50));

      editor.alignLeft([id1, id2, id3], { relativeTo: 'first' });

      const el1 = editor.getElement(id1);
      const el2 = editor.getElement(id2);
      const el3 = editor.getElement(id3);

      // All should align to first element's left edge
      expect(el2?.transform.x).toBe(el1?.transform.x);
      expect(el3?.transform.x).toBe(el1?.transform.x);
    });
  });

  // ============================================================
  // Horizontal Distribution
  // ============================================================

  describe('Horizontal Distribution', () => {
    it('should distribute elements horizontally by center', () => {
      const id1 = editor.addElement(createTestRect(100, 100, 50, 50));
      const id2 = editor.addElement(createTestRect(200, 100, 50, 50));
      const id3 = editor.addElement(createTestRect(500, 100, 50, 50));

      editor.distributeHorizontal([id1, id2, id3]);

      const el1 = editor.getElement(id1);
      const el2 = editor.getElement(id2);
      const el3 = editor.getElement(id3);

      const center1 = el1!.transform.x + (el1 as ShapeElement).width! / 2;
      const center2 = el2!.transform.x + (el2 as ShapeElement).width! / 2;
      const center3 = el3!.transform.x + (el3 as ShapeElement).width! / 2;

      // Centers should be evenly spaced
      const gap1 = center2 - center1;
      const gap2 = center3 - center2;

      expect(gap1).toBeCloseTo(gap2, 1);
    });

    it('should distribute elements with equal gaps', () => {
      const id1 = editor.addElement(createTestRect(100, 100, 50, 50));
      const id2 = editor.addElement(createTestRect(200, 100, 75, 50));
      const id3 = editor.addElement(createTestRect(500, 100, 100, 50));

      editor.distributeHorizontalGaps([id1, id2, id3]);

      const el1 = editor.getElement(id1);
      const el2 = editor.getElement(id2);
      const el3 = editor.getElement(id3);

      // Gaps between elements should be equal
      const right1 = el1!.transform.x + (el1 as ShapeElement).width!;
      const left2 = el2!.transform.x;
      const right2 = el2!.transform.x + (el2 as ShapeElement).width!;
      const left3 = el3!.transform.x;

      const gap1 = left2 - right1;
      const gap2 = left3 - right2;

      expect(gap1).toBeCloseTo(gap2, 1);
    });

    it('should distribute left edges evenly', () => {
      const id1 = editor.addElement(createTestRect(100, 100, 50, 50));
      const id2 = editor.addElement(createTestRect(200, 100, 75, 50));
      const id3 = editor.addElement(createTestRect(500, 100, 100, 50));

      editor.distributeLeft([id1, id2, id3]);

      const el1 = editor.getElement(id1);
      const el2 = editor.getElement(id2);
      const el3 = editor.getElement(id3);

      // Left edges should be evenly spaced
      const gap1 = el2!.transform.x - el1!.transform.x;
      const gap2 = el3!.transform.x - el2!.transform.x;

      expect(gap1).toBeCloseTo(gap2, 1);
    });

    it('should distribute right edges evenly', () => {
      const id1 = editor.addElement(createTestRect(100, 100, 50, 50));
      const id2 = editor.addElement(createTestRect(200, 100, 75, 50));
      const id3 = editor.addElement(createTestRect(500, 100, 100, 50));

      editor.distributeRight([id1, id2, id3]);

      const el1 = editor.getElement(id1);
      const el2 = editor.getElement(id2);
      const el3 = editor.getElement(id3);

      const right1 = el1!.transform.x + (el1 as ShapeElement).width!;
      const right2 = el2!.transform.x + (el2 as ShapeElement).width!;
      const right3 = el3!.transform.x + (el3 as ShapeElement).width!;

      const gap1 = right2 - right1;
      const gap2 = right3 - right2;

      expect(gap1).toBeCloseTo(gap2, 1);
    });
  });

  // ============================================================
  // Vertical Distribution
  // ============================================================

  describe('Vertical Distribution', () => {
    it('should distribute elements vertically by center', () => {
      const id1 = editor.addElement(createTestRect(100, 100, 50, 50));
      const id2 = editor.addElement(createTestRect(100, 200, 50, 50));
      const id3 = editor.addElement(createTestRect(100, 500, 50, 50));

      editor.distributeVertical([id1, id2, id3]);

      const el1 = editor.getElement(id1);
      const el2 = editor.getElement(id2);
      const el3 = editor.getElement(id3);

      const center1 = el1!.transform.y + (el1 as ShapeElement).height! / 2;
      const center2 = el2!.transform.y + (el2 as ShapeElement).height! / 2;
      const center3 = el3!.transform.y + (el3 as ShapeElement).height! / 2;

      // Centers should be evenly spaced
      const gap1 = center2 - center1;
      const gap2 = center3 - center2;

      expect(gap1).toBeCloseTo(gap2, 1);
    });

    it('should distribute elements with equal vertical gaps', () => {
      const id1 = editor.addElement(createTestRect(100, 100, 50, 50));
      const id2 = editor.addElement(createTestRect(100, 200, 50, 75));
      const id3 = editor.addElement(createTestRect(100, 500, 50, 100));

      editor.distributeVerticalGaps([id1, id2, id3]);

      const el1 = editor.getElement(id1);
      const el2 = editor.getElement(id2);
      const el3 = editor.getElement(id3);

      // Gaps between elements should be equal
      const bottom1 = el1!.transform.y + (el1 as ShapeElement).height!;
      const top2 = el2!.transform.y;
      const bottom2 = el2!.transform.y + (el2 as ShapeElement).height!;
      const top3 = el3!.transform.y;

      const gap1 = top2 - bottom1;
      const gap2 = top3 - bottom2;

      expect(gap1).toBeCloseTo(gap2, 1);
    });

    it('should distribute top edges evenly', () => {
      const id1 = editor.addElement(createTestRect(100, 100, 50, 50));
      const id2 = editor.addElement(createTestRect(100, 200, 50, 75));
      const id3 = editor.addElement(createTestRect(100, 500, 50, 100));

      editor.distributeTop([id1, id2, id3]);

      const el1 = editor.getElement(id1);
      const el2 = editor.getElement(id2);
      const el3 = editor.getElement(id3);

      // Top edges should be evenly spaced
      const gap1 = el2!.transform.y - el1!.transform.y;
      const gap2 = el3!.transform.y - el2!.transform.y;

      expect(gap1).toBeCloseTo(gap2, 1);
    });

    it('should distribute bottom edges evenly', () => {
      const id1 = editor.addElement(createTestRect(100, 100, 50, 50));
      const id2 = editor.addElement(createTestRect(100, 200, 50, 75));
      const id3 = editor.addElement(createTestRect(100, 500, 50, 100));

      editor.distributeBottom([id1, id2, id3]);

      const el1 = editor.getElement(id1);
      const el2 = editor.getElement(id2);
      const el3 = editor.getElement(id3);

      const bottom1 = el1!.transform.y + (el1 as ShapeElement).height!;
      const bottom2 = el2!.transform.y + (el2 as ShapeElement).height!;
      const bottom3 = el3!.transform.y + (el3 as ShapeElement).height!;

      const gap1 = bottom2 - bottom1;
      const gap2 = bottom3 - bottom2;

      expect(gap1).toBeCloseTo(gap2, 1);
    });
  });

  // ============================================================
  // Selection-Based Alignment
  // ============================================================

  describe('Selection-Based Alignment', () => {
    it('should align selected elements when no IDs provided', () => {
      const id1 = editor.addElement(createTestRect(100, 100, 50, 50));
      const id2 = editor.addElement(createTestRect(200, 200, 50, 50));
      const id3 = editor.addElement(createTestRect(300, 300, 50, 50));

      editor.select([id1, id2, id3]);
      editor.alignLeft();

      const el1 = editor.getElement(id1);
      const el2 = editor.getElement(id2);
      const el3 = editor.getElement(id3);

      expect(el1?.transform.x).toBe(el2?.transform.x);
      expect(el2?.transform.x).toBe(el3?.transform.x);
    });

    it('should distribute selected elements', () => {
      const id1 = editor.addElement(createTestRect(100, 100, 50, 50));
      const id2 = editor.addElement(createTestRect(200, 100, 50, 50));
      const id3 = editor.addElement(createTestRect(500, 100, 50, 50));

      editor.select([id1, id2, id3]);
      editor.distributeHorizontal();

      const el1 = editor.getElement(id1);
      const el2 = editor.getElement(id2);
      const el3 = editor.getElement(id3);

      const center1 = el1!.transform.x + 25;
      const center2 = el2!.transform.x + 25;
      const center3 = el3!.transform.x + 25;

      const gap1 = center2 - center1;
      const gap2 = center3 - center2;

      expect(gap1).toBeCloseTo(gap2, 1);
    });
  });

  // ============================================================
  // History Integration
  // ============================================================

  describe('History Integration', () => {
    it('should support undo after alignment', () => {
      const id1 = editor.addElement(createTestRect(100, 100, 50, 50));
      const id2 = editor.addElement(createTestRect(200, 200, 50, 50));

      const originalX1 = editor.getElement(id1)?.transform.x;
      const originalX2 = editor.getElement(id2)?.transform.x;

      editor.alignLeft([id1, id2]);

      editor.undo();

      const el1 = editor.getElement(id1);
      const el2 = editor.getElement(id2);

      expect(el1?.transform.x).toBe(originalX1);
      expect(el2?.transform.x).toBe(originalX2);
    });

    it('should support redo after alignment undo', () => {
      const id1 = editor.addElement(createTestRect(100, 100, 50, 50));
      const id2 = editor.addElement(createTestRect(200, 200, 50, 50));

      editor.alignLeft([id1, id2]);

      const alignedX = editor.getElement(id1)?.transform.x;

      editor.undo();
      editor.redo();

      expect(editor.getElement(id1)?.transform.x).toBe(alignedX);
      expect(editor.getElement(id2)?.transform.x).toBe(alignedX);
    });
  });

  // ============================================================
  // Edge Cases
  // ============================================================

  describe('Edge Cases', () => {
    it('should handle alignment with single element', () => {
      const id1 = editor.addElement(createTestRect(100, 100, 50, 50));

      // Should not throw
      expect(() => {
        editor.alignLeft([id1]);
      }).not.toThrow();
    });

    it('should handle distribution with two elements', () => {
      const id1 = editor.addElement(createTestRect(100, 100, 50, 50));
      const id2 = editor.addElement(createTestRect(300, 100, 50, 50));

      // Distribution with 2 elements should work but may not change positions
      expect(() => {
        editor.distributeHorizontal([id1, id2]);
      }).not.toThrow();
    });

    it('should handle alignment with overlapping elements', () => {
      const id1 = editor.addElement(createTestRect(100, 100, 100, 100));
      const id2 = editor.addElement(createTestRect(150, 150, 100, 100));

      editor.alignLeft([id1, id2]);

      const el1 = editor.getElement(id1);
      const el2 = editor.getElement(id2);

      expect(el1?.transform.x).toBe(el2?.transform.x);
    });

    it('should handle alignment with elements at same position', () => {
      const id1 = editor.addElement(createTestRect(100, 100, 50, 50));
      const id2 = editor.addElement(createTestRect(100, 100, 50, 50));

      editor.alignLeft([id1, id2]);

      const el1 = editor.getElement(id1);
      const el2 = editor.getElement(id2);

      expect(el1?.transform.x).toBe(el2?.transform.x);
    });

    it('should handle distribution with elements of varying sizes', () => {
      const id1 = editor.addElement(createTestRect(100, 100, 25, 50));
      const id2 = editor.addElement(createTestRect(200, 100, 100, 50));
      const id3 = editor.addElement(createTestRect(500, 100, 50, 50));

      editor.distributeHorizontalGaps([id1, id2, id3]);

      const el1 = editor.getElement(id1);
      const el2 = editor.getElement(id2);
      const el3 = editor.getElement(id3);

      // Verify gaps are equal regardless of element sizes
      const right1 = el1!.transform.x + 25;
      const left2 = el2!.transform.x;
      const right2 = el2!.transform.x + 100;
      const left3 = el3!.transform.x;

      const gap1 = left2 - right1;
      const gap2 = left3 - right2;

      expect(gap1).toBeCloseTo(gap2, 1);
    });
  });
});
