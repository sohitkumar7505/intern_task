// hooks/useAudioRecorder.js
// Handles microphone capture with simple silence-based VAD (Voice Activity Detection)

import { useState, useRef, useCallback, useEffect } from 'react';

const SILENCE_THRESHOLD = 0.015;   // RMS below this = silence
const SILENCE_DURATION = 1200;     // ms of silence to end a turn
const MIN_RECORDING_MS = 600;      // ignore very short noise
const ANALYSIS_INTERVAL = 100;     // ms between RMS checks

export default function useAudioRecorder({ onTurnReady, enabled }) {
  const [isListening, setIsListening] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);

  const mediaStreamRef = useRef(null);
  const recorderRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const chunksRef = useRef([]);
  const silenceTimerRef = useRef(null);
  const recordingStartRef = useRef(null);
  const analysisIntervalRef = useRef(null);
  const isSpeakingRef = useRef(false);

  /** Get the microphone stream (reuses if already open) */
  const getMicStream = useCallback(async () => {
    if (mediaStreamRef.current) return mediaStreamRef.current;
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    mediaStreamRef.current = stream;
    return stream;
  }, []);

  /** Compute RMS audio level from analyser */
  const getRMS = useCallback(() => {
    if (!analyserRef.current) return 0;
    const data = new Uint8Array(analyserRef.current.fftSize);
    analyserRef.current.getByteTimeDomainData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      const val = (data[i] - 128) / 128;
      sum += val * val;
    }
    return Math.sqrt(sum / data.length);
  }, []);

  /** Start listening for the next user turn */
  const startListening = useCallback(async () => {
    try {
      const stream = await getMicStream();

      // Set up audio analysis for VAD
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }
      const ctx = audioContextRef.current;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Start MediaRecorder
      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm',
      });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const duration = Date.now() - (recordingStartRef.current || 0);
        if (duration < MIN_RECORDING_MS || chunksRef.current.length === 0) {
          // Too short — likely noise, restart listening
          if (enabled) startListening();
          return;
        }
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        onTurnReady?.(blob);
      };

      recorder.start(250); // collect data every 250ms
      recordingStartRef.current = Date.now();
      recorderRef.current = recorder;
      isSpeakingRef.current = false;
      setIsListening(true);

      // Start VAD monitoring
      analysisIntervalRef.current = setInterval(() => {
        const rms = getRMS();
        setAudioLevel(rms);

        if (rms > SILENCE_THRESHOLD) {
          // User is speaking
          isSpeakingRef.current = true;
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }
        } else if (isSpeakingRef.current && !silenceTimerRef.current) {
          // User went silent — start the silence timer
          silenceTimerRef.current = setTimeout(() => {
            // Silence lasted long enough — end the turn
            stopRecording();
          }, SILENCE_DURATION);
        }
      }, ANALYSIS_INTERVAL);
    } catch (err) {
      console.error('Mic access error:', err);
      throw err;
    }
  }, [getMicStream, getRMS, onTurnReady, enabled]);

  /** Stop recording (called by VAD or manually) */
  const stopRecording = useCallback(() => {
    setIsListening(false);

    if (analysisIntervalRef.current) {
      clearInterval(analysisIntervalRef.current);
      analysisIntervalRef.current = null;
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }
    setAudioLevel(0);
  }, []);

  /** Clean up everything */
  const cleanup = useCallback(() => {
    stopRecording();
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
  }, [stopRecording]);

  // Auto-cleanup on unmount
  useEffect(() => cleanup, [cleanup]);

  return {
    isListening,
    audioLevel,
    startListening,
    stopRecording,
    cleanup,
    mediaStream: mediaStreamRef.current,
    getMicStream,
  };
}
