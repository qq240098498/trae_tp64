import { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Select, Space, Popconfirm, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import api from '../api';

export default function StudentsPage() {
  const [list, setList] = useState<any[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [keyword, setKeyword] = useState('');
  const [form] = Form.useForm();

  const loadData = async (kw?: string) => {
    const res = await api.get('/students', { params: kw ? { keyword: kw } : undefined });
    setList(res.data || []);
  };

  useEffect(() => { loadData(); }, []);

  const handleSubmit = async (values: any) => {
    try {
      if (editing) {
        await api.put(`/students/${editing.id}`, values);
        message.success('更新成功');
      } else {
        await api.post('/students', values);
        message.success('添加成功');
      }
      setModalOpen(false);
      setEditing(null);
      form.resetFields();
      loadData(keyword);
    } catch (e: any) {
      message.error(e.response?.data?.message || '操作失败');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await api.delete(`/students/${id}`);
      if (res.code === 0) {
        message.success('删除成功');
        loadData(keyword);
      } else {
        message.error(res.message);
      }
    } catch (e: any) {
      message.error(e.response?.data?.message || '删除失败');
    }
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '姓名', dataIndex: 'name' },
    { title: '性别', dataIndex: 'gender', render: (g: string) => g || '-' },
    { title: '手机号', dataIndex: 'phone' },
    { title: '生日', dataIndex: 'birthday', render: (b: string) => b || '-' },
    { title: '备注', dataIndex: 'note', render: (n: string) => n || '-' },
    { title: '操作', key: 'action', width: 150, render: (_: any, r: any) => (
      <Space>
        <Button icon={<EditOutlined />} size="small" onClick={() => { setEditing(r); form.setFieldsValue(r); setModalOpen(true); }}>编辑</Button>
        <Popconfirm title="确定删除？" onConfirm={() => handleDelete(r.id)}>
          <Button icon={<DeleteOutlined />} size="small" danger>删除</Button>
        </Popconfirm>
      </Space>
    ) },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); form.resetFields(); setModalOpen(true); }}>新增学员</Button>
        <Input.Search placeholder="搜索姓名或手机号" allowClear enterButton={<SearchOutlined />} onSearch={(v) => { setKeyword(v); loadData(v); }} style={{ width: 300 }} />
      </Space>
      <Table rowKey="id" columns={columns} dataSource={list} />

      <Modal title={editing ? '编辑学员' : '新增学员'} open={modalOpen} onCancel={() => { setModalOpen(false); setEditing(null); form.resetFields(); }} onOk={() => form.submit()}>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="name" label="姓名" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="phone" label="手机号" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="gender" label="性别">
            <Select allowClear>
              <Select.Option value="男">男</Select.Option>
              <Select.Option value="女">女</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="birthday" label="生日"><Input placeholder="YYYY-MM-DD" /></Form.Item>
          <Form.Item name="note" label="备注"><Input.TextArea rows={3} /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
