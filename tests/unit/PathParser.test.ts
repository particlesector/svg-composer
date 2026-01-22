/**
 * Unit tests for PathParser utility
 */

import { describe, it, expect } from 'vitest';
import { parsePath, getPathBoundingBox } from '../../src/utils/PathParser.js';

describe('PathParser', () => {
  describe('parsePath', () => {
    it('should return empty array for empty string', () => {
      expect(parsePath('')).toEqual([]);
    });

    it('should return empty array for whitespace only', () => {
      expect(parsePath('   ')).toEqual([]);
    });

    it('should parse simple MoveTo command', () => {
      const commands = parsePath('M 10 20');
      expect(commands).toHaveLength(1);
      expect(commands[0]).toEqual({ type: 'M', params: [10, 20] });
    });

    it('should parse MoveTo with multiple coordinate pairs', () => {
      const commands = parsePath('M 10 20 30 40');
      expect(commands).toHaveLength(1);
      expect(commands[0]).toEqual({ type: 'M', params: [10, 20, 30, 40] });
    });

    it('should parse relative moveto', () => {
      const commands = parsePath('m 10 20');
      expect(commands).toHaveLength(1);
      expect(commands[0]).toEqual({ type: 'm', params: [10, 20] });
    });

    it('should parse LineTo command', () => {
      const commands = parsePath('M 0 0 L 100 200');
      expect(commands).toHaveLength(2);
      expect(commands[1]).toEqual({ type: 'L', params: [100, 200] });
    });

    it('should parse multiple LineTo coordinates', () => {
      const commands = parsePath('L 10 20 30 40 50 60');
      expect(commands[0]).toEqual({ type: 'L', params: [10, 20, 30, 40, 50, 60] });
    });

    it('should parse Horizontal line command', () => {
      const commands = parsePath('H 100');
      expect(commands[0]).toEqual({ type: 'H', params: [100] });
    });

    it('should parse Vertical line command', () => {
      const commands = parsePath('V 200');
      expect(commands[0]).toEqual({ type: 'V', params: [200] });
    });

    it('should parse Cubic Bezier command', () => {
      const commands = parsePath('C 10 20 30 40 50 60');
      expect(commands[0]).toEqual({ type: 'C', params: [10, 20, 30, 40, 50, 60] });
    });

    it('should parse Smooth Cubic Bezier command', () => {
      const commands = parsePath('S 30 40 50 60');
      expect(commands[0]).toEqual({ type: 'S', params: [30, 40, 50, 60] });
    });

    it('should parse Quadratic Bezier command', () => {
      const commands = parsePath('Q 10 20 30 40');
      expect(commands[0]).toEqual({ type: 'Q', params: [10, 20, 30, 40] });
    });

    it('should parse Smooth Quadratic Bezier command', () => {
      const commands = parsePath('T 30 40');
      expect(commands[0]).toEqual({ type: 'T', params: [30, 40] });
    });

    it('should parse Arc command', () => {
      const commands = parsePath('A 50 50 0 0 1 100 100');
      expect(commands[0]).toEqual({ type: 'A', params: [50, 50, 0, 0, 1, 100, 100] });
    });

    it('should parse Close path command', () => {
      const commands = parsePath('M 0 0 L 100 0 Z');
      expect(commands).toHaveLength(3);
      expect(commands[2]).toEqual({ type: 'Z', params: [] });
    });

    it('should parse negative numbers', () => {
      const commands = parsePath('M -10 -20');
      expect(commands[0]).toEqual({ type: 'M', params: [-10, -20] });
    });

    it('should parse decimal numbers', () => {
      const commands = parsePath('M 10.5 20.75');
      expect(commands[0]).toEqual({ type: 'M', params: [10.5, 20.75] });
    });

    it('should parse numbers without spaces (comma-separated)', () => {
      const commands = parsePath('M10,20L30,40');
      expect(commands).toHaveLength(2);
      expect(commands[0]).toEqual({ type: 'M', params: [10, 20] });
      expect(commands[1]).toEqual({ type: 'L', params: [30, 40] });
    });

    it('should parse complex path', () => {
      const commands = parsePath('M 10 20 L 30 40 C 50 60 70 80 90 100 Z');
      expect(commands).toHaveLength(4);
    });
  });

  describe('getPathBoundingBox', () => {
    it('should return null for empty path', () => {
      expect(getPathBoundingBox('')).toBeNull();
    });

    it('should return null for whitespace only', () => {
      expect(getPathBoundingBox('   ')).toBeNull();
    });

    it('should calculate bounds for single point', () => {
      const bounds = getPathBoundingBox('M 10 20');
      expect(bounds).toEqual({ x: 10, y: 20, width: 0, height: 0 });
    });

    it('should calculate bounds for horizontal line', () => {
      const bounds = getPathBoundingBox('M 0 0 L 100 0');
      expect(bounds).toEqual({ x: 0, y: 0, width: 100, height: 0 });
    });

    it('should calculate bounds for vertical line', () => {
      const bounds = getPathBoundingBox('M 0 0 L 0 100');
      expect(bounds).toEqual({ x: 0, y: 0, width: 0, height: 100 });
    });

    it('should calculate bounds for diagonal line', () => {
      const bounds = getPathBoundingBox('M 0 0 L 100 100');
      expect(bounds).toEqual({ x: 0, y: 0, width: 100, height: 100 });
    });

    it('should calculate bounds for rectangle path', () => {
      const bounds = getPathBoundingBox('M 10 10 L 110 10 L 110 60 L 10 60 Z');
      expect(bounds).toEqual({ x: 10, y: 10, width: 100, height: 50 });
    });

    it('should calculate bounds for relative LineTo', () => {
      const bounds = getPathBoundingBox('M 10 10 l 100 0 l 0 50');
      expect(bounds).toEqual({ x: 10, y: 10, width: 100, height: 50 });
    });

    it('should calculate bounds for H command', () => {
      const bounds = getPathBoundingBox('M 0 0 H 100');
      expect(bounds).toEqual({ x: 0, y: 0, width: 100, height: 0 });
    });

    it('should calculate bounds for V command', () => {
      const bounds = getPathBoundingBox('M 0 0 V 100');
      expect(bounds).toEqual({ x: 0, y: 0, width: 0, height: 100 });
    });

    it('should calculate bounds for relative h command', () => {
      const bounds = getPathBoundingBox('M 10 10 h 50');
      expect(bounds).toEqual({ x: 10, y: 10, width: 50, height: 0 });
    });

    it('should calculate bounds for relative v command', () => {
      const bounds = getPathBoundingBox('M 10 10 v 50');
      expect(bounds).toEqual({ x: 10, y: 10, width: 0, height: 50 });
    });

    it('should calculate bounds for path with negative coordinates', () => {
      const bounds = getPathBoundingBox('M -50 -25 L 50 25');
      expect(bounds).toEqual({ x: -50, y: -25, width: 100, height: 50 });
    });

    it('should calculate bounds for closed path', () => {
      const bounds = getPathBoundingBox('M 0 0 L 100 0 L 100 100 Z');
      expect(bounds).toEqual({ x: 0, y: 0, width: 100, height: 100 });
    });

    describe('Quadratic Bezier curves', () => {
      it('should include control point extrema in bounds', () => {
        // Curve that bulges outside the endpoints
        const bounds = getPathBoundingBox('M 0 0 Q 50 100 100 0');
        expect(bounds).not.toBeNull();
        expect(bounds!.x).toBe(0);
        expect(bounds!.y).toBe(0);
        expect(bounds!.width).toBe(100);
        // The curve's maximum y should be at t=0.5, y=50
        expect(bounds!.height).toBe(50);
      });

      it('should handle relative quadratic bezier', () => {
        const bounds = getPathBoundingBox('M 10 10 q 40 80 80 0');
        expect(bounds).not.toBeNull();
        expect(bounds!.x).toBe(10);
        expect(bounds!.width).toBe(80);
      });

      it('should handle smooth quadratic bezier (T command)', () => {
        const bounds = getPathBoundingBox('M 0 0 Q 25 50 50 0 T 100 0');
        expect(bounds).not.toBeNull();
        expect(bounds!.x).toBe(0);
        expect(bounds!.width).toBe(100);
      });
    });

    describe('Cubic Bezier curves', () => {
      it('should include control point extrema in bounds', () => {
        // Curve that bulges outside the endpoints
        const bounds = getPathBoundingBox('M 0 0 C 0 100 100 100 100 0');
        expect(bounds).not.toBeNull();
        expect(bounds!.x).toBe(0);
        expect(bounds!.y).toBe(0);
        expect(bounds!.width).toBe(100);
        // The curve should bulge to around y=75 at its peak
        expect(bounds!.height).toBeGreaterThan(50);
      });

      it('should handle relative cubic bezier', () => {
        const bounds = getPathBoundingBox('M 10 10 c 0 50 50 50 50 0');
        expect(bounds).not.toBeNull();
        expect(bounds!.x).toBe(10);
        expect(bounds!.width).toBe(50);
      });

      it('should handle smooth cubic bezier (S command)', () => {
        const bounds = getPathBoundingBox('M 0 0 C 10 20 40 20 50 0 S 90 -20 100 0');
        expect(bounds).not.toBeNull();
        expect(bounds!.width).toBe(100);
      });

      it('should calculate bounds for S-curve', () => {
        // An S-curve that goes above and below the baseline
        const bounds = getPathBoundingBox('M 0 50 C 25 0 25 0 50 50 C 75 100 75 100 100 50');
        expect(bounds).not.toBeNull();
        expect(bounds!.x).toBe(0);
        expect(bounds!.width).toBe(100);
        // Should extend above and below y=50
        expect(bounds!.y).toBeLessThan(50);
        expect(bounds!.y + bounds!.height).toBeGreaterThan(50);
      });
    });

    describe('Elliptical Arcs', () => {
      it('should calculate bounds for semicircle arc', () => {
        const bounds = getPathBoundingBox('M 0 50 A 50 50 0 0 1 100 50');
        expect(bounds).not.toBeNull();
        expect(bounds!.x).toBeLessThanOrEqual(0);
        expect(bounds!.width).toBeGreaterThanOrEqual(100);
      });

      it('should handle arc with zero radius', () => {
        const bounds = getPathBoundingBox('M 0 0 A 0 0 0 0 1 100 100');
        expect(bounds).not.toBeNull();
        // With zero radius, it's essentially a line
        expect(bounds!.x).toBe(0);
        expect(bounds!.y).toBe(0);
        expect(bounds!.width).toBe(100);
        expect(bounds!.height).toBe(100);
      });

      it('should handle relative arc command', () => {
        const bounds = getPathBoundingBox('M 10 10 a 25 25 0 0 1 50 0');
        expect(bounds).not.toBeNull();
        expect(bounds!.x).toBeLessThanOrEqual(10);
      });
    });

    describe('Complex paths', () => {
      it('should calculate bounds for a star shape', () => {
        // Simple 4-point star
        const bounds = getPathBoundingBox(
          'M 50 0 L 60 40 L 100 50 L 60 60 L 50 100 L 40 60 L 0 50 L 40 40 Z',
        );
        expect(bounds).not.toBeNull();
        expect(bounds!.x).toBe(0);
        expect(bounds!.y).toBe(0);
        expect(bounds!.width).toBe(100);
        expect(bounds!.height).toBe(100);
      });

      it('should calculate bounds for path with multiple subpaths', () => {
        const bounds = getPathBoundingBox('M 0 0 L 50 50 M 100 100 L 150 150');
        expect(bounds).not.toBeNull();
        expect(bounds!.x).toBe(0);
        expect(bounds!.y).toBe(0);
        expect(bounds!.width).toBe(150);
        expect(bounds!.height).toBe(150);
      });

      it('should handle mixed absolute and relative commands', () => {
        const bounds = getPathBoundingBox('M 10 10 l 30 0 L 100 50 l 0 30');
        expect(bounds).not.toBeNull();
        expect(bounds!.x).toBe(10);
        expect(bounds!.y).toBe(10);
        expect(bounds!.width).toBe(90);
        expect(bounds!.height).toBe(70);
      });

      it('should handle real-world SVG path', () => {
        // A simple arrow shape
        const bounds = getPathBoundingBox(
          'M 0 20 L 60 20 L 60 0 L 100 30 L 60 60 L 60 40 L 0 40 Z',
        );
        expect(bounds).not.toBeNull();
        expect(bounds!.x).toBe(0);
        expect(bounds!.y).toBe(0);
        expect(bounds!.width).toBe(100);
        expect(bounds!.height).toBe(60);
      });
    });

    describe('Edge cases', () => {
      it('should handle path with only close command', () => {
        const bounds = getPathBoundingBox('Z');
        expect(bounds).toEqual({ x: 0, y: 0, width: 0, height: 0 });
      });

      it('should handle decimal coordinates', () => {
        const bounds = getPathBoundingBox('M 0.5 0.5 L 99.5 99.5');
        expect(bounds).not.toBeNull();
        expect(bounds!.x).toBe(0.5);
        expect(bounds!.y).toBe(0.5);
        expect(bounds!.width).toBe(99);
        expect(bounds!.height).toBe(99);
      });

      it('should handle scientific notation', () => {
        const bounds = getPathBoundingBox('M 1e1 2e1 L 1e2 2e2');
        expect(bounds).not.toBeNull();
        expect(bounds!.x).toBe(10);
        expect(bounds!.y).toBe(20);
        expect(bounds!.width).toBe(90);
        expect(bounds!.height).toBe(180);
      });

      it('should handle multiple H commands', () => {
        const bounds = getPathBoundingBox('M 0 0 H 50 H 100 H 25');
        expect(bounds).not.toBeNull();
        expect(bounds!.x).toBe(0);
        expect(bounds!.width).toBe(100);
      });

      it('should handle multiple V commands', () => {
        const bounds = getPathBoundingBox('M 0 0 V 50 V 100 V 25');
        expect(bounds).not.toBeNull();
        expect(bounds!.y).toBe(0);
        expect(bounds!.height).toBe(100);
      });
    });
  });
});
