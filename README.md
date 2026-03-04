# Bitespeed Backend Task: Identity Reconciliation

A REST API built with Node.js and TypeScript to consolidate user contact information across different purchases, ensuring a unified customer identity.

## 🚀 Live Demo
**Endpoint:** `https://bitespeed-backend-task-dczz.onrender.com/identify`

## 🛠️ Tech Stack
- **Runtime:** Node.js
- **Language:** TypeScript
- **Database:** MySQL (Hosted on Aiven)
- **Deployment:** Render
- **ORM/Drivers:** `mysql2/promise`

## 📌 Problem Statement
The goal is to link different "orders" (contacts) together if they share the same email or phone number. 
- The oldest contact remains **primary**.
- Newer contacts with overlapping info become **secondary** and point to the primary via `linkedId`.

## ⚙️ Project Structure
- `/src`: TypeScript source files.
- `/dist`: Compiled JavaScript files (used for production deployment).

## 🚦 How to Test
You can test the identity reconciliation using the following `curl` command in your terminal:

```bash
curl -X POST [https://bitespeed-backend-task-dczz.onrender.com/identify](https://bitespeed-backend-task-dczz.onrender.com/identify) \
-H "Content-Type: application/json" \
-d '{"email": "mieri@bitespeed.com", "phoneNumber": "123456"}'
