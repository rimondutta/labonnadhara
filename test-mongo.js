const dns = require("dns");

dns.setServers([
    "1.1.1.1",
    "8.8.8.8",
]);

const mongoose = require("mongoose");

require("dotenv").config();

async function test() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);

        console.log("✅ Connected!");

        await mongoose.connection.db.admin().ping();
        console.log("✅ MongoDB ping successful!");

        await mongoose.disconnect();
        process.exit(0);
    } catch (err) {
        console.error("❌ MongoDB connection error:");
        console.error(err);
        process.exit(1);
    }
}

test();