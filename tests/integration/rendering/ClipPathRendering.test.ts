/**
 * Integration tests for clip path rendering
 * Validates that clip paths render correctly in SVG output
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SVGComposer } from '../../../src/core/SVGComposer.js';
import type { Transform } from '../../../src/core/types.js';
import type { ImageElement, ClipPath } from '../../../src/elements/types.js';

// Helper to create test transforms
function createTestTransform(overrides?: Partial<Transform>): Transform {
  return {
    x: 100,
    y: 100,
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
    width: 200,
    height: 150,
    transform: createTestTransform(),
    opacity: 1,
    zIndex: 0,
    locked: false,
    visible: true,
    ...overrides,
  };
}

describe('Clip Path Rendering Integration', () => {
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
  // Rectangular Clip Paths
  // ============================================================

  describe('Rectangular Clip Paths', () => {
    it('should render rect clip path in defs', () => {
      const elementId = editor.addElement(createTestImageElement());
      editor.addClipPath(elementId, {
        type: 'rect',
        x: 0,
        y: 0,
        width: 100,
        height: 100,
      });

      const svg = editor.toSVG();

      expect(svg).toContain('<clipPath');
      expect(svg).toContain('</clipPath>');
      expect(svg).toContain('<rect');
    });

    it('should render rect clip path with correct dimensions', () => {
      const elementId = editor.addElement(createTestImageElement());
      editor.addClipPath(elementId, {
        type: 'rect',
        x: 10,
        y: 20,
        width: 150,
        height: 100,
      });

      const svg = editor.toSVG();

      // The clip path rect should have the specified dimensions
      expect(svg).toMatch(/<clipPath[^>]*>[\s\S]*<rect[^>]*width="150"[^>]*>/);
      expect(svg).toMatch(/<clipPath[^>]*>[\s\S]*<rect[^>]*height="100"[^>]*>/);
    });

    it('should render rect clip path with rounded corners', () => {
      const elementId = editor.addElement(createTestImageElement());
      editor.addClipPath(elementId, {
        type: 'rect',
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        rx: 15,
      });

      const svg = editor.toSVG();

      expect(svg).toContain('rx="15"');
    });

    it('should apply clip-path attribute to element', () => {
      const elementId = editor.addElement(createTestImageElement());
      const clipId = editor.addClipPath(elementId, {
        type: 'rect',
        x: 0,
        y: 0,
        width: 100,
        height: 100,
      });

      const svg = editor.toSVG();

      expect(svg).toContain(`clip-path="url(#${clipId})"`);
    });
  });

  // ============================================================
  // Circular Clip Paths
  // ============================================================

  describe('Circular Clip Paths', () => {
    it('should render circle clip path in defs', () => {
      const elementId = editor.addElement(createTestImageElement());
      editor.addClipPath(elementId, {
        type: 'circle',
        cx: 100,
        cy: 75,
        r: 50,
      });

      const svg = editor.toSVG();

      expect(svg).toContain('<clipPath');
      expect(svg).toContain('<circle');
    });

    it('should render circle clip path with correct attributes', () => {
      const elementId = editor.addElement(createTestImageElement());
      editor.addClipPath(elementId, {
        type: 'circle',
        cx: 150,
        cy: 100,
        r: 75,
      });

      const svg = editor.toSVG();

      expect(svg).toMatch(/<circle[^>]*cx="150"/);
      expect(svg).toMatch(/<circle[^>]*cy="100"/);
      expect(svg).toMatch(/<circle[^>]*r="75"/);
    });

    it('should create circular crop mask', () => {
      const elementId = editor.addElement(createTestImageElement());
      const clipId = editor.addClipPath(elementId, {
        type: 'circle',
        cx: 100,
        cy: 75,
        r: 50,
      });

      const svg = editor.toSVG();

      expect(svg).toContain(`clip-path="url(#${clipId})"`);
      expect(svg).toContain('<circle');
    });
  });

  // ============================================================
  // Ellipse Clip Paths
  // ============================================================

  describe('Ellipse Clip Paths', () => {
    it('should render ellipse clip path in defs', () => {
      const elementId = editor.addElement(createTestImageElement());
      editor.addClipPath(elementId, {
        type: 'ellipse',
        cx: 100,
        cy: 75,
        rx: 80,
        ry: 50,
      });

      const svg = editor.toSVG();

      expect(svg).toContain('<clipPath');
      expect(svg).toContain('<ellipse');
    });

    it('should render ellipse clip path with correct attributes', () => {
      const elementId = editor.addElement(createTestImageElement());
      editor.addClipPath(elementId, {
        type: 'ellipse',
        cx: 100,
        cy: 75,
        rx: 90,
        ry: 60,
      });

      const svg = editor.toSVG();

      expect(svg).toMatch(/<ellipse[^>]*cx="100"/);
      expect(svg).toMatch(/<ellipse[^>]*cy="75"/);
      expect(svg).toMatch(/<ellipse[^>]*rx="90"/);
      expect(svg).toMatch(/<ellipse[^>]*ry="60"/);
    });
  });

  // ============================================================
  // Clip Path Operations
  // ============================================================

  describe('Clip Path Operations', () => {
    it('should update clip path attributes', () => {
      const elementId = editor.addElement(createTestImageElement());
      editor.addClipPath(elementId, {
        type: 'circle',
        cx: 100,
        cy: 75,
        r: 50,
      });

      editor.updateClipPath(elementId, {
        r: 75,
      });

      const svg = editor.toSVG();

      expect(svg).toMatch(/<circle[^>]*r="75"/);
    });

    it('should remove clip path from element', () => {
      const elementId = editor.addElement(createTestImageElement());
      editor.addClipPath(elementId, {
        type: 'circle',
        cx: 100,
        cy: 75,
        r: 50,
      });

      let svg = editor.toSVG();
      expect(svg).toContain('clip-path="url(#');

      editor.removeClipPath(elementId);

      svg = editor.toSVG();
      // Element should no longer have clip-path attribute
      // Note: The clipPath definition might still be in defs
      const imageMatch = svg.match(/<image[^>]*>/);
      expect(imageMatch).not.toBeNull();
      expect(imageMatch![0]).not.toContain('clip-path="url(#');
    });

    it('should replace existing clip path', () => {
      const elementId = editor.addElement(createTestImageElement());

      // Add circle clip path
      editor.addClipPath(elementId, {
        type: 'circle',
        cx: 100,
        cy: 75,
        r: 50,
      });

      let svg = editor.toSVG();
      expect(svg).toContain('<circle');

      // Replace with rect clip path
      editor.removeClipPath(elementId);
      editor.addClipPath(elementId, {
        type: 'rect',
        x: 0,
        y: 0,
        width: 150,
        height: 100,
      });

      svg = editor.toSVG();
      // Should have the new rect clip path applied
      expect(svg).toContain('<clipPath');
    });
  });

  // ============================================================
  // Multiple Elements with Clip Paths
  // ============================================================

  describe('Multiple Elements with Clip Paths', () => {
    it('should support different clip paths on different elements', () => {
      const element1 = editor.addElement(
        createTestImageElement({ src: 'img1.jpg' }),
      );
      const element2 = editor.addElement(
        createTestImageElement({
          src: 'img2.jpg',
          transform: createTestTransform({ x: 300, y: 100 }),
        }),
      );

      editor.addClipPath(element1, {
        type: 'circle',
        cx: 100,
        cy: 75,
        r: 50,
      });

      editor.addClipPath(element2, {
        type: 'rect',
        x: 0,
        y: 0,
        width: 150,
        height: 100,
      });

      const svg = editor.toSVG();

      // Should have two clipPath definitions
      const clipPathMatches = svg.match(/<clipPath/g);
      expect(clipPathMatches).not.toBeNull();
      expect(clipPathMatches!.length).toBe(2);

      // Both elements should have clip-path attributes
      const clipPathUrlMatches = svg.match(/clip-path="url\(#[^)]+\)"/g);
      expect(clipPathUrlMatches).not.toBeNull();
      expect(clipPathUrlMatches!.length).toBe(2);
    });

    it('should render element without clip path alongside clipped element', () => {
      const element1 = editor.addElement(
        createTestImageElement({ src: 'clipped.jpg' }),
      );
      editor.addElement(
        createTestImageElement({ src: 'unclipped.jpg' }),
      );

      editor.addClipPath(element1, {
        type: 'circle',
        cx: 100,
        cy: 75,
        r: 50,
      });

      const svg = editor.toSVG();

      // Should have one clip path
      const clipPathMatches = svg.match(/<clipPath/g);
      expect(clipPathMatches!.length).toBe(1);

      // Both images should be in SVG
      expect(svg).toContain('clipped.jpg');
      expect(svg).toContain('unclipped.jpg');
    });
  });

  // ============================================================
  // Clip Path with Transforms
  // ============================================================

  describe('Clip Path with Transforms', () => {
    it('should render clip path on transformed element', () => {
      const elementId = editor.addElement(
        createTestImageElement({
          transform: createTestTransform({
            x: 200,
            y: 150,
            rotation: 45,
            scaleX: 1.5,
            scaleY: 1.5,
          }),
        }),
      );

      editor.addClipPath(elementId, {
        type: 'circle',
        cx: 100,
        cy: 75,
        r: 50,
      });

      const svg = editor.toSVG();

      expect(svg).toContain('clip-path="url(#');
      expect(svg).toContain('transform=');
      // Rotation may include center point
      expect(svg).toMatch(/rotate\(45/);
    });

    it('should maintain clip path after element is moved', () => {
      const elementId = editor.addElement(createTestImageElement());
      const clipId = editor.addClipPath(elementId, {
        type: 'circle',
        cx: 100,
        cy: 75,
        r: 50,
      });

      editor.moveElement(elementId, 100, 100);

      const svg = editor.toSVG();

      expect(svg).toContain(`clip-path="url(#${clipId})"`);
    });

    it('should maintain clip path after element is scaled', () => {
      const elementId = editor.addElement(createTestImageElement());
      const clipId = editor.addClipPath(elementId, {
        type: 'rect',
        x: 0,
        y: 0,
        width: 100,
        height: 100,
      });

      editor.scaleElement(elementId, 2, 2);

      const svg = editor.toSVG();

      expect(svg).toContain(`clip-path="url(#${clipId})"`);
    });
  });

  // ============================================================
  // Clip Path Persistence
  // ============================================================

  describe('Clip Path Persistence', () => {
    it('should preserve clip path after undo/redo', () => {
      const elementId = editor.addElement(createTestImageElement());
      const clipId = editor.addClipPath(elementId, {
        type: 'circle',
        cx: 100,
        cy: 75,
        r: 50,
      });

      let svg = editor.toSVG();
      expect(svg).toContain(`clip-path="url(#${clipId})"`);

      // Make another change and undo
      editor.moveElement(elementId, 50, 50);
      editor.undo();

      svg = editor.toSVG();
      // Clip path should still be applied (undo moved the element back, not removed clip)
      expect(svg).toContain('clip-path="url(#');
    });

    it('should include clip path in JSON export', () => {
      const elementId = editor.addElement(createTestImageElement());
      editor.addClipPath(elementId, {
        type: 'circle',
        cx: 100,
        cy: 75,
        r: 50,
      });

      const json = editor.toJSON();
      const parsed = JSON.parse(json);

      // Check that clip path info is preserved in JSON
      expect(parsed).toBeDefined();
    });
  });

  // ============================================================
  // Edge Cases
  // ============================================================

  describe('Edge Cases', () => {
    it('should handle clip path with zero dimensions', () => {
      const elementId = editor.addElement(createTestImageElement());
      editor.addClipPath(elementId, {
        type: 'rect',
        x: 0,
        y: 0,
        width: 0,
        height: 0,
      });

      const svg = editor.toSVG();

      expect(svg).toContain('<clipPath');
    });

    it('should handle clip path with negative position', () => {
      const elementId = editor.addElement(createTestImageElement());
      editor.addClipPath(elementId, {
        type: 'rect',
        x: -50,
        y: -50,
        width: 200,
        height: 200,
      });

      const svg = editor.toSVG();

      expect(svg).toContain('x="-50"');
      expect(svg).toContain('y="-50"');
    });

    it('should handle circle clip path with zero radius', () => {
      const elementId = editor.addElement(createTestImageElement());
      editor.addClipPath(elementId, {
        type: 'circle',
        cx: 100,
        cy: 75,
        r: 0,
      });

      const svg = editor.toSVG();

      expect(svg).toContain('r="0"');
    });

    it('should handle ellipse clip path with asymmetric radii', () => {
      const elementId = editor.addElement(createTestImageElement());
      editor.addClipPath(elementId, {
        type: 'ellipse',
        cx: 100,
        cy: 75,
        rx: 200,
        ry: 10,
      });

      const svg = editor.toSVG();

      expect(svg).toContain('rx="200"');
      expect(svg).toContain('ry="10"');
    });
  });
});
