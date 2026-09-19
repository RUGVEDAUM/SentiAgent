/**
 * Preprocessing Service:
 * Cleans text, removes noise, normalizes formatting, and chunks long documents / batches comments.
 */
export const preprocessService = {
  /**
   * Clean and normalize a single text snippet
   */
  cleanText(text) {
    if (!text || typeof text !== 'string') return '';

    return text
      // Replace non-breaking spaces and zero-width spaces
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .replace(/\u00A0/g, ' ')
      // Normalize common HTML entity leftovers
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      // Remove excess whitespace and newlines
      .replace(/[ \t]+/g, ' ')
      .replace(/\n\s*\n+/g, '\n\n')
      .trim();
  },

  /**
   * Chunk a long article or document into coherent sections
   * (~400-800 words per chunk with 50-word overlap)
   */
  chunkDocument(text, maxWords = 400, overlapWords = 50) {
    const cleaned = this.cleanText(text);
    if (!cleaned) return [];

    // If text is short, return as a single chunk
    const words = cleaned.split(/\s+/);
    if (words.length <= maxWords) {
      return [{
        index: 0,
        text: cleaned,
        wordCount: words.length
      }];
    }

    const chunks = [];
    let startIndex = 0;
    let chunkIndex = 0;

    while (startIndex < words.length) {
      const endIndex = Math.min(startIndex + maxWords, words.length);
      const chunkWords = words.slice(startIndex, endIndex);
      const chunkText = chunkWords.join(' ');

      chunks.push({
        index: chunkIndex++,
        text: chunkText,
        wordCount: chunkWords.length
      });

      if (endIndex >= words.length) break;
      startIndex += (maxWords - overlapWords);
    }

    return chunks;
  },

  /**
   * Batch an array of discrete comments or reviews
   * Grouping items (e.g. 5-10 per batch) optimizes Gemini throughput while preserving individual sentiment granularity
   */
  batchItems(items, batchSize = 10) {
    const cleanedItems = items
      .map((item, idx) => ({
        id: idx + 1,
        text: this.cleanText(item)
      }))
      .filter(item => item.text.length >= 3);

    const batches = [];
    for (let i = 0; i < cleanedItems.length; i += batchSize) {
      batches.push(cleanedItems.slice(i, i + batchSize));
    }

    return {
      totalItems: cleanedItems.length,
      cleanedItems,
      batches
    };
  },

  /**
   * Master preprocess function
   */
  preprocess(ingestedData) {
    const { inputType, items } = ingestedData;

    // Case A: Single continuous document (Text or Scraped URL)
    if (inputType === 'text' || inputType === 'url') {
      const fullText = items.join('\n\n');
      const chunks = this.chunkDocument(fullText);

      return {
        mode: 'document',
        inputType,
        totalUnits: chunks.length,
        units: chunks
      };
    }

    // Case B: Discrete collection (CSV rows or YouTube comments)
    const { totalItems, cleanedItems, batches } = this.batchItems(items, 10);

    return {
      mode: 'items',
      inputType,
      totalUnits: totalItems,
      units: cleanedItems,
      batches
    };
  }
};
