const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../config/database');
const { generateToken } = require('../middleware/auth');

const router = express.Router();

// Register new user
router.post('/register', async (req, res) => {
    try {
        const { email, password, name } = req.body;

        if (!email || !password || !name) {
            return res.status(400).json({ error: 'Email, password, and name are required' });
        }

        // Check if user already exists
        db.get('SELECT id FROM users WHERE email = ?', [email], async (err, existingUser) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }

            if (existingUser) {
                return res.status(409).json({ error: 'User with this email already exists' });
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(password, 10);
            const userId = uuidv4();

            // Insert new user
            db.run(
                'INSERT INTO users (id, email, password, name) VALUES (?, ?, ?, ?)',
                [userId, email, hashedPassword, name],
                function (err) {
                    if (err) {
                        return res.status(500).json({ error: 'Failed to create user' });
                    }

                    const user = { id: userId, email, name };
                    const token = generateToken(user);

                    res.status(201).json({
                        message: 'User registered successfully',
                        user,
                        token
                    });
                }
            );
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Login user
router.post('/login', (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }

            if (!user) {
                return res.status(401).json({ error: 'Invalid email or password' });
            }

            const isValidPassword = await bcrypt.compare(password, user.password);

            if (!isValidPassword) {
                return res.status(401).json({ error: 'Invalid email or password' });
            }

            const token = generateToken({ id: user.id, email: user.email, name: user.name });

            res.json({
                message: 'Login successful',
                user: { id: user.id, email: user.email, name: user.name },
                token
            });
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Get current user profile
router.get('/me', require('../middleware/auth').authenticateToken, (req, res) => {
    db.get('SELECT id, email, name, created_at FROM users WHERE id = ?', [req.user.id], (err, user) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({ user });
    });
});

module.exports = router;
