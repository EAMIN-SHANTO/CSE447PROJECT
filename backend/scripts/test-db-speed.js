import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const test = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/cse447");
        console.log("Connected");
        
        const Post = mongoose.model('Post', new mongoose.Schema({}, { strict: false }));
        
        console.time("db fetch");
        const posts = await Post.find({});
        console.timeEnd("db fetch");
        console.log(`Total posts: ${posts.length}`);
        
    } catch(e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
test();
