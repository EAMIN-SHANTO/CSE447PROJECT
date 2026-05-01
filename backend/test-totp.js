import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./models/user.model.js";
dotenv.config();

const test = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const user = await User.findOne({ pseudonym: "admin_0a86e0c5" });
        console.log("totpSecretEncrypted:", user.twoFactor.totpSecretEncrypted);
    } catch(e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
test();
