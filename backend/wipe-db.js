import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const wipeDatabase = async () => {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected successfully.");

    console.log("Wiping all collections...");
    
    // Get all collections
    const collections = await mongoose.connection.db.collections();

    // Drop each collection
    for (let collection of collections) {
      await collection.drop();
      console.log(`Dropped collection: ${collection.collectionName}`);
    }

    console.log("✅ Database has been completely wiped and is ready for a fresh start!");
  } catch (error) {
    console.error("Error wiping database:", error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
};

wipeDatabase();
