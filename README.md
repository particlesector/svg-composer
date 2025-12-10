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
  height: 1200
});

// Add an image
const imageId = editor.addElement({
  type: 'image',
  src: 'https://example.com/photo.jpg',
  width: 400,
  height: 300,
  transform: { x: 100, y: 100, rotation: 0, scaleX: 1, scaleY: 1 }
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
  x: number;  // viewBox units
  y: number;  // viewBox units
}

interface Transform {
  x: number;        // position X in viewBox units
  y: number;        // position Y in viewBox units
  rotation: number; // degrees (0-360)
  scaleX: number;   // scale factor (1.0 = 100%)
  scaleY: number;   // scale factor (1.0 = 100%)
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
  id: string;                                      // UUID, auto-generated
  type: 'image' | 'text' | 'shape' | 'group';
  transform: Transform;
  opacity: number;                                 // 0.0 to 1.0
  zIndex: number;                                  // stacking order
  locked: boolean;                                 // prevent editing
  visible: boolean;                                // show/hide
}
```

#### ImageElement

```typescript
interface ImageElement extends BaseElement {
  type: 'image';
  src: string;                    // asset URL
  width: number;                  // original width in viewBox units
  height: number;                 // original height in viewBox units
  clipPath?: string;              // optional clip-path ID reference
}
```

#### TextElement

```typescript
interface TextElement extends BaseElement {
  type: 'text';
  content: string;
  fontSize: number;               // viewBox units
  fontFamily: string;             // CSS font family
  fill: string;                   // CSS color string
  textAnchor: 'start' | 'middle' | 'end';
}
```

#### ShapeElement

```typescript
interface ShapeElement extends BaseElement {
  type: 'shape';
  shapeType: 'rect' | 'circle' | 'ellipse' | 'path';
  fill: string;                   // CSS color string
  stroke: string;                 // CSS color string
  strokeWidth: number;            // viewBox units
  
  // Rectangle specific
  width?: number;
  height?: number;
  rx?: number;                    // border radius
  
  // Circle specific
  r?: number;                     // radius
  
  // Ellipse specific
  rx?: number;                    // X radius
  ry?: number;                    // Y radius
  
  // Path specific
  path?: string;                  // SVG path data
}
```

#### GroupElement

```typescript
interface GroupElement extends BaseElement {
  type: 'group';
  children: string[];             // array of element IDs
}
```

### Canvas State

```typescript
interface CanvasState {
  width: number;                          // viewBox width
  height: number;                         // viewBox height
  backgroundColor: string;                // CSS color
  elements: Map<string, BaseElement>;     // all elements
  selectedIds: Set<string>;               // current selection
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
  'error': { message: string; details?: unknown };
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
  visible: true
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
  visible: true
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
  visible: true
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
  r: 100
});

// Rectangular crop with rounded corners
editor.addClipPath(imageId, {
  type: 'rect',
  x: 50,
  y: 50,
  width: 300,
  height: 200,
  rx: 20
});

// Remove clip
editor.removeClipPath(imageId);
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
  </defs>
  <rect width="1200" height="1200" fill="#ffffff"/>
  <image href="photo.jpg" 
         width="400" height="300"
         transform="translate(100, 150) rotate(15) scale(1, 1)"
         clip-path="url(#clip-abc123)"/>
  <text transform="translate(600, 50)"
        font-size="48"
        font-family="Georgia, serif"
        fill="#333333"
        text-anchor="middle">Summer 2024</text>
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

This is a spec-driven project. Each feature in this README represents functionality to be implemented. Pick an area that interests you:

- **Core Classes** — `SVGComposer`, state management, history system
- **Rendering** — `SVGRenderer`, DOM updates, transform application
- **Interaction** — Mouse/touch handling, selection, drag operations
- **Elements** — Image, text, shape, group implementations
- **Clipping** — Clip path system
- **Export/Import** — SVG generation, JSON serialization
- **Testing** — Unit tests, integration tests, DOM tests

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

```typescript
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
```

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
│   │   └── EventEmitter.ts     # Event system
│   ├── elements/
│   │   ├── BaseElement.ts      # Element interfaces
│   │   ├── ImageElement.ts     # Image-specific logic
│   │   ├── TextElement.ts      # Text-specific logic
│   │   ├── ShapeElement.ts     # Shape-specific logic
│   │   └── GroupElement.ts     # Group logic
│   ├── rendering/
│   │   ├── SVGRenderer.ts      # State to SVG DOM
│   │   ├── TransformUtils.ts   # Transform math
│   │   └── ClipPathManager.ts  # Clipping system
│   ├── interaction/
│   │   ├── InteractionManager.ts   # Input handling
│   │   ├── SelectionTool.ts        # Selection logic
│   │   ├── TransformHandles.ts     # Resize/rotate handles
│   │   └── Tools.ts                # Tool definitions
│   ├── utils/
│   │   ├── BoundingBox.ts      # Bounding box utilities
│   │   ├── GeometryUtils.ts    # Math helpers
│   │   └── IdGenerator.ts      # UUID generation
│   └── index.ts                # Public exports
├── tests/
│   ├── unit/
│   │   ├── SVGComposer.test.ts
│   │   ├── State.test.ts
│   │   ├── History.test.ts
│   │   └── TransformUtils.test.ts
│   └── integration/
│       ├── Rendering.test.ts
│       └── Interaction.test.ts
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

MIT © [Your Name]

See [LICENSE](LICENSE) for details.

---

## Acknowledgments

This project is community-driven. Thank you to all contributors who help make SVG Composer better.
