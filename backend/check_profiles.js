const mongoose = require("mongoose");
const Profile = require("./models/Profile");
const User = require("./models/User");

async function run() {
  try {
    require("dotenv").config({ path: "./backend/.env" });
    const uri = process.env.MONGODB_URI;
    console.log("Connecting to DB:", uri);
    await mongoose.connect(uri);
    
    const profiles = await Profile.find({});
    console.log("Total Profiles in DB:", profiles.length);
    for (const p of profiles) {
      const user = await User.findById(p.userId);
      console.log(`Profile Name: "${p.fullName}", User Email: "${user ? user.email : 'Unknown'}", User ID: ${p.userId}`);
    }

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
