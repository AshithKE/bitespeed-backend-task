import mysql from 'mysql2/promise';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '@prisma/client';

export const pool = mysql.createPool({ 
  host: '127.0.0.1', 
  user: 'root',
  password: '', 
  database: 'bitespeed_db', 
  port: 3306,
  connectionLimit: 1,
  connectTimeout: 20000 
});

const adapter = new PrismaMariaDb(pool as any);
export const prisma = new PrismaClient({ adapter });

export const identify = async (req: any, res: any) => {
  const { email, phoneNumber } = req.body;
  if (!email && !phoneNumber) return res.status(400).json({ error: "Email or Phone required" });

  try {
    // 1. Find all related contacts
    const [matches]: any = await pool.execute(
      'SELECT * FROM Contact WHERE email = ? OR phoneNumber = ?',
      [email || null, phoneNumber || null]
    );

    if (matches.length === 0) {
      const [res1]: any = await pool.execute(
        'INSERT INTO Contact (email, phoneNumber, linkPrecedence, createdAt, updatedAt) VALUES (?, ?, "primary", NOW(), NOW())',
        [email, phoneNumber]
      );
      return res.json({ contact: { primaryContatctId: res1.insertId, emails: [email].filter(Boolean), phoneNumbers: [phoneNumber].filter(Boolean), secondaryContactIds: [] } });
    }

    // 2. Identify all primary contacts involved
    const primaryIds = [...new Set(matches.map((m: any) => m.linkPrecedence === 'primary' ? m.id : m.linkedId))];
    const [allPrimaries]: any = await pool.execute(`SELECT * FROM Contact WHERE id IN (${primaryIds.join(',')}) ORDER BY createdAt ASC`);
    
    const rootPrimary = allPrimaries[0]; // The oldest one stays primary

    // 3. MERGE LOGIC: Turn other primaries into secondaries
    for (let i = 1; i < allPrimaries.length; i++) {
      const otherPrimary = allPrimaries[i];
      await pool.execute(
        'UPDATE Contact SET linkPrecedence = "secondary", linkedId = ?, updatedAt = NOW() WHERE id = ? OR linkedId = ?',
        [rootPrimary.id, otherPrimary.id, otherPrimary.id]
      );
    }

    // 4. ADD NEW INFO: Create secondary if this specific combo is new
    const exactMatch = matches.some((m: any) => m.email === email && m.phoneNumber === phoneNumber);
    if (!exactMatch && email && phoneNumber) {
      await pool.execute(
        'INSERT INTO Contact (email, phoneNumber, linkedId, linkPrecedence, createdAt, updatedAt) VALUES (?, ?, ?, "secondary", NOW(), NOW())',
        [email, phoneNumber, rootPrimary.id]
      );
    }

    // 5. Consolidated Response
    const [allRelated]: any = await pool.execute(
      'SELECT * FROM Contact WHERE id = ? OR linkedId = ? ORDER BY createdAt ASC',
      [rootPrimary.id, rootPrimary.id]
    );

    return res.json({
      contact: {
        primaryContatctId: rootPrimary.id,
        emails: [...new Set(allRelated.map((c: any) => c.email).filter(Boolean))],
        phoneNumbers: [...new Set(allRelated.map((c: any) => c.phoneNumber).filter(Boolean))],
        secondaryContactIds: allRelated.filter((c: any) => c.linkPrecedence === 'secondary').map((c: any) => c.id)
      }
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};