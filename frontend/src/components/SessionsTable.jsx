import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDateTime, truncateId } from '../utils/formatters';

export default function SessionsTable({ sessions = [] }) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  const filteredSessions = useMemo(() => {
    if (!searchTerm.trim()) return sessions;
    const term = searchTerm.toLowerCase().trim();
    return sessions.filter((session) => {
      const id = String(session.session_id || session.sessionId || session.id || '').toLowerCase();
      return id.includes(term);
    });
  }, [sessions, searchTerm]);

  const handleRowClick = (sessionId) => {
    if (sessionId) {
      navigate(`/sessions/${encodeURIComponent(sessionId)}`);
    }
  };

  const handleCopy = (e, fullId) => {
    e.stopPropagation();
    navigator.clipboard?.writeText(fullId);
    setCopiedId(fullId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="content-card">
      <div className="table-toolbar">
        <div className="search-box-wrapper">
          <svg
            className="search-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="search-input"
            placeholder="Search by session ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="toolbar-actions">
          <span className="stat-subtext">
            Showing <strong>{filteredSessions.length}</strong> of <strong>{sessions.length}</strong> sessions
          </span>
        </div>
      </div>

      <div className="sessions-table-wrapper">
        <table className="sessions-table">
          <thead>
            <tr>
              <th>Session ID</th>
              <th>Total Events</th>
              <th>First Seen</th>
              <th>Last Seen</th>
              <th style={{ textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredSessions.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                    {searchTerm ? 'No sessions found matching your search.' : 'No sessions available yet.'}
                  </div>
                </td>
              </tr>
            ) : (
              filteredSessions.map((session, index) => {
                const fullId = String(session.session_id || session.sessionId || session.id || `session-${index}`);
                const shortId = truncateId(fullId, 8);
                const totalEvents = session.total_events ?? session.totalEvents ?? session.event_count ?? session.count ?? (session.events ? session.events.length : 0);
                const firstSeen = session.first_seen || session.firstSeen || session.created_at || session.startTime;
                const lastSeen = session.last_seen || session.lastSeen || session.updated_at || session.endTime;

                return (
                  <tr
                    key={fullId}
                    onClick={() => handleRowClick(fullId)}
                    title={`Click to view timeline for session ${fullId}`}
                  >
                    <td>
                      <span className="session-id-pill" title={fullId}>
                        <span>{shortId}</span>
                        <button
                          type="button"
                          className="copy-btn"
                          style={{ padding: '2px 4px', fontSize: '0.7rem' }}
                          onClick={(e) => handleCopy(e, fullId)}
                          title="Copy full Session ID"
                        >
                          {copiedId === fullId ? '✓ Copied' : 'Copy'}
                        </button>
                      </span>
                    </td>
                    <td>
                      <span className="events-count-badge">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                        </svg>
                        {totalEvents} {totalEvents === 1 ? 'event' : 'events'}
                      </span>
                    </td>
                    <td>
                      <div className="timestamp-cell">
                        <span className="timestamp-main">{formatDateTime(firstSeen)}</span>
                      </div>
                    </td>
                    <td>
                      <div className="timestamp-cell">
                        <span className="timestamp-main">{formatDateTime(lastSeen)}</span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span className="row-action">
                        View Journey
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="table-footer">
        <span>Click any row to inspect user activity stream</span>
        <span>Total: {sessions.length} sessions</span>
      </div>
    </div>
  );
}
