import { Router, Request, Response } from 'express';
import { tables } from '../db';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  const classrooms = tables.classrooms.all();
  res.json({ code: 0, data: classrooms });
});

router.get('/:id', (req: Request, res: Response) => {
  const classroom = tables.classrooms.get(Number(req.params.id));
  if (!classroom) {
    return res.json({ code: 404, message: '教室不存在' });
  }
  res.json({ code: 0, data: classroom });
});

router.post('/', (req: Request, res: Response) => {
  const { name, capacity, equipment } = req.body;
  if (!name || capacity === undefined) {
    return res.json({ code: 400, message: '缺少必要参数' });
  }
  const classroom = tables.classrooms.insert({ name, capacity: Number(capacity), equipment });
  res.json({ code: 0, data: { id: classroom.id } });
});

router.put('/:id', (req: Request, res: Response) => {
  const { name, capacity, equipment } = req.body;
  tables.classrooms.update(Number(req.params.id), { name, capacity: Number(capacity), equipment });
  res.json({ code: 0, message: '更新成功' });
});

router.delete('/:id', (req: Request, res: Response) => {
  const scheduleCount = tables.schedules.count((s) => s.classroom_id === Number(req.params.id));
  if (scheduleCount > 0) {
    return res.json({ code: 400, message: '该教室已有排课记录，无法删除' });
  }
  tables.classrooms.delete(Number(req.params.id));
  res.json({ code: 0, message: '删除成功' });
});

export default router;
