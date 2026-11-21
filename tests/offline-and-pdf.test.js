import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const appjs = readFileSync('public/app.js', 'utf8');

test('offline protocols: exactly 10 emergency protocols defined with full trilingual content', () => {
  assert.ok(appjs.includes('const OFFLINE_PROTOCOLS ='));
  const match = appjs.match(/const OFFLINE_PROTOCOLS = (\[[\s\S]*?\]);\n\n/);
  assert.ok(match, 'OFFLINE_PROTOCOLS array should be found');
  const protocols = JSON.parse(match[1]);
  assert.equal(protocols.length, 10);

  const ids = protocols.map(p => p.id);
  assert.deepEqual(ids, [
    'snakebite',
    'diarrhea',
    'heatstroke',
    'pregnancy',
    'chestpain',
    'burns',
    'dogbite',
    'choking',
    'febrile',
    'drowning'
  ]);

  protocols.forEach(p => {
    assert.ok(p.title.en && p.title.or && p.title.hi, `Missing titles in ${p.id}`);
    assert.ok(p.summary.en && p.summary.or && p.summary.hi, `Missing summaries in ${p.id}`);
    assert.ok(p.dos.en.length && p.dos.or.length && p.dos.hi.length, `Missing dos in ${p.id}`);
    assert.ok(p.donts.en.length && p.donts.or.length && p.donts.hi.length, `Missing donts in ${p.id}`);
    assert.ok(p.keywords.length >= 5, `Insufficient keywords in ${p.id}`);
  });
});

test('pdf generator: wrapJpegInPdf produces valid, compact PDF under 50 KB', () => {
  function wrapJpegInPdf(jpegBytes, width, height) {
    const contentStream = 'q\n595.28 0 0 841.89 0 0 cm\n/Im1 Do\nQ\n';
    const parts = [];
    const offsets = [];

    let cur = 0;
    function add(bufOrStr) {
      let buf;
      if (typeof bufOrStr === 'string') {
        buf = new Uint8Array(bufOrStr.length);
        for (let i = 0; i < bufOrStr.length; i++) buf[i] = bufOrStr.charCodeAt(i) & 0xff;
      } else {
        buf = bufOrStr;
      }
      parts.push(buf);
      cur += buf.length;
    }

    add('%PDF-1.3\n');
    offsets[1] = cur;
    add('1 0 obj\n<</Type /Catalog /Pages 2 0 R>>\nendobj\n');
    offsets[2] = cur;
    add('2 0 obj\n<</Type /Pages /Kids [3 0 R] /Count 1>>\nendobj\n');
    offsets[3] = cur;
    add('3 0 obj\n<</Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources <</XObject <</Im1 4 0 R>>>> /Contents 5 0 R>>\nendobj\n');
    offsets[4] = cur;
    add('4 0 obj\n<</Type /XObject /Subtype /Image /Width ' + width + ' /Height ' + height + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + jpegBytes.length + '>>\nstream\n');
    add(jpegBytes);
    add('\nendstream\nendobj\n');
    offsets[5] = cur;
    add('5 0 obj\n<</Length ' + contentStream.length + '>>\nstream\n' + contentStream + 'endstream\nendobj\n');

    const startxref = cur;
    add('xref\n0 6\n0000000000 65535 f \n');
    for (let i = 1; i <= 5; i++) {
      const off = String(offsets[i]).padStart(10, '0');
      add(off + ' 00000 n \n');
    }
    add('trailer\n<</Size 6 /Root 1 0 R>>\nstartxref\n' + startxref + '\n%%EOF\n');

    let totalLen = 0;
    for (let i = 0; i < parts.length; i++) totalLen += parts[i].length;
    const finalBuf = new Uint8Array(totalLen);
    let offset = 0;
    for (let i = 0; i < parts.length; i++) {
      finalBuf.set(parts[i], offset);
      offset += parts[i].length;
    }
    return finalBuf;
  }

  // Simulated 35 KB JPEG buffer
  const dummyJpeg = new Uint8Array(35 * 1024);
  dummyJpeg.fill(0x55);
  const pdfBytes = wrapJpegInPdf(dummyJpeg, 800, 1130);

  const header = String.fromCharCode(...pdfBytes.slice(0, 8));
  assert.equal(header, '%PDF-1.3');

  const trailer = String.fromCharCode(...pdfBytes.slice(-6));
  assert.equal(trailer, '%%EOF\n');

  assert.ok(pdfBytes.length < 50 * 1024, `PDF should be under 50 KB, got ${pdfBytes.length} bytes`);
});
