# SVG Composer

A zero-dependency, TypeScript-based SVG canvas editor library for building visual editing experiences. SVG Composer maintains an internal state representation and renders to standard SVG markup, giving you full control over element manipulation, transforms, and export.

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Test Coverage](https://img.shields.io/badge/coverage-%3E80%25-brightgreen.svg)](#testing)

## Features

- **Pure State Management** — JavaScript object state rendered to SVG on changes
- **Standard SVG Output** — Export clean, valid SVG markup without proprietary extensions
- **Zero Dependencies** — Core library has no external dependencies
- **TypeScript First** — Full type safety with comprehensive type definitions
- **Resolution Independent** — ViewBox coordinate system for precise, scalable editing
- **Undo/Redo** — Built-in history with immutable state snapshots
- **Event-Driven** — Extensible architecture through comprehensive event system
- **Filters & Effects** — SVG filters, shadows, blur, color effects with LRU cache
- **Guides & Snapping** — Snap to guides, grid, elements, and canvas edges
- **Alignment & Distribution** — Align and distribute elements with precision
- **Touch Support** — Pointer events, pinch-zoom, two-finger pan

### Capabilities

**Elements:** Image, Text, Shape (rect, circle, ellipse, path), Group with full CRUD operations

**Transforms:** Move, rotate, scale, reset, with center-origin calculations

**Rendering:** DOM-based SVG renderer with incremental updates, clip paths, filters

**Interaction:** Select, Pan, Add tools with hit testing, selection handles, keyboard shortcuts

**Effects:** 17+ filter presets (blur, shadow, glow, grayscale, sepia, vintage, duotone, etc.)

**Layout:** Alignment (7 modes), distribution (8 modes), guides, grid/element/canvas snapping

**State:** Immutable snapshots, undo/redo history, JSON serialization, event system

---

## Installation

```bash
npm install svg-composer
```

## Quick Start

```typescript
import { SVGComposer } from 'svg-composer';

// Mount editor to a DOM element
const editor = new SVGComposer(document.getElementById('canvas'), {
  width: 1200,
  height: 1200,
});

// Add an image
const imageId = editor.addElement({
  type: 'image',
  src: 'https://example.com/photo.jpg',
  width: 400,
  height: 300,
  transform: { x: 100, y: 100, rotation: 0, scaleX: 1, scaleY: 1 },
});

// Select and transform
editor.select(imageId);
editor.rotateElement(imageId, 15);

// Export clean SVG
const svgMarkup = editor.toSVG();
```

---

## API Specification

### Core Types

```typescript
interface Point {
  x: number; // viewBox units
  y: number; // viewBox units
}

interface Transform {
  x: number; // position X in viewBox units
  y: number; // position Y in viewBox units
  rotation: number; // degrees (0-360)
  scaleX: number; // scale factor (1.0 = 100%)
  scaleY: number; // scale factor (1.0 = 100%)
}

interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}
```

### Element Types

All elements extend `BaseElement`:

```typescript
interface BaseElement {
  id: string; // UUID, auto-generated
  type: 'image' | 'text' | 'shape' | 'group';
  transform: Transform;
  opacity: number; // 0.0 to 1.0
  zIndex: number; // stacking order
  locked: boolean; // prevent editing
  visible: boolean; // show/hide
}
```

#### ImageElement

```typescript
interface ImageElement extends BaseElement {
  type: 'image';
  src: string; // asset URL
  width: number; // original width in viewBox units
  height: number; // original height in viewBox units
  clipPath?: string; // optional clip-path ID reference
}
```

#### TextElement

```typescript
interface TextElement extends BaseElement {
  type: 'text';
  content: string;
  fontSize: number; // viewBox units
  fontFamily: string; // CSS font family
  fill: string; // CSS color string
  textAnchor: 'start' | 'middle' | 'end';
}
```

#### ShapeElement

```typescript
interface ShapeElement extends BaseElement {
  type: 'shape';
  shapeType: 'rect' | 'circle' | 'ellipse' | 'path';
  fill: string; // CSS color string
  stroke: string; // CSS color string
  strokeWidth: number; // viewBox units

  // Rectangle specific
  width?: number;
  height?: number;
  rx?: number; // border radius

  // Circle specific
  r?: number; // radius

  // Ellipse specific
  rx?: number; // X radius
  ry?: number; // Y radius

  // Path specific
  path?: string; // SVG path data
}
```

#### GroupElement

```typescript
interface GroupElement extends BaseElement {
  type: 'group';
  children: string[]; // array of element IDs
}
```

### Canvas State

```typescript
interface CanvasState {
  width: number; // viewBox width
  height: number; // viewBox height
  backgroundColor: string; // CSS color
  elements: Map<string, BaseElement>; // all elements
  selectedIds: Set<string>; // current selection
  guides: Guide[]; // guide lines
}
```

### Guides

```typescript
interface Guide {
  id: string; // unique identifier
  orientation: 'horizontal' | 'vertical'; // guide direction
  position: number; // position in viewBox units
  locked: boolean; // prevent movement
  visible: boolean; // show/hide
  color?: string; // custom color (CSS)
}
```

### Snapping Configuration

```typescript
interface SnappingConfig {
  enabled: boolean; // master toggle
  snapDistance: number; // threshold in viewBox units (default: 8)
  snapToGuides: boolean; // snap to guide lines
  snapToGrid: boolean; // snap to grid
  gridSize: number; // grid spacing (default: 10)
  snapToElements: boolean; // snap to element edges
  snapToElementCenters: boolean; // snap to element centers
  snapToCanvasEdges: boolean; // snap to canvas boundaries
  snapToCanvasCenter: boolean; // snap to canvas center
  showSnapIndicators: boolean; // show visual snap lines
}
```

### Clip Paths

```typescript
interface ClipPath {
  id: string;
  type: 'rect' | 'circle' | 'ellipse';

  // Rectangle
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rx?: number;

  // Circle
  cx?: number;
  cy?: number;
  r?: number;

  // Ellipse (uses cx, cy)
  rx?: number;
  ry?: number;
}
```

### Filters & Effects

SVG Composer provides both low-level filter primitives and high-level effect presets.

#### Effect Presets

Effect presets provide a simple API for common visual effects:

```typescript
type EffectType =
  | 'blur' // Gaussian blur
  | 'dropShadow' // Drop shadow
  | 'innerShadow' // Inner shadow
  | 'glow' // Outer/inner glow
  | 'grayscale' // Grayscale conversion
  | 'sepia' // Sepia tone
  | 'saturate' // Saturation adjustment
  | 'hueRotate' // Hue rotation
  | 'brightness' // Brightness adjustment
  | 'contrast' // Contrast adjustment
  | 'invert' // Color inversion
  | 'sharpen' // Sharpening
  | 'emboss' // Emboss/relief effect
  | 'noise' // Noise/grain
  | 'outline' // Stroke outline
  | 'brightnessContrast' // Combined brightness/contrast
  | 'vintage' // Vintage photo effect
  | 'duotone'; // Two-tone color mapping

// Example effect interfaces
interface BlurEffect {
  type: 'blur';
  radius: number; // blur radius in viewBox units
}

interface DropShadowEffect {
  type: 'dropShadow';
  offsetX: number; // horizontal offset
  offsetY: number; // vertical offset
  blur: number; // blur radius
  color: string; // CSS color
  opacity?: number; // 0-1
}

interface GrayscaleEffect {
  type: 'grayscale';
  amount?: number; // 0-1, default 1 (full grayscale)
}

interface DuotoneEffect {
  type: 'duotone';
  shadowColor: string; // color for dark areas
  highlightColor: string; // color for light areas
}
```

#### Filter Primitives

For advanced effects, you can work directly with SVG filter primitives:

```typescript
type FilterPrimitiveType =
  | 'gaussianBlur' // feGaussianBlur
  | 'dropShadow' // feDropShadow
  | 'colorMatrix' // feColorMatrix
  | 'componentTransfer' // feComponentTransfer
  | 'morphology' // feMorphology (dilate/erode)
  | 'turbulence' // feTurbulence (noise)
  | 'displacement' // feDisplacementMap
  | 'blend' // feBlend
  | 'composite' // feComposite
  | 'flood' // feFlood
  | 'merge' // feMerge
  | 'offset' // feOffset
  | 'convolveMatrix' // feConvolveMatrix
  | 'lighting'; // feDiffuseLighting/feSpecularLighting

interface FilterDefinition {
  id: string;
  primitives: FilterPrimitive[];
  x?: string; // filter region
  y?: string;
  width?: string;
  height?: string;
  filterUnits?: 'userSpaceOnUse' | 'objectBoundingBox';
}
```

### Event Types

```typescript
type EditorEvents = {
  'element:added': { element: BaseElement };
  'element:updated': { id: string; element: BaseElement };
  'element:removed': { id: string };
  'selection:changed': { selectedIds: string[] };
  'canvas:clicked': { x: number; y: number; element?: BaseElement };
  'state:changed': { state: CanvasState };
  'history:changed': { canUndo: boolean; canRedo: boolean };
  'tool:changed': { tool: ToolType };
  error: { message: string; details?: unknown };
};

type ToolType = 'select' | 'pan' | 'add-image' | 'add-text' | 'add-shape';
```

---

## SVGComposer Class

### Constructor

```typescript
constructor(
  container: HTMLElement,
  options?: {
    width?: number;       // default: 1200
    height?: number;      // default: 1200
    backgroundColor?: string;  // default: '#ffffff'
    historyLimit?: number;     // default: 50
  }
)
```

### Element Management

```typescript
// Creation & Deletion
addElement(element: Omit<BaseElement, 'id'>): string;  // returns generated ID
removeElement(id: string): void;
removeElements(ids: string[]): void;

// Updates
updateElement(id: string, updates: Partial<BaseElement>): void;
replaceElement(id: string, element: BaseElement): void;

// Queries
getElement(id: string): BaseElement | undefined;
getAllElements(): BaseElement[];
getElementsByType(type: BaseElement['type']): BaseElement[];
getElementsInBounds(bounds: BoundingBox): BaseElement[];
```

### Selection

```typescript
select(id: string | string[]): void;           // replaces current selection
addToSelection(id: string | string[]): void;
removeFromSelection(id: string | string[]): void;
clearSelection(): void;
getSelected(): BaseElement[];
selectAll(): void;                             // visible, unlocked elements only
```

### Transforms

All transforms use element center as origin.

```typescript
moveElement(id: string, dx: number, dy: number): void;      // relative
setPosition(id: string, x: number, y: number): void;        // absolute
rotateElement(id: string, degrees: number): void;
scaleElement(id: string, scaleX: number, scaleY: number): void;
resetTransform(id: string): void;
```

### Z-Order

```typescript
bringToFront(id: string): void;
sendToBack(id: string): void;
bringForward(id: string): void;     // up one level
sendBackward(id: string): void;     // down one level
setZIndex(id: string, zIndex: number): void;
```

### History

```typescript
undo(): void;
redo(): void;
canUndo(): boolean;
canRedo(): boolean;
clearHistory(): void;
getHistorySize(): number;
```

### Clipping

```typescript
addClipPath(elementId: string, clipPath: Omit<ClipPath, 'id'>): string;
removeClipPath(elementId: string): void;
updateClipPath(elementId: string, updates: Partial<ClipPath>): void;
```

### Filters & Effects

```typescript
// Effect presets (simple API)
addEffect(elementId: string, effect: EffectPreset): string;  // returns filter ID
setEffect(elementId: string, effect: EffectPreset | null): string;  // replace all

// Custom filters (advanced API)
addFilter(filter: Omit<FilterDefinition, 'id'>): string;
getFilter(filterId: string): FilterDefinition | undefined;
getAllFilters(): FilterDefinition[];
removeFilter(filterId: string): boolean;
applyFilter(elementId: string, filterId: string): void;

// Element filter management
clearFilters(elementId: string): void;
removeFilterFromElement(elementId: string, filterIndex: number): void;
getElementFilters(elementId: string): ElementFilter[];
hasFilters(elementId: string): boolean;
```

### Guides

```typescript
// Guide Management
addGuide(guide: Omit<Guide, 'id'>): string;           // returns generated ID
addHorizontalGuide(y: number, options?): string;      // convenience method
addVerticalGuide(x: number, options?): string;        // convenience method
removeGuide(id: string): void;
updateGuide(id: string, updates: Partial<Guide>): void;
getGuide(id: string): Guide | undefined;
getGuides(): Guide[];
clearGuides(): void;
```

### Snapping

```typescript
// Snapping Configuration
getSnappingConfig(): SnappingConfig;
setSnappingConfig(updates: Partial<SnappingConfig>): void;
enableSnapping(): void;
disableSnapping(): void;
toggleSnapping(): boolean;                            // returns new state
```

### Alignment & Distribution

```typescript
// Alignment (uses selected elements if ids not provided)
alignLeft(ids?: string[], options?: AlignmentOptions): void;
alignRight(ids?: string[], options?: AlignmentOptions): void;
alignTop(ids?: string[], options?: AlignmentOptions): void;
alignBottom(ids?: string[], options?: AlignmentOptions): void;
alignCenterHorizontal(ids?: string[], options?: AlignmentOptions): void;
alignCenterVertical(ids?: string[], options?: AlignmentOptions): void;
alignCenter(ids?: string[], options?: AlignmentOptions): void;

// Distribution (requires 3+ elements)
distributeLeft(ids?: string[]): void;
distributeRight(ids?: string[]): void;
distributeTop(ids?: string[]): void;
distributeBottom(ids?: string[]): void;
distributeHorizontal(ids?: string[]): void;          // by center
distributeVertical(ids?: string[]): void;            // by center
distributeHorizontalGaps(ids?: string[]): void;      // equal spacing
distributeVerticalGaps(ids?: string[]): void;        // equal spacing

// AlignmentOptions
interface AlignmentOptions {
  relativeTo?: 'selection' | 'canvas' | 'first';     // default: 'selection'
}
```

### Export/Import

```typescript
toSVG(): string;              // clean SVG markup
toJSON(): string;             // state serialization
fromJSON(json: string): void; // restore state
clear(): void;                // reset to empty
```

### Events

```typescript
on<K extends keyof EditorEvents>(
  event: K,
  handler: (data: EditorEvents[K]) => void
): void;

off<K extends keyof EditorEvents>(
  event: K,
  handler: (data: EditorEvents[K]) => void
): void;

once<K extends keyof EditorEvents>(
  event: K,
  handler: (data: EditorEvents[K]) => void
): void;
```

### Tools & Interaction

```typescript
setTool(tool: ToolType): void;
getTool(): ToolType;
```

### Lifecycle

```typescript
render(): void;     // force re-render (usually automatic)
destroy(): void;    // cleanup and remove from DOM
```

---

## Usage Examples

### Adding Elements

```typescript
// Add an image
const imageId = editor.addElement({
  type: 'image',
  src: '/uploads/photo.jpg',
  width: 400,
  height: 300,
  transform: { x: 100, y: 150, rotation: 0, scaleX: 1, scaleY: 1 },
  opacity: 1,
  zIndex: 1,
  locked: false,
  visible: true,
});

// Add text
const textId = editor.addElement({
  type: 'text',
  content: 'Summer 2024',
  fontSize: 48,
  fontFamily: 'Georgia, serif',
  fill: '#333333',
  textAnchor: 'middle',
  transform: { x: 600, y: 50, rotation: 0, scaleX: 1, scaleY: 1 },
  opacity: 1,
  zIndex: 2,
  locked: false,
  visible: true,
});

// Add a shape
const shapeId = editor.addElement({
  type: 'shape',
  shapeType: 'rect',
  width: 200,
  height: 150,
  rx: 10,
  fill: '#e0e0e0',
  stroke: '#999999',
  strokeWidth: 2,
  transform: { x: 500, y: 400, rotation: 45, scaleX: 1, scaleY: 1 },
  opacity: 0.8,
  zIndex: 0,
  locked: false,
  visible: true,
});
```

### Working with Selection

```typescript
// Select single element
editor.select(imageId);

// Multi-select
editor.select([imageId, textId]);

// Add to existing selection
editor.addToSelection(shapeId);

// Get selected elements
const selected = editor.getSelected();
console.log(`${selected.length} elements selected`);

// Clear selection
editor.clearSelection();
```

### Transforming Elements

```typescript
// Move relative to current position
editor.moveElement(imageId, 50, -25);

// Set absolute position
editor.setPosition(imageId, 200, 200);

// Rotate 15 degrees (around center)
editor.rotateElement(imageId, 15);

// Scale to 150%
editor.scaleElement(imageId, 1.5, 1.5);

// Reset all transforms
editor.resetTransform(imageId);
```

### Applying Clip Masks

```typescript
// Circular crop
editor.addClipPath(imageId, {
  type: 'circle',
  cx: 200,
  cy: 150,
  r: 100,
});

// Rectangular crop with rounded corners
editor.addClipPath(imageId, {
  type: 'rect',
  x: 50,
  y: 50,
  width: 300,
  height: 200,
  rx: 20,
});

// Remove clip
editor.removeClipPath(imageId);
```

### Applying Filters & Effects

```typescript
import {
  blur,
  dropShadow,
  grayscale,
  sepia,
  glow,
  duotone,
  brightnessContrast,
  presets,
} from 'svg-composer';

// Add a simple blur effect
editor.addEffect(imageId, blur(5));

// Add a drop shadow
editor.addEffect(
  imageId,
  dropShadow({
    offsetX: 4,
    offsetY: 4,
    blur: 8,
    color: 'rgba(0,0,0,0.5)',
  }),
);

// Apply grayscale
editor.addEffect(imageId, grayscale(1));

// Add a glow effect
editor.addEffect(
  imageId,
  glow({
    radius: 12,
    color: '#00ff00',
    opacity: 0.8,
  }),
);

// Create duotone effect
editor.addEffect(imageId, duotone('#0d0221', '#ff00ff'));

// Combine brightness and contrast
editor.addEffect(
  imageId,
  brightnessContrast({
    brightness: 1.2,
    contrast: 1.4,
  }),
);

// Use built-in presets
editor.addEffect(imageId, presets.cardShadow());
editor.addEffect(imageId, presets.neonGlow('#00ff00'));
editor.addEffect(imageId, presets.blackAndWhite());
editor.addEffect(imageId, presets.vintagePhoto());
editor.addEffect(imageId, presets.filmGrain());

// Replace all effects with a single one
editor.setEffect(imageId, blur(3));

// Clear all effects from element
editor.setEffect(imageId, null);
// or
editor.clearFilters(imageId);

// Check if element has filters
if (editor.hasFilters(imageId)) {
  const filters = editor.getElementFilters(imageId);
  console.log(`Element has ${filters.length} filter(s)`);
}

// Remove a specific filter by index
editor.removeFilterFromElement(imageId, 0);
```

### Working with Custom Filters (Advanced)

```typescript
// Create a custom filter with multiple primitives
const filterId = editor.addFilter({
  primitives: [
    { type: 'gaussianBlur', stdDeviation: 3, in: 'SourceAlpha', result: 'blur' },
    { type: 'offset', dx: 5, dy: 5, in: 'blur', result: 'offsetBlur' },
    {
      type: 'merge',
      nodes: [{ in: 'offsetBlur' }, { in: 'SourceGraphic' }],
    },
  ],
});

// Apply custom filter to element
editor.applyFilter(imageId, filterId);

// Get filter definition
const filter = editor.getFilter(filterId);

// List all filters
const allFilters = editor.getAllFilters();

// Remove filter definition
editor.removeFilter(filterId);
```

### Available Effect Presets

| Preset                     | Description                         |
| -------------------------- | ----------------------------------- |
| `presets.cardShadow()`     | Soft shadow for cards               |
| `presets.floatingShadow()` | Strong shadow for floating elements |
| `presets.textShadow()`     | Subtle text shadow                  |
| `presets.neonGlow(color)`  | Neon glow effect                    |
| `presets.innerGlow(color)` | Soft inner glow                     |
| `presets.blackAndWhite()`  | Full grayscale                      |
| `presets.faded()`          | Washed out look                     |
| `presets.dramatic()`       | High contrast                       |
| `presets.warm()`           | Warm color temperature              |
| `presets.cool()`           | Cool color temperature              |
| `presets.vintagePhoto()`   | Vintage photo effect                |
| `presets.nashville()`      | Instagram-style filter              |
| `presets.backgroundBlur()` | Soft blur for backgrounds           |
| `presets.filmGrain()`      | Film grain/noise effect             |
| `presets.cyberpunk()`      | Cyberpunk duotone                   |
| `presets.ocean()`          | Ocean blue duotone                  |
| `presets.sunset()`         | Sunset orange duotone               |

### Working with Guides

```typescript
// Add horizontal guide at y=100
const guideH = editor.addHorizontalGuide(100);

// Add vertical guide at x=200 with custom color
const guideV = editor.addVerticalGuide(200, { color: '#ff0000' });

// Update guide position
editor.updateGuide(guideH, { position: 150 });

// Lock a guide (prevents editing, dashed rendering)
editor.updateGuide(guideV, { locked: true });

// Get all guides
const guides = editor.getGuides();
console.log(`${guides.length} guides on canvas`);

// Remove a guide
editor.removeGuide(guideH);

// Clear all guides
editor.clearGuides();
```

### Configuring Snapping

```typescript
// Enable snapping (enabled by default)
editor.enableSnapping();

// Configure snap behavior
editor.setSnappingConfig({
  snapDistance: 10, // increase snap range
  snapToGuides: true, // snap to guide lines
  snapToGrid: true, // enable grid snapping
  gridSize: 25, // 25-unit grid
  snapToElements: true, // snap to element edges
  snapToElementCenters: true, // snap to element centers
  snapToCanvasEdges: true, // snap to canvas boundaries
  snapToCanvasCenter: true, // snap to canvas center
  showSnapIndicators: true, // show visual snap lines
});

// Toggle snapping on/off
const isEnabled = editor.toggleSnapping();
console.log(`Snapping ${isEnabled ? 'enabled' : 'disabled'}`);

// Disable snapping temporarily
editor.disableSnapping();
```

### Aligning and Distributing Elements

```typescript
// Select multiple elements first
editor.select([element1, element2, element3]);

// Align selected elements to left edge
editor.alignLeft();

// Align to center horizontally and vertically
editor.alignCenter();

// Align to canvas instead of selection bounds
editor.alignLeft(undefined, { relativeTo: 'canvas' });

// Align specific elements (doesn't require selection)
editor.alignTop([id1, id2, id3]);

// Align to first element in list
editor.alignRight([id1, id2, id3], { relativeTo: 'first' });

// Distribute elements evenly (requires 3+ elements)
editor.distributeHorizontal(); // by center points
editor.distributeVertical(); // by center points
editor.distributeHorizontalGaps(); // equal spacing between
editor.distributeVerticalGaps(); // equal spacing between

// Distribute by edges
editor.distributeLeft(); // align left edges evenly
editor.distributeRight(); // align right edges evenly
editor.distributeTop(); // align top edges evenly
editor.distributeBottom(); // align bottom edges evenly
```

### Undo/Redo

```typescript
// Perform operations
editor.moveElement(imageId, 100, 0);
editor.rotateElement(imageId, 45);

// Undo last operation
if (editor.canUndo()) {
  editor.undo();
}

// Redo
if (editor.canRedo()) {
  editor.redo();
}
```

### Event Handling

```typescript
// React to selection changes
editor.on('selection:changed', ({ selectedIds }) => {
  updatePropertiesPanel(selectedIds);
});

// Track history state
editor.on('history:changed', ({ canUndo, canRedo }) => {
  undoButton.disabled = !canUndo;
  redoButton.disabled = !canRedo;
});

// Handle errors
editor.on('error', ({ message, details }) => {
  console.error('Editor error:', message, details);
});
```

### Export

```typescript
// Get SVG markup
const svg = editor.toSVG();
document.getElementById('preview').innerHTML = svg;

// Save state to JSON
const state = editor.toJSON();
localStorage.setItem('draft', state);

// Restore from JSON
const saved = localStorage.getItem('draft');
if (saved) {
  editor.fromJSON(saved);
}
```

### Framework Integration (React)

```typescript
import { useEffect, useRef, useState } from 'react';
import { SVGComposer } from 'svg-composer';

function Editor() {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<SVGComposer | null>(null);
  const [selectedCount, setSelectedCount] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;

    const editor = new SVGComposer(containerRef.current, {
      width: 1200,
      height: 1200
    });

    editor.on('selection:changed', ({ selectedIds }) => {
      setSelectedCount(selectedIds.length);
    });

    editorRef.current = editor;

    return () => editor.destroy();
  }, []);

  return (
    <div>
      <div ref={containerRef} style={{ width: '100%', height: '600px' }} />
      <p>{selectedCount} elements selected</p>
    </div>
  );
}
```

### Framework Integration (Vue 3)

```vue
<template>
  <div>
    <div ref="canvasContainer" class="canvas-container"></div>
    <div class="toolbar">
      <button @click="undo" :disabled="!canUndo">Undo</button>
      <button @click="redo" :disabled="!canRedo">Redo</button>
      <button @click="addText">Add Text</button>
      <button @click="exportSvg">Export SVG</button>
    </div>
    <p>{{ selectedCount }} element(s) selected</p>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, shallowRef } from 'vue';
import { SVGComposer } from 'svg-composer';

const canvasContainer = ref<HTMLDivElement | null>(null);
const editor = shallowRef<SVGComposer | null>(null);
const selectedCount = ref(0);
const canUndo = ref(false);
const canRedo = ref(false);

onMounted(() => {
  if (!canvasContainer.value) return;

  const instance = new SVGComposer(canvasContainer.value, {
    width: 1200,
    height: 800,
    backgroundColor: '#f5f5f5'
  });

  // Track selection changes
  instance.on('selection:changed', ({ selectedIds }) => {
    selectedCount.value = selectedIds.length;
  });

  // Track history state for undo/redo buttons
  instance.on('history:changed', (state) => {
    canUndo.value = state.canUndo;
    canRedo.value = state.canRedo;
  });

  editor.value = instance;
});

onUnmounted(() => {
  editor.value?.destroy();
});

function undo() {
  editor.value?.undo();
}

function redo() {
  editor.value?.redo();
}

function addText() {
  editor.value?.addElement({
    type: 'text',
    content: 'Hello Vue!',
    fontSize: 36,
    fontFamily: 'Arial, sans-serif',
    fill: '#333333',
    textAnchor: 'middle',
    transform: { x: 600, y: 400, rotation: 0, scaleX: 1, scaleY: 1 },
    opacity: 1,
    zIndex: 1,
    locked: false,
    visible: true
  });
}

function exportSvg() {
  const svg = editor.value?.toSVG();
  if (svg) {
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'canvas.svg';
    a.click();
    URL.revokeObjectURL(url);
  }
}
</script>

<style scoped>
.canvas-container {
  width: 100%;
  height: 600px;
  border: 1px solid #ddd;
}
.toolbar {
  margin-top: 10px;
  display: flex;
  gap: 8px;
}
</style>
```

### Framework Integration (Vanilla JavaScript)

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>SVG Composer - Vanilla JS</title>
  <style>
    #canvas-container {
      width: 100%;
      height: 600px;
      border: 1px solid #ccc;
    }
    .toolbar { margin: 10px 0; }
    .toolbar button { margin-right: 5px; }
    .toolbar button:disabled { opacity: 0.5; }
  </style>
