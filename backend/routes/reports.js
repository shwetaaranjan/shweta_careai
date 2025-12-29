const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '..', 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only PDF and image files (JPEG, PNG) are allowed'), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Upload a new report
router.post('/', authenticateToken, upload.single('file'), (req, res) => {
    try {
        const { type, title, date, notes } = req.body;
        const userId = req.user.id;

        if (!req.file) {
            return res.status(400).json({ error: 'File is required' });
        }

        if (!type || !title || !date) {
            // Delete uploaded file if validation fails
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ error: 'Type, title, and date are required' });
        }

        const reportId = uuidv4();

        db.run(
            `INSERT INTO reports (id, user_id, type, title, file_path, original_filename, date, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [reportId, userId, type, title, req.file.filename, req.file.originalname, date, notes || null],
            function (err) {
                if (err) {
                    fs.unlinkSync(req.file.path);
                    return res.status(500).json({ error: 'Failed to save report' });
                }

                res.status(201).json({
                    message: 'Report uploaded successfully',
                    report: {
                        id: reportId,
                        type,
                        title,
                        date,
                        notes,
                        filename: req.file.originalname
                    }
                });
            }
        );
    } catch (error) {
        if (req.file) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ error: 'Server error' });
    }
});

// Get all reports for authenticated user
router.get('/', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const { type, startDate, endDate, search } = req.query;

    let query = 'SELECT * FROM reports WHERE user_id = ?';
    const params = [userId];

    if (type) {
        query += ' AND type = ?';
        params.push(type);
    }

    if (startDate) {
        query += ' AND date >= ?';
        params.push(startDate);
    }

    if (endDate) {
        query += ' AND date <= ?';
        params.push(endDate);
    }

    if (search) {
        query += ' AND (title LIKE ? OR notes LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY date DESC';

    db.all(query, params, (err, reports) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json({ reports });
    });
});

// Get shared reports (reports shared with the current user)
router.get('/shared', authenticateToken, (req, res) => {
    const userEmail = req.user.email;

    const query = `
    SELECT r.*, u.name as owner_name, u.email as owner_email, sa.access_type
    FROM reports r
    JOIN shared_access sa ON r.id = sa.report_id
    JOIN users u ON r.user_id = u.id
    WHERE sa.shared_with_email = ?
    ORDER BY r.date DESC
  `;

    db.all(query, [userEmail], (err, reports) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json({ reports });
    });
});

// Get single report
router.get('/:id', authenticateToken, (req, res) => {
    const reportId = req.params.id;
    const userId = req.user.id;
    const userEmail = req.user.email;

    // Check if user owns the report or has shared access
    const query = `
    SELECT r.*, 
      CASE WHEN r.user_id = ? THEN 'owner' ELSE 'viewer' END as access_role
    FROM reports r
    LEFT JOIN shared_access sa ON r.id = sa.report_id AND sa.shared_with_email = ?
    WHERE r.id = ? AND (r.user_id = ? OR sa.shared_with_email = ?)
  `;

    db.get(query, [userId, userEmail, reportId, userId, userEmail], (err, report) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        if (!report) {
            return res.status(404).json({ error: 'Report not found or access denied' });
        }
        res.json({ report });
    });
});

// Download report file
router.get('/:id/download', authenticateToken, (req, res) => {
    const reportId = req.params.id;
    const userId = req.user.id;
    const userEmail = req.user.email;

    const query = `
    SELECT r.file_path, r.original_filename
    FROM reports r
    LEFT JOIN shared_access sa ON r.id = sa.report_id AND sa.shared_with_email = ?
    WHERE r.id = ? AND (r.user_id = ? OR sa.shared_with_email = ?)
  `;

    db.get(query, [userEmail, reportId, userId, userEmail], (err, report) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        if (!report) {
            return res.status(404).json({ error: 'Report not found or access denied' });
        }

        const filePath = path.join(__dirname, '..', 'uploads', report.file_path);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'File not found' });
        }

        res.download(filePath, report.original_filename);
    });
});

// Delete report (owner only)
router.delete('/:id', authenticateToken, (req, res) => {
    const reportId = req.params.id;
    const userId = req.user.id;

    db.get('SELECT * FROM reports WHERE id = ? AND user_id = ?', [reportId, userId], (err, report) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        if (!report) {
            return res.status(404).json({ error: 'Report not found or access denied' });
        }

        // Delete file
        const filePath = path.join(__dirname, '..', 'uploads', report.file_path);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        // Delete from database (shared_access will be deleted via CASCADE)
        db.run('DELETE FROM reports WHERE id = ?', [reportId], function (err) {
            if (err) {
                return res.status(500).json({ error: 'Failed to delete report' });
            }
            res.json({ message: 'Report deleted successfully' });
        });
    });
});

module.exports = router;
