import { useState, useEffect, useMemo } from 'react';
import {
  Table, Button, Modal, Form, Input, InputNumber, Select, Space, Tag,
  message, Popconfirm, Card, Row, Col, Statistic, Badge, Alert, Tooltip
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, InboxOutlined,
  ImportOutlined, ExportOutlined, SearchOutlined, WarningOutlined
} from '@ant-design/icons';
import api from '../api';

export default function MaterialsPage() {
  const [list, setList] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form] = Form.useForm();
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [adjustForm] = Form.useForm();
  const [adjusting, setAdjusting] = useState<any>(null);

  const [filterCategory, setFilterCategory] = useState<string | undefined>();
  const [filterKeyword, setFilterKeyword] = useState<string>('');
  const [filterLowStock, setFilterLowStock] = useState(false);

  const loadData = async () => {
    const params: any = {};
    if (filterCategory) params.category = filterCategory;
    if (filterKeyword) params.keyword = filterKeyword;
    if (filterLowStock) params.low_stock = 'true';
    const [res, catRes] = await Promise.all([
      api.get('/materials', { params }),
      api.get('/materials/categories'),
    ]);
    setList(res.data || []);
    setCategories(catRes.data || []);
  };

  useEffect(() => { loadData(); }, [filterCategory, filterKeyword, filterLowStock]);

  const totalStock = useMemo(() => list.reduce((s, m) => s + m.stock, 0), [list]);
  const totalValue = useMemo(() => list.reduce((s, m) => s + m.stock * m.unit_price, 0), [list]);
  const lowStockCount = useMemo(() => list.filter((m) => m.stock <= 10).length, [list]);
  const categoryCount = categories.length;

  const handleSubmit = async (values: any) => {
    try {
      if (editing) {
        await api.put(`/materials/${editing.id}`, values);
        message.success('更新成功');
      } else {
        await api.post('/materials', values);
        message.success('添加成功');
      }
      setModalOpen(false);
      setEditing(null);
      form.resetFields();
      loadData();
    } catch (e: any) {
      message.error(e.response?.data?.message || '操作失败');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await api.delete(`/materials/${id}`);
      if (res.code === 0) {
        message.success('删除成功');
        loadData();
      } else {
        message.error(res.message);
      }
    } catch (e: any) {
      message.error(e.response?.data?.message || '删除失败');
    }
  };

  const handleAdjust = async (values: any) => {
    try {
      const res = await api.post(`/materials/${adjusting.id}/adjust-stock`, {
        delta: values.delta,
        note: values.note,
      });
      if (res.code === 0) {
        message.success(res.message);
        setAdjustModalOpen(false);
        adjusting(null);
        adjustForm.resetFields();
        loadData();
      } else {
        message.error(res.message);
      }
    } catch (e: any) {
      message.error(e.response?.data?.message || '调整失败');
    }
  };

  const categoryColorMap: any = {
    '画纸': 'blue',
    '画布': 'geekblue',
    '颜料': 'volcano',
    '书法': 'purple',
    '陶艺': 'orange',
    '皮料': 'brown',
    '皮具': 'magenta',
    '工具': 'cyan',
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '材料名称', dataIndex: 'name', render: (v: string, r: any) => (
      <Tooltip title={r.description}>
        <span style={{ fontWeight: 500 }}>{v}</span>
      </Tooltip>
    ) },
    { title: '分类', dataIndex: 'category', render: (v: string) => (
      <Tag color={categoryColorMap[v] || 'default'}>{v}</Tag>
    ), filters: categories.map(c => ({ text: c, value: c })), onFilter: (v: any, r: any) => r.category === v },
    { title: '单位', dataIndex: 'unit', width: 80 },
    { title: '单价(元)', dataIndex: 'unit_price', width: 100, render: (v: number) => `¥${v.toFixed(2)}`, sorter: (a: any, b: any) => a.unit_price - b.unit_price },
    { title: '库存', dataIndex: 'stock', width: 120, render: (v: number, r: any) => (
      <Badge
        status={v <= 0 ? 'error' : v <= 10 ? 'warning' : 'success'}
        text={
          <span style={{ color: v <= 0 ? '#ff4d4f' : v <= 10 ? '#fa8c16' : undefined, fontWeight: 500 }}>
            {v} {r.unit}
          </span>
        }
      />
    ), sorter: (a: any, b: any) => a.stock - b.stock },
    { title: '库存价值', width: 120, render: (_: any, r: any) => (
      <span style={{ color: '#1677ff', fontWeight: 500 }}>¥{(r.stock * r.unit_price).toFixed(2)}</span>
    ), sorter: (a: any, b: any) => a.stock * a.unit_price - b.stock * b.unit_price },
    { title: '备注', dataIndex: 'description', render: (v: string) => v || '-' },
    { title: '操作', key: 'action', width: 200, fixed: 'right' as const, render: (_: any, r: any) => (
      <Space size="small">
        <Button size="small" icon={<ImportOutlined />} onClick={() => {
          setAdjusting(r);
          adjustForm.setFieldsValue({ delta: 0, note: '' });
          setAdjustModalOpen(true);
        }}>调库存</Button>
        <Button size="small" icon={<EditOutlined />} onClick={() => {
          setEditing(r);
          form.setFieldsValue({ ...r });
          setModalOpen(true);
        }}>编辑</Button>
        <Popconfirm title="确定删除该材料？" onConfirm={() => handleDelete(r.id)}>
          <Button size="small" danger icon={<DeleteOutlined />}>删除</Button>
        </Popconfirm>
      </Space>
    ) },
  ];

  return (
    <div>
      {lowStockCount > 0 && (
        <Alert
          message={<span><WarningOutlined /> 库存预警：有 {lowStockCount} 种材料库存不足（≤10），请及时补充</span>}
          type="warning"
          showIcon
          closable
          style={{ marginBottom: 16 }}
        />
      )}

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={6}>
          <Card><Statistic title="材料种类" value={list.length} prefix={<InboxOutlined />} /></Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card><Statistic title="分类数" value={categoryCount} /></Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card><Statistic title="库存总量" value={totalStock} suffix="件" /></Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card><Statistic title="库存总价值(元)" value={totalValue} precision={2} valueStyle={{ color: '#1677ff' }} prefix={<ExportOutlined />} /></Card>
        </Col>
      </Row>

      <Space style={{ marginBottom: 16 }} wrap>
        <Input
          placeholder="搜索材料名称/备注"
          prefix={<SearchOutlined />}
          value={filterKeyword}
          onChange={(e) => setFilterKeyword(e.target.value)}
          style={{ width: 220 }}
          allowClear
        />
        <Select
          placeholder="按分类筛选"
          allowClear
          style={{ width: 150 }}
          value={filterCategory}
          onChange={setFilterCategory}
        >
          {categories.map(c => (
            <Select.Option key={c} value={c}>{c}</Select.Option>
          ))}
        </Select>
        <Button
          onClick={() => setFilterLowStock(!filterLowStock)}
          type={filterLowStock ? 'primary' : 'default'}
          danger={filterLowStock}
        >
          {filterLowStock ? '显示全部' : '库存不足'}
        </Button>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => { setEditing(null); form.resetFields(); setModalOpen(true); }}
        >
          新增材料
        </Button>
      </Space>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={list}
        scroll={{ x: 1100 }}
      />

      <Modal
        title={editing ? '编辑材料' : '新增材料'}
        open={modalOpen}
        onCancel={() => { setModalOpen(false); setEditing(null); form.resetFields(); }}
        onOk={() => form.submit()}
        width={520}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Row gutter={16}>
            <Col span={14}>
              <Form.Item name="name" label="材料名称" rules={[{ required: true, message: '请输入材料名称' }]}>
                <Input placeholder="例如：水彩画纸8K" />
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item name="category" label="分类" rules={[{ required: true, message: '请选择或输入分类' }]}>
                <Select
                  mode="tags"
                  placeholder="选择或输入"
                  options={categories.map(c => ({ label: c, value: c }))}
                  maxTagCount={1}
                />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="unit" label="计量单位" rules={[{ required: true, message: '请输入单位' }]}>
                <Input placeholder="例如：张、袋、套" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="unit_price" label="单价(元)" rules={[{ required: true, message: '请输入单价' }]}>
                <InputNumber min={0} step={0.5} precision={2} style={{ width: '100%' }} placeholder="请输入单价" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="stock" label="初始库存" rules={[{ required: true, message: '请输入库存数量' }]}>
            <InputNumber min={0} style={{ width: '100%' }} placeholder="请输入当前库存量" />
          </Form.Item>
          <Form.Item name="description" label="备注">
            <Input.TextArea rows={3} placeholder="补充说明（选填）" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={adjusting ? `调整库存 - ${adjusting.name}` : '调整库存'}
        open={adjustModalOpen}
        onCancel={() => { setAdjustModalOpen(false); setAdjusting(null); adjustForm.resetFields(); }}
        onOk={() => adjustForm.submit()}
        width={420}
      >
        {adjusting && (
          <>
            <Alert
              type="info"
              showIcon
              message={`当前库存：${adjusting.stock} ${adjusting.unit}`}
              style={{ marginBottom: 16 }}
            />
            <Form form={adjustForm} layout="vertical" onFinish={handleAdjust}>
              <Form.Item
                name="delta"
                label="调整数量"
                rules={[{ required: true, message: '请输入调整数量' }]}
                tooltip="正数为入库，负数为出库"
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="正数入库，负数出库"
                  min={-adjusting.stock}
                />
              </Form.Item>
              <Form.Item name="note" label="备注">
                <Input.TextArea rows={2} placeholder="调整原因（选填）" />
              </Form.Item>
            </Form>
          </>
        )}
      </Modal>
    </div>
  );
}
