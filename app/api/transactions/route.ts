import { NextRequest, NextResponse } from 'next/server';
import { getDb, TransactionWithCategory } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const categoryId = searchParams.get('category_id');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const limit = searchParams.get('limit');

    let query = `
      SELECT 
        t.*,
        c.name as category_name,
        c.color as category_color
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (type && (type === 'income' || type === 'expense')) {
      query += ' AND t.type = ?';
      params.push(type);
    }

    if (categoryId) {
      query += ' AND t.category_id = ?';
      params.push(parseInt(categoryId));
    }

    if (startDate) {
      query += ' AND t.date >= ?';
      params.push(startDate);
    }

    if (endDate) {
      query += ' AND t.date <= ?';
      params.push(endDate);
    }

    query += ' ORDER BY t.date DESC, t.created_at DESC';

    if (limit) {
      query += ' LIMIT ?';
      params.push(parseInt(limit));
    }

    const transactions = db.prepare(query).all(...params) as TransactionWithCategory[];

    return NextResponse.json(transactions);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = getDb();
    const body = await request.json();
    const { type, amount, description, category_id, date } = body;

    if (!type || (type !== 'income' && type !== 'expense') || !amount || !date) {
      return NextResponse.json({ error: 'Invalid transaction data' }, { status: 400 });
    }

    if (amount <= 0) {
      return NextResponse.json({ error: 'Amount must be greater than 0' }, { status: 400 });
    }

    // Validate that category type matches transaction type
    if (category_id) {
      const category = db.prepare('SELECT type FROM categories WHERE id = ?').get(category_id) as { type: string } | undefined;
      if (!category) {
        return NextResponse.json({ error: 'Category not found' }, { status: 404 });
      }
      if (category.type !== type) {
        return NextResponse.json({ 
          error: `Category type mismatch: ${type} transaction cannot use ${category.type} category` 
        }, { status: 400 });
      }
    }

    const result = db
      .prepare('INSERT INTO transactions (type, amount, description, category_id, date) VALUES (?, ?, ?, ?, ?)')
      .run(type, amount, description || null, category_id || null, date);

    const transaction = db
      .prepare(`
        SELECT 
          t.*,
          c.name as category_name,
          c.color as category_color
        FROM transactions t
        LEFT JOIN categories c ON t.category_id = c.id
        WHERE t.id = ?
      `)
      .get(result.lastInsertRowid) as TransactionWithCategory;

    return NextResponse.json(transaction, { status: 201 });
  } catch (error) {
    console.error('Error creating transaction:', error);
    return NextResponse.json({ error: 'Failed to create transaction' }, { status: 500 });
  }
}

