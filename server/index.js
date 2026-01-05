const express = require('express');
const cors = require('cors');
const { pool } = require('./db');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Basic test route
app.get('/', (req, res) => {
    res.send('Cotton Mill Contract System API is running.');
});

// Routes
const authRoutes = require('./routes/auth.routes');
const vendorRoutes = require('./routes/vendor.routes');
const contractRoutes = require('./routes/contract.routes');

app.use('/api', authRoutes);
app.use('/api', vendorRoutes);
app.use('/api', contractRoutes);

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
