// Local speech transcription engine using @xenova/transformers (Whisper) with resilient Web Audio decoding

let transcriberPromise: Promise<any> | null = null;

export async function getTranscriber(onProgress?: (progress: number, status: string) => void) {
  if (!transcriberPromise) {
    transcriberPromise = (async () => {
      try {
        const { pipeline, env } = await import('@xenova/transformers');
        
        // Disable local model check in browser environments to avoid CORS/filesystem errors
        env.allowLocalModels = false;
        if (env.backends?.onnx?.wasm) {
          env.backends.onnx.wasm.numThreads = 1;
        }

        const transcriber = await pipeline(
          'automatic-speech-recognition',
          'Xenova/whisper-tiny.en',
          {
            progress_callback: (p: any) => {
              if (onProgress && p.status === 'progress' && typeof p.progress === 'number') {
                onProgress(Math.round(p.progress), `Loading Whisper: ${Math.round(p.progress)}%`);
              } else if (onProgress && p.status === 'done') {
                onProgress(100, 'Model ready');
              }
            },
          }
        );
        return transcriber;
      } catch (err) {
        console.warn('Could not initialize @xenova/transformers Whisper model:', err);
        transcriberPromise = null;
        throw err;
      }
    })();
  }
  return transcriberPromise;
}

/**
 * Transcribe an audio Blob or data URL locally using Whisper
 */
export async function transcribeAudioBlob(
  audioBlobOrUrl: Blob | string,
  onProgress?: (percent: number, status: string) => void
): Promise<string> {
  let blob: Blob;

  if (typeof audioBlobOrUrl === 'string') {
    if (audioBlobOrUrl.startsWith('data:')) {
      const res = await fetch(audioBlobOrUrl);
      blob = await res.blob();
    } else {
      const res = await fetch(audioBlobOrUrl);
      blob = await res.blob();
    }
  } else {
    blob = audioBlobOrUrl;
  }

  if (onProgress) onProgress(10, 'Decoding audio track...');

  // Decode audio data to 16kHz mono Float32Array required by Whisper
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  const audioCtx = new AudioContextClass({ sampleRate: 16000 });

  const arrayBuffer = await blob.arrayBuffer();
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
  
  // Extract mono channel
  let float32Array: Float32Array;
  if (audioBuffer.numberOfChannels > 1) {
    const ch0 = audioBuffer.getChannelData(0);
    const ch1 = audioBuffer.getChannelData(1);
    float32Array = new Float32Array(ch0.length);
    for (let i = 0; i < ch0.length; i++) {
      float32Array[i] = (ch0[i] + ch1[i]) / 2;
    }
  } else {
    float32Array = audioBuffer.getChannelData(0);
  }

  if (onProgress) onProgress(30, 'Running local Whisper inference...');

  const transcriber = await getTranscriber(onProgress);

  if (onProgress) onProgress(60, 'Processing speech to text...');
  const result = await transcriber(float32Array, {
    chunk_length_s: 30,
    stride_length_s: 5,
  });

  if (onProgress) onProgress(100, 'Complete');

  return (result?.text || '').trim();
}

let summarizerPromise: Promise<any> | null = null;

export async function getSummarizer(onProgress?: (progress: number, status: string) => void) {
  if (!summarizerPromise) {
    summarizerPromise = (async () => {
      try {
        const { pipeline, env } = await import('@xenova/transformers');
        env.allowLocalModels = false;
        if (env.backends?.onnx?.wasm) {
          env.backends.onnx.wasm.numThreads = 1;
        }

        const summarizer = await pipeline(
          'summarization',
          'Xenova/distilbart-cnn-6-6',
          {
            progress_callback: (p: any) => {
              if (onProgress && p.status === 'progress' && typeof p.progress === 'number') {
                onProgress(Math.round(p.progress), `Loading Summarizer: ${Math.round(p.progress)}%`);
              } else if (onProgress && p.status === 'done') {
                onProgress(100, 'Summarizer ready');
              }
            },
          }
        );
        return summarizer;
      } catch (err) {
        console.warn('Could not initialize @xenova/transformers summarizer:', err);
        summarizerPromise = null;
        throw err;
      }
    })();
  }
  return summarizerPromise;
}

