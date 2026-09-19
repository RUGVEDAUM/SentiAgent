import axios from 'axios';
import * as cheerio from 'cheerio';
import Papa from 'papaparse';
import { config, isYouTubeAvailable } from '../config/env.js';

/**
 * Extract YouTube Video ID from various URL formats
 * (e.g. youtube.com/watch?v=ID, youtu.be/ID, youtube.com/shorts/ID)
 */
export const extractYouTubeVideoId = (url) => {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();

  const patterns = [
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([^"&?\/\s]{11})/i,
    /^([a-zA-Z0-9_-]{11})$/ // If raw 11-char ID was passed
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
};

/**
 * Ingestion Service: handles Text, URL scraping, CSV parsing, and YouTube comments
 */
export const ingestionService = {
  /**
   * 1. Ingest plain text
   */
  async ingestText(text, title = 'Direct Text Submission') {
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      throw new Error('Input text cannot be empty.');
    }
    const clean = text.trim();
    return {
      inputType: 'text',
      title: title || 'Text Analysis',
      sourceReference: clean.slice(0, 80) + (clean.length > 80 ? '...' : ''),
      items: [clean],
      rawContent: clean
    };
  },

  /**
   * 2. Ingest & scrape web article URL
   */
  async ingestUrl(url) {
    if (!url || typeof url !== 'string') {
      throw new Error('A valid article URL is required.');
    }

    const trimmedUrl = url.trim();
    if (!/^https?:\/\//i.test(trimmedUrl)) {
      throw new Error('URL must start with http:// or https://');
    }

    try {
      const response = await axios.get(trimmedUrl, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9'
        }
      });

      const $ = cheerio.load(response.data);

      // Remove non-content elements
      $('script, style, noscript, nav, header, footer, aside, iframe, svg, form, button').remove();
      $('[class*="cookie"], [id*="cookie"], [class*="popup"], [class*="banner"], [class*="modal"]').remove();

      // Extract title
      const pageTitle =
        $('meta[property="og:title"]').attr('content') ||
        $('h1').first().text().trim() ||
        $('title').text().trim() ||
        'Scraped Web Article';

      // Extract article/main text
      let contentText = '';
      if ($('article').length > 0) {
        contentText = $('article').text();
      } else if ($('main').length > 0) {
        contentText = $('main').text();
      } else if ($('.post-content, .entry-content, .article-content, #content').length > 0) {
        contentText = $('.post-content, .entry-content, .article-content, #content').first().text();
      } else {
        // Fallback to all paragraphs
        const paragraphs = [];
        $('p').each((_, el) => {
          const pText = $(el).text().trim();
          if (pText.length > 20) {
            paragraphs.push(pText);
          }
        });
        contentText = paragraphs.join('\n\n');
      }

      // Clean excessive whitespace
      const cleaned = contentText.replace(/\s+/g, ' ').trim();

      if (cleaned.length < 50) {
        throw new Error('Could not extract sufficient text content from this URL. The page might require JavaScript or login.');
      }

      return {
        inputType: 'url',
        title: pageTitle.slice(0, 150),
        sourceReference: trimmedUrl,
        items: [cleaned],
        rawContent: cleaned
      };
    } catch (err) {
      if (err.response) {
        throw new Error(`Failed to fetch URL: HTTP ${err.response.status} (${err.response.statusText})`);
      }
      throw new Error(`URL scraping failed: ${err.message}`);
    }
  },

  /**
   * 3. Ingest CSV (from buffer or string)
   */
  async ingestCsv(csvData, originalFilename = 'dataset.csv') {
    let csvString = '';
    if (Buffer.isBuffer(csvData)) {
      csvString = csvData.toString('utf-8');
    } else if (typeof csvData === 'string') {
      csvString = csvData;
    } else {
      throw new Error('Invalid CSV data format.');
    }

    if (!csvString.trim()) {
      throw new Error('Uploaded CSV file is empty.');
    }

    const parsed = Papa.parse(csvString.trim(), {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false
    });

    let items = [];

    if (parsed.data && parsed.data.length > 0) {
      const headers = Object.keys(parsed.data[0]);

      // Priority candidates for sentiment text column
      const candidates = [
        'review', 'reviews', 'comment', 'comments', 'text', 'content',
        'feedback', 'message', 'description', 'body', 'tweet', 'sentence'
      ];

      let targetColumn = headers.find(h =>
        candidates.includes(h.toLowerCase().trim())
      );

      // Fallback: column with highest average string length
      if (!targetColumn) {
        let maxAvgLength = 0;
        for (const header of headers) {
          const sampleValues = parsed.data.slice(0, 30).map(row => String(row[header] || ''));
          const avgLen = sampleValues.reduce((acc, s) => acc + s.length, 0) / (sampleValues.length || 1);
          if (avgLen > maxAvgLength) {
            maxAvgLength = avgLen;
            targetColumn = header;
          }
        }
      }

      if (targetColumn) {
        items = parsed.data
          .map(row => (row[targetColumn] ? String(row[targetColumn]).trim() : ''))
          .filter(txt => txt.length >= 3);
      }
    }

    // Fallback if header parsing yielded nothing: parse without header
    if (items.length === 0) {
      const unheadered = Papa.parse(csvString.trim(), {
        header: false,
        skipEmptyLines: true
      });
      if (unheadered.data && unheadered.data.length > 0) {
        items = unheadered.data
          .map(row => (Array.isArray(row) ? row[0] : row))
          .map(cell => (cell ? String(cell).trim() : ''))
          .filter(txt => txt.length >= 3);
      }
    }

    if (items.length === 0) {
      throw new Error('No valid text rows or review comments could be parsed from the CSV.');
    }

    // Limit to reasonable batch size for analysis (e.g. first 100 rows)
    const MAX_ITEMS = 100;
    const finalItems = items.slice(0, MAX_ITEMS);

    return {
      inputType: 'csv',
      title: `CSV Dataset: ${originalFilename}`,
      sourceReference: originalFilename,
      items: finalItems,
      totalCount: items.length,
      samplePreview: finalItems.slice(0, 3)
    };
  },

  /**
   * 4. Ingest YouTube Video Comments
   */
  async ingestYouTube(videoUrlOrId, maxResults = 50) {
    const videoId = extractYouTubeVideoId(videoUrlOrId);
    if (!videoId) {
      throw new Error('Invalid YouTube video link or Video ID. Please provide a valid YouTube URL (e.g., https://www.youtube.com/watch?v=...)');
    }

    if (!isYouTubeAvailable()) {
      throw new Error('YouTube comment fetching is currently disabled: YOUTUBE_API_KEY is not configured in server/.env.');
    }

    try {
      const endpoint = 'https://www.googleapis.com/youtube/v3/commentThreads';
      const response = await axios.get(endpoint, {
        params: {
          part: 'snippet',
          videoId: videoId,
          maxResults: Math.min(maxResults, 100),
          order: 'relevance',
          textFormat: 'plainText',
          key: config.youtubeApiKey
        },
        timeout: 12000
      });

      const items = response.data?.items || [];

      if (items.length === 0) {
        return {
          inputType: 'youtube',
          title: `YouTube Video (${videoId})`,
          sourceReference: `https://www.youtube.com/watch?v=${videoId}`,
          items: [],
          warning: 'No comments found for this video.'
        };
      }

      const comments = items
        .map(item => item.snippet?.topLevelComment?.snippet?.textDisplay?.trim())
        .filter(comment => comment && comment.length > 2);

      return {
        inputType: 'youtube',
        title: `YouTube Comments (${videoId})`,
        sourceReference: `https://www.youtube.com/watch?v=${videoId}`,
        videoId,
        items: comments,
        totalCount: comments.length
      };
    } catch (err) {
      if (err.response) {
        const errorDetails = err.response.data?.error?.errors?.[0];
        const reason = errorDetails?.reason;

        if (reason === 'commentsDisabled') {
          throw new Error('Comments are disabled for this YouTube video.');
        }
        if (reason === 'videoNotFound') {
          throw new Error('The specified YouTube video was not found or is private.');
        }
        if (reason === 'keyInvalid' || err.response.status === 400) {
          throw new Error('The provided YOUTUBE_API_KEY is invalid. Please check your key in server/.env.');
        }
        if (reason === 'quotaExceeded' || err.response.status === 403) {
          throw new Error('YouTube Data API quota exceeded or access forbidden.');
        }

        throw new Error(err.response.data?.error?.message || `YouTube API error: ${err.response.status}`);
      }

      throw new Error(`Failed to fetch YouTube comments: ${err.message}`);
    }
  }
};
