#!/usr/bin/env node

// Cross-platform pack script for element plugins.
// Reads the plugin's package.json, stages package.json + dist/index.js,
// creates a .zip using only Node.js built-ins (no external tools needed).

import { readFileSync, writeFileSync, existsSync, rmSync, mkdirSync } from 'fs';
import { join } from 'path';
import { deflateRawSync } from 'zlib';

const pluginDir = process.cwd();
const pkg = JSON.parse(readFileSync(join(pluginDir, 'package.json'), 'utf8'));
const elementName = pkg.junctionrelay?.elementName;

if (!elementName) {
  console.error('ERROR: package.json missing junctionrelay.elementName');
  process.exit(1);
}

const distFile = join(pluginDir, 'dist', 'index.js');
if (!existsSync(distFile)) {
  console.error('ERROR: dist/index.js not found — run "npm run build" first');
  process.exit(1);
}

// Files to include in the zip (entryName → absolute path)
const files = [
  { name: `${elementName}/package.json`, path: join(pluginDir, 'package.json') },
  { name: `${elementName}/dist/index.js`, path: distFile },
];

// --- Minimal ZIP writer using Node.js built-ins ---

function createZip(entries) {
  const localHeaders = [];
  const centralHeaders = [];
  let offset = 0;

  for (const { name, data } of entries) {
    const nameBytes = Buffer.from(name, 'utf8');
    const compressed = deflateRawSync(data);
    const crc = crc32(data);

    // Local file header (30 bytes + name + compressed data)
    const local = Buffer.alloc(30 + nameBytes.length + compressed.length);
    local.writeUInt32LE(0x04034b50, 0);   // signature
    local.writeUInt16LE(20, 4);            // version needed
    local.writeUInt16LE(0, 6);             // flags
    local.writeUInt16LE(8, 8);             // compression: deflate
    local.writeUInt16LE(0, 10);            // mod time
    local.writeUInt16LE(0, 12);            // mod date
    local.writeUInt32LE(crc, 14);          // crc-32
    local.writeUInt32LE(compressed.length, 18);  // compressed size
    local.writeUInt32LE(data.length, 22);  // uncompressed size
    local.writeUInt16LE(nameBytes.length, 26);   // name length
    local.writeUInt16LE(0, 28);            // extra length
    nameBytes.copy(local, 30);
    compressed.copy(local, 30 + nameBytes.length);
    localHeaders.push(local);

    // Central directory header (46 bytes + name)
    const central = Buffer.alloc(46 + nameBytes.length);
    central.writeUInt32LE(0x02014b50, 0);  // signature
    central.writeUInt16LE(20, 4);          // version made by
    central.writeUInt16LE(20, 6);          // version needed
    central.writeUInt16LE(0, 8);           // flags
    central.writeUInt16LE(8, 10);          // compression: deflate
    central.writeUInt16LE(0, 12);          // mod time
    central.writeUInt16LE(0, 14);          // mod date
    central.writeUInt32LE(crc, 16);        // crc-32
    central.writeUInt32LE(compressed.length, 20);  // compressed size
    central.writeUInt32LE(data.length, 24);        // uncompressed size
    central.writeUInt16LE(nameBytes.length, 28);   // name length
    central.writeUInt16LE(0, 30);          // extra length
    central.writeUInt16LE(0, 32);          // comment length
    central.writeUInt16LE(0, 34);          // disk number
    central.writeUInt16LE(0, 36);          // internal attributes
    central.writeUInt32LE(0, 38);          // external attributes
    central.writeUInt32LE(offset, 42);     // local header offset
    nameBytes.copy(central, 46);
    centralHeaders.push(central);

    offset += local.length;
  }

  const centralDirOffset = offset;
  const centralDirSize = centralHeaders.reduce((s, b) => s + b.length, 0);

  // End of central directory (22 bytes)
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);              // signature
  eocd.writeUInt16LE(0, 4);                        // disk number
  eocd.writeUInt16LE(0, 6);                        // central dir disk
  eocd.writeUInt16LE(entries.length, 8);            // entries on disk
  eocd.writeUInt16LE(entries.length, 10);           // total entries
  eocd.writeUInt32LE(centralDirSize, 12);           // central dir size
  eocd.writeUInt32LE(centralDirOffset, 16);         // central dir offset
  eocd.writeUInt16LE(0, 20);                        // comment length

  return Buffer.concat([...localHeaders, ...centralHeaders, eocd]);
}

// CRC-32 (IEEE 802.3)
function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// --- Build and write the zip ---

const entries = files.map(({ name, path }) => ({
  name,
  data: readFileSync(path),
}));

const zipData = createZip(entries);
const zipFile = join(pluginDir, `${elementName}.zip`);
writeFileSync(zipFile, zipData);

console.log(`Packed: ${elementName}.zip`);
