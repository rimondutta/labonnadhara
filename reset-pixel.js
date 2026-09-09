const mongoose = require('mongoose');

require('dotenv').config({ path: './.env' });

async function resetPixel() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  await db.collection('settings').updateOne(
    { key: 'global' },
    {
      $set: {
        'facebookPixel.pixelId': '',
        'facebookPixel.enabled': false,
        'facebookPixel.testEventCode': ''
      }
    }
  );

  console.log('Pixel reset in DB');
  process.exit(0);
}

resetPixel();





