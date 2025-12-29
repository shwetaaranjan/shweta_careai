import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { vitalsAPI, reportsAPI } from '../services/api';
import {
    FiActivity, FiFileText, FiShare2, FiPlus,
    FiTrendingUp, FiTrendingDown, FiMinus,
    FiHeart, FiDroplet, FiThermometer
} from 'react-icons/fi';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, Area, AreaChart
} from 'recharts';
import './Dashboard.css';

const VITAL_ICONS = {
    blood_pressure_systolic: FiActivity,
    blood_pressure_diastolic: FiActivity,
    heart_rate: FiHeart,
    blood_sugar: FiDroplet,
    body_temperature: FiThermometer,
    weight: FiActivity,
    oxygen_saturation: FiActivity,
};

const VITAL_COLORS = {
    blood_pressure_systolic: '#ef4444',
    blood_pressure_diastolic: '#f97316',
    heart_rate: '#ec4899',
    blood_sugar: '#8b5cf6',
    body_temperature: '#f59e0b',
    weight: '#10b981',
    oxygen_saturation: '#3b82f6',
};

const Dashboard = () => {
    const { user } = useAuth();
    const [trends, setTrends] = useState([]);
    const [chartData, setChartData] = useState({});
    const [recentReports, setRecentReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedVital, setSelectedVital] = useState('heart_rate');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [trendsRes, reportsRes] = await Promise.all([
                vitalsAPI.getTrends(30),
                reportsAPI.getAll({ limit: 5 }),
            ]);
            setTrends(trendsRes.data.trends || []);
            setChartData(trendsRes.data.chartData || {});
            setRecentReports(reportsRes.data.reports?.slice(0, 5) || []);
        } catch (error) {
            console.error('Failed to fetch dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatChartData = (data) => {
        if (!data || data.length === 0) return [];
        return data.map(item => ({
            ...item,
            date: new Date(item.recorded_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
            }),
        }));
    };

    const getTrendIcon = (trend) => {
        if (!trend || trend.count < 2) return FiMinus;
        return trend.avg_value > trend.min_value ? FiTrendingUp : FiTrendingDown;
    };

    if (loading) {
        return (
            <div className="dashboard-loading">
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <div className="dashboard animate-fadeIn">
            <header className="dashboard-header">
                <div>
                    <h1>Welcome back, {user?.name?.split(' ')[0]}!</h1>
                    <p>Here's an overview of your health metrics</p>
                </div>
                <div className="header-actions">
                    <Link to="/reports" className="btn btn-primary">
                        <FiPlus /> Upload Report
                    </Link>
                </div>
            </header>

            {/* Quick Stats */}
            <div className="stats-grid">
                {trends.length > 0 ? trends.slice(0, 4).map((trend) => {
                    const Icon = VITAL_ICONS[trend.type] || FiActivity;
                    const TrendIcon = getTrendIcon(trend);
                    const color = VITAL_COLORS[trend.type] || '#00afaf';

                    return (
                        <div key={trend.type} className="stat-card card">
                            <div className="stat-icon" style={{ background: `${color}20`, color }}>
                                <Icon />
                            </div>
                            <div className="stat-info">
                                <span className="stat-label">
                                    {trend.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                </span>
                                <span className="stat-value">
                                    {Math.round(trend.avg_value * 10) / 10}
                                    <span className="stat-unit">{trend.unit}</span>
                                </span>
                            </div>
                            <div className="stat-trend">
                                <TrendIcon />
                            </div>
                        </div>
                    );
                }) : (
                    <div className="empty-stats card">
                        <FiActivity className="empty-icon" />
                        <p>No vitals recorded yet</p>
                        <Link to="/vitals" className="btn btn-secondary">
                            Add Your First Vital
                        </Link>
                    </div>
                )}
            </div>

            {/* Charts & Recent Reports */}
            <div className="dashboard-grid">
                {/* Vitals Chart */}
                <div className="chart-section card">
                    <div className="section-header">
                        <h2>Vitals Trend</h2>
                        <select
                            value={selectedVital}
                            onChange={(e) => setSelectedVital(e.target.value)}
                            className="vital-select"
                        >
                            {Object.keys(chartData).map(type => (
                                <option key={type} value={type}>
                                    {type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                </option>
                            ))}
                            {Object.keys(chartData).length === 0 && (
                                <option value="">No data available</option>
                            )}
                        </select>
                    </div>

                    {chartData[selectedVital] && chartData[selectedVital].length > 0 ? (
                        <div className="chart-container">
                            <ResponsiveContainer width="100%" height={250}>
                                <AreaChart data={formatChartData(chartData[selectedVital])}>
                                    <defs>
                                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={VITAL_COLORS[selectedVital] || '#00afaf'} stopOpacity={0.3} />
                                            <stop offset="95%" stopColor={VITAL_COLORS[selectedVital] || '#00afaf'} stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                    <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} />
                                    <YAxis stroke="#9ca3af" fontSize={12} />
                                    <Tooltip
                                        contentStyle={{
                                            background: 'white',
                                            border: 'none',
                                            borderRadius: '12px',
                                            boxShadow: '0 10px 40px rgba(0,0,0,0.1)'
                                        }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="value"
                                        stroke={VITAL_COLORS[selectedVital] || '#00afaf'}
                                        strokeWidth={2}
                                        fill="url(#colorValue)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="empty-chart">
                            <FiActivity className="empty-icon" />
                            <p>No data for this vital type</p>
                        </div>
                    )}
                </div>

                {/* Recent Reports */}
                <div className="reports-section card">
                    <div className="section-header">
                        <h2>Recent Reports</h2>
                        <Link to="/reports" className="view-all">View All</Link>
                    </div>

                    {recentReports.length > 0 ? (
                        <div className="reports-list">
                            {recentReports.map(report => (
                                <div key={report.id} className="report-item">
                                    <div className="report-icon">
                                        <FiFileText />
                                    </div>
                                    <div className="report-info">
                                        <span className="report-title">{report.title}</span>
                                        <span className="report-meta">
                                            {report.type} • {new Date(report.date).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="empty-reports">
                            <FiFileText className="empty-icon" />
                            <p>No reports uploaded yet</p>
                            <Link to="/reports" className="btn btn-secondary">
                                Upload Report
                            </Link>
                        </div>
                    )}
                </div>
            </div>

            {/* Quick Actions */}
            <div className="quick-actions">
                <h2>Quick Actions</h2>
                <div className="actions-grid">
                    <Link to="/reports" className="action-card card">
                        <div className="action-icon" style={{ background: '#dbeafe', color: '#3b82f6' }}>
                            <FiFileText />
                        </div>
                        <span>Upload Report</span>
                    </Link>
                    <Link to="/vitals" className="action-card card">
                        <div className="action-icon" style={{ background: '#d1fae5', color: '#10b981' }}>
                            <FiActivity />
                        </div>
                        <span>Record Vitals</span>
                    </Link>
                    <Link to="/sharing" className="action-card card">
                        <div className="action-icon" style={{ background: '#ede9fe', color: '#8b5cf6' }}>
                            <FiShare2 />
                        </div>
                        <span>Share Reports</span>
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
