# Finance Manager

A comprehensive day-to-day finance tracker application built with Next.js, TypeScript, and SQLite.

## Features

- ✅ **Add Income & Expenses**: Easily track all your financial transactions
- ✅ **Categorization**: Organize transactions with customizable categories
- ✅ **Dashboard**: View your financial overview with total income, expenses, and balance
- ✅ **Category Breakdown**: See how much you're spending/earning in each category
- ✅ **Transaction History**: Browse and search through all your transactions
- ✅ **Filter & Search**: Filter by type (income/expense) and search transactions
- ✅ **Delete Transactions**: Remove transactions you no longer need

## Tech Stack

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **SQLite** - Lightweight database for data persistence
- **Tailwind CSS** - Modern, responsive styling
- **Lucide React** - Beautiful icons

## Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager

### Installation

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

The database will be automatically created on first run with default categories.

## Project Structure

```
finance-manager/
├── app/
│   ├── api/              # API routes
│   │   ├── categories/   # Category management
│   │   ├── transactions/ # Transaction CRUD
│   │   └── stats/        # Financial statistics
│   ├── globals.css       # Global styles
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Main dashboard
├── components/           # React components
│   ├── TransactionForm.tsx
│   ├── TransactionList.tsx
│   └── StatsCard.tsx
├── lib/
│   └── db.ts            # Database setup and utilities
└── finance.db           # SQLite database (created automatically)
```

## Default Categories

The app comes with pre-configured categories:

**Income:**
- Salary
- Freelance
- Investment
- Other Income

**Expenses:**
- Food & Dining
- Shopping
- Transportation
- Bills & Utilities
- Entertainment
- Healthcare
- Education
- Other Expense

You can add more categories through the API or by modifying the database.

## API Endpoints

### Categories
- `GET /api/categories` - Get all categories (optional `?type=income|expense`)
- `POST /api/categories` - Create a new category

### Transactions
- `GET /api/transactions` - Get all transactions (optional filters: `?type=`, `?category_id=`, `?start_date=`, `?end_date=`, `?limit=`)
- `POST /api/transactions` - Create a new transaction
- `DELETE /api/transactions/[id]` - Delete a transaction
- `PATCH /api/transactions/[id]` - Update a transaction

### Statistics
- `GET /api/stats` - Get financial statistics (optional filters: `?start_date=`, `?end_date=`)

## Building for Production

```bash
npm run build
npm start
```

## License

MIT