</head>
<body>
  <div class="toolbar">
    <button id="btn-undo" disabled>Undo</button>
    <button id="btn-redo" disabled>Redo</button>
    <button id="btn-rect">Add Rectangle</button>
    <button id="btn-circle">Add Circle</button>
    <button id="btn-text">Add Text</button>
    <button id="btn-delete">Delete Selected</button>
    <button id="btn-export">Export SVG</button>
  </div>
  <div id="canvas-container"></div>
  <p id="status">No selection</p>

  <script type="module">
    import { SVGComposer, dropShadow } from 'svg-composer';

    // Initialize the editor
    const container = document.getElementById('canvas-container');
    const editor = new SVGComposer(container, {
      width: 1200,
      height: 800,
      backgroundColor: '#ffffff'
    });

    // Get UI elements
    const btnUndo = document.getElementById('btn-undo');
    const btnRedo = document.getElementById('btn-redo');
    const btnRect = document.getElementById('btn-rect');
    const btnCircle = document.getElementById('btn-circle');
    const btnText = document.getElementById('btn-text');
    const btnDelete = document.getElementById('btn-delete');
    const btnExport = document.getElementById('btn-export');
    const status = document.getElementById('status');

    // Track history state
    editor.on('history:changed', ({ canUndo, canRedo }) => {
      btnUndo.disabled = !canUndo;
      btnRedo.disabled = !canRedo;
    });

    // Track selection
    editor.on('selection:changed', ({ selectedIds }) => {
      status.textContent = selectedIds.length > 0
        ? `${selectedIds.length} element(s) selected`
        : 'No selection';
    });

    // Button handlers
    btnUndo.addEventListener('click', () => editor.undo());
    btnRedo.addEventListener('click', () => editor.redo());

    btnRect.addEventListener('click', () => {
      const id = editor.addElement({
        type: 'shape',
        shapeType: 'rect',
        width: 150,
        height: 100,
        rx: 8,
        fill: '#4a90d9',
        stroke: '#2d5a87',
        strokeWidth: 2,
        transform: { x: 200 + Math.random() * 400, y: 150 + Math.random() * 300, rotation: 0, scaleX: 1, scaleY: 1 },
        opacity: 1, zIndex: Date.now(), locked: false, visible: true
      });
      editor.addEffect(id, dropShadow({ offsetX: 3, offsetY: 3, blur: 6, color: 'rgba(0,0,0,0.3)' }));
      editor.select(id);
    });

    btnCircle.addEventListener('click', () => {
      const id = editor.addElement({
        type: 'shape',
        shapeType: 'circle',
        r: 60,
        fill: '#e74c3c',
        stroke: '#c0392b',
        strokeWidth: 2,
        transform: { x: 300 + Math.random() * 400, y: 200 + Math.random() * 300, rotation: 0, scaleX: 1, scaleY: 1 },
        opacity: 1, zIndex: Date.now(), locked: false, visible: true
      });
      editor.select(id);
    });

    btnText.addEventListener('click', () => {
      const id = editor.addElement({
        type: 'text',
        content: 'Hello World!',
        fontSize: 32,
        fontFamily: 'Georgia, serif',
        fill: '#2c3e50',
        textAnchor: 'middle',
        transform: { x: 400 + Math.random() * 200, y: 300 + Math.random() * 200, rotation: 0, scaleX: 1, scaleY: 1 },
        opacity: 1, zIndex: Date.now(), locked: false, visible: true
      });
      editor.select(id);
    });

    btnDelete.addEventListener('click', () => {
      const selected = editor.getSelected();
      if (selected.length > 0) {
        editor.removeElements(selected.map(el => el.id));
      }
    });

    btnExport.addEventListener('click', () => {
      const svg = editor.toSVG();
      const blob = new Blob([svg], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'design.svg';
      a.click();
      URL.revokeObjectURL(url);
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z') { e.preventDefault(); editor.undo(); }
        if (e.key === 'y') { e.preventDefault(); editor.redo(); }
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const selected = editor.getSelected();
        if (selected.length > 0) {
          e.preventDefault();
          editor.removeElements(selected.map(el => el.id));
        }
      }
    });
  </script>
