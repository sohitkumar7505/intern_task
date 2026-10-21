// hooks/useCallRecording.js
// Records BOTH sides of the call (mic + bot audio) using Web Audio API mixing

import { useRef, useCallback } from 'react';

export default function useCallRecording() {
  const audioContextRef = useRef(null);
  const destinationRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const micSourceRef = useRef(null);

  /**
   * Start recording both sides.
   * @param {MediaStream} micStream - The user's mic stream
   * @returns {{ audioContext: AudioContext, destination: MediaStreamAudioDestinationNode }}
   */
  const startRecording = useCallback((micStream) => {
    const ctx = new AudioContext();
    audioContextRef.current = ctx;

    // Create a destination node to mix both streams
    const destination = ctx.createMediaStreamDestination();
    destinationRef.current = destination;

    // Connect the mic stream to the destination
    const micSource = ctx.createMediaStreamSource(micStream);
    micSource.connect(destination);
    micSourceRef.current = micSource;

    // Start recording the mixed stream
    const recorder = new MediaRecorder(destination.stream, {
      mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm',
    });
    chunksRef.current = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.start(1000); // collect data every second
    recorderRef.current = recorder;

    return { audioContext: ctx, destination };
  }, []);

  /**
   * Play bot audio through the recording destination so it gets captured.
   * @param {string} base64Audio - Base64-encoded WAV audio from TTS
   * @returns {Promise<void>} Resolves when audio playback finishes
   */
  const playBotAudio = useCallback(async (base64Audio) => {
    const ctx = audioContextRef.current;
    const destination = destinationRef.current;
    if (!ctx || !destination || !base64Audio) return;

    // Decode base64 to ArrayBuffer
    const binaryStr = atob(base64Audio);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    try {
      const audioBuffer = await ctx.decodeAudioData(bytes.buffer.slice(0));
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;

      // Connect to both the speakers and the recording destination
      source.connect(ctx.destination);  // speakers
      source.connect(destination);       // recording

      return new Promise((resolve) => {
        source.onended = resolve;
        source.start(0);
      });
    } catch (err) {
      console.error('Error playing bot audio:', err);
      // Fallback: play using Audio element (won't be captured in recording)
      const audioUrl = `data:audio/wav;base64,${base64Audio}`;
      const audio = new Audio(audioUrl);
      return new Promise((resolve) => {
        audio.onended = resolve;
        audio.onerror = resolve;
        audio.play().catch(resolve);
      });
    }
  }, []);

  /**
   * Stop recording and return the combined audio blob.
   * @returns {Promise<Blob>} The recorded audio blob
   */
  const stopRecording = useCallback(() => {
    return new Promise((resolve) => {
      const recorder = recorderRef.current;
      if (!recorder || recorder.state === 'inactive') {
        resolve(new Blob(chunksRef.current, { type: 'audio/webm' }));
        return;
      }

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        resolve(blob);
      };
      recorder.stop();

      // Cleanup
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
      destinationRef.current = null;
      micSourceRef.current = null;
    });
  }, []);

  return {
    startRecording,
    playBotAudio,
    stopRecording,
  };
}
