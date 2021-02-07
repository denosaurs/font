import init, {
  from_bytes as fromBytes,
  horizontal_line_metrics as horizontalLineMetrics,
  lookup_glyph_index as lookupGlyphIndex,
  metrics_indexed as metricsIndexed,
  rasterize_indexed as rasterizeIndexed,
  scale_factor as scaleFactor,
  source,
  units_per_em as unitsPerEm,
  vertical_line_metrics as verticalLineMetrics,
} from "./wasm.js";

function memoize<A extends unknown[] | [], T>(
  fn: (...args: A) => T,
): (...args: A) => T {
  if (fn.length === 0) {
    let cache: T | undefined = undefined;

    return (...args: A): T => {
      if (cache === undefined) {
        cache = fn(...args);
      }

      return cache;
    };
  } else {
    const cache: Record<string, T> = {};

    return (...args: A): T => {
      const key = args.join();
      if (cache[key] === undefined) {
        cache[key] = fn(...args);
      }
  
      return cache[key];
    };
  }
}

await init(source);

/**
 * Settings for controlling specific font and layout behavior.
 */
export interface LoadOptions {
  /**
   * The default is true. This offsets glyphs relative to their position in their
   * scaled bounding box. This is required for laying out glyphs correctly, but
   * can be disabled to make some incorrect fonts crisper.
   */
  enableOffsetBoundingBox: boolean;
  /**
   * The default is 0. The index of the font to use if parsing a font collection.
   */
  collectionIndex: number;
  /**
   * The default is 40. The scale in px the font geometry is optimized for. Fonts
   * rendered at the scale defined here will be the most optimal in terms of looks
   * and performance. Glyphs rendered smaller than this scale will look the same
   * but perform slightly worse, while glyphs rendered larger than this will looks
   * worse but perform slightly better.
   */
  scale: number;
}

/**
 * Encapsulates all layout information associated with a glyph for a fixed scale.
 */
export interface Metrics {
  /**
   * Whole pixel offset of the left-most edge of the bitmap. This may be negative
   * to reflect the glyph is positioned to the left of the origin. 
   */
  xmin: number;
  /**
   * Whole pixel offset of the bottom-most edge of the bitmap. This may be negative
   * to refelct the glyph is positioned below the baseline.
   */
  ymin: number;
  /**
   * The width of the bitmap in whole pixels.
   */
  width: number;
  /**
   * The height of the bitmap in whole pixels.
   */
  height: number;
  /**
   * Advance width of the glyph in subpixels. Used in horizontal fonts.
   */
  advanceWidth: number;
  /**
   * Advance height of the glyph in subpixels. Used in vertical fonts.
   */
  advanceHeight: number;
  /**
   * The bounding box that contains the glyph's outline at the offsets specified
   * by the font. This is always a smaller box than the bitmap bounds.
   */
  bounds: OutlineBounds;
}

/**
 * Defines the bounds for a glyph's outline in subpixels. A glyph's outline is
 * always contained in its bitmap.
 */
export interface OutlineBounds {
  /**
   * Subpixel offset of the left-most edge of the glyph's outline.
   */
  xmin: number;
  /**
   * Subpixel offset of the bottom-most edge of the glyph's outline.
   */
  ymin: number;
  /**
   * The width of the outline in subpixels.
   */
  width: number;
  /**
   * The height of the outline in subpixels.
   */
  height: number;
}

/**
 * Metrics associated with line positioning.
 */
export interface LineMetrics {
  /**
   * The highest point that any glyph in the font extends to above the baseline.
   * Typically positive.
   */
  ascent: number;
  /**
   * The lowest point that any glyph in the font extends to below the baseline.
   * Typically negative.
   */
  descent: number;
  /**
   * The gap to leave between the descent of one line and the ascent of the next.
   * This is of course only a guideline given by the font's designers.
   */
  lineGap: number;
  /**
   * A precalculated value for the height or width of the line depending on if
   * the font is laid out horizontally or vertically. It's calculated by:
   * `ascent - descent + line_gap`.
   */
  newLineSize: number;
}

/**
 * The metrics and bitmap results of a rasterized glyph
 */
export interface RasterizeResult {
  /**
   * Sizing and positioning metadata for the rasterized glyph.
   */
  metrics: Metrics;
  /**
   * Coverage array for the glyph. Coverage is a linear scale where 0 represents
   * 0% coverage of that pixel by the glyph and 255 represents 100% coverage.
   * The array starts at the top left corner of the glyph.
   */
  bitmap: Uint8Array;
}

/**
 * Represents a font.
 */
