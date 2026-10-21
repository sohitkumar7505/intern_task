// client/src/utils/api.js
// API client for communicating with the backend

const BASE = '';  // Same origin in production; Vite proxy in dev

/**
 * Create a new call session
 */
export async function createCall(language) {
  const res = await fetch(`${BASE}/api/calls`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ language }),
  });
  if (!res.ok) throw new Error(`Failed to create call: ${res.status}`);
  return res.json();
}

/**
 * Send an audio turn to the backend and get the bot's response
 */
export async function sendTurn(callId, audioBlobOrText) {
  let res;
  if (typeof audioBlobOrText === 'string') {
    res = await fetch(`${BASE}/api/calls/${callId}/turn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: audioBlobOrText }),
    });
  } else {
    const formData = new FormData();
    formData.append('audio', audioBlobOrText, 'audio.webm');
    res = await fetch(`${BASE}/api/calls/${callId}/turn`, {
      method: 'POST',
      body: formData,
    });
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || `Turn failed: ${res.status}`);
  }
  return res.json();
  // Returns: { userText, botText, audioBase64, stageInfo }
}

/**
 * End a call and get the summary
 */
export async function endCall(callId) {
  const res = await fetch(`${BASE}/api/calls/${callId}/end`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error(`Failed to end call: ${res.status}`);
  return res.json();
  // Returns: { summary, requirements, objections, nextSteps, salesStatus, salesStatusReason }
}

/**
 * Upload the call recording
 */
export async function uploadRecording(callId, audioBlob) {
  const formData = new FormData();
  formData.append('recording', audioBlob, 'recording.webm');

  const res = await fetch(`${BASE}/api/calls/${callId}/recording`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error(`Failed to upload recording: ${res.status}`);
  return res.json();
}

/**
 * Get call details
 */
export async function getCall(callId) {
  const res = await fetch(`${BASE}/api/calls/${callId}`);
  if (!res.ok) throw new Error(`Failed to get call: ${res.status}`);
  return res.json();
}

/**
 * List all calls, optionally filtered by status
 */
export async function listCalls(statusFilter = '') {
  const query = statusFilter ? `?status=${encodeURIComponent(statusFilter)}` : '';
  const res = await fetch(`${BASE}/api/calls${query}`);
  if (!res.ok) throw new Error(`Failed to list calls: ${res.status}`);
  return res.json();
}

/**
 * Delete a call
 */
export async function deleteCall(callId) {
  const res = await fetch(`${BASE}/api/calls/${callId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`Failed to delete call: ${res.status}`);
  return res.json();
}
