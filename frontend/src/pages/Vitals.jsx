import { useState, useEffect } from 'react';
import { vitalsAPI } from '../services/api';
import {
    FiPlus, FiTrash2, FiEdit2, FiX, FiActivity,
    FiHeart, FiDroplet, FiThermometer, FiCalendar
} from 'react-icons/fi';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, Area, AreaChart,
    Legend
} from 'recharts';
import './Vitals.css';

const VITAL_COLORS = {
    blood_pressure_systolic: '#ef4444',
    blood_pressure_diastolic: '#f97316',
    heart_rate: '#ec4899',
    blood_sugar: '#8b5cf6',
    body_temperature: '#f59e0b',
    weight: '#10b981',
    oxygen_saturation: '#3b82f6',
    cholesterol: '#6366f1',
    hemoglobin: '#14b8a6'
};

const VITAL_LABELS = {
    blood_pressure_systolic: 'Blood Pressure (Systolic)',
    blood_pressure_diastolic: 'Blood Pressure (Diastolic)',
    heart_rate: 'Heart Rate',
    blood_sugar: 'Blood Sugar',
    body_temperature: 'Body Temperature',
    weight: 'Weight',
    oxygen_saturation: 'Oxygen Saturation',
    cholesterol: 'Cholesterol',
    hemoglobin: 'Hemoglobin'
};

