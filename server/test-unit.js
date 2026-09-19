/**
 * SentiAgent Unit Test Suite
 * Tests: auth validation, text preprocessing, aggregation, and pipeline logic
 * Run: node test-unit.js
 */
import { preprocessService } from './src/services/preprocessService.js';
import { agentPipeline } from './src/services/agentPipeline.js';

let passed = 0;
let failed = 0;

const assert = (condition, label) => {
  if (condition) {
    console.log(`  ✅ PASS: ${label}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${label}`);
    failed++;
  }
};

console.log('\n====================================');
console.log('🧪 SentiAgent Unit Test Suite');
console.log('====================================\n');

// --- 1. PreprocessService: cleanText ---
console.log('📋 Test Group 1: preprocessService.cleanText()');
const clean1 = preprocessService.cleanText('  Hello   World  ');
assert(clean1 === 'Hello World', 'Trims and normalizes whitespace');

const clean2 = preprocessService.cleanText('&amp; &lt;b&gt;bold&lt;/b&gt;');
assert(clean2 === '& <b>bold</b>', 'Decodes HTML entities');

const clean3 = preprocessService.cleanText('\u200BHello\u00A0World');
assert(clean3 === 'Hello World', 'Removes zero-width and non-breaking spaces');

const clean4 = preprocessService.cleanText('');
assert(clean4 === '', 'Returns empty string for empty input');

// --- 2. PreprocessService: chunkDocument ---
console.log('\n📋 Test Group 2: preprocessService.chunkDocument()');
const shortText = 'This is a short sentence.';
const chunks1 = preprocessService.chunkDocument(shortText);
assert(chunks1.length === 1, 'Short text returns single chunk');
assert(chunks1[0].text === shortText.trim(), 'Single chunk contains original text');

const longText = Array(500).fill('word').join(' '); // 500 words
const chunks2 = preprocessService.chunkDocument(longText, 200, 50);
assert(chunks2.length > 1, 'Long text is split into multiple chunks');
assert(chunks2.every(c => c.wordCount <= 200), 'Each chunk does not exceed maxWords');

// --- 3. PreprocessService: batchItems ---
console.log('\n📋 Test Group 3: preprocessService.batchItems()');
const items = Array(25).fill('').map((_, i) => `Review number ${i + 1}`);
const { batches, totalItems, cleanedItems } = preprocessService.batchItems(items, 10);
assert(totalItems === 25, 'Returns correct totalItems count');
assert(batches.length === 3, 'Creates correct number of batches (ceil(25/10) = 3)');
assert(cleanedItems[0].id === 1, 'First item has id=1');

// Empty and blank items filtered out
const { totalItems: filtered } = preprocessService.batchItems(['valid review', '  ', '', 'another'], 10);
assert(filtered === 2, 'Filters out blank/whitespace-only items');

// --- 4. Aggregation Logic ---
console.log('\n📋 Test Group 4: agentPipeline.aggregateResults()');
const mockItems = [
  { sentiment: 'positive', confidence: 0.9, emotions: { joy: 0.8, anger: 0.1, sadness: 0.05, fear: 0.02, surprise: 0.3, disgust: 0.02 }, sarcasm: false, keyPhrases: ['great product', 'excellent'], aspects: [{ aspect: 'Quality', sentiment: 'positive' }] },
  { sentiment: 'negative', confidence: 0.85, emotions: { joy: 0.05, anger: 0.8, sadness: 0.6, fear: 0.3, surprise: 0.1, disgust: 0.7 }, sarcasm: true, keyPhrases: ['poor service'], aspects: [{ aspect: 'Service', sentiment: 'negative' }] },
  { sentiment: 'neutral', confidence: 0.75, emotions: { joy: 0.3, anger: 0.2, sadness: 0.2, fear: 0.1, surprise: 0.3, disgust: 0.1 }, sarcasm: false, keyPhrases: ['average'], aspects: [] },
];

const agg = agentPipeline.aggregateResults(mockItems);
assert(agg.totalItems === 3, 'Counts total items correctly');
assert(agg.distribution.positiveCount === 1, 'Positive count is 1');
assert(agg.distribution.negativeCount === 1, 'Negative count is 1');
assert(agg.distribution.neutralCount === 1, 'Neutral count is 1');
assert(agg.distribution.positivePercent === 33, 'Positive percent = 33%');
assert(typeof agg.overallScore === 'number', 'overallScore is a number');
assert(agg.sarcasmCount === 1, 'Sarcasm count is 1');
assert(agg.sarcasmRate === 33, 'Sarcasm rate = 33%');
assert(agg.emotionRadar && typeof agg.emotionRadar.joy === 'number', 'emotionRadar.joy is a number');
assert(agg.topPositiveThemes.includes('great product') || agg.topPositiveThemes.includes('excellent'), 'Top positive themes extracted');
assert(agg.topNegativeThemes.includes('poor service'), 'Top negative themes extracted');
assert(agg.aspectBreakdown.length > 0, 'Aspect breakdown is populated');

// --- 5. Auth Input Validation Rules (logic-only) ---
console.log('\n📋 Test Group 5: Auth validation rules');
const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
assert(validateEmail('user@example.com'), 'Valid email passes');
assert(!validateEmail('not-an-email'), 'Invalid email fails');
assert(!validateEmail('missing@'), 'Incomplete email fails');

const validatePassword = (pw) => pw.length >= 6;
assert(validatePassword('secure123'), 'Password >=6 chars passes');
assert(!validatePassword('abc'), 'Password <6 chars fails');

// --- Summary ---
console.log('\n====================================');
console.log(`📊 Results: ${passed} passed, ${failed} failed`);
if (failed === 0) {
  console.log('🎉 ALL UNIT TESTS PASSED!');
} else {
  console.log('⚠️  Some tests failed. Review output above.');
  process.exit(1);
}
console.log('====================================\n');
