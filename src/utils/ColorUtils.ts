/**
 * Color Utilities Module
 *
 * Provides comprehensive color parsing and conversion utilities supporting:
 * - Hex colors (#RGB, #RRGGBB, #RGBA, #RRGGBBAA)
 * - RGB/RGBA colors: rgb(r, g, b), rgba(r, g, b, a)
 * - HSL/HSLA colors: hsl(h, s%, l%), hsla(h, s%, l%, a)
 * - OKLCH colors: oklch(L% C H), oklch(L% C H / a)
 * - Full CSS named colors (147 colors from CSS Color Level 4)
 *
 * @module ColorUtils
 */

/**
 * Represents an RGB color with optional alpha channel
 */
export interface RGBColor {
  r: number; // 0-255
  g: number; // 0-255
  b: number; // 0-255
  a?: number; // 0-1 (optional alpha)
}

/**
 * Represents an HSL color with optional alpha channel
 */
export interface HSLColor {
  h: number; // 0-360 (degrees)
  s: number; // 0-100 (percentage)
  l: number; // 0-100 (percentage)
  a?: number; // 0-1 (optional alpha)
}

/**
 * Represents an OKLCH color with optional alpha channel
 * OKLCH is a perceptually uniform color space
 */
export interface OKLCHColor {
  l: number; // 0-100 (lightness percentage)
  c: number; // 0-0.4+ (chroma, unbounded but typically 0-0.4)
  h: number; // 0-360 (hue angle in degrees)
  a?: number; // 0-1 (optional alpha)
}

/**
 * Result of color parsing, including whether parsing succeeded
 */
export interface ColorParseResult {
  success: boolean;
  color: RGBColor;
  originalFormat?: string;
}

/**
 * Full CSS named colors (CSS Color Level 4 specification)
 * All 147 named colors plus transparent
 */
