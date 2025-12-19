/**
 * SVG Renderer for generating and managing SVG output
 */

import type {
  BaseElement,
  ClipPath,
  ImageElement,
  TextElement,
  ShapeElement,
  GroupElement,
} from '../elements/types.js';
import type { CanvasState, Transform } from '../core/types.js';
import type { SVGRendererConfig, ClipPathDef, RenderContext, ElementGetter } from './types.js';

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: SVGRendererConfig = {
  idPrefix: 'svc-',
};

/**
 * SVGRenderer handles all SVG generation and DOM rendering operations.
 *
 * Responsibilities:
 * - Generate SVG markup from canvas state
 * - Render clip paths in defs section
 * - Manage efficient DOM updates
 */
export class SVGRenderer {
  private readonly _config: SVGRendererConfig;

  // DOM references for incremental updates
  private _rootSvg: SVGSVGElement | null = null;
  private _defsElement: SVGDefsElement | null = null;
  private _backgroundRect: SVGRectElement | null = null;
  private _contentGroup: SVGGElement | null = null;

  // Track rendered elements for differential updates
  private readonly _elementMap = new Map<string, SVGElement>();
  private readonly _renderedClipPaths = new Set<string>();

  /**
   * Creates a new SVGRenderer instance
   *
   * @param config - Optional configuration options
   */
  constructor(config: Partial<SVGRendererConfig> = {}) {
    this._config = { ...DEFAULT_CONFIG, ...config };
  }

  // ============================================================
  // SVG String Generation
  // ============================================================

