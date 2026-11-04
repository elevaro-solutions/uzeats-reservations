import { deflateSync, inflateSync } from 'node:zlib';

/** Image ready to embed as a PDF XObject. */
export type PdfImage = {
  width: number;
  height: number;
  filter: 'FlateDecode' | 'DCTDecode';
  data: Buffer;
};

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function paeth(a: number, b: number, c: number) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

/** Decode an 8-bit gray / RGB / RGBA PNG and flatten it onto white as raw RGB. */
function decodePng(buf: Buffer): PdfImage | null {
  if (buf.length < 8 || !buf.subarray(0, 8).equals(PNG_SIGNATURE)) return null;
  let off = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = -1;
  let interlace = 0;
  const idat: Buffer[] = [];
  while (off + 8 <= buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString('ascii', off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8]!;
      colorType = data[9]!;
      interlace = data[12]!;
    } else if (type === 'IDAT') {
      idat.push(data);
    } else if (type === 'IEND') {
      break;
    }
    off += 12 + len;
  }
  const channels = ({ 0: 1, 2: 3, 4: 2, 6: 4 } as Record<number, number>)[colorType];
  if (!width || !height || bitDepth !== 8 || !channels || interlace !== 0 || !idat.length) {
    return null;
  }
  if (width * height > 4_000_000) return null;

  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const pixels = Buffer.alloc(height * stride);
  let prev = Buffer.alloc(stride);
  let pos = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[pos]!;
    const line = raw.subarray(pos + 1, pos + 1 + stride);
    const cur = pixels.subarray(y * stride, (y + 1) * stride);
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? cur[x - channels]! : 0;
      const b = prev[x]!;
      const c = x >= channels ? prev[x - channels]! : 0;
      const v = line[x]!;
      let out = v;
      if (filter === 1) out = v + a;
      else if (filter === 2) out = v + b;
      else if (filter === 3) out = v + ((a + b) >> 1);
      else if (filter === 4) out = v + paeth(a, b, c);
      cur[x] = out & 0xff;
    }
    prev = cur;
    pos += 1 + stride;
  }

  const rgb = Buffer.alloc(width * height * 3);
  for (let i = 0, p = 0; i < width * height; i++, p += channels) {
    let r: number;
    let g: number;
    let b: number;
    let alpha = 255;
    if (channels === 4) {
      r = pixels[p]!;
      g = pixels[p + 1]!;
      b = pixels[p + 2]!;
      alpha = pixels[p + 3]!;
    } else if (channels === 3) {
      r = pixels[p]!;
      g = pixels[p + 1]!;
      b = pixels[p + 2]!;
    } else {
      r = g = b = pixels[p]!;
      if (channels === 2) alpha = pixels[p + 1]!;
    }
    const k = alpha / 255;
    rgb[i * 3] = Math.round(r * k + 255 * (1 - k));
    rgb[i * 3 + 1] = Math.round(g * k + 255 * (1 - k));
    rgb[i * 3 + 2] = Math.round(b * k + 255 * (1 - k));
  }
  return { width, height, filter: 'FlateDecode', data: deflateSync(rgb) };
}

/** Read baseline / progressive JPEG dimensions; the bytes embed as-is with DCTDecode. */
function readJpeg(buf: Buffer): PdfImage | null {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let off = 2;
  while (off + 9 < buf.length) {
    if (buf[off] !== 0xff) return null;
    const marker = buf[off + 1]!;
    const len = buf.readUInt16BE(off + 2);
    if (marker >= 0xc0 && marker <= 0xc2) {
      const height = buf.readUInt16BE(off + 5);
      const width = buf.readUInt16BE(off + 7);
      const components = buf[off + 9];
      if (components !== 3) return null;
      return { width, height, filter: 'DCTDecode', data: buf };
    }
    off += 2 + len;
  }
  return null;
}

/** Turn a stored `data:image/png|jpeg;base64,…` signature into a PDF-embeddable image. */
export function signatureDataUrlToPdfImage(dataUrl: string | null | undefined): PdfImage | null {
  if (!dataUrl) return null;
  const match = /^data:image\/(png|jpe?g);base64,(.+)$/i.exec(dataUrl.trim());
  if (!match) return null;
  try {
    const bytes = Buffer.from(match[2]!, 'base64');
    return match[1]!.toLowerCase() === 'png' ? decodePng(bytes) : readJpeg(bytes);
  } catch {
    return null;
  }
}
