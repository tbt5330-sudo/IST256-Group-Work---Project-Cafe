// server.js - Node.js backend for the Billing and Returns pages
// Setup:  npm init -y   then   npm install express
// Run:    node server.js   then open http://localhost:3000/index.html

const express = require('express');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = 3000;

const BILLING_FILE = path.join(__dirname, 'billing-data.json');
const RETURNS_FILE = path.join(__dirname, 'returns-data.json');

app.use(express.json());
app.use(express.static(__dirname)); // serves the HTML, CSS and JS files in this folder

// ---------- helpers ----------
async function readRecords(file) {
  try {
    const text = await fs.readFile(file, 'utf8');
    return JSON.parse(text);
  } catch (err) {
    return []; // file missing or empty: start fresh
  }
}

async function saveRecord(file, record) {
  const records = await readRecords(file);
  records.push(record);
  await fs.writeFile(file, JSON.stringify(records, null, 2));
}

function isBlank(value) {
  return typeof value !== 'string' || value.trim() === '';
}

// ---------- POST /api/billing ----------
app.post('/api/billing', async (req, res) => {
  const { fullName, address, cardNumber, expiry, cvv, orderSummary } = req.body;
  const errors = [];

  if (isBlank(fullName)) errors.push('Full name is required.');
  if (isBlank(address)) errors.push('Address is required.');

  const digits = String(cardNumber || '').replace(/\s|-/g, '');
  if (!/^\d{13,19}$/.test(digits)) errors.push('Card number must be 13 to 19 digits.');
  if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(String(expiry || ''))) errors.push('Expiration date must be MM/YY.');
  if (!/^\d{3,4}$/.test(String(cvv || ''))) errors.push('Security code must be 3 or 4 digits.');

  if (errors.length > 0) {
    return res.status(400).json({ success: false, errors });
  }

  // Never store the full card number or the security code.
  const record = {
    id: Date.now(),
    name: fullName.trim(),
    address: address.trim(),
    paymentMethod: 'Card ending in ' + digits.slice(-4),
    orderSummary: orderSummary || null,
    receivedAt: new Date().toISOString()
  };

  try {
    await saveRecord(BILLING_FILE, record);
    res.status(201).json({ success: true, message: 'Billing details received.', orderId: record.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, errors: ['Server error saving billing details.'] });
  }
});

// ---------- POST /api/returns ----------
app.post('/api/returns', async (req, res) => {
  const { items, reason, condition } = req.body;
  const errors = [];

  if (!Array.isArray(items) || items.length === 0) errors.push('Select at least one product to return.');
  if (isBlank(reason)) errors.push('A reason for the return is required.');
  if (isBlank(condition)) errors.push('Product condition is required.');

  if (errors.length > 0) {
    return res.status(400).json({ success: false, errors });
  }

  const record = {
    id: Date.now(),
    items: items,
    reason: reason.trim(),
    condition: condition.trim(),
    receivedAt: new Date().toISOString()
  };

  try {
    await saveRecord(RETURNS_FILE, record);
    res.status(201).json({ success: true, message: 'Return request received.', returnId: record.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, errors: ['Server error saving return request.'] });
  }
});

app.listen(PORT, () => {
  console.log('Server running at http://localhost:' + PORT);
});
