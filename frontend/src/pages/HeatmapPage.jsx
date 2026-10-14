import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getPages, getHeatmap } from '../utils/api';
import PageSelector from '../components/PageSelector';
import Heatmap from '../components/Heatmap';

export default function HeatmapPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [pages, setPages] = useState([]);
  const [pageStats, setPageStats] = useState([]);
  const [selectedPage, setSelectedPage] = useState(searchParams.get('page_url') || '');
  const [clicks, setClicks] = useState([]);
  const [totalClicks, setTotalClicks] = useState(0);

  const [isLoadingPages, setIsLoadingPages] = useState(true);
  const [isLoadingHeatmap, setIsLoadingHeatmap] = useState(false);
  const [pagesError, setPagesError] = useState(null);
  const [heatmapError, setHeatmapError] = useState(null);

  // Live Auto-Sync states (real-time updates)
  const [autoSync, setAutoSync] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Keep a ref of selectedPage for interval callbacks
  const selectedPageRef = useRef(selectedPage);
  selectedPageRef.current = selectedPage;

  // Fetch available pages
  const fetchAvailablePages = async (silent = false) => {
    if (!silent) setIsLoadingPages(true);
    setPagesError(null);
    try {
      const data = await getPages();
      const list = Array.isArray(data) ? data : data.pages || data.data || [];
      const stats = data.stats || [];

      // Normalize list items into strings
      const stringUrls = list.map((item) => {
        if (typeof item === 'string') return item;
        return item.page_url || item.url || item.path || String(item);
      });

      setPages(stringUrls);
      setPageStats(stats);

      // If no page is currently selected, select the first available page with clicks or first page
      const currentParam = searchParams.get('page_url');
      if (stringUrls.length > 0) {
        if (currentParam && (stringUrls.includes(currentParam) || currentParam === 'all')) {
          setSelectedPage(currentParam);
        } else if (!selectedPageRef.current || (!stringUrls.includes(selectedPageRef.current) && selectedPageRef.current !== 'all')) {
          // Prefer page that has most clicks from stats
          const bestPage = stats.length > 0 && stats[0]._id ? stats[0]._id : stringUrls[0];
          setSelectedPage(bestPage);
          setSearchParams({ page_url: bestPage }, { replace: true });
        }
      }
    } catch (err) {
      if (!silent) {
        console.error('Failed to fetch pages:', err);
        setPagesError(
          err.userMessage ||
          err.response?.data?.error ||
          err.response?.data?.message ||
          err.message ||
          'Failed to load tracked pages.'
        );
      }
    } finally {
      if (!silent) setIsLoadingPages(false);
    }
  };

  // Fetch heatmap clicks for a page
  const fetchHeatmapData = async (page, silent = false) => {
    if (!page) {
      setClicks([]);
      setTotalClicks(0);
      return;
    }

    if (!silent) setIsLoadingHeatmap(true);
    setHeatmapError(null);
    try {
      const data = await getHeatmap(page);

      // Handle varied backend responses: array or object
      let points = [];
      let total = 0;

      if (Array.isArray(data)) {
        points = data;
        total = data.length;
      } else if (data && typeof data === 'object') {
        points = data.clicks || data.points || data.data || [];
        total = data.total_clicks ?? data.totalClicks ?? data.total ?? points.length;
      }

      setClicks(points);
      setTotalClicks(total);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      if (!silent) {
        console.error(`Failed to fetch heatmap data for page ${page}:`, err);
        setHeatmapError(
          err.userMessage ||
          err.response?.data?.error ||
          err.response?.data?.message ||
          err.message ||
          `Failed to load heatmap for ${page}`
        );
        setClicks([]);
        setTotalClicks(0);
      }
    } finally {
      if (!silent) setIsLoadingHeatmap(false);
    }
  };

  // Initial load of pages list
  useEffect(() => {
    fetchAvailablePages();
  }, []);

  // Fetch clicks whenever selectedPage changes
  useEffect(() => {
    if (selectedPage) {
      fetchHeatmapData(selectedPage);
    }
  }, [selectedPage]);

  // Live Auto-Sync polling every 3 seconds
  useEffect(() => {
    if (!autoSync) return;

    const interval = setInterval(() => {
      if (selectedPageRef.current) {
        fetchHeatmapData(selectedPageRef.current, true);
      }
      // Also silently refresh page list every 9 seconds
      fetchAvailablePages(true);
    }, 3000);

    return () => clearInterval(interval);
  }, [autoSync]);

  const handleSelectPage = (pageUrl) => {
    setSelectedPage(pageUrl);
    setSearchParams({ page_url: pageUrl });
  };

  return (
    <div className="page-wrapper">
      {/* Header with Title and Live Auto-Sync Toggle */}
      <div className="page-header">
        <div>
          <h1 className="page-title">User Click Heatmap</h1>
          <p className="page-subtitle">
            Live spatial density visualization and user interaction hotspots
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
          {/* Live Auto-Sync Toggle */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: '#ffffff',
              padding: '0.4rem 0.75rem',
              borderRadius: '8px',
              border: '1px solid var(--border-color, #e2e8f0)',
              fontSize: '0.8125rem',
              fontWeight: 600,
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: autoSync ? '#10b981' : '#94a3b8',
                display: 'inline-block',
              }}
            ></span>
            <span>Live Auto-Sync</span>
            <input
              type="checkbox"
              checked={autoSync}
              onChange={(e) => setAutoSync(e.target.checked)}
              style={{ cursor: 'pointer', accentColor: 'var(--primary, #2563eb)' }}
              title="Toggle live 3-second data polling"
            />
            {lastUpdated && (
              <span style={{ color: 'var(--text-muted, #64748b)', fontSize: '0.75rem', marginLeft: '4px' }}>
                ({lastUpdated})
              </span>
            )}
          </div>

          {selectedPage && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                fetchHeatmapData(selectedPage);
                fetchAvailablePages(true);
              }}
              disabled={isLoadingHeatmap}
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                className={isLoadingHeatmap ? 'spinner' : ''}
              >
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
              Refresh
            </button>
          )}
        </div>
      </div>

      {/* Pages loading error banner */}
      {pagesError && (
        <div className="error-banner">
          <div>
            <strong>Error loading pages list: </strong>
            <span className="error-message">{pagesError}</span>
          </div>
          <button type="button" className="btn btn-sm btn-secondary" onClick={() => fetchAvailablePages()}>
            Retry
          </button>
        </div>
      )}

      {/* Page Selector Bar */}
      <PageSelector
        pages={pages}
        pageStats={pageStats}
        selectedPage={selectedPage}
        onSelectPage={handleSelectPage}
        isLoading={isLoadingPages}
        onRefresh={() => fetchAvailablePages()}
      />

      {/* Heatmap fetch error banner */}
      {heatmapError && (
        <div className="error-banner" style={{ marginTop: '1.25rem' }}>
          <div>
            <strong>Heatmap Error: </strong>
            <span className="error-message">{heatmapError}</span>
          </div>
          <button
            type="button"
            className="btn btn-sm btn-secondary"
            onClick={() => fetchHeatmapData(selectedPage)}
          >
            Retry
          </button>
        </div>
      )}

      {/* Heatmap View or Placeholder */}
      <div style={{ marginTop: '1.25rem' }}>
        {isLoadingHeatmap && clicks.length === 0 ? (
          <div className="state-box">
            <div className="spinner"></div>
            <div className="state-title">Rendering heatmap data...</div>
            <div className="state-desc">Fetching click coordinates for: {selectedPage}</div>
          </div>
        ) : !selectedPage ? (
          <div className="state-box">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" color="#94a3b8">
              <rect width="18" height="18" x="3" y="3" rx="2" />
              <path d="M3 9h18" />
              <path d="M9 3v18" />
            </svg>
            <div className="state-title">No page selected</div>
            <div className="state-desc">Please choose a tracked page from the dropdown above to display the click heatmap.</div>
          </div>
        ) : (
          <Heatmap
            clicks={clicks}
            totalClicks={totalClicks}
            pageUrl={selectedPage}
            isLoading={isLoadingHeatmap}
            lastUpdated={lastUpdated}
            onRefresh={() => fetchHeatmapData(selectedPage)}
          />
        )}
      </div>
    </div>
  );
}
