import { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Table, Tag } from 'antd';
import { BookOutlined, CalendarOutlined, TeamOutlined, MoneyCollectOutlined } from '@ant-design/icons';
import api from '../api';

export default function DashboardPage() {
  const [stats, setStats] = useState({ courses: 0, schedules: 0, students: 0, pendingPayments: 0 });
  const [recentSchedules, setRecentSchedules] = useState<any[]>([]);
  const [recentAttendances, setRecentAttendances] = useState<any[]>([]);

  const loadData = async () => {
    const [courses, schedules, students, payments] = await Promise.all([
      api.get('/courses'),
      api.get('/schedules'),
      api.get('/students'),
      api.get('/payments', { params: { status: 'pending' } }),
    ]);
    setStats({
      courses: courses.data?.length || 0,
      schedules: schedules.data?.length || 0,
      students: students.data?.length || 0,
      pendingPayments: (payments.data || []).reduce((sum: number, p: any) => sum + p.amount, 0),
    });
    setRecentSchedules((schedules.data || []).slice(0, 5));

    const attendancesRes = await api.get('/attendances');
    setRecentAttendances((attendancesRes.data || []).slice(0, 5));
  };

  useEffect(() => {
    loadData();
  }, []);

  const scheduleColumns = [
    { title: '课程', dataIndex: 'course_name' },
    { title: '老师', dataIndex: 'teacher_name' },
    { title: '教室', dataIndex: 'classroom_name' },
    { title: '日期', dataIndex: 'date' },
    { title: '时段', render: (_: any, r: any) => `${r.start_time} - ${r.end_time}` },
    { title: '状态', dataIndex: 'status', render: (s: string) => {
      const map: any = { scheduled: <Tag color="blue">已排课</Tag>, completed: <Tag color="green">已完成</Tag>, cancelled: <Tag color="red">已取消</Tag> };
      return map[s];
    } },
  ];

  return (
    <div>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <Card><Statistic title="课程总数" value={stats.courses} prefix={<BookOutlined />} /></Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card><Statistic title="排课总数" value={stats.schedules} prefix={<CalendarOutlined />} /></Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card><Statistic title="学员总数" value={stats.students} prefix={<TeamOutlined />} /></Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card><Statistic title="待发课酬(元)" value={stats.pendingPayments} precision={2} prefix={<MoneyCollectOutlined />} /></Card>
        </Col>
      </Row>
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card title="最近排课">
            <Table rowKey="id" columns={scheduleColumns} dataSource={recentSchedules} pagination={false} size="small" />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="最近签到">
            <Table rowKey="id" pagination={false} size="small" columns={[
              { title: '学员', dataIndex: 'student_name' },
              { title: '课程', dataIndex: 'course_name' },
              { title: '日期', dataIndex: 'schedule_date' },
              { title: '签到时间', dataIndex: 'sign_in_time' },
              { title: '状态', dataIndex: 'status', render: (s: string) => {
                const map: any = { present: <Tag color="green">出勤</Tag>, absent: <Tag color="red">缺勤</Tag>, leave: <Tag color="orange">请假</Tag> };
                return map[s];
              } },
            ]} dataSource={recentAttendances} />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
