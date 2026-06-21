import { Router, Request, Response } from 'express';
import { tables } from '../db';
import dayjs from 'dayjs';

const router = Router();

function joinPayment(p: any) {
  const teacher = tables.teachers.get(p.teacher_id);
  const schedule = tables.schedules.get(p.schedule_id);
  const course = schedule ? tables.courses.get(schedule.course_id) : undefined;
  return {
    ...p,
    teacher_name: teacher?.name,
    teacher_phone: teacher?.phone,
    course_id: schedule?.course_id,
    schedule_date: schedule?.date,
    start_time: schedule?.start_time,
    end_time: schedule?.end_time,
    course_name: course?.name,
  };
}

router.get('/', (req: Request, res: Response) => {
  const { teacher_id, status, start_date, end_date } = req.query;
  const payments = tables.teacher_payments.all((p) => {
    let ok = true;
    if (teacher_id) ok = ok && p.teacher_id === Number(teacher_id);
    if (status) ok = ok && p.status === status;
    if (start_date || end_date) {
      const schedule = tables.schedules.get(p.schedule_id);
      if (!schedule) return false;
      if (start_date) ok = ok && schedule.date >= start_date;
      if (end_date) ok = ok && schedule.date <= end_date;
    }
    return ok;
  });
  res.json({ code: 0, data: payments.map(joinPayment) });
});

router.get('/summary', (req: Request, res: Response) => {
  const { teacher_id, start_date, end_date } = req.query;
  const teachers = tables.teachers.all();

  const summary = teachers.map((t) => {
    const payments = tables.teacher_payments.all((p) => {
      let ok = p.teacher_id === t.id;
      if (start_date || end_date) {
        const schedule = tables.schedules.get(p.schedule_id);
        if (!schedule) return false;
        if (start_date) ok = ok && schedule.date >= start_date;
        if (end_date) ok = ok && schedule.date <= end_date;
      }
      return ok;
    });

    return {
      teacher_id: t.id,
      teacher_name: t.name,
      phone: t.phone,
      class_count: payments.length,
      total_hours: payments.reduce((s, p) => s + p.hours, 0),
      total_amount: payments.reduce((s, p) => s + p.amount, 0),
      pending_amount: payments.filter((p) => p.status === 'pending').reduce((s, p) => s + p.amount, 0),
      paid_amount: payments.filter((p) => p.status === 'paid').reduce((s, p) => s + p.amount, 0),
    };
  });

  summary.sort((a, b) => b.total_amount - a.total_amount);
  res.json({ code: 0, data: summary });
});

router.post('/:id/pay', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const payment = tables.teacher_payments.get(id);
  if (!payment) {
    return res.json({ code: 404, message: '课酬记录不存在' });
  }
  tables.teacher_payments.update(id, { status: 'paid', paid_date: dayjs().format('YYYY-MM-DD HH:mm:ss') });
  res.json({ code: 0, message: '已标记为已发放' });
});

router.post('/bulk-pay', (req: Request, res: Response) => {
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.json({ code: 400, message: '请选择要发放的课酬记录' });
  }
  for (const id of ids) {
    const p = tables.teacher_payments.get(Number(id));
    if (p && p.status === 'pending') {
      tables.teacher_payments.update(Number(id), { status: 'paid', paid_date: dayjs().format('YYYY-MM-DD HH:mm:ss') });
    }
  }
  res.json({ code: 0, message: '批量发放成功' });
});

export default router;
