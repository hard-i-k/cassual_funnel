import React, { useEffect, useState } from 'react';
import { getSessions } from '../utils/api';
import SessionsTable from '../components/SessionsTable';

export default function SessionsPage() {
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSessions = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getSessions();
      // Handle array or object wrapper
      const list = Array.isArray(data)
        ? data
        : data.sessions || data.data || [];
      setSessions(list);
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
      setError(err.userMessage || err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to load sessions from server.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

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
          <p className="page-subtitle">Track, filter, and inspect user activity sessions</p>
        </div>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={fetchSessions}
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

      {/* Quick stats cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-label">Total Sessions</span>
          <span className="stat-value">{isLoading ? '—' : totalSessions}</span>
          <span className="stat-subtext">Recorded user visits</span>
        </div>

        <div className="stat-card">
          <span className="stat-label">Total Events</span>
          <span className="stat-value">{isLoading ? '—' : totalEvents}</span>
          <span className="stat-subtext">Clicks and page views</span>
        </div>

        <div className="stat-card">
          <span className="stat-label">Avg. Events / Session</span>
          <span className="stat-value">{isLoading ? '—' : avgEvents}</span>
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
          <button type="button" className="btn btn-sm btn-secondary" onClick={fetchSessions}>
            Retry
          </button>
        </div>
      )}

      {/* Loading state */}
      {isLoading ? (
        <div className="state-box">
          <div className="spinner"></div>
          <div className="state-title">Loading sessions data...</div>
          <div className="state-desc">Fetching recorded sessions from {import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/sessions</div>
        </div>
      ) : (
        <SessionsTable sessions={sessions} />
      )}
    </div>
  );
}
