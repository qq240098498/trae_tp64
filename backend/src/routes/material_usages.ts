import { Router, Request, Response } from 'express';
import { tables } from '../db';
import dayjs from 'dayjs';

const router = Router();

function joinUsage(mu: any) {
  const material = tables.materials.get(mu.material_id);
  const schedule = tables.schedules.get(mu.schedule_id);
  const course = schedule ? tables.courses.get(schedule.course_id) : undefined;
  const teacher = schedule ? tables.teachers.get(schedule.teacher_id) : undefined;
  return {
    ...mu,
    material_name: material?.name,
    material_category: material?.category,
    material_unit: material?.unit,
    unit_price: material?.unit_price,
    schedule_date: schedule?.date,
    schedule_start: schedule?.start_time,
    schedule_end: schedule?.end_time,
    course_id: schedule?.course_id,
    course_name: course?.name,
    course_category: course?.category,
    teacher_name: teacher?.name,
  };
}

router.get('/', (req: Request, res: Response) => {
  const { schedule_id, material_id, start_date, end_date, course_category, material_category } = req.query;
  const usages = tables.material_usages.all((mu) => {
    let ok = true;
    if (schedule_id) ok = ok && mu.schedule_id === Number(schedule_id);
    if (material_id) ok = ok && mu.material_id === Number(material_id);
    if (material_category) {
      const m = tables.materials.get(mu.material_id);
      ok = ok && m?.category === material_category;
    }
    if (start_date || end_date || course_category) {
      const s = tables.schedules.get(mu.schedule_id);
      if (!s) return false;
      if (start_date) ok = ok && s.date >= start_date;
      if (end_date) ok = ok && s.date <= end_date;
      if (course_category) {
        const c = tables.courses.get(s.course_id);
        ok = ok && c?.category === course_category;
      }
    }
    return ok;
  });
  res.json({ code: 0, data: usages.map(joinUsage) });
});

router.get('/:id', (req: Request, res: Response) => {
  const usage = tables.material_usages.get(Number(req.params.id));
  if (!usage) {
    return res.json({ code: 404, message: '材料使用记录不存在' });
  }
  res.json({ code: 0, data: joinUsage(usage) });
});

router.post('/', (req: Request, res: Response) => {
  const { schedule_id, material_id, quantity, note } = req.body;
  if (!schedule_id || !material_id || quantity === undefined) {
    return res.json({ code: 400, message: '缺少必要参数' });
  }

  const schedule = tables.schedules.get(Number(schedule_id));
  if (!schedule) {
    return res.json({ code: 404, message: '排课不存在' });
  }

  const material = tables.materials.get(Number(material_id));
  if (!material) {
    return res.json({ code: 404, message: '材料不存在' });
  }

  const qty = Number(quantity);
  if (qty <= 0) {
    return res.json({ code: 400, message: '使用数量必须大于0' });
  }

  if (material.stock < qty) {
    return res.json({ code: 400, message: `库存不足，当前库存：${material.stock}${material.unit}` });
  }

  const studentCount = tables.attendances.count((a) => a.schedule_id === schedule.id && a.status === 'present');
  const actualCount = studentCount > 0 ? studentCount : 1;

  const totalCost = Math.round(qty * material.unit_price * 100) / 100;
  const perStudentCost = Math.round((totalCost / actualCount) * 100) / 100;

  const success = tables.materials.updateStock(material.id, -qty);
  if (!success) {
    return res.json({ code: 400, message: '扣减库存失败' });
  }

  const usage = tables.material_usages.insert({
    schedule_id: schedule.id,
    material_id: material.id,
    quantity: qty,
    total_cost: totalCost,
    per_student_cost: perStudentCost,
    student_count: actualCount,
    note,
  });

  res.json({
    code: 0,
    message: '材料使用记录已创建',
    data: {
      id: usage.id,
      total_cost: totalCost,
      per_student_cost: perStudentCost,
      student_count: actualCount,
    },
  });
});

router.put('/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { quantity, note } = req.body;

  const existing = tables.material_usages.get(id);
  if (!existing) {
    return res.json({ code: 404, message: '材料使用记录不存在' });
  }

  const material = tables.materials.get(existing.material_id);
  if (!material) {
    return res.json({ code: 404, message: '关联材料不存在' });
  }

  if (quantity !== undefined) {
    const newQty = Number(quantity);
    if (newQty <= 0) {
      return res.json({ code: 400, message: '使用数量必须大于0' });
    }
    const diff = newQty - existing.quantity;
    if (diff > 0 && material.stock < diff) {
      return res.json({ code: 400, message: `库存不足，当前库存：${material.stock}${material.unit}` });
    }
    tables.materials.updateStock(material.id, -diff);

    const schedule = tables.schedules.get(existing.schedule_id);
    const studentCount = schedule ? tables.attendances.count((a) => a.schedule_id === schedule.id && a.status === 'present') : 0;
    const actualCount = studentCount > 0 ? studentCount : 1;

    const totalCost = Math.round(newQty * material.unit_price * 100) / 100;
    const perStudentCost = Math.round((totalCost / actualCount) * 100) / 100;

    tables.material_usages.update(id, {
      quantity: newQty,
      total_cost: totalCost,
      per_student_cost: perStudentCost,
      student_count: actualCount,
    });
  }

  if (note !== undefined) {
    tables.material_usages.update(id, { note });
  }

  res.json({ code: 0, message: '更新成功' });
});

