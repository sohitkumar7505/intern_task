// server/services/db.js
// ─────────────────────────────────────────────────────────────
// SQLite database service using better-sqlite3.
// Manages calls, messages, and call metadata.
// ─────────────────────────────────────────────────────────────

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Project root is two levels up from server/services
const projectRoot = path.resolve(__dirname, '../../');
const dataDir = path.resolve(projectRoot, 'data');

// Ensure data/ directory exists at project root
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Database file path relative to project root
const dbPath = process.env.DB_PATH || path.resolve(dataDir, 'calls.sqlite');

// Initialize database instance
const db = new Database(dbPath);

// Enable WAL mode for better concurrency and foreign keys for cascading deletes
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize database tables on import
db.exec(`
  CREATE TABLE IF NOT EXISTS calls (
    id TEXT PRIMARY KEY,
    language TEXT,
    status TEXT DEFAULT 'in_progress',
    start_time TEXT,
    end_time TEXT,
    duration INTEGER,
    summary TEXT,
    requirements TEXT,
    objections TEXT,
    next_steps TEXT,
    sales_status TEXT,
    sales_status_reason TEXT,
    customer_profile TEXT,
    recording_filename TEXT
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    call_id TEXT REFERENCES calls(id) ON DELETE CASCADE,
    role TEXT,
    content TEXT,
    timestamp TEXT,
    stage TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_messages_call_id ON messages(call_id);
  CREATE INDEX IF NOT EXISTS idx_calls_start_time ON calls(start_time DESC);
  CREATE INDEX IF NOT EXISTS idx_calls_sales_status ON calls(sales_status);
`);

/**
 * Creates a new call record in the database.
 *
 * @param {string} id - Unique call identifier (UUID).
 * @param {string} language - Language code for the call session (e.g., 'hi-en', 'en', 'te').
 * @returns {object|null} The created call record with empty messages array.
 */
export function createCall(id, language) {
  const startTime = new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO calls (id, language, status, start_time)
    VALUES (?, ?, 'in_progress', ?)
  `);
  stmt.run(id, language, startTime);
  return getCall(id);
}

/**
 * Adds a new message to a call.
 *
 * @param {string} callId - Call identifier.
 * @param {'user'|'bot'} role - Message sender role.
 * @param {string} content - Message text content.
 * @param {string|null} [stage=null] - Conversation stage (e.g. 'greeting', 'pitch').
 * @returns {object} The inserted message row.
 */
export function addMessage(callId, role, content, stage = null) {
  const timestamp = new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO messages (call_id, role, content, timestamp, stage)
    VALUES (?, ?, ?, ?, ?)
  `);
  const result = stmt.run(callId, role, content, timestamp, stage);
  return {
    id: Number(result.lastInsertRowid),
    call_id: callId,
    role,
    content,
    timestamp,
    stage,
  };
}

/**
 * Retrieves all messages for a specific call ordered by timestamp ascending.
 *
 * @param {string} callId - Call identifier.
 * @returns {Array<object>} Array of message rows.
 */
export function getMessages(callId) {
  const stmt = db.prepare(`
    SELECT * FROM messages
    WHERE call_id = ?
    ORDER BY timestamp ASC, id ASC
  `);
  return stmt.all(callId);
}

/**
 * Retrieves a call by ID along with all of its messages.
 *
 * @param {string} id - Call identifier.
 * @returns {object|null} Call object including a 'messages' array, or null if not found.
 */
export function getCall(id) {
  const call = db.prepare('SELECT * FROM calls WHERE id = ?').get(id);
  if (!call) return null;

  const messages = getMessages(id);
  return {
    ...call,
    messages,
  };
}

/**
 * Updates any fields on an existing call record.
 *
 * @param {string} id - Call identifier.
 * @param {Record<string, any>} fields - Object containing field name/value pairs to update.
 * @returns {object|null} The updated call record, or null if call does not exist.
 */
export function updateCall(id, fields = {}) {
  const allowedColumns = [
    'language',
    'status',
    'start_time',
    'end_time',
    'duration',
    'summary',
    'requirements',
    'objections',
    'next_steps',
    'sales_status',
    'sales_status_reason',
    'customer_profile',
    'recording_filename',
  ];

  const validEntries = Object.entries(fields).filter(([key]) =>
    allowedColumns.includes(key)
  );

  if (validEntries.length > 0) {
    const setClause = validEntries.map(([key]) => `"${key}" = ?`).join(', ');
    const values = validEntries.map(([key, val]) => {
      // Serialize objects / arrays (like customer_profile JSON) to string
      if (val !== null && typeof val === 'object') {
        return JSON.stringify(val);
      }
      return val;
    });

    const stmt = db.prepare(`UPDATE calls SET ${setClause} WHERE id = ?`);
    stmt.run(...values, id);
  }

  return getCall(id);
}

/**
 * Lists all calls ordered by start_time descending, with message count.
 * Optionally filters by sales_status.
 *
 * @param {string} [statusFilter] - Optional sales_status to filter by.
 * @returns {Array<object>} Array of call objects with message_count.
 */
export function listCalls(statusFilter) {
  const hasFilter =
    statusFilter &&
    typeof statusFilter === 'string' &&
    statusFilter.trim() !== '' &&
    statusFilter.trim().toLowerCase() !== 'all';

  if (hasFilter) {
    const stmt = db.prepare(`
      SELECT c.*, COUNT(m.id) AS message_count
      FROM calls c
      LEFT JOIN messages m ON c.id = m.call_id
      WHERE LOWER(c.sales_status) = LOWER(?)
      GROUP BY c.id
      ORDER BY c.start_time DESC
    `);
    return stmt.all(statusFilter.trim());
  }

  const stmt = db.prepare(`
    SELECT c.*, COUNT(m.id) AS message_count
    FROM calls c
    LEFT JOIN messages m ON c.id = m.call_id
    GROUP BY c.id
    ORDER BY c.start_time DESC
  `);
  return stmt.all();
}

/**
 * Deletes a call and its associated messages, returning the recording_filename.
 *
 * @param {string} id - Call identifier.
 * @returns {string|null} The recording_filename of the deleted call (or null if none/not found).
 */
export function deleteCall(id) {
  const call = db.prepare('SELECT recording_filename FROM calls WHERE id = ?').get(id);
  if (!call) {
    return null;
  }

  const recordingFilename = call.recording_filename || null;

  // Execute deletion inside a transaction
  const deleteTx = db.transaction((callId) => {
    db.prepare('DELETE FROM messages WHERE call_id = ?').run(callId);
    db.prepare('DELETE FROM calls WHERE id = ?').run(callId);
  });

  deleteTx(id);

  return recordingFilename;
}

export { db };

export default {
  createCall,
  addMessage,
  getMessages,
  getCall,
  updateCall,
  listCalls,
  deleteCall,
  db,
};
