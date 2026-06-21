import { useState, useEffect } from 'react';
import { Table, Select, Space, Tag, Popconfirm, message, DatePicker, Alert } from 'antd';
import { DeleteOutlined, InfoCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../api';

export default function AttendancesPage() {
  const [list, setList] = useState<any[]>([]);
  const [scheduleId, setScheduleId] = useState<number | undefined>();
  const [schedules, setSchedules] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState<any>(null);

  const loadData = async () => {
    const params: any = {};
    if (scheduleId) params.schedule_id = scheduleId;
    const res = await api.get('/attendances', { params });
    let data = res.data || [];
    if (dateRange && dateRange.length === 2) {
      data = data.filter((a: any) => {
        const d = dayjs(a.schedule_date);
        return d.isAfter(dateRange[0]) && d.isBefore(dateRange[1].add(1, 'day'));
      });
    }
    setList(data);
  };

  useEffect(() => {
    api.get('/schedules').then(r => setSchedules(r.data || []));
  }, []);

  useEffect(() => { loadData(); }, [scheduleId, dateRange]);

  const handleDelete = async (id: number) => {
    try {
      const res = await api.delete(`/attendances/${id}`);
      if (res.code === 0) {
        message.success('删除成功，课时已回滚');
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
    { title: '课程', dataIndex: 'course_name' },
    { title: '课次日期', dataIndex: 'schedule_date', sorter: (a: any, b: any) => dayjs(a.schedule_date).unix() - dayjs(b.schedule_date).unix() },
    { title: '时段', render: (_: any, r: any) => `${r.start_time} - ${r.end_time}` },
    { title: '报名模式', dataIndex: 'enroll_mode', render: (m: string) => m === 'single' ? <Tag color="green">次课</Tag> : <Tag color="purple">学期课</Tag> },
    { title: '签到后剩余', dataIndex: 'remaining_sessions', render: (v: number, r: any) => `${v}${r.enroll_mode === 'semester' ? '周' : '次'}` },
    { title: '签到状态', dataIndex: 'status', render: (s: string) => {
      const map: any = { present: <Tag color="green">出勤</Tag>, absent: <Tag color="red">缺勤</Tag>, leave: <Tag color="orange">请假</Tag> };
      return map[s];
    } },
    { title: '签到时间', dataIndex: 'sign_in_time' },
    { title: '操作', key: 'action', width: 100, render: (_: any, r: any) => (
      <Popconfirm title="确定删除？删除后将回滚课时" onConfirm={() => handleDelete(r.id)}>
        <Tag color="red" style={{ cursor: 'pointer' }} icon={<DeleteOutlined />}>撤销</Tag>
      </Popconfirm>
    ) },
  ];

  return (
    <div>
      <Alert
        type="info"
        showIcon
        icon={<InfoCircleOutlined />}
        message="消次规则"
        description={<>次课学员按<strong>每次出勤消1次</strong>；学期课学员<strong>按学期锁定名额，过期不补</strong>，仅记录出勤进度。</>}
        style={{ marginBottom: 16 }}
      />
      <Space style={{ marginBottom: 16 }}>
        <Select placeholder="按课次筛选" allowClear style={{ width: 300 }} onChange={setScheduleId}>
          {schedules.map(s => (
            <Select.Option key={s.id} value={s.id}>
              {s.date} {s.start_time}-{s.end_time} | {s.course_name} | {s.teacher_name}
            </Select.Option>
          ))}
        </Select>
        <DatePicker.RangePicker onChange={setDateRange} />
      </Space>
      <Table rowKey="id" columns={columns} dataSource={list} />
    </div>
  );
}
