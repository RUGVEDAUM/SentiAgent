import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from server root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  port: parseInt(process.env.PORT, 10) || 5000,
  jwtSecret: process.env.JWT_SECRET || 'sentiagent_super_secure_jwt_secret_key_change_in_production',
  geminiApiKey: (process.env.GEMINI_API_KEY || '').trim(),
  hfToken: (process.env.HF_TOKEN || '').trim(),
  youtubeApiKey: (process.env.YOUTUBE_API_KEY || '').trim(),
  geminiModel: process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
  geminiFallbackModel: process.env.GEMINI_FALLBACK_MODEL || 'gemini-3.1-flash-lite',
};

export const isGeminiAvailable = () => Boolean(config.geminiApiKey && config.geminiApiKey.length > 5);
export const isHuggingFaceAvailable = () => Boolean(config.hfToken && config.hfToken.length > 5);
export const isYouTubeAvailable = () => Boolean(config.youtubeApiKey && config.youtubeApiKey.length > 5);

export const getAvailableFeatures = () => ({
  gemini: {
    available: isGeminiAvailable(),
    model: config.geminiModel,
    description: 'Primary AI: Structured sentiment, emotion radar, sarcasm, and reflection'
  },
  huggingFace: {
    available: isHuggingFaceAvailable(),
    models: ['cardiffnlp/twitter-roberta-base-sentiment-latest', 'distilbert-base-uncased-finetuned-sst-2-english'],
    description: 'Fallback AI: Used automatically if Gemini fails or is unconfigured'
  },
  youtube: {
    available: isYouTubeAvailable(),
    description: 'YouTube Data API v3: Fetch and analyze video comments'
  },
  urlScraping: {
    available: true,
    description: 'Web article scraping via Cheerio'
  },
  csvUpload: {
    available: true,
    description: 'CSV reviews/comments dataset ingestion'
  }
});
