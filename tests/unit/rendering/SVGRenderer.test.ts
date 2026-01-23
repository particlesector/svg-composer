/**
 * SVGRenderer unit tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SVGRenderer } from '../../../src/rendering/SVGRenderer.js';
import type {
  BaseElement,
  ImageElement,
  TextElement,
  ShapeElement,
  GroupElement,
  ClipPath,
} from '../../../src/elements/types.js';
import type { CanvasState, Transform, Guide, SnapTarget } from '../../../src/core/types.js';
import type { SnapLines } from '../../../src/rendering/types.js';

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

// Helper to create a test canvas state
function createTestState(
  elements: BaseElement[] = [],
  overrides?: Partial<CanvasState>,
): CanvasState {
  const elementsMap = new Map<string, BaseElement>();
  for (const el of elements) {
    elementsMap.set(el.id, el);
  }
  return {
    width: 1200,
    height: 1200,
    backgroundColor: '#ffffff',
    elements: elementsMap,
    selectedIds: new Set(),
    guides: [],
    ...overrides,
  };
}

// Helper to create test guides
function createTestGuide(
  id: string,
  orientation: 'horizontal' | 'vertical' = 'horizontal',
  position = 100,
  options: { locked?: boolean; visible?: boolean; color?: string } = {},
): Guide {
  return {
    id,
    orientation,
    position,
    locked: options.locked ?? false,
    visible: options.visible ?? true,
    color: options.color,
  };
}

// Helper to create element getter function
function createElementGetter(elements: BaseElement[]): (id: string) => BaseElement | undefined {
  const map = new Map<string, BaseElement>();
  for (const el of elements) {
    map.set(el.id, el);
  }
  return (id: string) => map.get(id);
}

// Test elements
function createImageElement(id: string, overrides?: Partial<ImageElement>): ImageElement {
  return {
    id,
    type: 'image',
    src: 'test.jpg',
    width: 100,
    height: 50,
    transform: createTestTransform(),
    opacity: 1,
    zIndex: 0,
    locked: false,
    visible: true,
    ...overrides,
  };
}

function createTextElement(id: string, overrides?: Partial<TextElement>): TextElement {
  return {
    id,
    type: 'text',
    content: 'Test Text',
    fontSize: 16,
    fontFamily: 'Arial',
    fill: '#000000',
    textAnchor: 'start',
    transform: createTestTransform(),
    opacity: 1,
    zIndex: 0,
    locked: false,
    visible: true,
    ...overrides,
  };
}

function createShapeElement(id: string, overrides?: Partial<ShapeElement>): ShapeElement {
  return {
    id,
    type: 'shape',
    shapeType: 'rect',
    width: 100,
    height: 50,
    fill: '#ff0000',
    stroke: '#000000',
    strokeWidth: 2,
    transform: createTestTransform(),
    opacity: 1,
    zIndex: 0,
    locked: false,
    visible: true,
    ...overrides,
  };
}

function createGroupElement(
  id: string,
  children: string[],
  overrides?: Partial<GroupElement>,
): GroupElement {
  return {
    id,
    type: 'group',
    children,
    transform: createTestTransform(),
    opacity: 1,
    zIndex: 0,
    locked: false,
    visible: true,
    ...overrides,
  };
}

describe('SVGRenderer', () => {
  let renderer: SVGRenderer;

  beforeEach(() => {
    renderer = new SVGRenderer();
  });

  // ============================================================
  // toSVG - Basic Structure
  // ============================================================

  describe('toSVG', () => {
    describe('basic structure', () => {
      it('should return valid SVG string with xmlns and viewBox', () => {
        const state = createTestState();
        const svg = renderer.toSVG(state, () => undefined);

        expect(svg).toContain('<svg');
        expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
        expect(svg).toContain('viewBox="0 0 1200 1200"');
        expect(svg).toContain('</svg>');
      });

      it('should use custom dimensions in viewBox', () => {
        const state = createTestState([], { width: 800, height: 600 });
        const svg = renderer.toSVG(state, () => undefined);

        expect(svg).toContain('viewBox="0 0 800 600"');
      });

      it('should include background rect with correct color', () => {
        const state = createTestState([], { backgroundColor: '#f0f0f0' });
        const svg = renderer.toSVG(state, () => undefined);

        expect(svg).toContain('<rect width="100%" height="100%" fill="#f0f0f0"');
      });
    });

    // ============================================================
    // toSVG - Image Elements
    // ============================================================

    describe('image elements', () => {
      it('should render image element with correct attributes', () => {
        const element = createImageElement('img-1', {
          src: 'photo.jpg',
          width: 200,
          height: 150,
        });
        const state = createTestState([element]);
        const svg = renderer.toSVG(state, createElementGetter([element]));

        expect(svg).toContain('<image');
        expect(svg).toContain('href="photo.jpg"');
        expect(svg).toContain('width="200"');
        expect(svg).toContain('height="150"');
      });
    });

    // ============================================================
    // toSVG - Text Elements
    // ============================================================

    describe('text elements', () => {
      it('should render text element with correct attributes', () => {
        const element = createTextElement('text-1', {
          content: 'Hello World',
          fontSize: 24,
          fontFamily: 'Helvetica',
          fill: '#333333',
          textAnchor: 'middle',
        });
        const state = createTestState([element]);
        const svg = renderer.toSVG(state, createElementGetter([element]));

        expect(svg).toContain('<text');
        expect(svg).toContain('font-size="24"');
        expect(svg).toContain('font-family="Helvetica"');
        expect(svg).toContain('fill="#333333"');
        expect(svg).toContain('text-anchor="middle"');
        expect(svg).toContain('>Hello World</text>');
      });

      it('should escape special XML characters in text content', () => {
        const element = createTextElement('text-1', {
          content: 'Hello <World> & "Test"',
        });
        const state = createTestState([element]);
        const svg = renderer.toSVG(state, createElementGetter([element]));

        expect(svg).toContain('Hello &lt;World&gt; &amp; &quot;Test&quot;');
      });
    });

    // ============================================================
    // toSVG - Shape Elements
    // ============================================================

    describe('shape elements', () => {
      it('should render rect shape with correct attributes', () => {
        const element = createShapeElement('shape-1', {
          shapeType: 'rect',
          width: 150,
          height: 100,
          fill: '#00ff00',
          stroke: '#0000ff',
          strokeWidth: 3,
        });
        const state = createTestState([element]);
        const svg = renderer.toSVG(state, createElementGetter([element]));

        expect(svg).toContain('<rect');
        expect(svg).toContain('width="150"');
        expect(svg).toContain('height="100"');
        expect(svg).toContain('fill="#00ff00"');
        expect(svg).toContain('stroke="#0000ff"');
        expect(svg).toContain('stroke-width="3"');
      });

      it('should render rect shape with border radius', () => {
        const element = createShapeElement('shape-1', {
          shapeType: 'rect',
          width: 100,
          height: 50,
          rx: 10,
        });
        const state = createTestState([element]);
        const svg = renderer.toSVG(state, createElementGetter([element]));

        expect(svg).toContain('rx="10"');
      });

      it('should render circle shape', () => {
        const element = createShapeElement('shape-1', {
          shapeType: 'circle',
          r: 50,
        });
        const state = createTestState([element]);
        const svg = renderer.toSVG(state, createElementGetter([element]));

        expect(svg).toContain('<circle');
        expect(svg).toContain('r="50"');
      });

      it('should render ellipse shape', () => {
        const element = createShapeElement('shape-1', {
          shapeType: 'ellipse',
          rx: 60,
          ry: 40,
        });
        const state = createTestState([element]);
        const svg = renderer.toSVG(state, createElementGetter([element]));

        expect(svg).toContain('<ellipse');
        expect(svg).toContain('rx="60"');
        expect(svg).toContain('ry="40"');
      });

      it('should render path shape', () => {
        const element = createShapeElement('shape-1', {
          shapeType: 'path',
          path: 'M 10 10 L 100 100',
        });
        const state = createTestState([element]);
        const svg = renderer.toSVG(state, createElementGetter([element]));

        expect(svg).toContain('<path');
        expect(svg).toContain('d="M 10 10 L 100 100"');
      });
    });

    // ============================================================
    // toSVG - Group Elements
    // ============================================================

    describe('group elements', () => {
      it('should render group with children', () => {
        const child1 = createImageElement('child-1', { src: 'a.jpg' });
        const child2 = createImageElement('child-2', { src: 'b.jpg' });
        const group = createGroupElement('group-1', ['child-1', 'child-2']);
        const elements = [group, child1, child2];
        const state = createTestState([group]); // Only group is top-level
        const svg = renderer.toSVG(state, createElementGetter(elements));

        expect(svg).toContain('<g');
        expect(svg).toContain('href="a.jpg"');
        expect(svg).toContain('href="b.jpg"');
        expect(svg).toContain('</g>');
      });

      it('should skip hidden children in group', () => {
        const child1 = createImageElement('child-1', {
          src: 'visible.jpg',
          visible: true,
        });
        const child2 = createImageElement('child-2', {
          src: 'hidden.jpg',
          visible: false,
        });
        const group = createGroupElement('group-1', ['child-1', 'child-2']);
        const elements = [group, child1, child2];
        const state = createTestState([group]);
        const svg = renderer.toSVG(state, createElementGetter(elements));

        expect(svg).toContain('visible.jpg');
        expect(svg).not.toContain('hidden.jpg');
      });
    });

    // ============================================================
    // toSVG - Transforms
    // ============================================================

    describe('transforms', () => {
      it('should apply translate transform', () => {
        const element = createImageElement('img-1', {
          transform: createTestTransform({ x: 100, y: 200 }),
        });
        const state = createTestState([element]);
        const svg = renderer.toSVG(state, createElementGetter([element]));

        expect(svg).toContain('transform="translate(100, 200)"');
      });

      it('should apply rotation transform with center for images', () => {
        const element = createImageElement('img-1', {
          transform: createTestTransform({ rotation: 45 }),
        });
        const state = createTestState([element]);
        const svg = renderer.toSVG(state, createElementGetter([element]));

        // Images rotate around their center (width/2, height/2)
        // Default image is 100x50, so center is (50, 25)
        expect(svg).toContain('transform="rotate(45, 50, 25)"');
      });

      it('should apply scale transform', () => {
        const element = createImageElement('img-1', {
          transform: createTestTransform({ scaleX: 2, scaleY: 1.5 }),
        });
        const state = createTestState([element]);
        const svg = renderer.toSVG(state, createElementGetter([element]));

        expect(svg).toContain('transform="scale(2, 1.5)"');
      });

      it('should combine multiple transforms in correct order', () => {
        const element = createImageElement('img-1', {
          transform: createTestTransform({
            x: 50,
            y: 100,
            rotation: 45,
            scaleX: 2,
            scaleY: 1.5,
          }),
        });
        const state = createTestState([element]);
        const svg = renderer.toSVG(state, createElementGetter([element]));

        // Rotation center accounts for scale: (100/2 * 2, 50/2 * 1.5) = (100, 37.5)
        expect(svg).toContain('transform="translate(50, 100) rotate(45, 100, 37.5) scale(2, 1.5)"');
      });

      it('should omit transform attribute when all values are default', () => {
        const element = createImageElement('img-1', {
          transform: createTestTransform(),
        });
        const state = createTestState([element]);
        const svg = renderer.toSVG(state, createElementGetter([element]));

        expect(svg).not.toContain('transform=');
      });
    });

    // ============================================================
    // toSVG - Visibility and Opacity
    // ============================================================

    describe('visibility and opacity', () => {
      it('should skip hidden elements', () => {
        const visible = createImageElement('visible', {
          src: 'visible.jpg',
          visible: true,
        });
        const hidden = createImageElement('hidden', {
          src: 'hidden.jpg',
          visible: false,
        });
        const state = createTestState([visible, hidden]);
        const svg = renderer.toSVG(state, createElementGetter([visible, hidden]));

        expect(svg).toContain('visible.jpg');
        expect(svg).not.toContain('hidden.jpg');
      });

      it('should include opacity attribute when not 1', () => {
        const element = createImageElement('img-1', { opacity: 0.5 });
        const state = createTestState([element]);
        const svg = renderer.toSVG(state, createElementGetter([element]));

        expect(svg).toContain('opacity="0.5"');
      });

      it('should omit opacity attribute when value is 1', () => {
        const element = createImageElement('img-1', { opacity: 1 });
        const state = createTestState([element]);
        const svg = renderer.toSVG(state, createElementGetter([element]));

        // Count occurrences - should only appear in background rect context
        const opacityCount = (svg.match(/opacity="/g) ?? []).length;
        expect(opacityCount).toBe(0);
      });
    });

    // ============================================================
    // toSVG - Z-Index Ordering
    // ============================================================

    describe('z-index ordering', () => {
      it('should sort elements by zIndex ascending', () => {
        const back = createImageElement('back', {
          src: 'back.jpg',
          zIndex: 1,
        });
        const front = createImageElement('front', {
          src: 'front.jpg',
          zIndex: 10,
        });
        const middle = createImageElement('middle', {
          src: 'middle.jpg',
          zIndex: 5,
        });
        const state = createTestState([front, back, middle]); // Add in wrong order
        const svg = renderer.toSVG(state, createElementGetter([front, back, middle]));

        const backIndex = svg.indexOf('back.jpg');
        const middleIndex = svg.indexOf('middle.jpg');
        const frontIndex = svg.indexOf('front.jpg');

        expect(backIndex).toBeLessThan(middleIndex);
        expect(middleIndex).toBeLessThan(frontIndex);
      });
    });

    // ============================================================
    // toSVG - Clip Paths
    // ============================================================

    describe('clip paths', () => {
      it('should render defs section with rect clip path', () => {
        const clipPath: ClipPath = {
          id: 'clip-1',
          type: 'rect',
          x: 10,
          y: 20,
          width: 100,
          height: 80,
        };
        const element = createImageElement('img-1', { clipPath });
        const state = createTestState([element]);
        const svg = renderer.toSVG(state, createElementGetter([element]));

        expect(svg).toContain('<defs>');
        expect(svg).toContain('<clipPath id="clip-1">');
        expect(svg).toContain('<rect x="10" y="20" width="100" height="80"');
        expect(svg).toContain('</clipPath>');
        expect(svg).toContain('</defs>');
      });

      it('should render rect clip path with border radius', () => {
        const clipPath: ClipPath = {
          id: 'clip-1',
          type: 'rect',
          x: 0,
          y: 0,
          width: 100,
          height: 100,
          rx: 15,
        };
        const element = createImageElement('img-1', { clipPath });
        const state = createTestState([element]);
        const svg = renderer.toSVG(state, createElementGetter([element]));

        expect(svg).toContain('rx="15"');
      });

      it('should render circle clip path', () => {
        const clipPath: ClipPath = {
          id: 'clip-circle',
          type: 'circle',
          cx: 50,
          cy: 50,
          r: 40,
        };
        const element = createImageElement('img-1', { clipPath });
        const state = createTestState([element]);
        const svg = renderer.toSVG(state, createElementGetter([element]));

        expect(svg).toContain('<clipPath id="clip-circle">');
        expect(svg).toContain('<circle cx="50" cy="50" r="40"');
      });

      it('should render ellipse clip path', () => {
        const clipPath: ClipPath = {
          id: 'clip-ellipse',
          type: 'ellipse',
          cx: 100,
          cy: 75,
          rx: 80,
          ry: 50,
        };
        const element = createImageElement('img-1', { clipPath });
        const state = createTestState([element]);
        const svg = renderer.toSVG(state, createElementGetter([element]));

        expect(svg).toContain('<clipPath id="clip-ellipse">');
        expect(svg).toContain('<ellipse cx="100" cy="75" rx="80" ry="50"');
      });

      it('should apply clip-path attribute to element', () => {
        const clipPath: ClipPath = {
          id: 'my-clip',
          type: 'rect',
          x: 0,
          y: 0,
          width: 100,
          height: 100,
        };
        const element = createImageElement('img-1', { clipPath });
        const state = createTestState([element]);
        const svg = renderer.toSVG(state, createElementGetter([element]));

        expect(svg).toContain('clip-path="url(#my-clip)"');
      });

      it('should not duplicate clip path definitions', () => {
        const clipPath: ClipPath = {
          id: 'shared-clip',
          type: 'circle',
          cx: 50,
          cy: 50,
          r: 25,
        };
        const element1 = createImageElement('img-1', { clipPath });
        const element2 = createImageElement('img-2', { clipPath, src: 'other.jpg' });
        const state = createTestState([element1, element2]);
        const svg = renderer.toSVG(state, createElementGetter([element1, element2]));

        // Count occurrences of the clip path definition
        const clipPathCount = (svg.match(/<clipPath id="shared-clip">/g) ?? []).length;
        expect(clipPathCount).toBe(1);

        // Both elements should reference it
        const clipRefCount = (svg.match(/clip-path="url\(#shared-clip\)"/g) ?? []).length;
        expect(clipRefCount).toBe(2);
      });

      it('should not include defs section when no clip paths', () => {
        const element = createImageElement('img-1');
        const state = createTestState([element]);
        const svg = renderer.toSVG(state, createElementGetter([element]));

        expect(svg).not.toContain('<defs>');
      });

      it('should render clip path for nested group children', () => {
        const clipPath: ClipPath = {
          id: 'child-clip',
          type: 'rect',
          x: 0,
          y: 0,
          width: 50,
          height: 50,
        };
        const child = createImageElement('child', { clipPath });
        const group = createGroupElement('group', ['child']);
        const state = createTestState([group]);
        const svg = renderer.toSVG(state, createElementGetter([group, child]));

        expect(svg).toContain('<clipPath id="child-clip">');
        expect(svg).toContain('clip-path="url(#child-clip)"');
      });
    });
  });

  // ============================================================
  // DOM Rendering
  // ============================================================

  describe('DOM rendering', () => {
    let container: HTMLDivElement;

    beforeEach(() => {
      container = document.createElement('div');
      document.body.appendChild(container);
    });

    afterEach(() => {
      renderer.destroy();
      container.remove();
    });

    describe('initialize', () => {
      it('should create SVG structure in container', () => {
        const state = createTestState();
        renderer.initialize(container, state);

        const svg = container.querySelector('svg');
        expect(svg).not.toBeNull();
        expect(svg?.getAttribute('viewBox')).toBe('0 0 1200 1200');
      });

      it('should create defs element', () => {
        const state = createTestState();
        renderer.initialize(container, state);

        const defs = container.querySelector('defs');
        expect(defs).not.toBeNull();
      });

      it('should create background rect', () => {
        const state = createTestState([], { backgroundColor: '#cccccc' });
        renderer.initialize(container, state);

        const rect = container.querySelector('rect');
        expect(rect).not.toBeNull();
        expect(rect?.getAttribute('fill')).toBe('#cccccc');
      });

      it('should create content group', () => {
        const state = createTestState();
        renderer.initialize(container, state);

        const group = container.querySelector('g[id^="svc-"]');
        expect(group).not.toBeNull();
      });
    });

    describe('render', () => {
      it('should render elements to DOM', () => {
        const element = createImageElement('img-1', { src: 'test.jpg' });
        const state = createTestState([element]);
        renderer.render(container, state, createElementGetter([element]));

        const image = container.querySelector('image');
        expect(image).not.toBeNull();
        expect(image?.getAttribute('href')).toBe('test.jpg');
      });

      it('should update background color', () => {
        const state1 = createTestState([], { backgroundColor: '#ffffff' });
        renderer.render(container, state1, () => undefined);

        const state2 = createTestState([], { backgroundColor: '#000000' });
        renderer.render(container, state2, () => undefined);

        const rect = container.querySelector('rect');
        expect(rect?.getAttribute('fill')).toBe('#000000');
      });

      it('should update viewBox on resize', () => {
        const state1 = createTestState([], { width: 1200, height: 1200 });
        renderer.render(container, state1, () => undefined);

        const state2 = createTestState([], { width: 800, height: 600 });
        renderer.render(container, state2, () => undefined);

        const svg = container.querySelector('svg');
        expect(svg?.getAttribute('viewBox')).toBe('0 0 800 600');
      });

      it('should add clip paths to defs', () => {
        const clipPath: ClipPath = {
          id: 'test-clip',
          type: 'circle',
          cx: 50,
          cy: 50,
          r: 30,
        };
        const element = createImageElement('img-1', { clipPath });
        const state = createTestState([element]);
        renderer.render(container, state, createElementGetter([element]));

        const clipPathEl = container.querySelector('clipPath#test-clip');
        expect(clipPathEl).not.toBeNull();
      });
    });

    describe('destroy', () => {
      it('should remove SVG from container', () => {
        const state = createTestState();
        renderer.initialize(container, state);

        expect(container.querySelector('svg')).not.toBeNull();

        renderer.destroy();

        expect(container.querySelector('svg')).toBeNull();
      });
    });
  });

  // ============================================================
  // Incremental Updates
  // ============================================================

  describe('incremental updates', () => {
    let container: HTMLDivElement;

    beforeEach(() => {
      container = document.createElement('div');
      document.body.appendChild(container);
    });

    afterEach(() => {
      renderer.destroy();
      container.remove();
    });

    describe('addElement', () => {
      it('should add element to DOM', () => {
        const state = createTestState();
        renderer.initialize(container, state);

        const element = createImageElement('new-img', { src: 'new.jpg' });
        renderer.addElement(element, createElementGetter([element]));

        const image = container.querySelector('image[data-element-id="new-img"]');
        expect(image).not.toBeNull();
        expect(image?.getAttribute('href')).toBe('new.jpg');
      });

      it('should add clip path to defs when element has one', () => {
        const state = createTestState();
        renderer.initialize(container, state);

        const clipPath: ClipPath = {
          id: 'new-clip',
          type: 'rect',
          x: 0,
          y: 0,
          width: 100,
          height: 100,
        };
        const element = createImageElement('img', { clipPath });
        renderer.addElement(element, createElementGetter([element]));

        const clipPathEl = container.querySelector('clipPath#new-clip');
        expect(clipPathEl).not.toBeNull();
      });
    });

    describe('updateElement', () => {
      it('should update element in DOM', () => {
        const element = createImageElement('img-1', { src: 'old.jpg' });
        const state = createTestState([element]);
        renderer.render(container, state, createElementGetter([element]));

        const updated = createImageElement('img-1', { src: 'new.jpg' });
        renderer.updateElement(updated, createElementGetter([updated]));

        const image = container.querySelector('image[data-element-id="img-1"]');
        expect(image?.getAttribute('href')).toBe('new.jpg');
      });

      it('should remove element if now hidden', () => {
        const element = createImageElement('img-1', { visible: true });
        const state = createTestState([element]);
        renderer.render(container, state, createElementGetter([element]));

        expect(container.querySelector('image[data-element-id="img-1"]')).not.toBeNull();

        const hidden = createImageElement('img-1', { visible: false });
        renderer.updateElement(hidden, createElementGetter([hidden]));

        expect(container.querySelector('image[data-element-id="img-1"]')).toBeNull();
      });
    });

    describe('removeElement', () => {
      it('should remove element from DOM', () => {
        const element = createImageElement('img-1');
        const state = createTestState([element]);
        renderer.render(container, state, createElementGetter([element]));

        expect(container.querySelector('image[data-element-id="img-1"]')).not.toBeNull();

        renderer.removeElement('img-1');

        expect(container.querySelector('image[data-element-id="img-1"]')).toBeNull();
      });

      it('should handle removing non-existent element gracefully', () => {
        const state = createTestState();
        renderer.initialize(container, state);

        // Should not throw
        expect(() => {
          renderer.removeElement('non-existent');
        }).not.toThrow();
      });
    });

    describe('z-index based insertion', () => {
      it('should insert element at correct position based on z-index', () => {
        const state = createTestState();
        renderer.initialize(container, state);

        // Add elements with different z-indexes
        const el1 = createImageElement('img-1', { zIndex: 1 });
        const el2 = createImageElement('img-2', { zIndex: 3 });
        const el3 = createImageElement('img-3', { zIndex: 2 });

        renderer.addElement(el1, createElementGetter([el1]));
        renderer.addElement(el2, createElementGetter([el1, el2]));
        renderer.addElement(el3, createElementGetter([el1, el2, el3]));

        const content = container.querySelector('g[id$="content"]');
        const children = Array.from(content?.children ?? []);
        const ids = children.map((el) => el.getAttribute('data-element-id'));

        // Elements should be ordered by z-index: img-1 (1), img-3 (2), img-2 (3)
        expect(ids).toEqual(['img-1', 'img-3', 'img-2']);
      });

      it('should reposition element when z-index changes', () => {
        const el1 = createImageElement('img-1', { zIndex: 1 });
        const el2 = createImageElement('img-2', { zIndex: 2 });
        const el3 = createImageElement('img-3', { zIndex: 3 });
        const state = createTestState([el1, el2, el3]);
        renderer.render(container, state, createElementGetter([el1, el2, el3]));

        // Move img-1 to z-index 10 (should go to end)
        const updated = createImageElement('img-1', { zIndex: 10 });
        renderer.updateElement(updated, createElementGetter([updated, el2, el3]));

        const content = container.querySelector('g[id$="content"]');
        const children = Array.from(content?.children ?? []);
        const ids = children.map((el) => el.getAttribute('data-element-id'));

        expect(ids).toEqual(['img-2', 'img-3', 'img-1']);
      });
    });

    describe('attribute diffing', () => {
      it('should update transform attribute when changed', () => {
        const element = createImageElement('img-1', {
          transform: createTestTransform({ x: 10, y: 20 }),
        });
        const state = createTestState([element]);
        renderer.render(container, state, createElementGetter([element]));

        const img = container.querySelector('image[data-element-id="img-1"]');
        expect(img?.getAttribute('transform')).toContain('translate(10, 20)');

        const updated = createImageElement('img-1', {
          transform: createTestTransform({ x: 50, y: 60 }),
        });
        renderer.updateElement(updated, createElementGetter([updated]));

        expect(img?.getAttribute('transform')).toContain('translate(50, 60)');
      });

      it('should update opacity attribute when changed', () => {
        const element = createImageElement('img-1', { opacity: 1 });
        const state = createTestState([element]);
        renderer.render(container, state, createElementGetter([element]));

        const img = container.querySelector('image[data-element-id="img-1"]');
        expect(img?.getAttribute('opacity')).toBeNull();

        const updated = createImageElement('img-1', { opacity: 0.5 });
        renderer.updateElement(updated, createElementGetter([updated]));

        expect(img?.getAttribute('opacity')).toBe('0.5');
      });

      it('should remove opacity attribute when set back to 1', () => {
        const element = createImageElement('img-1', { opacity: 0.5 });
        const state = createTestState([element]);
        renderer.render(container, state, createElementGetter([element]));

        const img = container.querySelector('image[data-element-id="img-1"]');
        expect(img?.getAttribute('opacity')).toBe('0.5');

        const updated = createImageElement('img-1', { opacity: 1 });
        renderer.updateElement(updated, createElementGetter([updated]));

        expect(img?.getAttribute('opacity')).toBeNull();
      });

      it('should update text content when changed', () => {
        const element = createTextElement('text-1', { content: 'Original' });
        const state = createTestState([element]);
        renderer.render(container, state, createElementGetter([element]));

        const text = container.querySelector('text[data-element-id="text-1"]');
        expect(text?.textContent).toBe('Original');

        const updated = createTextElement('text-1', { content: 'Updated' });
        renderer.updateElement(updated, createElementGetter([updated]));

        expect(text?.textContent).toBe('Updated');
      });

      it('should update shape attributes when changed', () => {
        const element = createShapeElement('shape-1', {
          shapeType: 'rect',
          width: 100,
          height: 50,
          fill: '#ff0000',
        });
        const state = createTestState([element]);
        renderer.render(container, state, createElementGetter([element]));

        const rect = container.querySelector('rect[data-element-id="shape-1"]');
        expect(rect?.getAttribute('fill')).toBe('#ff0000');

        const updated = createShapeElement('shape-1', {
          shapeType: 'rect',
          width: 100,
          height: 50,
          fill: '#00ff00',
        });
        renderer.updateElement(updated, createElementGetter([updated]));

        expect(rect?.getAttribute('fill')).toBe('#00ff00');
      });

      it('should add element if updateElement called with non-existent id', () => {
        const state = createTestState();
        renderer.initialize(container, state);

        expect(container.querySelector('image[data-element-id="new-img"]')).toBeNull();

        const element = createImageElement('new-img');
        renderer.updateElement(element, createElementGetter([element]));

        expect(container.querySelector('image[data-element-id="new-img"]')).not.toBeNull();
      });

      it('should update clip path reference when changed', () => {
        const clipPath1: ClipPath = {
          id: 'clip-1',
          type: 'circle',
          cx: 50,
          cy: 50,
          r: 25,
        };
        const element = createImageElement('img-1', { clipPath: clipPath1 });
        const state = createTestState([element]);
        renderer.render(container, state, createElementGetter([element]));

        const img = container.querySelector('image[data-element-id="img-1"]');
        expect(img?.getAttribute('clip-path')).toBe('url(#clip-1)');

        const clipPath2: ClipPath = {
          id: 'clip-2',
          type: 'rect',
          x: 0,
          y: 0,
          width: 100,
          height: 100,
        };
        const updated = createImageElement('img-1', { clipPath: clipPath2 });
        renderer.updateElement(updated, createElementGetter([updated]));

        expect(img?.getAttribute('clip-path')).toBe('url(#clip-2)');
        expect(container.querySelector('clipPath#clip-2')).not.toBeNull();
      });

      it('should remove clip path reference when removed from element', () => {
        const clipPath: ClipPath = {
          id: 'clip-1',
          type: 'circle',
          cx: 50,
          cy: 50,
          r: 25,
        };
        const element = createImageElement('img-1', { clipPath });
        const state = createTestState([element]);
        renderer.render(container, state, createElementGetter([element]));

        const img = container.querySelector('image[data-element-id="img-1"]');
        expect(img?.getAttribute('clip-path')).toBe('url(#clip-1)');

        const updated = createImageElement('img-1'); // No clip path
        renderer.updateElement(updated, createElementGetter([updated]));

        expect(img?.getAttribute('clip-path')).toBeNull();
      });
    });
  });

  // ============================================================
  // Viewport State
  // ============================================================

  describe('viewport state', () => {
    let container: HTMLDivElement;

    beforeEach(() => {
      container = document.createElement('div');
      document.body.appendChild(container);
    });

    afterEach(() => {
      renderer.destroy();
      container.remove();
    });

    it('should render with default viewBox when no viewport state provided', () => {
      const state = createTestState([], { width: 800, height: 600 });
      renderer.render(container, state, () => undefined);

      const svg = container.querySelector('svg');
      expect(svg?.getAttribute('viewBox')).toBe('0 0 800 600');
    });

    it('should render with default viewBox when viewport state has default values', () => {
      const state = createTestState([], { width: 800, height: 600 });
      renderer.render(container, state, () => undefined, { panX: 0, panY: 0, zoom: 1 });

      const svg = container.querySelector('svg');
      expect(svg?.getAttribute('viewBox')).toBe('0 0 800 600');
    });

    it('should apply pan offset to viewBox', () => {
      const state = createTestState([], { width: 800, height: 600 });
      renderer.render(container, state, () => undefined, { panX: 100, panY: 50, zoom: 1 });

      const svg = container.querySelector('svg');
      expect(svg?.getAttribute('viewBox')).toBe('100 50 800 600');
    });

    it('should apply zoom to viewBox dimensions', () => {
      const state = createTestState([], { width: 800, height: 600 });
      renderer.render(container, state, () => undefined, { panX: 0, panY: 0, zoom: 2 });

      const svg = container.querySelector('svg');
      // zoom 2 means we see half the canvas
      expect(svg?.getAttribute('viewBox')).toBe('0 0 400 300');
    });

    it('should apply both pan and zoom to viewBox', () => {
      const state = createTestState([], { width: 800, height: 600 });
      renderer.render(container, state, () => undefined, { panX: 100, panY: 50, zoom: 2 });

      const svg = container.querySelector('svg');
      expect(svg?.getAttribute('viewBox')).toBe('100 50 400 300');
    });

    it('should handle zoom out (zoom < 1)', () => {
      const state = createTestState([], { width: 800, height: 600 });
      renderer.render(container, state, () => undefined, { panX: 0, panY: 0, zoom: 0.5 });

      const svg = container.querySelector('svg');
      // zoom 0.5 means we see twice the canvas
      expect(svg?.getAttribute('viewBox')).toBe('0 0 1600 1200');
    });

    it('should update viewBox when viewport state changes', () => {
      const state = createTestState([], { width: 800, height: 600 });
      renderer.render(container, state, () => undefined);

      const svg = container.querySelector('svg');
      expect(svg?.getAttribute('viewBox')).toBe('0 0 800 600');

      renderer.render(container, state, () => undefined, { panX: 50, panY: 25, zoom: 1.5 });

      // 800/1.5 ≈ 533.33, 600/1.5 = 400
      expect(svg?.getAttribute('viewBox')).toContain('50 25');
    });
  });

  // ============================================================
  // Incremental DOM Updates via render()
  // ============================================================

  describe('incremental DOM updates via render()', () => {
    let container: HTMLDivElement;

    beforeEach(() => {
      container = document.createElement('div');
      document.body.appendChild(container);
    });

    afterEach(() => {
      renderer.destroy();
      container.remove();
    });

    it('should preserve existing DOM elements on re-render', () => {
      const element = createImageElement('img-1', { src: 'test.jpg' });
      const state = createTestState([element]);
      renderer.render(container, state, createElementGetter([element]));

      // Get reference to the DOM element
      const originalImage = container.querySelector('image[data-element-id="img-1"]');
      expect(originalImage).not.toBeNull();

      // Re-render with same state
      renderer.render(container, state, createElementGetter([element]));

      // The same DOM element should still be present (not recreated)
      const imageAfterRerender = container.querySelector('image[data-element-id="img-1"]');
      expect(imageAfterRerender).toBe(originalImage);
    });

    it('should preserve existing elements when adding a new element', () => {
      const element1 = createImageElement('img-1', { src: 'first.jpg' });
      const state1 = createTestState([element1]);
      renderer.render(container, state1, createElementGetter([element1]));

      // Get reference to the first DOM element
      const originalImage1 = container.querySelector('image[data-element-id="img-1"]');
      expect(originalImage1).not.toBeNull();

      // Add a second element
      const element2 = createImageElement('img-2', { src: 'second.jpg' });
      const state2 = createTestState([element1, element2]);
      renderer.render(container, state2, createElementGetter([element1, element2]));

      // The original element should be preserved
      const image1AfterAdd = container.querySelector('image[data-element-id="img-1"]');
      expect(image1AfterAdd).toBe(originalImage1);

      // The new element should be added
      const image2 = container.querySelector('image[data-element-id="img-2"]');
      expect(image2).not.toBeNull();
      expect(image2?.getAttribute('href')).toBe('second.jpg');
    });

    it('should preserve remaining elements when removing an element', () => {
      const element1 = createImageElement('img-1', { src: 'first.jpg', zIndex: 1 });
      const element2 = createImageElement('img-2', { src: 'second.jpg', zIndex: 2 });
      const state1 = createTestState([element1, element2]);
      renderer.render(container, state1, createElementGetter([element1, element2]));

      // Get reference to the second DOM element
      const originalImage2 = container.querySelector('image[data-element-id="img-2"]');
      expect(originalImage2).not.toBeNull();

      // Remove the first element
      const state2 = createTestState([element2]);
      renderer.render(container, state2, createElementGetter([element2]));

      // The removed element should be gone
      expect(container.querySelector('image[data-element-id="img-1"]')).toBeNull();

      // The remaining element should be preserved
      const image2AfterRemove = container.querySelector('image[data-element-id="img-2"]');
      expect(image2AfterRemove).toBe(originalImage2);
    });

    it('should preserve other elements when updating one element', () => {
      const element1 = createImageElement('img-1', { src: 'first.jpg' });
      const element2 = createImageElement('img-2', { src: 'second.jpg' });
      const state1 = createTestState([element1, element2]);
      renderer.render(container, state1, createElementGetter([element1, element2]));

      // Get references to both DOM elements
      const originalImage1 = container.querySelector('image[data-element-id="img-1"]');
      const originalImage2 = container.querySelector('image[data-element-id="img-2"]');

      // Update only the first element
      const updatedElement1 = createImageElement('img-1', { src: 'updated.jpg' });
      const state2 = createTestState([updatedElement1, element2]);
      renderer.render(container, state2, createElementGetter([updatedElement1, element2]));

      // The first element should be the same DOM node with updated content
      const image1AfterUpdate = container.querySelector('image[data-element-id="img-1"]');
      expect(image1AfterUpdate).toBe(originalImage1);
      expect(image1AfterUpdate?.getAttribute('href')).toBe('updated.jpg');

      // The second element should be preserved (same DOM node)
      const image2AfterUpdate = container.querySelector('image[data-element-id="img-2"]');
      expect(image2AfterUpdate).toBe(originalImage2);
    });

    it('should remove elements that become hidden', () => {
      const element = createImageElement('img-1', { visible: true });
      const state1 = createTestState([element]);
      renderer.render(container, state1, createElementGetter([element]));

      expect(container.querySelector('image[data-element-id="img-1"]')).not.toBeNull();

      // Hide the element
      const hiddenElement = createImageElement('img-1', { visible: false });
      const state2 = createTestState([hiddenElement]);
      renderer.render(container, state2, createElementGetter([hiddenElement]));

      expect(container.querySelector('image[data-element-id="img-1"]')).toBeNull();
    });

    it('should add elements that become visible', () => {
      const hiddenElement = createImageElement('img-1', { visible: false });
      const state1 = createTestState([hiddenElement]);
      renderer.render(container, state1, createElementGetter([hiddenElement]));

      expect(container.querySelector('image[data-element-id="img-1"]')).toBeNull();

      // Show the element
      const visibleElement = createImageElement('img-1', { visible: true });
      const state2 = createTestState([visibleElement]);
      renderer.render(container, state2, createElementGetter([visibleElement]));

      expect(container.querySelector('image[data-element-id="img-1"]')).not.toBeNull();
    });

    it('should maintain correct z-order with multiple render calls', () => {
      const el1 = createImageElement('img-1', { zIndex: 1 });
      const el2 = createImageElement('img-2', { zIndex: 3 });
      const state1 = createTestState([el1, el2]);
      renderer.render(container, state1, createElementGetter([el1, el2]));

      // Add element in the middle
      const el3 = createImageElement('img-3', { zIndex: 2 });
      const state2 = createTestState([el1, el2, el3]);
      renderer.render(container, state2, createElementGetter([el1, el2, el3]));

      const content = container.querySelector('g[id$="content"]');
      const children = Array.from(content?.children ?? []);
      const ids = children.map((el) => el.getAttribute('data-element-id'));

      // Elements should be ordered by z-index
      expect(ids).toEqual(['img-1', 'img-3', 'img-2']);
    });

    it('should handle rapid successive renders efficiently', () => {
      const element = createImageElement('img-1', {
        transform: createTestTransform({ x: 0, y: 0 }),
      });
      const state = createTestState([element]);
      renderer.render(container, state, createElementGetter([element]));

      // Get reference to the DOM element
      const originalImage = container.querySelector('image[data-element-id="img-1"]');

      // Simulate rapid position updates (like during drag)
      for (let i = 1; i <= 10; i++) {
        const updated = createImageElement('img-1', {
          transform: createTestTransform({ x: i * 10, y: i * 5 }),
        });
        const newState = createTestState([updated]);
        renderer.render(container, newState, createElementGetter([updated]));
      }

      // The DOM element should still be the same (not recreated)
      const imageAfterUpdates = container.querySelector('image[data-element-id="img-1"]');
      expect(imageAfterUpdates).toBe(originalImage);

      // The transform should be updated to the final value
      expect(imageAfterUpdates?.getAttribute('transform')).toContain('translate(100, 50)');
    });

    it('should handle groups correctly - group children should not appear at top level', () => {
      const child1 = createImageElement('child-1', { src: 'a.jpg' });
      const child2 = createImageElement('child-2', { src: 'b.jpg' });
      const group = createGroupElement('group-1', ['child-1', 'child-2']);
      const allElements = [group, child1, child2];
      const state = createTestState([group, child1, child2]);
      renderer.render(container, state, createElementGetter(allElements));

      const content = container.querySelector('g[id$="content"]');
      const topLevelChildren = Array.from(content?.children ?? []);

      // Only the group should be at the top level
      expect(topLevelChildren.length).toBe(1);
      expect(topLevelChildren[0].getAttribute('data-element-id')).toBe('group-1');

      // Children should be inside the group
      const groupEl = topLevelChildren[0];
      const groupChildren = Array.from(groupEl.children);
      expect(groupChildren.length).toBe(2);
    });

    it('should handle adding and removing elements from groups', () => {
      // Start with a group containing one child
      const child1 = createImageElement('child-1', { src: 'a.jpg' });
      const group = createGroupElement('group-1', ['child-1']);
      const allElements1 = [group, child1];
      const state1 = createTestState([group, child1]);
      renderer.render(container, state1, createElementGetter(allElements1));

      // Add second child to group
      const child2 = createImageElement('child-2', { src: 'b.jpg' });
      const groupWithTwoChildren = createGroupElement('group-1', ['child-1', 'child-2']);
      const allElements2 = [groupWithTwoChildren, child1, child2];
      const state2 = createTestState([groupWithTwoChildren, child1, child2]);
      renderer.render(container, state2, createElementGetter(allElements2));

      const content = container.querySelector('g[id$="content"]');
      const topLevelChildren = Array.from(content?.children ?? []);
      expect(topLevelChildren.length).toBe(1);

      // Group should now have two children
      const groupEl = content?.querySelector('[data-element-id="group-1"]');
      const groupChildren = Array.from(groupEl?.children ?? []);
      expect(groupChildren.length).toBe(2);
    });

    it('should handle different element types in incremental updates', () => {
      const image = createImageElement('el-1', { src: 'test.jpg' });
      const text = createTextElement('el-2', { content: 'Hello' });
      const shape = createShapeElement('el-3', { shapeType: 'rect' });

      const state = createTestState([image, text, shape]);
      renderer.render(container, state, createElementGetter([image, text, shape]));

      // Get references
      const origImage = container.querySelector('image[data-element-id="el-1"]');
      const origText = container.querySelector('text[data-element-id="el-2"]');
      const origShape = container.querySelector('rect[data-element-id="el-3"]');

      // Update all elements
      const updatedImage = createImageElement('el-1', { src: 'updated.jpg' });
      const updatedText = createTextElement('el-2', { content: 'Updated' });
      const updatedShape = createShapeElement('el-3', { shapeType: 'rect', fill: '#00ff00' });

      const newState = createTestState([updatedImage, updatedText, updatedShape]);
      renderer.render(
        container,
        newState,
        createElementGetter([updatedImage, updatedText, updatedShape]),
      );

      // All elements should be the same DOM nodes
      expect(container.querySelector('image[data-element-id="el-1"]')).toBe(origImage);
      expect(container.querySelector('text[data-element-id="el-2"]')).toBe(origText);
      expect(container.querySelector('rect[data-element-id="el-3"]')).toBe(origShape);

      // Values should be updated
      expect(origImage?.getAttribute('href')).toBe('updated.jpg');
      expect(origText?.textContent).toBe('Updated');
      expect(origShape?.getAttribute('fill')).toBe('#00ff00');
    });

    it('should clean up orphaned clip paths on element removal', () => {
      const clipPath: ClipPath = {
        id: 'clip-orphan',
        type: 'circle',
        cx: 50,
        cy: 50,
        r: 25,
      };
      const element = createImageElement('img-1', { clipPath });
      const state1 = createTestState([element]);
      renderer.render(container, state1, createElementGetter([element]));

      expect(container.querySelector('clipPath#clip-orphan')).not.toBeNull();

      // Remove the element
      const state2 = createTestState([]);
      renderer.render(container, state2, createElementGetter([]));

      expect(container.querySelector('image[data-element-id="img-1"]')).toBeNull();
      // Orphaned clip paths should be cleaned up during incremental render
      expect(container.querySelector('clipPath#clip-orphan')).toBeNull();
    });
  });

  // ============================================================
  // Guide Rendering
  // ============================================================

  describe('guide rendering', () => {
    let container: HTMLDivElement;

    beforeEach(() => {
      container = document.createElement('div');
      document.body.appendChild(container);
    });

    afterEach(() => {
      renderer.destroy();
      container.remove();
    });

    it('should initialize guides group on render', () => {
      const state = createTestState();
      renderer.render(container, state, () => undefined);

      const guidesGroup = container.querySelector('g[id$="guides"]');
      expect(guidesGroup).not.toBeNull();
    });

    it('should render horizontal guide', () => {
      const state = createTestState();
      renderer.render(container, state, () => undefined);

      const guides = [createTestGuide('guide-1', 'horizontal', 100)];
      renderer.renderGuides(guides, 1200, 1200);

      const guideLine = container.querySelector('line[data-guide-id="guide-1"]');
      expect(guideLine).not.toBeNull();
      expect(guideLine?.getAttribute('x1')).toBe('0');
      expect(guideLine?.getAttribute('y1')).toBe('100');
      expect(guideLine?.getAttribute('x2')).toBe('1200');
      expect(guideLine?.getAttribute('y2')).toBe('100');
    });

    it('should render vertical guide', () => {
      const state = createTestState();
      renderer.render(container, state, () => undefined);

      const guides = [createTestGuide('guide-1', 'vertical', 200)];
      renderer.renderGuides(guides, 1200, 1200);

      const guideLine = container.querySelector('line[data-guide-id="guide-1"]');
      expect(guideLine).not.toBeNull();
      expect(guideLine?.getAttribute('x1')).toBe('200');
      expect(guideLine?.getAttribute('y1')).toBe('0');
      expect(guideLine?.getAttribute('x2')).toBe('200');
      expect(guideLine?.getAttribute('y2')).toBe('1200');
    });

    it('should not render invisible guides', () => {
      const state = createTestState();
      renderer.render(container, state, () => undefined);

      const guides = [createTestGuide('guide-1', 'horizontal', 100, { visible: false })];
      renderer.renderGuides(guides, 1200, 1200);

      const guideLine = container.querySelector('line[data-guide-id="guide-1"]');
      expect(guideLine).toBeNull();
    });

    it('should render guide with custom color', () => {
      const state = createTestState();
      renderer.render(container, state, () => undefined);

      const guides = [createTestGuide('guide-1', 'horizontal', 100, { color: '#ff0000' })];
      renderer.renderGuides(guides, 1200, 1200);

      const guideLine = container.querySelector('line[data-guide-id="guide-1"]');
      expect(guideLine?.getAttribute('stroke')).toBe('#ff0000');
    });

    it('should render locked guide with dashed stroke', () => {
      const state = createTestState();
      renderer.render(container, state, () => undefined);

      const guides = [createTestGuide('guide-1', 'horizontal', 100, { locked: true })];
      renderer.renderGuides(guides, 1200, 1200);

      const guideLine = container.querySelector('line[data-guide-id="guide-1"]');
      expect(guideLine?.getAttribute('stroke-dasharray')).toBe('4,4');
    });

    it('should render unlocked guide without dashed stroke', () => {
      const state = createTestState();
      renderer.render(container, state, () => undefined);

      const guides = [createTestGuide('guide-1', 'horizontal', 100, { locked: false })];
      renderer.renderGuides(guides, 1200, 1200);

      const guideLine = container.querySelector('line[data-guide-id="guide-1"]');
      expect(guideLine?.getAttribute('stroke-dasharray')).toBe('none');
    });

    it('should update existing guide position', () => {
      const state = createTestState();
      renderer.render(container, state, () => undefined);

      // Render initial guide
      const guides1 = [createTestGuide('guide-1', 'horizontal', 100)];
      renderer.renderGuides(guides1, 1200, 1200);

      // Update guide position
      const guides2 = [createTestGuide('guide-1', 'horizontal', 200)];
      renderer.renderGuides(guides2, 1200, 1200);

      const guideLine = container.querySelector('line[data-guide-id="guide-1"]');
      expect(guideLine?.getAttribute('y1')).toBe('200');
      expect(guideLine?.getAttribute('y2')).toBe('200');
    });

    it('should remove guide when no longer in list', () => {
      const state = createTestState();
      renderer.render(container, state, () => undefined);

      // Render initial guides
      const guides1 = [
        createTestGuide('guide-1', 'horizontal', 100),
        createTestGuide('guide-2', 'vertical', 200),
      ];
      renderer.renderGuides(guides1, 1200, 1200);

      expect(container.querySelector('line[data-guide-id="guide-1"]')).not.toBeNull();
      expect(container.querySelector('line[data-guide-id="guide-2"]')).not.toBeNull();

      // Remove first guide
      const guides2 = [createTestGuide('guide-2', 'vertical', 200)];
      renderer.renderGuides(guides2, 1200, 1200);

      expect(container.querySelector('line[data-guide-id="guide-1"]')).toBeNull();
      expect(container.querySelector('line[data-guide-id="guide-2"]')).not.toBeNull();
    });

    it('should clear all guides with clearGuides', () => {
      const state = createTestState();
      renderer.render(container, state, () => undefined);

      const guides = [
        createTestGuide('guide-1', 'horizontal', 100),
        createTestGuide('guide-2', 'vertical', 200),
      ];
      renderer.renderGuides(guides, 1200, 1200);

      renderer.clearGuides();

      expect(container.querySelector('line[data-guide-id="guide-1"]')).toBeNull();
      expect(container.querySelector('line[data-guide-id="guide-2"]')).toBeNull();
    });

    it('should render multiple guides', () => {
      const state = createTestState();
      renderer.render(container, state, () => undefined);

      const guides = [
        createTestGuide('guide-1', 'horizontal', 100),
        createTestGuide('guide-2', 'horizontal', 200),
        createTestGuide('guide-3', 'vertical', 300),
      ];
      renderer.renderGuides(guides, 1200, 1200);

      expect(container.querySelectorAll('line[data-guide-id]').length).toBe(3);
    });
  });

  // ============================================================
  // Snap Indicator Rendering
  // ============================================================

  describe('snap indicator rendering', () => {
    let container: HTMLDivElement;

    beforeEach(() => {
      container = document.createElement('div');
      document.body.appendChild(container);
    });

    afterEach(() => {
      renderer.destroy();
      container.remove();
    });

    it('should initialize snap indicators group on render', () => {
      const state = createTestState();
      renderer.render(container, state, () => undefined);

      const snapGroup = container.querySelector('g[id$="snap-indicators"]');
      expect(snapGroup).not.toBeNull();
    });

    it('should render vertical snap indicator', () => {
      const state = createTestState();
      renderer.render(container, state, () => undefined);

      const snapLines: SnapLines = {
        vertical: [
          {
            x: 100,
            target: { type: 'guide', orientation: 'vertical', position: 100 } as SnapTarget,
          },
        ],
        horizontal: [],
      };
      renderer.renderSnapIndicators(snapLines, 1200, 1200);

      const snapGroup = container.querySelector('g[id$="snap-indicators"]');
      const lines = snapGroup?.querySelectorAll('line');
      expect(lines?.length).toBe(1);

      const line = lines?.[0];
      expect(line?.getAttribute('x1')).toBe('100');
      expect(line?.getAttribute('y1')).toBe('0');
      expect(line?.getAttribute('x2')).toBe('100');
      expect(line?.getAttribute('y2')).toBe('1200');
    });

    it('should render horizontal snap indicator', () => {
      const state = createTestState();
      renderer.render(container, state, () => undefined);

      const snapLines: SnapLines = {
        vertical: [],
        horizontal: [
          {
            y: 200,
            target: { type: 'guide', orientation: 'horizontal', position: 200 } as SnapTarget,
          },
        ],
      };
      renderer.renderSnapIndicators(snapLines, 1200, 1200);

      const snapGroup = container.querySelector('g[id$="snap-indicators"]');
      const lines = snapGroup?.querySelectorAll('line');
      expect(lines?.length).toBe(1);

      const line = lines?.[0];
      expect(line?.getAttribute('x1')).toBe('0');
      expect(line?.getAttribute('y1')).toBe('200');
      expect(line?.getAttribute('x2')).toBe('1200');
      expect(line?.getAttribute('y2')).toBe('200');
    });

    it('should render snap indicators with dashed stroke', () => {
      const state = createTestState();
      renderer.render(container, state, () => undefined);

      const snapLines: SnapLines = {
        vertical: [
          {
            x: 100,
            target: { type: 'guide', orientation: 'vertical', position: 100 } as SnapTarget,
          },
        ],
        horizontal: [],
      };
      renderer.renderSnapIndicators(snapLines, 1200, 1200);

      const snapGroup = container.querySelector('g[id$="snap-indicators"]');
      const line = snapGroup?.querySelector('line');
      expect(line?.getAttribute('stroke-dasharray')).toBe('4,4');
    });

    it('should clear snap indicators with clearSnapIndicators', () => {
      const state = createTestState();
      renderer.render(container, state, () => undefined);

      const snapLines: SnapLines = {
        vertical: [
          {
            x: 100,
            target: { type: 'guide', orientation: 'vertical', position: 100 } as SnapTarget,
          },
        ],
        horizontal: [
          {
            y: 200,
            target: { type: 'guide', orientation: 'horizontal', position: 200 } as SnapTarget,
          },
        ],
      };
      renderer.renderSnapIndicators(snapLines, 1200, 1200);

      const snapGroup = container.querySelector('g[id$="snap-indicators"]');
      expect(snapGroup?.querySelectorAll('line').length).toBe(2);

      renderer.clearSnapIndicators();

      expect(snapGroup?.querySelectorAll('line').length).toBe(0);
    });

    it('should replace snap indicators on subsequent calls', () => {
      const state = createTestState();
      renderer.render(container, state, () => undefined);

      // First snap
      const snapLines1: SnapLines = {
        vertical: [
          {
            x: 100,
            target: { type: 'guide', orientation: 'vertical', position: 100 } as SnapTarget,
          },
        ],
        horizontal: [],
      };
      renderer.renderSnapIndicators(snapLines1, 1200, 1200);

      // Second snap with different position
      const snapLines2: SnapLines = {
        vertical: [
          {
            x: 200,
            target: { type: 'guide', orientation: 'vertical', position: 200 } as SnapTarget,
          },
        ],
        horizontal: [],
      };
      renderer.renderSnapIndicators(snapLines2, 1200, 1200);

      const snapGroup = container.querySelector('g[id$="snap-indicators"]');
      const lines = snapGroup?.querySelectorAll('line');
      expect(lines?.length).toBe(1);
      expect(lines?.[0]?.getAttribute('x1')).toBe('200');
    });
  });
});