router.delete('/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const existing = tables.material_usages.get(id);
  if (!existing) {
    return res.json({ code: 404, message: '材料使用记录不存在' });
  }

  tables.materials.updateStock(existing.material_id, existing.quantity);
  tables.material_usages.delete(id);
  res.json({ code: 0, message: '删除成功，库存已恢复' });
});

router.get('/summary/monthly', (req: Request, res: Response) => {
  const { month, course_category } = req.query;
  const targetMonth = month ? String(month) : dayjs().format('YYYY-MM');

  const startOfMonth = dayjs(targetMonth).startOf('month').format('YYYY-MM-DD');
  const endOfMonth = dayjs(targetMonth).endOf('month').format('YYYY-MM-DD');

  const allUsages = tables.material_usages.all((mu) => {
    const s = tables.schedules.get(mu.schedule_id);
    if (!s) return false;
    if (s.date < startOfMonth || s.date > endOfMonth) return false;
    if (course_category) {
      const c = tables.courses.get(s.course_id);
      if (c?.category !== course_category) return false;
    }
    return true;
  });

  const materialSummary: { [key: number]: any } = {};
  const categorySummary: { [key: string]: any } = {};
  const courseSummary: { [key: number]: any } = {};
  let totalMaterialCost = 0;
  let totalUsageCount = 0;
  const scheduleIds = new Set<number>();

  allUsages.forEach((mu) => {
    const material = tables.materials.get(mu.material_id);
    const schedule = tables.schedules.get(mu.schedule_id);
    const course = schedule ? tables.courses.get(schedule.course_id) : undefined;
    scheduleIds.add(mu.schedule_id);
    totalUsageCount++;
    totalMaterialCost += mu.total_cost;

    if (material) {
      if (!materialSummary[material.id]) {
        materialSummary[material.id] = {
          material_id: material.id,
          material_name: material.name,
          material_category: material.category,
          unit: material.unit,
          unit_price: material.unit_price,
          total_quantity: 0,
          total_cost: 0,
          usage_count: 0,
        };
      }
      materialSummary[material.id].total_quantity += mu.quantity;
      materialSummary[material.id].total_cost += mu.total_cost;
      materialSummary[material.id].usage_count++;

      const cat = material.category;
      if (!categorySummary[cat]) {
        categorySummary[cat] = {
          material_category: cat,
          total_quantity: 0,
          total_cost: 0,
          usage_count: 0,
          material_types: new Set<number>(),
        };
      }
      categorySummary[cat].total_quantity += mu.quantity;
      categorySummary[cat].total_cost += mu.total_cost;
      categorySummary[cat].usage_count++;
      categorySummary[cat].material_types.add(material.id);
    }

    if (course) {
      if (!courseSummary[course.id]) {
        courseSummary[course.id] = {
          course_id: course.id,
          course_name: course.name,
          course_category: course.category,
          total_material_cost: 0,
          usage_count: 0,
          class_count: new Set<number>(),
        };
      }
      courseSummary[course.id].total_material_cost += mu.total_cost;
      courseSummary[course.id].usage_count++;
      courseSummary[course.id].class_count.add(mu.schedule_id);
    }
  });

  const materialList = Object.values(materialSummary)
    .map((m) => ({ ...m, total_cost: Math.round(m.total_cost * 100) / 100 }))
    .sort((a: any, b: any) => b.total_cost - a.total_cost);

  const categoryList = Object.values(categorySummary)
    .map((c: any) => ({
      ...c,
      total_cost: Math.round(c.total_cost * 100) / 100,
      material_type_count: c.material_types.size,
    }))
    .sort((a: any, b: any) => b.total_cost - a.total_cost);

  const courseList = Object.values(courseSummary)
    .map((c: any) => ({
      ...c,
      total_material_cost: Math.round(c.total_material_cost * 100) / 100,
      class_count: c.class_count.size,
    }))
    .sort((a: any, b: any) => b.total_material_cost - a.total_material_cost);

  res.json({
    code: 0,
    data: {
      month: targetMonth,
      start_date: startOfMonth,
      end_date: endOfMonth,
      total_material_cost: Math.round(totalMaterialCost * 100) / 100,
      total_usage_count: totalUsageCount,
      total_class_count: scheduleIds.size,
      by_material: materialList,
      by_category: categoryList,
      by_course: courseList,
    },
  });
});

export default router;