</body>
</html>
```

---

## Tutorials

This section provides step-by-step tutorials for common use cases.

### Tutorial 1: Building a Photo Editor

Learn how to create a basic photo editing application with image manipulation, text overlays, and effect filters.

#### Step 1: Set Up the Editor

```typescript
import { SVGComposer, dropShadow, blur, grayscale, sepia, presets } from 'svg-composer';

const editor = new SVGComposer(document.getElementById('editor'), {
  width: 1200,
  height: 900,
  backgroundColor: '#2c2c2c'
});
```

#### Step 2: Load and Position an Image

```typescript
// Add a photo as the main canvas element
const photoId = editor.addElement({
  type: 'image',
  src: '/photos/landscape.jpg',
  width: 800,
  height: 600,
  transform: { x: 200, y: 150, rotation: 0, scaleX: 1, scaleY: 1 },
  opacity: 1,
  zIndex: 0,
  locked: false,
  visible: true
});

// Center the image on canvas
editor.select(photoId);
editor.alignCenter(undefined, { relativeTo: 'canvas' });
```

#### Step 3: Add Text Overlays

```typescript
// Add a title
const titleId = editor.addElement({
  type: 'text',
  content: 'Summer Memories',
  fontSize: 64,
  fontFamily: 'Georgia, serif',
  fill: '#ffffff',
  textAnchor: 'middle',
  transform: { x: 600, y: 80, rotation: 0, scaleX: 1, scaleY: 1 },
  opacity: 1,
  zIndex: 10,
  locked: false,
  visible: true
});

