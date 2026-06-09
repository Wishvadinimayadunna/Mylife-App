const mongoose = require("mongoose");
const FinanceTransaction = require("./models/FinanceTransaction");
const User = require("./models/User");

async function run() {
  try {
    require("dotenv").config({ path: "./backend/.env" });
    const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/mylife";
    console.log("Connecting to DB:", uri);
    await mongoose.connect(uri);
    
    const users = await User.find({});
    console.log("Users in DB:", users.map(u => ({ id: u._id, email: u.email, fullName: u.fullName })));

    const txs = await FinanceTransaction.find({});
    console.log("Total Transactions in DB:", txs.length);
    console.log("Transactions details:", JSON.stringify(txs, null, 2));

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
