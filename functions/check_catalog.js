const admin = require('firebase-admin');
try {
  admin.initializeApp({ projectId: 'wca-tickets-58f6c' });
} catch (err) {}

const db = admin.firestore();
async function check() {
  const snap = await db.collection('settings').doc('catalog').get();
  console.log('EXISTS:', snap.exists);
  if (snap.exists) {
    const data = snap.data();
    console.log('EMAIL_WEBHOOK_URL:', data.emailWebhookUrl);
  } else {
    console.log('Doc does not exist!');
  }
}
check().catch(console.error);
