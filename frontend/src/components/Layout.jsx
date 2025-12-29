import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    FiHome, FiFileText, FiActivity, FiShare2,
    FiFolder, FiLogOut, FiMenu, FiX, FiHeart
} from 'react-icons/fi';
import { useState } from 'react';
import './Layout.css';

const Layout = ({ children }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const navItems = [
        { path: '/dashboard', icon: FiHome, label: 'Dashboard' },
        { path: '/reports', icon: FiFileText, label: 'Reports' },
        { path: '/vitals', icon: FiActivity, label: 'Vitals' },
        { path: '/sharing', icon: FiShare2, label: 'Sharing' },
        { path: '/shared-reports', icon: FiFolder, label: 'Shared With Me' },
    ];

    return (
        <div className="layout">
            {/* Mobile Header */}
            <header className="mobile-header">
                <button className="menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
                    {sidebarOpen ? <FiX size={24} /> : <FiMenu size={24} />}
                </button>
                <div className="logo">
                    <FiHeart className="logo-icon" />
                    <span>Health Wallet</span>
                </div>
            </header>

            {/* Sidebar */}
            <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <div className="logo">
                        <FiHeart className="logo-icon" />
                        <span>Health Wallet</span>
                    </div>
                </div>

                <nav className="sidebar-nav">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                            onClick={() => setSidebarOpen(false)}
                        >
                            <item.icon className="nav-icon" />
                            <span>{item.label}</span>
                        </NavLink>
                    ))}
                </nav>

                <div className="sidebar-footer">
                    <div className="user-info">
                        <div className="user-avatar">
                            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                        <div className="user-details">
                            <span className="user-name">{user?.name || 'User'}</span>
                            <span className="user-email">{user?.email || ''}</span>
                        </div>
                    </div>
                    <button className="logout-btn" onClick={handleLogout}>
                        <FiLogOut />
                        <span>Logout</span>
                    </button>
                </div>
            </aside>

            {/* Overlay */}
            {sidebarOpen && (
                <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
            )}

            {/* Main Content */}
            <main className="main-content">
                {children}
            </main>
        </div>
    );
};

export default Layout;
