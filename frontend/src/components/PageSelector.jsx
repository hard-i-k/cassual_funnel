import React from 'react';

export default function PageSelector({
  pages = [],
  pageStats = [],
  selectedPage = '',
  onSelectPage,
  isLoading = false,
  onRefresh,
}) {
  // Map page stats for quick lookup
  const statsMap = new Map();
  if (Array.isArray(pageStats)) {
    pageStats.forEach((s) => {
      if (s && s._id) {
        statsMap.set(s._id, s.clicks || s.count || 0);
      }
    });
  }

  const normalizedPages = pages.map((p) => {
    if (typeof p === 'string') return p;
    return p.page_url || p.url || p.path || p.name || JSON.stringify(p);
  });

  return (
    <div className="heatmap-control-bar" style={{ padding: '1rem 1.25rem' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem', minWidth: '280px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <label htmlFor="page-select" className="control-label">
            Target Tracked Page
          </label>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #64748b)' }}>
            {normalizedPages.length} tracked page{normalizedPages.length !== 1 ? 's' : ''} available
          </span>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <select
            id="page-select"
            className="page-select"
            value={selectedPage}
            onChange={(e) => onSelectPage && onSelectPage(e.target.value)}
            disabled={isLoading && pages.length === 0}
            style={{
              flex: 1,
              padding: '0.625rem 0.875rem',
              borderRadius: '8px',
              border: '1px solid var(--border-color, #cbd5e1)',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '0.8125rem',
              backgroundColor: '#ffffff',
              color: 'var(--text-primary, #0f172a)',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="" disabled>
              {isLoading ? 'Loading available pages...' : 'Choose a tracked page to inspect...'}
            </option>
            <option value="all">
              🌐 All Pages (Global Aggregation across all sites)
            </option>
            {normalizedPages.map((url, idx) => {
              const clickCount = statsMap.get(url);
              const countLabel = clickCount !== undefined ? ` (${clickCount} clicks)` : '';
              return (
                <option key={`${url}-${idx}`} value={url}>
                  {url}{countLabel}
                </option>
              );
            })}
          </select>

          {onRefresh && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onRefresh}
              disabled={isLoading}
              title="Refresh pages list from server"
              style={{ height: '40px', padding: '0 0.875rem', whiteSpace: 'nowrap' }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                className={isLoading ? 'spinner' : ''}
              >
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
              Refresh
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
