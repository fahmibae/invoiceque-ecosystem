import type { Expense, ExpenseStats } from "./api";
import { expenseApi } from "./api";
import { convertToIDR } from "./utils";

const PAGE_SIZE = 500;
const MONTHLY_WINDOW = 12;

function safeDate(value: string): Date {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function isSameMonth(date: Date, month: Date): boolean {
  return (
    date.getFullYear() === month.getFullYear() &&
    date.getMonth() === month.getMonth()
  );
}

export async function fetchAllExpensesForStats(): Promise<Expense[]> {
  const firstPage = await expenseApi.list({ page: 1, per_page: PAGE_SIZE });
  const expenses = [...(firstPage.data || [])];
  const totalPages = firstPage.total_pages || 1;

  if (totalPages <= 1) return expenses;

  const rest = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) =>
      expenseApi.list({ page: index + 2, per_page: PAGE_SIZE }),
    ),
  );

  rest.forEach((page) => expenses.push(...(page.data || [])));
  return expenses;
}

export function calculateExpenseStatsInIDR(
  expenses: Expense[],
  rates?: Record<string, number>,
): ExpenseStats {
  const now = new Date();
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const monthlyStart = new Date(
    now.getFullYear(),
    now.getMonth() - (MONTHLY_WINDOW - 1),
    1,
  );
  const byCategory = new Map<
    string,
    { category: string; count: number; total: number }
  >();
  const monthly = new Map<
    string,
    { month: string; total: number; count: number }
  >();

  let totalAmount = 0;
  let taxDeductibleTotal = 0;
  let thisMonthTotal = 0;
  let lastMonthTotal = 0;

  expenses.forEach((expense) => {
    const date = safeDate(expense.expense_date);
    const amount = convertToIDR(
      expense.amount || 0,
      expense.currency || "IDR",
      rates,
    );
    const category = expense.category || "other";

    totalAmount += amount;
    if (expense.is_tax_deductible) taxDeductibleTotal += amount;
    if (isSameMonth(date, thisMonth)) thisMonthTotal += amount;
    if (isSameMonth(date, lastMonth)) lastMonthTotal += amount;

    const categoryStats = byCategory.get(category) || {
      category,
      count: 0,
      total: 0,
    };
    categoryStats.count += 1;
    categoryStats.total += amount;
    byCategory.set(category, categoryStats);

    const monthDate = new Date(date.getFullYear(), date.getMonth(), 1);
    if (monthDate >= monthlyStart) {
      const key = monthKey(date);
      const monthStats = monthly.get(key) || { month: key, count: 0, total: 0 };
      monthStats.count += 1;
      monthStats.total += amount;
      monthly.set(key, monthStats);
    }
  });

  return {
    total_amount: Math.round(totalAmount),
    total_count: expenses.length,
    tax_deductible_total: Math.round(taxDeductibleTotal),
    this_month: Math.round(thisMonthTotal),
    last_month: Math.round(lastMonthTotal),
    by_category: Array.from(byCategory.values()).sort(
      (a, b) => b.total - a.total,
    ),
    monthly: Array.from(monthly.values()).sort((a, b) =>
      a.month.localeCompare(b.month),
    ),
  };
}

export function hasNonIDRExpenses(expenses: Expense[]): boolean {
  return expenses.some(
    (expense) => (expense.currency || "IDR").toUpperCase() !== "IDR",
  );
}
