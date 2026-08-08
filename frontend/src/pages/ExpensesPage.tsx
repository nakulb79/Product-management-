import { FormEvent, useEffect, useMemo, useState } from 'react';
import api from '../api/api';
import { Expense, ExpenseCategory, ExpenseListResponse } from '../types';
import { ErrorBanner, SuccessBanner } from '../components/Banner';
import TableStatusRow from '../components/TableStatusRow';
import { getErrorMessage } from '../utils/getErrorMessage';

const categories: ExpenseCategory[] = ['rent', 'utilities', 'salary', 'transport', 'misc', 'other'];
const PAGE_SIZE = 15;

function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [totalsByCategory, setTotalsByCategory] = useState<ExpenseListResponse['totalsByCategory']>([]);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('misc');
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadExpenses = async (targetPage: number = page) => {
    const response = await api.get<ExpenseListResponse>('/expenses', { params: { page: targetPage, limit: PAGE_SIZE } });
    setExpenses(response.data.data);
    setTotalsByCategory(response.data.totalsByCategory);
    setTotalPages(response.data.pagination.totalPages);
    setPage(response.data.pagination.page);
  };

  const goToPage = async (nextPage: number) => {
    const clamped = Math.min(Math.max(nextPage, 1), totalPages);
    if (clamped === page) return;
    setLoading(true);
    try {
      await loadExpenses(clamped);
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Failed to load expenses'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const bootstrap = async () => {
      setLoading(true);
      try {
        await loadExpenses(1);
      } catch (requestError) {
        setError(getErrorMessage(requestError, 'Failed to load expenses'));
      } finally {
        setLoading(false);
      }
    };
    bootstrap();
  }, []);

  const totals = useMemo(
    () => totalsByCategory.reduce((sum, entry) => sum + entry.amount, 0),
    [totalsByCategory]
  );

  const submitExpense = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setNotice('');

    if (!title.trim()) {
      setError('Title is required.');
      return;
    }

    const numericAmount = Number(amount);
    if (Number.isNaN(numericAmount) || numericAmount < 0) {
      setError('Amount must be a valid non-negative number.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/expenses', {
        title: title.trim(),
        category,
        amount: numericAmount,
        expenseDate: expenseDate || undefined,
        notes: notes.trim() || undefined
      });
      setTitle('');
      setCategory('misc');
      setAmount('');
      setExpenseDate('');
      setNotes('');
      setNotice('Expense added successfully.');
      await loadExpenses(1);
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Failed to create expense.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="expenses-page-wrapper">
      <header style={{ marginBottom: '2rem' }}>
        <h1>Expenses</h1>
        <p>Track your operational costs to calculate accurate net profit.</p>
      </header>

      {error && <ErrorBanner>{error}</ErrorBanner>}
      {notice && <SuccessBanner>{notice}</SuccessBanner>}

      <section className="purchases-layout" style={{ gridTemplateColumns: '400px 1fr' }}>
        <article className="panel" style={{ height: 'fit-content' }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '1.5rem' }}>Record New Expense</h2>
          <form className="login-form" onSubmit={submitExpense} style={{ gap: '1rem' }}>
            <label>
              Expense Title *
              <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Monthly Rent" required />
            </label>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <label>
                Category
                <select value={category} onChange={(event) => setCategory(event.target.value as ExpenseCategory)} style={{ textTransform: 'capitalize' }}>
                  {categories.map((entry) => (
                    <option key={entry} value={entry}>{entry}</option>
                  ))}
                </select>
              </label>
              <label>
                Amount (₹) *
                <input type="number" min={0} step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.00" required />
              </label>
            </div>

            <label>
              Expense Date
              <input type="date" value={expenseDate} onChange={(event) => setExpenseDate(event.target.value)} />
            </label>
            
            <label>
              Notes
              <textarea 
                value={notes} 
                onChange={(event) => setNotes(event.target.value)} 
                placeholder="Optional memo..." 
                style={{ minHeight: '80px' }}
              />
            </label>

            <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: '0.5rem', padding: '0.875rem' }}>
              {loading ? 'Processing...' : 'Save Expense'}
            </button>
          </form>
        </article>

        <article className="panel">
          <div className="panel-header">
            <h2 style={{ fontSize: '1.1rem', margin: 0 }}>Expense Log</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ textAlign: 'right' }}>
                <div className="muted" style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Total Expenses</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-danger)' }}>₹{totals.toFixed(0)}</div>
              </div>
              <button type="button" className="btn btn-light" onClick={() => loadExpenses(page)} disabled={loading} style={{ padding: '0.4rem 0.8rem', fontSize: '0.875rem' }}>Refresh</button>
            </div>
          </div>

          <div className="table-container mobile-stack-table" style={{ marginTop: '1.5rem' }}>
            <table>
              <thead>
                <tr>
                  <th>Details</th>
                  <th>Category</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {expenses.length === 0 ? (
                  <TableStatusRow colSpan={3} text="No expenses recorded yet." />
                ) : (
                  expenses.map((expense) => (
                    <tr key={expense._id}>
                      <td data-label="Details">
                        <div style={{ fontWeight: 600 }}>{expense.title}</div>
                        <div className="muted" style={{ fontSize: '0.75rem' }}>{new Date(expense.expenseDate || expense.createdAt || '').toLocaleDateString()}</div>
                        {expense.notes && <div className="muted" style={{ fontSize: '0.8rem', marginTop: '0.25rem', fontStyle: 'italic' }}>"{expense.notes}"</div>}
                      </td>
                      <td data-label="Category">
                        <span className="status-pill" style={{ background: '#fef2f2', color: '#991b1b', textTransform: 'capitalize', fontSize: '0.75rem' }}>
                          {expense.category}
                        </span>
                      </td>
                      <td data-label="Amount" style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 700, fontSize: '1rem' }}>₹{expense.amount.toFixed(0)}</div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="pagination-row" style={{ padding: '1rem 0 0 0', borderTop: '1px solid #f1f5f9' }}>
            <p className="muted" style={{ margin: 0, fontWeight: 500, fontSize: '0.875rem' }}>Page {page} of {totalPages}</p>
            <div className="action-row">
              <button type="button" className="btn btn-outline" onClick={() => goToPage(page - 1)} disabled={page <= 1 || loading} style={{ padding: '0.4rem 0.8rem' }}>
                Previous
              </button>
              <button type="button" className="btn btn-outline" onClick={() => goToPage(page + 1)} disabled={page >= totalPages || loading} style={{ padding: '0.4rem 0.8rem' }}>
                Next
              </button>
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}

export default ExpensesPage;
