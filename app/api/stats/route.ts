import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    let dateFilter = '';
    const params: any[] = [];

    if (startDate && endDate) {
      dateFilter = 'WHERE date >= ? AND date <= ?';
      params.push(startDate, endDate);
    } else if (startDate) {
      dateFilter = 'WHERE date >= ?';
      params.push(startDate);
    } else if (endDate) {
      dateFilter = 'WHERE date <= ?';
      params.push(endDate);
    }

    // Total income
    const incomeResult = db
      .prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'income' ${dateFilter ? 'AND ' + dateFilter.replace('WHERE ', '') : ''}`)
      .get(...params) as { total: number };

    // Total expenses
    const expenseResult = db
      .prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'expense' ${dateFilter ? 'AND ' + dateFilter.replace('WHERE ', '') : ''}`)
      .get(...params) as { total: number };

    // Expenses by category
    const expensesByCategory = db
      .prepare(`
        SELECT 
          c.id,
          c.name,
          c.color,
          COALESCE(SUM(t.amount), 0) as total
        FROM categories c
        LEFT JOIN transactions t ON c.id = t.category_id AND t.type = 'expense' ${dateFilter ? 'AND ' + dateFilter.replace('WHERE ', '') : ''}
        WHERE c.type = 'expense'
        GROUP BY c.id, c.name, c.color
        HAVING total > 0
        ORDER BY total DESC
      `)
      .all(...params) as Array<{ id: number; name: string; color: string; total: number }>;

    // Income by category
    const incomeByCategory = db
      .prepare(`
        SELECT 
          c.id,
          c.name,
          c.color,
          COALESCE(SUM(t.amount), 0) as total
        FROM categories c
        LEFT JOIN transactions t ON c.id = t.category_id AND t.type = 'income' ${dateFilter ? 'AND ' + dateFilter.replace('WHERE ', '') : ''}
        WHERE c.type = 'income'
        GROUP BY c.id, c.name, c.color
        HAVING total > 0
        ORDER BY total DESC
      `)
      .all(...params) as Array<{ id: number; name: string; color: string; total: number }>;

    const totalIncome = incomeResult.total;
    const totalExpenses = expenseResult.total;
    const balance = totalIncome - totalExpenses;

    return NextResponse.json({
      totalIncome,
      totalExpenses,
      balance,
      expensesByCategory,
      incomeByCategory,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}

