const fs = require('fs');
const path = require('path');

const pngPath = path.join(__dirname, '../icon.svg.png');
const icoPath = path.join(__dirname, '../public/favicon.ico');

if (!fs.existsSync(pngPath)) {
  console.error(`Source PNG file does not exist at: ${pngPath}`);
  process.exit(1);
}

const pngData = fs.readFileSync(pngPath);
const pngSize = pngData.length;

// Create the ICO header buffer
// 6 bytes header + 16 bytes directory entry = 22 bytes
const icoHeader = Buffer.alloc(22);

// Header
icoHeader.writeUInt16LE(0, 0);     // Reserved
icoHeader.writeUInt16LE(1, 2);     // Type (1 = ICO)
icoHeader.writeUInt16LE(1, 4);     // Count (1 image)

// Directory Entry
icoHeader.writeUInt8(32, 6);       // Width
icoHeader.writeUInt8(32, 7);       // Height
icoHeader.writeUInt8(0, 8);        // Color Count (0 if >= 8bpp)
icoHeader.writeUInt8(0, 9);        // Reserved
icoHeader.writeUInt16LE(1, 10);    // Planes (1)
icoHeader.writeUInt16LE(32, 12);   // Bit Count (32 bits per pixel)
icoHeader.writeUInt32LE(pngSize, 14); // Image size (BytesInRes)
icoHeader.writeUInt32LE(22, 18);   // Image offset (Header + 1 Directory Entry = 22)

// Combine header and image data
const icoData = Buffer.concat([icoHeader, pngData]);

// Write to public/favicon.ico
fs.writeFileSync(icoPath, icoData);
console.log(`Successfully created favicon.ico at ${icoPath} (${icoData.length} bytes)`);

// Delete temporary PNG
try {
  fs.unlinkSync(pngPath);
  console.log(`Cleaned up temporary file: ${pngPath}`);
} catch (e) {
  console.warn(`Could not delete temporary file: ${pngPath}`, e);
}
