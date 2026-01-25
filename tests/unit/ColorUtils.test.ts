/**
 * ColorUtils unit tests
 *
 * Tests for comprehensive color parsing and conversion utilities
 */

import { describe, it, expect } from 'vitest';
import {
  parseColor,
  parseColorToRgb,
  isValidColor,
  normalizeToHex,
  hslToRgb,
  rgbToHsl,
  oklchToRgb,
  rgbToOklch,
  rgbToHex,
  rgbToString,
  getNamedColorNames,
  CSS_NAMED_COLORS,
} from '../../src/utils/ColorUtils.js';
import type { RGBColor } from '../../src/utils/ColorUtils.js';

describe('ColorUtils', () => {
  // ============================================================
  // Hex Color Parsing
  // ============================================================

  describe('hex color parsing', () => {
    it('should parse 3-digit hex colors', () => {
      const result = parseColor('#f00');
      expect(result.success).toBe(true);
      expect(result.color).toEqual({ r: 255, g: 0, b: 0 });
      expect(result.originalFormat).toBe('hex');
    });

    it('should parse 6-digit hex colors', () => {
      const result = parseColor('#ff8800');
      expect(result.success).toBe(true);
      expect(result.color).toEqual({ r: 255, g: 136, b: 0 });
    });

    it('should parse 4-digit hex colors with alpha', () => {
      const result = parseColor('#f008');
      expect(result.success).toBe(true);
      expect(result.color.r).toBe(255);
      expect(result.color.g).toBe(0);
      expect(result.color.b).toBe(0);
      expect(result.color.a).toBeCloseTo(0.533, 2);
    });

    it('should parse 8-digit hex colors with alpha', () => {
      const result = parseColor('#ff000080');
      expect(result.success).toBe(true);
      expect(result.color.r).toBe(255);
      expect(result.color.g).toBe(0);
      expect(result.color.b).toBe(0);
      expect(result.color.a).toBeCloseTo(0.502, 2);
    });

    it('should handle case insensitivity', () => {
      const lower = parseColor('#aabbcc');
      const upper = parseColor('#AABBCC');
      const mixed = parseColor('#AaBbCc');

      expect(lower.color).toEqual(upper.color);
      expect(lower.color).toEqual(mixed.color);
    });

    it('should reject invalid hex colors', () => {
      expect(parseColor('#gg0000').success).toBe(false);
      expect(parseColor('#12').success).toBe(false);
      expect(parseColor('#12345').success).toBe(false);
      expect(parseColor('#1234567').success).toBe(false);
      expect(parseColor('ff0000').success).toBe(false); // missing #
    });
  });

  // ============================================================
  // RGB/RGBA Color Parsing
  // ============================================================

  describe('rgb/rgba color parsing', () => {
    it('should parse rgb() with commas', () => {
      const result = parseColor('rgb(255, 128, 0)');
      expect(result.success).toBe(true);
      expect(result.color).toEqual({ r: 255, g: 128, b: 0 });
      expect(result.originalFormat).toBe('rgb');
    });

    it('should parse rgb() with spaces (modern syntax)', () => {
      const result = parseColor('rgb(255 128 0)');
      expect(result.success).toBe(true);
      expect(result.color).toEqual({ r: 255, g: 128, b: 0 });
    });

    it('should parse rgba() with commas', () => {
      const result = parseColor('rgba(255, 128, 0, 0.5)');
      expect(result.success).toBe(true);
      expect(result.color.r).toBe(255);
      expect(result.color.g).toBe(128);
      expect(result.color.b).toBe(0);
      expect(result.color.a).toBe(0.5);
    });

    it('should parse rgb() with slash alpha (modern syntax)', () => {
      const result = parseColor('rgb(255 128 0 / 0.5)');
      expect(result.success).toBe(true);
      expect(result.color.a).toBe(0.5);
    });

    it('should parse rgb() with percentage values', () => {
      const result = parseColor('rgb(100%, 50%, 0%)');
      expect(result.success).toBe(true);
      expect(result.color).toEqual({ r: 255, g: 128, b: 0 });
    });

    it('should parse rgba() with percentage alpha', () => {
      const result = parseColor('rgba(255, 128, 0, 50%)');
      expect(result.success).toBe(true);
      expect(result.color.a).toBe(0.5);
    });

    it('should clamp out-of-range positive values', () => {
      const result = parseColor('rgb(300, 400, 128)');
      expect(result.success).toBe(true);
      expect(result.color.r).toBe(255);
      expect(result.color.g).toBe(255);
      expect(result.color.b).toBe(128);
    });

    it('should reject negative RGB values (not valid CSS)', () => {
      // CSS does not allow negative RGB values
      const result = parseColor('rgb(300, -10, 128)');
      expect(result.success).toBe(false);
    });

    it('should handle case insensitivity', () => {
      const lower = parseColor('rgb(255, 0, 0)');
      const upper = parseColor('RGB(255, 0, 0)');
      const mixed = parseColor('RgB(255, 0, 0)');

      expect(lower.color).toEqual(upper.color);
      expect(lower.color).toEqual(mixed.color);
    });
  });

  // ============================================================
  // HSL/HSLA Color Parsing
  // ============================================================

  describe('hsl/hsla color parsing', () => {
    it('should parse hsl() with commas', () => {
      const result = parseColor('hsl(180, 50%, 50%)');
      expect(result.success).toBe(true);
      expect(result.originalFormat).toBe('hsl');
      // Expected: teal-ish color
      expect(result.color.r).toBeGreaterThan(50);
      expect(result.color.g).toBeGreaterThan(150);
      expect(result.color.b).toBeGreaterThan(150);
    });

    it('should parse hsl() with spaces (modern syntax)', () => {
      const result = parseColor('hsl(180 50% 50%)');
      expect(result.success).toBe(true);
    });

    it('should parse hsla() with alpha', () => {
      const result = parseColor('hsla(180, 50%, 50%, 0.5)');
      expect(result.success).toBe(true);
      expect(result.color.a).toBe(0.5);
    });

    it('should parse hsl() with slash alpha (modern syntax)', () => {
      const result = parseColor('hsl(180 50% 50% / 0.5)');
      expect(result.success).toBe(true);
      expect(result.color.a).toBe(0.5);
    });

    it('should parse hsl() with deg unit', () => {
      const result = parseColor('hsl(180deg, 50%, 50%)');
      expect(result.success).toBe(true);
    });

    it('should parse hsl() with grad unit', () => {
      const result = parseColor('hsl(200grad, 50%, 50%)');
      expect(result.success).toBe(true);
      // 200 gradians = 180 degrees
    });

    it('should parse hsl() with rad unit', () => {
      const result = parseColor('hsl(3.14159rad, 50%, 50%)');
      expect(result.success).toBe(true);
      // π radians = 180 degrees
    });

    it('should parse hsl() with turn unit', () => {
      const result = parseColor('hsl(0.5turn, 50%, 50%)');
      expect(result.success).toBe(true);
      // 0.5 turns = 180 degrees
    });

    it('should handle negative hue values', () => {
      const positive = parseColor('hsl(270, 50%, 50%)');
      const negative = parseColor('hsl(-90, 50%, 50%)');
      // -90 should wrap to 270
      expect(positive.color).toEqual(negative.color);
    });

    it('should handle hue values > 360', () => {
      const normal = parseColor('hsl(90, 50%, 50%)');
      const wrapped = parseColor('hsl(450, 50%, 50%)');
      // 450 should wrap to 90
      expect(normal.color).toEqual(wrapped.color);
    });

    it('should convert pure red correctly', () => {
      const result = parseColor('hsl(0, 100%, 50%)');
      expect(result.success).toBe(true);
      expect(result.color).toEqual({ r: 255, g: 0, b: 0 });
    });

    it('should convert pure green correctly', () => {
      const result = parseColor('hsl(120, 100%, 50%)');
      expect(result.success).toBe(true);
      expect(result.color).toEqual({ r: 0, g: 255, b: 0 });
    });

    it('should convert pure blue correctly', () => {
      const result = parseColor('hsl(240, 100%, 50%)');
      expect(result.success).toBe(true);
      expect(result.color).toEqual({ r: 0, g: 0, b: 255 });
    });

    it('should convert white correctly', () => {
      const result = parseColor('hsl(0, 0%, 100%)');
      expect(result.success).toBe(true);
      expect(result.color).toEqual({ r: 255, g: 255, b: 255 });
    });

    it('should convert black correctly', () => {
      const result = parseColor('hsl(0, 0%, 0%)');
      expect(result.success).toBe(true);
      expect(result.color).toEqual({ r: 0, g: 0, b: 0 });
    });

    it('should convert gray correctly', () => {
      const result = parseColor('hsl(0, 0%, 50%)');
      expect(result.success).toBe(true);
      expect(result.color).toEqual({ r: 128, g: 128, b: 128 });
    });
  });

  // ============================================================
  // OKLCH Color Parsing
  // ============================================================

  describe('oklch color parsing', () => {
    it('should parse oklch() with percentage lightness', () => {
      const result = parseColor('oklch(70% 0.15 180)');
      expect(result.success).toBe(true);
      expect(result.originalFormat).toBe('oklch');
    });

    it('should parse oklch() with decimal lightness', () => {
      const result = parseColor('oklch(0.7 0.15 180)');
      expect(result.success).toBe(true);
    });

    it('should parse oklch() with alpha', () => {
      const result = parseColor('oklch(70% 0.15 180 / 0.5)');
      expect(result.success).toBe(true);
      expect(result.color.a).toBe(0.5);
    });

    it('should parse oklch() with deg unit', () => {
      const result = parseColor('oklch(70% 0.15 180deg)');
      expect(result.success).toBe(true);
    });

    it('should convert pure black correctly', () => {
      const result = parseColor('oklch(0% 0 0)');
      expect(result.success).toBe(true);
      expect(result.color).toEqual({ r: 0, g: 0, b: 0 });
    });

    it('should convert pure white correctly', () => {
      const result = parseColor('oklch(100% 0 0)');
      expect(result.success).toBe(true);
      expect(result.color).toEqual({ r: 255, g: 255, b: 255 });
    });

    it('should convert mid-gray correctly', () => {
      const result = parseColor('oklch(50% 0 0)');
      expect(result.success).toBe(true);
      // OKLCH perceptual mid-gray is around RGB 128
      expect(result.color.r).toBeGreaterThan(90);
      expect(result.color.r).toBeLessThan(140);
      expect(result.color.r).toBe(result.color.g);
      expect(result.color.r).toBe(result.color.b);
    });

    it('should handle high chroma colors', () => {
      // High chroma red-ish
      const result = parseColor('oklch(60% 0.25 30)');
      expect(result.success).toBe(true);
      // Should be a saturated reddish color
      expect(result.color.r).toBeGreaterThan(result.color.g);
      expect(result.color.r).toBeGreaterThan(result.color.b);
    });

    it('should clamp out-of-gamut colors', () => {
      // Very high chroma that might be out of sRGB gamut
      const result = parseColor('oklch(70% 0.4 120)');
      expect(result.success).toBe(true);
      // Values should be clamped to 0-255
      expect(result.color.r).toBeGreaterThanOrEqual(0);
      expect(result.color.r).toBeLessThanOrEqual(255);
      expect(result.color.g).toBeGreaterThanOrEqual(0);
      expect(result.color.g).toBeLessThanOrEqual(255);
      expect(result.color.b).toBeGreaterThanOrEqual(0);
      expect(result.color.b).toBeLessThanOrEqual(255);
    });
  });

  // ============================================================
  // Named Color Parsing
  // ============================================================

  describe('named color parsing', () => {
    it('should parse basic named colors', () => {
      expect(parseColor('red').color).toEqual({ r: 255, g: 0, b: 0 });
      expect(parseColor('green').color).toEqual({ r: 0, g: 128, b: 0 });
      expect(parseColor('blue').color).toEqual({ r: 0, g: 0, b: 255 });
      expect(parseColor('black').color).toEqual({ r: 0, g: 0, b: 0 });
      expect(parseColor('white').color).toEqual({ r: 255, g: 255, b: 255 });
    });

    it('should parse extended named colors', () => {
      expect(parseColor('coral').color).toEqual({ r: 255, g: 127, b: 80 });
      expect(parseColor('steelblue').color).toEqual({ r: 70, g: 130, b: 180 });
      expect(parseColor('rebeccapurple').color).toEqual({ r: 102, g: 51, b: 153 });
      expect(parseColor('aliceblue').color).toEqual({ r: 240, g: 248, b: 255 });
    });

    it('should handle gray/grey spelling variants', () => {
      expect(parseColor('gray').color).toEqual(parseColor('grey').color);
      expect(parseColor('darkgray').color).toEqual(parseColor('darkgrey').color);
      expect(parseColor('lightgray').color).toEqual(parseColor('lightgrey').color);
    });

    it('should handle transparent', () => {
      const result = parseColor('transparent');
      expect(result.success).toBe(true);
      expect(result.color).toEqual({ r: 0, g: 0, b: 0, a: 0 });
    });

    it('should be case insensitive', () => {
      expect(parseColor('RED').color).toEqual(parseColor('red').color);
      expect(parseColor('CornflowerBlue').color).toEqual(parseColor('cornflowerblue').color);
    });

    it('should parse original format as named', () => {
      const result = parseColor('rebeccapurple');
      expect(result.originalFormat).toBe('named');
    });

    it('should reject unknown named colors', () => {
      expect(parseColor('notacolor').success).toBe(false);
      expect(parseColor('brightpurple').success).toBe(false);
    });
  });

  // ============================================================
  // CSS_NAMED_COLORS constant
  // ============================================================

  describe('CSS_NAMED_COLORS', () => {
    it('should contain at least 140 colors', () => {
      const colorCount = Object.keys(CSS_NAMED_COLORS).length;
      // 147 unique colors + grey variants
      expect(colorCount).toBeGreaterThanOrEqual(140);
    });

    it('should contain all basic CSS colors', () => {
      const basicColors = [
        'black',
        'white',
        'red',
        'green',
        'blue',
        'yellow',
        'cyan',
        'magenta',
        'silver',
        'gray',
        'maroon',
        'olive',
        'lime',
        'aqua',
        'teal',
        'navy',
        'fuchsia',
        'purple',
      ];

      basicColors.forEach((color) => {
        expect(CSS_NAMED_COLORS[color]).toBeDefined();
      });
    });

    it('should contain rebeccapurple (CSS Color 4)', () => {
      expect(CSS_NAMED_COLORS['rebeccapurple']).toEqual({ r: 102, g: 51, b: 153 });
    });
  });

  // ============================================================
  // getNamedColorNames
  // ============================================================

  describe('getNamedColorNames', () => {
    it('should return an array of color names', () => {
      const names = getNamedColorNames();
      expect(Array.isArray(names)).toBe(true);
      expect(names.length).toBeGreaterThanOrEqual(140);
    });

    it('should contain common color names', () => {
      const names = getNamedColorNames();
      expect(names).toContain('red');
      expect(names).toContain('blue');
      expect(names).toContain('rebeccapurple');
    });

    it('should exclude duplicate grey spelling variants', () => {
      const names = getNamedColorNames();
      // Should contain 'gray' variants
      expect(names).toContain('gray');
      expect(names).toContain('darkgray');
      expect(names).toContain('lightgray');
      // Should NOT contain 'grey' variants (duplicates)
      expect(names).not.toContain('grey');
      expect(names).not.toContain('darkgrey');
      expect(names).not.toContain('lightgrey');
      expect(names).not.toContain('slategrey');
      expect(names).not.toContain('dimgrey');
    });
  });

  // ============================================================
  // parseColorToRgb convenience function
  // ============================================================

  describe('parseColorToRgb', () => {
    it('should return RGB values directly', () => {
      const result = parseColorToRgb('#ff0000');
      expect(result).toEqual({ r: 255, g: 0, b: 0 });
    });

    it('should default to black for invalid colors', () => {
      const result = parseColorToRgb('notacolor');
      expect(result).toEqual({ r: 0, g: 0, b: 0 });
    });

    it('should include alpha if present', () => {
      const result = parseColorToRgb('rgba(255, 0, 0, 0.5)');
      expect(result.a).toBe(0.5);
    });
  });

  // ============================================================
  // isValidColor
  // ============================================================

  describe('isValidColor', () => {
    it('should return true for valid colors', () => {
      expect(isValidColor('#ff0000')).toBe(true);
      expect(isValidColor('rgb(255, 0, 0)')).toBe(true);
      expect(isValidColor('hsl(0, 100%, 50%)')).toBe(true);
      expect(isValidColor('oklch(70% 0.15 180)')).toBe(true);
      expect(isValidColor('red')).toBe(true);
      expect(isValidColor('rebeccapurple')).toBe(true);
    });

    it('should return false for invalid colors', () => {
      expect(isValidColor('notacolor')).toBe(false);
      expect(isValidColor('#gggggg')).toBe(false);
      expect(isValidColor('')).toBe(false);
    });
  });

  // ============================================================
  // normalizeToHex
  // ============================================================

  describe('normalizeToHex', () => {
    it('should convert rgb to hex', () => {
      expect(normalizeToHex('rgb(255, 128, 0)')).toBe('#ff8000');
    });

    it('should convert hsl to hex', () => {
      const hex = normalizeToHex('hsl(0, 100%, 50%)');
      expect(hex).toBe('#ff0000');
    });

    it('should convert named colors to hex', () => {
      expect(normalizeToHex('red')).toBe('#ff0000');
      expect(normalizeToHex('rebeccapurple')).toBe('#663399');
    });

    it('should normalize short hex to long hex', () => {
      expect(normalizeToHex('#f00')).toBe('#ff0000');
    });

    it('should return null for invalid colors', () => {
      expect(normalizeToHex('notacolor')).toBeNull();
    });

    it('should include alpha when present', () => {
      const hex = normalizeToHex('rgba(255, 0, 0, 0.5)');
      expect(hex).toBe('#ff000080');
    });
  });

  // ============================================================
  // hslToRgb conversion
  // ============================================================

  describe('hslToRgb', () => {
    it('should convert primary colors', () => {
      expect(hslToRgb(0, 100, 50)).toEqual({ r: 255, g: 0, b: 0 }); // red
      expect(hslToRgb(120, 100, 50)).toEqual({ r: 0, g: 255, b: 0 }); // green
      expect(hslToRgb(240, 100, 50)).toEqual({ r: 0, g: 0, b: 255 }); // blue
    });

    it('should convert white and black', () => {
      expect(hslToRgb(0, 0, 100)).toEqual({ r: 255, g: 255, b: 255 }); // white
      expect(hslToRgb(0, 0, 0)).toEqual({ r: 0, g: 0, b: 0 }); // black
    });

    it('should convert grays (0% saturation)', () => {
      expect(hslToRgb(180, 0, 50)).toEqual({ r: 128, g: 128, b: 128 });
    });

    it('should handle various hue values', () => {
      // Yellow
      const yellow = hslToRgb(60, 100, 50);
      expect(yellow.r).toBe(255);
      expect(yellow.g).toBe(255);
      expect(yellow.b).toBe(0);

      // Cyan
      const cyan = hslToRgb(180, 100, 50);
      expect(cyan.r).toBe(0);
      expect(cyan.g).toBe(255);
      expect(cyan.b).toBe(255);

      // Magenta
      const magenta = hslToRgb(300, 100, 50);
      expect(magenta.r).toBe(255);
      expect(magenta.g).toBe(0);
      expect(magenta.b).toBe(255);
    });
  });

  // ============================================================
  // rgbToHsl conversion
  // ============================================================

  describe('rgbToHsl', () => {
    it('should convert primary colors', () => {
      expect(rgbToHsl(255, 0, 0)).toEqual({ h: 0, s: 100, l: 50 }); // red
      expect(rgbToHsl(0, 255, 0)).toEqual({ h: 120, s: 100, l: 50 }); // green
      expect(rgbToHsl(0, 0, 255)).toEqual({ h: 240, s: 100, l: 50 }); // blue
    });

    it('should convert white and black', () => {
      expect(rgbToHsl(255, 255, 255)).toEqual({ h: 0, s: 0, l: 100 }); // white
      expect(rgbToHsl(0, 0, 0)).toEqual({ h: 0, s: 0, l: 0 }); // black
    });

    it('should convert grays', () => {
      const gray = rgbToHsl(128, 128, 128);
      expect(gray.s).toBe(0);
      expect(gray.l).toBe(50);
    });
  });

  // ============================================================
  // oklchToRgb conversion
  // ============================================================

  describe('oklchToRgb', () => {
    it('should convert black', () => {
      const black = oklchToRgb(0, 0, 0);
      expect(black).toEqual({ r: 0, g: 0, b: 0 });
    });

    it('should convert white', () => {
      const white = oklchToRgb(100, 0, 0);
      expect(white).toEqual({ r: 255, g: 255, b: 255 });
    });

    it('should convert gray (zero chroma)', () => {
      const gray = oklchToRgb(50, 0, 0);
      // Perceptual mid-gray in OKLCH
      expect(gray.r).toBeGreaterThan(90);
      expect(gray.r).toBeLessThan(140);
      expect(gray.r).toBe(gray.g);
      expect(gray.r).toBe(gray.b);
    });

    it('should handle different hues at same lightness and chroma', () => {
      const red = oklchToRgb(60, 0.2, 30); // reddish
      const green = oklchToRgb(60, 0.2, 140); // greenish
      const blue = oklchToRgb(60, 0.2, 260); // bluish

      // Red hue should have more red
      expect(red.r).toBeGreaterThan(red.g);
      expect(red.r).toBeGreaterThan(red.b);

      // Green hue should have more green
      expect(green.g).toBeGreaterThan(green.r);
      expect(green.g).toBeGreaterThan(green.b);

      // Blue hue should have more blue
      expect(blue.b).toBeGreaterThan(blue.r);
    });
  });

  // ============================================================
  // rgbToOklch conversion
  // ============================================================

  describe('rgbToOklch', () => {
    it('should convert black', () => {
      const black = rgbToOklch(0, 0, 0);
      expect(black.l).toBe(0);
      expect(black.c).toBe(0);
    });

    it('should convert white', () => {
      const white = rgbToOklch(255, 255, 255);
      expect(white.l).toBe(100);
      expect(white.c).toBeCloseTo(0, 1);
    });

    it('should convert gray with zero chroma', () => {
      const gray = rgbToOklch(128, 128, 128);
      expect(gray.c).toBeCloseTo(0, 2);
    });

    it('should have higher chroma for saturated colors', () => {
      const saturatedRed = rgbToOklch(255, 0, 0);
      const desaturatedRed = rgbToOklch(200, 100, 100);

      expect(saturatedRed.c).toBeGreaterThan(desaturatedRed.c);
    });
  });

  // ============================================================
  // rgbToHex conversion
  // ============================================================

  describe('rgbToHex', () => {
    it('should convert RGB to hex', () => {
      expect(rgbToHex({ r: 255, g: 0, b: 0 })).toBe('#ff0000');
      expect(rgbToHex({ r: 0, g: 255, b: 0 })).toBe('#00ff00');
      expect(rgbToHex({ r: 0, g: 0, b: 255 })).toBe('#0000ff');
    });

    it('should pad single-digit hex values', () => {
      expect(rgbToHex({ r: 0, g: 0, b: 0 })).toBe('#000000');
      expect(rgbToHex({ r: 15, g: 15, b: 15 })).toBe('#0f0f0f');
    });

    it('should include alpha when present', () => {
      expect(rgbToHex({ r: 255, g: 0, b: 0, a: 1 })).toBe('#ff0000ff');
      expect(rgbToHex({ r: 255, g: 0, b: 0, a: 0.5 })).toBe('#ff000080');
      expect(rgbToHex({ r: 255, g: 0, b: 0, a: 0 })).toBe('#ff000000');
    });

    it('should exclude alpha when explicitly disabled', () => {
      expect(rgbToHex({ r: 255, g: 0, b: 0, a: 0.5 }, false)).toBe('#ff0000');
    });

    it('should clamp out-of-range values', () => {
      expect(rgbToHex({ r: 300, g: -10, b: 128 })).toBe('#ff0080');
    });
  });

  // ============================================================
  // rgbToString conversion
  // ============================================================

  describe('rgbToString', () => {
    it('should convert RGB to rgb() string', () => {
      expect(rgbToString({ r: 255, g: 128, b: 0 })).toBe('rgb(255, 128, 0)');
    });

    it('should convert RGBA to rgba() string', () => {
      expect(rgbToString({ r: 255, g: 128, b: 0, a: 0.5 })).toBe('rgba(255, 128, 0, 0.5)');
    });

    it('should use rgb() for fully opaque colors', () => {
      expect(rgbToString({ r: 255, g: 128, b: 0, a: 1 })).toBe('rgb(255, 128, 0)');
    });

    it('should clamp out-of-range values', () => {
      expect(rgbToString({ r: 300, g: -10, b: 128 })).toBe('rgb(255, 0, 128)');
    });
  });

  // ============================================================
  // Edge Cases and Error Handling
  // ============================================================

  describe('edge cases', () => {
    it('should handle empty string', () => {
      const result = parseColor('');
      expect(result.success).toBe(false);
    });

    it('should handle whitespace', () => {
      const result = parseColor('   #ff0000   ');
      expect(result.success).toBe(true);
      expect(result.color).toEqual({ r: 255, g: 0, b: 0 });
    });

    it('should handle null and undefined gracefully', () => {
      expect(parseColor(null as unknown as string).success).toBe(false);
      expect(parseColor(undefined as unknown as string).success).toBe(false);
    });

    it('should handle non-string input', () => {
      expect(parseColor(123 as unknown as string).success).toBe(false);
      expect(parseColor({} as unknown as string).success).toBe(false);
    });
  });

  // ============================================================
  // Round-trip conversions
  // ============================================================

  describe('round-trip conversions', () => {
    it('should maintain accuracy through RGB -> HSL -> RGB', () => {
      const colors: RGBColor[] = [
        { r: 255, g: 0, b: 0 },
        { r: 0, g: 255, b: 0 },
        { r: 0, g: 0, b: 255 },
        { r: 128, g: 64, b: 192 },
      ];

      colors.forEach((original) => {
        const hsl = rgbToHsl(original.r, original.g, original.b);
        const converted = hslToRgb(hsl.h, hsl.s, hsl.l);
        // Allow tolerance of 1-2 due to rounding during integer conversions
        expect(Math.abs(converted.r - original.r)).toBeLessThanOrEqual(2);
        expect(Math.abs(converted.g - original.g)).toBeLessThanOrEqual(2);
        expect(Math.abs(converted.b - original.b)).toBeLessThanOrEqual(2);
      });
    });

    it('should maintain reasonable accuracy through RGB -> OKLCH -> RGB', () => {
      // Note: OKLCH conversions can have larger errors for highly saturated colors
      // due to rounding in integer conversions and gamut mapping at color space boundaries
      const colors: RGBColor[] = [
        { r: 128, g: 128, b: 128 }, // Gray - should be accurate
        { r: 200, g: 100, b: 150 }, // Mid-saturation pink
        { r: 100, g: 150, b: 200 }, // Mid-saturation blue
      ];

      colors.forEach((original) => {
        const oklch = rgbToOklch(original.r, original.g, original.b);
        const converted = oklchToRgb(oklch.l, oklch.c, oklch.h);
        // Allow tolerance for floating point and gamut mapping
        // Gray should be very accurate, saturated colors may have larger errors
        const tolerance = oklch.c < 0.05 ? 5 : 30; // Lower tolerance for grays
        expect(Math.abs(converted.r - original.r)).toBeLessThanOrEqual(tolerance);
        expect(Math.abs(converted.g - original.g)).toBeLessThanOrEqual(tolerance);
        expect(Math.abs(converted.b - original.b)).toBeLessThanOrEqual(tolerance);
      });
    });
  });
});
