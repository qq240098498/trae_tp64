import { Router, Request, Response } from 'express';
import { tables, Schedule, Enrollment } from '../db';
import dayjs from 'dayjs';

const router = Router();

function joinMakeupPool(mp: any) {
  const student = tables.students.get(mp.student_id);
  const course = tables.courses.get(mp.course_id);
  const enrollment = tables.enrollments.get(mp.enrollment_id);
  const originalSchedule = tables.schedules.get(mp.original_schedule_id);
  const originalTeacher = originalSchedule ? tables.teachers.get(originalSchedule.teacher_id) : undefined;
  const matches = tables.makeup_matches.findByMakeupPool(mp.id).map(joinMakeupMatch);

  return {
    ...mp,
    student_name: student?.name,
    student_phone: student?.phone,
    course_name: course?.name,
    course_category: course?.category,
    enrollment,
    original_schedule: originalSchedule ? {
      ...originalSchedule,
      teacher_name: originalTeacher?.name,
      classroom_name: originalSchedule ? tables.classrooms.get(originalSchedule.classroom_id)?.name : undefined,
    } : undefined,
    matches,
  };
}

function joinMakeupMatch(mm: any) {
  const schedule = tables.schedules.get(mm.target_schedule_id);
  if (!schedule) return mm;

  const course = tables.courses.get(schedule.course_id);
  const teacher = tables.teachers.get(schedule.teacher_id);
  const classroom = tables.classrooms.get(schedule.classroom_id);
  const enrolledCount = tables.attendances.count((a: any) => a.schedule_id === schedule.id);
  const acceptedMakeupCount = tables.makeup_matches.count(
    (m: any) => m.target_schedule_id === schedule.id && m.status === 'accepted'
  );

  return {
    ...mm,
    target_schedule: {
      ...schedule,
      course_name: course?.name,
      course_category: course?.category,
      teacher_name: teacher?.name,
      classroom_name: classroom?.name,
      enrolled_count: enrolledCount + acceptedMakeupCount,
      available_slots: schedule.max_students - enrolledCount - acceptedMakeupCount,
    },
  };
}

function calculateLessonNumber(schedule: Schedule, enrollment: Enrollment): number {
  if (!enrollment.semester_start_date) return 1;
  const startDate = dayjs(enrollment.semester_start_date);
  const scheduleDate = dayjs(schedule.date);
  const weekDiff = scheduleDate.diff(startDate, 'week');
  return Math.max(1, weekDiff + 1);
}

function calculateMatchScore(
  poolRecord: any,
  targetSchedule: Schedule,
  enrollment: Enrollment,
  originalSchedule: Schedule
): number {
  let score = 0;

  const targetLessonNumber = calculateLessonNumber(targetSchedule, enrollment);
  const lessonDiff = Math.abs(targetLessonNumber - poolRecord.missed_lesson_number);

  if (lessonDiff === 0) score += 50;
  else if (lessonDiff === 1) score += 30;
  else if (lessonDiff === 2) score += 15;
  else if (lessonDiff <= 3) score += 5;
  else score -= 20;

  const today = dayjs();
  const scheduleDate = dayjs(targetSchedule.date);
  const daysUntil = scheduleDate.diff(today, 'day');
  if (daysUntil >= 0 && daysUntil <= 7) score += 20;
  else if (daysUntil <= 14) score += 10;
  else if (daysUntil <= 30) score += 5;

  if (targetSchedule.teacher_id === originalSchedule.teacher_id) score += 10;

  if (enrollment.semester_end_date) {
    if (scheduleDate.isBefore(enrollment.semester_end_date)) score += 10;
    else score -= 50;
  }

  const enrolledCount = tables.attendances.count((a) => a.schedule_id === targetSchedule.id);
  const acceptedMakeupCount = tables.makeup_matches.count(
    (m) => m.target_schedule_id === targetSchedule.id && m.status === 'accepted'
  );
  const availableSlots = targetSchedule.max_students - enrolledCount - acceptedMakeupCount;
  if (availableSlots > 0) score += 10;
  else score -= 30;

  return score;
}

