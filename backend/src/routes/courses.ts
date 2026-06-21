import { Router, Request, Response } from 'express';
import { tables } from '../db';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  const { category, mode } = req.query;
  let filter: ((c: any) => boolean) | undefined;
  if (category || mode) {
    filter = (c: any) => {
      let ok = true;
      if (category) ok = ok && c.category === category;
      if (mode) ok = ok && c.mode === mode;
      return ok;
    };
  }
  const courses = tables.courses.all(filter);
  res.json({ code: 0, data: courses });
});

router.get('/:id', (req: Request, res: Response) => {
  const course = tables.courses.get(Number(req.params.id));
  if (!course) {
    return res.json({ code: 404, message: '课程不存在' });
  }
  res.json({ code: 0, data: course });
});

router.post('/', (req: Request, res: Response) => {
  const { name, category, mode, price, single_count = 0, semester_weeks = 0, description } = req.body;
  if (!name || !category || !mode || !price) {
    return res.json({ code: 400, message: '缺少必要参数' });
  }
  const course = tables.courses.insert({ name, category, mode, price, single_count, semester_weeks, description });
  res.json({ code: 0, data: { id: course.id } });
});

router.put('/:id', (req: Request, res: Response) => {
  const { name, category, mode, price, single_count, semester_weeks, description } = req.body;
  tables.courses.update(Number(req.params.id), { name, category, mode, price, single_count, semester_weeks, description });
  res.json({ code: 0, message: '更新成功' });
});

router.delete('/:id', (req: Request, res: Response) => {
  const scheduleCount = tables.schedules.count((s) => s.course_id === Number(req.params.id));
  if (scheduleCount > 0) {
    return res.json({ code: 400, message: '该课程已有排课记录，无法删除' });
  }
  tables.courses.delete(Number(req.params.id));
  res.json({ code: 0, message: '删除成功' });
});

export default router;
