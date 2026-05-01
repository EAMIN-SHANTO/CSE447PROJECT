import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./models/user.model.js";
dotenv.config();

const fix = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const emailHash = (await import("crypto")).createHash("sha256").update("md.eamin@g.bracu.ac.bd").digest("hex");
        const user = await User.findOne({ emailHash });
        if (user) {
            user.twoFactor.totpEnabled = false;
            user.twoFactor.totpSecretEncrypted = null;
            user.twoFactor.totpPendingSecretEncrypted = null;
            await user.save();
            console.log("Fixed! TOTP is now completely reset for md.eamin@g.bracu.ac.bd");
        } else {
            console.log("User not found.");
        }
    } catch(e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
fix();
