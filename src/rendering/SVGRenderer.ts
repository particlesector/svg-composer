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
  GuideRenderConfig,
  SnapLines,
} from './types.js';
import type { Guide } from '../core/types.js';
import { DEFAULT_GUIDE_RENDER_CONFIG } from './types.js';
import type {
  FilterDefinition,
  FilterPrimitive,
  ElementFilter,
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
  TransferFunction,
} from '../filters/types.js';

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
  private _guideConfig: GuideRenderConfig;

  // DOM references for incremental updates
  private _rootSvg: SVGSVGElement | null = null;
  private _defsElement: SVGDefsElement | null = null;
  private _backgroundRect: SVGRectElement | null = null;
  private _contentGroup: SVGGElement | null = null;
  private _guidesGroup: SVGGElement | null = null;
  private _snapIndicatorsGroup: SVGGElement | null = null;

  // Track rendered elements for differential updates
  // Stores both SVG element and z-index for proper ordering
  private readonly _elementMap = new Map<string, { element: SVGElement; zIndex: number }>();
  private readonly _renderedClipPaths = new Set<string>();
  private readonly _renderedFilters = new Set<string>();
  private readonly _renderedGuides = new Map<string, SVGLineElement>();

  /**
   * Creates a new SVGRenderer instance
   *
   * @param config - Optional configuration options
   * @param guideConfig - Optional guide rendering configuration
   */
  constructor(
    config: Partial<SVGRendererConfig> = {},
    guideConfig: Partial<GuideRenderConfig> = {},
  ) {
    this._config = { ...DEFAULT_CONFIG, ...config };
    this._guideConfig = { ...DEFAULT_GUIDE_RENDER_CONFIG, ...guideConfig };
  }

  /**
   * Gets the current guide render configuration
   */
  get guideConfig(): GuideRenderConfig {
    return { ...this._guideConfig };
  }

  /**
   * Updates the guide render configuration
   *
   * @param updates - Partial configuration updates
   */
  updateGuideConfig(updates: Partial<GuideRenderConfig>): void {
    this._guideConfig = { ...this._guideConfig, ...updates };
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
  toSVG(
    state: CanvasState,
    getElement: ElementGetter,
    resolveFilter?: (filter: ElementFilter) => string,
    getFilter?: (id: string) => FilterDefinition | undefined,
  ): string {
    const elements = Array.from(state.elements.values())
      .filter((el) => el.visible)
      .sort((a, b) => a.zIndex - b.zIndex);

    // Create render context to collect clip paths and filters
    const context: RenderContext = {
      clipPaths: new Map(),
      filters: new Map(),
      getElement,
    };
    if (resolveFilter) {
      context.resolveFilter = resolveFilter;
    }
    if (getFilter) {
      context.getFilter = getFilter;
    }

    // Render all elements and collect clip paths and filters
    const svgElements = elements.map((el) => this._elementToSVG(el, context)).join('\n  ');

    // Build defs section with clip paths and filters
    const defsContent = this._buildDefsContent(context.clipPaths, context.filters);

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

    // Create guides group (rendered above elements)
    this._guidesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    this._guidesGroup.setAttribute('id', `${this._config.idPrefix}guides`);
    this._guidesGroup.setAttribute('pointer-events', 'none');
    this._rootSvg.appendChild(this._guidesGroup);

    // Create snap indicators group (rendered on top of guides)
    this._snapIndicatorsGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    this._snapIndicatorsGroup.setAttribute('id', `${this._config.idPrefix}snap-indicators`);
    this._snapIndicatorsGroup.setAttribute('pointer-events', 'none');
    this._rootSvg.appendChild(this._snapIndicatorsGroup);

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
   * @param resolveFilter - Optional function to resolve element filters to filter IDs
   * @param getFilter - Optional function to get filter definitions by ID
   */
  render(
    container: HTMLElement,
    state: CanvasState,
    getElement: ElementGetter,
    viewportState?: ViewportState,
    resolveFilter?: (filter: ElementFilter) => string,
    getFilter?: (id: string) => FilterDefinition | undefined,
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
        this.updateElement(element, getElement, resolveFilter, getFilter);
      } else {
        // Element is new, add it
        this.addElement(element, getElement, resolveFilter, getFilter);
      }
    }

    // Clean up orphaned clip paths and filters
    this._cleanupOrphanedClipPaths();
    this._cleanupOrphanedFilters();
  }

  /**
   * Adds an element to the rendered DOM
   *
   * @param element - The element to add
   * @param getElement - Function to retrieve elements by ID
   * @param resolveFilter - Optional function to resolve element filters to filter IDs
   * @param getFilter - Optional function to get filter definitions by ID
   */
  addElement(
    element: BaseElement,
    getElement: ElementGetter,
    resolveFilter?: (filter: ElementFilter) => string,
    getFilter?: (id: string) => FilterDefinition | undefined,
  ): void {
    if (!this._contentGroup) {
      return;
    }

    const context: RenderContext = {
      clipPaths: new Map(),
      filters: new Map(),
      getElement,
    };
    if (resolveFilter) {
      context.resolveFilter = resolveFilter;
    }
    if (getFilter) {
      context.getFilter = getFilter;
    }

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

    // Add any new clip paths and filters
    this._addClipPathsToDefs(context.clipPaths);
    this._addFiltersToDefs(context.filters);
  }

  /**
   * Updates an existing element in the DOM using attribute-level diffing
   *
   * @param element - The updated element
   * @param getElement - Function to retrieve elements by ID
   * @param resolveFilter - Optional function to resolve element filters to filter IDs
   * @param getFilter - Optional function to get filter definitions by ID
   */
  updateElement(
    element: BaseElement,
    getElement: ElementGetter,
    resolveFilter?: (filter: ElementFilter) => string,
    getFilter?: (id: string) => FilterDefinition | undefined,
  ): void {
    if (!this._contentGroup) {
      return;
    }

    const existingEntry = this._elementMap.get(element.id);
    if (!existingEntry) {
      // Element doesn't exist, add it
      this.addElement(element, getElement, resolveFilter, getFilter);
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
        this.addElement(element, getElement, resolveFilter, getFilter);
        return;
      }
    }

    const context: RenderContext = {
      clipPaths: new Map(),
      filters: new Map(),
      getElement,
    };
    if (resolveFilter) {
      context.resolveFilter = resolveFilter;
    }
    if (getFilter) {
      context.getFilter = getFilter;
    }

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

    // Add any new clip paths and filters
    this._addClipPathsToDefs(context.clipPaths);
    this._addFiltersToDefs(context.filters);
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

    // Update filter
    const newFilterAttr = this._resolveFilterAttribute(element, context);
    const currentFilter = svgElement.getAttribute('filter');
    if (newFilterAttr !== currentFilter) {
      if (newFilterAttr) {
        svgElement.setAttribute('filter', newFilterAttr);
      } else {
        svgElement.removeAttribute('filter');
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
    this._guidesGroup = null;
    this._snapIndicatorsGroup = null;
    this._elementMap.clear();
    this._renderedClipPaths.clear();
    this._renderedFilters.clear();
    this._renderedGuides.clear();
  }

  // ============================================================
  // Guide Rendering
  // ============================================================

  /**
   * Renders guides on the canvas
   *
   * @param guides - Array of guides to render
   * @param canvasWidth - Canvas width for horizontal guides
   * @param canvasHeight - Canvas height for vertical guides
   */
  renderGuides(guides: Guide[], canvasWidth: number, canvasHeight: number): void {
    if (!this._guidesGroup || !this._guideConfig.guidesVisible) {
      return;
    }

    // Track which guides we've processed
    const processedIds = new Set<string>();

    for (const guide of guides) {
      if (!guide.visible) {
        continue;
      }

      processedIds.add(guide.id);

      const existingLine = this._renderedGuides.get(guide.id);
      if (existingLine) {
        // Update existing guide
        this._updateGuideElement(existingLine, guide, canvasWidth, canvasHeight);
      } else {
        // Create new guide
        const line = this._createGuideElement(guide, canvasWidth, canvasHeight);
        this._guidesGroup.appendChild(line);
        this._renderedGuides.set(guide.id, line);
      }
    }

    // Remove guides that no longer exist
    const guideIdsToRemove: string[] = [];
    for (const id of this._renderedGuides.keys()) {
      if (!processedIds.has(id)) {
        guideIdsToRemove.push(id);
      }
    }
    for (const id of guideIdsToRemove) {
      const line = this._renderedGuides.get(id);
      if (line) {
        line.remove();
      }
      this._renderedGuides.delete(id);
    }
  }

  /**
   * Creates a guide line SVG element
   */
  private _createGuideElement(
    guide: Guide,
    canvasWidth: number,
    canvasHeight: number,
  ): SVGLineElement {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('data-guide-id', guide.id);

    this._updateGuideElement(line, guide, canvasWidth, canvasHeight);

    return line;
  }

  /**
   * Updates a guide line SVG element
   */
  private _updateGuideElement(
    line: SVGLineElement,
    guide: Guide,
    canvasWidth: number,
    canvasHeight: number,
  ): void {
    const color = guide.color ?? this._guideConfig.guideColor;

    if (guide.orientation === 'horizontal') {
      line.setAttribute('x1', '0');
      line.setAttribute('y1', String(guide.position));
      line.setAttribute('x2', String(canvasWidth));
      line.setAttribute('y2', String(guide.position));
    } else {
      line.setAttribute('x1', String(guide.position));
      line.setAttribute('y1', '0');
      line.setAttribute('x2', String(guide.position));
      line.setAttribute('y2', String(canvasHeight));
    }

    line.setAttribute('stroke', color);
    line.setAttribute('stroke-width', String(this._guideConfig.guideStrokeWidth));
    line.setAttribute('stroke-dasharray', guide.locked ? '4,4' : 'none');
    // Use vector-effect to maintain consistent stroke width at any zoom level
    line.setAttribute('vector-effect', 'non-scaling-stroke');
  }

  /**
   * Clears all rendered guides
   */
  clearGuides(): void {
    if (this._guidesGroup) {
      this._guidesGroup.innerHTML = '';
    }
    this._renderedGuides.clear();
  }

  // ============================================================
  // Snap Indicator Rendering
  // ============================================================

  /**
   * Renders snap indicators during drag/resize operations
   *
   * @param snapLines - Active snap lines to render
   * @param canvasWidth - Canvas width
   * @param canvasHeight - Canvas height
   */
  renderSnapIndicators(snapLines: SnapLines, canvasWidth: number, canvasHeight: number): void {
    if (!this._snapIndicatorsGroup) {
      return;
    }

    // Clear existing snap indicators
    this._snapIndicatorsGroup.innerHTML = '';

    const color = this._guideConfig.snapIndicatorColor;
    const strokeWidth = this._guideConfig.snapIndicatorStrokeWidth;

    // Render vertical snap lines
    for (const vLine of snapLines.vertical) {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', String(vLine.x));
      line.setAttribute('y1', '0');
      line.setAttribute('x2', String(vLine.x));
      line.setAttribute('y2', String(canvasHeight));
      line.setAttribute('stroke', color);
      line.setAttribute('stroke-width', String(strokeWidth));
      line.setAttribute('stroke-dasharray', '4,4');
      line.setAttribute('vector-effect', 'non-scaling-stroke');
      this._snapIndicatorsGroup.appendChild(line);
    }

    // Render horizontal snap lines
    for (const hLine of snapLines.horizontal) {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', '0');
      line.setAttribute('y1', String(hLine.y));
      line.setAttribute('x2', String(canvasWidth));
      line.setAttribute('y2', String(hLine.y));
      line.setAttribute('stroke', color);
      line.setAttribute('stroke-width', String(strokeWidth));
      line.setAttribute('stroke-dasharray', '4,4');
      line.setAttribute('vector-effect', 'non-scaling-stroke');
      this._snapIndicatorsGroup.appendChild(line);
    }
  }

  /**
   * Clears all snap indicators
   */
  clearSnapIndicators(): void {
    if (this._snapIndicatorsGroup) {
      this._snapIndicatorsGroup.innerHTML = '';
    }
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
    const filterAttr = this._collectFilterAttr(element, context);

    switch (element.type) {
      case 'image': {
        const el = element as ImageElement;
        const w = String(el.width);
        const h = String(el.height);
        const attrs = `href="${el.src}" width="${w}" height="${h}"`;
        return `<image ${attrs}${transform}${opacity}${clipAttr}${filterAttr} />`;
      }
      case 'text': {
        const el = element as TextElement;
        const fs = String(el.fontSize);
        const content = this._escapeXml(el.content);
        return (
          `<text font-size="${fs}" font-family="${el.fontFamily}" ` +
          `fill="${el.fill}" text-anchor="${el.textAnchor}" style="user-select: none"` +
          `${transform}${opacity}${clipAttr}${filterAttr}>${content}</text>`
        );
      }
      case 'shape': {
        const el = element as ShapeElement;
        return this._shapeToSVG(el, transform, opacity, clipAttr, filterAttr);
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
        return `<g${transform}${opacity}${clipAttr}${filterAttr}>${children}</g>`;
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
    filterAttr: string,
  ): string {
    const sw = String(el.strokeWidth);
    const common =
      `fill="${el.fill}" stroke="${el.stroke}" stroke-width="${sw}"` +
      `${transform}${opacity}${clipAttr}${filterAttr}`;

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

  // ============================================================
  // Private: Filter Handling
  // ============================================================

  /**
   * Collects the filter attribute for SVG string generation
   */
  private _collectFilterAttr(element: BaseElement, context: RenderContext): string {
    if (!element.filters || element.filters.length === 0) {
      return '';
    }

    // For now, we only support single filter; combine multiple into one would require
    // creating a composite filter which is complex. Support the first filter for simplicity.
    const firstFilter = element.filters[0];
    if (!firstFilter) {
      return '';
    }

    if (firstFilter.type === 'custom') {
      // Custom filter - look up by ID
      const filterDef = context.getFilter?.(firstFilter.filterId);
      if (filterDef) {
        if (!context.filters.has(filterDef.id)) {
          context.filters.set(filterDef.id, filterDef);
        }
        return ` filter="url(#${filterDef.id})"`;
      }
      return '';
    }

    // Preset filter - resolve to filter definition
    if (context.resolveFilter) {
      const filterId = context.resolveFilter(firstFilter);
      const filterDef = context.getFilter?.(filterId);
      if (filterDef) {
        if (!context.filters.has(filterDef.id)) {
          context.filters.set(filterDef.id, filterDef);
        }
        return ` filter="url(#${filterDef.id})"`;
      }
    }

    return '';
  }

  /**
   * Resolves the filter attribute for DOM rendering
   */
  private _resolveFilterAttribute(element: BaseElement, context: RenderContext): string | null {
    if (!element.filters || element.filters.length === 0) {
      return null;
    }

    const firstFilter = element.filters[0];
    if (!firstFilter) {
      return null;
    }

    if (firstFilter.type === 'custom') {
      const filterDef = context.getFilter?.(firstFilter.filterId);
      if (filterDef) {
        if (!context.filters.has(filterDef.id)) {
          context.filters.set(filterDef.id, filterDef);
        }
        return `url(#${filterDef.id})`;
      }
      return null;
    }

    if (context.resolveFilter) {
      const filterId = context.resolveFilter(firstFilter);
      const filterDef = context.getFilter?.(filterId);
      if (filterDef) {
        if (!context.filters.has(filterDef.id)) {
          context.filters.set(filterDef.id, filterDef);
        }
        return `url(#${filterDef.id})`;
      }
    }

    return null;
  }

  /**
   * Renders a filter definition to SVG markup
   */
  private _renderFilterDef(filter: FilterDefinition): string {
    const attrs: string[] = [`id="${filter.id}"`];

    if (filter.x !== undefined) {
      attrs.push(`x="${String(filter.x)}"`);
    }
    if (filter.y !== undefined) {
      attrs.push(`y="${String(filter.y)}"`);
    }
    if (filter.width !== undefined) {
      attrs.push(`width="${String(filter.width)}"`);
    }
    if (filter.height !== undefined) {
      attrs.push(`height="${String(filter.height)}"`);
    }
    if (filter.filterUnits) {
      attrs.push(`filterUnits="${filter.filterUnits}"`);
    }
    if (filter.primitiveUnits) {
      attrs.push(`primitiveUnits="${filter.primitiveUnits}"`);
    }
    if (filter.colorInterpolationFilters) {
      attrs.push(`color-interpolation-filters="${filter.colorInterpolationFilters}"`);
    }

    const primitiveMarkup = filter.primitives
      .map((p) => this._renderFilterPrimitive(p))
      .join('\n      ');

    return `<filter ${attrs.join(' ')}>\n      ${primitiveMarkup}\n    </filter>`;
  }

  /**
   * Renders a filter primitive to SVG markup
   */
  private _renderFilterPrimitive(primitive: FilterPrimitive): string {
    const commonAttrs = this._buildCommonFilterAttrs(primitive);

    switch (primitive.type) {
      case 'gaussianBlur':
        return this._renderGaussianBlur(primitive as GaussianBlurPrimitive, commonAttrs);
      case 'dropShadow':
        return this._renderDropShadow(primitive as DropShadowPrimitive, commonAttrs);
      case 'colorMatrix':
        return this._renderColorMatrix(primitive as ColorMatrixPrimitive, commonAttrs);
      case 'componentTransfer':
        return this._renderComponentTransfer(primitive as ComponentTransferPrimitive, commonAttrs);
      case 'morphology':
        return this._renderMorphology(primitive as MorphologyPrimitive, commonAttrs);
      case 'turbulence':
        return this._renderTurbulence(primitive as TurbulencePrimitive, commonAttrs);
      case 'displacement':
        return this._renderDisplacement(primitive as DisplacementPrimitive, commonAttrs);
      case 'blend':
        return this._renderBlend(primitive as BlendPrimitive, commonAttrs);
      case 'composite':
        return this._renderComposite(primitive as CompositePrimitive, commonAttrs);
      case 'flood':
        return this._renderFlood(primitive as FloodPrimitive, commonAttrs);
      case 'merge':
        return this._renderMerge(primitive as MergePrimitive, commonAttrs);
      case 'offset':
        return this._renderOffset(primitive as OffsetPrimitive, commonAttrs);
      case 'convolveMatrix':
        return this._renderConvolveMatrix(primitive as ConvolveMatrixPrimitive, commonAttrs);
      case 'lighting':
        return this._renderLighting(primitive as LightingPrimitive, commonAttrs);
      default:
        return '';
    }
  }

  /**
   * Builds common filter attributes (in, result)
   */
  private _buildCommonFilterAttrs(primitive: FilterPrimitive): string {
    const attrs: string[] = [];
    const base = primitive as { in?: string; result?: string };
    if (base.in) {
      attrs.push(`in="${base.in}"`);
    }
    if (base.result) {
      attrs.push(`result="${base.result}"`);
    }
    return attrs.join(' ');
  }

  private _renderGaussianBlur(p: GaussianBlurPrimitive, common: string): string {
    const stdDev = Array.isArray(p.stdDeviation)
      ? `${p.stdDeviation[0]} ${p.stdDeviation[1]}`
      : String(p.stdDeviation);
    const edgeMode = p.edgeMode ? ` edgeMode="${p.edgeMode}"` : '';
    const attrs = common ? ` ${common}` : '';
    return `<feGaussianBlur stdDeviation="${stdDev}"${edgeMode}${attrs} />`;
  }

  private _renderDropShadow(p: DropShadowPrimitive, common: string): string {
    const opacity = p.floodOpacity !== undefined ? ` flood-opacity="${p.floodOpacity}"` : '';
    const attrs = common ? ` ${common}` : '';
    return `<feDropShadow dx="${p.dx}" dy="${p.dy}" stdDeviation="${p.stdDeviation}" flood-color="${p.floodColor}"${opacity}${attrs} />`;
  }

  private _renderColorMatrix(p: ColorMatrixPrimitive, common: string): string {
    let values = '';
    if (p.values !== undefined) {
      values = Array.isArray(p.values) ? ` values="${p.values.join(' ')}"` : ` values="${p.values}"`;
    }
    const attrs = common ? ` ${common}` : '';
    return `<feColorMatrix type="${p.matrixType}"${values}${attrs} />`;
  }

  private _renderComponentTransfer(p: ComponentTransferPrimitive, common: string): string {
    const attrs = common ? ` ${common}` : '';
    const funcs: string[] = [];

    if (p.funcR) funcs.push(this._renderTransferFunc('feFuncR', p.funcR));
    if (p.funcG) funcs.push(this._renderTransferFunc('feFuncG', p.funcG));
    if (p.funcB) funcs.push(this._renderTransferFunc('feFuncB', p.funcB));
    if (p.funcA) funcs.push(this._renderTransferFunc('feFuncA', p.funcA));

    const content = funcs.join('\n        ');
    return `<feComponentTransfer${attrs}>\n        ${content}\n      </feComponentTransfer>`;
  }

  private _renderTransferFunc(tag: string, func: TransferFunction): string {
    const attrs: string[] = [`type="${func.type}"`];

    if (func.tableValues) {
      attrs.push(`tableValues="${func.tableValues.join(' ')}"`);
    }
    if (func.slope !== undefined) {
      attrs.push(`slope="${func.slope}"`);
    }
    if (func.intercept !== undefined) {
      attrs.push(`intercept="${func.intercept}"`);
    }
    if (func.amplitude !== undefined) {
      attrs.push(`amplitude="${func.amplitude}"`);
    }
    if (func.exponent !== undefined) {
      attrs.push(`exponent="${func.exponent}"`);
    }
    if (func.offset !== undefined) {
      attrs.push(`offset="${func.offset}"`);
    }

    return `<${tag} ${attrs.join(' ')} />`;
  }

  private _renderMorphology(p: MorphologyPrimitive, common: string): string {
    const radius = Array.isArray(p.radius)
      ? `${p.radius[0]} ${p.radius[1]}`
      : String(p.radius);
    const attrs = common ? ` ${common}` : '';
    return `<feMorphology operator="${p.operator}" radius="${radius}"${attrs} />`;
  }

  private _renderTurbulence(p: TurbulencePrimitive, common: string): string {
    const freq = Array.isArray(p.baseFrequency)
      ? `${p.baseFrequency[0]} ${p.baseFrequency[1]}`
      : String(p.baseFrequency);
    const attrs: string[] = [`type="${p.turbulenceType}"`, `baseFrequency="${freq}"`];
    if (p.numOctaves !== undefined) {
      attrs.push(`numOctaves="${p.numOctaves}"`);
    }
    if (p.seed !== undefined) {
      attrs.push(`seed="${p.seed}"`);
    }
    if (p.stitchTiles) {
      attrs.push(`stitchTiles="${p.stitchTiles}"`);
    }
    const commonStr = common ? ` ${common}` : '';
    return `<feTurbulence ${attrs.join(' ')}${commonStr} />`;
  }

  private _renderDisplacement(p: DisplacementPrimitive, common: string): string {
    const attrs: string[] = [`in2="${p.in2}"`, `scale="${p.scale}"`];
    if (p.xChannelSelector) {
      attrs.push(`xChannelSelector="${p.xChannelSelector}"`);
    }
    if (p.yChannelSelector) {
      attrs.push(`yChannelSelector="${p.yChannelSelector}"`);
    }
    const commonStr = common ? ` ${common}` : '';
    return `<feDisplacementMap ${attrs.join(' ')}${commonStr} />`;
  }

  private _renderBlend(p: BlendPrimitive, common: string): string {
    const attrs = common ? ` ${common}` : '';
    return `<feBlend in2="${p.in2}" mode="${p.mode}"${attrs} />`;
  }

  private _renderComposite(p: CompositePrimitive, common: string): string {
    const attrs: string[] = [`in2="${p.in2}"`, `operator="${p.operator}"`];
    if (p.operator === 'arithmetic') {
      if (p.k1 !== undefined) attrs.push(`k1="${p.k1}"`);
      if (p.k2 !== undefined) attrs.push(`k2="${p.k2}"`);
      if (p.k3 !== undefined) attrs.push(`k3="${p.k3}"`);
      if (p.k4 !== undefined) attrs.push(`k4="${p.k4}"`);
    }
    const commonStr = common ? ` ${common}` : '';
    return `<feComposite ${attrs.join(' ')}${commonStr} />`;
  }

  private _renderFlood(p: FloodPrimitive, common: string): string {
    const opacity = p.floodOpacity !== undefined ? ` flood-opacity="${p.floodOpacity}"` : '';
    const attrs = common ? ` ${common}` : '';
    return `<feFlood flood-color="${p.floodColor}"${opacity}${attrs} />`;
  }

  private _renderMerge(p: MergePrimitive, common: string): string {
    const attrs = common ? ` ${common}` : '';
    const nodes = p.nodes.map((n) => `<feMergeNode in="${n.in}" />`).join('\n        ');
    return `<feMerge${attrs}>\n        ${nodes}\n      </feMerge>`;
  }

  private _renderOffset(p: OffsetPrimitive, common: string): string {
    const attrs = common ? ` ${common}` : '';
    return `<feOffset dx="${p.dx}" dy="${p.dy}"${attrs} />`;
  }

  private _renderConvolveMatrix(p: ConvolveMatrixPrimitive, common: string): string {
    const attrs: string[] = [
      `order="${p.order[0]} ${p.order[1]}"`,
      `kernelMatrix="${p.kernelMatrix.join(' ')}"`,
    ];
    if (p.divisor !== undefined) attrs.push(`divisor="${p.divisor}"`);
    if (p.bias !== undefined) attrs.push(`bias="${p.bias}"`);
    if (p.targetX !== undefined) attrs.push(`targetX="${p.targetX}"`);
    if (p.targetY !== undefined) attrs.push(`targetY="${p.targetY}"`);
    if (p.edgeMode) attrs.push(`edgeMode="${p.edgeMode}"`);
    if (p.preserveAlpha !== undefined) attrs.push(`preserveAlpha="${p.preserveAlpha}"`);
    const commonStr = common ? ` ${common}` : '';
    return `<feConvolveMatrix ${attrs.join(' ')}${commonStr} />`;
  }

  private _renderLighting(p: LightingPrimitive, common: string): string {
    const isDiffuse = p.lightingType === 'diffuse';
    const tag = isDiffuse ? 'feDiffuseLighting' : 'feSpecularLighting';
    const attrs: string[] = [];

    if (p.surfaceScale !== undefined) attrs.push(`surfaceScale="${p.surfaceScale}"`);
    if (p.lightingColor) attrs.push(`lighting-color="${p.lightingColor}"`);
    if (isDiffuse && p.diffuseConstant !== undefined) {
      attrs.push(`diffuseConstant="${p.diffuseConstant}"`);
    }
    if (!isDiffuse) {
      if (p.specularConstant !== undefined) attrs.push(`specularConstant="${p.specularConstant}"`);
      if (p.specularExponent !== undefined) attrs.push(`specularExponent="${p.specularExponent}"`);
    }

    const commonStr = common ? ` ${common}` : '';
    const lightEl = this._renderLightSource(p.light);
    const attrStr = attrs.length > 0 ? ` ${attrs.join(' ')}` : '';
    return `<${tag}${attrStr}${commonStr}>\n        ${lightEl}\n      </${tag}>`;
  }

  private _renderLightSource(light: LightingPrimitive['light']): string {
    switch (light.type) {
      case 'distant':
        return `<feDistantLight azimuth="${light.azimuth}" elevation="${light.elevation}" />`;
      case 'point':
        return `<fePointLight x="${light.x}" y="${light.y}" z="${light.z}" />`;
      case 'spot': {
        const attrs: string[] = [
          `x="${light.x}"`,
          `y="${light.y}"`,
          `z="${light.z}"`,
          `pointsAtX="${light.pointsAtX}"`,
          `pointsAtY="${light.pointsAtY}"`,
          `pointsAtZ="${light.pointsAtZ}"`,
        ];
        if (light.specularExponent !== undefined) {
          attrs.push(`specularExponent="${light.specularExponent}"`);
        }
        if (light.limitingConeAngle !== undefined) {
          attrs.push(`limitingConeAngle="${light.limitingConeAngle}"`);
        }
        return `<feSpotLight ${attrs.join(' ')} />`;
      }
      default:
        return '';
    }
  }

  /**
   * Adds filters to the defs element in the DOM
   */
  private _addFiltersToDefs(filters: Map<string, FilterDefinition>): void {
    if (!this._defsElement) {
      return;
    }

    for (const [id, filter] of filters) {
      if (!this._renderedFilters.has(id)) {
        const filterEl = this._createFilterDOMElement(filter);
        this._defsElement.appendChild(filterEl);
        this._renderedFilters.add(id);
      }
    }
  }

  /**
   * Creates a filter DOM element from a filter definition
   */
  private _createFilterDOMElement(filter: FilterDefinition): SVGFilterElement {
    const filterEl = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
    filterEl.setAttribute('id', filter.id);

    if (filter.x !== undefined) {
      filterEl.setAttribute('x', String(filter.x));
    }
    if (filter.y !== undefined) {
      filterEl.setAttribute('y', String(filter.y));
    }
    if (filter.width !== undefined) {
      filterEl.setAttribute('width', String(filter.width));
    }
    if (filter.height !== undefined) {
      filterEl.setAttribute('height', String(filter.height));
    }
    if (filter.filterUnits) {
      filterEl.setAttribute('filterUnits', filter.filterUnits);
    }
    if (filter.primitiveUnits) {
      filterEl.setAttribute('primitiveUnits', filter.primitiveUnits);
    }
    if (filter.colorInterpolationFilters) {
      filterEl.setAttribute('color-interpolation-filters', filter.colorInterpolationFilters);
    }

    // Add primitives as child elements
    for (const primitive of filter.primitives) {
      const primitiveEl = this._createFilterPrimitiveDOMElement(primitive);
      if (primitiveEl) {
        filterEl.appendChild(primitiveEl);
      }
    }

    return filterEl;
  }

  /**
   * Creates a filter primitive DOM element
   */
  private _createFilterPrimitiveDOMElement(primitive: FilterPrimitive): SVGElement | null {
    let el: SVGElement;
    const base = primitive as { in?: string; result?: string };

    switch (primitive.type) {
      case 'gaussianBlur': {
        const p = primitive as GaussianBlurPrimitive;
        el = document.createElementNS('http://www.w3.org/2000/svg', 'feGaussianBlur');
        const stdDev = Array.isArray(p.stdDeviation)
          ? `${p.stdDeviation[0]} ${p.stdDeviation[1]}`
          : String(p.stdDeviation);
        el.setAttribute('stdDeviation', stdDev);
        if (p.edgeMode) el.setAttribute('edgeMode', p.edgeMode);
        break;
      }
      case 'dropShadow': {
        const p = primitive as DropShadowPrimitive;
        el = document.createElementNS('http://www.w3.org/2000/svg', 'feDropShadow');
        el.setAttribute('dx', String(p.dx));
        el.setAttribute('dy', String(p.dy));
        el.setAttribute('stdDeviation', String(p.stdDeviation));
        el.setAttribute('flood-color', p.floodColor);
        if (p.floodOpacity !== undefined) el.setAttribute('flood-opacity', String(p.floodOpacity));
        break;
      }
      case 'colorMatrix': {
        const p = primitive as ColorMatrixPrimitive;
        el = document.createElementNS('http://www.w3.org/2000/svg', 'feColorMatrix');
        el.setAttribute('type', p.matrixType);
        if (p.values !== undefined) {
          el.setAttribute('values', Array.isArray(p.values) ? p.values.join(' ') : String(p.values));
        }
        break;
      }
      case 'componentTransfer': {
        const p = primitive as ComponentTransferPrimitive;
        el = document.createElementNS('http://www.w3.org/2000/svg', 'feComponentTransfer');
        if (p.funcR) el.appendChild(this._createTransferFuncElement('feFuncR', p.funcR));
        if (p.funcG) el.appendChild(this._createTransferFuncElement('feFuncG', p.funcG));
        if (p.funcB) el.appendChild(this._createTransferFuncElement('feFuncB', p.funcB));
        if (p.funcA) el.appendChild(this._createTransferFuncElement('feFuncA', p.funcA));
        break;
      }
      case 'morphology': {
        const p = primitive as MorphologyPrimitive;
        el = document.createElementNS('http://www.w3.org/2000/svg', 'feMorphology');
        el.setAttribute('operator', p.operator);
        const radius = Array.isArray(p.radius) ? `${p.radius[0]} ${p.radius[1]}` : String(p.radius);
        el.setAttribute('radius', radius);
        break;
      }
      case 'turbulence': {
        const p = primitive as TurbulencePrimitive;
        el = document.createElementNS('http://www.w3.org/2000/svg', 'feTurbulence');
        el.setAttribute('type', p.turbulenceType);
        const freq = Array.isArray(p.baseFrequency)
          ? `${p.baseFrequency[0]} ${p.baseFrequency[1]}`
          : String(p.baseFrequency);
        el.setAttribute('baseFrequency', freq);
        if (p.numOctaves !== undefined) el.setAttribute('numOctaves', String(p.numOctaves));
        if (p.seed !== undefined) el.setAttribute('seed', String(p.seed));
        if (p.stitchTiles) el.setAttribute('stitchTiles', p.stitchTiles);
        break;
      }
      case 'displacement': {
        const p = primitive as DisplacementPrimitive;
        el = document.createElementNS('http://www.w3.org/2000/svg', 'feDisplacementMap');
        el.setAttribute('in2', p.in2);
        el.setAttribute('scale', String(p.scale));
        if (p.xChannelSelector) el.setAttribute('xChannelSelector', p.xChannelSelector);
        if (p.yChannelSelector) el.setAttribute('yChannelSelector', p.yChannelSelector);
        break;
      }
      case 'blend': {
        const p = primitive as BlendPrimitive;
        el = document.createElementNS('http://www.w3.org/2000/svg', 'feBlend');
        el.setAttribute('in2', p.in2);
        el.setAttribute('mode', p.mode);
        break;
      }
      case 'composite': {
        const p = primitive as CompositePrimitive;
        el = document.createElementNS('http://www.w3.org/2000/svg', 'feComposite');
        el.setAttribute('in2', p.in2);
        el.setAttribute('operator', p.operator);
        if (p.operator === 'arithmetic') {
          if (p.k1 !== undefined) el.setAttribute('k1', String(p.k1));
          if (p.k2 !== undefined) el.setAttribute('k2', String(p.k2));
          if (p.k3 !== undefined) el.setAttribute('k3', String(p.k3));
          if (p.k4 !== undefined) el.setAttribute('k4', String(p.k4));
        }
        break;
      }
      case 'flood': {
        const p = primitive as FloodPrimitive;
        el = document.createElementNS('http://www.w3.org/2000/svg', 'feFlood');
        el.setAttribute('flood-color', p.floodColor);
        if (p.floodOpacity !== undefined) el.setAttribute('flood-opacity', String(p.floodOpacity));
        break;
      }
      case 'merge': {
        const p = primitive as MergePrimitive;
        el = document.createElementNS('http://www.w3.org/2000/svg', 'feMerge');
        for (const node of p.nodes) {
          const nodeEl = document.createElementNS('http://www.w3.org/2000/svg', 'feMergeNode');
          nodeEl.setAttribute('in', node.in);
          el.appendChild(nodeEl);
        }
        break;
      }
      case 'offset': {
        const p = primitive as OffsetPrimitive;
        el = document.createElementNS('http://www.w3.org/2000/svg', 'feOffset');
        el.setAttribute('dx', String(p.dx));
        el.setAttribute('dy', String(p.dy));
        break;
      }
      case 'convolveMatrix': {
        const p = primitive as ConvolveMatrixPrimitive;
        el = document.createElementNS('http://www.w3.org/2000/svg', 'feConvolveMatrix');
        el.setAttribute('order', `${p.order[0]} ${p.order[1]}`);
        el.setAttribute('kernelMatrix', p.kernelMatrix.join(' '));
        if (p.divisor !== undefined) el.setAttribute('divisor', String(p.divisor));
        if (p.bias !== undefined) el.setAttribute('bias', String(p.bias));
        if (p.targetX !== undefined) el.setAttribute('targetX', String(p.targetX));
        if (p.targetY !== undefined) el.setAttribute('targetY', String(p.targetY));
        if (p.edgeMode) el.setAttribute('edgeMode', p.edgeMode);
        if (p.preserveAlpha !== undefined) el.setAttribute('preserveAlpha', String(p.preserveAlpha));
        break;
      }
      case 'lighting': {
        const p = primitive as LightingPrimitive;
        const tagName = p.lightingType === 'diffuse' ? 'feDiffuseLighting' : 'feSpecularLighting';
        el = document.createElementNS('http://www.w3.org/2000/svg', tagName);
        if (p.surfaceScale !== undefined) el.setAttribute('surfaceScale', String(p.surfaceScale));
        if (p.lightingColor) el.setAttribute('lighting-color', p.lightingColor);
        if (p.lightingType === 'diffuse' && p.diffuseConstant !== undefined) {
          el.setAttribute('diffuseConstant', String(p.diffuseConstant));
        }
        if (p.lightingType === 'specular') {
          if (p.specularConstant !== undefined) el.setAttribute('specularConstant', String(p.specularConstant));
          if (p.specularExponent !== undefined) el.setAttribute('specularExponent', String(p.specularExponent));
        }
        el.appendChild(this._createLightSourceElement(p.light));
        break;
      }
      default:
        return null;
    }

    // Apply common attributes
    if (base.in) el.setAttribute('in', base.in);
    if (base.result) el.setAttribute('result', base.result);

    return el;
  }

  /**
   * Creates a transfer function element
   */
  private _createTransferFuncElement(tagName: string, func: TransferFunction): SVGElement {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tagName);
    el.setAttribute('type', func.type);

    if (func.tableValues) {
      el.setAttribute('tableValues', func.tableValues.join(' '));
    }
    if (func.slope !== undefined) {
      el.setAttribute('slope', String(func.slope));
    }
    if (func.intercept !== undefined) {
      el.setAttribute('intercept', String(func.intercept));
    }
    if (func.amplitude !== undefined) {
      el.setAttribute('amplitude', String(func.amplitude));
    }
    if (func.exponent !== undefined) {
      el.setAttribute('exponent', String(func.exponent));
    }
    if (func.offset !== undefined) {
      el.setAttribute('offset', String(func.offset));
    }

    return el;
  }

  /**
   * Creates a light source element
   */
  private _createLightSourceElement(light: LightingPrimitive['light']): SVGElement {
    switch (light.type) {
      case 'distant': {
        const el = document.createElementNS('http://www.w3.org/2000/svg', 'feDistantLight');
        el.setAttribute('azimuth', String(light.azimuth));
        el.setAttribute('elevation', String(light.elevation));
        return el;
      }
      case 'point': {
        const el = document.createElementNS('http://www.w3.org/2000/svg', 'fePointLight');
        el.setAttribute('x', String(light.x));
        el.setAttribute('y', String(light.y));
        el.setAttribute('z', String(light.z));
        return el;
      }
      case 'spot': {
        const el = document.createElementNS('http://www.w3.org/2000/svg', 'feSpotLight');
        el.setAttribute('x', String(light.x));
        el.setAttribute('y', String(light.y));
        el.setAttribute('z', String(light.z));
        el.setAttribute('pointsAtX', String(light.pointsAtX));
        el.setAttribute('pointsAtY', String(light.pointsAtY));
        el.setAttribute('pointsAtZ', String(light.pointsAtZ));
        if (light.specularExponent !== undefined) {
          el.setAttribute('specularExponent', String(light.specularExponent));
        }
        if (light.limitingConeAngle !== undefined) {
          el.setAttribute('limitingConeAngle', String(light.limitingConeAngle));
        }
        return el;
      }
      default:
        return document.createElementNS('http://www.w3.org/2000/svg', 'feDistantLight');
    }
  }

  /**
   * Builds the defs section content from collected clip paths and filters
   */
  private _buildDefsContent(
    clipPaths: Map<string, ClipPath>,
    filters: Map<string, FilterDefinition>,
  ): string {
    if (clipPaths.size === 0 && filters.size === 0) {
      return '';
    }

    const clipPathMarkup = Array.from(clipPaths.values())
      .map((cp) => this._renderClipPathDef(cp).markup)
      .join('\n    ');

    const filterMarkup = Array.from(filters.values())
      .map((f) => this._renderFilterDef(f))
      .join('\n    ');

    const allMarkup = [clipPathMarkup, filterMarkup].filter((m) => m.length > 0).join('\n    ');

    return `
  <defs>
    ${allMarkup}
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

    // Apply filter
    const filterAttr = this._resolveFilterAttribute(element, context);
    if (filterAttr) {
      svgElement.setAttribute('filter', filterAttr);
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
   * Removes filters from defs that are no longer referenced by any rendered element.
   */
  private _cleanupOrphanedFilters(): void {
    if (!this._defsElement) {
      return;
    }

    // Collect all filter IDs currently in use by rendered elements
    const usedFilterIds = new Set<string>();
    const filterRegex = /url\(#([^)]+)\)/;
    for (const entry of this._elementMap.values()) {
      const filterAttr = entry.element.getAttribute('filter');
      if (filterAttr !== null && filterAttr.length > 0) {
        // Extract ID from "url(#filter-id)" format
        const match = filterRegex.exec(filterAttr);
        const filterId = match?.[1];
        if (filterId !== undefined && filterId.length > 0) {
          usedFilterIds.add(filterId);
        }
      }
    }

    // Remove orphaned filters
    const orphanedIds: string[] = [];
    for (const id of this._renderedFilters) {
      if (!usedFilterIds.has(id)) {
        orphanedIds.push(id);
      }
    }

    for (const id of orphanedIds) {
      const filterEl = this._defsElement.querySelector(`filter#${id}`);
      if (filterEl) {
        filterEl.remove();
      }
      this._renderedFilters.delete(id);
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
