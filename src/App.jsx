import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';

// Auth
import Login from './pages/auth/Login.jsx';
import Register from './pages/auth/Register.jsx';
import AdminLogin from './pages/auth/AdminLogin.jsx';

// User
import UserDashboard from './pages/user/Dashboard.jsx';
import Projects from './pages/user/Projects.jsx';
import NewProject from './pages/user/NewProject.jsx';
import ProjectAssessment from './pages/user/ProjectAssessment.jsx';
import Notes from './pages/user/Notes.jsx';
import Manual from './pages/user/Manual.jsx';

// Admin
import AdminDashboard from './pages/admin/AdminDashboard.jsx';
import Submissions from './pages/admin/Submissions.jsx';
import Modules from './pages/admin/Modules.jsx';
import Tabs from './pages/admin/Tabs.jsx';
import LeafLevels from './pages/admin/LeafLevels.jsx';
import Users from './pages/admin/Users.jsx';
import ActivityLogs from './pages/admin/ActivityLogs.jsx';
import Settings from './pages/admin/Settings.jsx';

// ✅ এখানে তোমার admin email গুলো রাখো — AdminLogin.jsx এর মতোই
const ADMIN_EMAILS = ['draculabile55@gmail.com', 'rimondey010@gmail.com'];

// সাধারণ user route — login থাকলে ok, না থাকলে /login
function PrivateRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}

// Guest route — login না থাকলে ok, থাকলে redirect
function GuestRoute({ children }) {
  const { user } = useAuth();
  return !user ? children : <Navigate to="/dashboard" replace />;
}

// Admin guest route — admin login page এর জন্য
// login থাকলে admin dashboard এ, না থাকলে page দেখাবে
function AdminGuestRoute({ children }) {
  const { user } = useAuth();
  if (!user) return children;
  // যদি admin হয় → /admin, নাহলে → /dashboard
  return ADMIN_EMAILS.includes(user.email)
    ? <Navigate to="/admin" replace />
    : <Navigate to="/dashboard" replace />;
}

// Admin protected route — admin email না হলে ঢুকতে পারবে না
function AdminRoute({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/admin/login" replace />;
  if (!ADMIN_EMAILS.includes(user.email)) return <Navigate to="/dashboard" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Root */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* Auth */}
      <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
      <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />
      <Route path="/admin/login" element={<AdminGuestRoute><AdminLogin /></AdminGuestRoute>} />

      {/* User pages — normal user only */}
      <Route path="/dashboard" element={<PrivateRoute><UserDashboard /></PrivateRoute>} />
      <Route path="/projects" element={<PrivateRoute><Projects /></PrivateRoute>} />
      <Route path="/projects/new" element={<PrivateRoute><NewProject /></PrivateRoute>} />
      <Route path="/projects/:id" element={<PrivateRoute><ProjectAssessment /></PrivateRoute>} />
      <Route path="/notes" element={<PrivateRoute><Notes /></PrivateRoute>} />
      <Route path="/manual" element={<PrivateRoute><Manual /></PrivateRoute>} />

      {/* Admin pages — admin only */}
      <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
      <Route path="/admin/submissions" element={<AdminRoute><Submissions /></AdminRoute>} />
      <Route path="/admin/modules" element={<AdminRoute><Modules /></AdminRoute>} />
      <Route path="/admin/tabs" element={<AdminRoute><Tabs /></AdminRoute>} />
      <Route path="/admin/evaluation" element={<AdminRoute><LeafLevels /></AdminRoute>} />
      <Route path="/admin/users" element={<AdminRoute><Users /></AdminRoute>} />
      <Route path="/admin/activity" element={<AdminRoute><ActivityLogs /></AdminRoute>} />
      <Route path="/admin/settings" element={<AdminRoute><Settings /></AdminRoute>} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#0F1A0F',
              color: '#E8F5E9',
              border: '1px solid rgba(34,197,94,0.2)',
              borderRadius: '10px',
              fontSize: '13px',
            },
            success: { iconTheme: { primary: '#4ADE80', secondary: '#0F1A0F' } },
            error: { iconTheme: { primary: '#E2670C', secondary: '#0F1A0F' } },
          }}
        />
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}