import { useState, useEffect } from 'react';
import { reportsAPI } from '../services/api';
import {
    FiPlus, FiSearch, FiFilter, FiDownload, FiTrash2,
    FiFileText, FiImage, FiFile, FiCalendar, FiX
} from 'react-icons/fi';
import './Reports.css';

const REPORT_TYPES = [
    'Blood Test',
    'X-Ray',
    'MRI',
    'CT Scan',
    'Ultrasound',
    'ECG',
    'Prescription',
    'Vaccination',
    'Other'
];

const Reports = () => {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [filters, setFilters] = useState({
        type: '',
        startDate: '',
        endDate: '',
        search: ''
    });

    useEffect(() => {
        fetchReports();
    }, [filters]);

    const fetchReports = async () => {
        try {
            const response = await reportsAPI.getAll(filters);
            setReports(response.data.reports || []);
        } catch (error) {
            console.error('Failed to fetch reports:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async (report) => {
        try {
            const response = await reportsAPI.download(report.id);
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', report.original_filename || 'report');
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error('Failed to download report:', error);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this report?')) return;

        try {
            await reportsAPI.delete(id);
            setReports(reports.filter(r => r.id !== id));
        } catch (error) {
            console.error('Failed to delete report:', error);
        }
    };

    const getFileIcon = (filename) => {
        if (!filename) return FiFile;
        const ext = filename.split('.').pop()?.toLowerCase();
        if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) return FiImage;
        if (ext === 'pdf') return FiFileText;
        return FiFile;
    };

    const clearFilters = () => {
        setFilters({ type: '', startDate: '', endDate: '', search: '' });
    };

    const hasFilters = filters.type || filters.startDate || filters.endDate || filters.search;

    return (
        <div className="reports-page animate-fadeIn">
            <header className="page-header">
                <div>
                    <h1>Medical Reports</h1>
                    <p>Manage and organize your health documents</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowUploadModal(true)}>
                    <FiPlus /> Upload Report
                </button>
            </header>

            {/* Filters */}
            <div className="filters-bar card">
                <div className="search-box">
                    <FiSearch className="search-icon" />
                    <input
                        type="text"
                        placeholder="Search reports..."
                        value={filters.search}
                        onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                        className="search-input"
                    />
                </div>

                <select
                    value={filters.type}
                    onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                    className="filter-select"
                >
                    <option value="">All Types</option>
                    {REPORT_TYPES.map(type => (
                        <option key={type} value={type}>{type}</option>
                    ))}
                </select>

                <div className="date-filters">
                    <input
                        type="date"
                        value={filters.startDate}
                        onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                        className="date-input"
                        placeholder="From"
                    />
                    <span>to</span>
                    <input
                        type="date"
                        value={filters.endDate}
                        onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                        className="date-input"
                        placeholder="To"
                    />
                </div>

                {hasFilters && (
                    <button className="btn btn-ghost" onClick={clearFilters}>
                        <FiX /> Clear
                    </button>
                )}
            </div>

            {/* Reports Grid */}
            {loading ? (
                <div className="loading-state">
                    <div className="spinner"></div>
                </div>
            ) : reports.length > 0 ? (
                <div className="reports-grid">
                    {reports.map(report => {
                        const FileIcon = getFileIcon(report.original_filename);
                        return (
                            <div key={report.id} className="report-card card">
                                <div className="report-card-header">
                                    <div className="file-icon">
                                        <FileIcon />
                                    </div>
                                    <span className="report-type badge badge-primary">{report.type}</span>
                                </div>

                                <h3 className="report-title">{report.title}</h3>

                                <div className="report-date">
                                    <FiCalendar />
                                    <span>{new Date(report.date).toLocaleDateString()}</span>
                                </div>

                                {report.notes && (
                                    <p className="report-notes">{report.notes}</p>
                                )}

                                <div className="report-actions">
                                    <button
                                        className="btn btn-secondary btn-icon"
                                        onClick={() => handleDownload(report)}
                                        title="Download"
                                    >
                                        <FiDownload />
                                    </button>
                                    <button
                                        className="btn btn-danger btn-icon"
                                        onClick={() => handleDelete(report.id)}
                                        title="Delete"
                                    >
                                        <FiTrash2 />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="empty-state card">
                    <FiFileText className="empty-icon" />
                    <h3>No reports found</h3>
                    <p>Upload your first medical report to get started</p>
                    <button className="btn btn-primary" onClick={() => setShowUploadModal(true)}>
                        <FiPlus /> Upload Report
                    </button>
                </div>
            )}

            {/* Upload Modal */}
            {showUploadModal && (
                <UploadModal
                    onClose={() => setShowUploadModal(false)}
                    onSuccess={() => {
                        setShowUploadModal(false);
                        fetchReports();
                    }}
                />
            )}
        </div>
    );
};

const UploadModal = ({ onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        title: '',
        type: '',
        date: new Date().toISOString().split('T')[0],
        notes: ''
    });
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!file) {
            setError('Please select a file');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const data = new FormData();
            data.append('file', file);
            data.append('title', formData.title);
            data.append('type', formData.type);
            data.append('date', formData.date);
            data.append('notes', formData.notes);

            await reportsAPI.upload(data);
            onSuccess();
        } catch (err) {
            setError(err.response?.data?.error || 'Upload failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content upload-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Upload Report</h2>
                    <button className="btn btn-ghost btn-icon" onClick={onClose}>
                        <FiX />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="upload-form">
                    {error && <div className="auth-error">{error}</div>}

                    <div className="file-upload">
                        <input
                            type="file"
                            id="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={(e) => setFile(e.target.files[0])}
                            className="file-input"
                        />
                        <label htmlFor="file" className="file-label">
                            {file ? (
                                <span className="file-name">{file.name}</span>
                            ) : (
                                <>
                                    <FiPlus className="upload-icon" />
                                    <span>Choose PDF or Image</span>
                                    <span className="file-hint">Max 10MB</span>
                                </>
                            )}
                        </label>
                    </div>

                    <div className="input-group">
                        <label htmlFor="title">Report Title</label>
                        <input
                            type="text"
                            id="title"
                            className="input"
                            placeholder="e.g., Blood Test Results"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            required
                        />
                    </div>

                    <div className="form-row">
                        <div className="input-group">
                            <label htmlFor="type">Report Type</label>
                            <select
                                id="type"
                                className="input"
                                value={formData.type}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                required
                            >
                                <option value="">Select type</option>
                                {REPORT_TYPES.map(type => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>
                        </div>

                        <div className="input-group">
                            <label htmlFor="date">Report Date</label>
                            <input
                                type="date"
                                id="date"
                                className="input"
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    <div className="input-group">
                        <label htmlFor="notes">Notes (Optional)</label>
                        <textarea
                            id="notes"
                            className="input"
                            placeholder="Add any additional notes..."
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            rows={3}
                        />
                    </div>

                    <div className="modal-actions">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? <span className="spinner" style={{ width: 20, height: 20 }}></span> : 'Upload'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Reports;
