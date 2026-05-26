const mongoose = require('mongoose');
const { PeriodRecord } = require('./backend/models/HealthRecord');

async function checkDb() {
  try {
    await mongoose.connect('mongodb://localhost:27017/mylife');
    console.log('Connected to DB');
    const records = await PeriodRecord.find({});
    console.log('All Period Records in DB:', JSON.stringify(records, null, 2));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkDb();