export const CSS_NAMED_COLORS: Record<string, RGBColor> = {
  // Basic colors
  black: { r: 0, g: 0, b: 0 },
  silver: { r: 192, g: 192, b: 192 },
  gray: { r: 128, g: 128, b: 128 },
  grey: { r: 128, g: 128, b: 128 },
  white: { r: 255, g: 255, b: 255 },
  maroon: { r: 128, g: 0, b: 0 },
  red: { r: 255, g: 0, b: 0 },
  purple: { r: 128, g: 0, b: 128 },
  fuchsia: { r: 255, g: 0, b: 255 },
  green: { r: 0, g: 128, b: 0 },
  lime: { r: 0, g: 255, b: 0 },
  olive: { r: 128, g: 128, b: 0 },
  yellow: { r: 255, g: 255, b: 0 },
  navy: { r: 0, g: 0, b: 128 },
  blue: { r: 0, g: 0, b: 255 },
  teal: { r: 0, g: 128, b: 128 },
  aqua: { r: 0, g: 255, b: 255 },

  // Extended colors
  aliceblue: { r: 240, g: 248, b: 255 },
  antiquewhite: { r: 250, g: 235, b: 215 },
  aquamarine: { r: 127, g: 255, b: 212 },
  azure: { r: 240, g: 255, b: 255 },
  beige: { r: 245, g: 245, b: 220 },
  bisque: { r: 255, g: 228, b: 196 },
  blanchedalmond: { r: 255, g: 235, b: 205 },
  blueviolet: { r: 138, g: 43, b: 226 },
  brown: { r: 165, g: 42, b: 42 },
  burlywood: { r: 222, g: 184, b: 135 },
  cadetblue: { r: 95, g: 158, b: 160 },
  chartreuse: { r: 127, g: 255, b: 0 },
  chocolate: { r: 210, g: 105, b: 30 },
  coral: { r: 255, g: 127, b: 80 },
  cornflowerblue: { r: 100, g: 149, b: 237 },
  cornsilk: { r: 255, g: 248, b: 220 },
  crimson: { r: 220, g: 20, b: 60 },
  cyan: { r: 0, g: 255, b: 255 },
  darkblue: { r: 0, g: 0, b: 139 },
  darkcyan: { r: 0, g: 139, b: 139 },
  darkgoldenrod: { r: 184, g: 134, b: 11 },
  darkgray: { r: 169, g: 169, b: 169 },
  darkgrey: { r: 169, g: 169, b: 169 },
  darkgreen: { r: 0, g: 100, b: 0 },
  darkkhaki: { r: 189, g: 183, b: 107 },
  darkmagenta: { r: 139, g: 0, b: 139 },
  darkolivegreen: { r: 85, g: 107, b: 47 },
  darkorange: { r: 255, g: 140, b: 0 },
  darkorchid: { r: 153, g: 50, b: 204 },
  darkred: { r: 139, g: 0, b: 0 },
  darksalmon: { r: 233, g: 150, b: 122 },
  darkseagreen: { r: 143, g: 188, b: 143 },
  darkslateblue: { r: 72, g: 61, b: 139 },
  darkslategray: { r: 47, g: 79, b: 79 },
  darkslategrey: { r: 47, g: 79, b: 79 },
  darkturquoise: { r: 0, g: 206, b: 209 },
  darkviolet: { r: 148, g: 0, b: 211 },
  deeppink: { r: 255, g: 20, b: 147 },
  deepskyblue: { r: 0, g: 191, b: 255 },
  dimgray: { r: 105, g: 105, b: 105 },
  dimgrey: { r: 105, g: 105, b: 105 },
  dodgerblue: { r: 30, g: 144, b: 255 },
  firebrick: { r: 178, g: 34, b: 34 },
  floralwhite: { r: 255, g: 250, b: 240 },
  forestgreen: { r: 34, g: 139, b: 34 },
  gainsboro: { r: 220, g: 220, b: 220 },
  ghostwhite: { r: 248, g: 248, b: 255 },
  gold: { r: 255, g: 215, b: 0 },
  goldenrod: { r: 218, g: 165, b: 32 },
  greenyellow: { r: 173, g: 255, b: 47 },
  honeydew: { r: 240, g: 255, b: 240 },
  hotpink: { r: 255, g: 105, b: 180 },
  indianred: { r: 205, g: 92, b: 92 },
  indigo: { r: 75, g: 0, b: 130 },
  ivory: { r: 255, g: 255, b: 240 },
  khaki: { r: 240, g: 230, b: 140 },
  lavender: { r: 230, g: 230, b: 250 },
  lavenderblush: { r: 255, g: 240, b: 245 },
  lawngreen: { r: 124, g: 252, b: 0 },
  lemonchiffon: { r: 255, g: 250, b: 205 },
  lightblue: { r: 173, g: 216, b: 230 },
  lightcoral: { r: 240, g: 128, b: 128 },
  lightcyan: { r: 224, g: 255, b: 255 },
  lightgoldenrodyellow: { r: 250, g: 250, b: 210 },
  lightgray: { r: 211, g: 211, b: 211 },
  lightgrey: { r: 211, g: 211, b: 211 },
  lightgreen: { r: 144, g: 238, b: 144 },
  lightpink: { r: 255, g: 182, b: 193 },
  lightsalmon: { r: 255, g: 160, b: 122 },
  lightseagreen: { r: 32, g: 178, b: 170 },
  lightskyblue: { r: 135, g: 206, b: 250 },
  lightslategray: { r: 119, g: 136, b: 153 },
  lightslategrey: { r: 119, g: 136, b: 153 },
  lightsteelblue: { r: 176, g: 196, b: 222 },
  lightyellow: { r: 255, g: 255, b: 224 },
  limegreen: { r: 50, g: 205, b: 50 },
  linen: { r: 250, g: 240, b: 230 },
  magenta: { r: 255, g: 0, b: 255 },
  mediumaquamarine: { r: 102, g: 205, b: 170 },
  mediumblue: { r: 0, g: 0, b: 205 },
  mediumorchid: { r: 186, g: 85, b: 211 },
  mediumpurple: { r: 147, g: 112, b: 219 },
  mediumseagreen: { r: 60, g: 179, b: 113 },
  mediumslateblue: { r: 123, g: 104, b: 238 },
  mediumspringgreen: { r: 0, g: 250, b: 154 },
  mediumturquoise: { r: 72, g: 209, b: 204 },
  mediumvioletred: { r: 199, g: 21, b: 133 },
  midnightblue: { r: 25, g: 25, b: 112 },
  mintcream: { r: 245, g: 255, b: 250 },
  mistyrose: { r: 255, g: 228, b: 225 },
  moccasin: { r: 255, g: 228, b: 181 },
  navajowhite: { r: 255, g: 222, b: 173 },
  oldlace: { r: 253, g: 245, b: 230 },
  olivedrab: { r: 107, g: 142, b: 35 },
  orange: { r: 255, g: 165, b: 0 },
  orangered: { r: 255, g: 69, b: 0 },
  orchid: { r: 218, g: 112, b: 214 },
  palegoldenrod: { r: 238, g: 232, b: 170 },
  palegreen: { r: 152, g: 251, b: 152 },
  paleturquoise: { r: 175, g: 238, b: 238 },
  palevioletred: { r: 219, g: 112, b: 147 },
  papayawhip: { r: 255, g: 239, b: 213 },
  peachpuff: { r: 255, g: 218, b: 185 },
  peru: { r: 205, g: 133, b: 63 },
  pink: { r: 255, g: 192, b: 203 },
  plum: { r: 221, g: 160, b: 221 },
  powderblue: { r: 176, g: 224, b: 230 },
  rebeccapurple: { r: 102, g: 51, b: 153 },
  rosybrown: { r: 188, g: 143, b: 143 },
  royalblue: { r: 65, g: 105, b: 225 },
  saddlebrown: { r: 139, g: 69, b: 19 },
  salmon: { r: 250, g: 128, b: 114 },
  sandybrown: { r: 244, g: 164, b: 96 },
  seagreen: { r: 46, g: 139, b: 87 },
  seashell: { r: 255, g: 245, b: 238 },
  sienna: { r: 160, g: 82, b: 45 },
  skyblue: { r: 135, g: 206, b: 235 },
  slateblue: { r: 106, g: 90, b: 205 },
  slategray: { r: 112, g: 128, b: 144 },
  slategrey: { r: 112, g: 128, b: 144 },
  snow: { r: 255, g: 250, b: 250 },
  springgreen: { r: 0, g: 255, b: 127 },
  steelblue: { r: 70, g: 130, b: 180 },
  tan: { r: 210, g: 180, b: 140 },
  thistle: { r: 216, g: 191, b: 216 },
  tomato: { r: 255, g: 99, b: 71 },
  turquoise: { r: 64, g: 224, b: 208 },
  violet: { r: 238, g: 130, b: 238 },
  wheat: { r: 245, g: 222, b: 179 },
  whitesmoke: { r: 245, g: 245, b: 245 },
  yellowgreen: { r: 154, g: 205, b: 50 },

  // Special
  transparent: { r: 0, g: 0, b: 0, a: 0 },
};