// Add a subtle shadow to the text for readability
editor.addEffect(titleId, dropShadow({
  offsetX: 2,
  offsetY: 2,
  blur: 4,
  color: 'rgba(0,0,0,0.7)'
}));

// Add a caption
const captionId = editor.addElement({
  type: 'text',
  content: 'Beach vacation 2024',
  fontSize: 24,
  fontFamily: 'Arial, sans-serif',
  fill: '#cccccc',
  textAnchor: 'middle',
  transform: { x: 600, y: 850, rotation: 0, scaleX: 1, scaleY: 1 },
  opacity: 0.9,
  zIndex: 10,
  locked: false,
  visible: true
});
```

#### Step 4: Apply Photo Effects

```typescript
// Create effect controls
function applyVintageEffect() {
  editor.setEffect(photoId, presets.vintagePhoto());
}

function applyBlackAndWhite() {
  editor.setEffect(photoId, grayscale(1));
}

function applySepiaEffect() {
  editor.setEffect(photoId, sepia(0.8));
}

function applyDramaticEffect() {
  editor.setEffect(photoId, presets.dramatic());
}

function clearEffects() {
  editor.setEffect(photoId, null);
}
```

#### Step 5: Add a Frame or Border

```typescript
// Add a decorative frame around the photo
const frameId = editor.addElement({
  type: 'shape',
  shapeType: 'rect',
  width: 820,
  height: 620,
  rx: 0,
  fill: 'none',
  stroke: '#d4af37', // gold color
  strokeWidth: 8,
  transform: { x: 190, y: 140, rotation: 0, scaleX: 1, scaleY: 1 },
  opacity: 1,
  zIndex: 5,
  locked: false,
  visible: true
});

