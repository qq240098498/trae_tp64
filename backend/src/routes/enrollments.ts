import { Router, Request, Response } from 'express';
import { tables } from '../db';
import dayjs from 'dayjs';

const router = Router();

function joinEnrollment(e: any) {
  const student = tables.students.get(e.student_id);
  const course = tables.courses.get(e.course_id);
  return {
    ...e,
    student_name: student?.name,
    student_phone: student?.phone,
    course_name: course?.name,
    course_category: course?.category,
    course_mode: course?.mode,
    course_price: course?.price,
  };
}

router.get('/', (req: Request, res: Response) => {
  const { student_id, course_id, status } = req.query;
  const enrollments = tables.enrollments.all((e) => {
    let ok = true;
    if (student_id) ok = ok && e.student_id === Number(student_id);
    if (course_id) ok = ok && e.course_id === Number(course_id);
    if (status) ok = ok && e.status === status;
    return ok;
  });
  res.json({ code: 0, data: enrollments.map(joinEnrollment) });
});

router.get('/:id', (req: Request, res: Response) => {
  const enrollment = tables.enrollments.get(Number(req.params.id));
  if (!enrollment) {
    return res.json({ code: 404, message: '报名记录不存在' });
  }
  res.json({ code: 0, data: joinEnrollment(enrollment) });
});

router.post('/', (req: Request, res: Response) => {
  const { student_id, course_id, enroll_mode, paid_amount } = req.body;
  if (!student_id || !course_id || !enroll_mode) {
    return res.json({ code: 400, message: '缺少必要参数' });
  }

  const course = tables.courses.get(Number(course_id));
  if (!course) {
    return res.json({ code: 404, message: '课程不存在' });
  }

  let remaining_sessions = 0;
  let total_sessions = 0;
  let semester_start_date: string | undefined;
  let semester_end_date: string | undefined;

  if (enroll_mode === 'single') {
    remaining_sessions = course.single_count || 1;
    total_sessions = course.single_count || 1;
  } else {
    const weeks = course.semester_weeks || 12;
    total_sessions = weeks;
    remaining_sessions = weeks;
    semester_start_date = dayjs().format('YYYY-MM-DD');
    semester_end_date = dayjs().add(weeks, 'week').format('YYYY-MM-DD');
  }

  const finalPaid = paid_amount !== undefined ? Number(paid_amount) : course.price;

  const enrollment = tables.enrollments.insert({
    student_id: Number(student_id),
    course_id: Number(course_id),
    enroll_mode,
    remaining_sessions,
    total_sessions,
    semester_start_date,
    semester_end_date,
    paid_amount: finalPaid,
  });

  res.json({ code: 0, data: { id: enrollment.id } });
});

router.put('/:id', (req: Request, res: Response) => {
  const { remaining_sessions, status } = req.body;
  const data: any = {};
  if (remaining_sessions !== undefined) data.remaining_sessions = Number(remaining_sessions);
  if (status !== undefined) data.status = status;
  tables.enrollments.update(Number(req.params.id), data);
  res.json({ code: 0, message: '更新成功' });
});

router.delete('/:id', (req: Request, res: Response) => {
  const attendanceCount = tables.attendances.count((a) => a.enrollment_id === Number(req.params.id));
  if (attendanceCount > 0) {
    return res.json({ code: 400, message: '该报名已有签到记录，无法删除' });
  }
  tables.enrollments.delete(Number(req.params.id));
  res.json({ code: 0, message: '删除成功' });
});

export default router;
