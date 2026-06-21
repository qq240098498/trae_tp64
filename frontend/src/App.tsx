import { useState } from 'react';
import { Layout, Menu, theme } from 'antd';
import {
  BookOutlined,
  CalendarOutlined,
  TeamOutlined,
  UserAddOutlined,
  CheckCircleOutlined,
  MoneyCollectOutlined,
  AppstoreOutlined,
} from '@ant-design/icons';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import CoursesPage from './pages/CoursesPage';
import SchedulesPage from './pages/SchedulesPage';
import StudentsPage from './pages/StudentsPage';
import EnrollmentsPage from './pages/EnrollmentsPage';
import AttendancesPage from './pages/AttendancesPage';
import PaymentsPage from './pages/PaymentsPage';
import DashboardPage from './pages/DashboardPage';

const { Header, Sider, Content } = Layout;

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const menuItems = [
    { key: '/', icon: <AppstoreOutlined />, label: '数据概览' },
    { key: '/courses', icon: <BookOutlined />, label: '课程管理' },
    { key: '/schedules', icon: <CalendarOutlined />, label: '排课管理' },
    { key: '/students', icon: <TeamOutlined />, label: '学员管理' },
    { key: '/enrollments', icon: <UserAddOutlined />, label: '学员报名' },
    { key: '/attendances', icon: <CheckCircleOutlined />, label: '签到消次' },
    { key: '/payments', icon: <MoneyCollectOutlined />, label: '课酬核算' },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={(value) => setCollapsed(value)}>
        <div style={{
          height: 64,
          margin: 16,
          background: 'rgba(255, 255, 255, 0.2)',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: collapsed ? 14 : 18,
          fontWeight: 'bold',
        }}>
          {collapsed ? '兴趣班' : '兴趣班管理系统'}
        </div>
        <Menu
          theme="dark"
          selectedKeys={[location.pathname]}
          mode="inline"
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header style={{
          padding: '0 24px',
          background: colorBgContainer,
          display: 'flex',
          alignItems: 'center',
        }}>
          <h2 style={{ margin: 0 }}>
            {menuItems.find(m => m.key === location.pathname)?.label || '管理系统'}
          </h2>
        </Header>
        <Content style={{ margin: '16px' }}>
          <div
            style={{
              padding: 24,
              minHeight: 'calc(100vh - 128px)',
              background: colorBgContainer,
              borderRadius: borderRadiusLG,
            }}
          >
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/courses" element={<CoursesPage />} />
              <Route path="/schedules" element={<SchedulesPage />} />
              <Route path="/students" element={<StudentsPage />} />
              <Route path="/enrollments" element={<EnrollmentsPage />} />
              <Route path="/attendances" element={<AttendancesPage />} />
              <Route path="/payments" element={<PaymentsPage />} />
            </Routes>
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}

export default App;
