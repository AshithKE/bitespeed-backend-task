"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.identify = exports.pool = void 0;
const promise_1 = __importDefault(require("mysql2/promise"));
exports.pool = promise_1.default.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT) || 3306,
    // ADD THIS LINE BELOW TO FIX THE "SECURE CONNECTION" ERROR
    ssl: { rejectUnauthorized: false },
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});
const sql = `INSERT INTO Contact (email, phoneNumber, linkPrecedence) 
             VALUES (?, ?, 'primary')`; // Correct: 'primary' is a string
//const adapter = new PrismaMariaDb(pool as any);
//export const prisma = new PrismaClient({ adapter });
const identify = async (req, res) => {
    const { email, phoneNumber } = req.body;
    if (!email && !phoneNumber)
        return res.status(400).json({ error: "Email or Phone required" });
    try {
        // 1. Find all related contacts
        const [matches] = await exports.pool.execute('SELECT * FROM Contact WHERE email = ? OR phoneNumber = ?', [email || null, phoneNumber || null]);
        if (matches.length === 0) {
            const [res1] = await exports.pool.execute('INSERT INTO Contact (email, phoneNumber, linkPrecedence, createdAt, updatedAt) VALUES (?, ?, "primary", NOW(), NOW())', [email, phoneNumber]);
            return res.json({ contact: { primaryContatctId: res1.insertId, emails: [email].filter(Boolean), phoneNumbers: [phoneNumber].filter(Boolean), secondaryContactIds: [] } });
        }
        // 2. Identify all primary contacts involved
        const primaryIds = [...new Set(matches.map((m) => m.linkPrecedence === 'primary' ? m.id : m.linkedId))];
        const [allPrimaries] = await exports.pool.execute(`SELECT * FROM Contact WHERE id IN (${primaryIds.join(',')}) ORDER BY createdAt ASC`);
        const rootPrimary = allPrimaries[0]; // The oldest one stays primary
        // 3. MERGE LOGIC: Turn other primaries into secondaries
        for (let i = 1; i < allPrimaries.length; i++) {
            const otherPrimary = allPrimaries[i];
            await exports.pool.execute('UPDATE Contact SET linkPrecedence = "secondary", linkedId = ?, updatedAt = NOW() WHERE id = ? OR linkedId = ?', [rootPrimary.id, otherPrimary.id, otherPrimary.id]);
        }
        // 4. ADD NEW INFO: Create secondary if this specific combo is new
        const exactMatch = matches.some((m) => m.email === email && m.phoneNumber === phoneNumber);
        if (!exactMatch && email && phoneNumber) {
            await exports.pool.execute('INSERT INTO Contact (email, phoneNumber, linkedId, linkPrecedence, createdAt, updatedAt) VALUES (?, ?, ?, "secondary", NOW(), NOW())', [email, phoneNumber, rootPrimary.id]);
        }
        // 5. Consolidated Response
        const [allRelated] = await exports.pool.execute('SELECT * FROM Contact WHERE id = ? OR linkedId = ? ORDER BY createdAt ASC', [rootPrimary.id, rootPrimary.id]);
        return res.json({
            contact: {
                primaryContatctId: rootPrimary.id,
                emails: [...new Set(allRelated.map((c) => c.email).filter(Boolean))],
                phoneNumbers: [...new Set(allRelated.map((c) => c.phoneNumber).filter(Boolean))],
                secondaryContactIds: allRelated.filter((c) => c.linkPrecedence === 'secondary').map((c) => c.id)
            }
        });
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
exports.identify = identify;
