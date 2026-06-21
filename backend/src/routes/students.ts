import { Router, Request, Response } from 'express';
import { tables } from '../db';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  const { keyword } = req.query;
  let filter: ((s: any) => boolean) | undefined;
  if (keyword) {
    const kw = String(keyword).toLowerCase();
    filter = (s: any) => s.name.toLowerCase().includes(kw) || s.phone.includes(kw);
  }
  const students = tables.students.all(filter);
  res.json({ code: 0, data: students });
});

router.get('/:id', (req: Request, res: Response) => {
  const student = tables.students.get(Number(req.params.id));
  if (!student) {
    return res.json({ code: 404, message: '学员不存在' });
  }
  res.json({ code: 0, data: student });
});

router.post('/', (req: Request, res: Response) => {
  const { name, phone, gender, birthday, note } = req.body;
  if (!name || !phone) {
    return res.json({ code: 400, message: '缺少必要参数' });
  }
  const student = tables.students.insert({ name, phone, gender, birthday, note });
  res.json({ code: 0, data: { id: student.id } });
});

router.put('/:id', (req: Request, res: Response) => {
  const { name, phone, gender, birthday, note } = req.body;
  tables.students.update(Number(req.params.id), { name, phone, gender, birthday, note });
  res.json({ code: 0, message: '更新成功' });
});

router.delete('/:id', (req: Request, res: Response) => {
  const enrollmentCount = tables.enrollments.all((e) => e.student_id === Number(req.params.id)).length;
  if (enrollmentCount > 0) {
    return res.json({ code: 400, message: '该学员已有报名记录，无法删除' });
  }
  tables.students.delete(Number(req.params.id));
  res.json({ code: 0, message: '删除成功' });
});

export default router;
