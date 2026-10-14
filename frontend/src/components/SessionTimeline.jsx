import React, { useState, useMemo } from 'react';
import { formatDateTime } from '../utils/formatters';

export default function SessionTimeline({ events = [] }) {
  const [filterType, setFilterType] = useState('all');

  const filteredEvents = useMemo(() => {
    if (filterType === 'all') return events;
    return events.filter((ev) => {
      const type = (ev.event_type || ev.eventType || ev.type || '').toLowerCase();
      if (filterType === 'page_view') return type === 'page_view' || type === 'pageview';
      if (filterType === 'click') return type === 'click';
      return true;
    });
  }, [events, filterType]);

  const pageViewCount = useMemo(() => {
    return events.filter((ev) => {
      const type = (ev.event_type || ev.eventType || ev.type || '').toLowerCase();
      return type === 'page_view' || type === 'pageview';
    }).length;
  }, [events]);

  const clickCount = useMemo(() => {
    return events.filter((ev) => {
      const type = (ev.event_type || ev.eventType || ev.type || '').toLowerCase();
      return type === 'click';
    }).length;
  }, [events]);

  if (!events || events.length === 0) {
    return (
      <div className="state-box">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" color="#94a3b8">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <div className="state-title">No events recorded for this session</div>
        <div className="state-desc">This session does not have any tracked user interactions or events yet.</div>
      </div>
    );
  }

  return (
    <div className="content-card">
      <div className="card-header">
        <h3 className="card-title">User Journey Stream</h3>
        <div className="filter-pills" style={{ margin: 0 }}>
          <button
            type="button"
            className={`filter-pill ${filterType === 'all' ? 'active' : ''}`}
            onClick={() => setFilterType('all')}
          >
            All Events ({events.length})
          </button>
          <button
            type="button"
            className={`filter-pill ${filterType === 'page_view' ? 'active' : ''}`}
            onClick={() => setFilterType('page_view')}
          >
            Page Views ({pageViewCount})
          </button>
          <button
            type="button"
            className={`filter-pill ${filterType === 'click' ? 'active' : ''}`}
            onClick={() => setFilterType('click')}
          >
            Clicks ({clickCount})
          </button>
        </div>
      </div>

      <div className="timeline-wrapper">
        <div className="timeline-line"></div>
        <div className="timeline-items">
          {filteredEvents.map((event, index) => {
            const rawType = (event.event_type || event.eventType || event.type || 'unknown').toLowerCase();
            const isClick = rawType === 'click';
            const isPageView = rawType === 'page_view' || rawType === 'pageview';

            const pageUrl = event.page_url || event.pageUrl || event.url || '—';
            const timestamp = event.timestamp || event.created_at || event.time;

            const coordX = event.x ?? event.click_x ?? event.clickX ?? event.coordinates?.x ?? event.metadata?.x;
            const coordY = event.y ?? event.click_y ?? event.clickY ?? event.coordinates?.y ?? event.metadata?.y;
            const hasCoords = coordX !== undefined && coordY !== undefined && coordX !== null && coordY !== null;

            return (
              <div className="timeline-item" key={event.id || event._id || index}>
                {/* Node icon marker */}
                <div className={`timeline-dot ${isClick ? 'dot-click' : 'dot-pageview'}`}>
                  {isClick ? (
                    <svg className="timeline-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <circle cx="12" cy="12" r="3" />
                      <line x1="12" y1="2" x2="12" y2="5" />
                      <line x1="12" y1="19" x2="12" y2="22" />
                      <line x1="2" y1="12" x2="5" y2="12" />
                      <line x1="19" y1="12" x2="22" y2="12" />
                    </svg>
                  ) : (
                    <svg className="timeline-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </div>

                {/* Event Card */}
                <div className="timeline-content-card">
                  <div className="timeline-card-header">
                    <div className="timeline-header-left">
                      <span className="event-index">#{index + 1}</span>
                      {isPageView && (
                        <span className="badge badge-pageview">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                          Page View
                        </span>
                      )}
                      {isClick && (
                        <span className="badge badge-click">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <polyline points="15 3 21 3 21 9" />
                            <polyline points="9 21 3 21 3 15" />
                            <line x1="21" y1="3" x2="14" y2="10" />
                            <line x1="3" y1="21" x2="10" y2="14" />
                          </svg>
                          Click Event
                        </span>
                      )}
                      {!isPageView && !isClick && (
                        <span className="badge" style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1' }}>
                          {rawType}
                        </span>
                      )}
                    </div>

                    <span className="timeline-timestamp" title={String(timestamp)}>
                      {formatDateTime(timestamp)}
                    </span>
                  </div>

                  <div className="timeline-card-body">
                    <div className="timeline-row">
                      <span className="timeline-row-label">Page URL</span>
                      <span className="timeline-url" title={pageUrl}>
                        {pageUrl}
                      </span>
                    </div>

                    {(isClick || hasCoords) && (
                      <div className="timeline-row">
                        <span className="timeline-row-label">Coordinates</span>
                        {hasCoords ? (
                          <span className="coords-badge" title={`X: ${coordX}, Y: ${coordY}`}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <circle cx="12" cy="12" r="9" />
                              <line x1="12" y1="8" x2="12" y2="16" />
                              <line x1="8" y1="12" x2="16" y2="12" />
                            </svg>
                            X: <strong>{coordX}</strong>px , Y: <strong>{coordY}</strong>px
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
                            No coordinates recorded
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
