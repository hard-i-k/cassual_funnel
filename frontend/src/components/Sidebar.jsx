import React from 'react';
import { NavLink } from 'react-router-dom';
import '../styles/Sidebar.css';

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-logo">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3v18h18" />
            <path d="m19 9-5 5-4-4-3 3" />
          </svg>
        </div>
        <div className="brand-info">
          <span className="brand-title">CausalFunnel</span>
          <span className="brand-subtitle">Analytics Engine</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-label">Monitoring</div>

        <NavLink
          to="/sessions"
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <svg className="nav-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <span>Sessions</span>
        </NavLink>

        <NavLink
          to="/heatmap"
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <svg className="nav-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="18" height="18" x="3" y="3" rx="2" />
            <path d="M3 9h18" />
            <path d="M9 3v18" />
            <circle cx="15" cy="15" r="2" fill="currentColor" />
          </svg>
          <span>Click Heatmap</span>
        </NavLink>

        <div className="nav-section-label" style={{ marginTop: '1rem' }}>Testbed</div>

        <a
          href="/demo.html"
          target="_blank"
          rel="noopener noreferrer"
          className="nav-link demo-nav-link"
          title="Open live demo store in a new tab to test click and page view tracking"
        >
          <svg className="nav-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
          <span>Live Demo Store</span>
          <span className="demo-pill">Test</span>
        </a>
      </nav>

      <div className="sidebar-footer">
        <div className="system-status">
          <span className="status-indicator-dot"></span>
          <span>System Active</span>
        </div>
        <div className="version-tag">Version 1.0.0</div>
      </div>
    </aside>
  );
}
