import { Router, Request, Response } from 'express';
import { tables, StudentWork } from '../db';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import dayjs from 'dayjs';

const router = Router();

const uploadDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = `work_${Date.now()}_${Math.round(Math.random() * 10000)}${ext}`;
    cb(null, filename);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('只允许上传图片文件'));
    }
  }
});

router.get('/', (req: Request, res: Response) => {
  const { student_id, course_id, is_excellent, start_date, end_date } = req.query;
  let filter: ((sw: StudentWork) => boolean) | undefined;

  if (student_id || course_id || is_excellent || start_date || end_date) {
    filter = (sw: StudentWork) => {
      let ok = true;
      if (student_id) ok = ok && sw.student_id === Number(student_id);
      if (course_id) ok = ok && sw.course_id === Number(course_id);
      if (is_excellent !== undefined) ok = ok && sw.is_excellent === (is_excellent === 'true');
      if (start_date) ok = ok && sw.work_date >= String(start_date);
      if (end_date) ok = ok && sw.work_date <= String(end_date);
      return ok;
    };
  }

  const works = tables.student_works.all(filter);
  const data = works.map(work => {
    const student = tables.students.get(work.student_id);
    const course = tables.courses.get(work.course_id);
    return {
      ...work,
      student_name: student?.name || '未知',
      course_name: course?.name || '未知',
      image_url: `/uploads/${work.image_url}`
    };
  });

  res.json({ code: 0, data });
});

router.get('/excellent', (req: Request, res: Response) => {
  const works = tables.student_works.findExcellent();
  const data = works.map(work => {
    const student = tables.students.get(work.student_id);
    const course = tables.courses.get(work.course_id);
    return {
      ...work,
      student_name: student?.name || '未知',
      course_name: course?.name || '未知',
      image_url: `/uploads/${work.image_url}`
    };
  });
  res.json({ code: 0, data });
});

router.get('/student/:studentId', (req: Request, res: Response) => {
  const studentId = Number(req.params.studentId);
  const works = tables.student_works.findByStudent(studentId);
  const data = works.map(work => {
    const course = tables.courses.get(work.course_id);
    return {
      ...work,
      course_name: course?.name || '未知',
      image_url: `/uploads/${work.image_url}`
    };
  });
  res.json({ code: 0, data });
});

router.get('/:id', (req: Request, res: Response) => {
  const work = tables.student_works.get(Number(req.params.id));
  if (!work) {
    return res.json({ code: 404, message: '作品不存在' });
  }
  const student = tables.students.get(work.student_id);
  const course = tables.courses.get(work.course_id);
  res.json({
    code: 0,
    data: {
      ...work,
      student_name: student?.name || '未知',
      course_name: course?.name || '未知',
      image_url: `/uploads/${work.image_url}`
    }
  });
});

router.post('/', upload.single('image'), (req: Request, res: Response) => {
  try {
    const { student_id, course_id, schedule_id, title, description, work_date } = req.body;

    if (!student_id || !course_id || !title || !work_date) {
      if (req.file) {
        fs.unlinkSync(path.join(uploadDir, req.file.filename));
      }
      return res.json({ code: 400, message: '缺少必要参数' });
    }

    if (!req.file) {
      return res.json({ code: 400, message: '请上传作品图片' });
    }

    const student = tables.students.get(Number(student_id));
    if (!student) {
      fs.unlinkSync(path.join(uploadDir, req.file.filename));
      return res.json({ code: 400, message: '学员不存在' });
    }

    const course = tables.courses.get(Number(course_id));
    if (!course) {
      fs.unlinkSync(path.join(uploadDir, req.file.filename));
      return res.json({ code: 400, message: '课程不存在' });
    }

    const work = tables.student_works.insert({
      student_id: Number(student_id),
      course_id: Number(course_id),
      schedule_id: schedule_id ? Number(schedule_id) : undefined,
      title,
      description,
      image_url: req.file.filename,
      work_date
    });

    res.json({ code: 0, data: { id: work.id, image_url: `/uploads/${work.image_url}` } });
  } catch (e: any) {
    if (req.file) {
      fs.unlinkSync(path.join(uploadDir, req.file.filename));
    }
    res.json({ code: 500, message: e.message || '上传失败' });
  }
});

router.put('/:id', (req: Request, res: Response) => {
  const { title, description, is_excellent } = req.body;
  const id = Number(req.params.id);

  const work = tables.student_works.get(id);
  if (!work) {
    return res.json({ code: 404, message: '作品不存在' });
  }

  const updateData: Partial<StudentWork> = {};
  if (title !== undefined) updateData.title = title;
  if (description !== undefined) updateData.description = description;
  if (is_excellent !== undefined) updateData.is_excellent = Boolean(is_excellent);

  tables.student_works.update(id, updateData);
  res.json({ code: 0, message: '更新成功' });
});

router.put('/:id/excellent', (req: Request, res: Response) => {
  const { is_excellent } = req.body;
  const id = Number(req.params.id);

  const work = tables.student_works.get(id);
  if (!work) {
    return res.json({ code: 404, message: '作品不存在' });
  }

  tables.student_works.update(id, { is_excellent: Boolean(is_excellent) });
  res.json({ code: 0, message: is_excellent ? '已标记为优秀作品' : '已取消优秀标记' });
});

router.delete('/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const work = tables.student_works.get(id);
  if (!work) {
    return res.json({ code: 404, message: '作品不存在' });
  }

  const imagePath = path.join(uploadDir, work.image_url);
  if (fs.existsSync(imagePath)) {
    fs.unlinkSync(imagePath);
  }

  tables.student_works.delete(id);
  res.json({ code: 0, message: '删除成功' });
});

router.get('/export/portfolio/:studentId', (req: Request, res: Response) => {
  const studentId = Number(req.params.studentId);
  const student = tables.students.get(studentId);

  if (!student) {
    return res.json({ code: 404, message: '学员不存在' });
  }

  const works = tables.student_works.findByStudent(studentId);
  const portfolio = {
    student: {
      id: student.id,
      name: student.name,
      phone: student.phone,
      gender: student.gender,
      birthday: student.birthday
    },
    export_date: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    total_works: works.length,
    works: works.map(work => {
      const course = tables.courses.get(work.course_id);
      return {
        id: work.id,
        title: work.title,
        description: work.description,
        course_name: course?.name || '未知',
        work_date: work.work_date,
        is_excellent: work.is_excellent,
        image_url: `/uploads/${work.image_url}`,
        created_at: work.created_at
      };
    })
  };

  const fileName = `${student.name}_作品集_${dayjs().format('YYYYMMDD')}.json`;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`);
  res.json(portfolio);
});

export default router;
