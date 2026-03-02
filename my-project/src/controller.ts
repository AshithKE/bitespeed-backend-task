import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import mysql from 'mysql2/promise';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

const pool = mysql.createPool({
  host: '127.0.0.1',
  user: 'root',
  password: '', 
  database: 'bitespeed_db', 
  port: 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // These three lines solve most "hanging" connection issues on Windows
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  connectTimeout: 20000 
});

const adapter = new PrismaMariaDb(pool as any);
const prisma = new PrismaClient({ adapter });

// DO NOT redefine pool, adapter, or prisma below this line!

export const identifyContact = async (req: Request, res: Response): Promise<any> => {
  try {
      // Your logic starts here...
    const { email, phoneNumber } = req.body;
    const phoneStr = phoneNumber ? String(phoneNumber) : null;

    if (!email && !phoneStr) {
      return res.status(400).json({ error: "Email or phoneNumber required" });
    }

    // 1. Fetch matched contacts
    const matchedContacts = await prisma.contact.findMany({
      where: {
        OR: [
          { email: email || undefined },
          { phoneNumber: phoneStr || undefined }
        ],
      },
    });

    // 2. Scenario: No existing contacts -> Create new Primary
    if (matchedContacts.length === 0) {
      const newPrimary = await prisma.contact.create({
        data: { 
            email, 
            phoneNumber: phoneStr, 
            linkPrecedence: "primary" 
        },
      });
      return res.status(200).json({
        contact: {
          primaryContatctId: newPrimary.id,
          emails: [newPrimary.email].filter((e): e is string => e !== null),
          phoneNumbers: [newPrimary.phoneNumber].filter((p): p is string => p !== null),
          secondaryContactIds: [],
        },
      });
    }

    // 3. Find full identity cluster
    const primaryIds = new Set(
      matchedContacts.map((c) => c.linkedId || c.id)
    );

    const allRelatedContacts = await prisma.contact.findMany({
      where: {
        OR: [
          { id: { in: Array.from(primaryIds) } },
          { linkedId: { in: Array.from(primaryIds) } },
        ],
      },
    });

    // Determine oldest primary
    const sortedPrimaries = allRelatedContacts
      .filter((c) => c.linkPrecedence === "primary")
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    const primaryContact = sortedPrimaries[0];

    // 4. Scenario: Merge Primaries
    if (sortedPrimaries.length > 1) {
      const otherPrimaries = sortedPrimaries.slice(1);
      for (const p of otherPrimaries) {
        await prisma.contact.update({
          where: { id: p.id },
          data: { linkPrecedence: "secondary", linkedId: primaryContact.id },
        });
        await prisma.contact.updateMany({
          where: { linkedId: p.id },
          data: { linkedId: primaryContact.id },
        });
      }
    }

    // 5. Scenario: Create new Secondary
    const emailExists = allRelatedContacts.some((c) => c.email === email);
    const phoneExists = allRelatedContacts.some((c) => c.phoneNumber === phoneStr);

    if ((email && !emailExists) || (phoneStr && !phoneExists)) {
      await prisma.contact.create({
        data: {
          email,
          phoneNumber: phoneStr,
          linkPrecedence: "secondary",
          linkedId: primaryContact.id,
        },
      });
    }

    // 6. Consolidate for response
    const finalContacts = await prisma.contact.findMany({
      where: {
        OR: [{ id: primaryContact.id }, { linkedId: primaryContact.id }],
      },
    });

    const emails = Array.from(new Set([
        primaryContact.email,
        ...finalContacts.map((c) => c.email)
    ])).filter((e): e is string => e !== null);

    const phoneNumbers = Array.from(new Set([
        primaryContact.phoneNumber,
        ...finalContacts.map((c) => c.phoneNumber)
    ])).filter((p): p is string => p !== null);

    const secondaryContactIds = finalContacts
      .filter((c) => c.id !== primaryContact.id)
      .map((c) => c.id);

    return res.status(200).json({
      contact: {
        primaryContatctId: primaryContact.id,
        emails,
        phoneNumbers,
        secondaryContactIds,
      },
    });

  } catch (error: any) {
    // THIS LINE IS THE MOST IMPORTANT:
    console.error("DEBUGGER - THE REAL ERROR IS:", error.message || error);
    
    return res.status(500).json({ 
      error: "Internal server error",
      details: error.message // Temporarily send the error to the curl response too
    });
  }
};
