import fs from 'fs';
import path from 'path';
import dayjs from 'dayjs';

export interface Course {
  id: number;
  name: string;
  category: string;
  mode: 'single' | 'semester';
  price: number;
  single_count: number;
  semester_weeks: number;
  description?: string;
  created_at: string;
}

export interface Teacher {
  id: number;
  name: string;
  phone?: string;
  hourly_rate: number;
  specialty?: string;
  created_at: string;
}

export interface Classroom {
  id: number;
  name: string;
  capacity: number;
  equipment?: string;
}

export interface Schedule {
  id: number;
  course_id: number;
  teacher_id: number;
  classroom_id: number;
  date: string;
  start_time: string;
  end_time: string;
  max_students: number;
  status: 'scheduled' | 'completed' | 'cancelled';
  created_at: string;
}

export interface Student {
  id: number;
  name: string;
  phone: string;
  gender?: string;
  birthday?: string;
  note?: string;
  created_at: string;
}

export interface Enrollment {
  id: number;
  student_id: number;
  course_id: number;
  enroll_mode: 'single' | 'semester';
  remaining_sessions: number;
  total_sessions: number;
  semester_start_date?: string;
  semester_end_date?: string;
  paid_amount: number;
  status: 'active' | 'expired' | 'completed' | 'refunded';
  created_at: string;
}

export interface Attendance {
  id: number;
  enrollment_id: number;
  schedule_id: number;
  sign_in_time: string;
  status: 'present' | 'absent' | 'leave';
  note?: string;
}

export interface TeacherPayment {
  id: number;
  teacher_id: number;
  schedule_id: number;
  hours: number;
  hourly_rate: number;
  amount: number;
  status: 'pending' | 'paid';
  paid_date?: string;
  created_at: string;
}

export interface Material {
  id: number;
  name: string;
  category: string;
  unit: string;
  unit_price: number;
  stock: number;
  description?: string;
  created_at: string;
}

export interface MaterialUsage {
  id: number;
  schedule_id: number;
  material_id: number;
  quantity: number;
  total_cost: number;
  per_student_cost: number;
  student_count: number;
  note?: string;
  created_at: string;
}

export interface StudentWork {
  id: number;
  student_id: number;
  course_id: number;
  schedule_id?: number;
  title: string;
  description?: string;
  image_url: string;
  is_excellent: boolean;
  work_date: string;
  created_at: string;
}

export interface MakeupPool {
  id: number;
  enrollment_id: number;
  student_id: number;
  course_id: number;
  original_schedule_id: number;
  missed_lesson_number: number;
  status: 'pending' | 'matched' | 'completed' | 'expired';
  note?: string;
  created_at: string;
  matched_at?: string;
  completed_at?: string;
}

export interface MakeupMatch {
  id: number;
  makeup_pool_id: number;
  target_schedule_id: number;
  match_score: number;
  status: 'recommended' | 'accepted' | 'rejected' | 'completed';
  recommended_at: string;
  accepted_at?: string;
  rejected_at?: string;
  completed_at?: string;
  note?: string;
}

interface Database {
  courses: Course[];
  teachers: Teacher[];
  classrooms: Classroom[];
  schedules: Schedule[];
  students: Student[];
  enrollments: Enrollment[];
  attendances: Attendance[];
  teacher_payments: TeacherPayment[];
  materials: Material[];
  material_usages: MaterialUsage[];
  student_works: StudentWork[];
  makeup_pool: MakeupPool[];
  makeup_matches: MakeupMatch[];
  nextId: { [key: string]: number };
}

const dbPath = path.join(__dirname, '..', 'data.json');

let db: Database = loadDatabase();

function loadDatabase(): Database {
  if (fs.existsSync(dbPath)) {
    try {
      const data = fs.readFileSync(dbPath, 'utf-8');
      const parsed = JSON.parse(data);
      const emptyDb = createEmptyDatabase();
      return {
        ...emptyDb,
        ...parsed,
        student_works: parsed.student_works || [],
        makeup_pool: parsed.makeup_pool || [],
        makeup_matches: parsed.makeup_matches || [],
        nextId: {
          ...emptyDb.nextId,
          ...parsed.nextId,
        }
      };
    } catch (e) {
      console.error('加载数据库失败，使用空数据库');
    }
  }
  return createEmptyDatabase();
}

