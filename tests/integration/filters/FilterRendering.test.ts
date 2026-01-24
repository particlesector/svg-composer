/**
 * Integration tests for SVG filter rendering
 * These tests verify that filter primitives are correctly rendered to SVG markup
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SVGComposer } from '../../../src/core/SVGComposer.js';
import {
  blur,
  dropShadow,
  glow,
  innerShadow,
  outline,
  grayscale,
  sepia,
  saturate,
  hueRotate,
  invert,
  brightness,
  contrast,
  brightnessContrast,
  sharpen,
  emboss,
  noise,
  vintage,
  duotone,
} from '../../../src/filters/EffectPresets.js';
import type { Transform } from '../../../src/core/types.js';
import type { ImageElement } from '../../../src/elements/types.js';
import type {
  FilterDefinition,
  GaussianBlurPrimitive,
  ColorMatrixPrimitive,
  MorphologyPrimitive,
  TurbulencePrimitive,
  ConvolveMatrixPrimitive,
  FloodPrimitive,
  CompositePrimitive,
  MergePrimitive,
  BlendPrimitive,
} from '../../../src/filters/types.js';

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

describe('Filter Rendering Integration', () => {
  let container: HTMLDivElement;
  let editor: SVGComposer;

  beforeEach(() => {
    container = document.createElement('div');
    container.id = 'test-container';
    document.body.appendChild(container);
    editor = new SVGComposer(container);
  });

  // ============================================================
  // Gaussian Blur Rendering
  // ============================================================

  describe('Gaussian Blur Rendering', () => {
    it('should render feGaussianBlur with correct stdDeviation', () => {
      const elementId = editor.addElement(createTestImageElement());
      editor.addEffect(elementId, blur(5));

      const svg = editor.toSVG();

      expect(svg).toContain('<feGaussianBlur');
      expect(svg).toContain('stdDeviation="5"');
    });

    it('should render blur with decimal stdDeviation', () => {
      const elementId = editor.addElement(createTestImageElement());
      editor.addEffect(elementId, blur(2.5));

      const svg = editor.toSVG();

      expect(svg).toContain('stdDeviation="2.5"');
    });

    it('should render filter with x/y/width/height region for blur', () => {
      const elementId = editor.addElement(createTestImageElement());
      editor.addEffect(elementId, blur(10));

      const svg = editor.toSVG();

      // Blur filters need extended region to show the blur beyond element bounds
      expect(svg).toMatch(/x="-\d+%"/);
      expect(svg).toMatch(/width="\d+%"/);
    });

    it('should render custom blur with edgeMode', () => {
      const elementId = editor.addElement(createTestImageElement());
      const filterId = editor.addFilter({
        primitives: [
          {
            type: 'gaussianBlur',
            stdDeviation: 5,
            edgeMode: 'duplicate',
          } as GaussianBlurPrimitive,
        ],
      });
      editor.applyFilter(elementId, filterId);

      const svg = editor.toSVG();

      expect(svg).toContain('edgeMode="duplicate"');
    });

    it('should render blur with separate X and Y stdDeviation', () => {
      const elementId = editor.addElement(createTestImageElement());
      const filterId = editor.addFilter({
        primitives: [
          {
            type: 'gaussianBlur',
            stdDeviation: [5, 10],
          } as GaussianBlurPrimitive,
        ],
      });
      editor.applyFilter(elementId, filterId);

      const svg = editor.toSVG();

      expect(svg).toContain('stdDeviation="5 10"');
    });
  });

  // ============================================================
  // Drop Shadow Rendering
  // ============================================================

  describe('Drop Shadow Rendering', () => {
    it('should render feDropShadow with correct attributes', () => {
      const elementId = editor.addElement(createTestImageElement());
      editor.addEffect(
        elementId,
        dropShadow({ offsetX: 4, offsetY: 6, blur: 8, color: '#ff0000' }),
      );

      const svg = editor.toSVG();

      expect(svg).toContain('<feDropShadow');
      expect(svg).toContain('dx="4"');
      expect(svg).toContain('dy="6"');
      expect(svg).toContain('stdDeviation="8"');
      expect(svg).toContain('flood-color="#ff0000"');
    });

    it('should render drop shadow with flood-opacity', () => {
      const elementId = editor.addElement(createTestImageElement());
      editor.addEffect(
        elementId,
        dropShadow({ offsetX: 4, offsetY: 4, blur: 4, color: '#000000', opacity: 0.5 }),
      );

      const svg = editor.toSVG();

      expect(svg).toContain('flood-opacity="0.5"');
    });

    it('should render drop shadow with negative offsets', () => {
      const elementId = editor.addElement(createTestImageElement());
      editor.addEffect(
        elementId,
        dropShadow({ offsetX: -4, offsetY: -4, blur: 4, color: '#000000' }),
      );

      const svg = editor.toSVG();

      expect(svg).toContain('dx="-4"');
      expect(svg).toContain('dy="-4"');
    });
  });

  // ============================================================
  // Color Matrix Rendering
  // ============================================================

  describe('Color Matrix Rendering', () => {
    it('should render grayscale as matrix type colorMatrix with luminance coefficients', () => {
      const elementId = editor.addElement(createTestImageElement());
      editor.addEffect(elementId, grayscale(1));

      const svg = editor.toSVG();

      expect(svg).toContain('<feColorMatrix');
      expect(svg).toContain('type="matrix"');
      // Full grayscale uses luminance coefficients: R=0.2126, G=0.7152, B=0.0722
      expect(svg).toContain('0.2126');
      expect(svg).toContain('0.7152');
      expect(svg).toContain('0.0722');
    });

    it('should render partial grayscale with interpolated matrix values', () => {
      const elementId = editor.addElement(createTestImageElement());
      editor.addEffect(elementId, grayscale(0.5));

      const svg = editor.toSVG();

      expect(svg).toContain('type="matrix"');
      // Partial grayscale interpolates between identity and grayscale matrix
      expect(svg).toMatch(/values="[\d.\s-]+"/);
    });

    it('should render sepia as matrix type colorMatrix', () => {
      const elementId = editor.addElement(createTestImageElement());
      editor.addEffect(elementId, sepia(1));

      const svg = editor.toSVG();

      expect(svg).toContain('<feColorMatrix');
      expect(svg).toContain('type="matrix"');
      // Check for sepia matrix values
      expect(svg).toMatch(/values="[\d.\s]+"/);
    });

    it('should render saturate effect correctly', () => {
      const elementId = editor.addElement(createTestImageElement());
      editor.addEffect(elementId, saturate(2));

      const svg = editor.toSVG();

      expect(svg).toContain('type="saturate"');
      expect(svg).toContain('values="2"');
    });

    it('should render hueRotate effect correctly', () => {
      const elementId = editor.addElement(createTestImageElement());
      editor.addEffect(elementId, hueRotate(90));

      const svg = editor.toSVG();

      expect(svg).toContain('type="hueRotate"');
      expect(svg).toContain('values="90"');
    });

    it('should render custom matrix values', () => {
      const elementId = editor.addElement(createTestImageElement());
      const filterId = editor.addFilter({
        primitives: [
          {
            type: 'colorMatrix',
            matrixType: 'matrix',
            values: [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0],
          } as ColorMatrixPrimitive,
        ],
      });
      editor.applyFilter(elementId, filterId);

      const svg = editor.toSVG();

      expect(svg).toContain('type="matrix"');
      expect(svg).toContain('values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0"');
    });
  });

  // ============================================================
  // Component Transfer Rendering
  // ============================================================

  describe('Component Transfer Rendering', () => {
    it('should render brightness as componentTransfer with linear functions', () => {
      const elementId = editor.addElement(createTestImageElement());
      editor.addEffect(elementId, brightness(1.5));

      const svg = editor.toSVG();

      expect(svg).toContain('<feComponentTransfer');
      expect(svg).toContain('<feFuncR');
      expect(svg).toContain('<feFuncG');
      expect(svg).toContain('<feFuncB');
      expect(svg).toContain('type="linear"');
      expect(svg).toContain('slope="1.5"');
    });

    it('should render contrast with correct slope and intercept', () => {
      const elementId = editor.addElement(createTestImageElement());
      editor.addEffect(elementId, contrast(2));

      const svg = editor.toSVG();

      expect(svg).toContain('<feComponentTransfer');
      expect(svg).toContain('slope="2"');
      expect(svg).toContain('intercept=');
    });

    it('should render invert as componentTransfer with table', () => {
      const elementId = editor.addElement(createTestImageElement());
      editor.addEffect(elementId, invert(1));

      const svg = editor.toSVG();

      expect(svg).toContain('<feComponentTransfer');
      expect(svg).toContain('type="table"');
      expect(svg).toContain('tableValues="1 0"');
    });

    it('should render brightnessContrast combined effect', () => {
      const elementId = editor.addElement(createTestImageElement());
      editor.addEffect(elementId, brightnessContrast({ brightness: 1.2, contrast: 1.5 }));

      const svg = editor.toSVG();

      expect(svg).toContain('<feComponentTransfer');
      // Should have combined slope/intercept values
      expect(svg).toMatch(/slope="[\d.]+".*intercept="[\d.-]+"/);
    });
  });

  // ============================================================
  // Morphology Rendering
  // ============================================================

  describe('Morphology Rendering', () => {
    it('should render outline using morphology dilate', () => {
      const elementId = editor.addElement(createTestImageElement());
      editor.addEffect(elementId, outline({ width: 3, color: '#ff0000' }));

      const svg = editor.toSVG();

      expect(svg).toContain('<feMorphology');
      expect(svg).toContain('operator="dilate"');
      expect(svg).toContain('radius="3"');
    });

    it('should render custom morphology with erode operator', () => {
      const elementId = editor.addElement(createTestImageElement());
      const filterId = editor.addFilter({
        primitives: [
          {
            type: 'morphology',
            operator: 'erode',
            radius: 2,
          } as MorphologyPrimitive,
        ],
      });
      editor.applyFilter(elementId, filterId);

      const svg = editor.toSVG();

      expect(svg).toContain('operator="erode"');
      expect(svg).toContain('radius="2"');
    });

    it('should render morphology with separate X and Y radius', () => {
      const elementId = editor.addElement(createTestImageElement());
      const filterId = editor.addFilter({
        primitives: [
          {
            type: 'morphology',
            operator: 'dilate',
            radius: [2, 4],
          } as MorphologyPrimitive,
        ],
      });
      editor.applyFilter(elementId, filterId);

      const svg = editor.toSVG();

      expect(svg).toContain('radius="2 4"');
    });
  });

  // ============================================================
  // Turbulence Rendering
  // ============================================================

  describe('Turbulence Rendering', () => {
    it('should render noise effect with feTurbulence', () => {
      const elementId = editor.addElement(createTestImageElement());
      editor.addEffect(elementId, noise({ intensity: 0.3 }));

      const svg = editor.toSVG();

      expect(svg).toContain('<feTurbulence');
      expect(svg).toContain('baseFrequency=');
    });

    it('should render turbulence with correct type', () => {
      const elementId = editor.addElement(createTestImageElement());
      editor.addEffect(elementId, noise({ intensity: 0.3, noiseType: 'fractal' }));

      const svg = editor.toSVG();

      expect(svg).toContain('type="fractalNoise"');
    });

    it('should render custom turbulence with numOctaves', () => {
      const elementId = editor.addElement(createTestImageElement());
      const filterId = editor.addFilter({
        primitives: [
          {
            type: 'turbulence',
            turbulenceType: 'turbulence',
            baseFrequency: 0.05,
            numOctaves: 3,
            seed: 42,
          } as TurbulencePrimitive,
        ],
      });
      editor.applyFilter(elementId, filterId);

      const svg = editor.toSVG();

      expect(svg).toContain('type="turbulence"');
      expect(svg).toContain('numOctaves="3"');
      expect(svg).toContain('seed="42"');
    });
  });

  // ============================================================
  // Convolve Matrix Rendering
  // ============================================================

  describe('Convolve Matrix Rendering', () => {
    it('should render sharpen as convolveMatrix', () => {
      const elementId = editor.addElement(createTestImageElement());
      editor.addEffect(elementId, sharpen(1));

      const svg = editor.toSVG();

      expect(svg).toContain('<feConvolveMatrix');
      expect(svg).toContain('order="3 3"');
      expect(svg).toContain('kernelMatrix=');
    });

    it('should render emboss effect with convolveMatrix', () => {
      const elementId = editor.addElement(createTestImageElement());
      editor.addEffect(elementId, emboss());

      const svg = editor.toSVG();

      expect(svg).toContain('<feConvolveMatrix');
      expect(svg).toContain('kernelMatrix=');
    });

    it('should render custom convolveMatrix with divisor and bias', () => {
      const elementId = editor.addElement(createTestImageElement());
      const filterId = editor.addFilter({
        primitives: [
          {
            type: 'convolveMatrix',
            order: [3, 3],
            kernelMatrix: [0, -1, 0, -1, 5, -1, 0, -1, 0],
            divisor: 1,
            bias: 0,
          } as ConvolveMatrixPrimitive,
        ],
      });
      editor.applyFilter(elementId, filterId);

      const svg = editor.toSVG();

      expect(svg).toContain('kernelMatrix="0 -1 0 -1 5 -1 0 -1 0"');
      expect(svg).toContain('divisor="1"');
    });
  });

  // ============================================================
  // Flood and Composite Rendering
  // ============================================================

  describe('Flood and Composite Rendering', () => {
    it('should render feFlood in glow effect', () => {
      const elementId = editor.addElement(createTestImageElement());
      editor.addEffect(elementId, glow({ radius: 10, color: '#00ff00' }));

      const svg = editor.toSVG();

      expect(svg).toContain('<feFlood');
      expect(svg).toContain('flood-color="#00ff00"');
    });

    it('should render feComposite in glow effect', () => {
      const elementId = editor.addElement(createTestImageElement());
      editor.addEffect(elementId, glow({ radius: 10, color: '#00ff00' }));

      const svg = editor.toSVG();

      expect(svg).toContain('<feComposite');
      expect(svg).toContain('operator=');
    });

    it('should render custom flood with opacity', () => {
      const elementId = editor.addElement(createTestImageElement());
      const filterId = editor.addFilter({
        primitives: [
          {
            type: 'flood',
            floodColor: '#ff0000',
            floodOpacity: 0.5,
            result: 'flood',
          } as FloodPrimitive,
        ],
      });
      editor.applyFilter(elementId, filterId);

      const svg = editor.toSVG();

      expect(svg).toContain('flood-color="#ff0000"');
      expect(svg).toContain('flood-opacity="0.5"');
      expect(svg).toContain('result="flood"');
    });

    it('should render composite with arithmetic operator and k values', () => {
      const elementId = editor.addElement(createTestImageElement());
      const filterId = editor.addFilter({
        primitives: [
          {
            type: 'composite',
            in2: 'SourceGraphic',
            operator: 'arithmetic',
            k1: 0,
            k2: 1,
            k3: 1,
            k4: 0,
          } as CompositePrimitive,
        ],
      });
      editor.applyFilter(elementId, filterId);

      const svg = editor.toSVG();

      expect(svg).toContain('<feComposite');
      expect(svg).toContain('operator="arithmetic"');
      expect(svg).toContain('k1="0"');
      expect(svg).toContain('k2="1"');
      expect(svg).toContain('k3="1"');
      expect(svg).toContain('k4="0"');
    });
  });

  // ============================================================
  // Merge and Offset Rendering
  // ============================================================

  describe('Merge and Offset Rendering', () => {
    it('should render feMerge with multiple nodes', () => {
      const elementId = editor.addElement(createTestImageElement());
      editor.addEffect(elementId, glow({ radius: 10, color: '#ffffff' }));

      const svg = editor.toSVG();

      expect(svg).toContain('<feMerge');
      expect(svg).toContain('<feMergeNode');
    });

    it('should render feOffset in inner shadow effect', () => {
      const elementId = editor.addElement(createTestImageElement());
      editor.addEffect(elementId, innerShadow({ offsetX: 4, offsetY: 4, blur: 4, color: '#000' }));

      const svg = editor.toSVG();

      expect(svg).toContain('<feOffset');
      expect(svg).toContain('dx="4"');
      expect(svg).toContain('dy="4"');
    });

    it('should render custom merge with specific inputs', () => {
      const elementId = editor.addElement(createTestImageElement());
      const filterId = editor.addFilter({
        primitives: [
          {
            type: 'gaussianBlur',
            stdDeviation: 5,
            result: 'blur',
          } as GaussianBlurPrimitive,
          {
            type: 'merge',
            nodes: [{ in: 'blur' }, { in: 'SourceGraphic' }],
          } as MergePrimitive,
        ],
      });
      editor.applyFilter(elementId, filterId);

      const svg = editor.toSVG();

      expect(svg).toContain('result="blur"');
      expect(svg).toContain('<feMergeNode in="blur"');
      expect(svg).toContain('<feMergeNode in="SourceGraphic"');
    });
  });

  // ============================================================
  // Blend Rendering
  // ============================================================

  describe('Blend Rendering', () => {
    it('should render feBlend with correct mode', () => {
      const elementId = editor.addElement(createTestImageElement());
      const filterId = editor.addFilter({
        primitives: [
          {
            type: 'blend',
            in2: 'BackgroundImage',
            mode: 'multiply',
          } as BlendPrimitive,
        ],
      });
      editor.applyFilter(elementId, filterId);

      const svg = editor.toSVG();

      expect(svg).toContain('<feBlend');
      expect(svg).toContain('in2="BackgroundImage"');
      expect(svg).toContain('mode="multiply"');
    });
  });

  // ============================================================
  // Complex Filter Chains
  // ============================================================

  describe('Complex Filter Chains', () => {
    it('should render duotone effect with multiple primitives', () => {
      const elementId = editor.addElement(createTestImageElement());
      editor.addEffect(elementId, duotone('#000033', '#ffcc00'));

      const svg = editor.toSVG();

      // Duotone uses colorMatrix + componentTransfer
      expect(svg).toContain('<feColorMatrix');
      expect(svg).toContain('<feComponentTransfer');
    });

    it('should render vintage effect with multiple primitives', () => {
      const elementId = editor.addElement(createTestImageElement());
      editor.addEffect(elementId, vintage(1));

      const svg = editor.toSVG();

      // Vintage uses multiple color adjustments
      expect(svg).toContain('<feColorMatrix');
    });

    it('should render first filter when multiple effects applied to same element', () => {
      const elementId = editor.addElement(createTestImageElement());
      editor.addEffect(elementId, blur(3));
      editor.addEffect(elementId, grayscale(0.5));
      editor.addEffect(elementId, dropShadow({ offsetX: 4, offsetY: 4, blur: 4, color: '#000' }));

      const svg = editor.toSVG();

      // Current implementation renders only the first filter
      // The element should have all filters stored, but only first is rendered
      expect(svg).toContain('feGaussianBlur'); // First filter (blur)
      expect(svg).toContain('filter="url(#');

      // Verify element has all filters stored
      const filters = editor.getElementFilters(elementId);
      expect(filters).toHaveLength(3);
    });
  });

  // ============================================================
  // Filter Attributes
  // ============================================================

  describe('Filter Attributes', () => {
    it('should render filter with filterUnits', () => {
      const elementId = editor.addElement(createTestImageElement());
      const filter: Omit<FilterDefinition, 'id'> = {
        primitives: [{ type: 'gaussianBlur', stdDeviation: 5 } as GaussianBlurPrimitive],
        filterUnits: 'userSpaceOnUse',
      };
      const filterId = editor.addFilter(filter);
      editor.applyFilter(elementId, filterId);

      const svg = editor.toSVG();

      expect(svg).toContain('filterUnits="userSpaceOnUse"');
    });

    it('should render filter with primitiveUnits', () => {
      const elementId = editor.addElement(createTestImageElement());
      const filter: Omit<FilterDefinition, 'id'> = {
        primitives: [{ type: 'gaussianBlur', stdDeviation: 5 } as GaussianBlurPrimitive],
        primitiveUnits: 'objectBoundingBox',
      };
      const filterId = editor.addFilter(filter);
      editor.applyFilter(elementId, filterId);

      const svg = editor.toSVG();

      expect(svg).toContain('primitiveUnits="objectBoundingBox"');
    });

    it('should render filter with color-interpolation-filters', () => {
      const elementId = editor.addElement(createTestImageElement());
      const filter: Omit<FilterDefinition, 'id'> = {
        primitives: [{ type: 'gaussianBlur', stdDeviation: 5 } as GaussianBlurPrimitive],
        colorInterpolationFilters: 'linearRGB',
      };
      const filterId = editor.addFilter(filter);
      editor.applyFilter(elementId, filterId);

      const svg = editor.toSVG();

      expect(svg).toContain('color-interpolation-filters="linearRGB"');
    });

    it('should render primitive with in and result attributes', () => {
      const elementId = editor.addElement(createTestImageElement());
      const filter: Omit<FilterDefinition, 'id'> = {
        primitives: [
          {
            type: 'gaussianBlur',
            stdDeviation: 5,
            in: 'SourceAlpha',
            result: 'blurred',
          } as GaussianBlurPrimitive,
        ],
      };
      const filterId = editor.addFilter(filter);
      editor.applyFilter(elementId, filterId);

      const svg = editor.toSVG();

      expect(svg).toContain('in="SourceAlpha"');
      expect(svg).toContain('result="blurred"');
    });
  });

  // ============================================================
  // Element Filter Application
  // ============================================================

  describe('Element Filter Application', () => {
    it('should apply filter attribute to image element', () => {
      const elementId = editor.addElement(createTestImageElement());
      const filterId = editor.addEffect(elementId, blur(5));

      const svg = editor.toSVG();

      // The image should reference the filter
      expect(svg).toMatch(new RegExp(`filter="url\\(#${filterId}\\)"`));
    });

    it('should apply filter to text element', () => {
      const elementId = editor.addElement({
        type: 'text',
        content: 'Test',
        fontSize: 24,
        fontFamily: 'Arial',
        fill: '#000000',
        transform: createTestTransform(),
        opacity: 1,
        zIndex: 0,
        locked: false,
        visible: true,
      });
      editor.addEffect(elementId, dropShadow({ offsetX: 2, offsetY: 2, blur: 4, color: '#000' }));

      const svg = editor.toSVG();

      expect(svg).toContain('<text');
      expect(svg).toContain('filter="url(#');
      expect(svg).toContain('feDropShadow');
    });

    it('should apply filter to shape element', () => {
      const elementId = editor.addElement({
        type: 'shape',
        shapeType: 'rect',
        width: 100,
        height: 100,
        fill: '#ff0000',
        stroke: '#000000',
        strokeWidth: 1,
        transform: createTestTransform(),
        opacity: 1,
        zIndex: 0,
        locked: false,
        visible: true,
      });
      editor.addEffect(elementId, glow({ radius: 5, color: '#ffffff' }));

      const svg = editor.toSVG();

      // Should have two rects - background and the shape
      const rectMatches = svg.match(/<rect/g);
      expect(rectMatches).not.toBeNull();
      expect(rectMatches!.length).toBeGreaterThanOrEqual(2);
      expect(svg).toContain('filter="url(#');
    });
  });
});