const Vitals = () => {
    const [vitals, setVitals] = useState([]);
    const [trends, setTrends] = useState([]);
    const [chartData, setChartData] = useState({});
    const [vitalTypes, setVitalTypes] = useState({});
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedType, setSelectedType] = useState('all');
    const [dateRange, setDateRange] = useState(30);

    useEffect(() => {
        fetchData();
    }, [dateRange]);

    const fetchData = async () => {
        try {
            const [vitalsRes, trendsRes, typesRes] = await Promise.all([
                vitalsAPI.getAll(),
                vitalsAPI.getTrends(dateRange),
                vitalsAPI.getTypes()
            ]);

            setVitals(vitalsRes.data.vitals || []);
            setTrends(trendsRes.data.trends || []);
            setChartData(trendsRes.data.chartData || {});
            setVitalTypes(typesRes.data.vitalTypes || {});
        } catch (error) {
            console.error('Failed to fetch vitals:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this vital reading?')) return;

        try {
            await vitalsAPI.delete(id);
            setVitals(vitals.filter(v => v.id !== id));
            fetchData();
        } catch (error) {
            console.error('Failed to delete vital:', error);
        }
    };

    const formatChartData = () => {
        const allData = [];
        const types = selectedType === 'all'
            ? Object.keys(chartData).slice(0, 4)
            : [selectedType];

        types.forEach(type => {
            if (chartData[type]) {
                chartData[type].forEach(item => {
                    const date = new Date(item.recorded_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric'
                    });

                    const existing = allData.find(d => d.date === date);
                    if (existing) {
                        existing[type] = item.value;
                    } else {
                        allData.push({ date, [type]: item.value });
                    }
                });
            }
        });

        return allData.sort((a, b) => new Date(a.date) - new Date(b.date));
    };

    const filteredVitals = selectedType === 'all'
        ? vitals
        : vitals.filter(v => v.type === selectedType);

    if (loading) {
        return (
            <div className="vitals-loading">
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <div className="vitals-page animate-fadeIn">
            <header className="page-header">
                <div>
                    <h1>Vitals Tracking</h1>
                    <p>Monitor your health metrics over time</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
                    <FiPlus /> Add Vital
                </button>
            </header>

            {/* Filter Controls */}
            <div className="vitals-controls card">
                <div className="control-group">
                    <label>Vital Type</label>
                    <select
                        value={selectedType}
                        onChange={(e) => setSelectedType(e.target.value)}
                        className="control-select"
                    >
                        <option value="all">All Vitals</option>
                        {Object.keys(vitalTypes).map(type => (
                            <option key={type} value={type}>
                                {VITAL_LABELS[type] || type}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="control-group">
                    <label>Time Range</label>
                    <div className="range-buttons">
                        {[7, 30, 90].map(days => (
                            <button
                                key={days}
                                className={`range-btn ${dateRange === days ? 'active' : ''}`}
                                onClick={() => setDateRange(days)}
                            >
                                {days}d
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            {trends.length > 0 && (
                <div className="vitals-stats">
                    {trends.slice(0, 4).map(trend => (
                        <div key={trend.type} className="vital-stat card">
                            <div
                                className="stat-color-bar"
                                style={{ background: VITAL_COLORS[trend.type] }}
                            ></div>
                            <div className="stat-content">
                                <span className="stat-label">{VITAL_LABELS[trend.type] || trend.type}</span>
                                <div className="stat-values">
                                    <span className="stat-avg">
                                        {Math.round(trend.avg_value * 10) / 10}
                                        <span className="stat-unit">{trend.unit}</span>
                                    </span>
                                    <div className="stat-range">
                                        <span>Min: {Math.round(trend.min_value)}</span>
                                        <span>Max: {Math.round(trend.max_value)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Chart */}
            <div className="vitals-chart card">
                <h2>Trends</h2>
                {Object.keys(chartData).length > 0 ? (
                    <div className="chart-container">
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={formatChartData()}>
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
                                <Legend />
                                {(selectedType === 'all'
                                    ? Object.keys(chartData).slice(0, 4)
                                    : [selectedType]
                                ).map(type => (
                                    <Line
                                        key={type}
                                        type="monotone"
                                        dataKey={type}
                                        stroke={VITAL_COLORS[type] || '#00afaf'}
                                        strokeWidth={2}
                                        dot={{ fill: VITAL_COLORS[type] || '#00afaf', r: 4 }}
                                        name={VITAL_LABELS[type] || type}
                                    />
                                ))}
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <div className="empty-chart">
                        <FiActivity className="empty-icon" />
                        <p>No vitals data to display</p>
                    </div>
                )}
            </div>

            {/* Vitals List */}
            <div className="vitals-list card">
                <h2>Recent Readings</h2>
                {filteredVitals.length > 0 ? (
                    <div className="readings-grid">
                        {filteredVitals.slice(0, 20).map(vital => (
                            <div key={vital.id} className="reading-item">
                                <div
                                    className="reading-indicator"
                                    style={{ background: VITAL_COLORS[vital.type] }}
                                ></div>
                                <div className="reading-info">
                                    <span className="reading-type">{VITAL_LABELS[vital.type] || vital.type}</span>
                                    <span className="reading-value">
                                        {vital.value} <span>{vital.unit}</span>
                                    </span>
                                    <span className="reading-date">
                                        <FiCalendar />
                                        {new Date(vital.recorded_at).toLocaleString()}
                                    </span>
                                </div>
                                <button
                                    className="btn btn-ghost btn-icon"
                                    onClick={() => handleDelete(vital.id)}
                                >
                                    <FiTrash2 />
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="empty-readings">
                        <p>No readings found</p>
                    </div>
                )}
            </div>

            {/* Add Vital Modal */}
            {showAddModal && (
                <AddVitalModal
                    vitalTypes={vitalTypes}
                    onClose={() => setShowAddModal(false)}
                    onSuccess={() => {
                        setShowAddModal(false);
                        fetchData();
                    }}
                />
            )}
        </div>
    );
};

const AddVitalModal = ({ vitalTypes, onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        type: '',
        value: '',
        recorded_at: new Date().toISOString().slice(0, 16)
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            await vitalsAPI.create({
                ...formData,
                recorded_at: new Date(formData.recorded_at).toISOString()
            });
            onSuccess();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to add vital');
        } finally {
            setLoading(false);
        }
    };

    const selectedUnit = vitalTypes[formData.type]?.unit || '';

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content add-vital-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Add Vital Reading</h2>
                    <button className="btn btn-ghost btn-icon" onClick={onClose}>
                        <FiX />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="vital-form">
                    {error && <div className="auth-error">{error}</div>}

                    <div className="input-group">
                        <label htmlFor="type">Vital Type</label>
                        <select
                            id="type"
                            className="input"
                            value={formData.type}
                            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                            required
                        >
                            <option value="">Select vital type</option>
                            {Object.entries(vitalTypes).map(([key, data]) => (
                                <option key={key} value={key}>{data.label}</option>
                            ))}
                        </select>
                    </div>

                    <div className="input-group">
                        <label htmlFor="value">Value {selectedUnit && `(${selectedUnit})`}</label>
                        <input
                            type="number"
                            id="value"
                            className="input"
                            placeholder="Enter value"
                            value={formData.value}
                            onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                            step="0.1"
                            required
                        />
                    </div>

                    <div className="input-group">
                        <label htmlFor="recorded_at">Date & Time</label>
                        <input
                            type="datetime-local"
                            id="recorded_at"
                            className="input"
                            value={formData.recorded_at}
                            onChange={(e) => setFormData({ ...formData, recorded_at: e.target.value })}
                            required
                        />
                    </div>

                    <div className="modal-actions">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? <span className="spinner" style={{ width: 20, height: 20 }}></span> : 'Add Vital'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Vitals;