export class Font {
  readonly #id: number;

  constructor(bytes: Uint8Array, {
    enableOffsetBoundingBox = true,
    collectionIndex = 0,
    scale = 40,
  }: LoadOptions = {
    enableOffsetBoundingBox: true,
    collectionIndex: 0,
    scale: 40,
  }) {
    this.#id = fromBytes(
      bytes,
      enableOffsetBoundingBox,
      collectionIndex,
      scale,
    );
  }

  /**
   * The new line height for the font. Only populated for fonts with vertical
   * text layout metrics. `undefined` if unpopulated.
   */
  horizontalLineMetrics(px: number): LineMetrics | undefined {
    return horizontalLineMetrics(this.#id, px);
  }

  /**
   * The new line height for the font. Only populated for fonts with horizontal
   * text layout metrics. `undefined` if unpopulated.
   */
  verticalLineMetrics(px: number): LineMetrics | undefined {
    return verticalLineMetrics(this.#id, px);
  }

  /**
   * Gets the font's units per em.
   */
  unitsPerEm(): number {
    return unitsPerEm(this.#id);
  }

  /**
   * Calculates the glyph's outline scale factor for a given px size.
   */
  scaleFactor(px: number): number {
    return scaleFactor(this.#id, px);
  }

  /**
   * Retrieves the layout metrics for the given character. If the character
   * isn't present in the font, then the layout for the font's default character
   * is returned instead.
   */
  metrics(character: string, px: number): Metrics {
    return this.metricsIndexed(this.lookupGlyphIndex(character), px);
  }

  /**
   * Retrieves the layout metrics at the given index. You normally want to be
   * using `metrics` instead, unless your glyphs are pre-indexed.
   */
  metricsIndexed(index: number, px: number): Metrics {
    return metricsIndexed(this.#id, index, px);
  }

  /**
   * Retrieves the layout metrics and rasterized bitmap for the given character.
   * If the character isn't present in the font, then the layout and bitmap for
   * the font's default character is returned instead.
   */
  rasterize(character: string, px: number): RasterizeResult {
    return this.rasterizeIndexed(this.lookupGlyphIndex(character), px);
  }

  /**
   * Retrieves the layout metrics and rasterized bitmap at the given index.
   * You normally want to be using `rasterize` instead, unless your
   * glyphs are pre-indexed.
   */
  rasterizeIndexed(index: number, px: number): RasterizeResult {
    return rasterizeIndexed(this.#id, index, px);
  }

  /**
   * Finds the internal glyph index for the given character. If the character
   * is not present in the font then 0 is returned.
   */
  lookupGlyphIndex(character: string): number {
    return lookupGlyphIndex(this.#id, character);
  }
}

/**
 * Represents a font which caches (memoizes) all returns, increasing performance.
 */
export class FontCached {
  readonly #id: number;

  horizontalLineMetrics: (px: number) => LineMetrics | undefined;
  verticalLineMetrics: (px: number) => LineMetrics | undefined;
  unitsPerEm: () => number;
  scaleFactor: (px: number) => number;
  metricsIndexed: (index: number, px: number) => Metrics;
  rasterizeIndexed: (index: number, px: number) => RasterizeResult;
  lookupGlyphIndex: (character: string) => number;

  constructor(bytes: Uint8Array, {
    enableOffsetBoundingBox = true,
    collectionIndex = 0,
    scale = 40,
  }: LoadOptions = {
    enableOffsetBoundingBox: true,
    collectionIndex: 0,
    scale: 40,
  }) {
    this.#id = fromBytes(
      bytes,
      enableOffsetBoundingBox,
      collectionIndex,
      scale,
    );

    this.horizontalLineMetrics = memoize((px) => horizontalLineMetrics(this.#id, px));
    this.verticalLineMetrics = memoize((px) => verticalLineMetrics(this.#id, px));
    this.unitsPerEm = memoize(() => unitsPerEm(this.#id));
    this.scaleFactor = memoize((px) => scaleFactor(this.#id, px));
    this.metricsIndexed = memoize((index, px) => metricsIndexed(this.#id, index, px));
    this.rasterizeIndexed = memoize((index, px) => rasterizeIndexed(this.#id, index, px));
    this.lookupGlyphIndex = memoize((character) => lookupGlyphIndex(this.#id, character));
  }

  metrics(character: string, px: number): Metrics {
    return this.metricsIndexed(this.lookupGlyphIndex(character), px);
  }

  rasterize(character: string, px: number): RasterizeResult {
    return this.rasterizeIndexed(this.lookupGlyphIndex(character), px);
  }
}
