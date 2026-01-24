/**
 * SVGRenderer filter-specific tests
 * Tests for filter DOM rendering and advanced filter primitives
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SVGRenderer } from '../../../src/rendering/SVGRenderer.js';
import type { CanvasState, Transform } from '../../../src/core/types.js';
import type { BaseElement, ImageElement, ShapeElement } from '../../../src/elements/types.js';
import type {
  FilterDefinition,
  GaussianBlurPrimitive,
  DropShadowPrimitive,
  ColorMatrixPrimitive,
  ComponentTransferPrimitive,
  MorphologyPrimitive,
  TurbulencePrimitive,
  DisplacementPrimitive,
  BlendPrimitive,
  CompositePrimitive,
  FloodPrimitive,
  MergePrimitive,
  OffsetPrimitive,
  ConvolveMatrixPrimitive,
  LightingPrimitive,
  ElementFilter,
} from '../../../src/filters/types.js';

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

function createShapeElement(id: string, overrides?: Partial<ShapeElement>): ShapeElement {
  return {
    id,
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
    ...overrides,
  };
}

describe('SVGRenderer Filter Rendering', () => {
  let renderer: SVGRenderer;
  let container: HTMLDivElement;

  beforeEach(() => {
    renderer = new SVGRenderer();
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  // ============================================================
  // Lighting Primitives
  // ============================================================

  describe('Lighting Primitives', () => {
    it('should render diffuse lighting with distant light', () => {
      const filter: FilterDefinition = {
        id: 'filter-lighting-diffuse',
        primitives: [
          {
            type: 'lighting',
            lightingType: 'diffuse',
            surfaceScale: 5,
            diffuseConstant: 1,
            lightingColor: '#ffffff',
            light: {
              type: 'distant',
              azimuth: 45,
              elevation: 55,
            },
          } as LightingPrimitive,
        ],
      };

      const element = createImageElement('img-1', {
        filters: [{ type: 'custom', filterId: filter.id }],
      });
      const state = createTestState([element]);

      const svg = renderer.toSVG(
        state,
        createElementGetter([element]),
        (_filter: ElementFilter) => filter.id,
        (_id: string) => filter,
      );

      expect(svg).toContain('<feDiffuseLighting');
      expect(svg).toContain('surfaceScale="5"');
      expect(svg).toContain('diffuseConstant="1"');
      expect(svg).toContain('lighting-color="#ffffff"');
      expect(svg).toContain('<feDistantLight');
      expect(svg).toContain('azimuth="45"');
      expect(svg).toContain('elevation="55"');
    });

    it('should render specular lighting with point light', () => {
      const filter: FilterDefinition = {
        id: 'filter-lighting-specular',
        primitives: [
          {
            type: 'lighting',
            lightingType: 'specular',
            surfaceScale: 3,
            specularConstant: 1.5,
            specularExponent: 20,
            lightingColor: '#ffffff',
            light: {
              type: 'point',
              x: 50,
              y: 50,
              z: 100,
            },
          } as LightingPrimitive,
        ],
      };

      const element = createImageElement('img-1', {
        filters: [{ type: 'custom', filterId: filter.id }],
      });
      const state = createTestState([element]);

      const svg = renderer.toSVG(
        state,
        createElementGetter([element]),
        (_filter: ElementFilter) => filter.id,
        (_id: string) => filter,
      );

      expect(svg).toContain('<feSpecularLighting');
      expect(svg).toContain('surfaceScale="3"');
      expect(svg).toContain('specularConstant="1.5"');
      expect(svg).toContain('specularExponent="20"');
      expect(svg).toContain('<fePointLight');
      expect(svg).toContain('x="50"');
      expect(svg).toContain('y="50"');
      expect(svg).toContain('z="100"');
    });

    it('should render lighting with spot light', () => {
      const filter: FilterDefinition = {
        id: 'filter-lighting-spot',
        primitives: [
          {
            type: 'lighting',
            lightingType: 'specular',
            light: {
              type: 'spot',
              x: 50,
              y: 50,
              z: 100,
              pointsAtX: 100,
              pointsAtY: 100,
              pointsAtZ: 0,
              specularExponent: 15,
              limitingConeAngle: 30,
            },
          } as LightingPrimitive,
        ],
      };

      const element = createImageElement('img-1', {
        filters: [{ type: 'custom', filterId: filter.id }],
      });
      const state = createTestState([element]);

      const svg = renderer.toSVG(
        state,
        createElementGetter([element]),
        (_filter: ElementFilter) => filter.id,
        (_id: string) => filter,
      );

      expect(svg).toContain('<feSpotLight');
      expect(svg).toContain('pointsAtX="100"');
      expect(svg).toContain('pointsAtY="100"');
      expect(svg).toContain('pointsAtZ="0"');
      expect(svg).toContain('specularExponent="15"');
      expect(svg).toContain('limitingConeAngle="30"');
    });

    it('should render diffuse lighting without optional attributes', () => {
      const filter: FilterDefinition = {
        id: 'filter-lighting-minimal',
        primitives: [
          {
            type: 'lighting',
            lightingType: 'diffuse',
            light: {
              type: 'distant',
              azimuth: 0,
              elevation: 0,
            },
          } as LightingPrimitive,
        ],
      };

      const element = createImageElement('img-1', {
        filters: [{ type: 'custom', filterId: filter.id }],
      });
      const state = createTestState([element]);

      const svg = renderer.toSVG(
        state,
        createElementGetter([element]),
        (_filter: ElementFilter) => filter.id,
        (_id: string) => filter,
      );

      expect(svg).toContain('<feDiffuseLighting');
      expect(svg).toContain('<feDistantLight');
    });

    it('should render specular lighting without optional attributes', () => {
      const filter: FilterDefinition = {
        id: 'filter-specular-minimal',
        primitives: [
          {
            type: 'lighting',
            lightingType: 'specular',
            light: {
              type: 'point',
              x: 0,
              y: 0,
              z: 0,
            },
          } as LightingPrimitive,
        ],
      };

      const element = createImageElement('img-1', {
        filters: [{ type: 'custom', filterId: filter.id }],
      });
      const state = createTestState([element]);

      const svg = renderer.toSVG(
        state,
        createElementGetter([element]),
        (_filter: ElementFilter) => filter.id,
        (_id: string) => filter,
      );

      expect(svg).toContain('<feSpecularLighting');
      expect(svg).toContain('<fePointLight');
    });
  });

  // ============================================================
  // ConvolveMatrix Advanced Options
  // ============================================================

  describe('ConvolveMatrix Advanced Options', () => {
    it('should render convolve matrix with all optional attributes', () => {
      const filter: FilterDefinition = {
        id: 'filter-convolve-full',
        primitives: [
          {
            type: 'convolveMatrix',
            order: [3, 3],
            kernelMatrix: [0, -1, 0, -1, 5, -1, 0, -1, 0],
            divisor: 1,
            bias: 0.5,
            targetX: 1,
            targetY: 1,
            edgeMode: 'duplicate',
            preserveAlpha: true,
          } as ConvolveMatrixPrimitive,
        ],
      };

      const element = createImageElement('img-1', {
        filters: [{ type: 'custom', filterId: filter.id }],
      });
      const state = createTestState([element]);

      const svg = renderer.toSVG(
        state,
        createElementGetter([element]),
        (_filter: ElementFilter) => filter.id,
        (_id: string) => filter,
      );

      expect(svg).toContain('<feConvolveMatrix');
      expect(svg).toContain('order="3 3"');
      expect(svg).toContain('kernelMatrix="0 -1 0 -1 5 -1 0 -1 0"');
      expect(svg).toContain('divisor="1"');
      expect(svg).toContain('bias="0.5"');
      expect(svg).toContain('targetX="1"');
      expect(svg).toContain('targetY="1"');
      expect(svg).toContain('edgeMode="duplicate"');
      expect(svg).toContain('preserveAlpha="true"');
    });

    it('should render convolve matrix with wrap edge mode', () => {
      const filter: FilterDefinition = {
        id: 'filter-convolve-wrap',
        primitives: [
          {
            type: 'convolveMatrix',
            order: [3, 3],
            kernelMatrix: [1, 1, 1, 1, 1, 1, 1, 1, 1],
            edgeMode: 'wrap',
          } as ConvolveMatrixPrimitive,
        ],
      };

      const element = createImageElement('img-1', {
        filters: [{ type: 'custom', filterId: filter.id }],
      });
      const state = createTestState([element]);

      const svg = renderer.toSVG(
        state,
        createElementGetter([element]),
        (_filter: ElementFilter) => filter.id,
        (_id: string) => filter,
      );

      expect(svg).toContain('edgeMode="wrap"');
    });
  });

  // ============================================================
  // Displacement Map
  // ============================================================

  describe('Displacement Map', () => {
    it('should render displacement map with channel selectors', () => {
      const filter: FilterDefinition = {
        id: 'filter-displacement',
        primitives: [
          {
            type: 'turbulence',
            turbulenceType: 'turbulence',
            baseFrequency: 0.05,
            result: 'turbulence',
          } as TurbulencePrimitive,
          {
            type: 'displacement',
            in: 'SourceGraphic',
            in2: 'turbulence',
            scale: 20,
            xChannelSelector: 'R',
            yChannelSelector: 'G',
          } as DisplacementPrimitive,
        ],
      };

      const element = createImageElement('img-1', {
        filters: [{ type: 'custom', filterId: filter.id }],
      });
      const state = createTestState([element]);

      const svg = renderer.toSVG(
        state,
        createElementGetter([element]),
        (_filter: ElementFilter) => filter.id,
        (_id: string) => filter,
      );

      expect(svg).toContain('<feDisplacementMap');
      expect(svg).toContain('in2="turbulence"');
      expect(svg).toContain('scale="20"');
      expect(svg).toContain('xChannelSelector="R"');
      expect(svg).toContain('yChannelSelector="G"');
    });

    it('should render displacement map without optional channel selectors', () => {
      const filter: FilterDefinition = {
        id: 'filter-displacement-minimal',
        primitives: [
          {
            type: 'displacement',
            in2: 'SourceGraphic',
            scale: 10,
          } as DisplacementPrimitive,
        ],
      };

      const element = createImageElement('img-1', {
        filters: [{ type: 'custom', filterId: filter.id }],
      });
      const state = createTestState([element]);

      const svg = renderer.toSVG(
        state,
        createElementGetter([element]),
        (_filter: ElementFilter) => filter.id,
        (_id: string) => filter,
      );

      expect(svg).toContain('<feDisplacementMap');
      expect(svg).toContain('scale="10"');
    });
  });

  // ============================================================
  // Turbulence Options
  // ============================================================

  describe('Turbulence Options', () => {
    it('should render turbulence with stitch tiles', () => {
      const filter: FilterDefinition = {
        id: 'filter-turbulence-stitch',
        primitives: [
          {
            type: 'turbulence',
            turbulenceType: 'fractalNoise',
            baseFrequency: [0.02, 0.03],
            numOctaves: 5,
            seed: 123,
            stitchTiles: 'stitch',
          } as TurbulencePrimitive,
        ],
      };

      const element = createImageElement('img-1', {
        filters: [{ type: 'custom', filterId: filter.id }],
      });
      const state = createTestState([element]);

      const svg = renderer.toSVG(
        state,
        createElementGetter([element]),
        (_filter: ElementFilter) => filter.id,
        (_id: string) => filter,
      );

      expect(svg).toContain('<feTurbulence');
      expect(svg).toContain('type="fractalNoise"');
      expect(svg).toContain('baseFrequency="0.02 0.03"');
      expect(svg).toContain('numOctaves="5"');
      expect(svg).toContain('seed="123"');
      expect(svg).toContain('stitchTiles="stitch"');
    });
  });

  // ============================================================
  // Composite Operators
  // ============================================================

  describe('Composite Operators', () => {
    it('should render composite with in operator', () => {
      const filter: FilterDefinition = {
        id: 'filter-composite-in',
        primitives: [
          {
            type: 'composite',
            in: 'SourceGraphic',
            in2: 'SourceAlpha',
            operator: 'in',
          } as CompositePrimitive,
        ],
      };

      const element = createImageElement('img-1', {
        filters: [{ type: 'custom', filterId: filter.id }],
      });
      const state = createTestState([element]);

      const svg = renderer.toSVG(
        state,
        createElementGetter([element]),
        (_filter: ElementFilter) => filter.id,
        (_id: string) => filter,
      );

      expect(svg).toContain('<feComposite');
      expect(svg).toContain('operator="in"');
    });

    it('should render composite with out operator', () => {
      const filter: FilterDefinition = {
        id: 'filter-composite-out',
        primitives: [
          {
            type: 'composite',
            in2: 'SourceAlpha',
            operator: 'out',
          } as CompositePrimitive,
        ],
      };

      const element = createImageElement('img-1', {
        filters: [{ type: 'custom', filterId: filter.id }],
      });
      const state = createTestState([element]);

      const svg = renderer.toSVG(
        state,
        createElementGetter([element]),
        (_filter: ElementFilter) => filter.id,
        (_id: string) => filter,
      );

      expect(svg).toContain('operator="out"');
    });

    it('should render composite with xor operator', () => {
      const filter: FilterDefinition = {
        id: 'filter-composite-xor',
        primitives: [
          {
            type: 'composite',
            in2: 'SourceAlpha',
            operator: 'xor',
          } as CompositePrimitive,
        ],
      };

      const element = createImageElement('img-1', {
        filters: [{ type: 'custom', filterId: filter.id }],
      });
      const state = createTestState([element]);

      const svg = renderer.toSVG(
        state,
        createElementGetter([element]),
        (_filter: ElementFilter) => filter.id,
        (_id: string) => filter,
      );

      expect(svg).toContain('operator="xor"');
    });
  });

  // ============================================================
  // Blend Modes
  // ============================================================

  describe('Blend Modes', () => {
    const blendModes = ['normal', 'multiply', 'screen', 'darken', 'lighten', 'overlay'] as const;

    for (const mode of blendModes) {
      it(`should render blend with ${mode} mode`, () => {
        const filter: FilterDefinition = {
          id: `filter-blend-${mode}`,
          primitives: [
            {
              type: 'blend',
              in2: 'BackgroundImage',
              mode,
            } as BlendPrimitive,
          ],
        };

        const element = createImageElement('img-1', {
          filters: [{ type: 'custom', filterId: filter.id }],
        });
        const state = createTestState([element]);

        const svg = renderer.toSVG(
          state,
          createElementGetter([element]),
          (_filter: ElementFilter) => filter.id,
          (_id: string) => filter,
        );

        expect(svg).toContain('<feBlend');
        expect(svg).toContain(`mode="${mode}"`);
      });
    }
  });

  // ============================================================
  // Component Transfer Functions
  // ============================================================

  describe('Component Transfer Functions', () => {
    it('should render component transfer with gamma functions', () => {
      const filter: FilterDefinition = {
        id: 'filter-gamma',
        primitives: [
          {
            type: 'componentTransfer',
            funcR: { type: 'gamma', amplitude: 1.2, exponent: 0.8, offset: 0 },
            funcG: { type: 'gamma', amplitude: 1.2, exponent: 0.8, offset: 0 },
            funcB: { type: 'gamma', amplitude: 1.2, exponent: 0.8, offset: 0 },
          } as ComponentTransferPrimitive,
        ],
      };

      const element = createImageElement('img-1', {
        filters: [{ type: 'custom', filterId: filter.id }],
      });
      const state = createTestState([element]);

      const svg = renderer.toSVG(
        state,
        createElementGetter([element]),
        (_filter: ElementFilter) => filter.id,
        (_id: string) => filter,
      );

      expect(svg).toContain('<feComponentTransfer');
      expect(svg).toContain('<feFuncR');
      expect(svg).toContain('type="gamma"');
      expect(svg).toContain('amplitude="1.2"');
      expect(svg).toContain('exponent="0.8"');
    });

    it('should render component transfer with discrete functions', () => {
      const filter: FilterDefinition = {
        id: 'filter-discrete',
        primitives: [
          {
            type: 'componentTransfer',
            funcR: { type: 'discrete', tableValues: [0, 0.5, 1] },
            funcG: { type: 'discrete', tableValues: [0, 0.5, 1] },
            funcB: { type: 'discrete', tableValues: [0, 0.5, 1] },
          } as ComponentTransferPrimitive,
        ],
      };

      const element = createImageElement('img-1', {
        filters: [{ type: 'custom', filterId: filter.id }],
      });
      const state = createTestState([element]);

      const svg = renderer.toSVG(
        state,
        createElementGetter([element]),
        (_filter: ElementFilter) => filter.id,
        (_id: string) => filter,
      );

      expect(svg).toContain('type="discrete"');
      expect(svg).toContain('tableValues="0 0.5 1"');
    });

    it('should render component transfer with alpha function', () => {
      const filter: FilterDefinition = {
        id: 'filter-alpha',
        primitives: [
          {
            type: 'componentTransfer',
            funcA: { type: 'linear', slope: 0.5, intercept: 0 },
          } as ComponentTransferPrimitive,
        ],
      };

      const element = createImageElement('img-1', {
        filters: [{ type: 'custom', filterId: filter.id }],
      });
      const state = createTestState([element]);

      const svg = renderer.toSVG(
        state,
        createElementGetter([element]),
        (_filter: ElementFilter) => filter.id,
        (_id: string) => filter,
      );

      expect(svg).toContain('<feFuncA');
      expect(svg).toContain('type="linear"');
      expect(svg).toContain('slope="0.5"');
    });
  });

  // ============================================================
  // Morphology Operators
  // ============================================================

  describe('Morphology Operators', () => {
    it('should render morphology with erode operator', () => {
      const filter: FilterDefinition = {
        id: 'filter-erode',
        primitives: [
          {
            type: 'morphology',
            operator: 'erode',
            radius: 2,
          } as MorphologyPrimitive,
        ],
      };

      const element = createImageElement('img-1', {
        filters: [{ type: 'custom', filterId: filter.id }],
      });
      const state = createTestState([element]);

      const svg = renderer.toSVG(
        state,
        createElementGetter([element]),
        (_filter: ElementFilter) => filter.id,
        (_id: string) => filter,
      );

      expect(svg).toContain('<feMorphology');
      expect(svg).toContain('operator="erode"');
      expect(svg).toContain('radius="2"');
    });

    it('should render morphology with dilate and separate radii', () => {
      const filter: FilterDefinition = {
        id: 'filter-dilate',
        primitives: [
          {
            type: 'morphology',
            operator: 'dilate',
            radius: [3, 5],
          } as MorphologyPrimitive,
        ],
      };

      const element = createImageElement('img-1', {
        filters: [{ type: 'custom', filterId: filter.id }],
      });
      const state = createTestState([element]);

      const svg = renderer.toSVG(
        state,
        createElementGetter([element]),
        (_filter: ElementFilter) => filter.id,
        (_id: string) => filter,
      );

      expect(svg).toContain('operator="dilate"');
      expect(svg).toContain('radius="3 5"');
    });
  });

  // ============================================================
  // Flood and Offset
  // ============================================================

  describe('Flood and Offset', () => {
    it('should render flood without opacity', () => {
      const filter: FilterDefinition = {
        id: 'filter-flood-no-opacity',
        primitives: [
          {
            type: 'flood',
            floodColor: '#ff0000',
          } as FloodPrimitive,
        ],
      };

      const element = createImageElement('img-1', {
        filters: [{ type: 'custom', filterId: filter.id }],
      });
      const state = createTestState([element]);

      const svg = renderer.toSVG(
        state,
        createElementGetter([element]),
        (_filter: ElementFilter) => filter.id,
        (_id: string) => filter,
      );

      expect(svg).toContain('<feFlood');
      expect(svg).toContain('flood-color="#ff0000"');
      expect(svg).not.toContain('flood-opacity');
    });

    it('should render offset primitive', () => {
      const filter: FilterDefinition = {
        id: 'filter-offset',
        primitives: [
          {
            type: 'offset',
            dx: 10,
            dy: 15,
            in: 'SourceGraphic',
            result: 'offsetted',
          } as OffsetPrimitive,
        ],
      };

      const element = createImageElement('img-1', {
        filters: [{ type: 'custom', filterId: filter.id }],
      });
      const state = createTestState([element]);

      const svg = renderer.toSVG(
        state,
        createElementGetter([element]),
        (_filter: ElementFilter) => filter.id,
        (_id: string) => filter,
      );

      expect(svg).toContain('<feOffset');
      expect(svg).toContain('dx="10"');
      expect(svg).toContain('dy="15"');
      expect(svg).toContain('in="SourceGraphic"');
      expect(svg).toContain('result="offsetted"');
    });
  });

  // ============================================================
  // Gaussian Blur Options
  // ============================================================

  describe('Gaussian Blur Options', () => {
    it('should render gaussian blur with wrap edge mode', () => {
      const filter: FilterDefinition = {
        id: 'filter-blur-wrap',
        primitives: [
          {
            type: 'gaussianBlur',
            stdDeviation: 5,
            edgeMode: 'wrap',
          } as GaussianBlurPrimitive,
        ],
      };

      const element = createImageElement('img-1', {
        filters: [{ type: 'custom', filterId: filter.id }],
      });
      const state = createTestState([element]);

      const svg = renderer.toSVG(
        state,
        createElementGetter([element]),
        (_filter: ElementFilter) => filter.id,
        (_id: string) => filter,
      );

      expect(svg).toContain('<feGaussianBlur');
      expect(svg).toContain('stdDeviation="5"');
      expect(svg).toContain('edgeMode="wrap"');
    });

    it('should render gaussian blur with none edge mode', () => {
      const filter: FilterDefinition = {
        id: 'filter-blur-none',
        primitives: [
          {
            type: 'gaussianBlur',
            stdDeviation: [3, 5],
            edgeMode: 'none',
          } as GaussianBlurPrimitive,
        ],
      };

      const element = createImageElement('img-1', {
        filters: [{ type: 'custom', filterId: filter.id }],
      });
      const state = createTestState([element]);

      const svg = renderer.toSVG(
        state,
        createElementGetter([element]),
        (_filter: ElementFilter) => filter.id,
        (_id: string) => filter,
      );

      expect(svg).toContain('stdDeviation="3 5"');
      expect(svg).toContain('edgeMode="none"');
    });
  });

  // ============================================================
  // Color Matrix Types
  // ============================================================

  describe('Color Matrix Types', () => {
    it('should render color matrix with luminanceToAlpha type', () => {
      const filter: FilterDefinition = {
        id: 'filter-luminance',
        primitives: [
          {
            type: 'colorMatrix',
            matrixType: 'luminanceToAlpha',
          } as ColorMatrixPrimitive,
        ],
      };

      const element = createImageElement('img-1', {
        filters: [{ type: 'custom', filterId: filter.id }],
      });
      const state = createTestState([element]);

      const svg = renderer.toSVG(
        state,
        createElementGetter([element]),
        (_filter: ElementFilter) => filter.id,
        (_id: string) => filter,
      );

      expect(svg).toContain('<feColorMatrix');
      expect(svg).toContain('type="luminanceToAlpha"');
    });

    it('should render color matrix with numeric values', () => {
      const filter: FilterDefinition = {
        id: 'filter-saturate-numeric',
        primitives: [
          {
            type: 'colorMatrix',
            matrixType: 'saturate',
            values: 0.5,
          } as ColorMatrixPrimitive,
        ],
      };

      const element = createImageElement('img-1', {
        filters: [{ type: 'custom', filterId: filter.id }],
      });
      const state = createTestState([element]);

      const svg = renderer.toSVG(
        state,
        createElementGetter([element]),
        (_filter: ElementFilter) => filter.id,
        (_id: string) => filter,
      );

      expect(svg).toContain('type="saturate"');
      expect(svg).toContain('values="0.5"');
    });
  });

  // ============================================================
  // DOM Rendering
  // ============================================================

  describe('DOM Rendering with Filters', () => {
    it('should add filters to DOM when rendering', () => {
      const filter: FilterDefinition = {
        id: 'filter-dom-test',
        primitives: [
          {
            type: 'gaussianBlur',
            stdDeviation: 5,
          } as GaussianBlurPrimitive,
        ],
      };

      const element = createImageElement('img-1', {
        filters: [{ type: 'custom', filterId: filter.id }],
      });
      const state = createTestState([element]);
      const getElement = createElementGetter([element]);

      renderer.render(
        container,
        state,
        getElement,
        undefined,
        (_filter: ElementFilter) => filter.id,
        (_id: string) => filter,
      );

      // Check that filter was added to defs
      const filterEl = container.querySelector(`filter#${filter.id}`);
      expect(filterEl).not.toBeNull();
      expect(filterEl?.querySelector('feGaussianBlur')).not.toBeNull();
    });

    it('should apply filter attribute to DOM element', () => {
      const filter: FilterDefinition = {
        id: 'filter-attr-test',
        primitives: [
          {
            type: 'dropShadow',
            dx: 4,
            dy: 4,
            stdDeviation: 4,
            floodColor: '#000000',
          } as DropShadowPrimitive,
        ],
      };

      const element = createImageElement('img-1', {
        filters: [{ type: 'custom', filterId: filter.id }],
      });
      const state = createTestState([element]);
      const getElement = createElementGetter([element]);

      renderer.render(
        container,
        state,
        getElement,
        undefined,
        (_filter: ElementFilter) => filter.id,
        (_id: string) => filter,
      );

      const imgEl = container.querySelector('image');
      expect(imgEl?.getAttribute('filter')).toBe(`url(#${filter.id})`);
    });

    it('should render shape element with filter in DOM', () => {
      const filter: FilterDefinition = {
        id: 'filter-shape-dom',
        primitives: [
          {
            type: 'gaussianBlur',
            stdDeviation: 3,
          } as GaussianBlurPrimitive,
        ],
      };

      const element = createShapeElement('shape-1', {
        filters: [{ type: 'custom', filterId: filter.id }],
      });
      const state = createTestState([element]);
      const getElement = createElementGetter([element]);

      renderer.render(
        container,
        state,
        getElement,
        undefined,
        (_filter: ElementFilter) => filter.id,
        (_id: string) => filter,
      );

      const rectEl = container.querySelector('rect:not([width="100%"])');
      expect(rectEl?.getAttribute('filter')).toBe(`url(#${filter.id})`);
    });

    it('should update filter on element when updated', () => {
      const filter1: FilterDefinition = {
        id: 'filter-1',
        primitives: [{ type: 'gaussianBlur', stdDeviation: 5 } as GaussianBlurPrimitive],
      };
      const filter2: FilterDefinition = {
        id: 'filter-2',
        primitives: [{ type: 'gaussianBlur', stdDeviation: 10 } as GaussianBlurPrimitive],
      };

      const element = createImageElement('img-1', {
        filters: [{ type: 'custom', filterId: filter1.id }],
      });
      const state = createTestState([element]);
      const getElement = createElementGetter([element]);
      const filters = new Map<string, FilterDefinition>([
        [filter1.id, filter1],
        [filter2.id, filter2],
      ]);

      renderer.render(
        container,
        state,
        getElement,
        undefined,
        (_filter: ElementFilter) => filter1.id,
        (id: string) => filters.get(id),
      );

      // Verify initial filter
      let imgEl = container.querySelector('image');
      expect(imgEl?.getAttribute('filter')).toBe(`url(#${filter1.id})`);

      // Update element with new filter
      const updatedElement = {
        ...element,
        filters: [{ type: 'custom' as const, filterId: filter2.id }],
      };

      renderer.updateElement(
        updatedElement,
        getElement,
        (_filter: ElementFilter) => filter2.id,
        (id: string) => filters.get(id),
      );

      imgEl = container.querySelector('image');
      expect(imgEl?.getAttribute('filter')).toBe(`url(#${filter2.id})`);
    });

    it('should remove filter when element no longer has filters', () => {
      const filter: FilterDefinition = {
        id: 'filter-remove',
        primitives: [{ type: 'gaussianBlur', stdDeviation: 5 } as GaussianBlurPrimitive],
      };

      const element = createImageElement('img-1', {
        filters: [{ type: 'custom', filterId: filter.id }],
      });
      const state = createTestState([element]);
      const getElement = createElementGetter([element]);

      renderer.render(
        container,
        state,
        getElement,
        undefined,
        (_filter: ElementFilter) => filter.id,
        (_id: string) => filter,
      );

      // Verify filter is applied
      let imgEl = container.querySelector('image');
      expect(imgEl?.getAttribute('filter')).toBe(`url(#${filter.id})`);

      // Update element without filters
      const elementWithoutFilters = createImageElement('img-1');

      renderer.updateElement(
        elementWithoutFilters,
        getElement,
        () => '',
        () => undefined,
      );

      imgEl = container.querySelector('image');
      // Filter attribute is removed (null) or set to empty string
      const filterAttr = imgEl?.getAttribute('filter');
      expect(filterAttr === null || filterAttr === '').toBe(true);
    });
  });

  // ============================================================
  // Filter Region Attributes
  // ============================================================

  describe('Filter Region Attributes', () => {
    it('should render filter with custom x, y, width, height', () => {
      const filter: FilterDefinition = {
        id: 'filter-region',
        x: '-50%',
        y: '-50%',
        width: '200%',
        height: '200%',
        primitives: [{ type: 'gaussianBlur', stdDeviation: 20 } as GaussianBlurPrimitive],
      };

      const element = createImageElement('img-1', {
        filters: [{ type: 'custom', filterId: filter.id }],
      });
      const state = createTestState([element]);

      const svg = renderer.toSVG(
        state,
        createElementGetter([element]),
        (_filter: ElementFilter) => filter.id,
        (_id: string) => filter,
      );

      expect(svg).toContain('x="-50%"');
      expect(svg).toContain('y="-50%"');
      expect(svg).toContain('width="200%"');
      expect(svg).toContain('height="200%"');
    });
  });

  // ============================================================
  // Merge Nodes
  // ============================================================

  describe('Merge Nodes', () => {
    it('should render merge with multiple nodes', () => {
      const filter: FilterDefinition = {
        id: 'filter-merge-multi',
        primitives: [
          {
            type: 'gaussianBlur',
            stdDeviation: 5,
            in: 'SourceAlpha',
            result: 'blur1',
          } as GaussianBlurPrimitive,
          {
            type: 'gaussianBlur',
            stdDeviation: 10,
            in: 'SourceAlpha',
            result: 'blur2',
          } as GaussianBlurPrimitive,
          {
            type: 'merge',
            nodes: [{ in: 'blur1' }, { in: 'blur2' }, { in: 'SourceGraphic' }],
          } as MergePrimitive,
        ],
      };

      const element = createImageElement('img-1', {
        filters: [{ type: 'custom', filterId: filter.id }],
      });
      const state = createTestState([element]);

      const svg = renderer.toSVG(
        state,
        createElementGetter([element]),
        (_filter: ElementFilter) => filter.id,
        (_id: string) => filter,
      );

      expect(svg).toContain('<feMerge');
      expect(svg).toContain('<feMergeNode in="blur1"');
      expect(svg).toContain('<feMergeNode in="blur2"');
      expect(svg).toContain('<feMergeNode in="SourceGraphic"');
    });
  });
});
