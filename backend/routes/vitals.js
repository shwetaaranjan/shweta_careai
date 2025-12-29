const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Vital types configuration
const VITAL_TYPES = {
    blood_pressure_systolic: { unit: 'mmHg', label: 'Blood Pressure (Systolic)' },
    blood_pressure_diastolic: { unit: 'mmHg', label: 'Blood Pressure (Diastolic)' },
    heart_rate: { unit: 'bpm', label: 'Heart Rate' },
    blood_sugar: { unit: 'mg/dL', label: 'Blood Sugar' },
    body_temperature: { unit: '°F', label: 'Body Temperature' },
    weight: { unit: 'kg', label: 'Weight' },
    oxygen_saturation: { unit: '%', label: 'Oxygen Saturation (SpO2)' },
    cholesterol: { unit: 'mg/dL', label: 'Cholesterol' },
    hemoglobin: { unit: 'g/dL', label: 'Hemoglobin' }
};

// Get vital types
router.get('/types', authenticateToken, (req, res) => {
    res.json({ vitalTypes: VITAL_TYPES });
});

// Add new vital reading
router.post('/', authenticateToken, (req, res) => {
    try {
        const { type, value, recorded_at, report_id } = req.body;
        const userId = req.user.id;

        if (!type || value === undefined || !recorded_at) {
            return res.status(400).json({ error: 'Type, value, and recorded_at are required' });
        }

        if (!VITAL_TYPES[type]) {
            return res.status(400).json({ error: 'Invalid vital type' });
        }

        const vitalId = uuidv4();
        const unit = VITAL_TYPES[type].unit;

        db.run(
            `INSERT INTO vitals (id, user_id, type, value, unit, recorded_at, report_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [vitalId, userId, type, value, unit, recorded_at, report_id || null],
            function (err) {
                if (err) {
                    return res.status(500).json({ error: 'Failed to save vital' });
                }

                res.status(201).json({
                    message: 'Vital recorded successfully',
                    vital: {
                        id: vitalId,
                        type,
                        value,
                        unit,
                        recorded_at,
                        report_id
                    }
                });
            }
        );
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Get all vitals for authenticated user
router.get('/', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const { type, startDate, endDate } = req.query;

    let query = 'SELECT * FROM vitals WHERE user_id = ?';
    const params = [userId];

    if (type) {
        query += ' AND type = ?';
        params.push(type);
    }

    if (startDate) {
        query += ' AND recorded_at >= ?';
        params.push(startDate);
    }

    if (endDate) {
        query += ' AND recorded_at <= ?';
        params.push(endDate);
    }

    query += ' ORDER BY recorded_at DESC';

    db.all(query, params, (err, vitals) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json({ vitals });
    });
});

// Get vitals summary/trends
router.get('/trends', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const { days = 30 } = req.query;

    const query = `
    SELECT type, 
           AVG(value) as avg_value,
           MIN(value) as min_value,
           MAX(value) as max_value,
           COUNT(*) as count,
           unit
    FROM vitals 
    WHERE user_id = ? 
      AND recorded_at >= datetime('now', '-${parseInt(days)} days')
    GROUP BY type
  `;

    db.all(query, [userId], (err, trends) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }

        // Get recent readings for each type
        const recentQuery = `
      SELECT type, value, unit, recorded_at
      FROM vitals
      WHERE user_id = ?
        AND recorded_at >= datetime('now', '-${parseInt(days)} days')
      ORDER BY recorded_at ASC
    `;

        db.all(recentQuery, [userId], (err, readings) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }

            // Group readings by type for chart data
            const chartData = {};
            readings.forEach(reading => {
                if (!chartData[reading.type]) {
                    chartData[reading.type] = [];
                }
                chartData[reading.type].push({
                    value: reading.value,
                    recorded_at: reading.recorded_at
                });
            });

            res.json({ trends, chartData });
        });
    });
});

// Get single vital
router.get('/:id', authenticateToken, (req, res) => {
    const vitalId = req.params.id;
    const userId = req.user.id;

    db.get('SELECT * FROM vitals WHERE id = ? AND user_id = ?', [vitalId, userId], (err, vital) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        if (!vital) {
            return res.status(404).json({ error: 'Vital not found' });
        }
        res.json({ vital });
    });
});

// Update vital
router.put('/:id', authenticateToken, (req, res) => {
    const vitalId = req.params.id;
    const userId = req.user.id;
    const { value, recorded_at } = req.body;

    db.get('SELECT * FROM vitals WHERE id = ? AND user_id = ?', [vitalId, userId], (err, vital) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        if (!vital) {
            return res.status(404).json({ error: 'Vital not found' });
        }

        db.run(
            'UPDATE vitals SET value = ?, recorded_at = ? WHERE id = ?',
            [value !== undefined ? value : vital.value, recorded_at || vital.recorded_at, vitalId],
            function (err) {
                if (err) {
                    return res.status(500).json({ error: 'Failed to update vital' });
                }
                res.json({ message: 'Vital updated successfully' });
            }
        );
    });
});

// Delete vital
router.delete('/:id', authenticateToken, (req, res) => {
    const vitalId = req.params.id;
    const userId = req.user.id;

    db.run('DELETE FROM vitals WHERE id = ? AND user_id = ?', [vitalId, userId], function (err) {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Vital not found' });
        }
        res.json({ message: 'Vital deleted successfully' });
    });
});

module.exports = router;
