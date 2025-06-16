import * as crypto from 'crypto';

const payload = {
  ref1: 'INV001',
  ref2: 'ORDER001',
  amount: '100.00',
  status: 'SUCCESS',
  transactionId: 'SCB1234567890',
};

const secret = '6cebf1c81b554c3c9cd4592c6c5604f9'; // 👈 จาก .env หรือ SCB Portal

const signature = crypto
  .createHmac('sha256', secret)
  .update(JSON.stringify(payload))
  .digest('hex');

console.log('Generated Signature:', signature);
