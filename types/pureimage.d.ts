declare module 'pureimage' {
  // ######
  // https://github.com/joshmarinacci/node-pureimage/blob/master/src/image.ts

  export function make(w: number, h: number, options?: unknown): Bitmap;

  export type PNGOptions = {
    deflateLevel?: number,
    deflateStrategy?: number,
  }

  /** Encode the PNG image to output stream */
  export function encodePNGToStream(
    /** An instance of {@link Bitmap} to be encoded to PNG, `bitmap.data` must be a buffer of raw PNG data */
    bitmap: Bitmap,
    /** The stream to write the PNG file to */
    outstream: WriteStream,
    options: PNGOptions = {}
  ): Promise<void>;

  // ######
  // https://github.com/joshmarinacci/node-pureimage/blob/master/src/bitmap.ts

  export class Bitmap {
    public width: number;
    public height: number;
    public data: Uint8Array;
    private _context: Context;

    /**
     * Creates an instance of Bitmap.
     * @param {number} w      Width
     * @param {number} h      Height
     * @param {any}   options Currently unused
     * @memberof Bitmap
     */
    constructor(w: number, h: number, options?);

    /** Calculate Index */
    calculateIndex(
      /** X position */
      x: number,
      /** Y position */
      y: number
    );

    /** Set the RGBA(Red, Green, Blue, Alpha) values on an individual pixel level */
    setPixelRGBA(
      /** X axis position */
      x: number,
      /** Y axis position */
      y: number,
      /** A hex representation of the RGBA value of the pixel. See {@link NAMED_COLORS} for examples */
      rgba: number
    );

    /** Set the individual red, green, blue and alpha levels of an individual pixel */
    setPixelRGBA_i(
      /** X axis position */
      x: number,
      /** Y axis position */
      y: number,
      /** Red level */
      r: number,
      /** Green level */
      g: number,
      /** Blue level */
      b: number,
      /** Alpha level */
      a: number
    );

    /** Get the RGBA value of an individual pixel as a hexadecimal number(See {@link NAMED_COLORS} for examples) */
    getPixelRGBA(
      /** X axis position */
      x: number,
      /** Y axis position */
      y: number
    );

    getDebugPixelRGBA(
      /** X axis position */
      x: number,
      /** Y axis position */
      y: number
    );

    /**
     * Get Pixel RGBA Separate
     *
     * @ignore
     */
    getPixelRGBA_separate(
      /** X axis position */
      x: number,
      /** Y axis position */
      y: number
    );

    /**
     * {@link Context} factory. Creates a new {@link Context} instance object for the current bitmap object
     */
    getContext(type: string);

    _copySubBitmap(
      x: number,
      y: number,
      w: number,
      h: number
    );

    _pasteSubBitmap(
      src: Bitmap,
      x: number,
      y: number
    );

    _isValidCoords(x, y);

    validate_coords(x, y);
  }
}
