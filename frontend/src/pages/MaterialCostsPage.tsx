import { useState, useEffect, useMemo } from 'react';
import {
  Table, Button, DatePicker, Select, Space, Tag,
  Card, Row, Col, Statistic, Divider, Tabs, Empty
} from 'antd';
import {
  CalendarOutlined, ShopOutlined, BookOutlined,
  TeamOutlined, AppstoreOutlined, InboxOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../api';

export default function MaterialCostsPage() {
  const [summary, setSummary] = useState<any>(null);
  const [list, setList] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [courseCategories, setCourseCategories] = useState<string[]>([]);
  const [materialCategories, setMaterialCategories] = useState<string[]>([]);
  const [month, setMonth] = useState<string>(dayjs().format('YYYY-MM'));
  const [filterCourseCategory, setFilterCourseCategory] = useState<string | undefined>();
  const [filterMaterialCategory, setFilterMaterialCategory] = useState<string | undefined>();
  const [dateRange, setDateRange] = useState<any>(null);

  const loadMonthly = async () => {
    const params: any = { month };
    if (filterCourseCategory) params.course_category = filterCourseCategory;
    const [res, cRes, mCatRes] = await Promise.all([
      api.get('/material-usages/summary/monthly', { params }),
      api.get('/courses'),
      api.get('/materials/categories'),
    ]);
    setSummary(res.data || null);
    setCourses(cRes.data || []);
    setMaterialCategories(mCatRes.data || []);
    const courseCats = Array.from(new Set((cRes.data || []).map((c: any) => c.category))).filter(Boolean).sort() as string[];
    setCourseCategories(courseCats);
  };

  const loadList = async () => {
    const params: any = {};
    if (filterMaterialCategory) params.material_category = filterMaterialCategory;
    if (filterCourseCategory) params.course_category = filterCourseCategory;
    if (dateRange && dateRange.length === 2) {
      params.start_date = dateRange[0].format('YYYY-MM-DD');
      params.end_date = dateRange[1].format('YYYY-MM-DD');
    } else {
      params.start_date = dayjs(month).startOf('month').format('YYYY-MM-DD');
      params.end_date = dayjs(month).endOf('month').format('YYYY-MM-DD');
    }
    const res = await api.get('/material-usages', { params });
    setList(res.data || []);
  };

  useEffect(() => { loadMonthly(); loadList(); }, [month, filterCourseCategory, filterMaterialCategory, dateRange]);

  const avgCostPerClass = summary?.total_class_count ? (summary.total_material_cost / summary.total_class_count).toFixed(2) : '0.00';

  const usageColumns = [
    { title: '日期', dataIndex: 'schedule_date', width: 110, sorter: (a: any, b: any) => dayjs(a.schedule_date).unix() - dayjs(b.schedule_date).unix() },
    { title: '课程', dataIndex: 'course_name', render: (v: string, r: any) => (
      <span>{v} <Tag color="blue">{r.course_category}</Tag></span>
    ) },
    { title: '老师', dataIndex: 'teacher_name' },
    { title: '材料', dataIndex: 'material_name', render: (v: string, r: any) => (
      <span>{v} <Tag color="purple">{r.material_category}</Tag></span>
    ) },
    { title: '用量', render: (_: any, r: any) => `${r.quantity} ${r.material_unit}`, sorter: (a: any, b: any) => a.quantity - b.quantity },
    { title: '总成本(元)', dataIndex: 'total_cost', width: 110, render: (v: number) => <span style={{ color: '#1677ff', fontWeight: 500 }}>¥{v?.toFixed(2)}</span>, sorter: (a: any, b: any) => a.total_cost - b.total_cost },
    { title: '均摊人数', dataIndex: 'student_count', width: 90, render: (v: number) => `${v}人` },
    { title: '人均成本(元)', dataIndex: 'per_student_cost', width: 110, render: (v: number) => <span style={{ color: '#fa8c16' }}>¥{v?.toFixed(2)}</span>, sorter: (a: any, b: any) => a.per_student_cost - b.per_student_cost },
    { title: '备注', dataIndex: 'note', render: (v: string) => v || '-' },
  ];

  const categoryColorMap: any = {
    '画纸': 'blue', '画布': 'geekblue', '颜料': 'volcano',
    '书法': 'purple', '陶艺': 'orange', '皮料': 'brown',
    '皮具': 'magenta', '工具': 'cyan',
  };

  return (
    <div>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title={`${summary?.month || '本月'}耗材总成本(元)`}
              value={summary?.total_material_cost || 0}
              precision={2}
              valueStyle={{ color: '#cf1322' }}
              prefix={<AppstoreOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="耗材课次数"
              value={summary?.total_class_count || 0}
              prefix={<BookOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="材料使用记录数"
              value={summary?.total_usage_count || 0}
              prefix={<InboxOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="平均每次课耗材成本(元)"
              value={Number(avgCostPerClass)}
              precision={2}
              valueStyle={{ color: '#1677ff' }}
              prefix={<ShopOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Space style={{ marginBottom: 16 }} wrap>
        <span style={{ marginRight: -8 }}>统计月份：</span>
        <DatePicker.MonthPicker
          value={dayjs(month)}
          onChange={(d: any) => d && setMonth(d.format('YYYY-MM'))}
          style={{ width: 160 }}
        />
        <span style={{ marginRight: -8, marginLeft: 8 }}>日期范围：</span>
        <DatePicker.RangePicker
          value={dateRange}
          onChange={setDateRange}
          placeholder={['开始日期', '结束日期']}
          style={{ width: 320 }}
          allowClear
        />
        <Select
          placeholder="按课程类别筛选"
          allowClear
          style={{ width: 160 }}
          value={filterCourseCategory}
          onChange={setFilterCourseCategory}
        >
          {courseCategories.map(c => (
            <Select.Option key={c} value={c}>{c}</Select.Option>
          ))}
        </Select>
        <Select
          placeholder="按材料类别筛选"
          allowClear
          style={{ width: 160 }}
          value={filterMaterialCategory}
          onChange={setFilterMaterialCategory}
        >
          {materialCategories.map(c => (
            <Select.Option key={c} value={c}>{c}</Select.Option>
          ))}
        </Select>
      </Space>

      <Divider orientation="left" plain style={{ margin: '8px 0 16px' }}>
        <span style={{ fontSize: 16 }}>
          <CalendarOutlined style={{ marginRight: 6 }} />
          {summary?.month || '本月'} 耗材成本报表
          {summary?.start_date && summary?.end_date && (
            <span style={{ fontSize: 13, color: '#999', marginLeft: 10 }}>
              （{summary.start_date} ~ {summary.end_date}）
            </span>
          )}
        </span>
      </Divider>

      <Tabs
        defaultActiveKey="detail"
        items={[
          {
            key: 'detail',
            label: '明细列表',
            children: (
              <>
                {list.length > 0 ? (
                  <Table
                    rowKey="id"
                    columns={usageColumns}
                    dataSource={list}
                    scroll={{ x: 1100 }}
                  />
                ) : (
                  <Empty description="该时间段暂无耗材使用记录" />
                )}
              </>
            ),
          },
          {
            key: 'byMaterial',
            label: '按材料汇总',
            children: (
              <>
                {(summary?.by_material?.length > 0) ? (
                  <Card title="材料消耗明细" size="small" style={{ marginBottom: 16 }}>
                    <Table
                      size="small"
                      rowKey="material_id"
                      pagination={false}
                      dataSource={summary.by_material}
                      columns={[
                        { title: '材料名称', dataIndex: 'material_name', render: (v: string, r: any) => (
                          <span style={{ fontWeight: 500 }}>{v}</span>
                        ) },
                        { title: '分类', dataIndex: 'material_category', render: (v: string) => (
                          <Tag color={categoryColorMap[v] || 'default'}>{v}</Tag>
                        ) },
                        { title: '单位', dataIndex: 'unit' },
                        { title: '单价(元)', dataIndex: 'unit_price', render: (v: number) => `¥${v.toFixed(2)}` },
                        { title: '总用量', dataIndex: 'total_quantity', render: (v: number, r: any) => `${v} ${r.unit}` },
                        { title: '使用次数', dataIndex: 'usage_count' },
                        { title: '总成本(元)', dataIndex: 'total_cost', render: (v: number) => (
                          <span style={{ color: '#cf1322', fontWeight: 600 }}>¥{v.toFixed(2)}</span>
                        ), sorter: (a: any, b: any) => a.total_cost - b.total_cost },
                      ]}
                    />
                  </Card>
                ) : (
                  <Empty description="暂无数据" />
                )}
              </>
            ),
          },
          {
            key: 'byCategory',
            label: '按材料类别汇总',
            children: (
              <>
                {(summary?.by_category?.length > 0) ? (
                  <Row gutter={[16, 16]}>
                    <Col xs={24}>
                      <Card title="材料类别总成本占比" size="small">
                        <Row gutter={[16, 16]}>
                          {summary.by_category.map((c: any, idx: number) => (
                            <Col xs={24} sm={12} md={8} key={c.material_category}>
                              <Card
                                size="small"
                                bordered
                                style={{
                                  borderTop: `3px solid ${['#1677ff', '#fa8c16', '#52c41a', '#722ed1', '#eb2f96', '#13c2c2'][idx % 6]}`,
                                }}
                              >
                                <Space direction="vertical" style={{ width: '100%' }}>
                                  <Space>
                                    <Tag color={categoryColorMap[c.material_category] || 'default'}>{c.material_category}</Tag>
                                    <span style={{ color: '#999', fontSize: 12 }}>{c.material_type_count}种材料</span>
                                  </Space>
                                  <Statistic
                                    title="总成本(元)"
                                    value={c.total_cost}
                                    precision={2}
                                    valueStyle={{ fontSize: 20 }}
                                  />
                                  <div style={{ fontSize: 12, color: '#666' }}>
                                    <span>使用 {c.usage_count} 次</span>
                                    {summary?.total_material_cost ? (
                                      <span style={{ float: 'right', color: '#1677ff' }}>
                                        占比 {((c.total_cost / summary.total_material_cost) * 100).toFixed(1)}%
                                      </span>
                                    ) : null}
                                  </div>
                                </Space>
                              </Card>
                            </Col>
                          ))}
                        </Row>
                      </Card>
                    </Col>
                    <Col xs={24}>
                      <Card title="材料类别汇总表" size="small">
                        <Table
                          size="small"
                          rowKey="material_category"
                          pagination={false}
                          dataSource={summary.by_category}
                          columns={[
                            { title: '材料类别', dataIndex: 'material_category', render: (v: string) => (
                              <Tag color={categoryColorMap[v] || 'default'} style={{ fontSize: 14, padding: '2px 12px' }}>{v}</Tag>
                            ) },
                            { title: '材料种类数', dataIndex: 'material_type_count', width: 120 },
                            { title: '总用量', dataIndex: 'total_quantity' },
                            { title: '使用次数', dataIndex: 'usage_count' },
                            { title: '总成本(元)', dataIndex: 'total_cost', render: (v: number) => (
                              <span style={{ color: '#cf1322', fontWeight: 600 }}>¥{v.toFixed(2)}</span>
                            ), sorter: (a: any, b: any) => a.total_cost - b.total_cost },
                            { title: '占比', render: (_: any, r: any) => summary?.total_material_cost ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{ width: 120, height: 8, background: '#f0f0f0', borderRadius: 4, overflow: 'hidden' }}>
                                  <div
                                    style={{
                                      height: '100%',
                                      width: `${(r.total_cost / summary.total_material_cost) * 100}%`,
                                      background: '#1677ff',
                                    }}
                                  />
                                </div>
                                <span style={{ color: '#1677ff' }}>
                                  {((r.total_cost / summary.total_material_cost) * 100).toFixed(1)}%
                                </span>
                              </div>
                            ) : '-' },
                          ]}
                        />
                      </Card>
                    </Col>
                  </Row>
                ) : (
                  <Empty description="暂无数据" />
                )}
              </>
            ),
          },
          {
            key: 'byCourse',
            label: '按课程汇总',
            children: (
              <>
                {(summary?.by_course?.length > 0) ? (
                  <Card title="各课程耗材成本统计" size="small">
                    <Table
                      size="small"
                      rowKey="course_id"
                      pagination={false}
                      dataSource={summary.by_course}
                      columns={[
                        { title: '课程名称', dataIndex: 'course_name', render: (v: string, r: any) => (
                          <span style={{ fontWeight: 500 }}>{v} <Tag color="blue">{r.course_category}</Tag></span>
                        ) },
                        { title: '开课次数', dataIndex: 'class_count' },
                        { title: '耗材使用次数', dataIndex: 'usage_count' },
                        { title: '耗材总成本(元)', dataIndex: 'total_material_cost', render: (v: number) => (
                          <span style={{ color: '#cf1322', fontWeight: 600 }}>¥{v.toFixed(2)}</span>
                        ), sorter: (a: any, b: any) => a.total_material_cost - b.total_material_cost },
                        { title: '单次课平均耗材(元)', render: (_: any, r: any) => (
                          <span style={{ color: '#fa8c16' }}>
                            ¥{r.class_count ? (r.total_material_cost / r.class_count).toFixed(2) : '0.00'}
                          </span>
                        ) },
                      ]}
                    />
                  </Card>
                ) : (
                  <Empty description="暂无数据" />
                )}
              </>
            ),
          },
        ]}
      />
    </div>
  );
}
