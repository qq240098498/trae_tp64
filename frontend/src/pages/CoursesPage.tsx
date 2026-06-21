import { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Select, InputNumber, Tag, Space, Popconfirm, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import api from '../api';

const categories = ['水彩', '油画', '书法', '陶艺', '皮具'];

export default function CoursesPage() {
  const [list, setList] = useState<any[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form] = Form.useForm();

  const loadData = async (params?: any) => {
    const res = await api.get('/courses', { params });
    setList(res.data || []);
  };

  useEffect(() => { loadData(); }, []);

  const handleSubmit = async (values: any) => {
    try {
      if (editing) {
        await api.put(`/courses/${editing.id}`, values);
        message.success('更新成功');
      } else {
        await api.post('/courses', values);
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

  const handleEdit = (record: any) => {
    setEditing(record);
    form.setFieldsValue(record);
    setModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await api.delete(`/courses/${id}`);
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

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '课程名称', dataIndex: 'name' },
    { title: '分类', dataIndex: 'category', render: (c: string) => <Tag color="blue">{c}</Tag> },
    { title: '模式', dataIndex: 'mode', render: (m: string) => m === 'single' ? <Tag color="green">次课</Tag> : <Tag color="purple">学期课</Tag> },
    { title: '价格(元)', dataIndex: 'price', render: (p: number) => `¥${p}` },
    { title: '次课课时', dataIndex: 'single_count', render: (v: number, r: any) => r.mode === 'single' ? `${v}次` : '-' },
    { title: '学期周数', dataIndex: 'semester_weeks', render: (v: number, r: any) => r.mode === 'semester' ? `${v}周` : '-' },
    { title: '描述', dataIndex: 'description' },
    { title: '操作', key: 'action', width: 150, render: (_: any, r: any) => (
      <Space>
        <Button icon={<EditOutlined />} size="small" onClick={() => handleEdit(r)}>编辑</Button>
        <Popconfirm title="确定删除？" onConfirm={() => handleDelete(r.id)}>
          <Button icon={<DeleteOutlined />} size="small" danger>删除</Button>
        </Popconfirm>
      </Space>
    ) },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); form.resetFields(); setModalOpen(true); }}>新增课程</Button>
        <Select placeholder="筛选分类" allowClear style={{ width: 140 }} onChange={(v) => loadData(v ? { category: v } : undefined)}>
          {categories.map(c => <Select.Option key={c} value={c}>{c}</Select.Option>)}
        </Select>
        <Select placeholder="筛选模式" allowClear style={{ width: 140 }} onChange={(v) => loadData(v ? { mode: v } : undefined)}>
          <Select.Option value="single">次课</Select.Option>
          <Select.Option value="semester">学期课</Select.Option>
        </Select>
      </Space>

      <Table rowKey="id" columns={columns} dataSource={list} />

      <Modal title={editing ? '编辑课程' : '新增课程'} open={modalOpen} onCancel={() => { setModalOpen(false); setEditing(null); form.resetFields(); }} onOk={() => form.submit()}>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="name" label="课程名称" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="category" label="分类" rules={[{ required: true }]}>
            <Select>
              {categories.map(c => <Select.Option key={c} value={c}>{c}</Select.Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="mode" label="授课模式" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="single">次课</Select.Option>
              <Select.Option value="semester">学期课</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="price" label="价格(元)" rules={[{ required: true }]}><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
          <Form.Item noStyle shouldUpdate={(p, c) => p.mode !== c.mode}>
            {({ getFieldValue }) => getFieldValue('mode') === 'single' ? (
              <Form.Item name="single_count" label="次课课时数" rules={[{ required: true }]}><InputNumber min={1} style={{ width: '100%' }} /></Form.Item>
            ) : (
              <Form.Item name="semester_weeks" label="学期周数" rules={[{ required: true }]}><InputNumber min={1} style={{ width: '100%' }} /></Form.Item>
            )}
          </Form.Item>
          <Form.Item name="description" label="描述"><Input.TextArea rows={3} /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
