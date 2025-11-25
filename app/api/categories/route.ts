import { NextRequest, NextResponse } from 'next/server';
import { getDb, Category } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    let categories: Category[];
    if (type && (type === 'income' || type === 'expense')) {
      categories = db.prepare('SELECT * FROM categories WHERE type = ? ORDER BY name').all(type) as Category[];
    } else {
      categories = db.prepare('SELECT * FROM categories ORDER BY type, name').all() as Category[];
    }

    return NextResponse.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = getDb();
    const body = await request.json();
    const { name, type, color } = body;

    if (!name || !type || (type !== 'income' && type !== 'expense')) {
      return NextResponse.json({ error: 'Invalid category data' }, { status: 400 });
    }

    const result = db
      .prepare('INSERT INTO categories (name, type, color) VALUES (?, ?, ?)')
      .run(name, type, color || '#6366f1');

    const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(result.lastInsertRowid) as Category;

    return NextResponse.json(category, { status: 201 });
  } catch (error: any) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return NextResponse.json({ error: 'Category name already exists' }, { status: 409 });
    }
    console.error('Error creating category:', error);
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
  }
}

