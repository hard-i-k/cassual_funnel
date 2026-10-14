import React, { useRef, useEffect, useState, useMemo } from 'react';

export default function Heatmap({
  clicks = [],
  totalClicks: propTotalClicks,
  pageUrl = '',
  isLoading = false,
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  const [viewMode, setViewMode] = useState('density'); // 'density' | 'scatter' | 'grid'
  const [radius, setRadius] = useState(30);
  const [opacity, setOpacity] = useState(0.75);
  const [hoverInfo, setHoverInfo] = useState(null);

  // Normalize clicks data
  const normalizedClicks = useMemo(() => {
    if (!Array.isArray(clicks)) return [];
    return clicks
      .map((c) => {
        const x = Number(c.x ?? c.click_x ?? c.clickX ?? c.coordinates?.x ?? 0);
        const y = Number(c.y ?? c.click_y ?? c.clickY ?? c.coordinates?.y ?? 0);
        const weight = Number(c.count ?? c.weight ?? c.density ?? 1);
        return { x, y, weight, original: c };
      })
      .filter((c) => !isNaN(c.x) && !isNaN(c.y));
  }, [clicks]);

  const totalClicksCount = propTotalClicks ?? normalizedClicks.reduce((sum, c) => sum + (c.weight || 1), 0);

  // Dynamic viewport dimensions based on max coordinate or default 1200x800
  const viewportBounds = useMemo(() => {
    let maxX = 1200;
    let maxY = 800;
    normalizedClicks.forEach((c) => {
      if (c.x + 80 > maxX) maxX = Math.ceil((c.x + 80) / 100) * 100;
      if (c.y + 80 > maxY) maxY = Math.ceil((c.y + 80) / 100) * 100;
    });
    return { width: Math.max(maxX, 1000), height: Math.max(maxY, 700) };
  }, [normalizedClicks]);

  // Color palette lookup function for gradient density
  const getColorForDensity = (value) => {
    // 0 -> blue, 0.25 -> cyan, 0.5 -> green, 0.75 -> yellow, 1.0 -> red
    const v = Math.min(Math.max(value, 0), 1);
    if (v < 0.25) {
      const t = v / 0.25;
      return `rgba(59, 130, 246, ${0.15 + t * 0.4})`; // blue
    } else if (v < 0.5) {
      const t = (v - 0.25) / 0.25;
      return `rgba(6, 182, 212, ${0.4 + t * 0.3})`; // cyan
    } else if (v < 0.75) {
      const t = (v - 0.5) / 0.25;
      return `rgba(234, 179, 8, ${0.6 + t * 0.25})`; // yellow
    } else {
      const t = (v - 0.75) / 0.25;
      return `rgba(239, 68, 68, ${0.75 + t * 0.25})`; // red
    }
  };

  // Render Canvas Density Heatmap
  useEffect(() => {
    if (viewMode !== 'density' || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = viewportBounds.width;
    const height = viewportBounds.height;

    canvas.width = width;
    canvas.height = height;

    ctx.clearRect(0, 0, width, height);

    if (normalizedClicks.length === 0) return;

    // 1. Draw gray/alpha radial blur circles on offscreen buffer
    const offscreen = document.createElement('canvas');
    offscreen.width = width;
    offscreen.height = height;
    const offCtx = offscreen.getContext('2d');

    normalizedClicks.forEach(({ x, y, weight }) => {
      const r = radius;
      const grad = offCtx.createRadialGradient(x, y, 0, x, y, r);
      const intensity = Math.min(0.2 * (weight || 1), 0.8);
      grad.addColorStop(0, `rgba(0, 0, 0, ${intensity})`);
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      offCtx.fillStyle = grad;
      offCtx.beginPath();
      offCtx.arc(x, y, r, 0, Math.PI * 2);
      offCtx.fill();
    });

    // 2. Read back pixel alpha values and apply thermal color ramp
    const imgData = offCtx.getImageData(0, 0, width, height);
    const data = imgData.data;

    // Create a 256-step color lookup gradient
    const paletteCanvas = document.createElement('canvas');
    paletteCanvas.width = 256;
    paletteCanvas.height = 1;
    const pCtx = paletteCanvas.getContext('2d');
    const pGrad = pCtx.createLinearGradient(0, 0, 256, 1);
    pGrad.addColorStop(0.0, 'rgba(0, 0, 255, 0)');
    pGrad.addColorStop(0.2, 'rgba(0, 120, 255, 0.4)');
    pGrad.addColorStop(0.4, 'rgba(0, 255, 255, 0.7)');
    pGrad.addColorStop(0.6, 'rgba(0, 255, 0, 0.8)');
    pGrad.addColorStop(0.8, 'rgba(255, 255, 0, 0.9)');
    pGrad.addColorStop(1.0, 'rgba(255, 0, 0, 1.0)');

    pCtx.fillStyle = pGrad;
    pCtx.fillRect(0, 0, 256, 1);
    const palette = pCtx.getImageData(0, 0, 256, 1).data;

    for (let i = 0; i < data.length; i += 4) {
      const alpha = data[i + 3];
      if (alpha > 0) {
        const offset = alpha * 4;
        data[i] = palette[offset];         // R
        data[i + 1] = palette[offset + 1]; // G
        data[i + 2] = palette[offset + 2]; // B
        data[i + 3] = Math.round(palette[offset + 3] * opacity); // A
      }
    }

    ctx.putImageData(imgData, 0, 0);
  }, [normalizedClicks, viewMode, radius, opacity, viewportBounds]);

  // Compute Grid Matrix for Grid Mode
  const gridMatrix = useMemo(() => {
    if (viewMode !== 'grid') return [];
    const cols = 24;
    const rows = 16;
    const cellWidth = viewportBounds.width / cols;
    const cellHeight = viewportBounds.height / rows;

    const matrix = Array.from({ length: rows }, () => Array(cols).fill(0));
    let maxCellCount = 0;

    normalizedClicks.forEach(({ x, y, weight }) => {
      const col = Math.min(Math.floor(x / cellWidth), cols - 1);
      const row = Math.min(Math.floor(y / cellHeight), rows - 1);
      if (col >= 0 && row >= 0) {
        matrix[row][col] += weight;
        if (matrix[row][col] > maxCellCount) {
          maxCellCount = matrix[row][col];
        }
      }
    });

    return { matrix, maxCellCount, cols, rows };
  }, [normalizedClicks, viewMode, viewportBounds]);

  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.round(e.clientX - rect.left);
    const y = Math.round(e.clientY - rect.top);

    // Find nearby clicks within 25px
    const nearby = normalizedClicks.filter(
      (c) => Math.hypot(c.x - x, c.y - y) <= 25
    );

    setHoverInfo({
      x,
      y,
      nearbyCount: nearby.reduce((acc, c) => acc + c.weight, 0),
    });
  };

  const handleMouseLeave = () => {
    setHoverInfo(null);
  };

  return (
    <div className="heatmap-container">
      {/* View Options & Stats */}
      <div className="heatmap-toolbar-card">
        <div className="heatmap-stats-strip">
          <div className="stats-chip">
            <span className="stats-chip-label">Tracked Page:</span>
            <span className="stats-chip-value mono" style={{ fontSize: '0.85rem', color: '#2563eb' }}>
              {pageUrl || 'None'}
            </span>
          </div>

          <div className="stats-chip">
            <span className="stats-chip-label">Total Clicks:</span>
            <span className="stats-chip-value">{totalClicksCount}</span>
          </div>

          <div className="stats-chip">
            <span className="stats-chip-label">Unique Click Points:</span>
            <span className="stats-chip-value">{normalizedClicks.length}</span>
          </div>

          <div className="stats-chip">
            <span className="stats-chip-label">Viewport Area:</span>
            <span className="stats-chip-value mono">
              {viewportBounds.width} × {viewportBounds.height} px
            </span>
          </div>
        </div>

        <div className="view-controls-row">
          <div className="mode-toggle-group">
            <button
              type="button"
              className={`mode-btn ${viewMode === 'density' ? 'active' : ''}`}
              onClick={() => setViewMode('density')}
            >
              Density Heatmap
            </button>
            <button
              type="button"
              className={`mode-btn ${viewMode === 'scatter' ? 'active' : ''}`}
              onClick={() => setViewMode('scatter')}
            >
              Scatter Points ({normalizedClicks.length})
            </button>
            <button
              type="button"
              className={`mode-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
            >
              Grid Matrix
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
            {viewMode === 'density' && (
              <div className="slider-group">
                <label htmlFor="radius-slider">Radius ({radius}px):</label>
                <input
                  id="radius-slider"
                  type="range"
                  min="15"
                  max="60"
                  value={radius}
                  onChange={(e) => setRadius(Number(e.target.value))}
                  className="slider-input"
                />
              </div>
            )}

            <div className="slider-group">
              <label htmlFor="opacity-slider">Opacity ({Math.round(opacity * 100)}%):</label>
              <input
                id="opacity-slider"
                type="range"
                min="0.2"
                max="1"
                step="0.05"
                value={opacity}
                onChange={(e) => setOpacity(Number(e.target.value))}
                className="slider-input"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Viewport Frame */}
      <div className="viewport-frame">
        {/* Mock Browser Header */}
        <div className="viewport-topbar">
          <div className="browser-dots">
            <span className="b-dot red"></span>
            <span className="b-dot yellow"></span>
            <span className="b-dot green"></span>
          </div>
          <div className="viewport-address-bar" title={pageUrl}>
            https://analytics.view{pageUrl.startsWith('/') ? pageUrl : `/${pageUrl}`}
          </div>
          <div className="viewport-meta">
            Desktop Viewport ({viewportBounds.width} × {viewportBounds.height})
          </div>
        </div>

        {/* Viewport Canvas Stage */}
        <div className="viewport-stage-wrapper">
          <div
            ref={containerRef}
            className="viewport-stage"
            style={{ width: `${viewportBounds.width}px`, height: `${viewportBounds.height}px` }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            {/* 1. Density Canvas Mode */}
            {viewMode === 'density' && (
              <canvas
                ref={canvasRef}
                className="heatmap-canvas"
              />
            )}

            {/* 2. Scatter Points Mode */}
            {viewMode === 'scatter' && (
              <>
                {normalizedClicks.map((click, idx) => (
                  <div
                    key={idx}
                    className="scatter-dot"
                    style={{
                      left: `${click.x}px`,
                      top: `${click.y}px`,
                      opacity,
                    }}
                    title={`Click #${idx + 1}: X=${click.x}, Y=${click.y} (${click.weight} hit${click.weight > 1 ? 's' : ''})`}
                  />
                ))}
              </>
            )}

            {/* 3. Grid Matrix Mode */}
            {viewMode === 'grid' && gridMatrix.matrix && (
              <div className="grid-heatmap">
                {gridMatrix.matrix.map((row, rIdx) =>
                  row.map((cellCount, cIdx) => {
                    const ratio = gridMatrix.maxCellCount > 0 ? cellCount / gridMatrix.maxCellCount : 0;
                    const bgColor = cellCount > 0 ? getColorForDensity(ratio) : 'transparent';
                    return (
                      <div
                        key={`${rIdx}-${cIdx}`}
                        className="grid-cell"
                        style={{
                          backgroundColor: bgColor,
                          opacity,
                        }}
                        title={`Grid [${cIdx}, ${rIdx}]: ${cellCount} clicks`}
                      >
                        {cellCount > 0 ? cellCount : ''}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Interactive Hover Tooltip */}
            {hoverInfo && (
              <div
                className="hover-tooltip"
                style={{
                  left: `${hoverInfo.x}px`,
                  top: `${hoverInfo.y}px`,
                }}
              >
                X: {hoverInfo.x}px, Y: {hoverInfo.y}px
                {hoverInfo.nearbyCount > 0 && (
                  <div>
                    🔥 {hoverInfo.nearbyCount} click{hoverInfo.nearbyCount > 1 ? 's' : ''} here
                  </div>
                )}
              </div>
            )}

            {/* Empty State Overlay */}
            {!isLoading && normalizedClicks.length === 0 && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.75rem',
                  color: 'var(--text-muted)',
                  backgroundColor: 'rgba(255, 255, 255, 0.85)',
                }}
              >
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>No click interactions recorded yet</div>
                <div style={{ fontSize: '0.85rem' }}>No user clicks found for "{pageUrl}" in this timeframe.</div>
              </div>
            )}
          </div>
        </div>

        {/* Heatmap Legend */}
        <div className="heatmap-legend-card">
          <div className="legend-scale">
            <span>Low Density</span>
            <div className="gradient-bar"></div>
            <span>High Density</span>
          </div>

          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Hover cursor over canvas to inspect exact pixel coordinates
          </div>
        </div>
      </div>
    </div>
  );
}
