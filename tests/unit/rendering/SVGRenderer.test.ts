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
import type { CanvasState, Transform } from '../../../src/core/types.js';

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
    ...overrides,
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
    });
  });
});
