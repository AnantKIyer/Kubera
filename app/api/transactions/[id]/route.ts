import { NextRequest, NextResponse } from 'next/server';
import { getDb, TransactionWithCategory } from '@/lib/db';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = getDb();
    const id = parseInt(params.id);

    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid transaction ID' }, { status: 400 });
    }

    const result = db.prepare('DELETE FROM transactions WHERE id = ?').run(id);

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    return NextResponse.json({ error: 'Failed to delete transaction' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = getDb();
    const id = parseInt(params.id);
    const body = await request.json();

    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid transaction ID' }, { status: 400 });
    }

    const { type, amount, description, category_id, date } = body;

    const updates: string[] = [];
    const values: any[] = [];

    if (type && (type === 'income' || type === 'expense')) {
      updates.push('type = ?');
      values.push(type);
    }

    if (amount !== undefined) {
      if (amount <= 0) {
        return NextResponse.json({ error: 'Amount must be greater than 0' }, { status: 400 });
      }
      updates.push('amount = ?');
      values.push(amount);
    }

    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description || null);
    }

    if (category_id !== undefined) {
      // Validate that category type matches transaction type
      if (category_id !== null) {
        const category = db.prepare('SELECT type FROM categories WHERE id = ?').get(category_id) as { type: string } | undefined;
        if (!category) {
          return NextResponse.json({ error: 'Category not found' }, { status: 404 });
        }
        
        // Get current transaction type
        const currentTransaction = db.prepare('SELECT type FROM transactions WHERE id = ?').get(id) as { type: string } | undefined;
        if (!currentTransaction) {
          return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
        }
        
        const transactionType = type || currentTransaction.type;
        if (category.type !== transactionType) {
          return NextResponse.json({ 
            error: `Category type mismatch: ${transactionType} transaction cannot use ${category.type} category` 
          }, { status: 400 });
        }
      }
      
      updates.push('category_id = ?');
      values.push(category_id || null);
    }

    if (date) {
      updates.push('date = ?');
      values.push(date);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    values.push(id);

    const query = `UPDATE transactions SET ${updates.join(', ')} WHERE id = ?`;
    const result = db.prepare(query).run(...values);

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

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
      .get(id) as TransactionWithCategory;

    return NextResponse.json(transaction);
  } catch (error) {
    console.error('Error updating transaction:', error);
    return NextResponse.json({ error: 'Failed to update transaction' }, { status: 500 });
  }
}

