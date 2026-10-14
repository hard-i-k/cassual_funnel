import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getPages, getHeatmap } from '../utils/api';
import PageSelector from '../components/PageSelector';
import Heatmap from '../components/Heatmap';

export default function HeatmapPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [pages, setPages] = useState([]);
  const [selectedPage, setSelectedPage] = useState(searchParams.get('page_url') || '');
  const [clicks, setClicks] = useState([]);
  const [totalClicks, setTotalClicks] = useState(0);

  const [isLoadingPages, setIsLoadingPages] = useState(true);
  const [isLoadingHeatmap, setIsLoadingHeatmap] = useState(false);
  const [pagesError, setPagesError] = useState(null);
  const [heatmapError, setHeatmapError] = useState(null);

  // Fetch available pages
  const fetchAvailablePages = async () => {
    setIsLoadingPages(true);
    setPagesError(null);
    try {
      const data = await getPages();
      const list = Array.isArray(data)
        ? data
        : data.pages || data.data || [];

      // Normalize list items into strings
      const stringUrls = list.map((item) => {
        if (typeof item === 'string') return item;
        return item.page_url || item.url || item.path || String(item);
      });

      setPages(stringUrls);

      // If no page is currently selected, select the first available page
      const currentParam = searchParams.get('page_url');
      if (stringUrls.length > 0) {
        if (currentParam && stringUrls.includes(currentParam)) {
          setSelectedPage(currentParam);
        } else if (!selectedPage || !stringUrls.includes(selectedPage)) {
          setSelectedPage(stringUrls[0]);
          setSearchParams({ page_url: stringUrls[0] }, { replace: true });
        }
      }
    } catch (err) {
      console.error('Failed to fetch pages:', err);
      setPagesError(err.response?.data?.message || err.message || 'Failed to load tracked pages.');
    } finally {
      setIsLoadingPages(false);
    }
  };

  useEffect(() => {
    fetchAvailablePages();
  }, []);

  // Fetch heatmap clicks when selectedPage changes
  const fetchHeatmapData = async (page) => {
    if (!page) {
      setClicks([]);
      setTotalClicks(0);
      return;
    }

    setIsLoadingHeatmap(true);
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
    } catch (err) {
      console.error(`Failed to fetch heatmap data for page ${page}:`, err);
      setHeatmapError(err.response?.data?.message || err.message || `Failed to load heatmap for ${page}`);
      setClicks([]);
      setTotalClicks(0);
    } finally {
      setIsLoadingHeatmap(false);
    }
  };

  useEffect(() => {
    if (selectedPage) {
      fetchHeatmapData(selectedPage);
    }
  }, [selectedPage]);

  const handleSelectPage = (pageUrl) => {
    setSelectedPage(pageUrl);
    setSearchParams({ page_url: pageUrl });
  };

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h1 className="page-title">User Click Heatmap</h1>
          <p className="page-subtitle">Visualize spatial click density and user interactions across pages</p>
        </div>

        {selectedPage && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => fetchHeatmapData(selectedPage)}
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
              style={{ width: '15px', height: '15px', borderWidth: '2px' }}
            >
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
            </svg>
            Refresh Heatmap
          </button>
        )}
      </div>

      {/* Pages loading error banner */}
      {pagesError && (
        <div className="error-banner">
          <div>
            <strong>Error loading pages list: </strong>
            <span className="error-message">{pagesError}</span>
          </div>
          <button type="button" className="btn btn-sm btn-secondary" onClick={fetchAvailablePages}>
            Retry
          </button>
        </div>
      )}

      {/* Page Selector */}
      <PageSelector
        pages={pages}
        selectedPage={selectedPage}
        onSelectPage={handleSelectPage}
        isLoading={isLoadingPages}
        onRefresh={fetchAvailablePages}
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
      <div style={{ marginTop: '1.5rem' }}>
        {isLoadingHeatmap ? (
          <div className="state-box">
            <div className="spinner"></div>
            <div className="state-title">Rendering heatmap data...</div>
            <div className="state-desc">Fetching click coordinates for page: {selectedPage}</div>
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
          />
        )}
      </div>
    </div>
  );
}
