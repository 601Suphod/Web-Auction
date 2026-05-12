import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import { initSocket } from './socket.js';
import { seedData } from './data/seed.js';
import apiRoutes from './routes/apiRoutes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config();

const app = express();
const frontendOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:3000';

app.use(cors({ origin: frontendOrigin, credentials: true }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

app.use('/api', apiRoutes);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'เกิดข้อผิดพลาดภายในระบบ' });
});

const PORT = process.env.PORT || 5000;
const httpServer = createServer(app);
initSocket(httpServer, frontendOrigin);

connectDB()
  .then(async () => {
    await seedData();
    httpServer.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Failed to connect database', error);
    process.exit(1);
  });

export default app;
