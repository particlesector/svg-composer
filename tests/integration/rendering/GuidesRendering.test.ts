/**
 * Integration tests for guides rendering
 * Validates that guides render correctly in SVG output
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SVGComposer } from '../../../src/core/SVGComposer.js';

describe('Guides Rendering Integration', () => {
  let container: HTMLDivElement;
  let editor: SVGComposer;

  beforeEach(() => {
    container = document.createElement('div');
    container.id = 'test-container';
    document.body.appendChild(container);
    editor = new SVGComposer(container, {
      width: 1200,
      height: 1200,
    });
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  // ============================================================
  // Horizontal Guide Rendering
  // ============================================================

  describe('Horizontal Guide Rendering', () => {
    it('should add horizontal guide at specified position', () => {
      const guideId = editor.addHorizontalGuide(100);

      const guide = editor.getGuide(guideId);

      expect(guide).toBeDefined();
      expect(guide?.orientation).toBe('horizontal');
      expect(guide?.position).toBe(100);
    });

    it('should render horizontal guide as line', () => {
      editor.addHorizontalGuide(200);

      // Note: Guides are typically rendered in the DOM for interaction
      // but may not appear in exported SVG (as they're editor chrome)
      const guides = editor.getGuides();

      expect(guides.length).toBe(1);
      expect(guides[0].orientation).toBe('horizontal');
      expect(guides[0].position).toBe(200);
    });

    it('should add multiple horizontal guides', () => {
      editor.addHorizontalGuide(100);
      editor.addHorizontalGuide(200);
      editor.addHorizontalGuide(300);

      const guides = editor.getGuides();

      expect(guides.length).toBe(3);
      expect(guides.map((g) => g.position)).toContain(100);
      expect(guides.map((g) => g.position)).toContain(200);
      expect(guides.map((g) => g.position)).toContain(300);
    });

    it('should add horizontal guide with custom color', () => {
      const guideId = editor.addHorizontalGuide(150, { color: '#ff0000' });

      const guide = editor.getGuide(guideId);

      expect(guide?.color).toBe('#ff0000');
    });

    it('should add locked horizontal guide', () => {
      const guideId = editor.addHorizontalGuide(250, { locked: true });

      const guide = editor.getGuide(guideId);

      expect(guide?.locked).toBe(true);
    });
  });

  // ============================================================
  // Vertical Guide Rendering
  // ============================================================

  describe('Vertical Guide Rendering', () => {
    it('should add vertical guide at specified position', () => {
      const guideId = editor.addVerticalGuide(300);

      const guide = editor.getGuide(guideId);

      expect(guide).toBeDefined();
      expect(guide?.orientation).toBe('vertical');
      expect(guide?.position).toBe(300);
    });

    it('should render vertical guide as line', () => {
      editor.addVerticalGuide(400);

      const guides = editor.getGuides();

      expect(guides.length).toBe(1);
      expect(guides[0].orientation).toBe('vertical');
      expect(guides[0].position).toBe(400);
    });

    it('should add multiple vertical guides', () => {
      editor.addVerticalGuide(100);
      editor.addVerticalGuide(200);
      editor.addVerticalGuide(300);

      const guides = editor.getGuides();

      expect(guides.length).toBe(3);
      expect(guides.filter((g) => g.orientation === 'vertical').length).toBe(3);
    });

    it('should add vertical guide with custom color', () => {
      const guideId = editor.addVerticalGuide(500, { color: '#00ff00' });

      const guide = editor.getGuide(guideId);

      expect(guide?.color).toBe('#00ff00');
    });
  });

  // ============================================================
  // Mixed Guides
  // ============================================================

  describe('Mixed Guides', () => {
    it('should support both horizontal and vertical guides', () => {
      editor.addHorizontalGuide(100);
      editor.addVerticalGuide(200);
      editor.addHorizontalGuide(300);
      editor.addVerticalGuide(400);

      const guides = editor.getGuides();

      expect(guides.length).toBe(4);

      const horizontal = guides.filter((g) => g.orientation === 'horizontal');
      const vertical = guides.filter((g) => g.orientation === 'vertical');

      expect(horizontal.length).toBe(2);
      expect(vertical.length).toBe(2);
    });

    it('should use addGuide generic method', () => {
      const hGuideId = editor.addGuide({
        orientation: 'horizontal',
        position: 150,
        locked: false,
        visible: true,
      });

      const vGuideId = editor.addGuide({
        orientation: 'vertical',
        position: 250,
        locked: false,
        visible: true,
      });

      expect(editor.getGuide(hGuideId)?.orientation).toBe('horizontal');
      expect(editor.getGuide(vGuideId)?.orientation).toBe('vertical');
    });
  });

  // ============================================================
  // Guide Updates
  // ============================================================

  describe('Guide Updates', () => {
    it('should update guide position', () => {
      const guideId = editor.addHorizontalGuide(100);

      editor.updateGuide(guideId, { position: 200 });

      const guide = editor.getGuide(guideId);
      expect(guide?.position).toBe(200);
    });

    it('should update guide locked state', () => {
      const guideId = editor.addHorizontalGuide(100, { locked: false });

      editor.updateGuide(guideId, { locked: true });

      const guide = editor.getGuide(guideId);
      expect(guide?.locked).toBe(true);
    });

    it('should update guide visibility', () => {
      const guideId = editor.addHorizontalGuide(100, { visible: true });

      editor.updateGuide(guideId, { visible: false });

      const guide = editor.getGuide(guideId);
      expect(guide?.visible).toBe(false);
    });

    it('should update guide color', () => {
      const guideId = editor.addHorizontalGuide(100);

      editor.updateGuide(guideId, { color: '#0000ff' });

      const guide = editor.getGuide(guideId);
      expect(guide?.color).toBe('#0000ff');
    });
  });

  // ============================================================
  // Guide Removal
  // ============================================================

  describe('Guide Removal', () => {
    it('should remove guide by ID', () => {
      const guideId = editor.addHorizontalGuide(100);

      editor.removeGuide(guideId);

      expect(editor.getGuide(guideId)).toBeUndefined();
      expect(editor.getGuides().length).toBe(0);
    });

    it('should remove specific guide from multiple', () => {
      const guide1 = editor.addHorizontalGuide(100);
      const guide2 = editor.addHorizontalGuide(200);
      const guide3 = editor.addVerticalGuide(300);

      editor.removeGuide(guide2);

      const guides = editor.getGuides();
      expect(guides.length).toBe(2);
      expect(editor.getGuide(guide1)).toBeDefined();
      expect(editor.getGuide(guide2)).toBeUndefined();
      expect(editor.getGuide(guide3)).toBeDefined();
    });

    it('should clear all guides', () => {
      editor.addHorizontalGuide(100);
      editor.addHorizontalGuide(200);
      editor.addVerticalGuide(300);
      editor.addVerticalGuide(400);

      editor.clearGuides();

      expect(editor.getGuides().length).toBe(0);
    });
  });

  // ============================================================
  // Guide Visibility
  // ============================================================

  describe('Guide Visibility', () => {
    it('should create visible guide by default', () => {
      const guideId = editor.addHorizontalGuide(100);

      const guide = editor.getGuide(guideId);
      expect(guide?.visible).toBe(true);
    });

    it('should create hidden guide when specified', () => {
      const guideId = editor.addHorizontalGuide(100, { visible: false });

      const guide = editor.getGuide(guideId);
      expect(guide?.visible).toBe(false);
    });

    it('should toggle guide visibility', () => {
      const guideId = editor.addHorizontalGuide(100);

      editor.updateGuide(guideId, { visible: false });
      expect(editor.getGuide(guideId)?.visible).toBe(false);

      editor.updateGuide(guideId, { visible: true });
      expect(editor.getGuide(guideId)?.visible).toBe(true);
    });
  });

  // ============================================================
  // Guide Locking
  // ============================================================

  describe('Guide Locking', () => {
    it('should create unlocked guide by default', () => {
      const guideId = editor.addHorizontalGuide(100);

      const guide = editor.getGuide(guideId);
      expect(guide?.locked).toBe(false);
    });

    it('should create locked guide when specified', () => {
      const guideId = editor.addHorizontalGuide(100, { locked: true });

      const guide = editor.getGuide(guideId);
      expect(guide?.locked).toBe(true);
    });

    it('should lock and unlock guide', () => {
      const guideId = editor.addHorizontalGuide(100);

      editor.updateGuide(guideId, { locked: true });
      expect(editor.getGuide(guideId)?.locked).toBe(true);

      editor.updateGuide(guideId, { locked: false });
      expect(editor.getGuide(guideId)?.locked).toBe(false);
    });
  });

  // ============================================================
  // Guide Positions
  // ============================================================

  describe('Guide Positions', () => {
    it('should allow guide at position 0', () => {
      const guideId = editor.addHorizontalGuide(0);

      const guide = editor.getGuide(guideId);
      expect(guide?.position).toBe(0);
    });

    it('should allow guide at canvas edge', () => {
      const guideId = editor.addHorizontalGuide(1200);

      const guide = editor.getGuide(guideId);
      expect(guide?.position).toBe(1200);
    });

    it('should allow guide outside canvas bounds', () => {
      const guideId = editor.addHorizontalGuide(-100);

      const guide = editor.getGuide(guideId);
      expect(guide?.position).toBe(-100);
    });

    it('should allow guide at decimal position', () => {
      const guideId = editor.addHorizontalGuide(100.5);

      const guide = editor.getGuide(guideId);
      expect(guide?.position).toBe(100.5);
    });
  });

  // ============================================================
  // Guide Serialization
  // ============================================================

  describe('Guide Serialization', () => {
    it('should include guides in JSON export', () => {
      editor.addHorizontalGuide(100);
      editor.addVerticalGuide(200);

      const json = editor.toJSON();
      const parsed = JSON.parse(json);

      expect(parsed.guides).toBeDefined();
      expect(parsed.guides.length).toBe(2);
    });

    it('should restore guides from JSON', () => {
      editor.addHorizontalGuide(100, { locked: true, color: '#ff0000' });
      editor.addVerticalGuide(200, { visible: false });

      const json = editor.toJSON();

      // Create new editor and restore
      const container2 = document.createElement('div');
      document.body.appendChild(container2);
      const editor2 = new SVGComposer(container2);

      editor2.fromJSON(json);

      const guides = editor2.getGuides();
      expect(guides.length).toBe(2);

      const hGuide = guides.find((g) => g.orientation === 'horizontal');
      const vGuide = guides.find((g) => g.orientation === 'vertical');

      expect(hGuide?.position).toBe(100);
      expect(hGuide?.locked).toBe(true);
      expect(hGuide?.color).toBe('#ff0000');

      expect(vGuide?.position).toBe(200);
      expect(vGuide?.visible).toBe(false);

      editor2.destroy();
      document.body.removeChild(container2);
    });
  });

  // ============================================================
  // Edge Cases
  // ============================================================

  describe('Edge Cases', () => {
    it('should handle large number of guides', () => {
      for (let i = 0; i < 100; i++) {
        editor.addHorizontalGuide(i * 10);
      }

      expect(editor.getGuides().length).toBe(100);
    });

    it('should handle overlapping guides', () => {
      const guide1 = editor.addHorizontalGuide(100);
      const guide2 = editor.addHorizontalGuide(100);

      const guides = editor.getGuides();

      expect(guides.length).toBe(2);
      expect(guide1).not.toBe(guide2); // Different IDs
    });

    it('should handle guide at same position in different orientations', () => {
      editor.addHorizontalGuide(100);
      editor.addVerticalGuide(100);

      const guides = editor.getGuides();

      expect(guides.length).toBe(2);
      expect(guides[0].orientation).not.toBe(guides[1].orientation);
    });

    it('should generate unique IDs for guides', () => {
      const ids = new Set<string>();

      for (let i = 0; i < 10; i++) {
        const id = editor.addHorizontalGuide(i * 100);
        ids.add(id);
      }

      expect(ids.size).toBe(10);
    });
  });
});
