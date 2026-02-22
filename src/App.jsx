
import { Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import ManagerProfilePage from './pages/ManagerProfilePage'
import StoreProfilePage from './pages/StoreProfilePage'
import DashboardLayout from './layouts/DashboardLayout'
import HomePage from './pages/HomePage'
import CalendarPage from './pages/CalendarPage'
import CustomerPage from './pages/CustomerPage'
import AdminPage from './pages/AdminPage'
import ServiceManagementPage from './pages/ServiceManagementPage'
import StaffManagementPage from './pages/StaffManagementPage'
import GalleryManagementPage from './pages/GalleryManagementPage'
import InvitePage from './pages/InvitePage'

// LIFF Pages
import LiffRoot from './pages/liff/LiffRoot'
import LiffLayout from './layouts/LiffLayout'
import LiffHomePage from './pages/liff/LiffHomePage'
import LiffBookingPage from './pages/liff/LiffBookingPage'
import LiffRecordsPage from './pages/liff/LiffRecordsPage'
import LiffNewsPage from './pages/liff/LiffNewsPage'
import LiffProfilePage from './pages/liff/LiffProfilePage'
import LiffRegisterPage from './pages/liff/LiffRegisterPage'

function App() {
  return (
    <Routes>
      {/* Onboarding / Public Routes */}
      <Route path="/" element={<LoginPage />} />
      <Route path="/manager-profile" element={<ManagerProfilePage />} />
      <Route path="/store-profile" element={<StoreProfilePage />} />
      
      {/* Dashboard Routes with Bottom Navigation (B-Side) */}
      <Route element={<DashboardLayout />}>
        <Route path="/home" element={<HomePage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/customers" element={<CustomerPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Route>

      {/* Sub-pages */}
      <Route path="/services" element={<ServiceManagementPage />} />
      <Route path="/staff" element={<StaffManagementPage />} />
      <Route path="/admin/gallery" element={<GalleryManagementPage />} />
      <Route path="/invite" element={<InvitePage />} />

      {/* LIFF Routes (C-Side) */}
      <Route path="/liff/:tenantId" element={<LiffRoot />}>
        {/* Fullscreen Booking Flow */}
        <Route path="booking/new" element={<LiffBookingPage />} />
        
        {/* Registration Page */}
        <Route path="register" element={<LiffRegisterPage />} />
        
        {/* Tab Navigation Pages */}
        <Route element={<LiffLayout />}>
          <Route path="home" element={<LiffHomePage />} />
          <Route path="records" element={<LiffRecordsPage />} />
          <Route path="news" element={<LiffNewsPage />} />
          <Route path="profile" element={<LiffProfilePage />} />
          {/* Default redirect to home */}
          <Route index element={<Navigate to="home" replace />} />
        </Route>
      </Route>

      {/* Redirects */}
      <Route path="/dashboard" element={<Navigate to="/home" replace />} />
      <Route path="/account-management" element={<Navigate to="/admin" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App
