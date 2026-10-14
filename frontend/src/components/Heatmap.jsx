import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';

export default function Heatmap({
  clicks = [],
  totalClicks: propTotalClicks,
  pageUrl = '',
  isLoading = false,
  lastUpdated = null,
  onRefresh = null,
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const stageRef = useRef(null);

  // View & visualization controls
  const [viewMode, setViewMode] = useState('hybrid'); // 'hybrid' | 'density' | 'scatter' | 'grid'
  const [scaleMode, setScaleMode] = useState('fit'); // 'fit' | '100' | '75' | '50'
  const [computedScale, setComputedScale] = useState(1);
  const [radius, setRadius] = useState(36);
  const [opacity, setOpacity] = useState(0.85);
  const [showWireframe, setShowWireframe] = useState(true);
  const [hoverInfo, setHoverInfo] = useState(null);

  // Normalize clicks data and extract viewport dimensions
  const { normalizedClicks, detectedViewport } = useMemo(() => {
    if (!Array.isArray(clicks)) return { normalizedClicks: [], detectedViewport: { width: 1440, height: 900 } };

    let maxW = 1280;
    let maxH = 800;
    let recordedW = 0;
    let recordedH = 0;
    let recordedCount = 0;

    const list = clicks
      .map((c) => {
        const x = Number(c.x ?? c.click_x ?? c.clickX ?? c.coordinates?.x ?? 0);
        const y = Number(c.y ?? c.click_y ?? c.clickY ?? c.coordinates?.y ?? 0);
        const weight = Number(c.count ?? c.weight ?? c.density ?? 1);
        const vw = Number(c.viewport_width ?? c.viewportWidth ?? 0);
        const vh = Number(c.viewport_height ?? c.viewportHeight ?? 0);

        if (vw > 0 && vh > 0) {
          recordedW += vw;
          recordedH += vh;
          recordedCount++;
        }

        if (x + 80 > maxW) maxW = x + 80;
        if (y + 80 > maxH) maxH = y + 80;

        return {
          x,
          y,
          weight,
          sessionId: c.session_id || c.sessionId || '',
          timestamp: c.timestamp || c.created_at || '',
          original: c,
        };
      })
      .filter((c) => !isNaN(c.x) && !isNaN(c.y) && c.x >= 0 && c.y >= 0);

    // Determine representative viewport
    let width = 1440;
    let height = 900;
    if (recordedCount > 0) {
      width = Math.round(recordedW / recordedCount);
      height = Math.round(recordedH / recordedCount);
    }
    width = Math.max(width, maxW, 1200);
    height = Math.max(height, maxH, 750);

    return { normalizedClicks: list, detectedViewport: { width, height } };
  }, [clicks]);

  const totalClicksCount = propTotalClicks ?? normalizedClicks.reduce((sum, c) => sum + (c.weight || 1), 0);

  // Identify top 3 hotspot clusters
  const topHotspots = useMemo(() => {
    if (normalizedClicks.length === 0) return [];
    // Group clicks into 40px grid buckets to find density centers
    const bucketMap = new Map();
    normalizedClicks.forEach((c) => {
      const bx = Math.round(c.x / 40) * 40;
      const by = Math.round(c.y / 40) * 40;
      const key = `${bx},${by}`;
      if (!bucketMap.has(key)) {
        bucketMap.set(key, { x: bx, y: by, count: 0, clicks: [] });
      }
      const b = bucketMap.get(key);
      b.count += c.weight || 1;
      b.clicks.push(c);
    });

    return Array.from(bucketMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
  }, [normalizedClicks]);

  // Handle responsive auto-fit scaling
  const updateResponsiveScale = useCallback(() => {
    if (!containerRef.current) return;
    const containerWidth = containerRef.current.clientWidth - 32; // subtract padding
    if (containerWidth <= 0) return;

    if (scaleMode === 'fit') {
      const scale = Math.min(1, containerWidth / detectedViewport.width);
      setComputedScale(Math.max(0.25, Number(scale.toFixed(3))));
    } else if (scaleMode === '100') {
      setComputedScale(1);
    } else if (scaleMode === '75') {
      setComputedScale(0.75);
    } else if (scaleMode === '50') {
      setComputedScale(0.5);
    }
  }, [scaleMode, detectedViewport.width]);

  useEffect(() => {
    updateResponsiveScale();
    const handleResize = () => updateResponsiveScale();
    window.addEventListener('resize', handleResize);

    const observer = new ResizeObserver(() => {
      updateResponsiveScale();
    });
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      observer.disconnect();
    };
  }, [updateResponsiveScale]);

  // Draw High-Definition Thermal Heatmap on Canvas
  useEffect(() => {
    if ((viewMode !== 'density' && viewMode !== 'hybrid') || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const { width, height } = detectedViewport;

    canvas.width = width;
    canvas.height = height;
    ctx.clearRect(0, 0, width, height);

    if (normalizedClicks.length === 0) return;

    // 1. Create offscreen alpha buffer
    const offscreen = document.createElement('canvas');
    offscreen.width = width;
    offscreen.height = height;
    const offCtx = offscreen.getContext('2d');

    // Draw radial Gaussian-like alpha gradient for each click point
    normalizedClicks.forEach(({ x, y, weight }) => {
      const r = radius;
      const grad = offCtx.createRadialGradient(x, y, 0, x, y, r);
      // Intensity curve
      const intensity = Math.min(0.28 * (weight || 1), 0.95);
      grad.addColorStop(0, `rgba(0, 0, 0, ${intensity})`);
      grad.addColorStop(0.3, `rgba(0, 0, 0, ${intensity * 0.75})`);
      grad.addColorStop(0.65, `rgba(0, 0, 0, ${intensity * 0.35})`);
      grad.addColorStop(0.9, `rgba(0, 0, 0, ${intensity * 0.08})`);
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      offCtx.fillStyle = grad;
      offCtx.beginPath();
      offCtx.arc(x, y, r, 0, Math.PI * 2);
      offCtx.fill();
    });

    // 2. Build 256-step thermal color lookup ramp
    const paletteCanvas = document.createElement('canvas');
    paletteCanvas.width = 256;
    paletteCanvas.height = 1;
    const pCtx = paletteCanvas.getContext('2d');
    const pGrad = pCtx.createLinearGradient(0, 0, 256, 1);

    // Modern velvet thermal ramp
    pGrad.addColorStop(0.0, 'rgba(0, 0, 0, 0)');
    pGrad.addColorStop(0.12, 'rgba(30, 58, 138, 0.45)');  // Deep Navy
    pGrad.addColorStop(0.28, 'rgba(37, 99, 235, 0.75)');  // Sapphire Blue
    pGrad.addColorStop(0.48, 'rgba(6, 182, 212, 0.90)');  // Cyan
    pGrad.addColorStop(0.65, 'rgba(16, 185, 129, 0.95)'); // Emerald Green
    pGrad.addColorStop(0.80, 'rgba(234, 179, 8, 1.0)');   // Amber Gold
    pGrad.addColorStop(0.92, 'rgba(249, 115, 22, 1.0)');  // Hot Orange
    pGrad.addColorStop(1.0, 'rgba(239, 68, 68, 1.0)');    // Intense Crimson

    pCtx.fillStyle = pGrad;
    pCtx.fillRect(0, 0, 256, 1);
    const palette = pCtx.getImageData(0, 0, 256, 1).data;

    // 3. Colorize pixels based on alpha intensity
    const imgData = offCtx.getImageData(0, 0, width, height);
    const data = imgData.data;

    for (let i = 0; i < data.length; i += 4) {
      const alpha = data[i + 3];
      if (alpha > 0) {
        const offset = alpha * 4;
        data[i] = palette[offset];         // Red
        data[i + 1] = palette[offset + 1]; // Green
        data[i + 2] = palette[offset + 2]; // Blue
        data[i + 3] = Math.round(palette[offset + 3] * opacity); // Alpha
      }
    }

    ctx.putImageData(imgData, 0, 0);
  }, [normalizedClicks, viewMode, radius, opacity, detectedViewport]);

  // Compute Grid Matrix for Grid Mode
  const gridMatrix = useMemo(() => {
    if (viewMode !== 'grid') return null;
    const cols = 28;
    const rows = 18;
    const cellW = detectedViewport.width / cols;
    const cellH = detectedViewport.height / rows;

    const matrix = Array.from({ length: rows }, () => Array(cols).fill(0));
    let maxCount = 0;

    normalizedClicks.forEach(({ x, y, weight }) => {
      const col = Math.min(Math.floor(x / cellW), cols - 1);
      const row = Math.min(Math.floor(y / cellH), rows - 1);
      if (col >= 0 && row >= 0) {
        matrix[row][col] += weight;
        if (matrix[row][col] > maxCount) maxCount = matrix[row][col];
      }
    });

    return { matrix, maxCount, cols, rows };
  }, [normalizedClicks, viewMode, detectedViewport]);

  // Mouse Move with Coordinate Scaling Calculation
  const handleMouseMove = (e) => {
    if (!stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    const currentScale = computedScale || 1;

    // Translate client coordinates by current CSS transform scale
    const rawX = (e.clientX - rect.left) / currentScale;
    const rawY = (e.clientY - rect.top) / currentScale;

    const x = Math.round(Math.max(0, Math.min(detectedViewport.width, rawX)));
    const y = Math.round(Math.max(0, Math.min(detectedViewport.height, rawY)));

    // Find nearby clicks within 35px radius in native coordinates
    const nearby = normalizedClicks.filter((c) => Math.hypot(c.x - x, c.y - y) <= 35);
    const density = nearby.reduce((acc, c) => acc + c.weight, 0);

    setHoverInfo({
      nativeX: x,
      nativeY: y,
      screenX: Math.round(e.clientX - rect.left),
      screenY: Math.round(e.clientY - rect.top),
      nearbyCount: density,
    });
  };

  const handleMouseLeave = () => {
    setHoverInfo(null);
  };

  return (
    <div className="heatmap-container" ref={containerRef}>
      {/* 1. Hotspot Summary Metrics Cards */}
      <div className="heatmap-metrics-grid">
        <div className="metric-card">
          <div className="metric-card-header">
            <span className="metric-label">Total Clicks Recorded</span>
            <div className="metric-icon-bubble blue">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="m10 15 5-3-5-3v6Z" fill="currentColor" />
              </svg>
            </div>
          </div>
          <div className="metric-value">{totalClicksCount.toLocaleString()}</div>
          <div className="metric-footer">
            <span className="pulse-indicator"></span>
            <span>Across {normalizedClicks.length} distinct coordinates</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-card-header">
            <span className="metric-label">Peak Density Hotspot</span>
            <div className="metric-icon-bubble red">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
          </div>
          <div className="metric-value">
            {topHotspots.length > 0 ? `${topHotspots[0].count} clicks` : 'None'}
          </div>
          <div className="metric-footer mono">
            {topHotspots.length > 0 ? `At X: ${topHotspots[0].x}px, Y: ${topHotspots[0].y}px` : 'No clicks logged yet'}
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-card-header">
            <span className="metric-label">Viewport Canvas Resolution</span>
            <div className="metric-icon-bubble green">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect width="20" height="14" x="2" y="3" rx="2" />
                <line x1="8" x2="16" y1="21" y2="21" />
                <line x1="12" x2="12" y1="17" y2="21" />
              </svg>
            </div>
          </div>
          <div className="metric-value mono">
            {detectedViewport.width} × {detectedViewport.height}
          </div>
          <div className="metric-footer">
            <span>Scale: {Math.round(computedScale * 100)}% ({scaleMode === 'fit' ? 'Auto-Fit' : 'Manual'})</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-card-header">
            <span className="metric-label">Live Sync Status</span>
            <div className="metric-icon-bubble purple">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
            </div>
          </div>
          <div className="metric-value" style={{ fontSize: '1.25rem', color: '#10b981' }}>
            Live Active
          </div>
          <div className="metric-footer">
            {lastUpdated ? `Synced: ${lastUpdated}` : 'Syncing every 3 seconds...'}
          </div>
        </div>
      </div>

      {/* 2. Interactive Control Bar */}
      <div className="heatmap-control-bar">
        {/* View Modes */}
        <div className="control-section">
          <span className="control-label">Visualization:</span>
          <div className="pill-group">
            <button
              type="button"
              className={`pill-btn ${viewMode === 'hybrid' ? 'active' : ''}`}
              onClick={() => setViewMode('hybrid')}
              title="Combined thermal heat glow with point markers"
            >
              Hybrid (Glow + Dots)
            </button>
            <button
              type="button"
              className={`pill-btn ${viewMode === 'density' ? 'active' : ''}`}
              onClick={() => setViewMode('density')}
              title="Smooth thermal density gradient"
            >
              Thermal Heat
            </button>
            <button
              type="button"
              className={`pill-btn ${viewMode === 'scatter' ? 'active' : ''}`}
              onClick={() => setViewMode('scatter')}
              title="Exact click pinpoint scatter"
            >
              Click Dots ({normalizedClicks.length})
            </button>
            <button
              type="button"
              className={`pill-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Matrix grid density"
            >
              Grid Heat
            </button>
          </div>
        </div>

        {/* Responsive Scale Presets */}
        <div className="control-section">
          <span className="control-label">Scale:</span>
          <div className="pill-group">
            <button
              type="button"
              className={`pill-btn ${scaleMode === 'fit' ? 'active' : ''}`}
              onClick={() => setScaleMode('fit')}
              title="Fit entire viewport to dashboard width"
            >
              Fit Screen
            </button>
            <button
              type="button"
              className={`pill-btn ${scaleMode === '100' ? 'active' : ''}`}
              onClick={() => setScaleMode('100')}
              title="100% Native 1:1 Pixel Size"
            >
              100%
            </button>
            <button
              type="button"
              className={`pill-btn ${scaleMode === '75' ? 'active' : ''}`}
              onClick={() => setScaleMode('75')}
            >
              75%
            </button>
            <button
              type="button"
              className={`pill-btn ${scaleMode === '50' ? 'active' : ''}`}
              onClick={() => setScaleMode('50')}
            >
              50%
            </button>
          </div>
        </div>

        {/* Sliders: Radius & Opacity */}
        <div className="control-section sliders">
          <div className="slider-item">
            <label htmlFor="radius-slider">Radius: {radius}px</label>
            <input
              id="radius-slider"
              type="range"
              min="16"
              max="70"
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
            />
          </div>

          <div className="slider-item">
            <label htmlFor="opacity-slider">Opacity: {Math.round(opacity * 100)}%</label>
            <input
              id="opacity-slider"
              type="range"
              min="0.2"
              max="1"
              step="0.05"
              value={opacity}
              onChange={(e) => setOpacity(Number(e.target.value))}
            />
          </div>

          <label className="checkbox-toggle" title="Show simulated webpage layout underneath heatmap">
            <input
              type="checkbox"
              checked={showWireframe}
              onChange={(e) => setShowWireframe(e.target.checked)}
            />
            <span>Page Wireframe</span>
          </label>
        </div>
      </div>

      {/* 3. Viewport Container & Canvas Frame */}
      <div className="viewport-browser-window">
        {/* Browser Mock Header */}
        <div className="browser-header">
          <div className="window-dots">
            <span className="dot dot-close"></span>
            <span className="dot dot-min"></span>
            <span className="dot dot-max"></span>
          </div>

          <div className="address-bar-box">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" color="#10b981">
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span className="address-text">{pageUrl || 'https://demo-store.causalfunnel.com/demo'}</span>
          </div>

          <div className="viewport-badge mono">
            {detectedViewport.width} × {detectedViewport.height} px
          </div>
        </div>

        {/* Canvas Scroll & Scaled Wrapper */}
        <div className="viewport-canvas-wrapper">
          <div
            className="viewport-scale-outer"
            style={{
              width: `${Math.round(detectedViewport.width * computedScale)}px`,
              height: `${Math.round(detectedViewport.height * computedScale)}px`,
            }}
          >
            <div
              ref={stageRef}
              className="viewport-stage"
              style={{
                width: `${detectedViewport.width}px`,
                height: `${detectedViewport.height}px`,
                transform: `scale(${computedScale})`,
                transformOrigin: 'top left',
              }}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            >
              {/* Optional Underlying Demo Wireframe to give visual context to clicks */}
              {showWireframe && (
                <div className="wireframe-page-overlay">
                  {/* Wireframe Nav */}
                  <div className="wireframe-nav">
                    <div className="wf-brand">STORE FRONT</div>
                    <div className="wf-links">
                      <span className="wf-link">Catalog</span>
                      <span className="wf-link">Electronics</span>
                      <span className="wf-link">Sale</span>
                    </div>
                    <div className="wf-cart-btn">Cart (0)</div>
                  </div>

                  {/* Wireframe Hero Banner */}
                  <div className="wireframe-hero">
                    <div className="wf-hero-tag">Special Promotion</div>
                    <div className="wf-hero-title">Exclusive Summer Deals — 50% Off</div>
                    <div className="wf-hero-btn">Shop Collection Now</div>
                  </div>

                  {/* Wireframe Product Grid */}
                  <div className="wireframe-products">
                    {[1, 2, 3, 4].map((id) => (
                      <div key={id} className="wf-product-card">
                        <div className="wf-product-img">Item #{id} Preview</div>
                        <div className="wf-product-title">Premium Product {id}</div>
                        <div className="wf-product-price">$99.00</div>
                        <div className="wf-buy-btn">Add to Cart</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 1. Canvas Layer for Thermal Heat */}
              {(viewMode === 'density' || viewMode === 'hybrid') && (
                <canvas ref={canvasRef} className="heatmap-canvas" />
              )}

              {/* 2. Top Hotspots Radar Rings */}
              {topHotspots.map((hotspot, idx) => (
                <div
                  key={`pulse-${idx}`}
                  className="hotspot-pulse-ring"
                  style={{
                    left: `${hotspot.x}px`,
                    top: `${hotspot.y}px`,
                  }}
                  title={`Hotspot #${idx + 1}: ${hotspot.count} clicks`}
                >
                  <span className="hotspot-core-dot">#{idx + 1}</span>
                </div>
              ))}

              {/* 3. Scatter Points Layer */}
              {(viewMode === 'scatter' || viewMode === 'hybrid') && (
                <>
                  {normalizedClicks.map((click, idx) => (
                    <div
                      key={`dot-${idx}`}
                      className="scatter-click-dot"
                      style={{
                        left: `${click.x}px`,
                        top: `${click.y}px`,
                        opacity: viewMode === 'hybrid' ? 0.7 : opacity,
                      }}
                      title={`Click #${idx + 1}: (${click.x}, ${click.y})`}
                    />
                  ))}
                </>
              )}

              {/* 4. Grid Matrix Mode */}
              {viewMode === 'grid' && gridMatrix && gridMatrix.matrix && (
                <div className="grid-heatmap-overlay">
                  {gridMatrix.matrix.map((row, rIdx) =>
                    row.map((count, cIdx) => {
                      const ratio = gridMatrix.maxCount > 0 ? count / gridMatrix.maxCount : 0;
                      let bg = 'transparent';
                      if (count > 0) {
                        if (ratio < 0.25) bg = 'rgba(59, 130, 246, 0.4)';
                        else if (ratio < 0.5) bg = 'rgba(6, 182, 212, 0.6)';
                        else if (ratio < 0.75) bg = 'rgba(234, 179, 8, 0.75)';
                        else bg = 'rgba(239, 68, 68, 0.85)';
                      }
                      return (
                        <div
                          key={`${rIdx}-${cIdx}`}
                          className="grid-heat-cell"
                          style={{ backgroundColor: bg }}
                          title={`Grid [${cIdx}, ${rIdx}]: ${count} clicks`}
                        >
                          {count > 0 ? count : ''}
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* 5. Interactive Hover Tooltip */}
              {hoverInfo && (
                <div
                  className="canvas-hover-card"
                  style={{
                    left: `${hoverInfo.nativeX}px`,
                    top: `${hoverInfo.nativeY}px`,
                  }}
                >
                  <div className="hover-card-coords">
                    X: {hoverInfo.nativeX}px, Y: {hoverInfo.nativeY}px
                  </div>
                  {hoverInfo.nearbyCount > 0 ? (
                    <div className="hover-card-density">
                      {hoverInfo.nearbyCount} click{hoverInfo.nearbyCount > 1 ? 's' : ''} in this region
                    </div>
                  ) : (
                    <div className="hover-card-empty">No clicks recorded here</div>
                  )}
                </div>
              )}

              {/* Empty state notice if no clicks */}
              {!isLoading && normalizedClicks.length === 0 && (
                <div className="canvas-empty-state">
                  <div className="empty-icon-circle">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                  </div>
                  <div className="empty-state-title">No click interactions recorded yet</div>
                  <div className="empty-state-sub">
                    Click anywhere on the demo store page to generate live interaction events.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Heatmap Legend Bar */}
        <div className="heatmap-footer-legend">
          <div className="legend-gradient-wrap">
            <span className="legend-label">Low Heat</span>
            <div className="thermal-gradient-bar"></div>
            <span className="legend-label hot">High Density (Hotspot)</span>
          </div>

          <div className="legend-hint">
            <span>Hover cursor over canvas to inspect exact pixel coordinates.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
