import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classify, looksLikeDosage, cleanAnswer } from '../functions/_lib/safety.js';

const EMERGENCY = [
  'I have chest pain and sweating', 'my father is having a heart attack', 'she cannot breathe properly',
  'he is not breathing', 'my child is unconscious', 'my mother had a seizure just now', 'there is heavy bleeding after delivery',
  'severe bleeding from the leg', 'I am vomiting blood', 'she is having a stroke', 'his face drooping on one side',
  'my son swallowed pesticide', 'someone was bitten by a snake', 'my baby is not moving in the womb', 'I am pregnant and have bleeding',
  'I took an overdose', 'my brother collapsed on the road', 'electric shock to a child', 'difficulty breathing since morning', 'he is poisoned',
];
const SELF_HARM = ['I want to die', 'I want to kill myself', 'thinking of suicide', 'I do not want to live anymore'];
const BLOCKED = [
  'what is the dosage of paracetamol', 'how many tablets should I take for fever', 'which medicine should I take for cough',
  'can you prescribe antibiotics', 'diagnose me please', 'do I have dengue', 'do I have a serious infection',
  'what disease do I have', 'I want to stop taking my medicine', 'should I skip my insulin', 'what dose of ORS for adults',
  'which antibiotic is best for sore throat', 'does my mother have diabetes', 'how much medicine to give a child', 'do you think I have malaria',
];
const OK = [
  'How can I prevent dengue?', 'What is ORS?', 'Is it true that vaccines cause autism?', 'When should I go to a doctor for diarrhoea?',
  'How does malaria spread?', 'What are danger signs in pregnancy?', 'Do antibiotics work on viral fever?', 'How often should I wash my hands?',
  'What foods are good for diabetes?', 'How can I reduce salt?', 'What are symptoms of tuberculosis?', 'How to keep drinking water safe in monsoon?',
  'Do I have to wash hands before eating?', 'What is blood pressure?', 'Why do mosquitoes breed in water?', 'What is a stroke?',
];

for (const m of EMERGENCY) test(`emergency: ${m}`, () => assert.equal(classify(m).type, 'emergency'));
for (const m of SELF_HARM) test(`selfharm: ${m}`, () => assert.equal(classify(m).type, 'selfharm'));
for (const m of BLOCKED) test(`blocked: ${m}`, () => assert.equal(classify(m).type, 'blocked'));
for (const m of OK) test(`ok: ${m}`, () => assert.equal(classify(m).type, 'ok'));

test('dosage guard', () => {
  assert.ok(looksLikeDosage('Take 500 mg twice a day'));
  assert.ok(looksLikeDosage('Give 2 tablets'));
  assert.ok(!looksLikeDosage('Eat less salt and exercise for 150 minutes a week.'));
});
test('cleanAnswer strips markdown', () => assert.equal(cleanAnswer('**Drink** `water`\n\n\n\n# now'), 'Drink water\n\n now'));