export const FALLBACK_SUMMARY_TEXT =
  'No clear summary or action points could be extracted from this recording.';

/**
 * Post-processes a summary string into a clean, bulleted list of distinct sentences/key takeaways.
 */
export function formatSummaryAsBullets(text: string): string {
  const cleaned = text.trim();
  if (!cleaned) return FALLBACK_SUMMARY_TEXT;
  if (cleaned === FALLBACK_SUMMARY_TEXT) return FALLBACK_SUMMARY_TEXT;

  // Split on newlines or sentence boundaries
  const rawSegments = cleaned
    .split(/\n+|(?<=[.?!])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const sentences: string[] = [];
  const seen = new Set<string>();

  for (const seg of rawSegments) {
    // Strip leading bullet symbols or numbers (e.g. "• ", "- ", "* ", "1. ")
    let unbulleted = seg.replace(/^[•\-\*]\s*|^\d+[\.\)]\s*/, '').trim();
    if (!unbulleted || unbulleted.length < 5) continue;

    // Ensure first character is capitalized
    unbulleted = unbulleted.charAt(0).toUpperCase() + unbulleted.slice(1);

    // Ensure ending with period if it ends without punctuation
    if (!/[.?!]$/.test(unbulleted)) {
      unbulleted += '.';
    }

    const key = unbulleted.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      sentences.push(unbulleted);
    }
  }

  if (sentences.length === 0) {
    return FALLBACK_SUMMARY_TEXT;
  }

  // Format as bullet points
  return sentences.map((s) => `• ${s}`).join('\n');
}

/**
 * Detects if a transcript is gibberish, a mic test, or lacks standard sentence structure.
 * Prevents local AI model from hallucinating or looping on unstructured audio.
 */
export function isGibberishOrMicTest(text: string): boolean {
  const normalized = text.toLowerCase().trim();
  if (!normalized) return true;

  // 1. Obvious mic test and audio check phrases
  const micTestPatterns = [
    /\b(mic\s*check|sound\s*check|audio\s*check|line\s*check)\b/i,
    /\b(mic\s*test|sound\s*test|audio\s*test|system\s*test)\b/i,
    /\btest(ing)?\s*(1\s*2\s*3|1\s*2|123|one\s*two\s*three|one\s*two|mic|sound|audio)?\b/i,
    /\b(one\s*two\s*three(\s*four)?|1\s*,?\s*2\s*,?\s*3(\s*,?\s*4)?)\b/i,
    /\b(check\s*1\s*2|check\s*one\s*two|check\s*check|hello\s*check)\b/i,
    /\b(is\s*this\s*(thing\s*)?on|can\s*you\s*hear\s*me|can\s*everyone\s*hear\s*me)\b/i,
  ];

  for (const pattern of micTestPatterns) {
    if (pattern.test(normalized)) {
      // If transcript is short or dominated by the test pattern, immediately flag
      const wordCount = normalized.split(/\s+/).filter(Boolean).length;
      if (wordCount <= 35) {
        return true;
      }
    }
  }

  // 2. Character repetition (e.g., "aaaaaaa", "......", "hahahahahaha")
  if (/(.)\1{4,}/i.test(normalized)) {
    return true;
  }

  // 3. Consecutive repeating words (e.g. "testing testing testing" or "word word word")
  if (/\b([a-z0-9]{2,})(?:\s+\1){2,}\b/i.test(normalized)) {
    return true;
  }

  const rawWords = normalized.replace(/[^\w\s]/g, ' ').split(/\s+/).filter(Boolean);
  if (rawWords.length === 0) return true;

  // 4. Repetitive text & Type-Token Ratio (unique words vs total words)
  const uniqueWords = new Set(rawWords);
  if (rawWords.length >= 5) {
    const ratio = uniqueWords.size / rawWords.length;
    if (ratio < 0.45) {
      return true;
    }
  }

  // Check if a single non-stopword accounts for >= 40% of the entire transcript
  const freqMap: Record<string, number> = {};
  for (const w of rawWords) {
    freqMap[w] = (freqMap[w] || 0) + 1;
  }
  for (const w of rawWords) {
    if (freqMap[w] / rawWords.length >= 0.4 && rawWords.length >= 4) {
      return true;
    }
  }

  // 5. Number and symbol dominance (e.g., "1 2 3 4 5 6 7 8 9 10")
  const digitWords = rawWords.filter((w) => /^\d+$/.test(w));
  if (digitWords.length / rawWords.length >= 0.4) {
    return true;
  }

  // 6. Sentence structure & vocabulary quality
  // Check for dictionary-like words containing vowels (at least 2 letters)
  const validVowelWords = rawWords.filter((w) => /[aeiouy]/i.test(w) && w.length >= 2);
  if (validVowelWords.length < 3) {
    return true;
  }

  // Must have at least one substantive word with length >= 4
  const hasSubstantiveWord = rawWords.some((w) => w.length >= 4 && /[aeiouy]/i.test(w));
  if (!hasSubstantiveWord) {
    return true;
  }

  return false;
}

