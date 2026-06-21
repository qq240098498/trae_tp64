import { useState, useEffect, useMemo } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Space,
  Popconfirm,
  message,
  Upload,
  DatePicker,
  Card,
  Tag,
  Image,
  Row,
  Col,
  Empty,
  Switch,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  StarOutlined,
  StarFilled,
  ExportOutlined,
  UploadOutlined,
  PictureOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import type { UploadProps } from 'antd';
import api from '../api';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { TextArea } = Input;
const { Meta } = Card;

interface StudentWork {
  id: number;
  student_id: number;
  course_id: number;
  schedule_id?: number;
  title: string;
  description?: string;
  image_url: string;
  is_excellent: boolean;
  work_date: string;
  created_at: string;
  student_name: string;
  course_name: string;
}

export default function StudentWorksPage() {
  const [list, setList] = useState<StudentWork[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [modalOpen, setModalOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState('');
  const [editing, setEditing] = useState<StudentWork | null>(null);
  const [filterStudentId, setFilterStudentId] = useState<number | undefined>();
  const [filterCourseId, setFilterCourseId] = useState<number | undefined>();
  const [filterExcellent, setFilterExcellent] = useState<boolean | undefined>();
  const [filterDateRange, setFilterDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);
  const [form] = Form.useForm();
  const [uploadForm] = Form.useForm();

  const loadData = async () => {
    const params: any = {};
    if (filterStudentId) params.student_id = filterStudentId;
    if (filterCourseId) params.course_id = filterCourseId;
    if (filterExcellent !== undefined) params.is_excellent = filterExcellent;
    if (filterDateRange && filterDateRange[0] && filterDateRange[1]) {
      params.start_date = filterDateRange[0].format('YYYY-MM-DD');
      params.end_date = filterDateRange[1].format('YYYY-MM-DD');
    }
    const res = await api.get('/student-works', { params });
    setList(res.data || []);
  };

  const loadStudents = async () => {
    const res = await api.get('/students');
    setStudents(res.data || []);
  };

  const loadCourses = async () => {
    const res = await api.get('/courses');
    setCourses(res.data || []);
  };

  useEffect(() => {
    loadData();
    loadStudents();
    loadCourses();
  }, []);

  const handleSearch = () => {
    loadData();
  };

  const handleReset = () => {
    setFilterStudentId(undefined);
    setFilterCourseId(undefined);
    setFilterExcellent(undefined);
    setFilterDateRange(null);
    loadData();
  };

  const handleUploadSubmit = async (values: any) => {
    try {
      const formData = new FormData();
      formData.append('student_id', values.student_id);
      formData.append('course_id', values.course_id);
      if (values.schedule_id) formData.append('schedule_id', values.schedule_id);
      formData.append('title', values.title);
      if (values.description) formData.append('description', values.description);
      formData.append('work_date', values.work_date.format('YYYY-MM-DD'));
      if (values.image && values.image.file && values.image.file.originFileObj) {
        formData.append('image', values.image.file.originFileObj);
      }

      await api.post('/student-works', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      message.success('上传成功');
      setModalOpen(false);
      uploadForm.resetFields();
      loadData();
    } catch (e: any) {
      message.error(e.response?.data?.message || '上传失败');
    }
  };

  const handleEditSubmit = async (values: any) => {
    try {
      await api.put(`/student-works/${editing?.id}`, values);
      message.success('更新成功');
      setPreviewOpen(false);
      setEditing(null);
      form.resetFields();
      loadData();
    } catch (e: any) {
      message.error(e.response?.data?.message || '更新失败');
    }
  };

  const handleToggleExcellent = async (id: number, isExcellent: boolean) => {
    try {
      await api.put(`/student-works/${id}/excellent`, { is_excellent: isExcellent });
      message.success(isExcellent ? '已标记为优秀作品' : '已取消优秀标记');
      loadData();
    } catch (e: any) {
      message.error(e.response?.data?.message || '操作失败');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await api.delete(`/student-works/${id}`) as any;
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

  const handleExportPortfolio = async (studentId: number, studentName: string) => {
    try {
      const response = await api.get(`/student-works/export/portfolio/${studentId}`, {
        responseType: 'blob'
      }) as unknown as Blob;
      const url = window.URL.createObjectURL(new Blob([response]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${studentName}_作品集_${dayjs().format('YYYYMMDD')}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      message.success('导出成功');
    } catch (e: any) {
      message.error(e.response?.data?.message || '导出失败');
    }
  };

  const handlePreview = (url: string) => {
    setPreviewImage(`http://localhost:3002${url}`);
    setPreviewOpen(true);
  };

  const uploadProps: UploadProps = {
    beforeUpload: () => false,
    maxCount: 1,
    accept: 'image/*',
  };

  const studentOptions = useMemo(() => students.map(s => ({ label: s.name, value: s.id })), [students]);
  const courseOptions = useMemo(() => courses.map(c => ({ label: c.name, value: c.id })), [courses]);

  const stats = useMemo(() => {
    const total = list.length;
    const excellent = list.filter(w => w.is_excellent).length;
    return { total, excellent };
  }, [list]);

  const tableColumns = [
    {
      title: 'ID',
      dataIndex: 'id',
      width: 60,
    },
    {
      title: '作品图片',
      dataIndex: 'image_url',
      width: 100,
      render: (url: string, record: StudentWork) => (
        <Image
          width={60}
          height={60}
          style={{ objectFit: 'cover', borderRadius: 4, cursor: 'pointer' }}
          src={`http://localhost:3002${url}`}
          preview={false}
          onClick={() => handlePreview(url)}
        />
      ),
    },
    {
      title: '作品标题',
      dataIndex: 'title',
    },
    {
      title: '学员',
      dataIndex: 'student_name',
    },
    {
      title: '课程',
      dataIndex: 'course_name',
    },
    {
      title: '创作日期',
      dataIndex: 'work_date',
    },
    {
      title: '优秀作品',
      dataIndex: 'is_excellent',
      width: 100,
      render: (v: boolean, record: StudentWork) => (
        <Switch
          checked={v}
          checkedChildren={<StarFilled style={{ color: '#faad14' }} />}
          unCheckedChildren={<StarOutlined />}
          onChange={(checked) => handleToggleExcellent(record.id, checked)}
        />
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 220,
      render: (_: any, record: StudentWork) => (
        <Space size="small">
          <Button
            icon={<EditOutlined />}
            size="small"
            onClick={() => {
              setEditing(record);
              form.setFieldsValue(record);
              setPreviewOpen(true);
            }}
          >
            编辑
          </Button>
          <Button
            icon={<ExportOutlined />}
            size="small"
            onClick={() => handleExportPortfolio(record.student_id, record.student_name)}
          >
            导出作品集
          </Button>
          <Popconfirm title="确定删除？" onConfirm={() => handleDelete(record.id)}>
            <Button icon={<DeleteOutlined />} size="small" danger>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Space style={{ marginBottom: 16 }} wrap>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              uploadForm.resetFields();
              setModalOpen(true);
            }}
          >
            上传作品
          </Button>
          <Space>
            <Select
              placeholder="选择学员"
              allowClear
              style={{ width: 150 }}
              value={filterStudentId}
              onChange={(v) => setFilterStudentId(v)}
              options={studentOptions}
            />
            <Select
              placeholder="选择课程"
              allowClear
              style={{ width: 150 }}
              value={filterCourseId}
              onChange={(v) => setFilterCourseId(v)}
              options={courseOptions}
            />
            <Select
              placeholder="作品等级"
              allowClear
              style={{ width: 120 }}
              value={filterExcellent}
              onChange={(v) => setFilterExcellent(v)}
              options={[
                { label: '优秀作品', value: true },
                { label: '普通作品', value: false },
              ]}
            />
            <RangePicker
              value={filterDateRange}
              onChange={(dates) => setFilterDateRange(dates)}
              format="YYYY-MM-DD"
            />
            <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>搜索</Button>
            <Button onClick={handleReset}>重置</Button>
          </Space>
          <Space style={{ marginLeft: 'auto' }}>
            <Space>
              <Tag color="blue">共 {stats.total} 个作品</Tag>
              <Tag color="gold">优秀作品 {stats.excellent} 个</Tag>
            </Space>
            <Button.Group>
              <Button
                type={viewMode === 'grid' ? 'primary' : 'default'}
                onClick={() => setViewMode('grid')}
                icon={<PictureOutlined />}
              >
                画廊视图
              </Button>
              <Button
                type={viewMode === 'table' ? 'primary' : 'default'}
                onClick={() => setViewMode('table')}
                icon={<PictureOutlined />}
              >
                列表视图
              </Button>
            </Button.Group>
          </Space>
        </Space>

        {list.length === 0 ? (
          <Empty description="暂无作品" />
        ) : viewMode === 'table' ? (
          <Table rowKey="id" columns={tableColumns} dataSource={list} />
        ) : (
          <Row gutter={[16, 16]}>
            {list.map((work) => (
              <Col xs={24} sm={12} md={8} lg={6} key={work.id}>
                <Card
                  hoverable
                  cover={
                    <div
                      style={{
                        height: 200,
                        overflow: 'hidden',
                        cursor: 'pointer',
                        background: '#f5f5f5',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      onClick={() => handlePreview(work.image_url)}
                    >
                      <Image
                        src={`http://localhost:3002${work.image_url}`}
                        alt={work.title}
                        preview={false}
                        style={{
                          width: '100%',
                          height: 200,
                          objectFit: 'cover',
                        }}
                      />
                      {work.is_excellent && (
                        <div
                          style={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            background: 'rgba(0,0,0,0.6)',
                            color: '#faad14',
                            padding: '4px 8px',
                            borderRadius: 4,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <StarFilled />
                          <span style={{ fontSize: 12 }}>优秀</span>
                        </div>
                      )}
                    </div>
                  }
                  actions={[
                    <EditOutlined
                      key="edit"
                      onClick={() => {
                        setEditing(work);
                        form.setFieldsValue(work);
                        setPreviewOpen(true);
                      }}
                    />,
                    <span
                      key="excellent"
                      onClick={() => handleToggleExcellent(work.id, !work.is_excellent)}
                      style={{ color: work.is_excellent ? '#faad14' : undefined }}
                    >
                      {work.is_excellent ? <StarFilled /> : <StarOutlined />}
                    </span>,
                    <ExportOutlined
                      key="export"
                      onClick={() => handleExportPortfolio(work.student_id, work.student_name)}
                    />,
                    <Popconfirm title="确定删除？" onConfirm={() => handleDelete(work.id)}>
                      <DeleteOutlined key="delete" style={{ color: '#ff4d4f' }} />
                    </Popconfirm>,
                  ]}
                >
                  <Meta
                    title={work.title}
                    description={
                      <div>
                        <div style={{ marginBottom: 4 }}>
                          <Tag color="blue">{work.student_name}</Tag>
                          <Tag color="green">{work.course_name}</Tag>
                        </div>
                        <div style={{ color: '#999', fontSize: 12 }}>{work.work_date}</div>
                        {work.description && (
                          <div style={{ marginTop: 8, color: '#666', fontSize: 12 }}>
                            {work.description}
                          </div>
                        )}
                      </div>
                    }
                  />
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </Space>

      <Modal
        title="上传作品"
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          uploadForm.resetFields();
        }}
        onOk={() => uploadForm.submit()}
        width={600}
        okText="上传"
      >
        <Form form={uploadForm} layout="vertical" onFinish={handleUploadSubmit}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="student_id"
                label="学员"
                rules={[{ required: true, message: '请选择学员' }]}
              >
                <Select placeholder="请选择学员" options={studentOptions} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="course_id"
                label="课程"
                rules={[{ required: true, message: '请选择课程' }]}
              >
                <Select placeholder="请选择课程" options={courseOptions} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            name="title"
            label="作品标题"
            rules={[{ required: true, message: '请输入作品标题' }]}
          >
            <Input placeholder="请输入作品标题" maxLength={50} />
          </Form.Item>
          <Form.Item name="description" label="作品描述">
            <TextArea rows={3} placeholder="请输入作品描述（可选）" maxLength={200} />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="work_date"
                label="创作日期"
                rules={[{ required: true, message: '请选择创作日期' }]}
              >
                <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            name="image"
            label="作品图片"
            rules={[{ required: true, message: '请上传作品图片' }]}
          >
            <Upload {...uploadProps} listType="picture-card">
              <div>
                <UploadOutlined />
                <div style={{ marginTop: 8 }}>点击上传</div>
              </div>
            </Upload>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="编辑作品"
        open={previewOpen}
        onCancel={() => {
          setPreviewOpen(false);
          setEditing(null);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        width={700}
      >
        {editing && (
          <div>
            <div style={{ marginBottom: 16, textAlign: 'center' }}>
              <Image
                width={300}
                src={`http://localhost:3002${editing.image_url}`}
                preview={false}
              />
            </div>
            <Form form={form} layout="vertical" onFinish={handleEditSubmit}>
              <Form.Item
                name="title"
                label="作品标题"
                rules={[{ required: true, message: '请输入作品标题' }]}
              >
                <Input placeholder="请输入作品标题" maxLength={50} />
              </Form.Item>
              <Form.Item name="description" label="作品描述">
                <TextArea rows={3} placeholder="请输入作品描述（可选）" maxLength={200} />
              </Form.Item>
              <Form.Item
                  name="is_excellent"
                  label="优秀作品"
                  valuePropName="checked"
                >
                  <Switch
                  checkedChildren={<StarFilled style={{ color: '#faad14' }} />}
                  unCheckedChildren={<StarOutlined />}
                />
              </Form.Item>
            </Form>
          </div>
        )}
      </Modal>

      <Image
        wrapperStyle={{ display: 'none' }}
        preview={{
          visible: previewOpen,
          onVisibleChange: (visible) => {
            if (!visible) {
              setPreviewOpen(false);
            }
          },
          src: previewImage,
        }}
      />
    </div>
  );
}
