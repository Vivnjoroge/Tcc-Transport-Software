-- TCC System SQLite Schema
-- This schema is prepared for backend integration.

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS consignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sender_name TEXT NOT NULL,
  sender_address TEXT NOT NULL,
  receiver_name TEXT NOT NULL,
  receiver_address TEXT NOT NULL,
  destination TEXT NOT NULL,
  volume REAL NOT NULL,
  cost REAL NOT NULL,
  created_by_user_id INTEGER,
  created_at TEXT NOT NULL,
  FOREIGN KEY (created_by_user_id) REFERENCES users(id)
);