function createEmptyDatabase(): Database {
  return {
    courses: [],
    teachers: [],
    classrooms: [],
    schedules: [],
    students: [],
    enrollments: [],
    attendances: [],
    teacher_payments: [],
    materials: [],
    material_usages: [],
    student_works: [],
    makeup_pool: [],
    makeup_matches: [],
    nextId: {
      courses: 1,
      teachers: 1,
      classrooms: 1,
      schedules: 1,
      students: 1,
      enrollments: 1,
      attendances: 1,
      teacher_payments: 1,
      materials: 1,
      material_usages: 1,
      student_works: 1,
      makeup_pool: 1,
      makeup_matches: 1,
    },
  };
}

function saveDatabase() {
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf-8');
}

function now(): string {
  return dayjs().format('YYYY-MM-DD HH:mm:ss');
}

function nextId(table: keyof Database['nextId']): number {
  const id = db.nextId[table];
  db.nextId[table] = id + 1;
  saveDatabase();
  return id;
}

function seedInitialData() {
  if (db.courses.length > 0) return;

  const coursesData: Omit<Course, 'id' | 'created_at'>[] = [
    { name: '水彩画入门', category: '水彩', mode: 'single', price: 180, single_count: 1, semester_weeks: 0, description: '单次体验课，零基础可学' },
    { name: '水彩进阶班', category: '水彩', mode: 'semester', price: 2800, single_count: 0, semester_weeks: 12, description: '12周系统学习，每周2课时' },
    { name: '油画基础', category: '油画', mode: 'single', price: 220, single_count: 1, semester_weeks: 0, description: '单次油画体验' },
    { name: '油画系统课', category: '油画', mode: 'semester', price: 3600, single_count: 0, semester_weeks: 16, description: '16周系统课程' },
    { name: '书法入门', category: '书法', mode: 'single', price: 150, single_count: 1, semester_weeks: 0, description: '软笔书法单次体验' },
    { name: '书法学期班', category: '书法', mode: 'semester', price: 2400, single_count: 0, semester_weeks: 12, description: '12周书法系统学习' },
    { name: '陶艺体验', category: '陶艺', mode: 'single', price: 200, single_count: 1, semester_weeks: 0, description: '拉坯+上釉体验' },
    { name: '陶艺系统课', category: '陶艺', mode: 'semester', price: 3200, single_count: 0, semester_weeks: 10, description: '10周陶艺课程' },
    { name: '皮具手作', category: '皮具', mode: 'single', price: 280, single_count: 1, semester_weeks: 0, description: '皮具制作单次体验' },
    { name: '皮具进阶班', category: '皮具', mode: 'semester', price: 4000, single_count: 0, semester_weeks: 8, description: '8周皮具制作系统课' },
  ];
  coursesData.forEach(c => {
    const id = db.nextId.courses++;
    db.courses.push({ ...c, id, created_at: now() });
  });

  const teachersData: Omit<Teacher, 'id' | 'created_at'>[] = [
    { name: '李明', phone: '13800138001', hourly_rate: 200, specialty: '水彩画' },
    { name: '王芳', phone: '13800138002', hourly_rate: 250, specialty: '油画' },
    { name: '张建国', phone: '13800138003', hourly_rate: 180, specialty: '书法' },
    { name: '陈思', phone: '13800138004', hourly_rate: 220, specialty: '陶艺' },
    { name: '刘洋', phone: '13800138005', hourly_rate: 280, specialty: '皮具制作' },
  ];
  teachersData.forEach(t => {
    const id = db.nextId.teachers++;
    db.teachers.push({ ...t, id, created_at: now() });
  });

  const classroomsData: Omit<Classroom, 'id'>[] = [
    { name: '绘画教室A', capacity: 15, equipment: '画架、画板、投影设备' },
    { name: '绘画教室B', capacity: 12, equipment: '画架、画板' },
    { name: '书法教室', capacity: 20, equipment: '书画桌、毛毡' },
    { name: '陶艺教室', capacity: 10, equipment: '拉坯机、窑炉' },
    { name: '皮具工作室', capacity: 8, equipment: '皮具工具、缝纫机' },
  ];
  classroomsData.forEach(c => {
    const id = db.nextId.classrooms++;
    db.classrooms.push({ ...c, id });
  });

  const studentsData: Omit<Student, 'id' | 'created_at'>[] = [
    { name: '赵小红', phone: '13900139001', gender: '女', note: '零基础，对水彩感兴趣' },
    { name: '钱伟', phone: '13900139002', gender: '男', note: '有一定油画基础' },
    { name: '孙丽', phone: '13900139003', gender: '女', note: '想学书法修身养性' },
    { name: '周强', phone: '13900139004', gender: '男', note: '陶艺爱好者' },
    { name: '吴敏', phone: '13900139005', gender: '女', note: '喜欢手工皮具' },
  ];
  studentsData.forEach(s => {
    const id = db.nextId.students++;
    db.students.push({ ...s, id, created_at: now() });
  });

  const materialsData: Omit<Material, 'id' | 'created_at'>[] = [
    { name: '水彩画纸8K', category: '画纸', unit: '张', unit_price: 2.5, stock: 500, description: '专业水彩画纸，8开' },
    { name: '素描纸4K', category: '画纸', unit: '张', unit_price: 1.8, stock: 800, description: '铅画纸，4开' },
    { name: '油画布50×70', category: '画布', unit: '块', unit_price: 35, stock: 100, description: '亚麻油画布' },
    { name: '水彩颜料套装', category: '颜料', unit: '套', unit_price: 68, stock: 50, description: '24色水彩颜料' },
    { name: '油画颜料钛白', category: '颜料', unit: '支', unit_price: 22, stock: 80, description: '大支装钛白油画颜料' },
    { name: '丙烯颜料12色', category: '颜料', unit: '套', unit_price: 45, stock: 60, description: '12色丙烯颜料套装' },
    { name: '书法墨汁500ml', category: '书法', unit: '瓶', unit_price: 18, stock: 100, description: '一得阁墨汁' },
    { name: '毛边纸', category: '书法', unit: '刀', unit_price: 28, stock: 120, description: '半生熟毛边纸100张' },
    { name: '陶泥5kg', category: '陶艺', unit: '袋', unit_price: 38, stock: 150, description: '中温陶土泥' },
    { name: '釉料套装', category: '陶艺', unit: '套', unit_price: 120, stock: 30, description: '6色基础釉料' },
    { name: '植鞣革皮料1.5mm', category: '皮料', unit: '平方英尺', unit_price: 28, stock: 200, description: '意大利进口植鞣革' },
    { name: '疯马皮2.0mm', category: '皮料', unit: '平方英尺', unit_price: 35, stock: 150, description: '复古疯马皮' },
    { name: '蜡线25色', category: '皮具', unit: '卷', unit_price: 8, stock: 200, description: '涤纶蜡线' },
    { name: '黄铜四合扣', category: '皮具', unit: '套', unit_price: 1.5, stock: 500, description: '纯铜四合扣' },
    { name: '画笔套装', category: '工具', unit: '套', unit_price: 48, stock: 80, description: '10支装水彩画笔' },
    { name: '调色盘', category: '工具', unit: '个', unit_price: 12, stock: 150, description: '陶瓷调色盘' },
  ];
  materialsData.forEach(m => {
    const id = db.nextId.materials++;
    db.materials.push({ ...m, id, created_at: now() });
  });

  saveDatabase();
}

