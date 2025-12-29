const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDatabase } = require('./config/database');

const authRoutes = require('./routes/auth');
const reportsRoutes = require('./routes/reports');
const vitalsRoutes = require('./routes/vitals');
const sharingRoutes = require('./routes/sharing');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files (protected routes handle actual downloads)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/vitals', vitalsRoutes);
app.use('/api/sharing', sharingRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Health Wallet API is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);

    if (err.name === 'MulterError') {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'File size too large. Maximum 10MB allowed.' });
        }
        return res.status(400).json({ error: err.message });
    }

    res.status(500).json({ error: 'Something went wrong!' });
});

// Initialize database and start server
initDatabase()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`🏥 Health Wallet API running on http://localhost:${PORT}`);
            console.log(`📊 Database initialized successfully`);
        });
    })
    .catch((err) => {
        console.error('Failed to initialize database:', err);
        process.exit(1);
    });
