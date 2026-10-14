import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getSessionEvents } from '../utils/api';
import SessionTimeline from '../components/SessionTimeline';

export default function SessionDetailPage() {
  const { sessionId } = useParams();
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const fetchEvents = async () => {
    if (!sessionId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await getSessionEvents(sessionId);
      const list = Array.isArray(data)
        ? data
        : data.events || data.data || [];
      // Sort chronologically by timestamp if possible
      list.sort((a, b) => {
        const tA = new Date(a.timestamp || a.created_at || a.time || 0).getTime();
        const tB = new Date(b.timestamp || b.created_at || b.time || 0).getTime();
        return tA - tB;
      });
      setEvents(list);
    } catch (err) {
      console.error('Failed to fetch session events:', err);
      setError(err.userMessage || err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to load events for this session.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [sessionId]);

  const copySessionId = () => {
    if (sessionId) {
      navigator.clipboard?.writeText(sessionId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const pageViewCount = useMemo(() => {
    return events.filter((e) => {
      const t = (e.event_type || e.eventType || e.type || '').toLowerCase();
      return t === 'page_view' || t === 'pageview';
    }).length;
  }, [events]);

  const clickCount = useMemo(() => {
    return events.filter((e) => {
      const t = (e.event_type || e.eventType || e.type || '').toLowerCase();
      return t === 'click';
    }).length;
  }, [events]);

  return (
    <div className="page-wrapper">
      <div className="detail-container">
        {/* Back navigation */}
        <div className="back-nav-bar">
          <Link to="/sessions" className="back-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back to Sessions
          </Link>
        </div>

        {/* Session ID Header Card */}
        <div className="session-header-card">
          <div className="session-header-top">
            <div className="session-id-display">
              <span className="session-id-label">Session Investigation</span>
              <div className="session-id-full">
                <span>{sessionId}</span>
                <button
                  type="button"
                  className="copy-btn"
                  onClick={copySessionId}
                  title="Copy full Session ID"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                  </svg>
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={fetchEvents}
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
              Refresh Events
            </button>
          </div>

          <div className="session-quick-stats">
            <div className="quick-stat-item">
              <span className="quick-stat-val">{events.length}</span>
              <span className="quick-stat-lbl">Total Events</span>
            </div>
            <div className="quick-stat-item">
              <span className="quick-stat-val" style={{ color: '#2563eb' }}>{pageViewCount}</span>
              <span className="quick-stat-lbl">Page Views</span>
            </div>
            <div className="quick-stat-item">
              <span className="quick-stat-val" style={{ color: '#ea580c' }}>{clickCount}</span>
              <span className="quick-stat-lbl">Clicks</span>
            </div>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="error-banner">
            <div>
              <strong>Failed to fetch session timeline: </strong>
              <span className="error-message">{error}</span>
            </div>
            <button type="button" className="btn btn-sm btn-secondary" onClick={fetchEvents}>
              Retry
            </button>
          </div>
        )}

        {/* Loading / Content */}
        {isLoading ? (
          <div className="state-box">
            <div className="spinner"></div>
            <div className="state-title">Loading session events...</div>
            <div className="state-desc">Fetching interaction history for session {sessionId}</div>
          </div>
        ) : (
          <SessionTimeline events={events} />
        )}
      </div>
    </div>
  );
}