// Add outer shadow to the frame
editor.addEffect(frameId, dropShadow({
  offsetX: 0,
  offsetY: 0,
  blur: 15,
  color: 'rgba(212, 175, 55, 0.5)'
}));
```

#### Step 6: Export the Final Result

```typescript
function downloadImage() {
  const svg = editor.toSVG();
  const blob = new Blob([svg], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = 'edited-photo.svg';
  link.click();

  URL.revokeObjectURL(url);
}

function saveProject() {
  const json = editor.toJSON();
  localStorage.setItem('photo-editor-project', json);
}

function loadProject() {
  const saved = localStorage.getItem('photo-editor-project');
  if (saved) {
    editor.fromJSON(saved);
  }
}
```

---

### Tutorial 2: Creating a Design Tool

Build a design tool with shapes, alignment features, and precise positioning using guides and snapping.

#### Step 1: Configure the Editor with Guides

```typescript
import { SVGComposer } from 'svg-composer';

const editor = new SVGComposer(document.getElementById('design-canvas'), {
  width: 1200,
  height: 900,
  backgroundColor: '#ffffff'
});

// Add margin guides
editor.addHorizontalGuide(50, { color: '#0099ff' });   // top margin
editor.addHorizontalGuide(850, { color: '#0099ff' });  // bottom margin
editor.addVerticalGuide(50, { color: '#0099ff' });     // left margin
editor.addVerticalGuide(1150, { color: '#0099ff' });   // right margin

// Add center guides
editor.addHorizontalGuide(450, { color: '#ff6600' });  // vertical center
editor.addVerticalGuide(600, { color: '#ff6600' });    // horizontal center
```

#### Step 2: Enable Snapping for Precision

```typescript
editor.setSnappingConfig({
  enabled: true,
  snapDistance: 8,
  snapToGuides: true,
  snapToGrid: true,
  gridSize: 20,
  snapToElements: true,
  snapToElementCenters: true,
  snapToCanvasEdges: true,
  snapToCanvasCenter: true,
  showSnapIndicators: true
});
```

#### Step 3: Create Reusable Shape Functions

```typescript
function createCard(x: number, y: number, title: string) {
  // Card background
  const bgId = editor.addElement({
    type: 'shape',
    shapeType: 'rect',
    width: 280,
    height: 180,
    rx: 12,
    fill: '#ffffff',
    stroke: '#e0e0e0',
    strokeWidth: 1,
    transform: { x, y, rotation: 0, scaleX: 1, scaleY: 1 },
    opacity: 1,
    zIndex: 0,
    locked: false,
    visible: true
  });

  // Card title
  const titleId = editor.addElement({
    type: 'text',
    content: title,
    fontSize: 20,
    fontFamily: 'Arial, sans-serif',
    fill: '#333333',
    textAnchor: 'start',
    transform: { x: x + 20, y: y + 35, rotation: 0, scaleX: 1, scaleY: 1 },
    opacity: 1,
    zIndex: 1,
    locked: false,
    visible: true
  });

  // Add shadow to card
  editor.addEffect(bgId, {
    type: 'dropShadow',
    offsetX: 0,
    offsetY: 4,
    blur: 12,
    color: 'rgba(0,0,0,0.1)'
  });

  return { bgId, titleId };
}

// Create multiple cards
const card1 = createCard(100, 100, 'Dashboard');
const card2 = createCard(420, 100, 'Analytics');
const card3 = createCard(740, 100, 'Settings');
```

#### Step 4: Align and Distribute Elements

```typescript
// Select all card backgrounds
const cardIds = [card1.bgId, card2.bgId, card3.bgId];
editor.select(cardIds);

// Align tops
editor.alignTop();

// Distribute horizontally with equal spacing
editor.distributeHorizontalGaps();

// Center the row on the canvas horizontally
editor.alignCenterHorizontal(undefined, { relativeTo: 'canvas' });
```

#### Step 5: Z-Order Management

```typescript
// Create a header bar
const headerId = editor.addElement({
  type: 'shape',
  shapeType: 'rect',
  width: 1200,
  height: 60,
  fill: '#1a73e8',
  stroke: 'none',
  strokeWidth: 0,
  transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
  opacity: 1,
  zIndex: 100,
  locked: false,
  visible: true
});

// Ensure header is always on top
editor.bringToFront(headerId);

// Lock the header so it can't be accidentally moved
editor.updateElement(headerId, { locked: true });
```

#### Step 6: Group Related Elements

```typescript
// Group a card's background and title together
const groupId = editor.createGroup([card1.bgId, card1.titleId]);

// Now the group can be moved/transformed as a unit
editor.select(groupId);
editor.moveElement(groupId, 50, 0);

// Ungroup if needed
editor.ungroup(groupId);
```

---

### Tutorial 3: Interactive Canvas Features

Learn how to handle user interactions, implement keyboard shortcuts, and create a responsive editing experience.

#### Step 1: Set Up Event Listeners

```typescript
import { SVGComposer } from 'svg-composer';

const editor = new SVGComposer(document.getElementById('canvas'), {
  width: 1200,
  height: 800
});

// Track all editor events for debugging or UI updates
editor.on('element:added', ({ element }) => {
  console.log('Added:', element.type, element.id);
  updateElementList();
});

editor.on('element:updated', ({ id, element }) => {
  console.log('Updated:', id);
  updatePropertiesPanel(element);
});

editor.on('element:removed', ({ id }) => {
  console.log('Removed:', id);
  updateElementList();
});

editor.on('selection:changed', ({ selectedIds }) => {
  updateToolbar(selectedIds);
  updatePropertiesPanel(selectedIds.length === 1
    ? editor.getElement(selectedIds[0])
    : null);
});

editor.on('tool:changed', ({ tool }) => {
  highlightActiveTool(tool);
});

editor.on('history:changed', ({ canUndo, canRedo }) => {
  document.getElementById('undo-btn').disabled = !canUndo;
  document.getElementById('redo-btn').disabled = !canRedo;
});
```

#### Step 2: Implement Comprehensive Keyboard Shortcuts

```typescript
document.addEventListener('keydown', (e) => {
  const target = e.target as HTMLElement;

  // Don't intercept if user is typing in an input
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;
  const selected = editor.getSelected();

  // Undo/Redo
  if (cmdOrCtrl && e.key === 'z' && !e.shiftKey) {
    e.preventDefault();
    editor.undo();
    return;
  }
  if (cmdOrCtrl && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
    e.preventDefault();
    editor.redo();
    return;
  }

  // Select All
  if (cmdOrCtrl && e.key === 'a') {
    e.preventDefault();
    editor.selectAll();
    return;
  }

  // Copy (save selection for paste)
  if (cmdOrCtrl && e.key === 'c' && selected.length > 0) {
    e.preventDefault();
    window._clipboardElements = selected.map(el => JSON.parse(JSON.stringify(el)));
    return;
  }

  // Paste
  if (cmdOrCtrl && e.key === 'v' && window._clipboardElements) {
    e.preventDefault();
    const newIds = [];
    for (const el of window._clipboardElements) {
      // Offset pasted elements slightly
      el.transform.x += 20;
      el.transform.y += 20;
      delete el.id; // Let editor generate new ID
      const newId = editor.addElement(el);
      newIds.push(newId);
    }
    editor.select(newIds);
    return;
  }

  // Delete
  if ((e.key === 'Delete' || e.key === 'Backspace') && selected.length > 0) {
    e.preventDefault();
    editor.removeElements(selected.map(el => el.id));
    return;
  }

  // Escape - clear selection
  if (e.key === 'Escape') {
    editor.clearSelection();
    return;
  }

  // Arrow keys - nudge selected elements
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && selected.length > 0) {
    e.preventDefault();
    const nudge = e.shiftKey ? 10 : 1; // Shift for larger nudge
    const dx = e.key === 'ArrowRight' ? nudge : e.key === 'ArrowLeft' ? -nudge : 0;
    const dy = e.key === 'ArrowDown' ? nudge : e.key === 'ArrowUp' ? -nudge : 0;

    for (const el of selected) {
      editor.moveElement(el.id, dx, dy);
    }
    return;
  }

  // Tool shortcuts
  if (e.key === 'v' || e.key === 'V') editor.setTool('select');
  if (e.key === 'h' || e.key === 'H') editor.setTool('pan');
  if (e.key === 't' || e.key === 'T') editor.setTool('add-text');
  if (e.key === 'r' || e.key === 'R') editor.setTool('add-shape');

  // Z-order shortcuts
  if (e.key === ']' && cmdOrCtrl && selected.length === 1) {
    e.preventDefault();
    editor.bringToFront(selected[0].id);
  }
  if (e.key === '[' && cmdOrCtrl && selected.length === 1) {
    e.preventDefault();
    editor.sendToBack(selected[0].id);
  }
});
```

#### Step 3: Build a Properties Panel

```typescript
function updatePropertiesPanel(element) {
  const panel = document.getElementById('properties-panel');

  if (!element) {
    panel.innerHTML = '<p>No element selected</p>';
    return;
  }

  panel.innerHTML = `
    <h3>${element.type.charAt(0).toUpperCase() + element.type.slice(1)}</h3>
    <div class="property">
      <label>X Position</label>
      <input type="number" id="prop-x" value="${element.transform.x}">
    </div>
    <div class="property">
      <label>Y Position</label>
      <input type="number" id="prop-y" value="${element.transform.y}">
    </div>
    <div class="property">
      <label>Rotation</label>
      <input type="number" id="prop-rotation" value="${element.transform.rotation}" min="0" max="360">
    </div>
    <div class="property">
      <label>Opacity</label>
      <input type="range" id="prop-opacity" value="${element.opacity}" min="0" max="1" step="0.1">
    </div>
    <div class="property">
      <label>
        <input type="checkbox" id="prop-locked" ${element.locked ? 'checked' : ''}>
        Locked
      </label>
    </div>
  `;

  // Attach event listeners for live updates
  document.getElementById('prop-x').addEventListener('change', (e) => {
    editor.setPosition(element.id, parseFloat(e.target.value), element.transform.y);
  });

  document.getElementById('prop-y').addEventListener('change', (e) => {
    editor.setPosition(element.id, element.transform.x, parseFloat(e.target.value));
  });

  document.getElementById('prop-rotation').addEventListener('change', (e) => {
    const currentRotation = element.transform.rotation;
    const newRotation = parseFloat(e.target.value);
    editor.rotateElement(element.id, newRotation - currentRotation);
  });

  document.getElementById('prop-opacity').addEventListener('input', (e) => {
    editor.updateElement(element.id, { opacity: parseFloat(e.target.value) });
  });

  document.getElementById('prop-locked').addEventListener('change', (e) => {
    editor.updateElement(element.id, { locked: e.target.checked });
  });
}
```

#### Step 4: Handle Canvas Click Events

```typescript
editor.on('canvas:clicked', ({ x, y, element }) => {
  if (element) {
    // Show context menu for element
    showContextMenu(x, y, element);
  } else {
    // Clicked on empty canvas - could add element at position
    hideContextMenu();
  }
});

