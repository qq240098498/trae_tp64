import { useState, useEffect } from 'react';
import { Table, Button, Select, Space, Tag, message, DatePicker, Card, Row, Col, Statistic } from 'antd';
import { MoneyCollectOutlined, DollarOutlined, CheckCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../api';

export default function PaymentsPage() {
  const [list, setList] = useState<any[]>([]);
  const [summary, setSummary] = useState<any[]>([]);
  const [teacherId, setTeacherId] = useState<number | undefined>();
  const [status, setStatus] = useState<string | undefined>();
  const [dateRange, setDateRange] = useState<any>(null);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  const loadData = async () => {
    const params: any = {};
    if (teacherId) params.teacher_id = teacherId;
    if (status) params.status = status;
    if (dateRange && dateRange.length === 2) {
      params.start_date = dateRange[0].format('YYYY-MM-DD');
      params.end_date = dateRange[1].format('YYYY-MM-DD');
    }
    const [p, s, t] = await Promise.all([
      api.get('/payments', { params }),
      api.get('/payments/summary', { params: teacherId ? { teacher_id: teacherId } : undefined }),
      api.get('/teachers'),
    ]);
    setList(p.data || []);
    setSummary(s.data || []);
    setTeachers(t.data || []);
  };

  useEffect(() => { loadData(); }, [teacherId, status, dateRange]);

  const handlePay = async (id: number) => {
    try {
      const res = await api.post(`/payments/${id}/pay`);
      if (res.code === 0) {
        message.success('已标记为已发放');
        loadData();
      } else {
        message.error(res.message);
      }
    } catch (e: any) {
      message.error(e.response?.data?.message || '操作失败');
    }
  };

  const handleBulkPay = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要发放的记录');
      return;
    }
    try {
      const res = await api.post('/payments/bulk-pay', { ids: selectedRowKeys });
      if (res.code === 0) {
        message.success(`已批量发放 ${selectedRowKeys.length} 条记录`);
        setSelectedRowKeys([]);
        loadData();
      } else {
        message.error(res.message);
      }
    } catch (e: any) {
      message.error(e.response?.data?.message || '操作失败');
    }
  };

  const totalAmount = list.reduce((s, p) => s + p.amount, 0);
  const pendingAmount = list.filter(p => p.status === 'pending').reduce((s, p) => s + p.amount, 0);
  const paidAmount = list.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0);
  const totalHours = list.reduce((s, p) => s + p.hours, 0);

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '老师', dataIndex: 'teacher_name' },
    { title: '课程', dataIndex: 'course_name' },
    { title: '上课日期', dataIndex: 'schedule_date', sorter: (a: any, b: any) => dayjs(a.schedule_date).unix() - dayjs(b.schedule_date).unix() },
    { title: '时段', render: (_: any, r: any) => `${r.start_time} - ${r.end_time}` },
    { title: '课时(小时)', dataIndex: 'hours' },
    { title: '时薪(元)', dataIndex: 'hourly_rate' },
    { title: '课酬(元)', dataIndex: 'amount', render: (v: number) => `¥${v.toFixed(2)}`, sorter: (a: any, b: any) => a.amount - b.amount },
    { title: '状态', dataIndex: 'status', render: (s: string) => {
      const map: any = { pending: <Tag color="orange" icon={<ClockCircleOutlined />}>待发放</Tag>, paid: <Tag color="green" icon={<CheckCircleOutlined />}>已发放</Tag> };
      return map[s];
    } },
    { title: '发放日期', dataIndex: 'paid_date', render: (d: string) => d || '-' },
    { title: '操作', key: 'action', width: 100, render: (_: any, r: any) => r.status === 'pending' ? (
      <Button type="primary" size="small" icon={<DollarOutlined />} onClick={() => handlePay(r.id)}>发放</Button>
    ) : null },
  ];

  return (
    <div>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={6}>
          <Card><Statistic title="总课酬(元)" value={totalAmount} precision={2} prefix={<MoneyCollectOutlined />} /></Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card><Statistic title="待发放(元)" value={pendingAmount} precision={2} valueStyle={{ color: '#fa8c16' }} prefix={<ClockCircleOutlined />} /></Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card><Statistic title="已发放(元)" value={paidAmount} precision={2} valueStyle={{ color: '#52c41a' }} prefix={<CheckCircleOutlined />} /></Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card><Statistic title="总课时" value={totalHours} precision={1} suffix="小时" /></Card>
        </Col>
      </Row>

      <Card title="老师课酬汇总" style={{ marginBottom: 16 }} size="small">
        <Table size="small" rowKey="teacher_id" pagination={false} dataSource={summary} columns={[
          { title: '老师', dataIndex: 'teacher_name' },
          { title: '课次数', dataIndex: 'class_count' },
          { title: '总课时', dataIndex: 'total_hours', render: (v: number) => v ? v.toFixed(1) : 0 },
          { title: '总课酬(元)', dataIndex: 'total_amount', render: (v: number) => `¥${(v || 0).toFixed(2)}` },
          { title: '待发放(元)', dataIndex: 'pending_amount', render: (v: number) => `¥${(v || 0).toFixed(2)}` },
          { title: '已发放(元)', dataIndex: 'paid_amount', render: (v: number) => `¥${(v || 0).toFixed(2)}` },
        ]} />
      </Card>

      <Space style={{ marginBottom: 16 }}>
        <Select placeholder="按老师筛选" allowClear style={{ width: 200 }} onChange={setTeacherId}>
          {teachers.map(t => <Select.Option key={t.id} value={t.id}>{t.name}</Select.Option>)}
        </Select>
        <Select placeholder="按状态筛选" allowClear style={{ width: 150 }} onChange={setStatus}>
          <Select.Option value="pending">待发放</Select.Option>
          <Select.Option value="paid">已发放</Select.Option>
        </Select>
        <DatePicker.RangePicker onChange={setDateRange} />
        <Button type="primary" icon={<DollarOutlined />} onClick={handleBulkPay} disabled={selectedRowKeys.length === 0}>
          批量发放 ({selectedRowKeys.length})
        </Button>
      </Space>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={list}
        rowSelection={{
          selectedRowKeys,
          onChange: setSelectedRowKeys,
          getCheckboxProps: (record: any) => ({ disabled: record.status === 'paid' }),
        }}
      />
    </div>
  );
}
