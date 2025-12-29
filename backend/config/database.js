const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database.sqlite');
const db = new sqlite3.Database(dbPath);

// Initialize database tables
const initDatabase = () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Users table
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          name TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Reports table
      db.run(`
        CREATE TABLE IF NOT EXISTS reports (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          type TEXT NOT NULL,
          title TEXT NOT NULL,
          file_path TEXT NOT NULL,
          original_filename TEXT,
          date DATE NOT NULL,
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);

      // Vitals table
      db.run(`
        CREATE TABLE IF NOT EXISTS vitals (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          type TEXT NOT NULL,
          value REAL NOT NULL,
          unit TEXT NOT NULL,
          recorded_at DATETIME NOT NULL,
          report_id TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE SET NULL
        )
      `);

      // Shared access table
      db.run(`
        CREATE TABLE IF NOT EXISTS shared_access (
          id TEXT PRIMARY KEY,
          report_id TEXT NOT NULL,
          owner_id TEXT NOT NULL,
          shared_with_email TEXT NOT NULL,
          access_type TEXT DEFAULT 'read',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE,
          FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  });
};

module.exports = { db, initDatabase };