function showContextMenu(x, y, element) {
  const menu = document.getElementById('context-menu');
  menu.style.display = 'block';
  menu.style.left = `${x}px`;
  menu.style.top = `${y}px`;

  menu.innerHTML = `
    <button onclick="editor.bringToFront('${element.id}')">Bring to Front</button>
    <button onclick="editor.sendToBack('${element.id}')">Send to Back</button>
    <hr>
    <button onclick="duplicateElement('${element.id}')">Duplicate</button>
    <button onclick="editor.removeElement('${element.id}')">Delete</button>
  `;
}

function duplicateElement(id) {
  const element = editor.getElement(id);
  if (!element) return;

  const copy = JSON.parse(JSON.stringify(element));
  copy.transform.x += 20;
  copy.transform.y += 20;
  delete copy.id;

  const newId = editor.addElement(copy);
  editor.select(newId);
}
```

#### Step 5: Responsive Canvas Handling

```typescript
// Handle container resize
const container = document.getElementById('canvas-container');
const resizeObserver = new ResizeObserver((entries) => {
  for (const entry of entries) {
    const { width, height } = entry.contentRect;
    // The SVG viewBox stays the same, but the display size adjusts
    console.log(`Container resized to ${width}x${height}`);
  }
});
resizeObserver.observe(container);

// Clean up
function cleanup() {
  resizeObserver.disconnect();
  editor.destroy();
}
```

---

## Patterns & Recipes

Quick copy-paste solutions for common tasks.

### Recipe: Center Element on Canvas

```typescript
// Center a single element on the canvas
function centerOnCanvas(elementId: string) {
  editor.select(elementId);
  editor.alignCenter(undefined, { relativeTo: 'canvas' });
  editor.clearSelection();
}
```

### Recipe: Create a Polaroid Effect

```typescript
import { dropShadow } from 'svg-composer';

