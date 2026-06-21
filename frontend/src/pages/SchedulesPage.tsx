import { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Select, InputNumber, DatePicker, TimePicker, Tag, Space, Popconfirm, message, Divider } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, CheckCircleOutlined, TeamOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../api';

export default function SchedulesPage() {
  const [list, setList] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [attendanceOpen, setAttendanceOpen] = useState(false);
  const [currentSchedule, setCurrentSchedule] = useState<any>(null);
  const [attendanceList, setAttendanceList] = useState<any[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [attendanceForm] = Form.useForm();
  const [form] = Form.useForm();

  const loadData = async () => {
    const [s, c, t, rm] = await Promise.all([
      api.get('/schedules'),
      api.get('/courses'),
      api.get('/teachers'),
      api.get('/classrooms'),
    ]);
    setList(s.data || []);
    setCourses(c.data || []);
    setTeachers(t.data || []);
    setClassrooms(rm.data || []);
  };

  useEffect(() => { loadData(); }, []);

  const handleSubmit = async (values: any) => {
    try {
      const data = {
        ...values,
        date: values.date.format('YYYY-MM-DD'),
        start_time: values.start_time.format('HH:mm'),
        end_time: values.end_time.format('HH:mm'),
      };
      if (editing) {
        await api.put(`/schedules/${editing.id}`, { ...data, status: editing.status });
        message.success('更新成功');
      } else {
        await api.post('/schedules', data);
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

  const handleComplete = async (record: any) => {
    try {
      const res = await api.post(`/schedules/${record.id}/complete`);
      if (res.code === 0) {
        message.success('课程已完成，课酬已生成');
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
      const res = await api.delete(`/schedules/${id}`);
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

  const openAttendance = async (record: any) => {
    setCurrentSchedule(record);
    const [att, enr] = await Promise.all([
      api.get('/attendances', { params: { schedule_id: record.id } }),
      api.get('/enrollments', { params: { course_id: record.course_id, status: 'active' } }),
    ]);
    setAttendanceList(att.data || []);
    setEnrollments((enr.data || []).filter((e: any) => !att.data?.find((a: any) => a.enrollment_id === e.id)));
    setAttendanceOpen(true);
  };

  const handleAddAttendance = async (values: any) => {
    try {
      const res = await api.post('/attendances', {
        enrollment_id: values.enrollment_id,
        schedule_id: currentSchedule.id,
        status: values.status,
      });
      if (res.code === 0) {
        message.success('签到成功');
        attendanceForm.resetFields();
        openAttendance(currentSchedule);
      } else {
        message.error(res.message);
      }
    } catch (e: any) {
      message.error(e.response?.data?.message || '签到失败');
    }
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '课程', dataIndex: 'course_name', render: (v: string, r: any) => `${v}(${r.course_category})` },
    { title: '老师', dataIndex: 'teacher_name' },
    { title: '教室', dataIndex: 'classroom_name' },
    { title: '日期', dataIndex: 'date', sorter: (a: any, b: any) => dayjs(a.date).unix() - dayjs(b.date).unix() },
    { title: '时段', render: (_: any, r: any) => `${r.start_time} - ${r.end_time}` },
    { title: '报名人数', render: (_: any, r: any) => `${r.enrolled_count || 0}/${r.max_students}` },
    { title: '状态', dataIndex: 'status', render: (s: string) => {
      const map: any = { scheduled: <Tag color="blue">已排课</Tag>, completed: <Tag color="green">已完成</Tag>, cancelled: <Tag color="red">已取消</Tag> };
      return map[s];
    } },
    { title: '操作', key: 'action', width: 280, render: (_: any, r: any) => (
      <Space size="small">
        <Button size="small" icon={<TeamOutlined />} onClick={() => openAttendance(r)}>签到</Button>
        {r.status === 'scheduled' && (
          <>
            <Button size="small" type="primary" icon={<CheckCircleOutlined />} onClick={() => handleComplete(r)}>完成</Button>
            <Button size="small" icon={<EditOutlined />} onClick={() => {
              setEditing(r);
              form.setFieldsValue({
                ...r,
                date: dayjs(r.date),
                start_time: dayjs(r.start_time, 'HH:mm'),
                end_time: dayjs(r.end_time, 'HH:mm'),
              });
              setModalOpen(true);
            }}>编辑</Button>
            <Popconfirm title="确定删除？" onConfirm={() => handleDelete(r.id)}>
              <Button size="small" danger icon={<DeleteOutlined />}>删除</Button>
            </Popconfirm>
          </>
        )}
      </Space>
    ) },
  ];

  return (
    <div>
      <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); form.resetFields(); setModalOpen(true); }} style={{ marginBottom: 16 }}>新增排课</Button>
      <Table rowKey="id" columns={columns} dataSource={list} />

      <Modal title={editing ? '编辑排课' : '新增排课'} open={modalOpen} onCancel={() => { setModalOpen(false); setEditing(null); form.resetFields(); }} onOk={() => form.submit()} width={600}>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="course_id" label="课程" rules={[{ required: true }]}>
            <Select>
              {courses.map(c => <Select.Option key={c.id} value={c.id}>{c.name}({c.category})</Select.Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="teacher_id" label="老师" rules={[{ required: true }]}>
            <Select>
              {teachers.map(t => <Select.Option key={t.id} value={t.id}>{t.name} - {t.specialty}</Select.Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="classroom_id" label="教室" rules={[{ required: true }]}>
            <Select>
              {classrooms.map(r => <Select.Option key={r.id} value={r.id}>{r.name} (容量{r.capacity})</Select.Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="date" label="日期" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Space style={{ width: '100%' }}>
            <Form.Item name="start_time" label="开始时间" rules={[{ required: true }]} style={{ flex: 1 }}>
              <TimePicker format="HH:mm" style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="end_time" label="结束时间" rules={[{ required: true }]} style={{ flex: 1 }}>
              <TimePicker format="HH:mm" style={{ width: '100%' }} />
            </Form.Item>
          </Space>
          <Form.Item name="max_students" label="人数上限" rules={[{ required: true }]}>
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="学员签到" open={attendanceOpen} onCancel={() => setAttendanceOpen(false)} footer={null} width={700}>
        {currentSchedule && (
          <div>
            <p><strong>课程：</strong>{currentSchedule.course_name} | <strong>老师：</strong>{currentSchedule.teacher_name} | <strong>时间：</strong>{currentSchedule.date} {currentSchedule.start_time}-{currentSchedule.end_time}</p>
            <Divider style={{ margin: '12px 0' }} />
            <h4>已签到学员</h4>
            <Table size="small" rowKey="id" dataSource={attendanceList} pagination={false} columns={[
              { title: '学员', dataIndex: 'student_name' },
              { title: '报名模式', dataIndex: 'enroll_mode', render: (m: string) => m === 'single' ? '次课' : '学期课' },
              { title: '剩余课时', dataIndex: 'remaining_sessions' },
              { title: '状态', dataIndex: 'status', render: (s: string) => {
                const map: any = { present: <Tag color="green">出勤</Tag>, absent: <Tag color="red">缺勤</Tag>, leave: <Tag color="orange">请假</Tag> };
                return map[s];
              } },
              { title: '签到时间', dataIndex: 'sign_in_time' },
            ]} />
            {enrollments.length > 0 && (
              <>
                <Divider style={{ margin: '12px 0' }} />
                <h4>添加签到</h4>
                <Form form={attendanceForm} layout="inline" onFinish={handleAddAttendance}>
                  <Form.Item name="enrollment_id" rules={[{ required: true, message: '请选择学员' }]}>
                    <Select style={{ width: 250 }} placeholder="选择学员">
                      {enrollments.map((e: any) => (
                        <Select.Option key={e.id} value={e.id}>
                          {e.student_name} - {e.enroll_mode === 'single' ? `次课(剩${e.remaining_sessions})` : `学期课(剩${e.remaining_sessions})`}
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                  <Form.Item name="status" initialValue="present">
                    <Select style={{ width: 120 }}>
                      <Select.Option value="present">出勤</Select.Option>
                      <Select.Option value="leave">请假</Select.Option>
                      <Select.Option value="absent">缺勤</Select.Option>
                    </Select>
                  </Form.Item>
                  <Form.Item>
                    <Button type="primary" htmlType="submit">签到</Button>
                  </Form.Item>
                </Form>
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