  /**
   * Generates complete SVG markup from canvas state
   *
   * @param state - The canvas state to render
   * @param getElement - Function to retrieve elements by ID
   * @returns Complete SVG markup string
   */
  toSVG(state: CanvasState, getElement: ElementGetter): string {
    const elements = Array.from(state.elements.values())
      .filter((el) => el.visible)
      .sort((a, b) => a.zIndex - b.zIndex);

    // Create render context to collect clip paths
    const context: RenderContext = {
      clipPaths: new Map(),
      getElement,
    };

    // Render all elements and collect clip paths
    const svgElements = elements.map((el) => this._elementToSVG(el, context)).join('\n  ');

    // Build defs section with clip paths
    const defsContent = this._buildDefsContent(context.clipPaths);

    const viewBox = `0 0 ${String(state.width)} ${String(state.height)}`;

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${defsContent}
  <rect width="100%" height="100%" fill="${state.backgroundColor}" />
  ${svgElements}
</svg>`;
  }

  // ============================================================
  // DOM Rendering
  // ============================================================

  /**
   * Initializes the SVG DOM structure in the container
   *
   * @param container - The HTML element to render into
   * @param state - Initial canvas state
   */
  initialize(container: HTMLElement, state: CanvasState): void {
    // Create root SVG element
    this._rootSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this._rootSvg.setAttribute('viewBox', `0 0 ${String(state.width)} ${String(state.height)}`);

    // Create defs element for clip paths
    this._defsElement = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    this._rootSvg.appendChild(this._defsElement);

    // Create background rect
    this._backgroundRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    this._backgroundRect.setAttribute('width', '100%');
    this._backgroundRect.setAttribute('height', '100%');
    this._backgroundRect.setAttribute('fill', state.backgroundColor);
    this._rootSvg.appendChild(this._backgroundRect);

    // Create content group for elements
    this._contentGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    this._contentGroup.setAttribute('id', `${this._config.idPrefix}content`);
    this._rootSvg.appendChild(this._contentGroup);

    // Clear container and append SVG
    container.innerHTML = '';
    container.appendChild(this._rootSvg);
  }

  /**
   * Renders the current state to the container
   *
   * @param container - The HTML element to render into
   * @param state - The canvas state to render
   * @param getElement - Function to retrieve elements by ID
   */
  render(container: HTMLElement, state: CanvasState, getElement: ElementGetter): void {
    // Initialize if not already done
    if (this._rootSvg?.parentElement !== container) {
      this.initialize(container, state);
    }

    // After initialize, all DOM elements are guaranteed to exist
    const rootSvg = this._rootSvg;
    const backgroundRect = this._backgroundRect;
    const contentGroup = this._contentGroup;
    const defsElement = this._defsElement;

    if (!rootSvg || !backgroundRect || !contentGroup || !defsElement) {
      return;
    }

    // Update viewBox if needed
    const currentViewBox = rootSvg.getAttribute('viewBox');
    const newViewBox = `0 0 ${String(state.width)} ${String(state.height)}`;
    if (currentViewBox !== newViewBox) {
      rootSvg.setAttribute('viewBox', newViewBox);
    }

    // Update background color
    backgroundRect.setAttribute('fill', state.backgroundColor);

    // Clear and re-render all elements (for now - incremental updates in next phase)
    contentGroup.innerHTML = '';
    this._elementMap.clear();
    this._renderedClipPaths.clear();
    defsElement.innerHTML = '';

    // Get visible elements sorted by zIndex
    const elements = Array.from(state.elements.values())
      .filter((el) => el.visible)
      .sort((a, b) => a.zIndex - b.zIndex);

    // Create render context
    const context: RenderContext = {
      clipPaths: new Map(),
      getElement,
    };

    // Render each element
    for (const element of elements) {
      const svgElement = this._createDOMElement(element, context);
      if (svgElement) {
        contentGroup.appendChild(svgElement);
        this._elementMap.set(element.id, svgElement);
      }
    }

    // Add clip paths to defs
    for (const [id, clipPath] of context.clipPaths) {
      const clipPathEl = this._createClipPathDOMElement(clipPath);
      defsElement.appendChild(clipPathEl);
      this._renderedClipPaths.add(id);
    }
  }

  /**
   * Adds an element to the rendered DOM
   *
   * @param element - The element to add
   * @param getElement - Function to retrieve elements by ID
   */
  addElement(element: BaseElement, getElement: ElementGetter): void {
    if (!this._contentGroup) {
      return;
    }

    const context: RenderContext = {
      clipPaths: new Map(),
      getElement,
    };

    const svgElement = this._createDOMElement(element, context);
    if (!svgElement) {
      return;
    }

    // Find the correct insertion position based on zIndex
    const insertBefore = this._findInsertPosition(element.zIndex);
    if (insertBefore) {
      this._contentGroup.insertBefore(svgElement, insertBefore);
    } else {
      this._contentGroup.appendChild(svgElement);
    }

    this._elementMap.set(element.id, svgElement);

    // Add any new clip paths
    this._addClipPathsToDefs(context.clipPaths);
  }

  /**
   * Updates an existing element in the DOM
   *
   * @param element - The updated element
   * @param getElement - Function to retrieve elements by ID
   */
  updateElement(element: BaseElement, getElement: ElementGetter): void {
    if (!this._contentGroup) {
      return;
    }

    const existingEl = this._elementMap.get(element.id);
    if (!existingEl) {
      // Element doesn't exist, add it
      this.addElement(element, getElement);
      return;
    }

    // For now, replace the element entirely
    // TODO: Implement attribute-level diffing for better performance
    const context: RenderContext = {
      clipPaths: new Map(),
      getElement,
    };

    const newElement = this._createDOMElement(element, context);
    if (!newElement) {
      // Element is now hidden, remove it
      existingEl.remove();
      this._elementMap.delete(element.id);
      return;
    }

    // Replace the old element
    existingEl.replaceWith(newElement);
    this._elementMap.set(element.id, newElement);

    // Check if z-index changed and reposition if needed
    const insertBefore = this._findInsertPosition(element.zIndex);
    const currentNext = newElement.nextElementSibling;
    if (insertBefore !== currentNext) {
      if (insertBefore) {
        this._contentGroup.insertBefore(newElement, insertBefore);
      } else {
        this._contentGroup.appendChild(newElement);
      }
    }

    // Add any new clip paths
    this._addClipPathsToDefs(context.clipPaths);
  }

  /**
   * Removes an element from the DOM
   *
   * @param id - The ID of the element to remove
   */
  removeElement(id: string): void {
    const element = this._elementMap.get(id);
    if (element) {
      element.remove();
      this._elementMap.delete(id);
    }
    // Note: Orphaned clip paths are not removed automatically
    // They will be cleaned up on full re-render
  }

  /**
   * Cleans up all DOM references
   */
  destroy(): void {
    if (this._rootSvg?.parentElement) {
      this._rootSvg.parentElement.removeChild(this._rootSvg);
    }
    this._rootSvg = null;
    this._defsElement = null;
    this._backgroundRect = null;
    this._contentGroup = null;
    this._elementMap.clear();
    this._renderedClipPaths.clear();
  }

  // ============================================================
  // Private: SVG String Generation
  // ============================================================

  /**
   * Converts an element to SVG markup string
   */
  private _elementToSVG(element: BaseElement, context: RenderContext): string {
    const transform = this._buildTransformAttr(element.transform);
    const opacity = element.opacity !== 1 ? ` opacity="${String(element.opacity)}"` : '';
    const clipAttr = this._collectClipPath(element, context);

    switch (element.type) {
      case 'image': {
        const el = element as ImageElement;
        const w = String(el.width);
        const h = String(el.height);
        const attrs = `href="${el.src}" width="${w}" height="${h}"`;
        return `<image ${attrs}${transform}${opacity}${clipAttr} />`;
      }
      case 'text': {
        const el = element as TextElement;
        const fs = String(el.fontSize);
        const content = this._escapeXml(el.content);
        return (
          `<text font-size="${fs}" font-family="${el.fontFamily}" ` +
          `fill="${el.fill}" text-anchor="${el.textAnchor}"${transform}${opacity}${clipAttr}>` +
          `${content}</text>`
        );
      }
      case 'shape': {
        const el = element as ShapeElement;
        return this._shapeToSVG(el, transform, opacity, clipAttr);
      }
      case 'group': {
        const el = element as GroupElement;
        const children = el.children
          .map((id) => {
            const child = context.getElement(id);
            return child?.visible === true ? this._elementToSVG(child, context) : '';
          })
          .filter((s) => s !== '')
          .join('');
        return `<g${transform}${opacity}${clipAttr}>${children}</g>`;
      }
      default:
        return '';
    }
  }

  /**
   * Converts a shape element to SVG markup
   */
  private _shapeToSVG(
    el: ShapeElement,
    transform: string,
    opacity: string,
    clipAttr: string,
  ): string {
    const sw = String(el.strokeWidth);
    const common =
      `fill="${el.fill}" stroke="${el.stroke}" stroke-width="${sw}"` +
      `${transform}${opacity}${clipAttr}`;

    switch (el.shapeType) {
      case 'rect': {
        const w = String(el.width ?? 0);
        const h = String(el.height ?? 0);
        const rx = el.rx !== undefined && el.rx !== 0 ? ` rx="${String(el.rx)}"` : '';
        return `<rect width="${w}" height="${h}"${rx} ${common} />`;
      }
      case 'circle':
        return `<circle r="${String(el.r ?? 0)}" ${common} />`;
      case 'ellipse':
        return `<ellipse rx="${String(el.rx ?? 0)}" ry="${String(el.ry ?? 0)}" ${common} />`;
      case 'path':
        return `<path d="${el.path ?? ''}" ${common} />`;
      default:
        return '';
    }
  }

  /**
   * Builds a transform attribute string from a Transform object.
   * Returns empty string if no transforms needed, otherwise returns ' transform="..."'.
   */
  private _buildTransformAttr(t: Transform): string {
    const str = this._buildTransformString(t);
    return str ? ` transform="${str}"` : '';
  }

  /**
   * Escapes special XML characters in a string
   */
  private _escapeXml(str: string): string {
    return str.replace(/[<>&'"]/g, (c) => {
      const escapeMap: Record<string, string> = {
        '<': '&lt;',
        '>': '&gt;',
        '&': '&amp;',
        "'": '&apos;',
        '"': '&quot;',
      };
      return escapeMap[c] ?? c;
    });
  }

  // ============================================================
  // Private: Clip Path Handling
  // ============================================================

  /**
   * Collects a clip path from an element and returns the clip-path attribute
   */
  private _collectClipPath(element: BaseElement, context: RenderContext): string {
    if (!element.clipPath) {
      return '';
    }

    const clipPath = element.clipPath;
    if (!context.clipPaths.has(clipPath.id)) {
      context.clipPaths.set(clipPath.id, clipPath);
    }

    return ` clip-path="url(#${clipPath.id})"`;
  }

  /**
   * Renders a clip path definition
   */
  private _renderClipPathDef(clipPath: ClipPath): ClipPathDef {
    let shapeMarkup: string;

    switch (clipPath.type) {
      case 'rect': {
        const x = String(clipPath.x ?? 0);
        const y = String(clipPath.y ?? 0);
        const w = String(clipPath.width ?? 0);
        const h = String(clipPath.height ?? 0);
        const rx =
          clipPath.rx !== undefined && clipPath.rx !== 0 ? ` rx="${String(clipPath.rx)}"` : '';
        shapeMarkup = `<rect x="${x}" y="${y}" width="${w}" height="${h}"${rx} />`;
        break;
      }
      case 'circle': {
        const cx = String(clipPath.cx ?? 0);
        const cy = String(clipPath.cy ?? 0);
        const r = String(clipPath.r ?? 0);
        shapeMarkup = `<circle cx="${cx}" cy="${cy}" r="${r}" />`;
        break;
      }
      case 'ellipse': {
        const cx = String(clipPath.cx ?? 0);
        const cy = String(clipPath.cy ?? 0);
        const rx = String(clipPath.rx ?? 0);
        const ry = String(clipPath.ry ?? 0);
        shapeMarkup = `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" />`;
        break;
      }
      default:
        shapeMarkup = '';
    }

    return {
      id: clipPath.id,
      markup: `<clipPath id="${clipPath.id}">${shapeMarkup}</clipPath>`,
    };
  }

  /**
   * Builds the defs section content from collected clip paths
   */
  private _buildDefsContent(clipPaths: Map<string, ClipPath>): string {
    if (clipPaths.size === 0) {
      return '';
    }

    const clipPathMarkup = Array.from(clipPaths.values())
      .map((cp) => this._renderClipPathDef(cp).markup)
      .join('\n    ');

    return `
  <defs>
    ${clipPathMarkup}
  </defs>`;
  }

  // ============================================================
  // Private: DOM Element Creation
  // ============================================================

  /**
   * Creates a DOM element from an element definition
   */
  private _createDOMElement(element: BaseElement, context: RenderContext): SVGElement | null {
    if (!element.visible) {
      return null;
    }

    let svgElement: SVGElement;

    switch (element.type) {
      case 'image':
        svgElement = this._createImageElement(element as ImageElement);
        break;
      case 'text':
        svgElement = this._createTextElement(element as TextElement);
        break;
      case 'shape':
        svgElement = this._createShapeElement(element as ShapeElement);
        break;
      case 'group':
        svgElement = this._createGroupElement(element as GroupElement, context);
        break;
      default:
        return null;
    }

    // Apply common attributes
    this._applyCommonAttributes(svgElement, element, context);
    svgElement.setAttribute('data-element-id', element.id);

    return svgElement;
  }

  /**
   * Creates an image SVG element
   */
  private _createImageElement(element: ImageElement): SVGImageElement {
    const img = document.createElementNS('http://www.w3.org/2000/svg', 'image');
    img.setAttribute('href', element.src);
    img.setAttribute('width', String(element.width));
    img.setAttribute('height', String(element.height));
    return img;
  }

  /**
   * Creates a text SVG element
   */
  private _createTextElement(element: TextElement): SVGTextElement {
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('font-size', String(element.fontSize));
    text.setAttribute('font-family', element.fontFamily);
    text.setAttribute('fill', element.fill);
    text.setAttribute('text-anchor', element.textAnchor);
    text.textContent = element.content;
    return text;
  }

  /**
   * Creates a shape SVG element
   */
  private _createShapeElement(element: ShapeElement): SVGElement {
    let shape: SVGElement;

    switch (element.shapeType) {
      case 'rect': {
        shape = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        shape.setAttribute('width', String(element.width ?? 0));
        shape.setAttribute('height', String(element.height ?? 0));
        if (element.rx !== undefined && element.rx !== 0) {
          shape.setAttribute('rx', String(element.rx));
        }
        break;
      }
      case 'circle': {
        shape = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        shape.setAttribute('r', String(element.r ?? 0));
        break;
      }
      case 'ellipse': {
        shape = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
        shape.setAttribute('rx', String(element.rx ?? 0));
        shape.setAttribute('ry', String(element.ry ?? 0));
        break;
      }
      case 'path': {
        shape = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        shape.setAttribute('d', element.path ?? '');
        break;
      }
      default:
        shape = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    }

    shape.setAttribute('fill', element.fill);
    shape.setAttribute('stroke', element.stroke);
    shape.setAttribute('stroke-width', String(element.strokeWidth));

    return shape;
  }

  /**
   * Creates a group SVG element with children
   */
  private _createGroupElement(element: GroupElement, context: RenderContext): SVGGElement {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');

    for (const childId of element.children) {
      const child = context.getElement(childId);
      if (child?.visible === true) {
        const childElement = this._createDOMElement(child, context);
        if (childElement) {
          group.appendChild(childElement);
        }
      }
    }

    return group;
  }

  /**
   * Applies common attributes to an SVG element
   */
  private _applyCommonAttributes(
    svgElement: SVGElement,
    element: BaseElement,
    context: RenderContext,
  ): void {
    // Apply transform
    const transformStr = this._buildTransformString(element.transform);
    if (transformStr) {
      svgElement.setAttribute('transform', transformStr);
    }

    // Apply opacity
    if (element.opacity !== 1) {
      svgElement.setAttribute('opacity', String(element.opacity));
    }

    // Apply clip path
    if (element.clipPath) {
      if (!context.clipPaths.has(element.clipPath.id)) {
        context.clipPaths.set(element.clipPath.id, element.clipPath);
      }
      svgElement.setAttribute('clip-path', `url(#${element.clipPath.id})`);
    }
  }

  /**
   * Builds a transform string (without the attribute wrapper)
   */
  private _buildTransformString(t: Transform): string {
    const transforms: string[] = [];
    if (t.x !== 0 || t.y !== 0) {
      transforms.push(`translate(${String(t.x)}, ${String(t.y)})`);
    }
    if (t.rotation !== 0) {
      transforms.push(`rotate(${String(t.rotation)})`);
    }
    if (t.scaleX !== 1 || t.scaleY !== 1) {
      transforms.push(`scale(${String(t.scaleX)}, ${String(t.scaleY)})`);
    }
    return transforms.join(' ');
  }

  /**
   * Creates a clip path DOM element directly from a ClipPath definition.
   * More efficient than parsing markup via DOMParser.
   */
  private _createClipPathDOMElement(clipPath: ClipPath): SVGClipPathElement {
    const clipPathEl = document.createElementNS('http://www.w3.org/2000/svg', 'clipPath');
    clipPathEl.setAttribute('id', clipPath.id);

    let shapeEl: SVGElement;

    switch (clipPath.type) {
      case 'rect': {
        shapeEl = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        shapeEl.setAttribute('x', String(clipPath.x ?? 0));
        shapeEl.setAttribute('y', String(clipPath.y ?? 0));
        shapeEl.setAttribute('width', String(clipPath.width ?? 0));
        shapeEl.setAttribute('height', String(clipPath.height ?? 0));
        if (clipPath.rx !== undefined && clipPath.rx !== 0) {
          shapeEl.setAttribute('rx', String(clipPath.rx));
        }
        break;
      }
      case 'circle': {
        shapeEl = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        shapeEl.setAttribute('cx', String(clipPath.cx ?? 0));
        shapeEl.setAttribute('cy', String(clipPath.cy ?? 0));
        shapeEl.setAttribute('r', String(clipPath.r ?? 0));
        break;
      }
      case 'ellipse': {
        shapeEl = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
        shapeEl.setAttribute('cx', String(clipPath.cx ?? 0));
        shapeEl.setAttribute('cy', String(clipPath.cy ?? 0));
        shapeEl.setAttribute('rx', String(clipPath.rx ?? 0));
        shapeEl.setAttribute('ry', String(clipPath.ry ?? 0));
        break;
      }
      default:
        throw new Error(`Unsupported clip path type: ${String(clipPath.type)}`);
    }

    clipPathEl.appendChild(shapeEl);
    return clipPathEl;
  }

  /**
   * Finds the insertion position for an element based on z-index
   * Note: Currently returns null as z-index tracking requires element state access.
   * This will be improved when incremental updates are fully implemented.
   */
  private _findInsertPosition(_zIndex: number): SVGElement | null {
    // For now, always append at end - z-index ordering is handled by full re-render
    // TODO: Implement proper z-index based insertion when element state is tracked
    return null;
  }

  /**
   * Adds clip paths to the defs element
   */
  private _addClipPathsToDefs(clipPaths: Map<string, ClipPath>): void {
    if (!this._defsElement) {
      return;
    }

    for (const [id, clipPath] of clipPaths) {
      if (!this._renderedClipPaths.has(id)) {
        const clipPathEl = this._createClipPathDOMElement(clipPath);
        this._defsElement.appendChild(clipPathEl);
        this._renderedClipPaths.add(id);
      }
    }
  }
}
