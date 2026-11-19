import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classify, MESSAGES_HI } from '../functions/_lib/safety.js';
import { normalizeHindiQuery } from '../functions/_lib/handler.js';

test('hindi safety: emergency triggers on Hindi chest pain, heart attack, and breathing trouble', () => {
  assert.equal(classify('मेरे सीने में तेज दर्द हो रहा है').type, 'emergency');
  assert.equal(classify('उन्हें सांस लेने में दिक्कत हो रही है').type, 'emergency');
  assert.equal(classify('मरीज बेहोश हो गया है').type, 'emergency');
  assert.equal(classify('सांप ने काट लिया है').type, 'emergency');
  assert.equal(classify('हार्ट अटैक के लक्षण लग रहे हैं').type, 'emergency');
});

test('hindi safety: self-harm triggers on Hindi suicide phrases', () => {
  assert.equal(classify('मैं आत्महत्या करना चाहता हूँ').type, 'selfharm');
  assert.equal(classify('मुझे खुदकुशी करनी है').type, 'selfharm');
});

test('hindi safety: blocked triggers on Hindi medicine dosage and prescription requests', () => {
  assert.equal(classify('पैरासिटामोल की कितनी खुराक लेनी चाहिए').type, 'blocked');
  assert.equal(classify('बुखार के लिए कौन सी दवा लिख दो').type, 'blocked');
  assert.equal(classify('मुझे कौन सी बीमारी है').type, 'blocked');
});

test('hindi normalization: enriches Hindi symptoms for clinical RAG search', () => {
  const enriched = normalizeHindiQuery('मुझे बुखार और सिरदर्द है');
  assert.match(enriched, /fever/);
  assert.match(enriched, /headache/);

  const enriched2 = normalizeHindiQuery('पेट दर्द और उल्टी हो रही है');
  assert.match(enriched2, /stomach pain/);
  assert.match(enriched2, /vomiting/);
});

test('hindi normalization: leaves plain English untouched', () => {
  assert.equal(normalizeHindiQuery('How to prevent malaria?'), 'How to prevent malaria?');
});

test('hindi MESSAGES_HI contains certified clinical emergency and dosage responses', () => {
  assert.match(MESSAGES_HI.emergency, /108/);
  assert.match(MESSAGES_HI.emergency, /112/);
  assert.match(MESSAGES_HI.emergency, /आपातकालीन/);

  assert.match(MESSAGES_HI.blocked, /डॉक्टर/);
  assert.match(MESSAGES_HI.blocked, /खुराक/);

  assert.match(MESSAGES_HI.selfharm, /Tele-MANAS/);
  assert.match(MESSAGES_HI.selfharm, /14416/);
});
