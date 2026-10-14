import React, { useEffect, useState } from 'react';
import { getSessions } from '../utils/api';
import SessionsTable from '../components/SessionsTable';

export default function SessionsPage() {
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [autoSync, setAutoSync] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchSessions = async (silent = false) => {
    if (!silent) setIsLoading(true);
    setError(null);
    try {
      const data = await getSessions();
      // Handle array or object wrapper
      const list = Array.isArray(data)
        ? data
        : data.sessions || data.data || [];
      setSessions(list);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      if (!silent) {
        console.error('Failed to fetch sessions:', err);
        setError(err.userMessage || err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to load sessions from server.');
      }
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();

    if (!autoSync) return;
    const interval = setInterval(() => {
      fetchSessions(true);
    }, 3000);

    return () => clearInterval(interval);
  }, [autoSync]);

  // Summary statistics
  const totalSessions = sessions.length;
  const totalEvents = sessions.reduce((acc, s) => {
    const count = s.total_events ?? s.totalEvents ?? s.event_count ?? s.count ?? (s.events ? s.events.length : 0);
    return acc + (Number(count) || 0);
  }, 0);

  const avgEvents = totalSessions > 0 ? (totalEvents / totalSessions).toFixed(1) : 0;

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h1 className="page-title">User Sessions</h1>
          <p className="page-subtitle">Track, filter, and inspect user activity sessions in real-time</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {lastUpdated && (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', marginRight: '0.25rem' }}>
              Synced: {lastUpdated}
            </span>
          )}
          <button
            type="button"
            className="btn btn-sm btn-secondary"
            onClick={() => setAutoSync(!autoSync)}
            title="Toggle live auto-refresh"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: autoSync ? '#10b981' : '#94a3b8',
                boxShadow: autoSync ? '0 0 6px #10b981' : 'none',
              }}
            />
            {autoSync ? 'Live Sync: ON' : 'Live Sync: OFF'}
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => fetchSessions(false)}
            disabled={isLoading}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              className={isLoading ? 'spinner' : ''}
              style={{ width: '15px', height: '15px', borderWidth: '2px' }}
            >
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
            </svg>
            Refresh Data
          </button>
        </div>
      </div>

      {/* Quick stats cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-label">Total Sessions</span>
          <span className="stat-value">{isLoading && sessions.length === 0 ? '—' : totalSessions}</span>
          <span className="stat-subtext">Recorded user visits</span>
        </div>

        <div className="stat-card">
          <span className="stat-label">Total Events</span>
          <span className="stat-value">{isLoading && sessions.length === 0 ? '—' : totalEvents}</span>
          <span className="stat-subtext">Clicks and page views</span>
        </div>

        <div className="stat-card">
          <span className="stat-label">Avg. Events / Session</span>
          <span className="stat-value">{isLoading && sessions.length === 0 ? '—' : avgEvents}</span>
          <span className="stat-subtext">User engagement depth</span>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="error-banner">
          <div>
            <strong>Error connecting to API: </strong>
            <span className="error-message">{error}</span>
          </div>
          <button type="button" className="btn btn-sm btn-secondary" onClick={() => fetchSessions(false)}>
            Retry
          </button>
        </div>
      )}

      {/* Loading state */}
      {isLoading && sessions.length === 0 ? (
        <div className="state-box">
          <div className="spinner"></div>
          <div className="state-title">Loading sessions data...</div>
          <div className="state-desc">Fetching recorded sessions from backend API</div>
        </div>
      ) : (
        <SessionsTable sessions={sessions} />
      )}
    </div>
  );
}