/**
 * Clamps a value between min and max
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Converts HSL color to RGB
 *
 * @param h - Hue (0-360)
 * @param s - Saturation (0-100)
 * @param l - Lightness (0-100)
 * @returns RGB color
 *
 * @example
 * ```typescript
 * const rgb = hslToRgb(180, 50, 50);
 * // { r: 64, g: 191, b: 191 }
 * ```
 */
export function hslToRgb(h: number, s: number, l: number): RGBColor {
  // Normalize inputs
  h = ((h % 360) + 360) % 360; // Ensure h is in [0, 360)
  s = clamp(s, 0, 100) / 100;
  l = clamp(l, 0, 100) / 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let r = 0,
    g = 0,
    b = 0;

  if (h >= 0 && h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (h >= 60 && h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (h >= 180 && h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (h >= 240 && h < 300) {
    r = x;
    g = 0;
    b = c;
  } else {
    r = c;
    g = 0;
    b = x;
  }

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

/**
 * Converts RGB color to HSL
 *
 * @param r - Red (0-255)
 * @param g - Green (0-255)
 * @param b - Blue (0-255)
 * @returns HSL color
 */
export function rgbToHsl(r: number, g: number, b: number): HSLColor {
  r = clamp(r, 0, 255) / 255;
  g = clamp(g, 0, 255) / 255;
  b = clamp(b, 0, 255) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

/**
 * Converts OKLCH color to RGB
 *
 * OKLCH is a perceptually uniform color space that provides:
 * - L: Lightness (0-100%)
 * - C: Chroma (0 to ~0.4, higher values are more saturated)
 * - H: Hue angle (0-360 degrees)
 *
 * @param l - Lightness (0-100)
 * @param c - Chroma (0 to ~0.4)
 * @param h - Hue angle (0-360)
 * @returns RGB color (values may be clamped if out of sRGB gamut)
 *
 * @example
 * ```typescript
 * const rgb = oklchToRgb(70, 0.15, 180);
 * // Returns teal-ish color
 * ```
 */
export function oklchToRgb(l: number, c: number, h: number): RGBColor {
  // Convert OKLCH to OKLab
  // L is in percentage, convert to 0-1
  const L = clamp(l, 0, 100) / 100;
  const C = Math.max(0, c);
  const H = ((h % 360) + 360) % 360;

  // Convert hue to radians
  const hRad = (H * Math.PI) / 180;

  // OKLab a and b from chroma and hue
  const a = C * Math.cos(hRad);
  const b = C * Math.sin(hRad);

  // OKLab to linear sRGB via OKLab to XYZ to linear sRGB
  // Using the OKLab color space conversion matrices

  // OKLab to LMS (cone response)
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;

  // LMS to linear sRGB (cube the values first to undo the cube root)
  const l3 = l_ * l_ * l_;
  const m3 = m_ * m_ * m_;
  const s3 = s_ * s_ * s_;

  // Matrix multiplication: LMS to linear sRGB
  const lr = 4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
  const lg = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
  const lb = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3;

  // Linear sRGB to sRGB (gamma correction)
  const toSrgb = (x: number): number => {
    if (x <= 0.0031308) {
      return x * 12.92;
    }
    return 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
  };

  // Apply gamma correction and convert to 0-255, clamping to sRGB gamut
  return {
    r: Math.round(clamp(toSrgb(lr) * 255, 0, 255)),
    g: Math.round(clamp(toSrgb(lg) * 255, 0, 255)),
    b: Math.round(clamp(toSrgb(lb) * 255, 0, 255)),
  };
}

/**
 * Converts RGB color to OKLCH
 *
 * @param r - Red (0-255)
 * @param g - Green (0-255)
 * @param b - Blue (0-255)
 * @returns OKLCH color
 */
export function rgbToOklch(r: number, g: number, b: number): OKLCHColor {
  // Normalize RGB to 0-1
  r = clamp(r, 0, 255) / 255;
  g = clamp(g, 0, 255) / 255;
  b = clamp(b, 0, 255) / 255;

  // sRGB to linear sRGB (inverse gamma correction)
  const toLinear = (x: number): number => {
    if (x <= 0.04045) {
      return x / 12.92;
    }
    return Math.pow((x + 0.055) / 1.055, 2.4);
  };

  const lr = toLinear(r);
  const lg = toLinear(g);
  const lb = toLinear(b);

  // Linear sRGB to LMS
  const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
  const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
  const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;

  // LMS to OKLab (cube root)
  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  // OKLab values
  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const okb = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;

  // OKLab to OKLCH
  const C = Math.sqrt(a * a + okb * okb);
  let H = (Math.atan2(okb, a) * 180) / Math.PI;
  if (H < 0) {
    H += 360;
  }

  return {
    l: Math.round(L * 100),
    c: Math.round(C * 1000) / 1000, // Round to 3 decimal places
    h: Math.round(H),
  };
}

/**
 * Parses a hex color string
 *
 * @param hex - Hex color string (#RGB, #RRGGBB, #RGBA, #RRGGBBAA)
 * @returns RGB color or null if invalid
 */
function parseHex(hex: string): RGBColor | null {
  if (!hex.startsWith('#')) {
    return null;
  }

  const value = hex.slice(1);

  // Validate that all characters are valid hex digits
  if (!/^[0-9a-f]+$/i.test(value)) {
    return null;
  }

  if (value.length === 3) {
    // #RGB
    const r = value[0];
    const g = value[1];
    const b = value[2];
    if (r && g && b) {
      return {
        r: parseInt(r + r, 16),
        g: parseInt(g + g, 16),
        b: parseInt(b + b, 16),
      };
    }
  } else if (value.length === 4) {
    // #RGBA
    const r = value[0];
    const g = value[1];
    const b = value[2];
    const a = value[3];
    if (r && g && b && a) {
      return {
        r: parseInt(r + r, 16),
        g: parseInt(g + g, 16),
        b: parseInt(b + b, 16),
        a: parseInt(a + a, 16) / 255,
      };
    }
  } else if (value.length === 6) {
    // #RRGGBB
    return {
      r: parseInt(value.slice(0, 2), 16),
      g: parseInt(value.slice(2, 4), 16),
      b: parseInt(value.slice(4, 6), 16),
    };
  } else if (value.length === 8) {
    // #RRGGBBAA
    return {
      r: parseInt(value.slice(0, 2), 16),
      g: parseInt(value.slice(2, 4), 16),
      b: parseInt(value.slice(4, 6), 16),
      a: parseInt(value.slice(6, 8), 16) / 255,
    };
  }

  return null;
}

/**
 * Parses an rgb() or rgba() color string
 *
 * Supports modern CSS syntax with spaces and commas:
 * - rgb(255, 128, 0)
 * - rgb(255 128 0)
 * - rgba(255, 128, 0, 0.5)
 * - rgb(255 128 0 / 0.5)
 * - rgb(100% 50% 0%)
 *
 * @param color - RGB(A) color string
 * @returns RGB color or null if invalid
 */
function parseRgb(color: string): RGBColor | null {
  // Match rgb() or rgba() with various syntaxes
  const rgbRegex =
    /^rgba?\(\s*(\d+%?)\s*[,\s]\s*(\d+%?)\s*[,\s]\s*(\d+%?)(?:\s*[,\/]\s*(\d*\.?\d+%?))?\s*\)$/i;
  const match = rgbRegex.exec(color);

  if (!match) {
    return null;
  }

  const parseValue = (val: string | undefined, isAlpha = false): number => {
    if (!val) return isAlpha ? 1 : 0;
    if (val.endsWith('%')) {
      const percent = parseFloat(val);
      return isAlpha ? percent / 100 : Math.round((percent / 100) * 255);
    }
    return isAlpha ? parseFloat(val) : parseInt(val, 10);
  };

  const r = parseValue(match[1]);
  const g = parseValue(match[2]);
  const b = parseValue(match[3]);
  const a = match[4] !== undefined ? parseValue(match[4], true) : undefined;

  if (isNaN(r) || isNaN(g) || isNaN(b)) {
    return null;
  }

  return {
    r: clamp(r, 0, 255),
    g: clamp(g, 0, 255),
    b: clamp(b, 0, 255),
    ...(a !== undefined && { a: clamp(a, 0, 1) }),
  };
}

/**
 * Parses an hsl() or hsla() color string
 *
 * Supports modern CSS syntax:
 * - hsl(180, 50%, 50%)
 * - hsl(180 50% 50%)
 * - hsla(180, 50%, 50%, 0.5)
 * - hsl(180 50% 50% / 0.5)
 * - hsl(180deg, 50%, 50%)
 * - hsl(0.5turn, 50%, 50%)
 *
 * @param color - HSL(A) color string
 * @returns RGB color or null if invalid
 */
function parseHsl(color: string): RGBColor | null {
  // Match hsl() or hsla() with various syntaxes
  // Note: hue can be negative, so we allow an optional minus sign
  const hslRegex =
    /^hsla?\(\s*(-?\d*\.?\d+)(deg|grad|rad|turn)?\s*[,\s]\s*(\d*\.?\d+)%\s*[,\s]\s*(\d*\.?\d+)%(?:\s*[,\/]\s*(\d*\.?\d+%?))?\s*\)$/i;
  const match = hslRegex.exec(color);

  if (!match) {
    return null;
  }

  // Parse hue with unit support
  let h = parseFloat(match[1] || '0');
  const hueUnit = match[2]?.toLowerCase();

  if (hueUnit === 'grad') {
    h = h * (360 / 400);
  } else if (hueUnit === 'rad') {
    h = h * (180 / Math.PI);
  } else if (hueUnit === 'turn') {
    h = h * 360;
  }
  // 'deg' or no unit is already in degrees

  const s = parseFloat(match[3] || '0');
  const l = parseFloat(match[4] || '0');

  // Parse alpha
  let a: number | undefined;
  if (match[5] !== undefined) {
    const alphaStr = match[5];
    if (alphaStr.endsWith('%')) {
      a = parseFloat(alphaStr) / 100;
    } else {
      a = parseFloat(alphaStr);
    }
  }

  if (isNaN(h) || isNaN(s) || isNaN(l)) {
    return null;
  }

  const rgb = hslToRgb(h, s, l);

  return {
    ...rgb,
    ...(a !== undefined && { a: clamp(a, 0, 1) }),
  };
}

/**
 * Parses an oklch() color string
 *
 * Supports modern CSS syntax:
 * - oklch(70% 0.15 180)
 * - oklch(70% 0.15 180 / 0.5)
 * - oklch(0.7 0.15 180deg)
 *
 * @param color - OKLCH color string
 * @returns RGB color or null if invalid
 */
function parseOklch(color: string): RGBColor | null {
  // Match oklch() with various syntaxes
  const oklchRegex =
    /^oklch\(\s*(\d*\.?\d+)(%?)\s+(\d*\.?\d+)\s+(\d*\.?\d+)(deg|grad|rad|turn)?(?:\s*\/\s*(\d*\.?\d+%?))?\s*\)$/i;
  const match = oklchRegex.exec(color);

  if (!match) {
    return null;
  }

  // Parse lightness (can be percentage or 0-1)
  let l = parseFloat(match[1] || '0');
  if (match[2] !== '%') {
    // If not percentage, it's 0-1, convert to percentage
    l = l * 100;
  }

  // Parse chroma (typically 0-0.4)
  const c = parseFloat(match[3] || '0');

  // Parse hue with unit support
  let h = parseFloat(match[4] || '0');
  const hueUnit = match[5]?.toLowerCase();

  if (hueUnit === 'grad') {
    h = h * (360 / 400);
  } else if (hueUnit === 'rad') {
    h = h * (180 / Math.PI);
  } else if (hueUnit === 'turn') {
    h = h * 360;
  }
  // 'deg' or no unit is already in degrees

  // Parse alpha
  let a: number | undefined;
  if (match[6] !== undefined) {
    const alphaStr = match[6];
    if (alphaStr.endsWith('%')) {
      a = parseFloat(alphaStr) / 100;
    } else {
      a = parseFloat(alphaStr);
    }
  }

  if (isNaN(l) || isNaN(c) || isNaN(h)) {
    return null;
  }

  const rgb = oklchToRgb(l, c, h);

  return {
    ...rgb,
    ...(a !== undefined && { a: clamp(a, 0, 1) }),
  };
}

/**
 * Parses a CSS color string to RGB values
 *
 * Supports:
 * - Hex colors: #RGB, #RRGGBB, #RGBA, #RRGGBBAA
 * - RGB colors: rgb(r, g, b), rgba(r, g, b, a)
 * - HSL colors: hsl(h, s%, l%), hsla(h, s%, l%, a)
 * - OKLCH colors: oklch(L% C H), oklch(L% C H / a)
 * - Named colors: all 147 CSS named colors
 *
 * @param color - CSS color string
 * @returns Parsed RGB color with success flag and original format
 *
 * @example
 * ```typescript
 * const result = parseColor('#ff0000');
 * // { success: true, color: { r: 255, g: 0, b: 0 }, originalFormat: 'hex' }
 *
 * const result2 = parseColor('hsl(180, 50%, 50%)');
 * // { success: true, color: { r: 64, g: 191, b: 191 }, originalFormat: 'hsl' }
 *
 * const result3 = parseColor('oklch(70% 0.15 180)');
 * // { success: true, color: { r: ..., g: ..., b: ... }, originalFormat: 'oklch' }
 * ```
 */
export function parseColor(color: string): ColorParseResult {
  if (!color || typeof color !== 'string') {
    return { success: false, color: { r: 0, g: 0, b: 0 } };
  }

  const trimmed = color.trim().toLowerCase();

  // Try named colors first (fast lookup)
  const named = CSS_NAMED_COLORS[trimmed];
  if (named) {
    return { success: true, color: { ...named }, originalFormat: 'named' };
  }

  // Try hex
  if (trimmed.startsWith('#')) {
    const hex = parseHex(trimmed);
    if (hex) {
      return { success: true, color: hex, originalFormat: 'hex' };
    }
  }

  // Try rgb/rgba
  if (trimmed.startsWith('rgb')) {
    const rgb = parseRgb(trimmed);
    if (rgb) {
      return { success: true, color: rgb, originalFormat: 'rgb' };
    }
  }

  // Try hsl/hsla
  if (trimmed.startsWith('hsl')) {
    const hsl = parseHsl(trimmed);
    if (hsl) {
      return { success: true, color: hsl, originalFormat: 'hsl' };
    }
  }

  // Try oklch
  if (trimmed.startsWith('oklch')) {
    const oklch = parseOklch(trimmed);
    if (oklch) {
      return { success: true, color: oklch, originalFormat: 'oklch' };
    }
  }

  // Failed to parse
  return { success: false, color: { r: 0, g: 0, b: 0 } };
}

/**
 * Parses a color string to RGB values (simple version)
 *
 * Returns just the RGB values, defaulting to black if parsing fails.
 * This is a convenience function for when you just need the color values.
 *
 * @param color - CSS color string
 * @returns RGB color object (defaults to black if parsing fails)
 *
 * @example
 * ```typescript
 * const color = parseColorToRgb('hsl(180, 50%, 50%)');
 * // { r: 64, g: 191, b: 191 }
 * ```
 */
export function parseColorToRgb(color: string): RGBColor {
  const result = parseColor(color);
  return result.color;
}

/**
 * Converts an RGB color to a hex string
 *
 * @param color - RGB color object
 * @param includeAlpha - Whether to include alpha channel (default: true if alpha is present)
 * @returns Hex color string
 *
 * @example
 * ```typescript
 * rgbToHex({ r: 255, g: 128, b: 0 });
 * // '#ff8000'
 *
 * rgbToHex({ r: 255, g: 128, b: 0, a: 0.5 });
 * // '#ff800080'
 * ```
 */
export function rgbToHex(color: RGBColor, includeAlpha?: boolean): string {
  const r = clamp(Math.round(color.r), 0, 255).toString(16).padStart(2, '0');
  const g = clamp(Math.round(color.g), 0, 255).toString(16).padStart(2, '0');
  const b = clamp(Math.round(color.b), 0, 255).toString(16).padStart(2, '0');

  if ((includeAlpha ?? color.a !== undefined) && color.a !== undefined) {
    const a = clamp(Math.round(color.a * 255), 0, 255)
      .toString(16)
      .padStart(2, '0');
    return `#${r}${g}${b}${a}`;
  }

  return `#${r}${g}${b}`;
}

/**
 * Converts an RGB color to an rgb() or rgba() string
 *
 * @param color - RGB color object
 * @returns CSS rgb/rgba string
 *
 * @example
 * ```typescript
 * rgbToString({ r: 255, g: 128, b: 0 });
 * // 'rgb(255, 128, 0)'
 *
 * rgbToString({ r: 255, g: 128, b: 0, a: 0.5 });
 * // 'rgba(255, 128, 0, 0.5)'
 * ```
 */
export function rgbToString(color: RGBColor): string {
  const r = clamp(Math.round(color.r), 0, 255);
  const g = clamp(Math.round(color.g), 0, 255);
  const b = clamp(Math.round(color.b), 0, 255);

  if (color.a !== undefined && color.a < 1) {
    return `rgba(${r}, ${g}, ${b}, ${color.a})`;
  }

  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Validates if a string is a valid CSS color
 *
 * @param color - CSS color string to validate
 * @returns True if the color is valid
 *
 * @example
 * ```typescript
 * isValidColor('#ff0000'); // true
 * isValidColor('hsl(180, 50%, 50%)'); // true
 * isValidColor('oklch(70% 0.15 180)'); // true
 * isValidColor('rebeccapurple'); // true
 * isValidColor('notacolor'); // false
 * ```
 */
export function isValidColor(color: string): boolean {
  return parseColor(color).success;
}

/**
 * Normalizes a color to hex format
 *
 * Takes any valid CSS color and converts it to hex format.
 * Useful for ensuring consistent color format in output.
 *
 * @param color - CSS color string
 * @returns Hex color string or null if invalid
 *
 * @example
 * ```typescript
 * normalizeToHex('rgb(255, 128, 0)');
 * // '#ff8000'
 *
 * normalizeToHex('hsl(180, 50%, 50%)');
 * // '#40bfbf'
 * ```
 */
export function normalizeToHex(color: string): string | null {
  const result = parseColor(color);
  if (!result.success) {
    return null;
  }
  return rgbToHex(result.color);
}

/**
 * Gets a list of all supported CSS named color names
 *
 * @returns Array of color names
 */
export function getNamedColorNames(): string[] {
  return Object.keys(CSS_NAMED_COLORS).filter((name) => name !== 'grey'); // Exclude duplicate 'grey'
}