export function initDatabase() {
  seedInitialData();
}

export const tables = {
  courses: {
    all: (filter?: (c: Course) => boolean): Course[] => {
      let result = [...db.courses];
      if (filter) result = result.filter(filter);
      return result.sort((a, b) => b.id - a.id);
    },
    get: (id: number): Course | undefined => db.courses.find(c => c.id === id),
    insert: (data: Omit<Course, 'id' | 'created_at'>): Course => {
      const course: Course = { ...data, id: nextId('courses'), created_at: now() };
      db.courses.push(course);
      saveDatabase();
      return course;
    },
    update: (id: number, data: Partial<Course>): boolean => {
      const idx = db.courses.findIndex(c => c.id === id);
      if (idx === -1) return false;
      db.courses[idx] = { ...db.courses[idx], ...data };
      saveDatabase();
      return true;
    },
    delete: (id: number): boolean => {
      const idx = db.courses.findIndex(c => c.id === id);
      if (idx === -1) return false;
      db.courses.splice(idx, 1);
      saveDatabase();
      return true;
    },
    count: (filter?: (c: Course) => boolean): number => {
      if (filter) return db.courses.filter(filter).length;
      return db.courses.length;
    },
  },
  teachers: {
    all: (): Teacher[] => [...db.teachers].sort((a, b) => b.id - a.id),
    get: (id: number): Teacher | undefined => db.teachers.find(t => t.id === id),
    insert: (data: Omit<Teacher, 'id' | 'created_at'>): Teacher => {
      const teacher: Teacher = { ...data, id: nextId('teachers'), created_at: now() };
      db.teachers.push(teacher);
      saveDatabase();
      return teacher;
    },
    update: (id: number, data: Partial<Teacher>): boolean => {
      const idx = db.teachers.findIndex(t => t.id === id);
      if (idx === -1) return false;
      db.teachers[idx] = { ...db.teachers[idx], ...data };
      saveDatabase();
      return true;
    },
    delete: (id: number): boolean => {
      const idx = db.teachers.findIndex(t => t.id === id);
      if (idx === -1) return false;
      db.teachers.splice(idx, 1);
      saveDatabase();
      return true;
    },
  },
  classrooms: {
    all: (): Classroom[] => [...db.classrooms].sort((a, b) => b.id - a.id),
    get: (id: number): Classroom | undefined => db.classrooms.find(c => c.id === id),
    insert: (data: Omit<Classroom, 'id'>): Classroom => {
      const classroom: Classroom = { ...data, id: nextId('classrooms') };
      db.classrooms.push(classroom);
      saveDatabase();
      return classroom;
    },
    update: (id: number, data: Partial<Classroom>): boolean => {
      const idx = db.classrooms.findIndex(c => c.id === id);
      if (idx === -1) return false;
      db.classrooms[idx] = { ...db.classrooms[idx], ...data };
      saveDatabase();
      return true;
    },
    delete: (id: number): boolean => {
      const idx = db.classrooms.findIndex(c => c.id === id);
      if (idx === -1) return false;
      db.classrooms.splice(idx, 1);
      saveDatabase();
      return true;
    },
  },
  schedules: {
    all: (filter?: (s: Schedule) => boolean): Schedule[] => {
      let result = [...db.schedules];
      if (filter) result = result.filter(filter);
      return result.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.id - a.id));
    },
    get: (id: number): Schedule | undefined => db.schedules.find(s => s.id === id),
    insert: (data: Omit<Schedule, 'id' | 'created_at' | 'status'> & { status?: Schedule['status'] }): Schedule => {
      const schedule: Schedule = { status: 'scheduled', ...data, id: nextId('schedules'), created_at: now() };
      db.schedules.push(schedule);
      saveDatabase();
      return schedule;
    },
    update: (id: number, data: Partial<Schedule>): boolean => {
      const idx = db.schedules.findIndex(s => s.id === id);
      if (idx === -1) return false;
      db.schedules[idx] = { ...db.schedules[idx], ...data };
      saveDatabase();
      return true;
    },
    delete: (id: number): boolean => {
      const idx = db.schedules.findIndex(s => s.id === id);
      if (idx === -1) return false;
      db.schedules.splice(idx, 1);
      saveDatabase();
      return true;
    },
    count: (filter?: (s: Schedule) => boolean): number => {
      if (filter) return db.schedules.filter(filter).length;
      return db.schedules.length;
    },
  },
  students: {
    all: (filter?: (s: Student) => boolean): Student[] => {
      let result = [...db.students];
      if (filter) result = result.filter(filter);
      return result.sort((a, b) => b.id - a.id);
    },
    get: (id: number): Student | undefined => db.students.find(s => s.id === id),
    insert: (data: Omit<Student, 'id' | 'created_at'>): Student => {
      const student: Student = { ...data, id: nextId('students'), created_at: now() };
      db.students.push(student);
      saveDatabase();
      return student;
    },
    update: (id: number, data: Partial<Student>): boolean => {
      const idx = db.students.findIndex(s => s.id === id);
      if (idx === -1) return false;
      db.students[idx] = { ...db.students[idx], ...data };
      saveDatabase();
      return true;
    },
    delete: (id: number): boolean => {
      const idx = db.students.findIndex(s => s.id === id);
      if (idx === -1) return false;
      db.students.splice(idx, 1);
      saveDatabase();
      return true;
    },
  },
  enrollments: {
    all: (filter?: (e: Enrollment) => boolean): Enrollment[] => {
      let result = [...db.enrollments];
      if (filter) result = result.filter(filter);
      return result.sort((a, b) => b.id - a.id);
    },
    get: (id: number): Enrollment | undefined => db.enrollments.find(e => e.id === id),
    insert: (data: Omit<Enrollment, 'id' | 'created_at' | 'status'> & { status?: Enrollment['status'] }): Enrollment => {
      const enrollment: Enrollment = { status: 'active', ...data, id: nextId('enrollments'), created_at: now() };
      db.enrollments.push(enrollment);
      saveDatabase();
      return enrollment;
    },
    update: (id: number, data: Partial<Enrollment>): boolean => {
      const idx = db.enrollments.findIndex(e => e.id === id);
      if (idx === -1) return false;
      db.enrollments[idx] = { ...db.enrollments[idx], ...data };
      saveDatabase();
      return true;
    },
    delete: (id: number): boolean => {
      const idx = db.enrollments.findIndex(e => e.id === id);
      if (idx === -1) return false;
      db.enrollments.splice(idx, 1);
      saveDatabase();
      return true;
    },
  },
  attendances: {
    all: (filter?: (a: Attendance) => boolean): Attendance[] => {
      let result = [...db.attendances];
      if (filter) result = result.filter(filter);
      return result.sort((a, b) => b.id - a.id);
    },
    get: (id: number): Attendance | undefined => db.attendances.find(a => a.id === id),
    findByEnrollmentAndSchedule: (enrollmentId: number, scheduleId: number): Attendance | undefined =>
      db.attendances.find(a => a.enrollment_id === enrollmentId && a.schedule_id === scheduleId),
    insert: (data: Omit<Attendance, 'id' | 'sign_in_time'> & { sign_in_time?: string }): Attendance => {
      const attendance: Attendance = { sign_in_time: now(), ...data, id: nextId('attendances') };
      db.attendances.push(attendance);
      saveDatabase();
      return attendance;
    },
    update: (id: number, data: Partial<Attendance>): boolean => {
      const idx = db.attendances.findIndex(a => a.id === id);
      if (idx === -1) return false;
      db.attendances[idx] = { ...db.attendances[idx], ...data };
      saveDatabase();
      return true;
    },
    delete: (id: number): boolean => {
      const idx = db.attendances.findIndex(a => a.id === id);
      if (idx === -1) return false;
      db.attendances.splice(idx, 1);
      saveDatabase();
      return true;
    },
    count: (filter?: (a: Attendance) => boolean): number => {
      if (filter) return db.attendances.filter(filter).length;
      return db.attendances.length;
    },
  },
  teacher_payments: {
    all: (filter?: (p: TeacherPayment) => boolean): TeacherPayment[] => {
      let result = [...db.teacher_payments];
      if (filter) result = result.filter(filter);
      return result.sort((a, b) => b.id - a.id);
    },
    get: (id: number): TeacherPayment | undefined => db.teacher_payments.find(p => p.id === id),
    findByTeacherAndSchedule: (teacherId: number, scheduleId: number): TeacherPayment | undefined =>
      db.teacher_payments.find(p => p.teacher_id === teacherId && p.schedule_id === scheduleId),
    insert: (data: Omit<TeacherPayment, 'id' | 'created_at' | 'status'> & { status?: TeacherPayment['status'] }): TeacherPayment => {
      const payment: TeacherPayment = { status: 'pending', ...data, id: nextId('teacher_payments'), created_at: now() };
      db.teacher_payments.push(payment);
      saveDatabase();
      return payment;
    },
    update: (id: number, data: Partial<TeacherPayment>): boolean => {
      const idx = db.teacher_payments.findIndex(p => p.id === id);
      if (idx === -1) return false;
      db.teacher_payments[idx] = { ...db.teacher_payments[idx], ...data };
      saveDatabase();
      return true;
    },
  },
  materials: {
    all: (filter?: (m: Material) => boolean): Material[] => {
      let result = [...db.materials];
      if (filter) result = result.filter(filter);
      return result.sort((a, b) => b.id - a.id);
    },
    get: (id: number): Material | undefined => db.materials.find(m => m.id === id),
    insert: (data: Omit<Material, 'id' | 'created_at'>): Material => {
      const material: Material = { ...data, id: nextId('materials'), created_at: now() };
      db.materials.push(material);
      saveDatabase();
      return material;
    },
    update: (id: number, data: Partial<Material>): boolean => {
      const idx = db.materials.findIndex(m => m.id === id);
      if (idx === -1) return false;
      db.materials[idx] = { ...db.materials[idx], ...data };
      saveDatabase();
      return true;
    },
    delete: (id: number): boolean => {
      const idx = db.materials.findIndex(m => m.id === id);
      if (idx === -1) return false;
      db.materials.splice(idx, 1);
      saveDatabase();
      return true;
    },
    updateStock: (id: number, delta: number): boolean => {
      const idx = db.materials.findIndex(m => m.id === id);
      if (idx === -1) return false;
      const newStock = db.materials[idx].stock + delta;
      if (newStock < 0) return false;
      db.materials[idx] = { ...db.materials[idx], stock: newStock };
      saveDatabase();
      return true;
    },
  },
  material_usages: {
    all: (filter?: (mu: MaterialUsage) => boolean): MaterialUsage[] => {
      let result = [...db.material_usages];
      if (filter) result = result.filter(filter);
      return result.sort((a, b) => b.id - a.id);
    },
    get: (id: number): MaterialUsage | undefined => db.material_usages.find(mu => mu.id === id),
    findBySchedule: (scheduleId: number): MaterialUsage[] =>
      db.material_usages.filter(mu => mu.schedule_id === scheduleId),
    insert: (data: Omit<MaterialUsage, 'id' | 'created_at'>): MaterialUsage => {
      const usage: MaterialUsage = { ...data, id: nextId('material_usages'), created_at: now() };
      db.material_usages.push(usage);
      saveDatabase();
      return usage;
    },
    update: (id: number, data: Partial<MaterialUsage>): boolean => {
      const idx = db.material_usages.findIndex(mu => mu.id === id);
      if (idx === -1) return false;
      db.material_usages[idx] = { ...db.material_usages[idx], ...data };
      saveDatabase();
      return true;
    },
    delete: (id: number): boolean => {
      const idx = db.material_usages.findIndex(mu => mu.id === id);
      if (idx === -1) return false;
      db.material_usages.splice(idx, 1);
      saveDatabase();
      return true;
    },
  },
  student_works: {
    all: (filter?: (sw: StudentWork) => boolean): StudentWork[] => {
      let result = [...db.student_works];
      if (filter) result = result.filter(filter);
      return result.sort((a, b) => (a.work_date < b.work_date ? 1 : a.work_date > b.work_date ? -1 : b.id - a.id));
    },
    get: (id: number): StudentWork | undefined => db.student_works.find(sw => sw.id === id),
    findByStudent: (studentId: number): StudentWork[] =>
      db.student_works.filter(sw => sw.student_id === studentId).sort((a, b) => b.id - a.id),
    findByCourse: (courseId: number): StudentWork[] =>
      db.student_works.filter(sw => sw.course_id === courseId).sort((a, b) => b.id - a.id),
    findExcellent: (): StudentWork[] =>
      db.student_works.filter(sw => sw.is_excellent).sort((a, b) => b.id - a.id),
    insert: (data: Omit<StudentWork, 'id' | 'created_at' | 'is_excellent'> & { is_excellent?: boolean }): StudentWork => {
      const work: StudentWork = { is_excellent: false, ...data, id: nextId('student_works'), created_at: now() };
      db.student_works.push(work);
      saveDatabase();
      return work;
    },
    update: (id: number, data: Partial<StudentWork>): boolean => {
      const idx = db.student_works.findIndex(sw => sw.id === id);
      if (idx === -1) return false;
      db.student_works[idx] = { ...db.student_works[idx], ...data };
      saveDatabase();
      return true;
    },
    delete: (id: number): boolean => {
      const idx = db.student_works.findIndex(sw => sw.id === id);
      if (idx === -1) return false;
      db.student_works.splice(idx, 1);
      saveDatabase();
      return true;
    },
    count: (filter?: (sw: StudentWork) => boolean): number => {
      if (filter) return db.student_works.filter(filter).length;
      return db.student_works.length;
    },
  },
  makeup_pool: {
    all: (filter?: (mp: MakeupPool) => boolean): MakeupPool[] => {
      let result = [...db.makeup_pool];
      if (filter) result = result.filter(filter);
      return result.sort((a, b) => b.id - a.id);
    },
    get: (id: number): MakeupPool | undefined => db.makeup_pool.find(mp => mp.id === id),
    findByStudent: (studentId: number): MakeupPool[] =>
      db.makeup_pool.filter(mp => mp.student_id === studentId).sort((a, b) => b.id - a.id),
    findByEnrollment: (enrollmentId: number): MakeupPool[] =>
      db.makeup_pool.filter(mp => mp.enrollment_id === enrollmentId).sort((a, b) => b.id - a.id),
    findPendingByStudentAndCourse: (studentId: number, courseId: number): MakeupPool[] =>
      db.makeup_pool.filter(mp => mp.student_id === studentId && mp.course_id === courseId && mp.status === 'pending'),
    insert: (data: Omit<MakeupPool, 'id' | 'created_at' | 'status'> & { status?: MakeupPool['status'] }): MakeupPool => {
      const pool: MakeupPool = { status: 'pending', ...data, id: nextId('makeup_pool'), created_at: now() };
      db.makeup_pool.push(pool);
      saveDatabase();
      return pool;
    },
    update: (id: number, data: Partial<MakeupPool>): boolean => {
      const idx = db.makeup_pool.findIndex(mp => mp.id === id);
      if (idx === -1) return false;
      db.makeup_pool[idx] = { ...db.makeup_pool[idx], ...data };
      saveDatabase();
      return true;
    },
    delete: (id: number): boolean => {
      const idx = db.makeup_pool.findIndex(mp => mp.id === id);
      if (idx === -1) return false;
      db.makeup_pool.splice(idx, 1);
      saveDatabase();
      return true;
    },
    count: (filter?: (mp: MakeupPool) => boolean): number => {
      if (filter) return db.makeup_pool.filter(filter).length;
      return db.makeup_pool.length;
    },
  },
  makeup_matches: {
    all: (filter?: (mm: MakeupMatch) => boolean): MakeupMatch[] => {
      let result = [...db.makeup_matches];
      if (filter) result = result.filter(filter);
      return result.sort((a, b) => b.match_score - a.match_score || b.id - a.id);
    },
    get: (id: number): MakeupMatch | undefined => db.makeup_matches.find(mm => mm.id === id),
    findByMakeupPool: (makeupPoolId: number): MakeupMatch[] =>
      db.makeup_matches.filter(mm => mm.makeup_pool_id === makeupPoolId).sort((a, b) => b.match_score - a.match_score),
    findBySchedule: (scheduleId: number): MakeupMatch[] =>
      db.makeup_matches.filter(mm => mm.target_schedule_id === scheduleId),
    insert: (data: Omit<MakeupMatch, 'id' | 'recommended_at' | 'status'> & { status?: MakeupMatch['status'] }): MakeupMatch => {
      const match: MakeupMatch = { status: 'recommended', ...data, id: nextId('makeup_matches'), recommended_at: now() };
      db.makeup_matches.push(match);
      saveDatabase();
      return match;
    },
    update: (id: number, data: Partial<MakeupMatch>): boolean => {
      const idx = db.makeup_matches.findIndex(mm => mm.id === id);
      if (idx === -1) return false;
      db.makeup_matches[idx] = { ...db.makeup_matches[idx], ...data };
      saveDatabase();
      return true;
    },
    delete: (id: number): boolean => {
      const idx = db.makeup_matches.findIndex(mm => mm.id === id);
      if (idx === -1) return false;
      db.makeup_matches.splice(idx, 1);
      saveDatabase();
      return true;
    },
    count: (filter?: (mm: MakeupMatch) => boolean): number => {
      if (filter) return db.makeup_matches.filter(filter).length;
      return db.makeup_matches.length;
    },
  },
};
