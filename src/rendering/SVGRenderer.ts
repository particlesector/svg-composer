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
import type {
  SVGRendererConfig,
  ClipPathDef,
  RenderContext,
  ElementGetter,
  ViewportState,
} from './types.js';

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
  // Stores both SVG element and z-index for proper ordering
  private readonly _elementMap = new Map<string, { element: SVGElement; zIndex: number }>();
  private readonly _renderedClipPaths = new Set<string>();

  /**
   * Creates a new SVGRenderer instance
   *
   * @param config - Optional configuration options
   */
  constructor(config: Partial<SVGRendererConfig> = {}) {
    this._config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Gets the root SVG element (for overlay purposes)
   */
  get svgRoot(): SVGSVGElement | null {
    return this._rootSvg;
  }

  /**
   * Gets the ID prefix used for element IDs
   */
  get idPrefix(): string {
    return this._config.idPrefix;
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
   * @param viewportState - Optional viewport state for pan/zoom
   */
  render(
    container: HTMLElement,
    state: CanvasState,
    getElement: ElementGetter,
    viewportState?: ViewportState,
  ): void {
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

    // Update viewBox based on viewport state (pan/zoom)
    const currentViewBox = rootSvg.getAttribute('viewBox');
    const newViewBox = this._calculateViewBox(state.width, state.height, viewportState);
    if (currentViewBox !== newViewBox) {
      rootSvg.setAttribute('viewBox', newViewBox);
    }

    // Update background color
    backgroundRect.setAttribute('fill', state.backgroundColor);

    // Incremental DOM updates: compare current state with rendered elements
    const visibleElements = Array.from(state.elements.values()).filter((el) => el.visible);

    // Build group children set once for O(n) lookup instead of O(n*m)
    const groupChildrenSet = this._buildGroupChildrenSet(state);

    // Find elements to remove (rendered but no longer in state or now hidden)
    const elementsToRemove: string[] = [];
    for (const id of this._elementMap.keys()) {
      const element = state.elements.get(id);
      // Remove if element doesn't exist in state, is hidden, or is a child of a group
      // (group children are rendered inside their parent group, not at top level)
      if (!element || !element.visible || groupChildrenSet.has(element.id)) {
        elementsToRemove.push(id);
      }
    }

    // Remove elements that are no longer needed
    for (const id of elementsToRemove) {
      this.removeElement(id);
    }

    // Get top-level visible elements (not children of groups) sorted by zIndex
    const topLevelElements = visibleElements
      .filter((el) => !groupChildrenSet.has(el.id))
      .sort((a, b) => a.zIndex - b.zIndex);

    // Add or update elements
    for (const element of topLevelElements) {
      if (this._elementMap.has(element.id)) {
        // Element exists, update it
        this.updateElement(element, getElement);
      } else {
        // Element is new, add it
        this.addElement(element, getElement);
      }
    }

    // Clean up orphaned clip paths
    this._cleanupOrphanedClipPaths();
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

    this._elementMap.set(element.id, { element: svgElement, zIndex: element.zIndex });

    // Add any new clip paths
    this._addClipPathsToDefs(context.clipPaths);
  }

  /**
   * Updates an existing element in the DOM using attribute-level diffing
   *
   * @param element - The updated element
   * @param getElement - Function to retrieve elements by ID
   */
  updateElement(element: BaseElement, getElement: ElementGetter): void {
    if (!this._contentGroup) {
      return;
    }

    const existingEntry = this._elementMap.get(element.id);
    if (!existingEntry) {
      // Element doesn't exist, add it
      this.addElement(element, getElement);
      return;
    }

    const existingEl = existingEntry.element;

    // If element is now hidden, remove it
    if (!element.visible) {
      existingEl.remove();
      this._elementMap.delete(element.id);
      return;
    }

    // For groups, check if children have changed - if so, recreate the group
    if (element.type === 'group') {
      const group = element as GroupElement;
      const needsRecreate = this._groupChildrenChanged(existingEl, group, getElement);
      if (needsRecreate) {
        // Remove old group and add new one
        this.removeElement(element.id);
        this.addElement(element, getElement);
        return;
      }
    }

    const context: RenderContext = {
      clipPaths: new Map(),
      getElement,
    };

    // Update attributes using diffing
    this._updateElementAttributes(existingEl, element, context);

    // Check if z-index changed and reposition if needed
    const oldZIndex = existingEntry.zIndex;
    if (element.zIndex !== oldZIndex) {
      const insertBefore = this._findInsertPosition(element.zIndex, element.id);
      if (insertBefore) {
        this._contentGroup.insertBefore(existingEl, insertBefore);
      } else {
        this._contentGroup.appendChild(existingEl);
      }
      // Update stored z-index
      existingEntry.zIndex = element.zIndex;
    }

    // Add any new clip paths
    this._addClipPathsToDefs(context.clipPaths);
  }

  /**
   * Checks if a group's children have changed by comparing the DOM children
   * with the expected children from the element definition.
   */
  private _groupChildrenChanged(
    existingEl: SVGElement,
    group: GroupElement,
    getElement: ElementGetter,
  ): boolean {
    const domChildren = Array.from(existingEl.children);
    const expectedChildren = group.children
      .map((id) => getElement(id))
      .filter((el): el is BaseElement => el?.visible === true);

    // Check if the number of visible children changed
    if (domChildren.length !== expectedChildren.length) {
      return true;
    }

    // Check if the children IDs match in order
    for (let i = 0; i < domChildren.length; i++) {
      const domChild = domChildren[i];
      const expectedChild = expectedChildren[i];
      if (!domChild || !expectedChild) {
        return true;
      }
      const domChildId = domChild.getAttribute('data-element-id');
      if (domChildId !== expectedChild.id) {
        return true;
      }
    }

    return false;
  }

  /**
   * Updates element attributes by diffing old and new values
   */
  private _updateElementAttributes(
    svgElement: SVGElement,
    element: BaseElement,
    context: RenderContext,
  ): void {
    // Update transform
    const rotationCenter = this._getRotationCenter(element);
    const newTransform = this._buildTransformString(element.transform, rotationCenter);
    const currentTransform = svgElement.getAttribute('transform') ?? '';
    if (newTransform !== currentTransform) {
      if (newTransform) {
        svgElement.setAttribute('transform', newTransform);
      } else {
        svgElement.removeAttribute('transform');
      }
    }

    // Update opacity
    const newOpacity = element.opacity !== 1 ? String(element.opacity) : null;
    const currentOpacity = svgElement.getAttribute('opacity');
    if (newOpacity !== currentOpacity) {
      if (newOpacity !== null) {
        svgElement.setAttribute('opacity', newOpacity);
      } else {
        svgElement.removeAttribute('opacity');
      }
    }

    // Update clip path
    const newClipPath = element.clipPath ? `url(#${element.clipPath.id})` : null;
    const currentClipPath = svgElement.getAttribute('clip-path');
    if (newClipPath !== currentClipPath) {
      if (element.clipPath && newClipPath !== null) {
        if (!context.clipPaths.has(element.clipPath.id)) {
          context.clipPaths.set(element.clipPath.id, element.clipPath);
        }
        svgElement.setAttribute('clip-path', newClipPath);
      } else {
        svgElement.removeAttribute('clip-path');
      }
    }

    // Update type-specific attributes
    this._updateTypeSpecificAttributes(svgElement, element);
  }

  /**
   * Updates type-specific attributes for an element
   */
  private _updateTypeSpecificAttributes(svgElement: SVGElement, element: BaseElement): void {
    switch (element.type) {
      case 'image':
        this._updateImageAttributes(svgElement as SVGImageElement, element as ImageElement);
        break;
      case 'text':
        this._updateTextAttributes(svgElement as SVGTextElement, element as TextElement);
        break;
      case 'shape':
        this._updateShapeAttributes(svgElement, element as ShapeElement);
        break;
      // Groups don't need attribute updates (only children which are handled separately)
    }
  }

  /**
   * Updates image element attributes
   */
  private _updateImageAttributes(svgElement: SVGImageElement, element: ImageElement): void {
    this._setAttributeIfChanged(svgElement, 'href', element.src);
    this._setAttributeIfChanged(svgElement, 'width', String(element.width));
    this._setAttributeIfChanged(svgElement, 'height', String(element.height));
  }

  /**
   * Updates text element attributes
   */
  private _updateTextAttributes(svgElement: SVGTextElement, element: TextElement): void {
    this._setAttributeIfChanged(svgElement, 'font-size', String(element.fontSize));
    this._setAttributeIfChanged(svgElement, 'font-family', element.fontFamily);
    this._setAttributeIfChanged(svgElement, 'fill', element.fill);
    this._setAttributeIfChanged(svgElement, 'text-anchor', element.textAnchor);

    // Update text content
    if (svgElement.textContent !== element.content) {
      svgElement.textContent = element.content;
    }
  }

  /**
   * Updates shape element attributes
   */
  private _updateShapeAttributes(svgElement: SVGElement, element: ShapeElement): void {
    this._setAttributeIfChanged(svgElement, 'fill', element.fill);
    this._setAttributeIfChanged(svgElement, 'stroke', element.stroke);
    this._setAttributeIfChanged(svgElement, 'stroke-width', String(element.strokeWidth));

    switch (element.shapeType) {
      case 'rect':
        this._setAttributeIfChanged(svgElement, 'width', String(element.width ?? 0));
        this._setAttributeIfChanged(svgElement, 'height', String(element.height ?? 0));
        if (element.rx !== undefined && element.rx !== 0) {
          this._setAttributeIfChanged(svgElement, 'rx', String(element.rx));
        } else {
          svgElement.removeAttribute('rx');
        }
        break;
      case 'circle':
        this._setAttributeIfChanged(svgElement, 'r', String(element.r ?? 0));
        break;
      case 'ellipse':
        this._setAttributeIfChanged(svgElement, 'rx', String(element.rx ?? 0));
        this._setAttributeIfChanged(svgElement, 'ry', String(element.ry ?? 0));
        break;
      case 'path':
        this._setAttributeIfChanged(svgElement, 'd', element.path ?? '');
        break;
    }
  }

  /**
   * Sets an attribute only if it has changed
   */
  private _setAttributeIfChanged(element: SVGElement, name: string, value: string): void {
    if (element.getAttribute(name) !== value) {
      element.setAttribute(name, value);
    }
  }

  /**
   * Removes an element from the DOM
   *
   * @param id - The ID of the element to remove
   */
  removeElement(id: string): void {
    const entry = this._elementMap.get(id);
    if (entry) {
      entry.element.remove();
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
    const rotationCenter = this._getRotationCenter(element);
    const transform = this._buildTransformAttr(element.transform, rotationCenter);
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
          `fill="${el.fill}" text-anchor="${el.textAnchor}" style="user-select: none"` +
          `${transform}${opacity}${clipAttr}>${content}</text>`
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
  private _buildTransformAttr(t: Transform, rotationCenter?: { x: number; y: number }): string {
    const str = this._buildTransformString(t, rotationCenter);
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
    // Prevent text selection when interacting with canvas
    text.setAttribute('style', 'user-select: none');
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
    // Calculate rotation center based on element type
    const rotationCenter = this._getRotationCenter(element);

    // Apply transform
    const transformStr = this._buildTransformString(element.transform, rotationCenter);
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
   * Gets the rotation center for an element based on its type and dimensions.
   * The rotation center is in the coordinate system after translate but before scale.
   *
   * For rectangles and images, this is the scaled center (width * scaleX / 2, height * scaleY / 2).
   * For circles and ellipses, they're already centered at origin, so no offset is needed.
   */
  private _getRotationCenter(element: BaseElement): { x: number; y: number } | undefined {
    const t = element.transform;

    if (element.type === 'image') {
      const img = element as ImageElement;
      return {
        x: (img.width / 2) * t.scaleX,
        y: (img.height / 2) * t.scaleY,
      };
    }

    if (element.type === 'shape') {
      const shape = element as ShapeElement;
      if (shape.shapeType === 'rect') {
        return {
          x: ((shape.width ?? 0) / 2) * t.scaleX,
          y: ((shape.height ?? 0) / 2) * t.scaleY,
        };
      }
      // circle, ellipse, path are centered at origin - no offset needed
    }

    if (element.type === 'text') {
      const text = element as TextElement;
      // Text baseline is at y=0, text extends upward (negative y)
      // Approximate width matches the bounds calculation in SVGComposer
      const approxWidth = text.content.length * text.fontSize * 0.6;
      const height = text.fontSize;

      // For 'start' anchor: text starts at x=0, extends right
      // For 'middle' anchor: text is centered at x=0
      // For 'end' anchor: text ends at x=0, extends left
      let centerX: number;
      switch (text.textAnchor) {
        case 'middle':
          centerX = 0;
          break;
        case 'end':
          centerX = -approxWidth / 2;
          break;
        case 'start':
        default:
          centerX = approxWidth / 2;
          break;
      }

      return {
        x: centerX * t.scaleX,
        y: (-height / 2) * t.scaleY, // Negative because text is above baseline
      };
    }

    // Groups and other types use default rotation at origin
    return undefined;
  }

  /**
   * Builds a transform string (without the attribute wrapper)
   *
   * @param t - The transform to convert
   * @param rotationCenter - Optional center point for rotation
   *                         (in post-translate, pre-scale coords)
   */
  private _buildTransformString(t: Transform, rotationCenter?: { x: number; y: number }): string {
    const transforms: string[] = [];
    if (t.x !== 0 || t.y !== 0) {
      transforms.push(`translate(${String(t.x)}, ${String(t.y)})`);
    }
    if (t.rotation !== 0) {
      if (rotationCenter && (rotationCenter.x !== 0 || rotationCenter.y !== 0)) {
        // Rotate around the specified center point
        transforms.push(
          `rotate(${String(t.rotation)}, ${String(rotationCenter.x)}, ${String(rotationCenter.y)})`,
        );
      } else {
        transforms.push(`rotate(${String(t.rotation)})`);
      }
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
   * Finds the insertion position for an element based on z-index.
   * Returns the first element with a higher z-index, or null if the element
   * should be appended at the end.
   *
   * @param zIndex - The z-index of the element to insert
   * @param excludeId - Optional ID of element to exclude (when repositioning)
   * @returns The element to insert before, or null to append at end
   */
  private _findInsertPosition(zIndex: number, excludeId?: string): SVGElement | null {
    // Find all elements with higher z-index and get the one with lowest z-index among them
    let insertBeforeEntry: { element: SVGElement; zIndex: number } | null = null;

    for (const [id, entry] of this._elementMap) {
      // Skip the element being repositioned
      if (excludeId !== undefined && id === excludeId) {
        continue;
      }

      // Find elements with higher z-index
      if (entry.zIndex > zIndex) {
        // Keep the one with the lowest z-index among those higher than ours
        if (!insertBeforeEntry || entry.zIndex < insertBeforeEntry.zIndex) {
          insertBeforeEntry = entry;
        }
      }
    }

    return insertBeforeEntry?.element ?? null;
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

  /**
   * Builds a set of all element IDs that are children of groups.
   * This is more efficient than calling _isGroupChild repeatedly (O(n) vs O(n*m)).
   */
  private _buildGroupChildrenSet(state: CanvasState): Set<string> {
    const groupChildrenSet = new Set<string>();
    for (const element of state.elements.values()) {
      if (element.type === 'group') {
        const group = element as GroupElement;
        for (const childId of group.children) {
          groupChildrenSet.add(childId);
        }
      }
    }
    return groupChildrenSet;
  }

  /**
   * Removes clip paths from defs that are no longer referenced by any rendered element.
   */
  private _cleanupOrphanedClipPaths(): void {
    if (!this._defsElement) {
      return;
    }

    // Collect all clip path IDs currently in use by rendered elements
    const usedClipPathIds = new Set<string>();
    const clipPathRegex = /url\(#([^)]+)\)/;
    for (const entry of this._elementMap.values()) {
      const clipPathAttr = entry.element.getAttribute('clip-path');
      if (clipPathAttr !== null && clipPathAttr.length > 0) {
        // Extract ID from "url(#clip-id)" format
        const match = clipPathRegex.exec(clipPathAttr);
        const clipId = match?.[1];
        if (clipId !== undefined && clipId.length > 0) {
          usedClipPathIds.add(clipId);
        }
      }
    }

    // Remove orphaned clip paths
    const orphanedIds: string[] = [];
    for (const id of this._renderedClipPaths) {
      if (!usedClipPathIds.has(id)) {
        orphanedIds.push(id);
      }
    }

    for (const id of orphanedIds) {
      const clipPathEl = this._defsElement.querySelector(`#${id}`);
      if (clipPathEl) {
        clipPathEl.remove();
      }
      this._renderedClipPaths.delete(id);
    }
  }

  /**
   * Calculates the viewBox string based on canvas size and viewport state.
   *
   * The viewBox defines which portion of the canvas is visible:
   * - zoom > 1: zoomed in (smaller viewBox = see less canvas)
   * - zoom < 1: zoomed out (larger viewBox = see more canvas)
   * - panX/panY: offsets the visible area
   *
   * @param width - Canvas width
   * @param height - Canvas height
   * @param viewportState - Optional viewport state with pan/zoom
   * @returns The viewBox attribute string "minX minY width height"
   */
  private _calculateViewBox(width: number, height: number, viewportState?: ViewportState): string {
    const isDefaultViewport =
      !viewportState ||
      (viewportState.panX === 0 && viewportState.panY === 0 && viewportState.zoom === 1);

    if (isDefaultViewport) {
      return `0 0 ${String(width)} ${String(height)}`;
    }

    // When zoomed in (zoom > 1), we see a smaller portion of the canvas
    // viewBox width/height = canvas size / zoom
    const viewWidth = width / viewportState.zoom;
    const viewHeight = height / viewportState.zoom;

    // Pan values define the top-left corner of the visible area
    const minX = viewportState.panX;
    const minY = viewportState.panY;

    return `${String(minX)} ${String(minY)} ${String(viewWidth)} ${String(viewHeight)}`;
  }
}
