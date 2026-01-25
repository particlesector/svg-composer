/**
 * Integration tests for element rendering
 * Validates that all element types render correctly in SVG output
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SVGComposer } from '../../../src/core/SVGComposer.js';
import type { Transform } from '../../../src/core/types.js';
import type {
  ImageElement,
  TextElement,
  ShapeElement,
  GroupElement,
} from '../../../src/elements/types.js';

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

// Helper to create test text element data
function createTestTextElement(
  overrides?: Partial<Omit<TextElement, 'id'>>,
): Omit<TextElement, 'id'> {
  return {
    type: 'text',
    content: 'Hello World',
    fontSize: 24,
    fontFamily: 'Arial, sans-serif',
    fill: '#333333',
    textAnchor: 'start',
    transform: createTestTransform(),
    opacity: 1,
    zIndex: 0,
    locked: false,
    visible: true,
    ...overrides,
  };
}

// Helper to create test shape element data
function createTestShapeElement(
  shapeType: 'rect' | 'circle' | 'ellipse' | 'path',
  overrides?: Partial<Omit<ShapeElement, 'id' | 'type'>>,
): Omit<ShapeElement, 'id'> {
  const base = {
    type: 'shape' as const,
    shapeType,
    fill: '#ff0000',
    stroke: '#000000',
    strokeWidth: 2,
    transform: createTestTransform(),
    opacity: 1,
    zIndex: 0,
    locked: false,
    visible: true,
  };

  switch (shapeType) {
    case 'rect':
      return { ...base, width: 100, height: 80, rx: 0, ...overrides };
    case 'circle':
      return { ...base, r: 50, ...overrides };
    case 'ellipse':
      return { ...base, rx: 60, ry: 40, ...overrides };
    case 'path':
      return { ...base, path: 'M 0 0 L 100 0 L 50 100 Z', ...overrides };
    default:
      return { ...base, ...overrides };
  }
}

describe('Element Rendering Integration', () => {
  let container: HTMLDivElement;
  let editor: SVGComposer;

  beforeEach(() => {
    container = document.createElement('div');
    container.id = 'test-container';
    document.body.appendChild(container);
    editor = new SVGComposer(container, {
      width: 1200,
      height: 1200,
      backgroundColor: '#ffffff',
    });
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  // ============================================================
  // SVG Document Structure
  // ============================================================

  describe('SVG Document Structure', () => {
    it('should render valid SVG with correct namespace', () => {
      const svg = editor.toSVG();

      expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
      expect(svg).toMatch(/<svg[^>]*>/);
      expect(svg).toMatch(/<\/svg>/);
    });

    it('should render viewBox attribute', () => {
      const svg = editor.toSVG();

      expect(svg).toContain('viewBox="0 0 1200 1200"');
    });

    it('should render background rect with correct color', () => {
      const svg = editor.toSVG();

      expect(svg).toContain('<rect');
      expect(svg).toContain('fill="#ffffff"');
      // Background rect may use percentage or absolute dimensions
      expect(svg).toMatch(/width="(1200|100%)"/);
      expect(svg).toMatch(/height="(1200|100%)"/);
    });

    it('should render defs section for filters and clip paths', () => {
      const elementId = editor.addElement(createTestImageElement());
      editor.addClipPath(elementId, {
        type: 'circle',
        cx: 100,
        cy: 75,
        r: 50,
      });

      const svg = editor.toSVG();

      expect(svg).toContain('<defs>');
      expect(svg).toContain('</defs>');
    });
  });

  // ============================================================
  // Image Element Rendering
  // ============================================================

  describe('Image Element Rendering', () => {
    it('should render image element with correct attributes', () => {
      editor.addElement(createTestImageElement());

      const svg = editor.toSVG();

      expect(svg).toContain('<image');
      expect(svg).toContain('href="test.jpg"');
      expect(svg).toContain('width="200"');
      expect(svg).toContain('height="150"');
    });

    it('should render image with transform', () => {
      editor.addElement(
        createTestImageElement({
          transform: createTestTransform({ x: 200, y: 150 }),
        }),
      );

      const svg = editor.toSVG();

      expect(svg).toContain('transform=');
      expect(svg).toContain('translate(200');
      expect(svg).toContain('150');
    });

    it('should render image with opacity', () => {
      editor.addElement(
        createTestImageElement({
          opacity: 0.5,
        }),
      );

      const svg = editor.toSVG();

      expect(svg).toContain('opacity="0.5"');
    });

    it('should not render invisible image', () => {
      editor.addElement(
        createTestImageElement({
          visible: false,
        }),
      );

      const svg = editor.toSVG();

      // Background rect is still there, but no image element
      const imageMatches = svg.match(/<image[^>]*>/g);
      expect(imageMatches).toBeNull();
    });

    it('should render multiple images with correct z-order', () => {
      editor.addElement(
        createTestImageElement({
          src: 'image1.jpg',
          zIndex: 1,
        }),
      );
      editor.addElement(
        createTestImageElement({
          src: 'image2.jpg',
          zIndex: 2,
        }),
      );
      editor.addElement(
        createTestImageElement({
          src: 'image3.jpg',
          zIndex: 0,
        }),
      );

      const svg = editor.toSVG();

      // Images should appear in z-order (0, 1, 2)
      const image1Pos = svg.indexOf('image1.jpg');
      const image2Pos = svg.indexOf('image2.jpg');
      const image3Pos = svg.indexOf('image3.jpg');

      expect(image3Pos).toBeLessThan(image1Pos); // zIndex 0 before zIndex 1
      expect(image1Pos).toBeLessThan(image2Pos); // zIndex 1 before zIndex 2
    });
  });

  // ============================================================
  // Text Element Rendering
  // ============================================================

  describe('Text Element Rendering', () => {
    it('should render text element with content', () => {
      editor.addElement(createTestTextElement());

      const svg = editor.toSVG();

      expect(svg).toContain('<text');
      expect(svg).toContain('>Hello World</text>');
    });

    it('should render text with font properties', () => {
      editor.addElement(
        createTestTextElement({
          fontSize: 32,
          fontFamily: 'Georgia, serif',
          fill: '#0000ff',
        }),
      );

      const svg = editor.toSVG();

      expect(svg).toContain('font-size="32"');
      expect(svg).toContain('font-family="Georgia, serif"');
      expect(svg).toContain('fill="#0000ff"');
    });

    it('should render text with text-anchor', () => {
      editor.addElement(
        createTestTextElement({
          textAnchor: 'middle',
        }),
      );

      const svg = editor.toSVG();

      expect(svg).toContain('text-anchor="middle"');
    });

    it('should render text with start anchor', () => {
      editor.addElement(
        createTestTextElement({
          textAnchor: 'start',
        }),
      );

      const svg = editor.toSVG();

      expect(svg).toContain('text-anchor="start"');
    });

    it('should render text with end anchor', () => {
      editor.addElement(
        createTestTextElement({
          textAnchor: 'end',
        }),
      );

      const svg = editor.toSVG();

      expect(svg).toContain('text-anchor="end"');
    });

    it('should escape special characters in text content', () => {
      editor.addElement(
        createTestTextElement({
          content: '<script>alert("XSS")</script>',
        }),
      );

      const svg = editor.toSVG();

      // Should be escaped, not raw HTML
      expect(svg).not.toContain('<script>');
      expect(svg).toContain('&lt;script&gt;');
    });

    it('should render text with transform', () => {
      editor.addElement(
        createTestTextElement({
          transform: createTestTransform({ x: 300, y: 200, rotation: 45 }),
        }),
      );

      const svg = editor.toSVG();

      expect(svg).toContain('transform=');
      expect(svg).toContain('translate(300');
      // Rotation may include center point
      expect(svg).toMatch(/rotate\(45/);
    });
  });

  // ============================================================
  // Shape Element Rendering - Rectangle
  // ============================================================

  describe('Rectangle Shape Rendering', () => {
    it('should render rect shape with correct attributes', () => {
      editor.addElement(createTestShapeElement('rect'));

      const svg = editor.toSVG();

      // Should have two rects - background and the shape
      const rectMatches = svg.match(/<rect[^>]*>/g);
      expect(rectMatches).not.toBeNull();
      expect(rectMatches!.length).toBeGreaterThanOrEqual(2);

      // Check for shape-specific attributes
      expect(svg).toContain('width="100"');
      expect(svg).toContain('height="80"');
    });

    it('should render rect with rounded corners', () => {
      editor.addElement(
        createTestShapeElement('rect', {
          rx: 10,
        }),
      );

      const svg = editor.toSVG();

      expect(svg).toContain('rx="10"');
    });

    it('should render rect with fill and stroke', () => {
      editor.addElement(
        createTestShapeElement('rect', {
          fill: '#00ff00',
          stroke: '#333333',
          strokeWidth: 3,
        }),
      );

      const svg = editor.toSVG();

      expect(svg).toContain('fill="#00ff00"');
      expect(svg).toContain('stroke="#333333"');
      expect(svg).toContain('stroke-width="3"');
    });
  });

  // ============================================================
  // Shape Element Rendering - Circle
  // ============================================================

  describe('Circle Shape Rendering', () => {
    it('should render circle shape with correct attributes', () => {
      editor.addElement(createTestShapeElement('circle'));

      const svg = editor.toSVG();

      expect(svg).toContain('<circle');
      expect(svg).toContain('r="50"');
    });

    it('should render circle with fill and stroke', () => {
      editor.addElement(
        createTestShapeElement('circle', {
          fill: '#ffff00',
          stroke: '#000000',
          strokeWidth: 2,
        }),
      );

      const svg = editor.toSVG();

      expect(svg).toContain('<circle');
      expect(svg).toContain('fill="#ffff00"');
      expect(svg).toContain('stroke="#000000"');
    });

    it('should render circle with transform', () => {
      editor.addElement(
        createTestShapeElement('circle', {
          transform: createTestTransform({ x: 400, y: 300 }),
        }),
      );

      const svg = editor.toSVG();

      expect(svg).toContain('transform=');
    });
  });

  // ============================================================
  // Shape Element Rendering - Ellipse
  // ============================================================

  describe('Ellipse Shape Rendering', () => {
    it('should render ellipse shape with correct attributes', () => {
      editor.addElement(createTestShapeElement('ellipse'));

      const svg = editor.toSVG();

      expect(svg).toContain('<ellipse');
      expect(svg).toContain('rx="60"');
      expect(svg).toContain('ry="40"');
    });

    it('should render ellipse with fill and stroke', () => {
      editor.addElement(
        createTestShapeElement('ellipse', {
          fill: '#ff00ff',
          stroke: '#666666',
          strokeWidth: 4,
        }),
      );

      const svg = editor.toSVG();

      expect(svg).toContain('<ellipse');
      expect(svg).toContain('fill="#ff00ff"');
      expect(svg).toContain('stroke="#666666"');
    });
  });

  // ============================================================
  // Shape Element Rendering - Path
  // ============================================================

  describe('Path Shape Rendering', () => {
    it('should render path shape with correct d attribute', () => {
      editor.addElement(createTestShapeElement('path'));

      const svg = editor.toSVG();

      expect(svg).toContain('<path');
      expect(svg).toContain('d="M 0 0 L 100 0 L 50 100 Z"');
    });

    it('should render complex path', () => {
      editor.addElement(
        createTestShapeElement('path', {
          path: 'M 10 80 Q 95 10 180 80 T 350 80',
        }),
      );

      const svg = editor.toSVG();

      expect(svg).toContain('d="M 10 80 Q 95 10 180 80 T 350 80"');
    });

    it('should render path with fill and stroke', () => {
      editor.addElement(
        createTestShapeElement('path', {
          fill: 'none',
          stroke: '#0000ff',
          strokeWidth: 3,
        }),
      );

      const svg = editor.toSVG();

      expect(svg).toContain('fill="none"');
      expect(svg).toContain('stroke="#0000ff"');
    });
  });

  // ============================================================
  // Group Element Rendering
  // ============================================================

  describe('Group Element Rendering', () => {
    it('should render group with children', () => {
      // Create child elements first
      const childId1 = editor.addElement(
        createTestImageElement({
          src: 'child1.jpg',
        }),
      );
      const childId2 = editor.addElement(
        createTestTextElement({
          content: 'Child Text',
        }),
      );

      // Create group with children
      editor.createGroup([childId1, childId2]);

      const svg = editor.toSVG();

      expect(svg).toContain('<g');
      expect(svg).toContain('child1.jpg');
      expect(svg).toContain('Child Text');
    });

    it('should render group with transform', () => {
      const childId1 = editor.addElement(createTestImageElement());
      const childId2 = editor.addElement(createTestImageElement({ src: 'img2.jpg' }));
      const groupId = editor.createGroup([childId1, childId2]);

      // Move the group
      editor.setPosition(groupId, 500, 400);

      const svg = editor.toSVG();

      expect(svg).toContain('<g');
      expect(svg).toContain('transform=');
    });

    it('should render nested groups', () => {
      const inner1 = editor.addElement(
        createTestImageElement({ src: 'inner1.jpg' }),
      );
      const inner2 = editor.addElement(
        createTestImageElement({ src: 'inner2.jpg' }),
      );
      const innerGroupId = editor.createGroup([inner1, inner2]);

      const outer1 = editor.addElement(
        createTestTextElement({ content: 'Outer Text' }),
      );
      editor.createGroup([innerGroupId, outer1]);

      const svg = editor.toSVG();

      // Should have nested g elements
      const gMatches = svg.match(/<g[^>]*>/g);
      expect(gMatches).not.toBeNull();
      expect(gMatches!.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ============================================================
  // Mixed Element Rendering
  // ============================================================

  describe('Mixed Element Rendering', () => {
    it('should render multiple element types together', () => {
      editor.addElement(createTestImageElement({ src: 'photo.jpg' }));
      editor.addElement(createTestTextElement({ content: 'Caption' }));
      editor.addElement(createTestShapeElement('rect'));
      editor.addElement(createTestShapeElement('circle'));

      const svg = editor.toSVG();

      expect(svg).toContain('<image');
      expect(svg).toContain('photo.jpg');
      expect(svg).toContain('<text');
      expect(svg).toContain('Caption');
      expect(svg).toContain('<rect');
      expect(svg).toContain('<circle');
    });

    it('should maintain z-order across different element types', () => {
      editor.addElement(
        createTestImageElement({ src: 'back.jpg', zIndex: 0 }),
      );
      editor.addElement(
        createTestShapeElement('rect', { zIndex: 1 }),
      );
      editor.addElement(
        createTestTextElement({ content: 'Front', zIndex: 2 }),
      );

      const svg = editor.toSVG();

      const imagePos = svg.indexOf('back.jpg');
      const rectPos = svg.indexOf('width="100"');
      const textPos = svg.indexOf('Front');

      // Elements should appear in z-order
      expect(imagePos).toBeLessThan(rectPos);
      expect(rectPos).toBeLessThan(textPos);
    });

    it('should render only visible elements', () => {
      editor.addElement(
        createTestImageElement({ src: 'visible.jpg', visible: true }),
      );
      editor.addElement(
        createTestImageElement({ src: 'hidden.jpg', visible: false }),
      );

      const svg = editor.toSVG();

      expect(svg).toContain('visible.jpg');
      expect(svg).not.toContain('hidden.jpg');
    });
  });

  // ============================================================
  // Edge Cases
  // ============================================================

  describe('Edge Cases', () => {
    it('should render empty canvas without errors', () => {
      const svg = editor.toSVG();

      expect(svg).toContain('<svg');
      expect(svg).toContain('</svg>');
    });

    it('should handle element with zero dimensions', () => {
      editor.addElement(
        createTestImageElement({
          width: 0,
          height: 0,
        }),
      );

      const svg = editor.toSVG();

      expect(svg).toContain('width="0"');
      expect(svg).toContain('height="0"');
    });

    it('should handle element with negative position', () => {
      editor.addElement(
        createTestImageElement({
          transform: createTestTransform({ x: -100, y: -50 }),
        }),
      );

      const svg = editor.toSVG();

      expect(svg).toContain('translate(-100');
    });

    it('should handle element with large scale', () => {
      editor.addElement(
        createTestImageElement({
          transform: createTestTransform({ scaleX: 10, scaleY: 10 }),
        }),
      );

      const svg = editor.toSVG();

      expect(svg).toContain('scale(10');
    });

    it('should handle text with empty content', () => {
      editor.addElement(
        createTestTextElement({
          content: '',
        }),
      );

      const svg = editor.toSVG();

      expect(svg).toContain('<text');
    });

    it('should handle text with unicode characters', () => {
      editor.addElement(
        createTestTextElement({
          content: '你好世界 🌍 مرحبا',
        }),
      );

      const svg = editor.toSVG();

      expect(svg).toContain('你好世界');
      expect(svg).toContain('🌍');
      expect(svg).toContain('مرحبا');
    });

    it('should handle special attribute values', () => {
      editor.addElement(
        createTestShapeElement('rect', {
          fill: 'url(#gradient)',
        }),
      );

      const svg = editor.toSVG();

      expect(svg).toContain('fill="url(#gradient)"');
    });
  });
});
