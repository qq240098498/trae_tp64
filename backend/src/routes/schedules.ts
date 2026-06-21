import { Router, Request, Response } from 'express';
import { tables } from '../db';
import dayjs from 'dayjs';

const router = Router();

function calculateHours(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  return Math.round(((eh * 60 + em) - (sh * 60 + sm)) / 60 * 100) / 100;
}

function joinSchedule(s: any) {
  const course = tables.courses.get(s.course_id);
  const teacher = tables.teachers.get(s.teacher_id);
  const classroom = tables.classrooms.get(s.classroom_id);
  const enrolledCount = tables.attendances.count((a) => a.schedule_id === s.id);
  return {
    ...s,
    course_name: course?.name,
    course_category: course?.category,
    course_mode: course?.mode,
    teacher_name: teacher?.name,
    hourly_rate: teacher?.hourly_rate,
    classroom_name: classroom?.name,
    classroom_capacity: classroom?.capacity,
    enrolled_count: enrolledCount,
  };
}

function hasTimeConflict(schedules: any[], classroom_id: number, teacher_id: number, date: string, start_time: string, end_time: string, excludeId?: number): { classroomConflict: boolean; teacherConflict: boolean } {
  let classroomConflict = false;
  let teacherConflict = false;

  for (const s of schedules) {
    if (excludeId && s.id === excludeId) continue;
    if (s.status === 'cancelled') continue;
    if (s.date !== date) continue;

    const overlap =
      (start_time <= s.start_time && end_time > s.start_time) ||
      (start_time < s.end_time && end_time >= s.end_time) ||
      (start_time >= s.start_time && end_time <= s.end_time);

    if (!overlap) continue;

    if (s.classroom_id === classroom_id) classroomConflict = true;
    if (s.teacher_id === teacher_id) teacherConflict = true;
  }

  return { classroomConflict, teacherConflict };
}

router.get('/', (req: Request, res: Response) => {
  const { date, course_id, teacher_id, classroom_id, start_date, end_date } = req.query;
  const schedules = tables.schedules.all((s) => {
    let ok = true;
    if (date) ok = ok && s.date === date;
    if (start_date) ok = ok && s.date >= start_date;
    if (end_date) ok = ok && s.date <= end_date;
    if (course_id) ok = ok && s.course_id === Number(course_id);
    if (teacher_id) ok = ok && s.teacher_id === Number(teacher_id);
    if (classroom_id) ok = ok && s.classroom_id === Number(classroom_id);
    return ok;
  });
  const result = schedules.map(joinSchedule);
  result.sort((a: any, b: any) => (a.date < b.date ? 1 : a.date > b.date ? -1 : (a.start_time < b.start_time ? -1 : 1)));
  res.json({ code: 0, data: result });
});

router.get('/:id', (req: Request, res: Response) => {
  const schedule = tables.schedules.get(Number(req.params.id));
  if (!schedule) {
    return res.json({ code: 404, message: '排课不存在' });
  }
  res.json({ code: 0, data: joinSchedule(schedule) });
});

router.post('/', (req: Request, res: Response) => {
  const { course_id, teacher_id, classroom_id, date, start_time, end_time, max_students } = req.body;
  if (!course_id || !teacher_id || !classroom_id || !date || !start_time || !end_time) {
    return res.json({ code: 400, message: '缺少必要参数' });
  }

  const allSchedules = tables.schedules.all();
  const { classroomConflict, teacherConflict } = hasTimeConflict(
    allSchedules,
    Number(classroom_id),
    Number(teacher_id),
    date,
    start_time,
    end_time
  );

  if (classroomConflict) {
    return res.json({ code: 400, message: '该教室在此时段已有排课' });
  }
  if (teacherConflict) {
    return res.json({ code: 400, message: '该老师在此时段已有排课' });
  }

  const classroom = tables.classrooms.get(Number(classroom_id));
  const finalMaxStudents = Math.min(Number(max_students) || 10, classroom?.capacity || 10);

  const schedule = tables.schedules.insert({
    course_id: Number(course_id),
    teacher_id: Number(teacher_id),
    classroom_id: Number(classroom_id),
    date,
    start_time,
    end_time,
    max_students: finalMaxStudents,
  });

  res.json({ code: 0, data: { id: schedule.id } });
});

router.put('/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { course_id, teacher_id, classroom_id, date, start_time, end_time, max_students, status } = req.body;

  const allSchedules = tables.schedules.all();
  if (classroom_id !== undefined && teacher_id !== undefined && date && start_time && end_time) {
    const { classroomConflict, teacherConflict } = hasTimeConflict(
      allSchedules,
      Number(classroom_id),
      Number(teacher_id),
      date,
      start_time,
      end_time,
      id
    );
    if (classroomConflict) {
      return res.json({ code: 400, message: '该教室在此时段已有排课' });
    }
    if (teacherConflict) {
      return res.json({ code: 400, message: '该老师在此时段已有排课' });
    }
  }

  const data: any = {};
  if (course_id !== undefined) data.course_id = Number(course_id);
  if (teacher_id !== undefined) data.teacher_id = Number(teacher_id);
  if (classroom_id !== undefined) data.classroom_id = Number(classroom_id);
  if (date !== undefined) data.date = date;
  if (start_time !== undefined) data.start_time = start_time;
  if (end_time !== undefined) data.end_time = end_time;
  if (max_students !== undefined) data.max_students = Number(max_students);
  if (status !== undefined) data.status = status;

  tables.schedules.update(id, data);
  res.json({ code: 0, message: '更新成功' });
});

router.delete('/:id', (req: Request, res: Response) => {
  const attendanceCount = tables.attendances.count((a) => a.schedule_id === Number(req.params.id));
  if (attendanceCount > 0) {
    return res.json({ code: 400, message: '该课程已有签到记录，无法删除，可改为取消状态' });
  }
  tables.schedules.delete(Number(req.params.id));
  res.json({ code: 0, message: '删除成功' });
});

router.post('/:id/complete', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const schedule = tables.schedules.get(id);
  if (!schedule) {
    return res.json({ code: 404, message: '排课不存在' });
  }
  const teacher = tables.teachers.get(schedule.teacher_id);
  if (!teacher) {
    return res.json({ code: 404, message: '老师不存在' });
  }

  const hours = calculateHours(schedule.start_time, schedule.end_time);
  const amount = Math.round(hours * teacher.hourly_rate * 100) / 100;

  tables.schedules.update(id, { status: 'completed' });

  const existing = tables.teacher_payments.findByTeacherAndSchedule(schedule.teacher_id, id);
  if (!existing) {
    tables.teacher_payments.insert({
      teacher_id: schedule.teacher_id,
      schedule_id: id,
      hours,
      hourly_rate: teacher.hourly_rate,
      amount,
    });
  }

  res.json({ code: 0, message: '课程已完成，课酬已生成' });
});

export default router;
