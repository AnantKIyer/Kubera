import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = path.join(process.cwd(), 'finance.db');

function initializeDatabase(db: Database) {
  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
      color TEXT NOT NULL DEFAULT '#6366f1',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
      amount REAL NOT NULL,
      description TEXT,
      category_id INTEGER,
      date TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id)
    );

    CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
    CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
    CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);

    -- Trigger to ensure category type matches transaction type
    CREATE TRIGGER IF NOT EXISTS check_category_type_on_insert
    BEFORE INSERT ON transactions
    WHEN NEW.category_id IS NOT NULL
    BEGIN
      SELECT CASE
        WHEN (SELECT type FROM categories WHERE id = NEW.category_id) != NEW.type
        THEN RAISE(ABORT, 'Category type must match transaction type')
      END;
    END;

    CREATE TRIGGER IF NOT EXISTS check_category_type_on_update
    BEFORE UPDATE ON transactions
    WHEN NEW.category_id IS NOT NULL
    BEGIN
      SELECT CASE
        WHEN (SELECT type FROM categories WHERE id = NEW.category_id) != NEW.type
        THEN RAISE(ABORT, 'Category type must match transaction type')
      END;
    END;
  `);

  // Check if categories table is empty and insert defaults
  const categoryCount = db.prepare('SELECT COUNT(*) as count FROM categories').get() as { count: number };
  
  if (categoryCount.count === 0) {
    const defaultCategories = [
      { name: 'Salary', type: 'income', color: '#10b981' },
      { name: 'Freelance', type: 'income', color: '#10b981' },
      { name: 'Investment', type: 'income', color: '#10b981' },
      { name: 'Other Income', type: 'income', color: '#10b981' },
      { name: 'Food & Dining', type: 'expense', color: '#ef4444' },
      { name: 'Shopping', type: 'expense', color: '#ef4444' },
      { name: 'Transportation', type: 'expense', color: '#ef4444' },
      { name: 'Bills & Utilities', type: 'expense', color: '#ef4444' },
      { name: 'Entertainment', type: 'expense', color: '#ef4444' },
      { name: 'Healthcare', type: 'expense', color: '#ef4444' },
      { name: 'Education', type: 'expense', color: '#ef4444' },
      { name: 'Other Expense', type: 'expense', color: '#ef4444' },
    ];

    const insertCategory = db.prepare('INSERT INTO categories (name, type, color) VALUES (?, ?, ?)');
    const insertMany = db.transaction((categories) => {
      for (const category of categories) {
        insertCategory.run(category.name, category.type, category.color);
      }
    });
    insertMany(defaultCategories);
  }
}

let dbInstance: Database | null = null;

export function getDb(): Database {
  if (!dbInstance) {
    dbInstance = new Database(dbPath);
    dbInstance.pragma('journal_mode = WAL');
    initializeDatabase(dbInstance);
  }
  return dbInstance;
}

export interface Category {
  id: number;
  name: string;
  type: 'income' | 'expense';
  color: string;
  created_at: string;
}

export interface Transaction {
  id: number;
  type: 'income' | 'expense';
  amount: number;
  description: string | null;
  category_id: number | null;
  date: string;
  created_at: string;
}

export interface TransactionWithCategory extends Transaction {
  category_name: string | null;
  category_color: string | null;
}

