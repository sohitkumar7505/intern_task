// server/services/sarvam.js
// ─────────────────────────────────────────────────────────────
// Sarvam AI API wrapper for STT (Speech-to-Text) and TTS (Text-to-Speech)
// Uses built-in Node.js fetch, FormData, and Blob.
// ─────────────────────────────────────────────────────────────

import 'dotenv/config';

const SARVAM_STT_URL = 'https://api.sarvam.ai/speech-to-text';
const SARVAM_TTS_URL = 'https://api.sarvam.ai/text-to-speech';

/**
 * Splits text into chunks of at most maxChunkSize characters,
 * splitting on sentence boundaries (. ? ! followed by space or newline).
 *
 * @param {string} text - The input text to chunk.
 * @param {number} [maxChunkSize=2400] - Max characters per chunk.
 * @returns {string[]} Array of text chunks.
 */
function splitTextIntoSentenceChunks(text, maxChunkSize = 2400) {
  const trimmed = text.trim();
  if (trimmed.length <= maxChunkSize) {
    return [trimmed];
  }

  // Match sentences ending with ., ?, or ! followed by whitespace or end of string
  const sentenceRegex = /[^.!?]+(?:[.!?]+(?=\s|$)|$)/g;
  const sentences = trimmed.match(sentenceRegex) || [trimmed];
  const chunks = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    const s = sentence.trim();
    if (!s) continue;

    if ((currentChunk + ' ' + s).trim().length <= maxChunkSize) {
      currentChunk = currentChunk ? `${currentChunk} ${s}` : s;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk);
      }
      if (s.length > maxChunkSize) {
        // If a single sentence exceeds the chunk limit, divide along word boundaries
        let remaining = s;
        while (remaining.length > maxChunkSize) {
          let cutIdx = remaining.lastIndexOf(' ', maxChunkSize);
          if (cutIdx <= 0) cutIdx = maxChunkSize;
          chunks.push(remaining.slice(0, cutIdx).trim());
          remaining = remaining.slice(cutIdx).trim();
        }
        currentChunk = remaining;
      } else {
        currentChunk = s;
      }
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks.length > 0 ? chunks : [trimmed];
}

/**
 * Concatenates multiple base64-encoded WAV audio buffers into a single
 * valid base64-encoded WAV file by merging PCM frames and updating headers.
 *
 * @param {string[]} base64List - Array of base64 audio strings.
 * @returns {string} Combined base64-encoded audio.
 */
function concatenateWavBase64(base64List) {
  if (!base64List || base64List.length === 0) return '';
  if (base64List.length === 1) return base64List[0];

  const buffers = base64List
    .map((b64) => Buffer.from(b64, 'base64'))
    .filter((b) => b && b.length > 0);

  if (buffers.length === 0) return '';
  if (buffers.length === 1) return buffers[0].toString('base64');

  const first = buffers[0];
  const isWav =
    first.length >= 44 &&
    first.toString('ascii', 0, 4) === 'RIFF' &&
    first.toString('ascii', 8, 12) === 'WAVE';

  if (!isWav) {
    // If not standard RIFF WAVE, fallback to raw buffer concatenation
    return Buffer.concat(buffers).toString('base64');
  }

  // Find the 'data' chunk in the first WAV header
  let dataOffset = 12;
  while (dataOffset < first.length - 8) {
    const chunkId = first.toString('ascii', dataOffset, dataOffset + 4);
    const chunkSize = first.readUInt32LE(dataOffset + 4);
    if (chunkId === 'data') break;
    dataOffset += 8 + chunkSize;
  }

  if (dataOffset >= first.length - 8) {
    return Buffer.concat(buffers).toString('base64');
  }

  const headerLen = dataOffset + 8;
  const header = Buffer.from(first.subarray(0, headerLen));

  // Extract raw PCM audio from each WAV buffer
  const pcmChunks = [];
  for (const buf of buffers) {
    let offset = 12;
    let found = false;
    while (offset < buf.length - 8) {
      const chunkId = buf.toString('ascii', offset, offset + 4);
      const chunkSize = buf.readUInt32LE(offset + 4);
      if (chunkId === 'data') {
        pcmChunks.push(buf.subarray(offset + 8));
        found = true;
        break;
      }
      offset += 8 + chunkSize;
    }
    if (!found) {
      pcmChunks.push(buf);
    }
  }

  const combinedPcm = Buffer.concat(pcmChunks);
  // Update total RIFF chunk size (file length - 8)
  header.writeUInt32LE(header.length + combinedPcm.length - 8, 4);
  // Update 'data' subchunk size
  header.writeUInt32LE(combinedPcm.length, dataOffset + 4);

  return Buffer.concat([header, combinedPcm]).toString('base64');
}

/**
 * Transcribes audio using Sarvam AI Speech-to-Text API.
 *
 * @param {Buffer|Uint8Array|ArrayBuffer} audioBuffer - WebM audio data.
 * @param {string} languageCode - Sarvam language code (e.g. 'hi-IN', 'en-IN', 'te-IN').
 * @param {string} [mode='transcribe'] - STT mode ('transcribe' or 'codemix').
 * @returns {Promise<{ transcript: string, languageCode: string }>}
 */
