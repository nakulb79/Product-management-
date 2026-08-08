import { useEffect, useMemo, useState } from 'react';
import api from '../api/api';
import { DailySalesSummary, Dashboard, ProfitSummary } from '../types';

type RevenuePoint = {
  day: string;
  revenue: number;
};

const dayName = (date: Date) => date.toLocaleDateString(undefined, { weekday: 'short' });

const defaultProfitSummary: ProfitSummary = {
  range: { from: null, to: null },
  totalRevenue: 0,
  totalCOGS: 0,
  totalProfit: 0,
  totalExpenses: 0,
  netProfit: 0,
  avgMargin: 0,
  topProfitableProducts: []
};

function DashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [profit, setProfit] = useState<ProfitSummary>(defaultProfitSummary);
  const [chartData, setChartData] = useState<RevenuePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDashboard = async () => {
      setLoading(true);
      setError('');
      
      // Fetch data independently
      api.get<Dashboard>('/dashboard')
        .then(res => setData(res.data))
        .catch(() => setError('Failed to load dashboard stats'));

      api.get<ProfitSummary>('/analytics/profit')
        .then(res => setProfit(res.data))
        .catch(() => setError('Failed to load profit analytics'));

      api.get<{ summaries: DailySalesSummary[] }>('/sales/summary/weekly')
        .then(res => {
          if (res.data && res.data.summaries) {
            const formattedChartData = res.data.summaries.map(s => ({
              day: dayName(new Date(s.date)),
              revenue: s.totalSales
            }));
            setChartData(formattedChartData.reverse());
          }
        })
        .catch(() => setError('Failed to load weekly summary'))
        .finally(() => setLoading(false));
    };

    fetchDashboard();
  }, []);

  const maxRevenue = useMemo(() => Math.max(...chartData.map((item) => item.revenue), 1), [chartData]);

  return (
    <div className="dashboard-container">
      <header>
        <h1>Dashboard</h1>
        <p>Real-time overview of your retail operations.</p>
      </header>

      {error && <p className="error-text">{error}</p>}

      <div className="dashboard-cards">
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-muted)' }}>Total Products</h3>
              <p style={{ margin: '0.5rem 0 0', fontSize: '1.5rem', fontWeight: 800 }}>{data?.products ?? '...'}</p>
            </div>
            <div style={{ background: '#eff6ff', padding: '0.5rem', borderRadius: '8px', color: 'var(--color-primary)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                <line x1="12" y1="22.08" x2="12" y2="12"></line>
              </svg>
            </div>
          </div>
        </div>

        <button
          type="button"
          className="card"
          onClick={() => {
            window.history.pushState({}, '', '/reorder');
            window.dispatchEvent(new PopStateEvent('popstate'));
          }}
          style={{ textAlign: 'left', cursor: 'pointer', border: 'none', width: '100%' }}
          title="View the reorder list"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-muted)' }}>Low Stock Items</h3>
              <p style={{ margin: '0.5rem 0 0', fontSize: '1.5rem', fontWeight: 800, color: (data?.lowStock ?? 0) > 0 ? 'var(--color-danger)' : 'inherit' }}>{data?.lowStock ?? '...'}</p>
              {(data?.lowStock ?? 0) > 0 && <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: 'var(--color-primary)', fontWeight: 600 }}>View reorder list →</p>}
            </div>
            <div style={{ background: (data?.lowStock ?? 0) > 0 ? '#fef2f2' : '#f0fdf4', padding: '0.5rem', borderRadius: '8px', color: (data?.lowStock ?? 0) > 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
              </svg>
            </div>
          </div>
        </button>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-muted)' }}>Pending Payments</h3>
              <p style={{ margin: '0.5rem 0 0', fontSize: '1.5rem', fontWeight: 800 }}>{data ? `₹ ${data.pendingPaymentsAmount.toFixed(2)}` : '...'}</p>
            </div>
            <div style={{ background: '#fff7ed', padding: '0.5rem', borderRadius: '8px', color: '#f97316' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="1" x2="12" y2="23"></line>
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
              </svg>
            </div>
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-muted)' }}>Pending Deliveries</h3>
              <p style={{ margin: '0.5rem 0 0', fontSize: '1.5rem', fontWeight: 800 }}>{data?.pendingDeliveries ?? '...'}</p>
            </div>
            <div style={{ background: '#f5f3ff', padding: '0.5rem', borderRadius: '8px', color: '#8b5cf6' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="1" y="3" width="15" height="13"></rect>
                <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
                <circle cx="5.5" cy="18.5" r="2.5"></circle>
                <circle cx="18.5" cy="18.5" r="2.5"></circle>
              </svg>
            </div>
          </div>
        </div>
      </div>

      <h3 className="section-title">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="12" y1="20" x2="12" y2="10"></line>
          <line x1="18" y1="20" x2="18" y2="4"></line>
          <line x1="6" y1="20" x2="6" y2="16"></line>
        </svg>
        Financial Performance
      </h3>
      <div className="dashboard-cards financial-cards">
        <div className="card">
          <h3 style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-muted)', textTransform: 'uppercase' }}>Revenue</h3>
          <p style={{ margin: '0.25rem 0 0', fontSize: '1.25rem', fontWeight: 700 }}>₹ {profit.totalRevenue.toFixed(0)}</p>
        </div>
        <div className="card">
          <h3 style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-muted)', textTransform: 'uppercase' }}>COGS</h3>
          <p style={{ margin: '0.25rem 0 0', fontSize: '1.25rem', fontWeight: 700 }}>₹ {profit.totalCOGS.toFixed(0)}</p>
        </div>
        <div className="card">
          <h3 style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-muted)', textTransform: 'uppercase' }}>Gross Profit</h3>
          <p style={{ margin: '0.25rem 0 0', fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-success)' }}>₹ {profit.totalProfit.toFixed(0)}</p>
        </div>
        <div className="card">
          <h3 style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-muted)', textTransform: 'uppercase' }}>Expenses</h3>
          <p style={{ margin: '0.25rem 0 0', fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-danger)' }}>₹ {profit.totalExpenses.toFixed(0)}</p>
        </div>
        <div className="card">
          <h3 style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-muted)', textTransform: 'uppercase' }}>Net Profit</h3>
          <p style={{ margin: '0.25rem 0 0', fontSize: '1.25rem', fontWeight: 700, color: profit.netProfit >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>₹ {profit.netProfit.toFixed(0)}</p>
        </div>
      </div>

      <div className="panel" style={{ marginTop: '2.5rem' }}>
        <div className="panel-header">
          <h3 style={{ margin: 0 }}>Revenue (Last 7 Days)</h3>
        </div>
        <div className="mini-chart" style={{ height: '240px', alignItems: 'flex-end', paddingTop: '2rem' }}>
          {chartData.length === 0 ? (
            <div style={{ width: '100%', textAlign: 'center', paddingBottom: '2rem' }} className="muted">Loading chart data...</div>
          ) : (
            chartData.map((point) => (
              <div key={point.day} className="mini-chart-col" style={{ flex: 1 }}>
                <div className="mini-chart-value" style={{ fontWeight: 600 }}>₹{point.revenue.toFixed(0)}</div>
                <div
                  className="mini-chart-bar"
                  style={{ 
                    height: `${Math.max((point.revenue / maxRevenue) * 160, 8)}px`,
                    width: '100%',
                    maxWidth: '40px'
                  }}
                  title={`${point.day}: ₹${point.revenue.toFixed(2)}`}
                />
                <div className="mini-chart-label" style={{ fontWeight: 500 }}>{point.day}</div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="panel" style={{ marginTop: '2.5rem' }}>
        <div className="panel-header">
          <h3 style={{ margin: 0 }}>Top Profitable Products</h3>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Qty Sold</th>
                <th>Revenue</th>
                <th>Profit</th>
                <th>Margin</th>
              </tr>
            </thead>
            <tbody>
              {profit.topProfitableProducts.length === 0 ? (
                <tr><td colSpan={5} className="muted" style={{ textAlign: 'center', padding: '2rem' }}>{loading ? 'Loading profit data...' : 'No profit data yet.'}</td></tr>
              ) : (
                profit.topProfitableProducts.map((product) => (
                  <tr key={product.productId}>
                    <td style={{ fontWeight: 500 }}>{product.productName}</td>
                    <td>{product.totalQuantity}</td>
                    <td>₹{product.totalRevenue.toFixed(2)}</td>
                    <td style={{ color: 'var(--color-success)', fontWeight: 600 }}>₹{product.totalProfit.toFixed(2)}</td>
                    <td>
                      <span className="status-pill status-active">
                        {product.margin.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
