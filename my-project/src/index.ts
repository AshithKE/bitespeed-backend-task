import express from 'express';
import { pool, identify } from './controller';

const app = express();
app.use(express.json());

// Test the connection immediately
pool.getConnection()
  .then(conn => {
    console.log("✅ DATABASE CONNECTED SUCCESSFULLY!");
    conn.release();
  })
  .catch(err => {
    console.log("❌ DATABASE CONNECTION FAILED:", err.message);
  });

// Define your route
app.post('/identify', identify);

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});