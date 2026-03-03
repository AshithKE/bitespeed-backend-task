import express from 'express';
import "dotenv/config";
import { identifyContact } from './controller.js'; // Note the .js extension
import { pool } from './controller'; // This tells index.ts where to find 'pool'

const app = express();

// Middleware to parse JSON bodies
app.use(express.json());

// Main Route - Bitespeed Identity Reconciliation
app.post('/identify', identifyContact);

// Basic Health Check (Optional)
app.get('/', (req, res) => {
  res.send('Bitespeed Identity Service is running.');
});

const PORT = process.env.PORT || 3000;

// ... your imports (express, etc.) are at the top

// PASTE THIS PART HERE:
pool.getConnection()
  .then(conn => {
    console.log("✅ DATABASE CONNECTED SUCCESSFULLY!");
    conn.release();
  })
  .catch(err => {
    console.log("❌ DATABASE CONNECTION FAILED:", err.message);
  });

app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});

app.listen(PORT, () => {
  console.log(`-----------------------------------------------`);
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  console.log(`🛠️ Send POST requests to http://localhost:${PORT}/identify`);
  console.log(`-----------------------------------------------`);
});