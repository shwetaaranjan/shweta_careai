import { useState, useEffect } from 'react';
import { sharingAPI, reportsAPI } from '../services/api';
import {
    FiFileText, FiDownload, FiUser, FiCalendar, FiFolder
} from 'react-icons/fi';
import './SharedReports.css';

const SharedReports = () => {
    const [sharedReports, setSharedReports] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSharedReports();
    }, []);

    const fetchSharedReports = async () => {
        try {
            const response = await sharingAPI.getSharedWithMe();
            setSharedReports(response.data.shares || []);
        } catch (error) {
            console.error('Failed to fetch shared reports:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async (reportId, filename) => {
        try {
            const response = await reportsAPI.download(reportId);
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename || 'report');
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error('Failed to download report:', error);
        }
    };

    if (loading) {
        return (
            <div className="shared-loading">
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <div className="shared-page animate-fadeIn">
            <header className="page-header">
                <div>
                    <h1>Shared With Me</h1>
                    <p>Reports that others have shared with you</p>
                </div>
            </header>

            {sharedReports.length > 0 ? (
                <div className="shared-grid">
                    {sharedReports.map(share => (
                        <div key={share.id} className="shared-card card">
                            <div className="shared-card-header">
                                <div className="owner-info">
                                    <div className="owner-avatar">
                                        <FiUser />
                                    </div>
                                    <div className="owner-details">
                                        <span className="owner-name">{share.owner_name}</span>
                                        <span className="owner-email">{share.owner_email}</span>
                                    </div>
                                </div>
                                <span className="access-badge badge badge-success">
                                    {share.access_type}
                                </span>
                            </div>

                            <div className="shared-report-info">
                                <div className="report-icon">
                                    <FiFileText />
                                </div>
                                <div className="report-details">
                                    <h3>{share.report_title}</h3>
                                    <span className="report-type badge badge-primary">
                                        {share.report_type}
                                    </span>
                                </div>
                            </div>

                            <div className="shared-meta">
                                <span className="meta-item">
                                    <FiCalendar />
                                    Report Date: {new Date(share.report_date).toLocaleDateString()}
                                </span>
                                <span className="meta-item">
                                    <FiFolder />
                                    Shared: {new Date(share.created_at).toLocaleDateString()}
                                </span>
                            </div>

                            <button
                                className="btn btn-secondary download-btn"
                                onClick={() => handleDownload(share.report_id, share.report_title)}
                            >
                                <FiDownload /> Download Report
                            </button>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="empty-state card">
                    <FiFolder className="empty-icon" />
                    <h3>No shared reports</h3>
                    <p>When someone shares a report with you, it will appear here</p>
                </div>
            )}
        </div>
    );
};

export default SharedReports;
