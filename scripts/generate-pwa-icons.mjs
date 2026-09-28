import fs from 'fs';
import zlib from 'zlib';

// Function to encode raw RGBA buffer into a valid PNG file
function createPNG(width, height, rgbaBuffer) {
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // CRC32 table
  const crcTable = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) c = 0xedb88320 ^ (c >>> 1);
      else c = c >>> 1;
    }
    crcTable[n] = c;
  }

  function crc32(buf) {
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.alloc(4);
    const crcVal = crc32(Buffer.concat([typeBuf, data]));
    crcBuf.writeUInt32BE(crcVal, 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // 8 bits per channel
  ihdr.writeUInt8(6, 9); // Color type 6 (RGBA)
  ihdr.writeUInt8(0, 10); // Compression method 0
  ihdr.writeUInt8(0, 11); // Filter method 0
  ihdr.writeUInt8(0, 12); // Interlace method 0
  const ihdrChunk = makeChunk('IHDR', ihdr);

  // Scanlines with filter byte 0 (None)
  const scanlines = Buffer.alloc(height * (1 + width * 4));
  let srcOffset = 0;
  let dstOffset = 0;
  for (let y = 0; y < height; y++) {
    scanlines[dstOffset++] = 0; // Filter type: None
    for (let x = 0; x < width; x++) {
      scanlines[dstOffset++] = rgbaBuffer[srcOffset++];
      scanlines[dstOffset++] = rgbaBuffer[srcOffset++];
      scanlines[dstOffset++] = rgbaBuffer[srcOffset++];
      scanlines[dstOffset++] = rgbaBuffer[srcOffset++];
    }
  }

  const compressedData = zlib.deflateSync(scanlines, { level: 9 });
  const idatChunk = makeChunk('IDAT', compressedData);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Generate Kassa Finance icon (Emerald squircle with Wallet motif)
function renderIcon(size, isMaskable = false) {
  const buf = Buffer.alloc(size * size * 4);
  const scale = size / 512;
  const radius = isMaskable ? 0 : 112 * scale; // Maskable has full bleed

  function setPixel(x, y, r, g, b, a) {
    if (x < 0 || x >= size || y < 0 || y >= size) return;
    const idx = (Math.floor(y) * size + Math.floor(x)) * 4;
    // Simple alpha compositing
    const srcA = a / 255;
    const dstA = buf[idx + 3] / 255;
    const outA = srcA + dstA * (1 - srcA);
    if (outA > 0) {
      buf[idx] = Math.round((r * srcA + buf[idx] * dstA * (1 - srcA)) / outA);
      buf[idx + 1] = Math.round((g * srcA + buf[idx + 1] * dstA * (1 - srcA)) / outA);
      buf[idx + 2] = Math.round((b * srcA + buf[idx + 2] * dstA * (1 - srcA)) / outA);
      buf[idx + 3] = Math.round(outA * 255);
    }
  }

  // Draw background
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let inShape = true;
      if (!isMaskable) {
        // Rounded squircle distance
        const dx = Math.max(0, Math.max(radius - x, x - (size - radius)));
        const dy = Math.max(0, Math.max(radius - y, y - (size - radius)));
        if (dx * dx + dy * dy > radius * radius) {
          inShape = false;
        }
      }
      if (inShape) {
        // Emerald gradient: top-left #10b981 (16, 185, 129) to bottom-right #047857 (4, 120, 87)
        const t = (x + y) / (2 * size);
        const r = Math.round(16 * (1 - t) + 4 * t);
        const g = Math.round(185 * (1 - t) + 120 * t);
        const b = Math.round(129 * (1 - t) + 87 * t);
        setPixel(x, y, r, g, b, 255);
      }
    }
  }

  // Scale factor for wallet inside safe zone
  const walletScale = isMaskable ? 0.72 : 0.85;
  const cx = size / 2;
  const cy = size / 2;

  // Wallet rectangle coordinates
  const wWidth = 280 * scale * walletScale;
  const wHeight = 220 * scale * walletScale;
  const wLeft = cx - wWidth / 2 - (10 * scale);
  const wTop = cy - wHeight / 2 + (15 * scale);
  const wCorner = 28 * scale * walletScale;
  const strokeW = Math.max(2, Math.round(18 * scale * walletScale));

  // Draw wallet outline & fill
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const rx = x - wLeft;
      const ry = y - wTop;
      if (rx >= 0 && rx <= wWidth && ry >= 0 && ry <= wHeight) {
        // Check rounded corners
        const cdx = Math.max(0, Math.max(wCorner - rx, rx - (wWidth - wCorner)));
        const cdy = Math.max(0, Math.max(wCorner - ry, ry - (wHeight - wCorner)));
        const distSq = cdx * cdx + cdy * cdy;
        if (distSq <= wCorner * wCorner) {
          // Inside wallet: subtle white translucent tint
          setPixel(x, y, 255, 255, 255, 35);

          // Outline stroke
          const isEdge =
            rx < strokeW || rx > wWidth - strokeW ||
            ry < strokeW || ry > wHeight - strokeW ||
            (distSq > (wCorner - strokeW) * (wCorner - strokeW));
          if (isEdge) {
            setPixel(x, y, 255, 255, 255, 255);
          }
        }
      }
    }
  }

  // Wallet flap / latch
  const fWidth = 84 * scale * walletScale;
  const fHeight = 64 * scale * walletScale;
  const fLeft = wLeft + wWidth - (fWidth * 0.7);
  const fTop = cy - fHeight / 2 + (15 * scale);
  const fCorner = 18 * scale * walletScale;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const rx = x - fLeft;
      const ry = y - fTop;
      if (rx >= 0 && rx <= fWidth && ry >= 0 && ry <= fHeight) {
        const cdx = Math.max(0, Math.max(fCorner - rx, rx - (fWidth - fCorner)));
        const cdy = Math.max(0, Math.max(fCorner - ry, ry - (fHeight - fCorner)));
        if (cdx * cdx + cdy * cdy <= fCorner * fCorner) {
          // Flap solid white
          setPixel(x, y, 255, 255, 255, 255);
        }
      }
    }
  }

  // Flap button / gold-emerald dot
  const btnX = fLeft + fWidth * 0.45;
  const btnY = fTop + fHeight / 2;
  const btnR = 10 * scale * walletScale;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - btnX;
      const dy = y - btnY;
      if (dx * dx + dy * dy <= btnR * btnR) {
        setPixel(x, y, 4, 120, 87, 255);
      }
    }
  }

  return createPNG(size, size, buf);
}

// Generate all target PNG sizes
fs.writeFileSync('public/pwa-192x192.png', renderIcon(192, false));
fs.writeFileSync('public/pwa-512x512.png', renderIcon(512, false));
fs.writeFileSync('public/pwa-maskable-512x512.png', renderIcon(512, true));
fs.writeFileSync('public/apple-touch-icon.png', renderIcon(180, false));
fs.writeFileSync('public/favicon.ico', renderIcon(64, false));
console.log('Successfully generated all PWA icons!');
