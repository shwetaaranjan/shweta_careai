const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Share a report with another user
router.post('/', authenticateToken, (req, res) => {
    try {
        const { report_id, shared_with_email, access_type = 'read' } = req.body;
        const ownerId = req.user.id;

        if (!report_id || !shared_with_email) {
            return res.status(400).json({ error: 'Report ID and email are required' });
        }

        // Check if the report belongs to the current user
        db.get('SELECT * FROM reports WHERE id = ? AND user_id = ?', [report_id, ownerId], (err, report) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }
            if (!report) {
                return res.status(404).json({ error: 'Report not found or access denied' });
            }

            // Check if already shared with this email
            db.get(
                'SELECT * FROM shared_access WHERE report_id = ? AND shared_with_email = ?',
                [report_id, shared_with_email],
                (err, existingShare) => {
                    if (err) {
                        return res.status(500).json({ error: 'Database error' });
                    }
                    if (existingShare) {
                        return res.status(409).json({ error: 'Report already shared with this email' });
                    }

                    const shareId = uuidv4();

                    db.run(
                        `INSERT INTO shared_access (id, report_id, owner_id, shared_with_email, access_type)
             VALUES (?, ?, ?, ?, ?)`,
                        [shareId, report_id, ownerId, shared_with_email, access_type],
                        function (err) {
                            if (err) {
                                return res.status(500).json({ error: 'Failed to share report' });
                            }

                            res.status(201).json({
                                message: 'Report shared successfully',
                                share: {
                                    id: shareId,
                                    report_id,
                                    shared_with_email,
                                    access_type
                                }
                            });
                        }
                    );
                }
            );
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Get all shares for a report (owner only)
router.get('/report/:reportId', authenticateToken, (req, res) => {
    const reportId = req.params.reportId;
    const ownerId = req.user.id;

    // Verify ownership
    db.get('SELECT * FROM reports WHERE id = ? AND user_id = ?', [reportId, ownerId], (err, report) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        if (!report) {
            return res.status(404).json({ error: 'Report not found or access denied' });
        }

        db.all('SELECT * FROM shared_access WHERE report_id = ?', [reportId], (err, shares) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }
            res.json({ shares });
        });
    });
});

// Get all reports shared by the current user
router.get('/by-me', authenticateToken, (req, res) => {
    const ownerId = req.user.id;

    const query = `
    SELECT sa.*, r.title as report_title, r.type as report_type
    FROM shared_access sa
    JOIN reports r ON sa.report_id = r.id
    WHERE sa.owner_id = ?
    ORDER BY sa.created_at DESC
  `;

    db.all(query, [ownerId], (err, shares) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json({ shares });
    });
});

// Get all reports shared with the current user
router.get('/with-me', authenticateToken, (req, res) => {
    const userEmail = req.user.email;

    const query = `
    SELECT sa.*, r.title as report_title, r.type as report_type, r.date as report_date,
           u.name as owner_name, u.email as owner_email
    FROM shared_access sa
    JOIN reports r ON sa.report_id = r.id
    JOIN users u ON sa.owner_id = u.id
    WHERE sa.shared_with_email = ?
    ORDER BY sa.created_at DESC
  `;

    db.all(query, [userEmail], (err, shares) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json({ shares });
    });
});

// Revoke share access
router.delete('/:id', authenticateToken, (req, res) => {
    const shareId = req.params.id;
    const ownerId = req.user.id;

    db.run('DELETE FROM shared_access WHERE id = ? AND owner_id = ?', [shareId, ownerId], function (err) {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Share not found or access denied' });
        }
        res.json({ message: 'Access revoked successfully' });
    });
});

// Update share access type
router.put('/:id', authenticateToken, (req, res) => {
    const shareId = req.params.id;
    const ownerId = req.user.id;
    const { access_type } = req.body;

    if (!access_type || !['read', 'write'].includes(access_type)) {
        return res.status(400).json({ error: 'Valid access_type (read/write) is required' });
    }

    db.run(
        'UPDATE shared_access SET access_type = ? WHERE id = ? AND owner_id = ?',
        [access_type, shareId, ownerId],
        function (err) {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Share not found or access denied' });
            }
            res.json({ message: 'Access updated successfully' });
        }
    );
});

module.exports = router;
