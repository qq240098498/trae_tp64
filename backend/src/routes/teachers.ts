import { Router, Request, Response } from 'express';
import { tables } from '../db';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  const teachers = tables.teachers.all();
  res.json({ code: 0, data: teachers });
});

router.get('/:id', (req: Request, res: Response) => {
  const teacher = tables.teachers.get(Number(req.params.id));
  if (!teacher) {
    return res.json({ code: 404, message: '老师不存在' });
  }
  res.json({ code: 0, data: teacher });
});

router.post('/', (req: Request, res: Response) => {
  const { name, phone, hourly_rate, specialty } = req.body;
  if (!name || hourly_rate === undefined) {
    return res.json({ code: 400, message: '缺少必要参数' });
  }
  const teacher = tables.teachers.insert({ name, phone, hourly_rate: Number(hourly_rate), specialty });
  res.json({ code: 0, data: { id: teacher.id } });
});

router.put('/:id', (req: Request, res: Response) => {
  const { name, phone, hourly_rate, specialty } = req.body;
  tables.teachers.update(Number(req.params.id), { name, phone, hourly_rate: Number(hourly_rate), specialty });
  res.json({ code: 0, message: '更新成功' });
});

router.delete('/:id', (req: Request, res: Response) => {
  const scheduleCount = tables.schedules.count((s) => s.teacher_id === Number(req.params.id));
  if (scheduleCount > 0) {
    return res.json({ code: 400, message: '该老师已有排课记录，无法删除' });
  }
  tables.teachers.delete(Number(req.params.id));
  res.json({ code: 0, message: '删除成功' });
});

export default router;
