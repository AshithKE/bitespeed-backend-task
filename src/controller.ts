import mysql from 'mysql2/promise';

export const pool = mysql.createPool({ 
  host: process.env.DB_HOST, 
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD, 
  database: process.env.DB_NAME, 
  port: Number(process.env.DB_PORT) || 3306,
  ssl: { rejectUnauthorized: false },
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

export const identify = async (req: any, res: any) => {
  const { email, phoneNumber } = req.body;
  if (!email && !phoneNumber) return res.status(400).json({ error: "Email or Phone required" });

  try {
    // 1. Find all related contacts
    const [matches]: any = await pool.execute(
      'SELECT * FROM Contact WHERE email = ? OR phoneNumber = ?',
      [email || null, phoneNumber || null]
    );

    // If no match found, create a new primary contact
    if (matches.length === 0) {
      const [res1]: any = await pool.execute(
        "INSERT INTO Contact (email, phoneNumber, linkPrecedence, createdAt, updatedAt) VALUES (?, ?, 'primary', NOW(), NOW())",
        [email, phoneNumber]
      );
      return res.json({ 
        contact: { 
          primaryContatctId: res1.insertId, 
          emails: [email].filter(Boolean), 
          phoneNumbers: [phoneNumber].filter(Boolean), 
          secondaryContactIds: [] 
        } 
      });
    }

    // 2. Identify all primary contacts involved
    // We map every match to its primary ID (either itself if primary, or its linkedId if secondary)
    const linkedPrimaryIds = matches.map((m: any) => m.linkPrecedence === 'primary' ? m.id : m.linkedId);
    const uniquePrimaryIds = [...new Set(linkedPrimaryIds)].filter(Boolean);

    // Fetch all related primary contacts to find the oldest one
    const [allPrimaries]: any = await pool.execute(
      `SELECT * FROM Contact WHERE id IN (${uniquePrimaryIds.join(',')}) ORDER BY createdAt ASC`
    );
    
    const rootPrimary = allPrimaries[0]; // The oldest one stays 'primary'

    // 3. MERGE LOGIC: If multiple primaries found, turn the newer ones into 'secondary'
    for (let i = 1; i < allPrimaries.length; i++) {
      const otherPrimary = allPrimaries[i];
      if (otherPrimary.id !== rootPrimary.id) {
        await pool.execute(
          "UPDATE Contact SET linkPrecedence = 'secondary', linkedId = ?, updatedAt = NOW() WHERE id = ? OR linkedId = ?",
          [rootPrimary.id, otherPrimary.id, otherPrimary.id]
        );
      }
    }

    // 4. ADD NEW INFO: Create secondary if this specific email/phone combo hasn't been seen
    const exactMatch = matches.some((m: any) => m.email === email && m.phoneNumber === phoneNumber);
    if (!exactMatch && email && phoneNumber) {
      await pool.execute(
        "INSERT INTO Contact (email, phoneNumber, linkedId, linkPrecedence, createdAt, updatedAt) VALUES (?, ?, ?, 'secondary', NOW(), NOW())",
        [email, phoneNumber, rootPrimary.id]
      );
    }

    // 5. Consolidated Response: Fetch everything linked to the rootPrimary
    const [allRelated]: any = await pool.execute(
      'SELECT * FROM Contact WHERE id = ? OR linkedId = ? ORDER BY createdAt ASC',
      [rootPrimary.id, rootPrimary.id]
    );

    return res.json({
      contact: {
        primaryContatctId: rootPrimary.id,
        emails: [...new Set(allRelated.map((c: any) => c.email).filter(Boolean))],
        phoneNumbers: [...new Set(allRelated.map((c: any) => c.phoneNumber).filter(Boolean))],
        secondaryContactIds: allRelated
          .filter((c: any) => c.linkPrecedence === 'secondary')
          .map((c: any) => c.id)
      }
    });
  } catch (error: any) {
    console.error("Database Error:", error.message);
    return res.status(500).json({ error: error.message });
  }
};