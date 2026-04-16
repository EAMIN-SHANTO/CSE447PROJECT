import connectDB from './lib/connectDB.js';

async function testConnection() {
  try {
    await connectDB();
    console.log("✓ Database connection test passed!");
    process.exit(0);
  } catch (err) {
    console.log("✗ Database connection test failed:", err.message);
    process.exit(1);
  }
}

testConnection();
