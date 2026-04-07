/**
 * Mahjong Living Simulation - Cloud Server
 * Node.js/Express backend with SQLite for cloud features.
 * Usage: node server/app.js
 */

const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const path = require('path');
const Database = require('better-sqlite3');

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const PORT = process.env.PORT || 3000;
const SECRET = process.env.SECRET || 'mahjong-living-sim-secret-key-change-in-prod';
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'mahjong.db');

// ---------------------------------------------------------------------------
// Express setup
// ---------------------------------------------------------------------------
const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));

// ---------------------------------------------------------------------------
// Database setup
// ---------------------------------------------------------------------------
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    created TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS saves (
    userId TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    updated TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (userId) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS leaderboard (
    id TEXT PRIMARY KEY,
    userId TEXT,
    name TEXT NOT NULL,
    score INTEGER NOT NULL,
    handType TEXT,
    date TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS replays (
    id TEXT PRIMARY KEY,
    userId TEXT,
    title TEXT NOT NULL,
    data TEXT NOT NULL,
    date TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// Prepared statements
const stmts = {
  insertUser: db.prepare('INSERT INTO users (id, code, created) VALUES (?, ?, datetime(\'now\'))'),
  getUserByCode: db.prepare('SELECT * FROM users WHERE code = ?'),
  getUserById: db.prepare('SELECT * FROM users WHERE id = ?'),

  upsertSave: db.prepare(`
    INSERT INTO saves (userId, data, updated) VALUES (?, ?, datetime('now'))
    ON CONFLICT(userId) DO UPDATE SET data = excluded.data, updated = datetime('now')
  `),
  getSave: db.prepare('SELECT data, updated FROM saves WHERE userId = ?'),

  insertLeaderboard: db.prepare(
    'INSERT INTO leaderboard (id, userId, name, score, handType, date) VALUES (?, ?, ?, ?, ?, datetime(\'now\'))'
  ),
  getLeaderboardWeekly: db.prepare(
    'SELECT name, score, handType, date FROM leaderboard WHERE date >= datetime(\'now\', \'-7 days\') ORDER BY score DESC LIMIT 100'
  ),
  getLeaderboardMonthly: db.prepare(
    'SELECT name, score, handType, date FROM leaderboard WHERE date >= datetime(\'now\', \'-30 days\') ORDER BY score DESC LIMIT 100'
  ),
  getLeaderboardAlltime: db.prepare(
    'SELECT name, score, handType, date FROM leaderboard ORDER BY score DESC LIMIT 100'
  ),

  insertReplay: db.prepare(
    'INSERT INTO replays (id, userId, title, data, date) VALUES (?, ?, ?, ?, datetime(\'now\'))'
  ),
  listReplays: db.prepare(
    'SELECT id, userId, title, date FROM replays ORDER BY date DESC LIMIT 50'
  ),
  getReplay: db.prepare('SELECT * FROM replays WHERE id = ?')
};

// ---------------------------------------------------------------------------
// Token helpers (simple HMAC-based auth)
// ---------------------------------------------------------------------------

/**
 * Create a token for the given userId.
 * Format: base64(userId):base64(hmac(userId))
 */
function createToken(userId) {
  var payload = Buffer.from(userId).toString('base64');
  var sig = crypto.createHmac('sha256', SECRET).update(userId).digest('base64');
  return payload + '.' + sig;
}

/**
 * Verify token and return the userId, or null if invalid.
 */
function verifyToken(token) {
  if (!token || typeof token !== 'string') {
    return null;
  }
  var parts = token.split('.');
  if (parts.length !== 2) {
    return null;
  }
  try {
    var userId = Buffer.from(parts[0], 'base64').toString('utf8');
    var expectedSig = crypto.createHmac('sha256', SECRET).update(userId).digest('base64');
    if (parts[1] === expectedSig) {
      return userId;
    }
    return null;
  } catch (e) {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Auth middleware
// ---------------------------------------------------------------------------

function authRequired(req, res, next) {
  var authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization header required' });
  }
  var token = authHeader.slice(7);
  var userId = verifyToken(token);
  if (!userId) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
  var user = stmts.getUserById.get(userId);
  if (!user) {
    return res.status(401).json({ error: 'User not found' });
  }
  req.userId = userId;
  next();
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateId() {
  return crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
}

function generateSyncCode() {
  // 6-digit numeric code
  var code = '';
  var bytes = crypto.randomBytes(3);
  var num = (bytes[0] << 16) | (bytes[1] << 8) | bytes[2];
  code = String(num % 1000000).padStart(6, '0');
  return code;
}

function generateUniqueSyncCode() {
  var attempts = 0;
  while (attempts < 20) {
    var code = generateSyncCode();
    var existing = stmts.getUserByCode.get(code);
    if (!existing) {
      return code;
    }
    attempts++;
  }
  // Fallback: use more entropy
  return String(Date.now()).slice(-6);
}

// ---------------------------------------------------------------------------
// Routes: Auth
// ---------------------------------------------------------------------------

/**
 * POST /api/auth/code
 * Generate a 6-digit sync code and create a new user.
 * Returns { code, userId, token }
 */
app.post('/api/auth/code', function (req, res) {
  try {
    var userId = generateId();
    var code = generateUniqueSyncCode();

    stmts.insertUser.run(userId, code);
    var token = createToken(userId);

    res.json({
      code: code,
      userId: userId,
      token: token
    });
  } catch (err) {
    console.error('Error creating user:', err.message);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

/**
 * POST /api/auth/login
 * Login with a 6-digit sync code.
 * Body: { code: "123456" }
 * Returns { userId, token }
 */
app.post('/api/auth/login', function (req, res) {
  try {
    var code = req.body.code;
    if (!code || typeof code !== 'string' || code.length !== 6) {
      return res.status(400).json({ error: 'A valid 6-digit code is required' });
    }

    var user = stmts.getUserByCode.get(code);
    if (!user) {
      return res.status(404).json({ error: 'Invalid sync code' });
    }

    var token = createToken(user.id);
    res.json({
      userId: user.id,
      token: token
    });
  } catch (err) {
    console.error('Error logging in:', err.message);
    res.status(500).json({ error: 'Failed to login' });
  }
});

// ---------------------------------------------------------------------------
// Routes: Save / Load
// ---------------------------------------------------------------------------

/**
 * POST /api/save
 * Upload full game state JSON. Auth required.
 * Body: { data: { ... } }
 */
app.post('/api/save', authRequired, function (req, res) {
  try {
    var data = req.body.data;
    if (!data) {
      return res.status(400).json({ error: 'Save data is required' });
    }
    var json = typeof data === 'string' ? data : JSON.stringify(data);

    stmts.upsertSave.run(req.userId, json);

    res.json({ success: true, updated: new Date().toISOString() });
  } catch (err) {
    console.error('Error saving:', err.message);
    res.status(500).json({ error: 'Failed to save game state' });
  }
});

/**
 * GET /api/save
 * Download saved game state. Auth required.
 */
app.get('/api/save', authRequired, function (req, res) {
  try {
    var row = stmts.getSave.get(req.userId);
    if (!row) {
      return res.status(404).json({ error: 'No save data found' });
    }
    var data;
    try {
      data = JSON.parse(row.data);
    } catch (e) {
      data = row.data;
    }
    res.json({ data: data, updated: row.updated });
  } catch (err) {
    console.error('Error loading save:', err.message);
    res.status(500).json({ error: 'Failed to load game state' });
  }
});

// ---------------------------------------------------------------------------
// Routes: Leaderboard
// ---------------------------------------------------------------------------

/**
 * POST /api/leaderboard
 * Submit a score entry.
 * Body: { score, handType, playerName }
 */
app.post('/api/leaderboard', function (req, res) {
  try {
    var score = req.body.score;
    var handType = req.body.handType || '';
    var playerName = req.body.playerName || 'Anonymous';

    if (typeof score !== 'number' || isNaN(score)) {
      return res.status(400).json({ error: 'A valid numeric score is required' });
    }

    // Optional auth for userId association
    var userId = null;
    var authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      userId = verifyToken(authHeader.slice(7));
    }

    var id = generateId();
    stmts.insertLeaderboard.run(id, userId, playerName, score, handType);

    res.json({ success: true, id: id });
  } catch (err) {
    console.error('Error submitting score:', err.message);
    res.status(500).json({ error: 'Failed to submit score' });
  }
});

/**
 * GET /api/leaderboard/:period
 * Get leaderboard for a time period.
 * :period = weekly | monthly | alltime
 */
app.get('/api/leaderboard/:period', function (req, res) {
  try {
    var period = req.params.period;
    var rows;

    switch (period) {
      case 'weekly':
        rows = stmts.getLeaderboardWeekly.all();
        break;
      case 'monthly':
        rows = stmts.getLeaderboardMonthly.all();
        break;
      case 'alltime':
        rows = stmts.getLeaderboardAlltime.all();
        break;
      default:
        return res.status(400).json({ error: 'Period must be weekly, monthly, or alltime' });
    }

    res.json({ period: period, entries: rows });
  } catch (err) {
    console.error('Error fetching leaderboard:', err.message);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// ---------------------------------------------------------------------------
// Routes: Replays
// ---------------------------------------------------------------------------

/**
 * POST /api/replay
 * Upload a replay JSON.
 * Body: { title, data }
 */
app.post('/api/replay', function (req, res) {
  try {
    var title = req.body.title || 'Untitled Replay';
    var data = req.body.data;

    if (!data) {
      return res.status(400).json({ error: 'Replay data is required' });
    }

    var json = typeof data === 'string' ? data : JSON.stringify(data);

    // Optional auth for userId association
    var userId = null;
    var authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      userId = verifyToken(authHeader.slice(7));
    }

    var id = generateId();
    stmts.insertReplay.run(id, userId, title, json);

    res.json({ success: true, id: id });
  } catch (err) {
    console.error('Error uploading replay:', err.message);
    res.status(500).json({ error: 'Failed to upload replay' });
  }
});

/**
 * GET /api/replays
 * List available shared replays with metadata.
 */
app.get('/api/replays', function (req, res) {
  try {
    var rows = stmts.listReplays.all();
    res.json({ replays: rows });
  } catch (err) {
    console.error('Error listing replays:', err.message);
    res.status(500).json({ error: 'Failed to list replays' });
  }
});

/**
 * GET /api/replay/:id
 * Download a specific replay by id.
 */
app.get('/api/replay/:id', function (req, res) {
  try {
    var row = stmts.getReplay.get(req.params.id);
    if (!row) {
      return res.status(404).json({ error: 'Replay not found' });
    }
    var data;
    try {
      data = JSON.parse(row.data);
    } catch (e) {
      data = row.data;
    }
    res.json({
      id: row.id,
      userId: row.userId,
      title: row.title,
      data: data,
      date: row.date
    });
  } catch (err) {
    console.error('Error fetching replay:', err.message);
    res.status(500).json({ error: 'Failed to fetch replay' });
  }
});

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------

app.get('/api/health', function (req, res) {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// ---------------------------------------------------------------------------
// Static file serving (serve the game itself in production)
// ---------------------------------------------------------------------------

app.use(express.static(path.join(__dirname, '..')));

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------

app.use(function (err, req, res, next) {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------

function shutdown() {
  console.log('\nShutting down server...');
  try {
    db.close();
    console.log('Database closed.');
  } catch (e) {
    // ignore
  }
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------

app.listen(PORT, function () {
  console.log('Mahjong server running on http://localhost:' + PORT);
  console.log('Database: ' + DB_PATH);
});

module.exports = app;
