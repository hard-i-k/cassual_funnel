import React from 'react';

export default function PageSelector({
  pages = [],
  selectedPage = '',
  onSelectPage,
  isLoading = false,
  onRefresh,
}) {
  const normalizedPages = pages.map((p) => {
    if (typeof p === 'string') return p;
    return p.page_url || p.url || p.path || p.name || JSON.stringify(p);
  });

  return (
    <div className="heatmap-toolbar-card">
      <div className="selector-row">
        <div className="selector-group">
          <label htmlFor="page-select" className="selector-label">
            Target Page URL
          </label>
          <select
            id="page-select"
            className="page-select"
            value={selectedPage}
            onChange={(e) => onSelectPage && onSelectPage(e.target.value)}
            disabled={isLoading && pages.length === 0}
          >
            <option value="" disabled>
              {isLoading ? 'Loading available pages...' : 'Choose a tracked page to inspect...'}
            </option>
            {normalizedPages.map((url, idx) => (
              <option key={`${url}-${idx}`} value={url}>
                {url}
              </option>
            ))}
          </select>
        </div>

        {onRefresh && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onRefresh}
            disabled={isLoading}
            title="Refresh pages list"
            style={{ marginTop: 'auto', height: '42px' }}
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
            Refresh
          </button>
        )}
      </div>
    </div>
  );
}
