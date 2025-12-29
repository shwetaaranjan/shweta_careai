import { useState, useEffect } from 'react';
import { sharingAPI, reportsAPI } from '../services/api';
import {
    FiShare2, FiTrash2, FiUser, FiMail, FiFileText,
    FiCalendar, FiX, FiPlus, FiCheck
} from 'react-icons/fi';
import './Sharing.css';

const Sharing = () => {
    const [myShares, setMyShares] = useState([]);
    const [myReports, setMyReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showShareModal, setShowShareModal] = useState(false);
    const [selectedReport, setSelectedReport] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [sharesRes, reportsRes] = await Promise.all([
                sharingAPI.getSharedByMe(),
                reportsAPI.getAll()
            ]);
            setMyShares(sharesRes.data.shares || []);
            setMyReports(reportsRes.data.reports || []);
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRevoke = async (shareId) => {
        if (!window.confirm('Revoke this access?')) return;

        try {
            await sharingAPI.revoke(shareId);
            setMyShares(myShares.filter(s => s.id !== shareId));
        } catch (error) {
            console.error('Failed to revoke access:', error);
        }
    };

    const openShareModal = (report) => {
        setSelectedReport(report);
        setShowShareModal(true);
    };

    if (loading) {
        return (
            <div className="sharing-loading">
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <div className="sharing-page animate-fadeIn">
            <header className="page-header">
                <div>
                    <h1>Access Sharing</h1>
                    <p>Manage who can view your health reports</p>
                </div>
            </header>

            {/* My Reports to Share */}
            <section className="share-section card">
                <h2>My Reports</h2>
                <p className="section-desc">Select a report to share with others</p>

                {myReports.length > 0 ? (
                    <div className="reports-to-share">
                        {myReports.map(report => {
                            const shareCount = myShares.filter(s => s.report_id === report.id).length;
                            return (
                                <div key={report.id} className="share-report-item">
                                    <div className="report-icon">
                                        <FiFileText />
                                    </div>
                                    <div className="report-details">
                                        <span className="report-title">{report.title}</span>
                                        <span className="report-meta">
                                            {report.type} • {new Date(report.date).toLocaleDateString()}
                                        </span>
                                    </div>
                                    {shareCount > 0 && (
                                        <span className="share-count badge badge-primary">
                                            {shareCount} shared
                                        </span>
                                    )}
                                    <button
                                        className="btn btn-secondary"
                                        onClick={() => openShareModal(report)}
                                    >
                                        <FiShare2 /> Share
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="empty-state">
                        <FiFileText className="empty-icon" />
                        <p>No reports to share. Upload some reports first.</p>
                    </div>
                )}
            </section>

            {/* Active Shares */}
            <section className="share-section card">
                <h2>Active Shares</h2>
                <p className="section-desc">People who have access to your reports</p>

                {myShares.length > 0 ? (
                    <div className="active-shares">
                        {myShares.map(share => (
                            <div key={share.id} className="share-item">
                                <div className="share-user">
                                    <div className="user-avatar">
                                        <FiUser />
                                    </div>
                                    <div className="share-details">
                                        <span className="share-email">{share.shared_with_email}</span>
                                        <span className="share-report">
                                            <FiFileText /> {share.report_title}
                                        </span>
                                    </div>
                                </div>
                                <div className="share-info">
                                    <span className="access-badge badge badge-success">
                                        {share.access_type}
                                    </span>
                                    <span className="share-date">
                                        <FiCalendar />
                                        {new Date(share.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                                <button
                                    className="btn btn-danger btn-icon"
                                    onClick={() => handleRevoke(share.id)}
                                    title="Revoke Access"
                                >
                                    <FiTrash2 />
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="empty-state">
                        <FiShare2 className="empty-icon" />
                        <p>You haven't shared any reports yet</p>
                    </div>
                )}
            </section>

            {/* Share Modal */}
            {showShareModal && selectedReport && (
                <ShareModal
                    report={selectedReport}
                    onClose={() => {
                        setShowShareModal(false);
                        setSelectedReport(null);
                    }}
                    onSuccess={() => {
                        setShowShareModal(false);
                        setSelectedReport(null);
                        fetchData();
                    }}
                />
            )}
        </div>
    );
};

const ShareModal = ({ report, onClose, onSuccess }) => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess(false);

        try {
            await sharingAPI.create({
                report_id: report.id,
                shared_with_email: email,
                access_type: 'read'
            });
            setSuccess(true);
            setEmail('');
            setTimeout(() => {
                onSuccess();
            }, 1500);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to share report');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content share-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Share Report</h2>
                    <button className="btn btn-ghost btn-icon" onClick={onClose}>
                        <FiX />
                    </button>
                </div>

                <div className="share-report-info">
                    <FiFileText className="info-icon" />
                    <div>
                        <span className="info-title">{report.title}</span>
                        <span className="info-type">{report.type}</span>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="share-form">
                    {error && <div className="auth-error">{error}</div>}
                    {success && (
                        <div className="share-success">
                            <FiCheck /> Report shared successfully!
                        </div>
                    )}

                    <div className="input-group">
                        <label htmlFor="email">Share with (Email)</label>
                        <div className="input-wrapper">
                            <FiMail className="input-icon" />
                            <input
                                type="email"
                                id="email"
                                className="input"
                                placeholder="Enter email address"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <span className="input-hint">
                            The person will get read-only access to this report
                        </span>
                    </div>

                    <div className="modal-actions">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={loading || success}>
                            {loading ? (
                                <span className="spinner" style={{ width: 20, height: 20 }}></span>
                            ) : success ? (
                                <>
                                    <FiCheck /> Shared
                                </>
                            ) : (
                                <>
                                    <FiShare2 /> Share
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Sharing;
