import { useState, useEffect, useMemo } from 'react';
import { Table, Button, Modal, Form, Select, InputNumber, DatePicker, TimePicker, Tag, Space, Popconfirm, message, Divider, Tooltip, Card, Input, Alert } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, CheckCircleOutlined, TeamOutlined, InfoCircleOutlined, ShoppingCartOutlined } from '@ant-design/icons';
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
  const [usageForm] = Form.useForm();
  const [form] = Form.useForm();
  const [materials, setMaterials] = useState<any[]>([]);
  const [materialCategories, setMaterialCategories] = useState<string[]>([]);
  const [usageModalOpen, setUsageModalOpen] = useState(false);
  const [currentUsages, setCurrentUsages] = useState<any[]>([]);
  const [filterCategory, setFilterCategory] = useState<string | undefined>();
  const [selectedMaterial, setSelectedMaterial] = useState<any>(null);

  const loadData = async () => {
    const [s, c, t, rm, m, mc] = await Promise.all([
      api.get('/schedules'),
      api.get('/courses'),
      api.get('/teachers'),
      api.get('/classrooms'),
      api.get('/materials'),
      api.get('/materials/categories'),
    ]);
    setList(s.data || []);
    setCourses(c.data || []);
    setTeachers(t.data || []);
    setClassrooms(rm.data || []);
    setMaterials(m.data || []);
    setMaterialCategories(mc.data || []);
  };

  useEffect(() => { loadData(); }, []);

  const selectedClassroomCapacity = useMemo(() => {
    const classroomId = form.getFieldValue('classroom_id');
    if (!classroomId) return null;
    const cls = classrooms.find(c => c.id === classroomId);
    return cls?.capacity ?? null;
  }, [form, classrooms]);

  const handleClassroomChange = (classroomId: number) => {
    const cls = classrooms.find(c => c.id === classroomId);
    if (cls) {
      const currentMax = form.getFieldValue('max_students');
      if (currentMax === undefined || currentMax === null || currentMax > cls.capacity) {
        form.setFieldsValue({ max_students: cls.capacity });
      }
    }
  };

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

  const openUsage = async (record: any) => {
    setCurrentSchedule(record);
    setFilterCategory(undefined);
    setSelectedMaterial(null);
    usageForm.resetFields();
    const res = await api.get('/material-usages', { params: { schedule_id: record.id } });
    setCurrentUsages(res.data || []);
    setUsageModalOpen(true);
  };

  const handleAddUsage = async (values: any) => {
    try {
      const res = await api.post('/material-usages', {
        schedule_id: currentSchedule.id,
        material_id: values.material_id,
        quantity: values.quantity,
        note: values.note,
      });
      if (res.code === 0) {
        const info = res.data || {};
        message.success(`登记成功！总成本 ¥${info.total_cost?.toFixed(2)}，人均 ¥${info.per_student_cost?.toFixed(2)}（${info.student_count}人）`);
        usageForm.resetFields();
        setSelectedMaterial(null);
        loadData();
        openUsage(currentSchedule);
      } else {
        message.error(res.message);
      }
    } catch (e: any) {
      message.error(e.response?.data?.message || '登记失败');
    }
  };

  const handleDeleteUsage = async (id: number) => {
    try {
      const res = await api.delete(`/material-usages/${id}`);
      if (res.code === 0) {
        message.success(res.message);
        loadData();
        openUsage(currentSchedule);
      } else {
        message.error(res.message);
      }
    } catch (e: any) {
      message.error(e.response?.data?.message || '删除失败');
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
    { title: '操作', key: 'action', width: 360, render: (_: any, r: any) => (
      <Space size="small">
        <Button size="small" icon={<TeamOutlined />} onClick={() => openAttendance(r)}>签到</Button>
        <Button size="small" icon={<ShoppingCartOutlined />} type={r.status === 'completed' ? 'primary' : 'default'} onClick={() => openUsage(r)}>耗材登记</Button>
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
            <Select onChange={handleClassroomChange} placeholder="请选择教室">
              {classrooms.map(r => (
                <Select.Option key={r.id} value={r.id}>
                  {r.name} <Tag color="blue" style={{ marginLeft: 8 }}>容量{r.capacity}人</Tag>
                </Select.Option>
              ))}
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
          <Form.Item
            name="max_students"
            label={
              <Space>
                人数上限
                {selectedClassroomCapacity !== null && (
                  <Tooltip title={`所选教室最大容量为 ${selectedClassroomCapacity} 人`}>
                    <Tag color="info">教室容量：{selectedClassroomCapacity}人</Tag>
                  </Tooltip>
                )}
              </Space>
            }
            rules={[
              { required: true, message: '请输入人数上限' },
              {
                validator: (_, value) => {
                  if (selectedClassroomCapacity !== null && value > selectedClassroomCapacity) {
                    return Promise.reject(new Error(`人数上限不能超过教室容量(${selectedClassroomCapacity}人)`));
                  }
                  if (value < 1) {
                    return Promise.reject(new Error('人数上限至少为1'));
                  }
                  return Promise.resolve();
                }
              }
            ]}
          >
            <InputNumber
              min={1}
              max={selectedClassroomCapacity ?? undefined}
              style={{ width: '100%' }}
              placeholder={selectedClassroomCapacity ? `最大值：${selectedClassroomCapacity}` : '请先选择教室'}
            />
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

      <Modal
        title={currentSchedule ? `耗材登记 - ${currentSchedule.course_name}` : '耗材登记'}
        open={usageModalOpen}
        onCancel={() => { setUsageModalOpen(false); setFilterCategory(undefined); setSelectedMaterial(null); }}
        footer={null}
        width={760}
      >
        {currentSchedule && (
          <div>
            <Card size="small" style={{ marginBottom: 16 }}>
              <p style={{ margin: 0 }}>
                <strong>课程：</strong>{currentSchedule.course_name}（{currentSchedule.course_category}）
                | <strong>老师：</strong>{currentSchedule.teacher_name}
                | <strong>时间：</strong>{currentSchedule.date} {currentSchedule.start_time}-{currentSchedule.end_time}
                | <strong>教室：</strong>{currentSchedule.classroom_name}
              </p>
            </Card>

            <h4 style={{ marginBottom: 8 }}>本次课已登记耗材</h4>
            {currentUsages.length > 0 ? (
              <>
                <Table
                  size="small"
                  rowKey="id"
                  dataSource={currentUsages}
                  pagination={false}
                  columns={[
                    { title: '材料', dataIndex: 'material_name' },
                    { title: '分类', dataIndex: 'material_category', render: (v: string) => <Tag>{v}</Tag> },
                    { title: '用量', render: (_: any, r: any) => `${r.quantity} ${r.material_unit}` },
                    { title: '单价', render: (_: any, r: any) => `¥${r.unit_price?.toFixed(2)}` },
                    { title: '总成本', render: (_: any, r: any) => <span style={{ color: '#1677ff', fontWeight: 500 }}>¥{r.total_cost?.toFixed(2)}</span> },
                    { title: '均摊人数', dataIndex: 'student_count', render: (v: number) => `${v}人` },
                    { title: '人均成本', render: (_: any, r: any) => <span style={{ color: '#fa8c16' }}>¥{r.per_student_cost?.toFixed(2)}</span> },
                    { title: '操作', width: 80, render: (_: any, r: any) => (
                      <Popconfirm title="确定删除？删除后库存将恢复" onConfirm={() => handleDeleteUsage(r.id)}>
                        <Button size="small" danger type="link">删除</Button>
                      </Popconfirm>
                    ) },
                  ]}
                />
                <div style={{ marginTop: 8, padding: 8, background: '#f5f5f5', borderRadius: 4 }}>
                  <strong>总成本合计：</strong>
                  <span style={{ color: '#cf1322', fontSize: 16, fontWeight: 600 }}>
                    ¥{currentUsages.reduce((s, r) => s + r.total_cost, 0).toFixed(2)}
                  </span>
                </div>
              </>
            ) : (
              <div style={{ padding: 16, textAlign: 'center', color: '#999', border: '1px dashed #d9d9d9', borderRadius: 4, marginBottom: 16 }}>
                暂未登记耗材
              </div>
            )}

            <Divider style={{ margin: '12px 0' }} />
            <h4 style={{ marginBottom: 8 }}>添加耗材使用</h4>
            <Form form={usageForm} layout="vertical" onFinish={handleAddUsage}>
              <Space style={{ marginBottom: 8 }}>
                <Select
                  placeholder="按分类筛选材料"
                  allowClear
                  style={{ width: 150 }}
                  value={filterCategory}
                  onChange={setFilterCategory}
                >
                  {materialCategories.map(c => (
                    <Select.Option key={c} value={c}>{c}</Select.Option>
                  ))}
                </Select>
                <Select
                  placeholder="搜索选择材料..."
                  showSearch
                  style={{ width: 350 }}
                  value={selectedMaterial?.id || undefined}
                  filterOption={(input, option: any) =>
                    (option?.children || '').toString().toLowerCase().includes(input.toLowerCase())
                  }
                  onChange={(id) => {
                    usageForm.setFieldsValue({ material_id: id });
                    setSelectedMaterial(materials.find(m => m.id === id));
                  }}
                  optionFilterProp="children"
                >
                  {materials
                    .filter(m => !filterCategory || m.category === filterCategory)
                    .map(m => (
                      <Select.Option key={m.id} value={m.id}>
                        {m.name} [{m.category}] - 库存:{m.stock}{m.unit} - ¥{m.unit_price.toFixed(2)}/{m.unit}
                      </Select.Option>
                    ))}
                </Select>
              </Space>
              <Form.Item name="material_id" hidden rules={[{ required: true, message: '请选择材料' }]}>
                <Input />
              </Form.Item>
              {selectedMaterial && (
                <Alert
                  type="info"
                  showIcon
                  message={`${selectedMaterial.name} | 当前库存：${selectedMaterial.stock}${selectedMaterial.unit} | 单价：¥${selectedMaterial.unit_price.toFixed(2)}/${selectedMaterial.unit}`}
                  style={{ marginBottom: 16 }}
                />
              )}
              <Space style={{ width: '100%' }} align="start">
                <Form.Item name="quantity" label="使用数量" rules={[{ required: true, message: '请输入数量' }]} style={{ marginBottom: 0, width: 200 }}>
                  <InputNumber
                    min={0.01}
                    step={1}
                    precision={2}
                    style={{ width: '100%' }}
                    placeholder="请输入数量"
                    max={selectedMaterial?.stock}
                  />
                </Form.Item>
                {selectedMaterial && usageForm.getFieldValue('quantity') ? (
                  <div style={{ paddingTop: 30 }}>
                    <Tag color="blue">预计成本：¥{(selectedMaterial.unit_price * Number(usageForm.getFieldValue('quantity') || 0)).toFixed(2)}</Tag>
                  </div>
                ) : null}
              </Space>
              <Form.Item name="note" label="备注" style={{ marginTop: 16, marginBottom: 8 }}>
                <Input.TextArea rows={2} placeholder="选填" />
              </Form.Item>
              <Form.Item style={{ marginTop: 8 }}>
                <Space>
                  <Button type="primary" htmlType="submit" icon={<PlusOutlined />}>
                    登记入账
                  </Button>
                  <Button onClick={() => { usageForm.resetFields(); setSelectedMaterial(null); }}>重置</Button>
                </Space>
              </Form.Item>
            </Form>
          </div>
        )}
      </Modal>
    </div>
  );
}
