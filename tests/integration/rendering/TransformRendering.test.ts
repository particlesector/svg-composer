/**
 * Integration tests for transform rendering
 * Validates that transforms (translate, rotate, scale) render correctly in SVG output
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SVGComposer } from '../../../src/core/SVGComposer.js';
import type { Transform } from '../../../src/core/types.js';
import type { ImageElement } from '../../../src/elements/types.js';

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

describe('Transform Rendering Integration', () => {
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
  // Translation Transforms
  // ============================================================

  describe('Translation Transforms', () => {
    it('should render translate transform', () => {
      editor.addElement(
        createTestImageElement({
          transform: createTestTransform({ x: 100, y: 200 }),
        }),
      );

      const svg = editor.toSVG();

      expect(svg).toContain('translate(100');
      expect(svg).toMatch(/translate\(100[,\s]+200\)/);
    });

    it('should render zero translation', () => {
      editor.addElement(
        createTestImageElement({
          transform: createTestTransform({ x: 0, y: 0 }),
        }),
      );

      const svg = editor.toSVG();

      // Zero/identity transforms are typically omitted for optimization
      // The element should still be rendered
      expect(svg).toContain('<image');
    });

    it('should render negative translation', () => {
      editor.addElement(
        createTestImageElement({
          transform: createTestTransform({ x: -50, y: -100 }),
        }),
      );

      const svg = editor.toSVG();

      expect(svg).toContain('-50');
      expect(svg).toContain('-100');
    });

    it('should update position after moveElement', () => {
      const elementId = editor.addElement(
        createTestImageElement({
          transform: createTestTransform({ x: 100, y: 100 }),
        }),
      );

      editor.moveElement(elementId, 50, 75);

      const svg = editor.toSVG();

      // Position should be 100+50=150, 100+75=175
      expect(svg).toContain('translate(150');
    });

    it('should set absolute position after setPosition', () => {
      const elementId = editor.addElement(
        createTestImageElement({
          transform: createTestTransform({ x: 100, y: 100 }),
        }),
      );

      editor.setPosition(elementId, 500, 400);

      const svg = editor.toSVG();

      expect(svg).toContain('translate(500');
    });
  });

  // ============================================================
  // Rotation Transforms
  // ============================================================

  describe('Rotation Transforms', () => {
    it('should render rotation transform', () => {
      editor.addElement(
        createTestImageElement({
          transform: createTestTransform({ rotation: 45 }),
        }),
      );

      const svg = editor.toSVG();

      // Rotation may include center point: rotate(angle) or rotate(angle, cx, cy)
      expect(svg).toMatch(/rotate\(45/);
    });

    it('should render zero rotation', () => {
      editor.addElement(
        createTestImageElement({
          transform: createTestTransform({ rotation: 0 }),
        }),
      );

      const svg = editor.toSVG();

      // Zero rotation is typically omitted for optimization
      expect(svg).toContain('<image');
    });

    it('should render negative rotation', () => {
      editor.addElement(
        createTestImageElement({
          transform: createTestTransform({ rotation: -30 }),
        }),
      );

      const svg = editor.toSVG();

      // Rotation may include center point: rotate(angle) or rotate(angle, cx, cy)
      expect(svg).toMatch(/rotate\(-30/);
    });

    it('should render full rotation (360)', () => {
      editor.addElement(
        createTestImageElement({
          transform: createTestTransform({ rotation: 360 }),
        }),
      );

      const svg = editor.toSVG();

      // Rotation may include center point
      expect(svg).toMatch(/rotate\(360/);
    });

    it('should render rotation greater than 360', () => {
      editor.addElement(
        createTestImageElement({
          transform: createTestTransform({ rotation: 450 }),
        }),
      );

      const svg = editor.toSVG();

      // Rotation may include center point
      expect(svg).toMatch(/rotate\(450/);
    });

    it('should update rotation after rotateElement', () => {
      const elementId = editor.addElement(
        createTestImageElement({
          transform: createTestTransform({ rotation: 0 }),
        }),
      );

      editor.rotateElement(elementId, 90);

      const svg = editor.toSVG();

      // Rotation may include center point: rotate(angle) or rotate(angle, cx, cy)
      expect(svg).toMatch(/rotate\(90/);
    });

    it('should set absolute rotation (not accumulate)', () => {
      const elementId = editor.addElement(
        createTestImageElement({
          transform: createTestTransform({ rotation: 0 }),
        }),
      );

      // rotateElement sets absolute rotation, not relative
      editor.rotateElement(elementId, 45);
      editor.rotateElement(elementId, 90); // This sets to 90, not 45+90

      const svg = editor.toSVG();

      // Should be 90 (the last set value)
      expect(svg).toMatch(/rotate\(90/);
    });
  });

  // ============================================================
  // Scale Transforms
  // ============================================================

  describe('Scale Transforms', () => {
    it('should render scale transform', () => {
      editor.addElement(
        createTestImageElement({
          transform: createTestTransform({ scaleX: 2, scaleY: 2 }),
        }),
      );

      const svg = editor.toSVG();

      expect(svg).toContain('scale(2');
    });

    it('should render non-uniform scale', () => {
      editor.addElement(
        createTestImageElement({
          transform: createTestTransform({ scaleX: 1.5, scaleY: 0.5 }),
        }),
      );

      const svg = editor.toSVG();

      expect(svg).toMatch(/scale\(1\.5[,\s]+0\.5\)/);
    });

    it('should render identity scale (1,1)', () => {
      editor.addElement(
        createTestImageElement({
          transform: createTestTransform({ scaleX: 1, scaleY: 1 }),
        }),
      );

      const svg = editor.toSVG();

      // Identity transforms are typically omitted for optimization
      // The element should still be rendered
      expect(svg).toContain('<image');
    });

    it('should render scale less than 1 (shrink)', () => {
      editor.addElement(
        createTestImageElement({
          transform: createTestTransform({ scaleX: 0.5, scaleY: 0.5 }),
        }),
      );

      const svg = editor.toSVG();

      expect(svg).toContain('scale(0.5');
    });

    it('should render negative scale (flip)', () => {
      editor.addElement(
        createTestImageElement({
          transform: createTestTransform({ scaleX: -1, scaleY: 1 }),
        }),
      );

      const svg = editor.toSVG();

      expect(svg).toMatch(/scale\(-1[,\s]+1\)/);
    });

    it('should update scale after scaleElement', () => {
      const elementId = editor.addElement(
        createTestImageElement({
          transform: createTestTransform({ scaleX: 1, scaleY: 1 }),
        }),
      );

      editor.scaleElement(elementId, 3, 2);

      const svg = editor.toSVG();

      expect(svg).toMatch(/scale\(3[,\s]+2\)/);
    });
  });

  // ============================================================
  // Combined Transforms
  // ============================================================

  describe('Combined Transforms', () => {
    it('should render translate and rotate combined', () => {
      editor.addElement(
        createTestImageElement({
          transform: createTestTransform({ x: 100, y: 100, rotation: 45 }),
        }),
      );

      const svg = editor.toSVG();

      expect(svg).toContain('translate(100');
      // Rotation may include center point: rotate(angle) or rotate(angle, cx, cy)
      expect(svg).toMatch(/rotate\(45/);
    });

    it('should render translate and scale combined', () => {
      editor.addElement(
        createTestImageElement({
          transform: createTestTransform({ x: 200, y: 150, scaleX: 2, scaleY: 2 }),
        }),
      );

      const svg = editor.toSVG();

      expect(svg).toContain('translate(200');
      expect(svg).toContain('scale(2');
    });

    it('should render rotate and scale combined', () => {
      editor.addElement(
        createTestImageElement({
          transform: createTestTransform({ rotation: 30, scaleX: 1.5, scaleY: 1.5 }),
        }),
      );

      const svg = editor.toSVG();

      // Rotation includes center point: rotate(angle, cx, cy)
      expect(svg).toMatch(/rotate\(30,?\s/);
      expect(svg).toContain('scale(1.5');
    });

    it('should render all transforms combined', () => {
      editor.addElement(
        createTestImageElement({
          transform: createTestTransform({
            x: 300,
            y: 200,
            rotation: 60,
            scaleX: 2,
            scaleY: 1.5,
          }),
        }),
      );

      const svg = editor.toSVG();

      expect(svg).toContain('translate(300');
      // Rotation includes center point: rotate(angle, cx, cy)
      expect(svg).toMatch(/rotate\(60,?\s/);
      expect(svg).toContain('scale(2');
    });

    it('should maintain correct transform order (translate, rotate, scale)', () => {
      editor.addElement(
        createTestImageElement({
          transform: createTestTransform({
            x: 100,
            y: 100,
            rotation: 45,
            scaleX: 2,
            scaleY: 2,
          }),
        }),
      );

      const svg = editor.toSVG();

      // Transform order should be translate, rotate, scale
      const translatePos = svg.indexOf('translate');
      const rotatePos = svg.indexOf('rotate');
      const scalePos = svg.indexOf('scale');

      expect(translatePos).toBeLessThan(rotatePos);
      expect(rotatePos).toBeLessThan(scalePos);
    });
  });

  // ============================================================
  // Transform Operations via API
  // ============================================================

  describe('Transform Operations via API', () => {
    it('should reset all transforms', () => {
      const elementId = editor.addElement(
        createTestImageElement({
          transform: createTestTransform({
            x: 100,
            y: 100,
            rotation: 45,
            scaleX: 2,
            scaleY: 2,
          }),
        }),
      );

      editor.resetTransform(elementId);

      const element = editor.getElement(elementId);

      expect(element?.transform.x).toBe(0);
      expect(element?.transform.y).toBe(0);
      expect(element?.transform.rotation).toBe(0);
      expect(element?.transform.scaleX).toBe(1);
      expect(element?.transform.scaleY).toBe(1);
    });

    it('should preserve transform after undo/redo cycle', () => {
      const elementId = editor.addElement(
        createTestImageElement({
          transform: createTestTransform({ x: 100, y: 100 }),
        }),
      );

      editor.moveElement(elementId, 50, 50);
      const svgAfterMove = editor.toSVG();

      editor.undo();
      const svgAfterUndo = editor.toSVG();

      editor.redo();
      const svgAfterRedo = editor.toSVG();

      // After redo, should match after move
      expect(svgAfterRedo).toBe(svgAfterMove);
      expect(svgAfterUndo).not.toBe(svgAfterMove);
    });
  });

  // ============================================================
  // Group Transforms
  // ============================================================

  describe('Group Transforms', () => {
    it('should render group with transform', () => {
      const childId1 = editor.addElement(createTestImageElement());
      const childId2 = editor.addElement(createTestImageElement({ src: 'img2.jpg' }));
      const groupId = editor.createGroup([childId1, childId2]);

      editor.setPosition(groupId, 200, 150);

      const svg = editor.toSVG();

      expect(svg).toContain('<g');
      expect(svg).toContain('translate(200');
    });

    it('should apply group transform to children', () => {
      const childId1 = editor.addElement(
        createTestImageElement({
          transform: createTestTransform({ x: 50, y: 50 }),
        }),
      );
      const childId2 = editor.addElement(createTestImageElement({ src: 'img2.jpg' }));
      const groupId = editor.createGroup([childId1, childId2]);

      editor.setPosition(groupId, 100, 100);

      const svg = editor.toSVG();

      // Both group and child should have transforms
      expect(svg).toContain('<g');
    });

    it('should rotate group affecting all children', () => {
      const child1 = editor.addElement(createTestImageElement({ src: 'img1.jpg' }));
      const child2 = editor.addElement(createTestImageElement({ src: 'img2.jpg' }));
      const groupId = editor.createGroup([child1, child2]);

      editor.rotateElement(groupId, 45);

      const svg = editor.toSVG();

      // Group rotation may be rotate(angle) or rotate(angle, cx, cy)
      expect(svg).toMatch(/rotate\(45/);
    });
  });

  // ============================================================
  // Decimal Precision
  // ============================================================

  describe('Decimal Precision', () => {
    it('should handle decimal translation values', () => {
      editor.addElement(
        createTestImageElement({
          transform: createTestTransform({ x: 100.5, y: 200.75 }),
        }),
      );

      const svg = editor.toSVG();

      expect(svg).toContain('100.5');
      expect(svg).toContain('200.75');
    });

    it('should handle decimal rotation values', () => {
      editor.addElement(
        createTestImageElement({
          transform: createTestTransform({ rotation: 45.5 }),
        }),
      );

      const svg = editor.toSVG();

      // Rotation includes center point: rotate(angle, cx, cy)
      expect(svg).toMatch(/rotate\(45\.5,?\s/);
    });

    it('should handle decimal scale values', () => {
      editor.addElement(
        createTestImageElement({
          transform: createTestTransform({ scaleX: 1.25, scaleY: 0.75 }),
        }),
      );

      const svg = editor.toSVG();

      expect(svg).toContain('1.25');
      expect(svg).toContain('0.75');
    });
  });

  // ============================================================
  // Edge Cases
  // ============================================================

  describe('Edge Cases', () => {
    it('should handle very large translation values', () => {
      editor.addElement(
        createTestImageElement({
          transform: createTestTransform({ x: 10000, y: 10000 }),
        }),
      );

      const svg = editor.toSVG();

      expect(svg).toContain('10000');
    });

    it('should handle very small scale values', () => {
      editor.addElement(
        createTestImageElement({
          transform: createTestTransform({ scaleX: 0.001, scaleY: 0.001 }),
        }),
      );

      const svg = editor.toSVG();

      expect(svg).toContain('0.001');
    });

    it('should handle zero scale', () => {
      editor.addElement(
        createTestImageElement({
          transform: createTestTransform({ scaleX: 0, scaleY: 0 }),
        }),
      );

      const svg = editor.toSVG();

      expect(svg).toContain('scale(0');
    });
  });
});
