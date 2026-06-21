import { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Select, InputNumber, Tag, Space, Popconfirm, message, DatePicker } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../api';

export default function EnrollmentsPage() {
  const [list, setList] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  const loadData = async () => {
    const [e, s, c] = await Promise.all([
      api.get('/enrollments'),
      api.get('/students'),
      api.get('/courses'),
    ]);
    setList(e.data || []);
    setStudents(s.data || []);
    setCourses(c.data || []);
  };

  useEffect(() => { loadData(); }, []);

  const handleSubmit = async (values: any) => {
    try {
      const course = courses.find(c => c.id === values.course_id);
      const data = {
        ...values,
        semester_start_date: values.semester_start_date?.format('YYYY-MM-DD'),
        semester_end_date: values.semester_end_date?.format('YYYY-MM-DD'),
      };
      const res = await api.post('/enrollments', data);
      if (res.code === 0) {
        message.success('报名成功');
        setModalOpen(false);
        form.resetFields();
        loadData();
      } else {
        message.error(res.message);
      }
    } catch (e: any) {
      message.error(e.response?.data?.message || '操作失败');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await api.delete(`/enrollments/${id}`);
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
    { title: '学员', dataIndex: 'student_name' },
    { title: '手机号', dataIndex: 'student_phone' },
    { title: '课程', dataIndex: 'course_name', render: (v: string, r: any) => `${v}(${r.course_category})` },
    { title: '报名模式', dataIndex: 'enroll_mode', render: (m: string) => m === 'single' ? <Tag color="green">次课</Tag> : <Tag color="purple">学期课</Tag> },
    { title: '课时进度', render: (_: any, r: any) => `${r.total_sessions - r.remaining_sessions}/${r.total_sessions}` },
    { title: '已缴费用(元)', dataIndex: 'paid_amount' },
    { title: '学期有效期', render: (_: any, r: any) => r.enroll_mode === 'semester' ? `${r.semester_start_date} ~ ${r.semester_end_date}` : '-' },
    { title: '状态', dataIndex: 'status', render: (s: string) => {
      const map: any = { active: <Tag color="blue">有效</Tag>, expired: <Tag color="orange">已过期</Tag>, completed: <Tag color="green">已完成</Tag>, refunded: <Tag color="red">已退款</Tag> };
      return map[s];
    } },
    { title: '操作', key: 'action', width: 100, render: (_: any, r: any) => (
      <Space>
        <Popconfirm title="确定删除该报名记录？" onConfirm={() => handleDelete(r.id)}>
          <Button icon={<DeleteOutlined />} size="small" danger>删除</Button>
        </Popconfirm>
      </Space>
    ) },
  ];

  return (
    <div>
      <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setModalOpen(true); }} style={{ marginBottom: 16 }}>新增报名</Button>
      <Table rowKey="id" columns={columns} dataSource={list} />

      <Modal title="新增报名" open={modalOpen} onCancel={() => { setModalOpen(false); form.resetFields(); }} onOk={() => form.submit()} width={500}>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="student_id" label="学员" rules={[{ required: true }]}>
            <Select showSearch optionFilterProp="label">
              {students.map(s => <Select.Option key={s.id} value={s.id} label={s.name}>{s.name} ({s.phone})</Select.Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="course_id" label="课程" rules={[{ required: true }]}>
            <Select onChange={() => form.setFieldsValue({ enroll_mode: undefined, paid_amount: undefined, semester_start_date: undefined, semester_end_date: undefined })}>
              {courses.map(c => <Select.Option key={c.id} value={c.id} data-mode={c.mode} data-price={c.price}>{c.name}({c.category}) - {c.mode === 'single' ? '次课' : '学期课'} ¥{c.price}</Select.Option>)}
            </Select>
          </Form.Item>
          <Form.Item noStyle shouldUpdate={(p, c) => p.course_id !== c.course_id}>
            {({ getFieldValue }) => {
              const course = courses.find(c => c.id === getFieldValue('course_id'));
              if (!course) return null;
              return (
                <>
                  <Form.Item name="enroll_mode" label="报名模式" rules={[{ required: true }]} initialValue={course.mode}>
                    <Select>
                      <Select.Option value={course.mode}>{course.mode === 'single' ? '次课' : '学期课'}</Select.Option>
                    </Select>
                  </Form.Item>
                  <Form.Item name="paid_amount" label="缴费金额(元)" rules={[{ required: true }]} initialValue={course.price}>
                    <InputNumber min={0} style={{ width: '100%' }} />
                  </Form.Item>
                  {course.mode === 'semester' && (
                    <Space style={{ width: '100%' }}>
                      <Form.Item name="semester_start_date" label="学期开始" rules={[{ required: true }]} style={{ flex: 1 }} initialValue={dayjs()}>
                        <DatePicker style={{ width: '100%' }} />
                      </Form.Item>
                      <Form.Item name="semester_end_date" label="学期结束" rules={[{ required: true }]} style={{ flex: 1 }} initialValue={dayjs().add(course.semester_weeks || 12, 'week')}>
                        <DatePicker style={{ width: '100%' }} />
                      </Form.Item>
                    </Space>
                  )}
                </>
              );
            }}
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
