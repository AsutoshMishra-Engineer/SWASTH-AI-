import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classify } from '../functions/_lib/safety.js';
import { normalizeOdiaQuery } from '../functions/_lib/handler.js';

test('odia safety: emergency triggers on Odia chest pain and unconsciousness', () => {
  assert.equal(classify('ମୋ ଛାତିରେ ଯନ୍ତ୍ରଣା ହେଉଛି').type, 'emergency');
  assert.equal(classify('ସେ ଅଚେତ ହୋଇପଡିଛନ୍ତି').type, 'emergency');
  assert.equal(classify('ତାଙ୍କୁ ସାପ କାମୁଡ଼ିଛି').type, 'emergency');
  assert.equal(classify('ନିଶ୍ୱାସ ନେବାରେ କଷ୍ଟ ହେଉଛି').type, 'emergency');
});

test('odia safety: self-harm triggers on Odia suicide phrase', () => {
  assert.equal(classify('ମୋର ଆତ୍ମହତ୍ୟା କରିବାକୁ ଇଚ୍ଛା ହେଉଛି').type, 'selfharm');
});

test('odia safety: blocked triggers on Odia medicine dosage request', () => {
  assert.equal(classify('ଏହି ଔଷଧର ଡୋଜ୍ କେତେ').type, 'blocked');
});

test('odia normalization: enriches Odia symptoms for clinical search', () => {
  const enriched = normalizeOdiaQuery('ମୋର ମୁଣ୍ଡ ବିନ୍ଧୁଛି ଏବଂ ଜ୍ୱର ଅଛି');
  assert.match(enriched, /headache/);
  assert.match(enriched, /fever/);
});

test('odia normalization: leaves plain English untouched', () => {
  assert.equal(normalizeOdiaQuery('How to prevent malaria?'), 'How to prevent malaria?');
});
