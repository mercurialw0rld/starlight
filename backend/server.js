import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from './db/db.js';
import authRoutes from './routes/auth.js';
import chatRoutes from './routes/chat.js';
import documentRoutes from './routes/document.js';
import protect from './middleware/authMiddleware.js';
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/documents', protect, documentRoutes);
app.use('/api/chat', protect, chatRoutes);

pool.connect((err, client, release) =>  {
  if (err) {
    return console.error('Error acquiring client', err.stack);
    }
    console.log('Database connected successfully');
    client.release();
  }
);

app.get('/api/protected', protect, (req, res) => {
    res.json({
        message: `Hello user with ID: ${req.user.id}! This is a protected resource.`
    });
});


app.get('/', (req, res) => {
  res.send('Starlight Backend is running');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});