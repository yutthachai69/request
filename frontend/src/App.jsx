// frontend/src/App.jsx
import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { AnimatePresence } from 'framer-motion';
import { useAuth } from './context/AuthContext';

// Components
import MainLayout from './components/MainLayout';
import AnimatedPage from './components/AnimatedPage';
import AdminRoute from './components/AdminRoute';
import ProtectedRoute from './components/ProtectedRoute';

// Lazy Loading Pages
const LoginPage = lazy(() => import('./pages/LoginPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const RequestDetailPage = lazy(() => import('./pages/RequestDetailPage'));
const NewRequestPage = lazy(() => import('./pages/NewRequestPage'));
const RequestEditPage = lazy(() => import('./pages/RequestEditPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const WelcomePage = lazy(() => import('./pages/WelcomePage'));
const ReportPage = lazy(() => import('./pages/ReportPage'));

// Admin Pages
const UserManagementPage = lazy(() => import('./pages/admin/UserManagementPage'));
const UserEditPage = lazy(() => import('./pages/admin/UserEditPage'));
const UserCreatePage = lazy(() => import('./pages/admin/UserCreatePage'));
const DocConfigPage = lazy(() => import('./pages/admin/DocConfigPage'));
const StatusManagementPage = lazy(() => import('./pages/admin/StatusManagementPage'));
const CorrectionTypePage = lazy(() => import('./pages/admin/CorrectionTypePage'));
const CorrectionReasonPage = lazy(() => import('./pages/admin/CorrectionReasonPage'));
const CategoryManagementPage = lazy(() => import('./pages/admin/CategoryManagementPage'));
const DepartmentManagementPage = lazy(() => import('./pages/admin/DepartmentManagementPage'));
const LocationManagementPage = lazy(() => import('./pages/admin/LocationManagementPage'));
const WorkflowConfigPage = lazy(() => import('./pages/admin/WorkflowConfigPage'));
const RoleManagementPage = lazy(() => import('./pages/admin/RoleManagementPage'));
const EmailTemplatePage = lazy(() => import('./pages/admin/EmailTemplatePage'));
const AuditLogPage = lazy(() => import('./pages/admin/AuditLogPage'));

// ✅ 1. เพิ่ม Import หน้า AdminAuditReport ตรงนี้ครับ
const AdminAuditReport = lazy(() => import('./pages/admin/AdminAuditReport'));

import adminService from './services/adminService';

const PrivateRoute = ({ children }) => {
    const { user } = useAuth();
    return user ? <MainLayout>{children}</MainLayout> : <Navigate to="/login" />;
};

function App() {
    const location = useLocation();
    
    const loadingFallbackUI = (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
            <CircularProgress />
        </Box>
    );

    return (
        <Suspense fallback={loadingFallbackUI}>
            <AnimatePresence mode="wait">
                <Routes location={location} key={location.pathname}>
                    <Route path="/login" element={<AnimatedPage><LoginPage /></AnimatedPage>} />
                    
                    <Route path="/" element={<PrivateRoute><AnimatedPage><WelcomePage /></AnimatedPage></PrivateRoute>} />
                    <Route path="/profile" element={<PrivateRoute><AnimatedPage><ProfilePage /></AnimatedPage></PrivateRoute>} />
                    <Route path="/category/:categoryId" element={<PrivateRoute><AnimatedPage><DashboardPage /></AnimatedPage></PrivateRoute>} />
                    <Route path="/request/new" element={<PrivateRoute><AnimatedPage><NewRequestPage /></AnimatedPage></PrivateRoute>} />
                    <Route path="/request/:id" element={<PrivateRoute><AnimatedPage><RequestDetailPage /></AnimatedPage></PrivateRoute>} />
                    <Route path="/request/edit/:id" element={<PrivateRoute><AnimatedPage><RequestEditPage /></AnimatedPage></PrivateRoute>} />

                    <Route 
                        path="/report" 
                        element={
                            <ProtectedRoute allowedRoles={['Admin', 'Head of Department']}>
                                <AnimatedPage><ReportPage /></AnimatedPage>
                            </ProtectedRoute>
                        } 
                    />

                    {/* Admin Routes */}
                    <Route path="/admin/users" element={<AdminRoute><AnimatedPage><UserManagementPage /></AnimatedPage></AdminRoute>} />
                    <Route path="/admin/users/new" element={<AdminRoute><AnimatedPage><UserCreatePage /></AnimatedPage></AdminRoute>} />
                    <Route path="/admin/users/edit/:id" element={<AdminRoute><AnimatedPage><UserEditPage /></AnimatedPage></AdminRoute>} />
                    <Route path="/admin/roles" element={<AdminRoute><AnimatedPage><RoleManagementPage /></AnimatedPage></AdminRoute>} />
                    <Route path="/admin/statuses" element={<AdminRoute><AnimatedPage><StatusManagementPage /></AnimatedPage></AdminRoute>} />
                    <Route path="/admin/doc-config" element={<AdminRoute><AnimatedPage><DocConfigPage /></AnimatedPage></AdminRoute>} />
                    <Route path="/admin/correction-types" element={<AdminRoute><AnimatedPage><CorrectionTypePage /></AnimatedPage></AdminRoute>} />
                    <Route path="/admin/correction-reasons" element={<AdminRoute><AnimatedPage><CorrectionReasonPage /></AnimatedPage></AdminRoute>} />
                    <Route path="/admin/workflows" element={<AdminRoute><AnimatedPage><WorkflowConfigPage /></AnimatedPage></AdminRoute>} />
                    <Route path="/admin/email-templates" element={<AdminRoute><AnimatedPage><EmailTemplatePage /></AnimatedPage></AdminRoute>} />
                    <Route path="/admin/categories" element={<AdminRoute><AnimatedPage><CategoryManagementPage /></AnimatedPage></AdminRoute>} />
                    <Route path="/admin/departments" element={<AdminRoute><AnimatedPage><DepartmentManagementPage /></AnimatedPage></AdminRoute>} />
                    <Route path="/admin/audit-logs" element={<AdminRoute><AnimatedPage><AuditLogPage /></AnimatedPage></AdminRoute>} />
                    
                    {/* ✅ 2. เพิ่ม Route สำหรับหน้ารายงานประวัติการแก้ไข ตรงนี้ครับ */}
                    <Route path="/admin/audit-report" element={<AdminRoute><AnimatedPage><AdminAuditReport /></AnimatedPage></AdminRoute>} />
                    
                    <Route path="/admin/locations" element={<AdminRoute><AnimatedPage><LocationManagementPage /></AnimatedPage></AdminRoute>} />


                    <Route path="*" element={<Navigate to="/" />} />
                </Routes>
            </AnimatePresence>
        </Suspense>
    );
}

export default App;