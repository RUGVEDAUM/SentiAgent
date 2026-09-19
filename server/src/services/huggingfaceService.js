import axios from 'axios';
import { config, isHuggingFaceAvailable } from '../config/env.js';

/**
 * Hugging Face Fallback Sentiment Service with Sarcasm Detection & Continuous Scoring
 */
export const huggingfaceService = {
  /**
   * Helper to query Hugging Face Inference API with fallback models
   */
  async queryModel(text, modelName) {
    const endpoints = [
      `https://router.huggingface.co/hf-inference/models/${modelName}`,
      `https://api-inference.huggingface.co/models/${modelName}`
    ];

    const headers = { 'Content-Type': 'application/json' };
    if (isHuggingFaceAvailable()) {
      headers['Authorization'] = `Bearer ${config.hfToken}`;
    }

    let lastError = null;

    for (const url of endpoints) {
      try {
        const response = await axios.post(
          url,
          { inputs: text.slice(0, 500) },
          { headers, timeout: 25000 }
        );
        if (response.data) return response.data;
      } catch (err) {
        lastError = err;
        if (err.response?.status === 503 && err.response?.data?.estimated_time) {
          const waitTime = Math.min(Math.ceil(err.response.data.estimated_time), 5);
          await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
          try {
            const retryRes = await axios.post(
              url,
              { inputs: text.slice(0, 500) },
              { headers, timeout: 25000 }
            );
            return retryRes.data;
          } catch (retryErr) {
            lastError = retryErr;
          }
        }
      }
    }

    throw lastError || new Error(`Hugging Face inference failed for ${modelName}`);
  },

  /**
   * Sarcasm and Irony rule-based detector for fallback / offline execution
   */
  detectSarcasm(text) {
    if (!text || typeof text !== 'string') return { isSarcastic: false, reason: null };
    const t = text.toLowerCase();

    // 1. Positive words paired with frustration, delays, crashes, or broken outcomes
    const sarcasticPositivePraise = /\b(oh\s+)?(great|brilliant|wonderful|fantastic|amazing|genius|superb|stellar|lovely|delightful)\b.*?\b(broken|broke|crash|crashed|delayed|delay|late|wait|waited|waiting|terrible|worst|useless|ruined|lost|never|nowhere|error|fail|failed|scam|waste|hours|slow|rude)\b/i;

    // 2. Love + negative activity (e.g. "love waiting", "love crashing")
    const loveNegativeActivity = /\b(love|loved|loving)\b.*?\b(waiting|broken|crashing|failing|error|spending hours|being ignored|hold time|delays)\b/i;

    // 3. Sarcastic gratitude (e.g. "thanks for nothing", "thanks a lot for ruining")
    const sarcasticGratitude = /\bthanks\s+(a\s+lot|so\s+much)?\s*(for\s+(nothing|ruining|breaking|ignoring|wasting|this headache|the delay|deleting))\b/i;

    // 4. Cynical idioms
    const cynicalIdioms = /\b(just\s+what\s+i\s+needed|what\s+a\s+(treat|surprise|joke)|top\s+notch\s+disaster|best\s+customer\s+service\s+ever\s+if)\b/i;

    // 5. Quotes around praise words indicating irony (e.g. "great" service, "helpful" support)
    const quoteIrony = /"(great|amazing|awesome|helpful|support|quality|brilliant|fast)"/i;

    // 6. Sarcastic emojis (🙄, 🙃)
    const sarcasticEmoji = /[\u{1F644}\u{1F643}]/u.test(text);

    if (sarcasticPositivePraise.test(t)) {
      return {
        isSarcastic: true,
        reason: 'Hyperbolic praise words used in combination with complaints of failure, delays, or broken functionality.'
      };
    }

    if (loveNegativeActivity.test(t)) {
      return {
        isSarcastic: true,
        reason: 'Contradiction: Expresses "love" toward an inherently frustrating experience (e.g. waiting or bugs).'
      };
    }

    if (sarcasticGratitude.test(t)) {
      return {
        isSarcastic: true,
        reason: 'Ironic gratitude used mockingly to criticize poor service or a negative outcome.'
      };
    }

    if (cynicalIdioms.test(t)) {
      return {
        isSarcastic: true,
        reason: 'Cynical rhetorical expression indicating dissatisfaction or irritation.'
      };
    }

    if (quoteIrony.test(text) || (sarcasticEmoji && (t.includes('great') || t.includes('good') || t.includes('fast')))) {
      return {
        isSarcastic: true,
        reason: 'Mock endorsement conveyed through ironic quotes or eye-rolling cues.'
      };
    }

    return { isSarcastic: false, reason: null };
  },

  /**
   * Compute a continuous 0-100 score based on sentiment, confidence, emotions, and sarcasm
   */
  calculateContinuousScore(sentiment, confidence, emotions, isSarcastic) {
    if (isSarcastic) {
      // Sarcasm indicates frustrated negative experience
      const angerWeight = emotions.anger || 0.5;
      const disgustWeight = emotions.disgust || 0.3;
      return Math.max(5, Math.min(35, Math.round(30 - (confidence * 12) - ((angerWeight + disgustWeight) * 8))));
    }

    if (sentiment === 'positive') {
      const joyWeight = emotions.joy || 0.6;
      return Math.max(56, Math.min(98, Math.round(52 + (confidence * 35) + (joyWeight * 12))));
    }

    if (sentiment === 'negative') {
      const angerWeight = emotions.anger || 0.5;
      const sadnessWeight = emotions.sadness || 0.4;
      return Math.max(5, Math.min(44, Math.round(48 - (confidence * 32) - ((angerWeight + sadnessWeight) / 2 * 10))));
    }

    // Neutral
    const skew = (emotions.joy || 0.2) - (emotions.sadness || 0.1);
    return Math.max(45, Math.min(55, Math.round(50 + (skew * 10))));
  },

  /**
   * Analyze single text item using Hugging Face
   */
  async analyzeItem(item) {
    const models = [
      'cardiffnlp/twitter-roberta-base-sentiment-latest',
      'distilbert/distilbert-base-uncased-finetuned-sst-2-english'
    ];

    let predictions = null;
    let modelUsed = null;

    for (const model of models) {
      try {
        const result = await this.queryModel(item.text, model);
        predictions = Array.isArray(result) && Array.isArray(result[0]) ? result[0] : result;
        if (Array.isArray(predictions) && predictions.length > 0) {
          modelUsed = model;
          break;
        }
      } catch (err) {
        continue;
      }
    }

    if (!predictions || !Array.isArray(predictions)) {
      return this.localHeuristicSentiment(item);
    }

    let best = predictions[0];
    for (const p of predictions) {
      if (p.score > best.score) best = p;
    }

    let sentiment = 'neutral';
    const labelLower = (best.label || '').toLowerCase();

    if (labelLower.includes('pos') || labelLower === 'label_2') {
      sentiment = 'positive';
    } else if (labelLower.includes('neg') || labelLower === 'label_0') {
      sentiment = 'negative';
    } else {
      sentiment = 'neutral';
    }

    const confidence = parseFloat((best.score || 0.8).toFixed(2));

    // Check for sarcasm
    const sarcasmCheck = this.detectSarcasm(item.text);
    let finalSentiment = sentiment;
    if (sarcasmCheck.isSarcastic) {
      finalSentiment = 'negative'; // Invert ironic praise to true negative sentiment
    }

    const emotions = this.deriveEmotionsFromSentiment(finalSentiment, confidence, item.text, sarcasmCheck.isSarcastic);
    const score = this.calculateContinuousScore(finalSentiment, confidence, emotions, sarcasmCheck.isSarcastic);

    return {
      id: item.id,
      sentiment: finalSentiment,
      score,
      confidence,
      emotions,
      sarcasm: sarcasmCheck.isSarcastic,
      sarcasmReason: sarcasmCheck.reason,
      aspects: this.extractBasicAspects(item.text, finalSentiment),
      keyPhrases: this.extractKeywords(item.text),
      modelUsed
    };
  },

  /**
   * Derive emotion radar intensities based on sentiment classification and sarcasm
   */
  deriveEmotionsFromSentiment(sentiment, confidence, text, isSarcastic = false) {
    const t = text.toLowerCase();
    const hasExclamation = t.includes('!');
    const hasQuestion = t.includes('?');

    if (isSarcastic) {
      return {
        joy: 0.05,
        anger: parseFloat((0.6 + confidence * 0.3).toFixed(2)),
        sadness: 0.25,
        fear: 0.05,
        surprise: 0.45,
        disgust: parseFloat((0.55 + confidence * 0.35).toFixed(2))
      };
    }

    if (sentiment === 'positive') {
      return {
        joy: parseFloat((confidence * 0.85).toFixed(2)),
        surprise: hasExclamation ? 0.45 : 0.2,
        anger: 0.04,
        sadness: 0.03,
        fear: 0.02,
        disgust: 0.02
      };
    }

    if (sentiment === 'negative') {
      const isAngry = t.includes('terrible') || t.includes('worst') || t.includes('hate') || hasExclamation;
      return {
        joy: 0.04,
        anger: isAngry ? parseFloat((confidence * 0.8).toFixed(2)) : 0.35,
        sadness: parseFloat((confidence * 0.65).toFixed(2)),
        disgust: parseFloat((confidence * 0.45).toFixed(2)),
        fear: 0.15,
        surprise: hasQuestion ? 0.35 : 0.1
      };
    }

    // Neutral
    return {
      joy: 0.2,
      anger: 0.1,
      sadness: 0.1,
      fear: 0.1,
      surprise: 0.2,
      disgust: 0.05
    };
  },

  /**
   * Basic keyword extraction for fallback mode
   */
  extractKeywords(text) {
    const stopwords = new Set([
      'the', 'and', 'for', 'with', 'this', 'that', 'have', 'from', 'they', 'will',
      'would', 'there', 'their', 'what', 'about', 'which', 'when', 'make', 'like',
      'time', 'just', 'know', 'take', 'person', 'into', 'year', 'your', 'good', 'some',
      'could', 'them', 'see', 'other', 'than', 'then', 'now', 'look', 'only', 'come', 'its'
    ]);

    const words = text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 3 && !stopwords.has(w));

    return [...new Set(words)].slice(0, 4);
  },

  /**
   * Basic aspect extraction for fallback mode
   */
  extractBasicAspects(text, sentiment) {
    const t = text.toLowerCase();
    const aspects = [];

    const aspectKeywords = {
      price: ['price', 'cost', 'expensive', 'cheap', 'worth', 'money', 'value'],
      quality: ['quality', 'build', 'durable', 'broke', 'material', 'finish'],
      service: ['service', 'support', 'staff', 'help', 'delivery', 'shipping'],
      usability: ['easy', 'hard', 'difficult', 'simple', 'intuitive', 'use']
    };

    for (const [category, words] of Object.entries(aspectKeywords)) {
      if (words.some(w => t.includes(w))) {
        aspects.push({
          aspect: category.charAt(0).toUpperCase() + category.slice(1),
          sentiment,
          snippet: text.slice(0, 80)
        });
      }
    }

    return aspects;
  },

  /**
   * Offline heuristic sentiment if HF token is also missing or offline
   */
  localHeuristicSentiment(item) {
    const t = item.text.toLowerCase();
    const positiveWords = ['great', 'excellent', 'love', 'good', 'amazing', 'perfect', 'awesome', 'best', 'fantastic', 'super', 'stellar'];
    const negativeWords = ['bad', 'terrible', 'worst', 'hate', 'awful', 'poor', 'broken', 'disappointing', 'horrible', 'waste', 'slow', 'delay', 'crash'];

    let posScore = 0;
    let negScore = 0;

    for (const pw of positiveWords) if (t.includes(pw)) posScore++;
    for (const nw of negativeWords) if (t.includes(nw)) negScore++;

    let sentiment = 'neutral';
    let confidence = 0.75;

    if (posScore > negScore) {
      sentiment = 'positive';
      confidence = Math.min(0.7 + (posScore * 0.08), 0.95);
    } else if (negScore > posScore) {
      sentiment = 'negative';
      confidence = Math.min(0.7 + (negScore * 0.08), 0.95);
    }

    // Check sarcasm
    const sarcasmCheck = this.detectSarcasm(item.text);
    if (sarcasmCheck.isSarcastic) {
      sentiment = 'negative';
    }

    const emotions = this.deriveEmotionsFromSentiment(sentiment, confidence, item.text, sarcasmCheck.isSarcastic);
    const score = this.calculateContinuousScore(sentiment, confidence, emotions, sarcasmCheck.isSarcastic);

    return {
      id: item.id,
      sentiment,
      score,
      confidence: parseFloat(confidence.toFixed(2)),
      emotions,
      sarcasm: sarcasmCheck.isSarcastic,
      sarcasmReason: sarcasmCheck.reason,
      aspects: this.extractBasicAspects(item.text, sentiment),
      keyPhrases: this.extractKeywords(item.text),
      modelUsed: 'heuristic-offline-fallback'
    };
  },

  /**
   * Generate fallback executive summary and recommendations
   */
  generateFallbackSummary(aggregatedData, originalTitle) {
    const posPercent = aggregatedData.distribution.positivePercent;
    const negPercent = aggregatedData.distribution.negativePercent;
    const topSentiment = aggregatedData.overallSentiment;
    const score = aggregatedData.overallScore;

    return {
      executiveSummary: `Content "${originalTitle}" exhibits an overall ${topSentiment.toUpperCase()} sentiment with a calibrated score of ${score}/100 (${posPercent}% positive vs ${negPercent}% negative across ${aggregatedData.totalItems} items). ${aggregatedData.sarcasmCount > 0 ? `Notably, ${aggregatedData.sarcasmCount} items (${aggregatedData.sarcasmRate}%) contained sarcastic or ironic language that was accounted for in the evaluation.` : ''} Key discussions centered around ${aggregatedData.topPositiveThemes.concat(aggregatedData.topNegativeThemes).slice(0, 3).join(', ') || 'overall experience'}.`,
      keyInsights: [
        `Calibrated sentiment index is ${score}/100 with an average confidence rating of ${(aggregatedData.averageConfidence * 100).toFixed(0)}%.`,
        `Dominant emotion driver is ${aggregatedData.dominantEmotion || 'Joy'} at ${(aggregatedData.emotionRadar[aggregatedData.dominantEmotion] * 100 || 50).toFixed(0)}% intensity.`,
        aggregatedData.sarcasmCount > 0
          ? `Detected ${aggregatedData.sarcasmCount} sarcastic comments (${aggregatedData.sarcasmRate}%), adjusting scores to prevent false positive inflation.`
          : `Analyzed ${aggregatedData.aspectBreakdown?.length || 0} distinct aspects across user feedback.`
      ],
      recommendedActions: [
        {
          priority: 'High',
          title: 'Address Critical Pain Points & Sarcastic Feedback',
          action: 'Audit negative feedback themes and implement targeted customer satisfaction responses.',
          expectedImpact: 'Mitigate recurring customer friction and improve user retention.'
        },
        {
          priority: 'Medium',
          title: 'Amplify High-Performing Strengths',
          action: 'Leverage the top positive themes in product marketing and community messaging.',
          expectedImpact: 'Reinforce brand positioning and highlight key differentiators.'
        },
        {
          priority: 'Medium',
          title: 'Establish Continuous Sentiment Monitoring',
          action: 'Set up recurring analysis checkpoints to track sentiment trend improvements over time.',
          expectedImpact: 'Measure ongoing impact of product or service modifications.'
        }
      ]
    };
  }
};