function createPolaroid(imageSrc: string, caption: string) {
  // White background (polaroid frame)
  const frameId = editor.addElement({
    type: 'shape',
    shapeType: 'rect',
    width: 320,
    height: 380,
    fill: '#ffffff',
    stroke: '#e0e0e0',
    strokeWidth: 1,
    transform: { x: 100, y: 100, rotation: 0, scaleX: 1, scaleY: 1 },
    opacity: 1, zIndex: 0, locked: false, visible: true
  });

  // The photo
  const photoId = editor.addElement({
    type: 'image',
    src: imageSrc,
    width: 280,
    height: 280,
    transform: { x: 120, y: 120, rotation: 0, scaleX: 1, scaleY: 1 },
    opacity: 1, zIndex: 1, locked: false, visible: true
  });

  // Caption text
  const captionId = editor.addElement({
    type: 'text',
    content: caption,
    fontSize: 18,
    fontFamily: "'Permanent Marker', cursive",
    fill: '#333333',
    textAnchor: 'middle',
    transform: { x: 260, y: 440, rotation: -3, scaleX: 1, scaleY: 1 },
    opacity: 1, zIndex: 2, locked: false, visible: true
  });

  // Add shadow to frame
  editor.addEffect(frameId, dropShadow({
    offsetX: 4,
    offsetY: 6,
    blur: 12,
    color: 'rgba(0,0,0,0.3)'
  }));

  return { frameId, photoId, captionId };
}
```

### Recipe: Add Watermark

```typescript
function addWatermark(text: string) {
  const watermarkId = editor.addElement({
    type: 'text',
    content: text,
    fontSize: 48,
    fontFamily: 'Arial, sans-serif',
    fill: '#000000',
    textAnchor: 'middle',
    transform: { x: 600, y: 450, rotation: -30, scaleX: 1, scaleY: 1 },
    opacity: 0.15, // Very transparent
    zIndex: 9999,  // Always on top
    locked: true,  // Prevent accidental edits
    visible: true
  });

  editor.bringToFront(watermarkId);
  return watermarkId;
}
```

### Recipe: Create Grid Layout

```typescript
function createGrid(columns: number, rows: number, cellWidth: number, cellHeight: number, gap: number) {
  const elements: string[] = [];
  const startX = 50;
  const startY = 50;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      const x = startX + col * (cellWidth + gap);
      const y = startY + row * (cellHeight + gap);

      const id = editor.addElement({
        type: 'shape',
        shapeType: 'rect',
        width: cellWidth,
        height: cellHeight,
        rx: 4,
        fill: '#f0f0f0',
        stroke: '#cccccc',
        strokeWidth: 1,
        transform: { x, y, rotation: 0, scaleX: 1, scaleY: 1 },
        opacity: 1, zIndex: 0, locked: false, visible: true
      });

      elements.push(id);
    }
  }

  return elements;
}

// Create a 3x3 grid
const gridCells = createGrid(3, 3, 200, 150, 20);
```

### Recipe: Apply Vintage Photo Effect

```typescript
import { sepia, brightnessContrast } from 'svg-composer';

function applyVintageEffect(elementId: string) {
  // First apply sepia tone
  editor.addEffect(elementId, sepia(0.6));

  // Then adjust brightness and contrast for that faded look
  editor.addEffect(elementId, brightnessContrast({
    brightness: 1.1,
    contrast: 0.9
  }));
}
```

### Recipe: Export as PNG (Using Canvas)

```typescript
async function exportAsPng(filename = 'canvas.png', scale = 2) {
  const svg = editor.toSVG();
  const blob = new Blob([svg], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;

      const ctx = canvas.getContext('2d');
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0);

      canvas.toBlob((pngBlob) => {
        const pngUrl = URL.createObjectURL(pngBlob);
        const a = document.createElement('a');
        a.href = pngUrl;
        a.download = filename;
        a.click();

        URL.revokeObjectURL(url);
        URL.revokeObjectURL(pngUrl);
        resolve();
      }, 'image/png');
    };
    img.onerror = reject;
    img.src = url;
  });
}
```

### Recipe: Auto-Save Implementation

```typescript
let saveTimeout: number | null = null;
const AUTOSAVE_DELAY = 2000; // 2 seconds after last change

editor.on('state:changed', () => {
  // Clear existing timeout
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }

  // Set new timeout for auto-save
  saveTimeout = setTimeout(() => {
    const json = editor.toJSON();
    localStorage.setItem('autosave', json);
    console.log('Auto-saved at', new Date().toLocaleTimeString());
  }, AUTOSAVE_DELAY);
});

// Restore on page load
function restoreAutoSave() {
  const saved = localStorage.getItem('autosave');
  if (saved) {
    const restore = confirm('Found auto-saved work. Restore?');
    if (restore) {
      editor.fromJSON(saved);
    }
  }
}

restoreAutoSave();
```

### Recipe: Undo/Redo Buttons with State

```typescript
function setupUndoRedoButtons() {
  const undoBtn = document.getElementById('undo');
  const redoBtn = document.getElementById('redo');

  // Initial state
  undoBtn.disabled = !editor.canUndo();
  redoBtn.disabled = !editor.canRedo();

  // Update on history changes
  editor.on('history:changed', ({ canUndo, canRedo }) => {
    undoBtn.disabled = !canUndo;
    redoBtn.disabled = !canRedo;

    // Optional: show history count
    const historySize = editor.getHistorySize();
    undoBtn.title = `Undo (${historySize} steps available)`;
  });

  // Button handlers
  undoBtn.addEventListener('click', () => editor.undo());
  redoBtn.addEventListener('click', () => editor.redo());
}
```

### Recipe: Batch Update Multiple Elements

```typescript
// Apply the same transform to multiple elements efficiently
function batchTransform(elementIds: string[], transform: Partial<Transform>) {
  for (const id of elementIds) {
    const element = editor.getElement(id);
    if (element) {
      editor.updateElement(id, {
        transform: { ...element.transform, ...transform }
      });
    }
  }
}

// Example: rotate all selected elements by 15 degrees
const selected = editor.getSelected();
batchTransform(selected.map(el => el.id), { rotation: 15 });
```

### Recipe: Toggle Element Visibility

```typescript
function toggleVisibility(elementId: string): boolean {
  const element = editor.getElement(elementId);
  if (!element) return false;

  const newVisibility = !element.visible;
  editor.updateElement(elementId, { visible: newVisibility });
  return newVisibility;
}

// Toggle visibility of all selected elements
function toggleSelectedVisibility() {
  const selected = editor.getSelected();
  for (const el of selected) {
    toggleVisibility(el.id);
  }
}
```

---

## SVG Output

The library produces clean, standard SVG markup:

```xml
<svg xmlns="http://www.w3.org/2000/svg"
     viewBox="0 0 1200 1200"
     width="1200"
     height="1200">
  <defs>
    <clipPath id="clip-abc123">
      <circle cx="200" cy="150" r="100"/>
    </clipPath>
    <filter id="filter-def456" x="-50%" y="-50%" width="200%" height="200%">
      <feDropShadow dx="4" dy="4" stdDeviation="8" flood-color="#000000" flood-opacity="0.5"/>
    </filter>
    <filter id="filter-ghi789" x="-50%" y="-50%" width="200%" height="200%">
      <feColorMatrix type="saturate" values="0"/>
    </filter>
  </defs>
  <rect width="1200" height="1200" fill="#ffffff"/>
  <image href="photo.jpg"
         width="400" height="300"
         transform="translate(100, 150) rotate(15) scale(1, 1)"
         clip-path="url(#clip-abc123)"
         filter="url(#filter-def456)"/>
  <text transform="translate(600, 50)"
        font-size="48"
        font-family="Georgia, serif"
        fill="#333333"
        text-anchor="middle"
        filter="url(#filter-ghi789)">Summer 2024</text>
</svg>
```

---

## Building

### Prerequisites

- Node.js 20+
- npm 9+

### Development

```bash
# Install dependencies
npm install

# Start development server with hot reload
npm run dev

# Run in watch mode
npm run dev:watch
```

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

**Coverage Requirements:** All pull requests must maintain >80% test coverage.

#### Test Organization

The test suite includes both unit tests and integration tests:

| Category          | Files | Description                                      |
| ----------------- | ----- | ------------------------------------------------ |
| Unit Tests        | 31    | Test individual modules in isolation             |
| Integration Tests | 9     | Test complete workflows and SVG rendering output |

**Integration tests cover:**

- Element rendering (image, text, shape, group)
- Transform rendering (translate, rotate, scale)
- Clip path rendering (rect, circle, ellipse)
- Filter rendering (blur, shadows, color effects)
- JSON serialization/deserialization roundtrip
- Guides and snapping
- Alignment and distribution operations
- Complete editor workflows

### Production Build

```bash
# Build for production (UMD + ESM bundles)
npm run build

