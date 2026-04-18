import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import path from 'node:path';
dotenv.config();
import postRouter from './routes/post.route.js';
import authRouter from './routes/auth.route.js';
import profileRouter from './routes/profile.route.js';
import bidRouter from './routes/bid.route.js';
import commentRouter from './routes/comment.route.js';
import adminRouter from './routes/admin.route.js';
import keyRouter from './routes/key.route.js';
import messageRouter from './routes/message.route.js';
import connectDB from './lib/connectDB.js';




const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));
const PORT = process.env.PORT || 3000;

// Correct variable name, should be 'test' not 'text'
// console.log('Text from .env:', process.env.test);  // Logs the value of 'test' from the .env file


// app.get("/test", (req, res) => {

//     res.status(200).send("It works!");
// });

app.use('/posts', postRouter);
app.use('/auth', authRouter);
app.use('/profiles', profileRouter);
app.use('/bids', bidRouter);
app.use('/comments', commentRouter);
app.use('/admin', adminRouter);
app.use('/keys', keyRouter);
app.use('/messages', messageRouter);

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});


const startServer = async () => {
    await connectDB();
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
};

startServer();
