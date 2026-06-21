import { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Tag,
  Space,
  Popconfirm,
  message,
  Select,
  Card,
  Row,
  Col,
  Progress,
  Descriptions,
  Modal,
  Alert,
  Empty,
} from 'antd';
import {
  ReloadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  PlayCircleOutlined,
  DeleteOutlined,
  InfoCircleOutlined,
  ClockCircleOutlined,
  UserOutlined,
  BookOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../api';

const statusMap: any = {
  pending: { color: 'orange', text: '待匹配', icon: <ClockCircleOutlined /> },
  matched: { color: 'blue', text: '已匹配', icon: <InfoCircleOutlined /> },
  completed: { color: 'green', text: '已完成', icon: <CheckCircleOutlined /> },
  expired: { color: 'red', text: '已过期', icon: <CloseCircleOutlined /> },
};

const matchStatusMap: any = {
  recommended: { color: 'blue', text: '待确认' },
  accepted: { color: 'green', text: '已确认' },
  rejected: { color: 'red', text: '已拒绝' },
  completed: { color: 'green', text: '已完成' },
};

export default function MakeupSchedulesPage() {
  const [list, setList] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [studentId, setStudentId] = useState<number | undefined>();
  const [courseId, setCourseId] = useState<number | undefined>();
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [detailModal, setDetailModal] = useState<any>({ open: false, record: null });
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (studentId) params.student_id = studentId;
      if (courseId) params.course_id = courseId;
      if (statusFilter) params.status = statusFilter;
      const [m, s, c] = await Promise.all([
        api.get('/makeup-schedules', { params }),
        api.get('/students'),
        api.get('/courses'),
      ]);
      setList(m.data || []);
      setStudents(s.data || []);
      setCourses(c.data || []);
    } catch (e) {
      message.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [studentId, courseId, statusFilter]);

  const handleMatch = async (id: number) => {
    try {
      const res = await api.post(`/makeup-schedules/${id}/match`);
      if (res.code === 0) {
        message.success(res.message || '匹配成功');
        loadData();
      } else {
        message.error(res.message);
      }
    } catch (e: any) {
      message.error(e.response?.data?.message || '匹配失败');
    }
  };

  const handleAccept = async (matchId: number) => {
    try {
      const res = await api.put(`/makeup-schedules/matches/${matchId}/accept`);
      if (res.code === 0) {
        message.success('已确认该补课时间');
        loadData();
      } else {
        message.error(res.message);
      }
    } catch (e: any) {
      message.error(e.response?.data?.message || '操作失败');
    }
  };

  const handleReject = async (matchId: number) => {
    try {
      const res = await api.put(`/makeup-schedules/matches/${matchId}/reject`);
      if (res.code === 0) {
        message.success('已拒绝该推荐');
        loadData();
      } else {
        message.error(res.message);
      }
    } catch (e: any) {
      message.error(e.response?.data?.message || '操作失败');
    }
  };

  const handleComplete = async (matchId: number) => {
    try {
      const res = await api.post(`/makeup-schedules/matches/${matchId}/complete`);
      if (res.code === 0) {
        message.success('补课已完成，已自动签到');
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
      const res = await api.delete(`/makeup-schedules/${id}`);
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

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'success' as const;
    if (score >= 60) return 'normal' as const;
    if (score >= 40) return 'exception' as const;
    return 'exception' as const;
  };

  const expandedRowRender = (record: any) => {
    const recommended = (record.matches || []).filter((m: any) => m.status === 'recommended');
    const accepted = (record.matches || []).filter((m: any) => m.status === 'accepted');
    const completed = (record.matches || []).filter((m: any) => m.status === 'completed');

    return (
      <div style={{ padding: '0 24px' }}>
        {record.matches.length === 0 ? (
          <Empty description="暂无推荐补课时间，点击'智能匹配'生成推荐" />
        ) : (
          <Row gutter={[16, 16]}>
            {accepted.map((m: any) => (
              <Col key={m.id} xs={24} sm={12} lg={8}>
                <Card
                  size="small"
                  title={<><Tag color="green">已确认</Tag> 推荐补课时间</>}
                  extra={
                    <Space>
                      <Popconfirm title="确认该补课已完成？完成后将自动签到" onConfirm={() => handleComplete(m.id)}>
                        <Button type="primary" size="small" icon={<CheckCircleOutlined />}>
                          完成补课
                        </Button>
                      </Popconfirm>
                    </Space>
                  }
                  style={{ borderColor: '#52c41a', borderWidth: 2 }}
                >
                  <Descriptions size="small" column={1}>
                    <Descriptions.Item label="日期">{m.target_schedule?.date}</Descriptions.Item>
                    <Descriptions.Item label="时间">{m.target_schedule?.start_time} - {m.target_schedule?.end_time}</Descriptions.Item>
                    <Descriptions.Item label="教师">{m.target_schedule?.teacher_name}</Descriptions.Item>
                    <Descriptions.Item label="教室">{m.target_schedule?.classroom_name}</Descriptions.Item>
                    <Descriptions.Item label="剩余名额">{m.target_schedule?.available_slots} / {m.target_schedule?.max_students}</Descriptions.Item>
                  </Descriptions>
                </Card>
              </Col>
            ))}

            {recommended.map((m: any) => (
              <Col key={m.id} xs={24} sm={12} lg={8}>
                <Card
                  size="small"
                  title={<><Tag color="blue">推荐</Tag> 匹配度</>}
                  extra={<Progress percent={m.match_score} size="small" status={getScoreColor(m.match_score)} />}
                  actions={[
                    <Button type="primary" size="small" icon={<CheckCircleOutlined />} onClick={() => handleAccept(m.id)}>
                      确认
                    </Button>,
                    <Button size="small" icon={<CloseCircleOutlined />} onClick={() => handleReject(m.id)}>
                      拒绝
                    </Button>,
                  ]}
                >
                  <Descriptions size="small" column={1}>
                    <Descriptions.Item label="日期">{m.target_schedule?.date}</Descriptions.Item>
                    <Descriptions.Item label="时间">{m.target_schedule?.start_time} - {m.target_schedule?.end_time}</Descriptions.Item>
                    <Descriptions.Item label="教师">{m.target_schedule?.teacher_name}</Descriptions.Item>
                    <Descriptions.Item label="教室">{m.target_schedule?.classroom_name}</Descriptions.Item>
                    <Descriptions.Item label="剩余名额">
                      <Tag color={m.target_schedule?.available_slots > 0 ? 'green' : 'red'}>
                        {m.target_schedule?.available_slots} / {m.target_schedule?.max_students}
                      </Tag>
                    </Descriptions.Item>
                  </Descriptions>
                </Card>
              </Col>
            ))}

            {completed.map((m: any) => (
              <Col key={m.id} xs={24} sm={12} lg={8}>
                <Card
                  size="small"
                  title={<><Tag color="green">已完成</Tag> 补课记录</>}
                  style={{ opacity: 0.7 }}
                >
                  <Descriptions size="small" column={1}>
                    <Descriptions.Item label="日期">{m.target_schedule?.date}</Descriptions.Item>
                    <Descriptions.Item label="时间">{m.target_schedule?.start_time} - {m.target_schedule?.end_time}</Descriptions.Item>
                    <Descriptions.Item label="教师">{m.target_schedule?.teacher_name}</Descriptions.Item>
                    <Descriptions.Item label="完成时间">{m.completed_at}</Descriptions.Item>
                  </Descriptions>
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </div>
    );
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '学员', dataIndex: 'student_name', render: (v: string, r: any) => (
      <><UserOutlined /> {v} <div style={{ color: '#999', fontSize: 12 }}>{r.student_phone}</div></>
    ) },
    { title: '课程', dataIndex: 'course_name', render: (v: string, r: any) => (
      <><BookOutlined /> {v} <Tag color="purple" style={{ marginLeft: 8 }}>{r.course_category}</Tag></>
    ) },
    { title: '缺课节次', dataIndex: 'missed_lesson_number', render: (v: number) => `第 ${v} 节` },
    { title: '原课次日期', dataIndex: 'original_schedule', render: (s: any) => s ? `${s.date} ${s.start_time}-${s.end_time}` : '-' },
    { title: '原授课教师', dataIndex: 'original_schedule', render: (s: any) => s?.teacher_name || '-' },
    { title: '状态', dataIndex: 'status', render: (s: string) => {
      const cfg = statusMap[s] || { color: 'default', text: s };
      return <Tag color={cfg.color} icon={cfg.icon}>{cfg.text}</Tag>;
    } },
    { title: '推荐数量', render: (_: any, r: any) => {
      const rec = (r.matches || []).filter((m: any) => m.status === 'recommended').length;
      const acc = (r.matches || []).filter((m: any) => m.status === 'accepted').length;
      const done = (r.matches || []).filter((m: any) => m.status === 'completed').length;
      return (
        <Space>
          {rec > 0 && <Tag color="blue">{rec} 待确认</Tag>}
          {acc > 0 && <Tag color="green">{acc} 已确认</Tag>}
          {done > 0 && <Tag color="green">{done} 已完成</Tag>}
          {rec + acc + done === 0 && <Tag color="default">暂无推荐</Tag>}
        </Space>
      );
    } },
    { title: '创建时间', dataIndex: 'created_at' },
    { title: '操作', key: 'action', width: 200, fixed: 'right' as const, render: (_: any, r: any) => (
      <Space>
        {r.status === 'pending' && (
          <Button type="primary" size="small" icon={<PlayCircleOutlined />} onClick={() => handleMatch(r.id)}>
            智能匹配
          </Button>
        )}
        {r.status === 'matched' && (
          <Button size="small" icon={<ReloadOutlined />} onClick={() => handleMatch(r.id)}>
            重新匹配
          </Button>
        )}
        <Button size="small" icon={<InfoCircleOutlined />} onClick={() => setDetailModal({ open: true, record: r })}>
          详情
        </Button>
        <Popconfirm title="确定删除该补课记录？" onConfirm={() => handleDelete(r.id)}>
          <Button size="small" danger icon={<DeleteOutlined />}>删除</Button>
        </Popconfirm>
      </Space>
    ) },
  ];

  const stats = {
    total: list.length,
    pending: list.filter((l: any) => l.status === 'pending').length,
    matched: list.filter((l: any) => l.status === 'matched').length,
    completed: list.filter((l: any) => l.status === 'completed').length,
  };

  return (
    <div>
      <Alert
        type="info"
        showIcon
        icon={<InfoCircleOutlined />}
        message="补课调度说明"
        description={<>学期课学员请假后<strong>自动进入补课池</strong>，系统会根据<strong>同进度、同时段、同老师</strong>原则智能推荐其他班级的补课时间，匹配度越高推荐越优先。</>}
        style={{ marginBottom: 16 }}
      />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={6}>
          <Card size="small">
            <div style={{ fontSize: 12, color: '#999' }}>待补课总数</div>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#1677ff' }}>{stats.total}</div>
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <div style={{ fontSize: 12, color: '#999' }}>待匹配</div>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#fa8c16' }}>{stats.pending}</div>
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <div style={{ fontSize: 12, color: '#999' }}>已匹配待确认</div>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#1677ff' }}>{stats.matched}</div>
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <div style={{ fontSize: 12, color: '#999' }}>已完成补课</div>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#52c41a' }}>{stats.completed}</div>
          </Card>
        </Col>
      </Row>

      <Space style={{ marginBottom: 16 }} wrap>
        <Select placeholder="按学员筛选" allowClear style={{ width: 200 }} onChange={setStudentId} showSearch optionFilterProp="label">
          {students.map(s => <Select.Option key={s.id} value={s.id} label={s.name}>{s.name} ({s.phone})</Select.Option>)}
        </Select>
        <Select placeholder="按课程筛选" allowClear style={{ width: 200 }} onChange={setCourseId}>
          {courses.map(c => <Select.Option key={c.id} value={c.id}>{c.name} ({c.category})</Select.Option>)}
        </Select>
        <Select placeholder="按状态筛选" allowClear style={{ width: 150 }} onChange={setStatusFilter}>
          <Select.Option value="pending">待匹配</Select.Option>
          <Select.Option value="matched">已匹配</Select.Option>
          <Select.Option value="completed">已完成</Select.Option>
          <Select.Option value="expired">已过期</Select.Option>
        </Select>
        <Button icon={<ReloadOutlined />} onClick={loadData}>刷新</Button>
      </Space>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={list}
        loading={loading}
        expandable={{ expandedRowRender }}
        scroll={{ x: 1200 }}
      />

      <Modal
        title="补课详情"
        open={detailModal.open}
        onCancel={() => setDetailModal({ open: false, record: null })}
        footer={null}
        width={700}
      >
        {detailModal.record && (
          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="学员">{detailModal.record.student_name} ({detailModal.record.student_phone})</Descriptions.Item>
            <Descriptions.Item label="课程">{detailModal.record.course_name}</Descriptions.Item>
            <Descriptions.Item label="缺课节次">第 {detailModal.record.missed_lesson_number} 节</Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={statusMap[detailModal.record.status]?.color}>{statusMap[detailModal.record.status]?.text}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="原课次" span={2}>
              {detailModal.record.original_schedule?.date} {detailModal.record.original_schedule?.start_time}-{detailModal.record.original_schedule?.end_time}
              ，教师：{detailModal.record.original_schedule?.teacher_name}
            </Descriptions.Item>
            <Descriptions.Item label="学期有效期" span={2}>
              {detailModal.record.enrollment?.semester_start_date} ~ {detailModal.record.enrollment?.semester_end_date}
            </Descriptions.Item>
            <Descriptions.Item label="创建时间" span={2}>{detailModal.record.created_at}</Descriptions.Item>
            {detailModal.record.matched_at && <Descriptions.Item label="匹配时间" span={2}>{detailModal.record.matched_at}</Descriptions.Item>}
            {detailModal.record.completed_at && <Descriptions.Item label="完成时间" span={2}>{detailModal.record.completed_at}</Descriptions.Item>}
            {detailModal.record.note && <Descriptions.Item label="备注" span={2}>{detailModal.record.note}</Descriptions.Item>}
          </Descriptions>
        )}
      </Modal>
    </div>
  );
}
