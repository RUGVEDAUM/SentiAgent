import express from 'express';
import { agentPipeline } from '../services/agentPipeline.js';
import { getUserAnalyses, getAnalysisById, deleteAnalysis, getDb } from '../config/db.js';
import { authenticateUser } from '../middleware/auth.js';
import { uploadCsv } from '../middleware/upload.js';

const router = express.Router();
router.use(authenticateUser);

// Normalize score safely into the 0..100 integer range
const normalize = (score) => {
  if (score == null || isNaN(score)) return 50;
  // If legacy negative scale -100..0
  if (score < 0) {
    return Math.max(0, Math.min(100, Math.round(((score + 100) / 200) * 100)));
  }
  // If 0..1 decimal scale (e.g. 0.85)
  if (score > 0 && score <= 1) {
    return Math.round(score * 100);
  }
  return Math.max(0, Math.min(100, Math.round(score)));
};

const resolveAnalysisInput = (req) => {
  let inputType = req.body.inputType;
  let rawInput = req.body.rawInput || req.body.content || req.body.text || req.body.url;
  let title = req.body.title;
  if (req.file) {
    inputType = 'csv';
    rawInput = req.file.buffer;
    title = title || req.file.originalname;
  }
  if (!inputType) throw new Error('Please specify an inputType (text, url, csv, youtube).');
  if (!rawInput) throw new Error('Please provide content or a file to analyze.');
  return { inputType, rawInput, title };
};

// POST /api/analyses (Synchronous)
router.post('/', uploadCsv.single('file'), async (req, res, next) => {
  try {
    const { inputType, rawInput, title } = resolveAnalysisInput(req);
    const result = await agentPipeline.run({ inputType, rawInput, title, userId: req.user.id });
    result.overallScore = normalize(result.overallScore);
    res.status(201).json({ success: true, analysis: result });
  } catch (err) { next(err); }
});

// POST /api/analyses/stream (SSE)
router.post('/stream', uploadCsv.single('file'), async (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no'
  });

  const send = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    if (typeof res.flush === 'function') res.flush();
  };

  try {
    const { inputType, rawInput, title } = resolveAnalysisInput(req);
    send('connected', { message: 'SSE stream connected.' });
    const result = await agentPipeline.run({
      inputType, rawInput, title, userId: req.user.id,
      onProgress: (p) => send('progress', p)
    });
    result.overallScore = normalize(result.overallScore);
    send('complete', { success: true, analysis: result });
    res.end();
  } catch (err) {
    send('error', { success: false, error: err.message || 'Analysis failed.' });
    res.end();
  }
});

// POST /api/analyses/compare
router.post('/compare', uploadCsv.none(), async (req, res, next) => {
  try {
    const { textA, textB, titleA = 'Version A', titleB = 'Version B' } = req.body;
    if (!textA || !textB) {
      return res.status(400).json({ success: false, error: 'Both textA and textB are required.' });
    }
    const [resultA, resultB] = await Promise.all([
      agentPipeline.run({ inputType: 'text', rawInput: textA, title: titleA, userId: req.user.id }),
      agentPipeline.run({ inputType: 'text', rawInput: textB, title: titleB, userId: req.user.id })
    ]);
    resultA.overallScore = normalize(resultA.overallScore);
    resultB.overallScore = normalize(resultB.overallScore);
    const scoreDelta = resultA.overallScore - resultB.overallScore;
    const winner = scoreDelta > 4 ? (titleA || 'Version A') : scoreDelta < -4 ? (titleB || 'Version B') : 'Tie / Neutral';
    res.status(201).json({
      success: true,
      comparison: { analysisA: resultA, analysisB: resultB, scoreDelta, winner }
    });
  } catch (err) { next(err); }
});

// GET /api/analyses — enriched list for history
router.get('/', (req, res, next) => {
  try {
    const db = getDb();
    const rows = db.prepare(
      `SELECT id, results_json, created_at FROM analyses WHERE user_id = ? ORDER BY created_at DESC`
    ).all(req.user.id);

    const analyses = rows.map(row => {
      let r = {};
      try { r = JSON.parse(row.results_json); } catch {}
      const totalItems = r.totalItems || r.itemCount || (r.items?.length) || 1;
      const sarcasmCount = typeof r.sarcasmCount === 'number' ? r.sarcasmCount : (r.items?.filter(i => i.sarcasm)?.length || 0);
      const sarcasmRate = typeof r.sarcasmRate === 'number' ? r.sarcasmRate : Math.round((sarcasmCount / totalItems) * 100);

      return {
        id: row.id,
        title: r.title || 'Untitled',
        inputType: r.inputType || 'text',
        totalItems,
        itemCount: totalItems,
        overallScore: normalize(r.overallScore),
        overallSentiment: r.overallSentiment || 'neutral',
        distribution: r.distribution || r.sentimentDistribution || {},
        sentimentDistribution: r.distribution || r.sentimentDistribution || {},
        sarcasmRate,
        sarcasmCount,
        createdAt: r.createdAt || row.created_at,
        modelUsed: r.modelUsed || '',
      };
    });

    res.json({ success: true, count: analyses.length, analyses });
  } catch (err) { next(err); }
});

// GET /api/analyses/:id — full result
router.get('/:id', (req, res, next) => {
  try {
    const row = getAnalysisById(req.params.id, req.user.id);
    if (!row) return res.status(404).json({ success: false, error: 'Analysis not found.' });
    const results = row.results || {};
    results.overallScore = normalize(results.overallScore);
    const totalItems = results.totalItems || results.itemCount || row.item_count || 1;
    const sarcasmCount = typeof results.sarcasmCount === 'number' ? results.sarcasmCount : (results.items?.filter(i => i.sarcasm)?.length || 0);
    const sarcasmRate = typeof results.sarcasmRate === 'number' ? results.sarcasmRate : Math.round((sarcasmCount / totalItems) * 100);

    res.json({
      success: true,
      analysis: {
        ...row,
        ...results,
        overallScore: results.overallScore,
        totalItems,
        itemCount: totalItems,
        distribution: results.distribution || results.sentimentDistribution || {},
        sentimentDistribution: results.distribution || results.sentimentDistribution || {},
        sarcasmCount,
        sarcasmRate,
        perItemResults: results.perItemResults || results.items || [],
        items: results.items || results.perItemResults || []
      }
    });
  } catch (err) { next(err); }
});

// DELETE /api/analyses/:id
router.delete('/:id', (req, res, next) => {
  try {
    const deleted = deleteAnalysis(req.params.id, req.user.id);
    if (!deleted) return res.status(404).json({ success: false, error: 'Analysis not found.' });
    res.json({ success: true, message: 'Analysis deleted successfully.' });
  } catch (err) { next(err); }
});

export default router;
