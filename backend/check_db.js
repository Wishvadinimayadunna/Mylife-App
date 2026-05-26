const mongoose = require('mongoose');
const { PeriodRecord } = require('./models/HealthRecord');

async function checkDb() {
  try {
    // Read MONGODB_URI from environment or fallback
    require('dotenv').config();
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/mylife';
    console.log('Connecting to DB at:', uri);
    await mongoose.connect(uri);
    console.log('Connected successfully!');
    const records = await PeriodRecord.find({});
    console.log('Total period records in database:', records.length);
    console.log('All Period Records:', JSON.stringify(records, null, 2));
  } catch (error) {
    console.error('Error querying DB:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkDb();
