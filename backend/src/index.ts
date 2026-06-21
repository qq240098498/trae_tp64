import express from 'express';
import cors from 'cors';
import path from 'path';
import { initDatabase } from './db';

import coursesRouter from './routes/courses';
import teachersRouter from './routes/teachers';
import classroomsRouter from './routes/classrooms';
import schedulesRouter from './routes/schedules';
import studentsRouter from './routes/students';
import enrollmentsRouter from './routes/enrollments';
import attendancesRouter from './routes/attendances';
import paymentsRouter from './routes/payments';
import materialsRouter from './routes/materials';
import materialUsagesRouter from './routes/material_usages';
import studentWorksRouter from './routes/student_works';
import makeupSchedulesRouter from './routes/makeup_schedules';

const app = express();
const PORT = 3002;

initDatabase();

app.use(cors());
app.use(express.json());
app.use('/api', (req, res, next) => {
  const originalSend = res.send.bind(res);
  res.send = (body: any) => {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.originalUrl} -> ${res.statusCode}`);
    return originalSend(body);
  };
  next();
});

app.use('/api/courses', coursesRouter);
app.use('/api/teachers', teachersRouter);
app.use('/api/classrooms', classroomsRouter);
app.use('/api/schedules', schedulesRouter);
app.use('/api/students', studentsRouter);
app.use('/api/enrollments', enrollmentsRouter);
app.use('/api/attendances', attendancesRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/materials', materialsRouter);
app.use('/api/material-usages', materialUsagesRouter);
app.use('/api/student-works', studentWorksRouter);
app.use('/api/makeup-schedules', makeupSchedulesRouter);

app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.get('/api/health', (req, res) => {
  res.json({ code: 0, message: '服务器运行正常' });
});

app.listen(PORT, () => {
  console.log(`后端服务已启动: http://localhost:${PORT}`);
});