/**
 * Summarize transcript text using Xenova/distilbart-cnn-6-6 with graceful heuristic fallback.
 * Formats output as bulleted key takeaways or returns a standardized fallback message if too short
 * or if the transcript is gibberish/mic test.
 */
export async function summarizeText(
  text: string,
  onProgress?: (percent: number, status: string) => void
): Promise<string> {
  const cleaned = text.trim();
  if (!cleaned) return FALLBACK_SUMMARY_TEXT;

  // Minimum length check: If transcript is too short to summarize, output fallback text
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length < 8 || cleaned.length < 25) {
    return FALLBACK_SUMMARY_TEXT;
  }

  // Gibberish & mic test guardrail: bypass model entirely to prevent hallucinations & infinite loops
  if (isGibberishOrMicTest(cleaned)) {
    return FALLBACK_SUMMARY_TEXT;
  }

  try {
    if (onProgress) onProgress(15, 'Loading AI summarization model...');
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('AI summarization timeout')), 15000)
    );

    const summarizationTask = async () => {
      const summarizer = await getSummarizer(onProgress);
      if (onProgress) onProgress(60, 'Generating concise summary...');
      const result = await summarizer(cleaned, {
        max_new_tokens: 50,
        min_new_tokens: 10,
        repetition_penalty: 1.6,
        length_penalty: 1.0,
        no_repeat_ngram_size: 3,
        early_stopping: true,
      });
      const rawSummary = Array.isArray(result) ? result[0]?.summary_text : result?.summary_text;
      return (rawSummary || '').trim();
    };

    const summary = await Promise.race([summarizationTask(), timeoutPromise]);
    if (summary) {
      const bulletSummary = formatSummaryAsBullets(summary);
      if (bulletSummary && bulletSummary !== FALLBACK_SUMMARY_TEXT) {
        if (onProgress) onProgress(100, 'Summary complete');
        return bulletSummary;
      }
    }
  } catch (err) {
    console.warn('Transformer summarizer fallback to heuristic summarizer:', err);
  }

  // Graceful heuristic fallback: extract the most salient initial sentences
  const sentences = cleaned.split(/(?<=[.?!])\s+/).filter(Boolean);
  if (sentences.length === 0) {
    return FALLBACK_SUMMARY_TEXT;
  }

  const topSentences = sentences.slice(0, 3).join(' ');
  const fallbackBullet = formatSummaryAsBullets(topSentences);
  return fallbackBullet || FALLBACK_SUMMARY_TEXT;
}
