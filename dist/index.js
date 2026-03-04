"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const controller_1 = require("./controller");
const app = (0, express_1.default)();
app.use(express_1.default.json());
// Test the connection immediately
controller_1.pool.getConnection()
    .then(conn => {
    console.log("✅ DATABASE CONNECTED SUCCESSFULLY!");
    conn.release();
})
    .catch(err => {
    console.log("❌ DATABASE CONNECTION FAILED:", err.message);
});
// Define your route
app.post('/identify', controller_1.identify);
const PORT = 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
});
