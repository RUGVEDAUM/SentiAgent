import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.resolve(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'sentiagent.db');
const db = new DatabaseSync(dbPath);

// Enable WAL mode & foreign keys for high performance and integrity
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS analyses (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    input_type TEXT NOT NULL,
    source_reference TEXT,
    item_count INTEGER DEFAULT 1,
    status TEXT DEFAULT 'completed',
    is_fallback INTEGER DEFAULT 0,
    results_json TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_analyses_user_id ON analyses(user_id);
  CREATE INDEX IF NOT EXISTS idx_analyses_created_at ON analyses(created_at DESC);
`);

// Prepared statements
const stmts = {
  createUser: db.prepare(`
    INSERT INTO users (id, email, password_hash, name)
    VALUES (?, ?, ?, ?)
  `),

  getUserByEmail: db.prepare(`
    SELECT id, email, password_hash AS passwordHash, name, created_at AS createdAt
    FROM users
    WHERE email = ?
  `),

  getUserById: db.prepare(`
    SELECT id, email, name, created_at AS createdAt
    FROM users
    WHERE id = ?
  `),

  createAnalysis: db.prepare(`
    INSERT INTO analyses (id, user_id, title, input_type, source_reference, item_count, status, is_fallback, results_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `),

  getUserAnalyses: db.prepare(`
    SELECT id, user_id AS userId, title, input_type AS inputType, source_reference AS sourceReference,
           item_count AS itemCount, status, is_fallback AS isFallback, created_at AS createdAt
    FROM analyses
    WHERE user_id = ?
    ORDER BY created_at DESC
  `),

  getAnalysisById: db.prepare(`
    SELECT id, user_id AS userId, title, input_type AS inputType, source_reference AS sourceReference,
           item_count AS itemCount, status, is_fallback AS isFallback, results_json AS resultsJson, created_at AS createdAt
    FROM analyses
    WHERE id = ? AND user_id = ?
  `),

  deleteAnalysis: db.prepare(`
    DELETE FROM analyses
    WHERE id = ? AND user_id = ?
  `)
};

export const createUser = ({ id, email, passwordHash, name }) => {
  stmts.createUser.run(id, email, passwordHash, name);
  return stmts.getUserById.get(id);
};

export const getUserByEmail = (email) => {
  return stmts.getUserByEmail.get(email);
};

export const getUserById = (id) => {
  return stmts.getUserById.get(id);
};

export const createAnalysis = ({
  id,
  userId,
  title,
  inputType,
  sourceReference,
  itemCount,
  status = 'completed',
  isFallback = 0,
  resultsJson
}) => {
  stmts.createAnalysis.run(
    id,
    userId,
    title,
    inputType,
    sourceReference || null,
    itemCount || 1,
    status,
    isFallback ? 1 : 0,
    resultsJson
  );
  return getAnalysisById(id, userId);
};

export const getUserAnalyses = (userId) => {
  return stmts.getUserAnalyses.all(userId);
};

export const getAnalysisById = (id, userId) => {
  const row = stmts.getAnalysisById.get(id, userId);
  if (!row) return null;
  return {
    ...row,
    results: JSON.parse(row.resultsJson)
  };
};

export const deleteAnalysis = (id, userId) => {
  const result = stmts.deleteAnalysis.run(id, userId);
  return result.changes > 0;
};

export const getDb = () => db;

export const closeDb = () => {
  db.close();
};

export default db;
