import axios from 'axios';
import { config, isGeminiAvailable } from '../config/env.js';

// Exponential backoff helper
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const withRetry = async (fn, maxAttempts = 3, label = 'Gemini') => {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const isRetryable = err.response?.status === 429 || err.response?.status === 503 ||
        (err.message && (err.message.includes('high demand') || err.message.includes('overloaded')));

      if (isRetryable && attempt < maxAttempts) {
        const delay = Math.pow(2, attempt - 1) * 1000 + Math.random() * 500;
        console.warn(`[${label}] Retry ${attempt}/${maxAttempts} after ${Math.round(delay)}ms: ${err.message}`);
        await sleep(delay);
        continue;
      }
      throw err;
    }
  }
};

export const geminiService = {
  async callGeminiApi(prompt, systemInstruction = null) {
    if (!isGeminiAvailable()) {
      throw new Error('GEMINI_API_KEY is not configured in server/.env');
    }

    // Models ordered by verified availability and low latency
    const candidateModels = [
      config.geminiModel,
      'gemini-3.5-flash-lite',
      'gemini-3.1-flash-lite',
      'gemini-flash-latest',
      'gemini-flash-lite-latest',
      'gemini-3.6-flash',
    ].filter(Boolean);

    let lastError = null;

    for (const model of candidateModels) {
      try {
        const result = await withRetry(async () => {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.geminiApiKey}`;
          const payload = {
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.15,
              topP: 0.95
            }
          };
          if (systemInstruction) {
            payload.systemInstruction = { parts: [{ text: systemInstruction }] };
          }
          const response = await axios.post(url, payload, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 50000
          });
          const textOutput = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (!textOutput) throw new Error(`Empty response from Gemini (${model})`);
          return { data: JSON.parse(textOutput), modelUsed: model };
        }, 2, `Gemini(${model})`);

        return result;
      } catch (err) {
        const errMsg = err.response?.data?.error?.message || err.message;
        lastError = new Error(`Gemini (${model}) failed: ${errMsg}`);

        // Skip to next model on 404 (not found), 400 (unsupported), or persistent rate limit
        if (err.response?.status === 404 || err.response?.status === 400 || err.response?.status === 429 || err.response?.status === 503) {
          continue;
        }
        break;
      }
    }

    throw lastError || new Error('All Gemini models failed');
  },

  async analyzeBatch(units) {
    const systemPrompt = `You are SentiAgent, an elite AI sentiment & emotion analysis engine.
Analyze the provided items and return a JSON array of analysis objects matching each item id.

For EACH item, return valid JSON with these exact fields:
- id: match the input id
- sentiment: "positive", "neutral", or "negative"
- score: continuous integer from 0 to 100 representing emotional valence:
    * 0-25: strongly negative / hostile / critical
    * 26-44: moderately / mildly negative
    * 45-55: balanced, mixed, or purely objective / neutral
    * 56-74: moderately / mildly positive
    * 75-100: strongly positive / delighted / enthusiastic
- confidence: float between 0.50 and 1.00
- emotions: object with keys { joy, anger, sadness, fear, surprise, disgust } each float 0.0 to 1.0 representing intensity
- sarcasm: boolean (true if statement contains sarcasm, irony, mock praise, or cynical understatement; otherwise false)
- sarcasmReason: if sarcasm is true, provide a clear 1-2 sentence explanation of the ironic contrast. If false, return null.
- aspects: array of [{ "aspect": string, "sentiment": "positive"|"neutral"|"negative", "snippet": string }]
- keyPhrases: array of 2-5 extracted keywords or key phrases

CRITICAL RULES FOR SARCASM & NUANCED SCORING:
1. Sarcasm Detection:
   - Identify mock enthusiasm, sarcastic praise, satirical gratitude, and hyperbolic positive phrases used to express frustration or criticism (e.g., "Oh wonderful, another crash!", "Thanks for wasting 3 hours of my life", "Customer support was top notch... if you love waiting forever", "What a brilliant idea to remove the only working feature").
   - When sarcasm is detected:
     a) "sarcasm" MUST be true.
     b) "sarcasmReason" MUST describe the contradiction between literal words and real sentiment.
     c) The true "sentiment" MUST be classified as "negative" (or "neutral" if truly ambivalent), NEVER "positive"!
     d) The "score" MUST be low (typically 8 to 35), reflecting the real negative experience.
     e) "emotions" MUST highlight anger, disgust, or sadness, not genuine joy.
2. Nuanced Scoring:
   - Avoid binary extremes (0 or 100) unless the text is completely unequivocal.
   - For mixed feedback (e.g. "Good screen but slow battery"), use a middle score like 48-58.
   - For mild praise, use 65-75. For ecstatic praise, use 85-98.
   - For mild complaints, use 35-44. For severe anger, use 5-25.`;

    const result = await this.callGeminiApi(
      `Analyze these items:\n${JSON.stringify(units, null, 2)}`,
      systemPrompt
    );
    return result;
  },

  async reflectAndSummarize(aggregatedData, originalTitle, inputType) {
    const systemPrompt = `You are SentiAgent's Executive Intelligence Synthesizer.
Review the aggregated metrics and return valid JSON with this exact structure:
{
  "executiveSummary": "A concise, executive-level 2-3 paragraph synthesis citing specific figures, dominant sentiment, sarcasm prevalence, and key emotional drivers.",
  "keyInsights": [
    "Specific analytical insight 1 with data point",
    "Specific analytical insight 2 with data point",
    "Specific analytical insight 3 with data point"
  ],
  "recommendedActions": [
    { "priority": "High", "title": "Action Title", "action": "Clear tactical step", "expectedImpact": "Quantifiable impact" },
    { "priority": "Medium", "title": "Action Title", "action": "Clear tactical step", "expectedImpact": "Quantifiable impact" },
    { "priority": "Medium", "title": "Action Title", "action": "Clear tactical step", "expectedImpact": "Quantifiable impact" }
  ]
}`;

    const result = await this.callGeminiApi(
      `Content Title: "${originalTitle}"\nContent Type: ${inputType}\nAggregated Metrics:\n${JSON.stringify(aggregatedData, null, 2)}`,
      systemPrompt
    );
    return result.data;
  }
};