function hasScheduleConflict(studentId: number, targetSchedule: Schedule): boolean {
  const attendances = tables.attendances.all((a) => {
    const enrollment = tables.enrollments.get(a.enrollment_id);
    return enrollment?.student_id === studentId && a.status === 'present';
  });

  for (const att of attendances) {
    const s = tables.schedules.get(att.schedule_id);
    if (s && s.date === targetSchedule.date && s.status !== 'cancelled') {
      const overlap =
        (targetSchedule.start_time <= s.start_time && targetSchedule.end_time > s.start_time) ||
        (targetSchedule.start_time < s.end_time && targetSchedule.end_time >= s.end_time) ||
        (targetSchedule.start_time >= s.start_time && targetSchedule.end_time <= s.end_time);
      if (overlap) return true;
    }
  }

  const acceptedMatches = tables.makeup_matches.all((m) => {
    const pool = tables.makeup_pool.get(m.makeup_pool_id);
    return pool?.student_id === studentId && m.status === 'accepted';
  });

  for (const match of acceptedMatches) {
    const s = tables.schedules.get(match.target_schedule_id);
    if (s && s.date === targetSchedule.date && s.status !== 'cancelled') {
      const overlap =
        (targetSchedule.start_time <= s.start_time && targetSchedule.end_time > s.start_time) ||
        (targetSchedule.start_time < s.end_time && targetSchedule.end_time >= s.end_time) ||
        (targetSchedule.start_time >= s.start_time && targetSchedule.end_time <= s.end_time);
      if (overlap) return true;
    }
  }

  return false;
}

router.get('/', (req: Request, res: Response) => {
  const { student_id, course_id, status } = req.query;
  const pool = tables.makeup_pool.all((mp) => {
    let ok = true;
    if (student_id) ok = ok && mp.student_id === Number(student_id);
    if (course_id) ok = ok && mp.course_id === Number(course_id);
    if (status) ok = ok && mp.status === status;
    return ok;
  });
  res.json({ code: 0, data: pool.map(joinMakeupPool) });
});

router.get('/:id', (req: Request, res: Response) => {
  const pool = tables.makeup_pool.get(Number(req.params.id));
  if (!pool) {
    return res.json({ code: 404, message: '补课记录不存在' });
  }
  res.json({ code: 0, data: joinMakeupPool(pool) });
});

router.post('/:id/match', (req: Request, res: Response) => {
  const poolId = Number(req.params.id);
  const poolRecord = tables.makeup_pool.get(poolId);
  if (!poolRecord) {
    return res.json({ code: 404, message: '补课记录不存在' });
  }
  if (poolRecord.status !== 'pending') {
    return res.json({ code: 400, message: '该补课记录状态不允许重新匹配' });
  }

  const enrollment = tables.enrollments.get(poolRecord.enrollment_id);
  const originalSchedule = tables.schedules.get(poolRecord.original_schedule_id);
  if (!enrollment || !originalSchedule) {
    return res.json({ code: 400, message: '关联数据异常' });
  }

  const existingMatches = tables.makeup_matches.findByMakeupPool(poolId);
  existingMatches.forEach((m) => {
    if (m.status === 'recommended') {
      tables.makeup_matches.delete(m.id);
    }
  });

  const candidateSchedules = tables.schedules.all((s) => {
    if (s.id === originalSchedule.id) return false;
    if (s.course_id !== poolRecord.course_id) return false;
    if (s.status !== 'scheduled') return false;
    if (dayjs(s.date).isBefore(dayjs())) return false;
    if (enrollment.semester_end_date && dayjs(s.date).isAfter(enrollment.semester_end_date)) return false;
    if (hasScheduleConflict(poolRecord.student_id, s)) return false;
    return true;
  });

  const scoredSchedules = candidateSchedules.map((s) => ({
    schedule: s,
    score: calculateMatchScore(poolRecord, s, enrollment, originalSchedule),
  }));

  scoredSchedules.sort((a, b) => b.score - a.score);

  const topSchedules = scoredSchedules.filter((s) => s.score > 0).slice(0, 5);

  const newMatches = topSchedules.map(({ schedule, score }) =>
    tables.makeup_matches.insert({
      makeup_pool_id: poolId,
      target_schedule_id: schedule.id,
      match_score: score,
    })
  );

  if (topSchedules.length > 0) {
    tables.makeup_pool.update(poolId, { status: 'matched', matched_at: dayjs().format('YYYY-MM-DD HH:mm:ss') });
  }

  res.json({
    code: 0,
    message: `已生成 ${topSchedules.length} 个推荐补课时间`,
    data: newMatches.map(joinMakeupMatch),
  });
});

