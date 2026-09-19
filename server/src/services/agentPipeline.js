import { v4 as uuidv4 } from 'uuid';
import { ingestionService } from './ingestionService.js';
import { preprocessService } from './preprocessService.js';
import { geminiService } from './geminiService.js';
import { huggingfaceService } from './huggingfaceService.js';
import { createAnalysis } from '../config/db.js';
import { isGeminiAvailable } from '../config/env.js';

export const agentPipeline = {
  /**
   * Run the full multi-step SentiAgent pipeline
   * @param {Object} options
   * @param {string} options.inputType - 'text' | 'url' | 'csv' | 'youtube'
   * @param {any} options.rawInput - text string, url string, csv buffer/string, or youtube url
   * @param {string} [options.title] - custom title
   * @param {string} options.userId - authenticated user ID
   * @param {Function} [options.onProgress] - SSE progress reporter callback
   */
  async run({ inputType, rawInput, title, userId, onProgress = () => {} }) {
    const analysisId = uuidv4();

    // ==========================================
    // STEP 1: INGEST
    // ==========================================
    onProgress({
      step: 'ingest',
      progress: 15,
      message: `Ingesting ${inputType.toUpperCase()} content...`
    });

    let ingested;
    switch (inputType) {
      case 'text':
        ingested = await ingestionService.ingestText(rawInput, title);
        break;
      case 'url':
        ingested = await ingestionService.ingestUrl(rawInput);
        break;
      case 'csv':
        ingested = await ingestionService.ingestCsv(rawInput, title);
        break;
      case 'youtube':
        ingested = await ingestionService.ingestYouTube(rawInput);
        break;
      default:
        throw new Error(`Unsupported input type: ${inputType}`);
    }

    const finalTitle = title || ingested.title || `${inputType.toUpperCase()} Analysis`;

    // ==========================================
    // STEP 2: PREPROCESS & CHUNK
    // ==========================================
    onProgress({
      step: 'preprocess',
      progress: 35,
      message: 'Cleaning noise, checking language, and chunking content...'
    });

    const preprocessed = preprocessService.preprocess(ingested);

    if (preprocessed.totalUnits === 0) {
      throw new Error('No valid text units remained after preprocessing.');
    }

    // ==========================================
    // STEP 3: ANALYZE (GEMINI OR FALLBACK)
    // ==========================================
    onProgress({
      step: 'analyze',
      progress: 60,
      message: isGeminiAvailable()
        ? 'Analyzing sentiment, emotions, sarcasm, and aspects with Gemini AI Agent...'
        : 'Gemini unconfigured. Running Hugging Face sentiment pipeline...'
    });

    let itemAnalyses = [];
    let isFallback = false;
    let provider = 'gemini';
    let modelName = 'gemini-3.5-flash-lite';

    if (isGeminiAvailable()) {
      try {
        const batches = preprocessed.batches || [preprocessed.units];

        for (let i = 0; i < batches.length; i++) {
          const batch = batches[i];
          const response = await geminiService.analyzeBatch(batch);
          modelName = response.modelUsed;

          if (Array.isArray(response.data)) {
            itemAnalyses.push(...response.data);
          } else if (response.data?.items && Array.isArray(response.data.items)) {
            itemAnalyses.push(...response.data.items);
          } else {
            itemAnalyses.push(response.data);
          }
        }
      } catch (geminiError) {
        console.warn('[Pipeline Warning] Primary Gemini analysis failed, switching to Hugging Face fallback:', geminiError.message);
        isFallback = true;
        provider = 'huggingface';
        onProgress({
          step: 'fallback',
          progress: 65,
          message: 'Gemini unavailable. Running local/Hugging Face fallback mode...'
        });
      }
    } else {
      isFallback = true;
      provider = 'huggingface';
    }

    // Run fallback if flagged
    if (isFallback || itemAnalyses.length === 0) {
      isFallback = true;
      provider = 'huggingface';
      itemAnalyses = [];

      const unitsToAnalyze = preprocessed.units.slice(0, 50); // limit for HF inference speed
      for (let idx = 0; idx < unitsToAnalyze.length; idx++) {
        const unit = unitsToAnalyze[idx];
        const analysis = await huggingfaceService.analyzeItem({
          id: unit.id || unit.index || (idx + 1),
          text: unit.text
        });
        itemAnalyses.push(analysis);
      }
      modelName = itemAnalyses[0]?.modelUsed || 'cardiffnlp/twitter-roberta-base-sentiment-latest';
    }

    // Merge original text with analyses and ensure nuanced 0-100 scoring
    const enrichedItems = itemAnalyses.map((res, i) => {
      const orig = preprocessed.units[i] || {};
      const sentiment = res.sentiment || 'neutral';
      const confidence = typeof res.confidence === 'number' ? res.confidence : 0.85;
      const isSarcastic = Boolean(res.sarcasm);

      let itemScore = typeof res.score === 'number' ? res.score : null;
      if (itemScore === null || isNaN(itemScore)) {
        if (isSarcastic) {
          itemScore = Math.max(8, Math.min(38, Math.round(30 - (confidence * 15))));
        } else if (sentiment === 'positive') {
          itemScore = Math.max(56, Math.min(98, Math.round(52 + (confidence * 38))));
        } else if (sentiment === 'negative') {
          itemScore = Math.max(5, Math.min(44, Math.round(48 - (confidence * 38))));
        } else {
          itemScore = 50;
        }
      }
      itemScore = Math.max(0, Math.min(100, Math.round(itemScore)));

      return {
        id: res.id || orig.id || orig.index || (i + 1),
        text: orig.text || '',
        sentiment,
        score: itemScore,
        confidence: parseFloat(confidence.toFixed(2)),
        emotions: res.emotions || { joy: 0.1, anger: 0.1, sadness: 0.1, fear: 0.1, surprise: 0.1, disgust: 0.1 },
        sarcasm: isSarcastic,
        sarcasmReason: res.sarcasmReason || null,
        aspects: Array.isArray(res.aspects) ? res.aspects : [],
        keyPhrases: Array.isArray(res.keyPhrases) ? res.keyPhrases : []
      };
    });

    // ==========================================
    // STEP 4: AGGREGATE
    // ==========================================
    onProgress({
      step: 'aggregate',
      progress: 80,
      message: 'Aggregating sentiment distributions, emotion radar, and theme patterns...'
    });

    const aggregated = this.aggregateResults(enrichedItems);

    // ==========================================
    // STEP 5: REFLECT AND SUMMARIZE
    // ==========================================
    onProgress({
      step: 'summarize',
      progress: 92,
      message: 'Synthesizing executive summary and strategic recommendations...'
    });

    let executiveSummary;
    let keyInsights;
    let recommendedActions;

    if (!isFallback && isGeminiAvailable()) {
      try {
        const reflection = await geminiService.reflectAndSummarize(aggregated, finalTitle, inputType);
        executiveSummary = reflection.executiveSummary;
        keyInsights = reflection.keyInsights;
        recommendedActions = reflection.recommendedActions;
      } catch (err) {
        console.warn('[Pipeline Warning] Gemini reflection failed, generating fallback summary:', err.message);
        const fallbackReflect = huggingfaceService.generateFallbackSummary(aggregated, finalTitle);
        executiveSummary = fallbackReflect.executiveSummary;
        keyInsights = fallbackReflect.keyInsights;
        recommendedActions = fallbackReflect.recommendedActions;
      }
    } else {
      const fallbackReflect = huggingfaceService.generateFallbackSummary(aggregated, finalTitle);
      executiveSummary = fallbackReflect.executiveSummary;
      keyInsights = fallbackReflect.keyInsights;
      recommendedActions = fallbackReflect.recommendedActions;
    }

    // Final Assembly with all aliases for seamless frontend compatibility
    const completeAnalysisResult = {
      id: analysisId,
      title: finalTitle,
      inputType,
      sourceReference: ingested.sourceReference || null,
      provider,
      modelUsed: modelName,
      isFallback,
      fallbackMode: isFallback,
      itemCount: enrichedItems.length,
      totalItems: enrichedItems.length,
      overallSentiment: aggregated.overallSentiment,
      overallScore: aggregated.overallScore, // 0 to 100 continuous score
      distribution: aggregated.distribution,
      sentimentDistribution: aggregated.distribution,
      averageConfidence: aggregated.averageConfidence,
      emotionRadar: aggregated.emotionRadar,
      dominantEmotion: aggregated.dominantEmotion,
      sarcasmRate: aggregated.sarcasmRate,
      sarcasmCount: aggregated.sarcasmCount,
      topPositiveThemes: aggregated.topPositiveThemes,
      topNegativeThemes: aggregated.topNegativeThemes,
      aspectBreakdown: aggregated.aspectBreakdown,
      executiveSummary,
      keyInsights,
      recommendedActions,
      items: enrichedItems,
      perItemResults: enrichedItems,
      createdAt: new Date().toISOString()
    };

    // ==========================================
    // STEP 6: PERSIST TO DATABASE
    // ==========================================
    if (userId) {
      try {
        createAnalysis({
          id: analysisId,
          userId,
          title: finalTitle,
          inputType,
          sourceReference: ingested.sourceReference || null,
          itemCount: enrichedItems.length,
          status: 'completed',
          isFallback: isFallback ? 1 : 0,
          resultsJson: JSON.stringify(completeAnalysisResult)
        });
      } catch (dbErr) {
        console.warn('[Pipeline Warning] Could not persist to DB (e.g. test or unregistered userId):', dbErr.message);
      }
    }

    onProgress({
      step: 'complete',
      progress: 100,
      message: 'Analysis complete! Results saved to dashboard history.',
      result: completeAnalysisResult
    });

    return completeAnalysisResult;
  },

  /**
   * Aggregate metrics across all items
   */
  aggregateResults(items) {
    const total = items.length || 1;
    let posCount = 0;
    let neuCount = 0;
    let negCount = 0;
    let sarcasmCount = 0;
    let confidenceSum = 0;
    let scoreSum = 0;

    const emotionsAccum = {
      joy: 0,
      anger: 0,
      sadness: 0,
      fear: 0,
      surprise: 0,
      disgust: 0
    };

    const positiveThemesMap = new Map();
    const negativeThemesMap = new Map();
    const aspectsMap = new Map();

    for (const item of items) {
      // Sentiments
      if (item.sentiment === 'positive') posCount++;
      else if (item.sentiment === 'negative') negCount++;
      else neuCount++;

      const conf = typeof item.confidence === 'number' ? item.confidence : 0.85;
      confidenceSum += conf;

      // Continuous score calculation per item
      let s = typeof item.score === 'number' ? item.score : null;
      if (s === null || isNaN(s)) {
        if (item.sarcasm) {
          s = Math.max(8, Math.min(38, Math.round(30 - (conf * 15))));
        } else if (item.sentiment === 'positive') {
          s = Math.max(56, Math.min(98, Math.round(52 + (conf * 38))));
        } else if (item.sentiment === 'negative') {
          s = Math.max(5, Math.min(44, Math.round(48 - (conf * 38))));
        } else {
          s = 50;
        }
      }
      scoreSum += s;

      // Sarcasm
      if (item.sarcasm) sarcasmCount++;

      // Emotions
      for (const [emo, val] of Object.entries(item.emotions || {})) {
        if (emotionsAccum[emo] !== undefined) {
          emotionsAccum[emo] += (typeof val === 'number' ? val : 0);
        }
      }

      // Themes / Key phrases
      const phrases = item.keyPhrases || [];
      for (const phrase of phrases) {
        const cleanPhrase = phrase.toLowerCase().trim();
        if (cleanPhrase.length < 3) continue;

        if (item.sentiment === 'positive') {
          positiveThemesMap.set(cleanPhrase, (positiveThemesMap.get(cleanPhrase) || 0) + 1);
        } else if (item.sentiment === 'negative') {
          negativeThemesMap.set(cleanPhrase, (negativeThemesMap.get(cleanPhrase) || 0) + 1);
        }
      }

      // Aspects
      const aspects = item.aspects || [];
      for (const asp of aspects) {
        const name = asp.aspect || 'General';
        if (!aspectsMap.has(name)) {
          aspectsMap.set(name, { aspect: name, positive: 0, neutral: 0, negative: 0, count: 0, avgConfidence: 0 });
        }
        const entry = aspectsMap.get(name);
        entry.count++;
        entry.avgConfidence = (entry.avgConfidence || conf);
        if (asp.sentiment === 'positive') entry.positive++;
        else if (asp.sentiment === 'negative') entry.negative++;
        else entry.neutral++;
      }
    }

    // Compute distribution percentages
    const distribution = {
      positiveCount: posCount,
      neutralCount: neuCount,
      negativeCount: negCount,
      positivePercent: Math.round((posCount / total) * 100),
      neutralPercent: Math.round((neuCount / total) * 100),
      negativePercent: Math.round((negCount / total) * 100)
    };

    // Calculate continuous overall score (0 to 100)
    const overallScore = Math.max(0, Math.min(100, Math.round(scoreSum / total)));

    // Derive overall sentiment based on continuous score and distribution balance
    let overallSentiment = 'neutral';
    if (overallScore >= 56) {
      overallSentiment = 'positive';
    } else if (overallScore <= 44) {
      overallSentiment = 'negative';
    } else {
      if (posCount > negCount) overallSentiment = 'positive';
      else if (negCount > posCount) overallSentiment = 'negative';
      else overallSentiment = 'neutral';
    }

    // Average emotion radar
    const emotionRadar = {};
    let dominantEmotion = 'joy';
    let maxEmotionVal = -1;

    for (const [emo, sum] of Object.entries(emotionsAccum)) {
      const avg = parseFloat((sum / total).toFixed(2));
      emotionRadar[emo] = avg;
      if (avg > maxEmotionVal) {
        maxEmotionVal = avg;
        dominantEmotion = emo;
      }
    }

    // Top themes sorted by frequency
    const topPositiveThemes = [...positiveThemesMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(entry => entry[0]);

    const topNegativeThemes = [...negativeThemesMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(entry => entry[0]);

    // Aspect breakdown array
    const aspectBreakdown = [...aspectsMap.values()].map(a => ({
      ...a,
      sentiment: a.positive >= a.negative && a.positive >= a.neutral ? 'positive' :
                 a.negative >= a.positive && a.negative >= a.neutral ? 'negative' : 'neutral'
    }));

    return {
      totalItems: total,
      overallSentiment,
      overallScore,
      distribution,
      sentimentDistribution: distribution,
      averageConfidence: parseFloat((confidenceSum / total).toFixed(2)),
      emotionRadar,
      dominantEmotion,
      sarcasmRate: Math.round((sarcasmCount / total) * 100),
      sarcasmCount,
      topPositiveThemes,
      topNegativeThemes,
      aspectBreakdown
    };
  }
};
