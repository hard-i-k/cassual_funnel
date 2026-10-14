import { NavLink } from 'react-router-dom'
import '../styles/Sidebar.css'

function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="brand-icon">📊</span>
        <h1>Analytics</h1>
      </div>

      <nav className="sidebar-nav">
        <NavLink
          to="/sessions"
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <span className="nav-icon">👥</span>
          <span>Sessions</span>
        </NavLink>
        <NavLink
          to="/heatmap"
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <span className="nav-icon">🔥</span>
          <span>Heatmap</span>
        </NavLink>
      </nav>

      <div className="sidebar-footer">
        <p>CausalFunnel</p>
        <small>User Analytics v1.0</small>
      </div>
    </aside>
  )
}

export default Sidebar
