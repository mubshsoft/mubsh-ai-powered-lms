import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url';
import connectDB from './config/db.js';
import errorHandler from './middleware/errorHandler.js';

import authRoutes from './routes/authRoutes.js'
import documentRoutes from './routes/docuemntRoutes.js'
import flashcardRoutes from './routes/flashcardRoutes.js'
import aiRoutes from './routes/aiRoutes.js'
import quizRoutes from './routes/quizRoutes.js'
import progressRoutes from './routes/progressRoutes.js'
import upload from './config/multer.js'


//ES6 module__dirname alternative
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


//initialize express app
const app = express();

//connect to MongoDb database
connectDB();


//Middleware to handle CORS
app.use(cors({
    origin:"*",
    methods:["GET","POST","PUT","DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
})
);

app.use(express.json());
app.use(express.urlencoded({extended:true}));


//static folder for uploads

app.use("/uploads", express.static(path.join(__dirname, 'uploads')));


// 👉 ADD HERE
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: '🚀 LMS AI Backend APIs are live and running!',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});
//Routes




// Routes here
// app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/flashcards', flashcardRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/progress',progressRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    status: 404,
  });
});



// Error handler (LAST)
app.use(errorHandler);


//start server

const PORT = process.env.PORT || 5000;
app.listen(PORT, ()=>{
    console.log(`server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

process.on('unhandledRejection', (err)=>{
    console.log(`Error: ${err.message}`);
    process.exit(1);
});