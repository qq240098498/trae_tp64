import { Router, Request, Response } from 'express';
import { tables } from '../db';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  const { category, keyword, low_stock } = req.query;
  const materials = tables.materials.all((m) => {
    let ok = true;
    if (category) ok = ok && m.category === category;
    if (keyword) {
      const kw = String(keyword).toLowerCase();
      ok = ok && (m.name.toLowerCase().includes(kw) || (m.description?.toLowerCase() || '').includes(kw));
    }
    if (low_stock === 'true') ok = ok && m.stock <= 10;
    return ok;
  });
  res.json({ code: 0, data: materials });
});

router.get('/categories', (req: Request, res: Response) => {
  const materials = tables.materials.all();
  const categories = Array.from(new Set(materials.map((m) => m.category))).sort();
  res.json({ code: 0, data: categories });
});

router.get('/:id', (req: Request, res: Response) => {
  const material = tables.materials.get(Number(req.params.id));
  if (!material) {
    return res.json({ code: 404, message: '材料不存在' });
  }
  res.json({ code: 0, data: material });
});

router.post('/', (req: Request, res: Response) => {
  const { name, category, unit, unit_price, stock, description } = req.body;
  if (!name || !category || !unit || unit_price === undefined || stock === undefined) {
    return res.json({ code: 400, message: '缺少必要参数' });
  }
  if (Number(unit_price) < 0) {
    return res.json({ code: 400, message: '单价不能为负数' });
  }
  if (Number(stock) < 0) {
    return res.json({ code: 400, message: '库存不能为负数' });
  }
  const material = tables.materials.insert({
    name,
    category,
    unit,
    unit_price: Number(unit_price),
    stock: Number(stock),
    description,
  });
  res.json({ code: 0, data: { id: material.id } });
});

router.put('/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { name, category, unit, unit_price, stock, description } = req.body;

  if (!tables.materials.get(id)) {
    return res.json({ code: 404, message: '材料不存在' });
  }

  const data: any = {};
  if (name !== undefined) data.name = name;
  if (category !== undefined) data.category = category;
  if (unit !== undefined) data.unit = unit;
  if (unit_price !== undefined) {
    const price = Number(unit_price);
    if (price < 0) return res.json({ code: 400, message: '单价不能为负数' });
    data.unit_price = price;
  }
  if (stock !== undefined) {
    const s = Number(stock);
    if (s < 0) return res.json({ code: 400, message: '库存不能为负数' });
    data.stock = s;
  }
  if (description !== undefined) data.description = description;

  tables.materials.update(id, data);
  res.json({ code: 0, message: '更新成功' });
});

router.post('/:id/adjust-stock', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { delta, note } = req.body;

  if (!tables.materials.get(id)) {
    return res.json({ code: 404, message: '材料不存在' });
  }
  if (delta === undefined || isNaN(Number(delta))) {
    return res.json({ code: 400, message: '请输入有效的库存调整数量' });
  }

  const success = tables.materials.updateStock(id, Number(delta));
  if (!success) {
    return res.json({ code: 400, message: '库存不足，调整失败' });
  }
  res.json({ code: 0, message: note ? `库存已调整：${delta > 0 ? '+' : ''}${delta}` : '库存调整成功' });
});

router.delete('/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const usageCount = tables.material_usages.all((mu) => mu.material_id === id).length;
  if (usageCount > 0) {
    return res.json({ code: 400, message: '该材料已有使用记录，无法删除' });
  }
  const success = tables.materials.delete(id);
  if (!success) {
    return res.json({ code: 404, message: '材料不存在' });
  }
  res.json({ code: 0, message: '删除成功' });
});

export default router;