router.put('/matches/:id/accept', (req: Request, res: Response) => {
  const matchId = Number(req.params.id);
  const match = tables.makeup_matches.get(matchId);
  if (!match) {
    return res.json({ code: 404, message: '匹配记录不存在' });
  }

  const schedule = tables.schedules.get(match.target_schedule_id);
  if (!schedule) {
    return res.json({ code: 400, message: '目标课次不存在' });
  }

  const enrolledCount = tables.attendances.count((a: any) => a.schedule_id === schedule.id);
  const acceptedMakeupCount = tables.makeup_matches.count(
    (m: any) => m.target_schedule_id === schedule.id && m.status === 'accepted'
  );
  if (enrolledCount + acceptedMakeupCount >= schedule.max_students) {
    return res.json({ code: 400, message: '该课次人数已满' });
  }

  tables.makeup_matches.update(matchId, {
    status: 'accepted',
    accepted_at: dayjs().format('YYYY-MM-DD HH:mm:ss'),
  });

  const otherMatches = tables.makeup_matches.findByMakeupPool(match.makeup_pool_id);
  otherMatches.forEach((m) => {
    if (m.id !== matchId && m.status === 'recommended') {
      tables.makeup_matches.update(m.id, { status: 'rejected', rejected_at: dayjs().format('YYYY-MM-DD HH:mm:ss') });
    }
  });

  res.json({ code: 0, message: '已确认该补课时间' });
});

router.put('/matches/:id/reject', (req: Request, res: Response) => {
  const matchId = Number(req.params.id);
  const match = tables.makeup_matches.get(matchId);
  if (!match) {
    return res.json({ code: 404, message: '匹配记录不存在' });
  }

  tables.makeup_matches.update(matchId, {
    status: 'rejected',
    rejected_at: dayjs().format('YYYY-MM-DD HH:mm:ss'),
  });

  res.json({ code: 0, message: '已拒绝该推荐' });
});

router.post('/matches/:id/complete', (req: Request, res: Response) => {
  const matchId = Number(req.params.id);
  const match = tables.makeup_matches.get(matchId);
  if (!match) {
    return res.json({ code: 404, message: '匹配记录不存在' });
  }
  if (match.status !== 'accepted') {
    return res.json({ code: 400, message: '只能完成已确认的补课' });
  }

  const poolRecord = tables.makeup_pool.get(match.makeup_pool_id);
  if (!poolRecord) {
    return res.json({ code: 400, message: '补课记录不存在' });
  }

  const existingAttendance = tables.attendances.findByEnrollmentAndSchedule(
    poolRecord.enrollment_id,
    match.target_schedule_id
  );
  if (!existingAttendance) {
    tables.attendances.insert({
      enrollment_id: poolRecord.enrollment_id,
      schedule_id: match.target_schedule_id,
      status: 'present',
      note: '补课出勤',
    });
  }

  tables.makeup_matches.update(matchId, {
    status: 'completed',
    completed_at: dayjs().format('YYYY-MM-DD HH:mm:ss'),
  });

  tables.makeup_pool.update(match.makeup_pool_id, {
    status: 'completed',
    completed_at: dayjs().format('YYYY-MM-DD HH:mm:ss'),
  });

  res.json({ code: 0, message: '补课已完成' });
});

router.delete('/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const poolRecord = tables.makeup_pool.get(id);
  if (!poolRecord) {
    return res.json({ code: 404, message: '补课记录不存在' });
  }

  const matches = tables.makeup_matches.findByMakeupPool(id);
  matches.forEach((m) => tables.makeup_matches.delete(m.id));

  tables.makeup_pool.delete(id);
  res.json({ code: 0, message: '删除成功' });
});

export default router;
