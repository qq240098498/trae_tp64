import { Router, Request, Response } from 'express';
import { tables } from '../db';
import dayjs from 'dayjs';

const router = Router();

function joinAttendance(a: any) {
  const enrollment = tables.enrollments.get(a.enrollment_id);
  const schedule = tables.schedules.get(a.schedule_id);
  const student = enrollment ? tables.students.get(enrollment.student_id) : undefined;
  const course = enrollment ? tables.courses.get(enrollment.course_id) : undefined;
  return {
    ...a,
    enrollment,
    student_id: enrollment?.student_id,
    course_id: enrollment?.course_id,
    enroll_mode: enrollment?.enroll_mode,
    remaining_sessions: enrollment?.remaining_sessions,
    student_name: student?.name,
    student_phone: student?.phone,
    course_name: course?.name,
    schedule_date: schedule?.date,
    start_time: schedule?.start_time,
    end_time: schedule?.end_time,
  };
}

router.get('/', (req: Request, res: Response) => {
  const { schedule_id, enrollment_id } = req.query;
  const attendances = tables.attendances.all((a) => {
    let ok = true;
    if (schedule_id) ok = ok && a.schedule_id === Number(schedule_id);
    if (enrollment_id) ok = ok && a.enrollment_id === Number(enrollment_id);
    return ok;
  });
  res.json({ code: 0, data: attendances.map(joinAttendance) });
});

router.post('/', (req: Request, res: Response) => {
  const { enrollment_id, schedule_id, status = 'present', note } = req.body;
  if (!enrollment_id || !schedule_id) {
    return res.json({ code: 400, message: '缺少必要参数' });
  }

  const eid = Number(enrollment_id);
  const sid = Number(schedule_id);

  const enrollment = tables.enrollments.get(eid);
  if (!enrollment) {
    return res.json({ code: 404, message: '报名记录不存在' });
  }
  if (enrollment.status !== 'active') {
    return res.json({ code: 400, message: '该报名已失效' });
  }

  const schedule = tables.schedules.get(sid);
  if (!schedule) {
    return res.json({ code: 404, message: '排课不存在' });
  }

  if (schedule.course_id !== enrollment.course_id) {
    return res.json({ code: 400, message: '报名课程与排课课程不匹配' });
  }

  if (enrollment.enroll_mode === 'semester') {
    if (enrollment.semester_end_date && dayjs(schedule.date).isAfter(enrollment.semester_end_date)) {
      tables.enrollments.update(eid, { status: 'expired' });
      return res.json({ code: 400, message: '学期课已过期，过期不补' });
    }
  }

  if (enrollment.enroll_mode === 'single' && enrollment.remaining_sessions <= 0) {
    return res.json({ code: 400, message: '剩余课时不足' });
  }

  const existing = tables.attendances.findByEnrollmentAndSchedule(eid, sid);
  if (existing) {
    return res.json({ code: 400, message: '已签到，不能重复签到' });
  }

  const enrolledCount = tables.attendances.count((a) => a.schedule_id === sid);
  if (enrolledCount >= schedule.max_students) {
    return res.json({ code: 400, message: '该课次人数已满' });
  }

  tables.attendances.insert({
    enrollment_id: eid,
    schedule_id: sid,
    status,
    note,
  });

  if (status === 'present') {
    if (enrollment.enroll_mode === 'single') {
      const newRemaining = enrollment.remaining_sessions - 1;
      const newStatus: any = newRemaining <= 0 ? 'completed' : 'active';
      tables.enrollments.update(eid, { remaining_sessions: newRemaining, status: newStatus });
    } else {
      const newRemaining = enrollment.remaining_sessions - 1;
      tables.enrollments.update(eid, { remaining_sessions: newRemaining });
    }
  }

  res.json({ code: 0, message: '签到成功' });
});

router.put('/:id', (req: Request, res: Response) => {
  const { status, note } = req.body;
  const data: any = {};
  if (status !== undefined) data.status = status;
  if (note !== undefined) data.note = note;
  tables.attendances.update(Number(req.params.id), data);
  res.json({ code: 0, message: '更新成功' });
});

router.delete('/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const attendance = tables.attendances.get(id);
  if (!attendance) {
    return res.json({ code: 404, message: '签到记录不存在' });
  }

  if (attendance.status === 'present') {
    const enrollment = tables.enrollments.get(attendance.enrollment_id);
    if (enrollment) {
      const newRemaining = enrollment.remaining_sessions + 1;
      const newStatus: any = enrollment.status === 'completed' ? 'active' : enrollment.status;
      tables.enrollments.update(attendance.enrollment_id, { remaining_sessions: newRemaining, status: newStatus });
    }
  }

  tables.attendances.delete(id);
  res.json({ code: 0, message: '删除成功，已回滚课时' });
});

export default router;
