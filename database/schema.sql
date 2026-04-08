-- TCC System SQLite Schema
-- This schema is prepared for backend integration.

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'Clerk', -- 'Manager', 'Clerk', 'Driver', 'Customer'
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS consignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  consignment_number TEXT NOT NULL UNIQUE,
  sender_name TEXT NOT NULL,
  sender_address TEXT NOT NULL,
  receiver_name TEXT NOT NULL,
  receiver_address TEXT NOT NULL,
  destination TEXT NOT NULL,
  volume REAL NOT NULL,
  cost REAL NOT NULL,
  status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Ready for Dispatch', 'In Transit', 'Delivered')),
  created_by_user_id INTEGER,
  created_at TEXT NOT NULL,
  assigned_truck_id INTEGER,
  dispatched_at TEXT,
  delivered_at TEXT,
  FOREIGN KEY (created_by_user_id) REFERENCES users(id),
  FOREIGN KEY (assigned_truck_id) REFERENCES trucks(id)
);

CREATE TABLE IF NOT EXISTS trucks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  truck_number TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'Available' CHECK (status IN ('Available', 'Busy', 'Maintenance')),
  current_location TEXT NOT NULL,
  last_assigned_at TEXT
);

CREATE TABLE IF NOT EXISTS truck_usage_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  truck_id INTEGER NOT NULL,
  destination TEXT NOT NULL,
  consignment_ids TEXT NOT NULL, -- JSON array of consignment numbers
  dispatched_at TEXT NOT NULL,
  arrived_at TEXT,
  idle_start_at TEXT, -- When it became available at branch
  FOREIGN KEY (truck_id) REFERENCES trucks(id)
);