# Build with source maps
npm run build:debug
```

### Output

```
dist/
├── svg-composer.js         # UMD bundle
├── svg-composer.min.js     # UMD minified
├── svg-composer.esm.js     # ES Module bundle
├── svg-composer.d.ts       # TypeScript declarations
└── svg-composer.js.map     # Source maps
```

---

## Contributing

We welcome contributions! Please read this section before submitting a pull request.

### Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/svg-composer.git`
3. Install dependencies: `npm install`
4. Create a feature branch: `git checkout -b feature/your-feature`
5. Make your changes
6. Run tests: `npm test`
7. Commit with a descriptive message
8. Push and create a pull request

### Pull Request Requirements

- [ ] Tests pass (`npm test`)
- [ ] Coverage remains >80% (`npm run test:coverage`)
- [ ] Linting passes (`npm run lint`)
- [ ] TypeScript compiles without errors (`npm run typecheck`)
- [ ] Commit messages follow conventional format
- [ ] Documentation updated if API changed

### What to Contribute

All planned features have been implemented. Here are areas where contributions are welcome:

#### Documentation

- **Examples** — Add more usage examples and tutorials
- **API Documentation** — Improve JSDoc comments and type documentation

#### Features

- **Additional Filter Effects** — New visual effects and presets
- **Performance Optimizations** — Rendering and state management improvements
- **Accessibility** — Improve keyboard navigation and screen reader support

#### Testing

- **Edge Cases** — Add tests for edge cases and error conditions
- **Performance Tests** — Add benchmarks for large canvases

Open an issue to discuss your approach before starting large features.

---

## Coding Standards

### TypeScript

- Strict mode enabled
- Explicit return types on public methods
- Interfaces over type aliases for object shapes
- No `any` — use `unknown` with type guards when needed

```typescript
// Good
function getElement(id: string): BaseElement | undefined {
  return this.elements.get(id);
}

// Avoid
function getElement(id: string): any {
  return this.elements.get(id);
}
```

### Naming Conventions

- **Files:** `PascalCase.ts` for classes, `camelCase.ts` for utilities
- **Classes:** `PascalCase`
- **Interfaces:** `PascalCase` (no `I` prefix)
- **Functions/Methods:** `camelCase`
- **Constants:** `UPPER_SNAKE_CASE`
- **Private members:** prefix with `_` or use `#` private fields

### Code Style

- 2 space indentation
- Single quotes for strings
- Semicolons required
- Max line length: 100 characters
- Trailing commas in multiline

Run `npm run lint` to check and `npm run lint:fix` to auto-fix.

### Documentation

- JSDoc comments on all public APIs
- Include `@param`, `@returns`, and `@example` where helpful

````typescript
/**
 * Adds an element to the canvas.
 *
 * @param element - Element properties (id will be auto-generated)
 * @returns The generated element ID
 *
 * @example
 * ```typescript
 * const id = editor.addElement({
 *   type: 'text',
 *   content: 'Hello',
 *   // ...
 * });
 * ```
 */
addElement(element: Omit<BaseElement, 'id'>): string;
````

### Testing

- Test file location: `tests/` directory mirroring `src/` structure
- Test file naming: `*.test.ts`
- Use descriptive test names: `it('should return undefined for non-existent element')`
- Test both success and failure cases
- Mock DOM operations, don't rely on real browser

```typescript
describe('SVGComposer', () => {
  describe('addElement', () => {
    it('should generate a unique ID for the element', () => {
      // ...
    });

    it('should emit element:added event', () => {
      // ...
    });

    it('should add element to canvas state', () => {
      // ...
    });
  });
});
```

### Commits

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add circular clip path support
fix: correct rotation origin calculation
docs: update README with clip path examples
test: add SVGRenderer unit tests
refactor: extract transform utilities
chore: update dev dependencies
```

---

## Project Structure

```
svg-composer/
├── src/
│   ├── core/
│   │   ├── SVGComposer.ts      # Main editor class
│   │   ├── State.ts            # CanvasState management
│   │   ├── History.ts          # Undo/redo system
│   │   ├── EventEmitter.ts     # Event system
│   │   └── types.ts            # Core type definitions
│   ├── elements/
│   │   └── types.ts            # Element type definitions
│   ├── filters/
│   │   ├── types.ts            # Filter type definitions
│   │   ├── FilterManager.ts    # Filter definition management
│   │   ├── EffectPresets.ts    # Effect preset utilities
│   │   └── index.ts            # Filter module exports
│   ├── rendering/
│   │   ├── SVGRenderer.ts      # State to SVG DOM (transforms, clip paths)
│   │   ├── types.ts            # Rendering types
│   │   └── index.ts            # Module exports
│   ├── interaction/
│   │   ├── InteractionManager.ts      # Input handling
│   │   ├── SelectionHandleRenderer.ts # Resize/rotate handles
│   │   ├── HitTester.ts               # Hit testing
│   │   ├── CoordinateTransformer.ts   # Coordinate conversion
│   │   ├── SnappingManager.ts         # Snapping system
│   │   ├── types.ts                   # Interaction types
│   │   ├── index.ts                   # Module exports
│   │   ├── tools/
│   │   │   ├── BaseTool.ts            # Base tool class
│   │   │   ├── SelectTool.ts          # Selection tool
│   │   │   ├── PanTool.ts             # Pan tool
│   │   │   ├── AddImageTool.ts        # Add image tool
│   │   │   ├── AddTextTool.ts         # Add text tool
│   │   │   ├── AddShapeTool.ts        # Add shape tool
│   │   │   └── index.ts
│   │   └── utils/
│   │       ├── zoomUtils.ts           # Zoom utilities
│   │       └── index.ts
│   ├── utils/
│   │   ├── AlignmentUtils.ts   # Alignment and distribution
│   │   ├── ColorUtils.ts       # Color parsing and conversion
│   │   ├── IdGenerator.ts      # UUID generation
│   │   ├── LRUCache.ts         # Generic LRU cache with eviction
│   │   └── PathParser.ts       # SVG path parsing and bounds
│   └── index.ts                # Public exports
├── tests/
│   ├── setup.ts                   # Test setup (polyfills, cleanup)
│   ├── unit/
│   │   ├── SVGComposer.test.ts
│   │   ├── State.test.ts
│   │   ├── History.test.ts
│   │   ├── EventEmitter.test.ts
│   │   ├── LRUCache.test.ts
│   │   ├── ColorUtils.test.ts
│   │   ├── PathParser.test.ts
│   │   ├── AlignmentUtils.test.ts
│   │   ├── IdGenerator.test.ts
│   │   ├── filters/
│   │   │   ├── FilterManager.test.ts
│   │   │   ├── EffectPresets.test.ts
│   │   │   ├── CompositeFilter.test.ts
│   │   │   ├── FilterSerialization.test.ts
│   │   │   ├── FilterEdgeCases.test.ts
│   │   │   └── SVGComposerFilters.test.ts
│   │   ├── rendering/
│   │   │   ├── SVGRenderer.test.ts
│   │   │   └── SVGRendererFilters.test.ts
│   │   └── interaction/
│   │       ├── InteractionManager.test.ts
│   │       ├── SelectTool.test.ts
│   │       ├── PanTool.test.ts
│   │       ├── AddImageTool.test.ts
│   │       ├── AddTextTool.test.ts
│   │       ├── AddShapeTool.test.ts
│   │       ├── BaseTool.test.ts
│   │       ├── HitTester.test.ts
│   │       ├── CoordinateTransformer.test.ts
│   │       ├── SnappingManager.test.ts
│   │       ├── SelectionHandleRenderer.test.ts
│   │       └── zoomUtils.test.ts
│   └── integration/
│       ├── Serialization.test.ts
│       ├── AlignmentDistribution.test.ts
│       ├── EditorWorkflow.test.ts
│       ├── filters/
│       │   ├── FilterRendering.test.ts
│       │   └── MultiFilterRendering.test.ts
│       └── rendering/
│           ├── ElementRendering.test.ts
│           ├── TransformRendering.test.ts
│           ├── ClipPathRendering.test.ts
│           └── GuidesRendering.test.ts
├── examples/
│   └── demo.html               # Interactive demo
├── package.json
├── tsconfig.json
├── vite.config.ts
├── vitest.config.ts
└── README.md
```

---

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

---

## License

MIT © ParticleSector

See [LICENSE](LICENSE) for details.

---

## Acknowledgments

This project is community-driven. Thank you to all contributors who help make SVG Composer better.