export async function speechToText(audioBuffer, languageCode, mode = 'transcribe') {
  if (!audioBuffer || audioBuffer.length === 0) {
    return { transcript: '', languageCode };
  }

  const apiKey = process.env.SARVAM_API_KEY;
  if (!apiKey) {
    console.warn('[sarvam:stt] Warning: SARVAM_API_KEY environment variable is not set.');
  }

  const makeRequest = async () => {
    const formData = new FormData();
    const blob = new Blob([audioBuffer], { type: 'audio/webm' });
    formData.append('file', blob, 'audio.webm');
    formData.append('model', 'saaras:v4');
    formData.append('language_code', languageCode);
    formData.append('mode', mode);

    return await fetch(SARVAM_STT_URL, {
      method: 'POST',
      headers: {
        'api-subscription-key': apiKey || '',
      },
      body: formData,
    });
  };

  let res;
  try {
    res = await makeRequest();
    // Retry once on 5xx server errors with 1s delay
    if (res.status >= 500) {
      console.warn(`[sarvam:stt] Server returned ${res.status}. Retrying in 1s...`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      res = await makeRequest();
    }
  } catch (networkError) {
    // Retry once on network error with 1s delay
    console.warn(`[sarvam:stt] Network error (${networkError.message}). Retrying in 1s...`);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      res = await makeRequest();
    } catch (retryError) {
      console.error(`[sarvam:stt] STT retry failed: ${retryError.message}`);
      return { transcript: '', languageCode };
    }
  }

  if (!res || !res.ok) {
    const errText = res ? await res.text().catch(() => '') : 'No response';
    console.error(`[sarvam:stt] STT API request failed (status ${res?.status}): ${errText}`);
    return { transcript: '', languageCode };
  }

  try {
    const data = await res.json();
    const transcript = (data.transcript || '').trim();
    if (!transcript) {
      return { transcript: '', languageCode };
    }

    return {
      transcript,
      languageCode: data.language_code || languageCode,
    };
  } catch (parseError) {
    console.error(`[sarvam:stt] Failed to parse STT response JSON: ${parseError.message}`);
    return { transcript: '', languageCode };
  }
}

/**
 * Synthesizes speech from text using Sarvam AI Text-to-Speech API.
 * Automatically splits text longer than 2400 chars at sentence boundaries
 * and concatenates the resulting audio.
 *
 * @param {string} text - Text to synthesize.
 * @param {string} languageCode - Sarvam language code (e.g. 'hi-IN', 'en-IN', 'te-IN').
 * @param {string} [speaker='priya'] - Speaker voice profile.
 * @returns {Promise<{ audioBase64: string }>} Base64-encoded WAV audio.
 */
export async function textToSpeech(text, languageCode, speaker = 'priya') {
  if (!text || !text.trim()) {
    return { audioBase64: '' };
  }

  const apiKey = process.env.SARVAM_API_KEY;
  if (!apiKey) {
    console.warn('[sarvam:tts] Warning: SARVAM_API_KEY environment variable is not set.');
  }

  /**
   * Sends a single chunk to the Sarvam TTS endpoint with retry on error.
   *
   * @param {string} chunkText - Text chunk (<= 2500 chars).
   * @returns {Promise<string>} Base64-encoded audio chunk or empty string on failure.
   */
  const requestChunk = async (chunkText) => {
    const body = JSON.stringify({
      text: chunkText,
      language_code: languageCode,
      speaker: speaker || 'priya',
      model: 'bulbul:v3',
      speech_sample_rate: 22050,
    });

    const sendRequest = async () => {
      return await fetch(SARVAM_TTS_URL, {
        method: 'POST',
        headers: {
          'api-subscription-key': apiKey || '',
          'Content-Type': 'application/json',
        },
        body,
      });
    };

    let res;
    try {
      res = await sendRequest();
      if (!res.ok) {
        console.warn(`[sarvam:tts] Request failed with status ${res.status}. Retrying in 1s...`);
        await new Promise((resolve) => setTimeout(resolve, 1000));
        res = await sendRequest();
      }
    } catch (networkError) {
      console.warn(`[sarvam:tts] Network error (${networkError.message}). Retrying in 1s...`);
      try {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        res = await sendRequest();
      } catch (retryError) {
        console.error(`[sarvam:tts] TTS retry failed: ${retryError.message}`);
        return '';
      }
    }

    if (!res || !res.ok) {
      const errText = res ? await res.text().catch(() => '') : 'No response';
      console.error(`[sarvam:tts] TTS request failed (status ${res?.status}): ${errText}`);
      return '';
    }

    try {
      const data = await res.json();
      return (
        (Array.isArray(data.audios) ? data.audios[0] : null) ||
        data.audio ||
        data.audioBase64 ||
        ''
      );
    } catch (parseError) {
      console.error(`[sarvam:tts] Failed to parse TTS response JSON: ${parseError.message}`);
      return '';
    }
  };

  // If text > 2400 chars, split at sentence boundaries and concatenate results
  const chunks = splitTextIntoSentenceChunks(text, 2400);

  if (chunks.length === 1) {
    const audioBase64 = await requestChunk(chunks[0]);
    return { audioBase64: audioBase64 || '' };
  }

  const base64Results = [];
  for (const chunk of chunks) {
    const audioBase64 = await requestChunk(chunk);
    if (!audioBase64) {
      // Return empty audioBase64 on failure
      return { audioBase64: '' };
    }
    base64Results.push(audioBase64);
  }

  const combinedAudio = concatenateWavBase64(base64Results);
  return { audioBase64: combinedAudio };
}

export default {
  speechToText,
  textToSpeech,
};
