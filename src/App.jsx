import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth, getPrimaryRole, userHasRole } from './context/AuthContext.jsx';

import Login      from './pages/auth/Login.jsx';
import Register   from './pages/auth/Register.jsx';
import AdminLogin from './pages/auth/AdminLogin.jsx';

import UserDashboard    from './pages/user/Dashboard.jsx';
import Projects         from './pages/user/Projects.jsx';
import NewProject       from './pages/user/NewProject.jsx';
import ProjectAssessment from './pages/user/ProjectAssessment.jsx';
import ProjectInfoForm   from './pages/user/ProjectInfoForm.jsx';
import Notes            from './pages/user/Notes.jsx';
import Manual           from './pages/user/Manual.jsx';
import Account                  from './pages/user/Account.jsx';
import CreateProfile            from './pages/user/CreateProfile.jsx';
import CalculationsArchivePage  from './pages/user/CalculationsArchivePage.jsx';
import CalculationViewPage      from './pages/user/CalculationViewPage.jsx';

import ReviewerSubmissions     from './pages/reviewer/Submissions.jsx';
import ReviewerSubmissionDetail from './pages/reviewer/SubmissionDetail.jsx';

import ManagerSubmissions from './pages/manager/ManagerSubmissions.jsx';
import ManagerUsers       from './pages/manager/ManagerUsers.jsx';

import AdminDashboard   from './pages/admin/AdminDashboard.jsx';
import Submissions      from './pages/admin/Submissions.jsx';
import SubmissionDetail from './pages/admin/SubmissionDetail.jsx';
import Modules          from './pages/admin/Modules.jsx';
import Tabs             from './pages/admin/Tabs.jsx';
import Categories       from './pages/admin/Categories.jsx';
import Sections         from './pages/admin/Sections.jsx';
import LeafLevels       from './pages/admin/LeafLevels.jsx';
import Users            from './pages/admin/Users.jsx';
import ActivityLogs     from './pages/admin/ActivityLogs.jsx';
import Settings         from './pages/admin/Settings.jsx';
import ImportExport     from './pages/admin/ImportExport.jsx';
import CalcEnginePage   from './pages/admin/CalcEnginePage.jsx';
import Resources        from './pages/admin/Resources.jsx';
import FormBuilder      from './pages/admin/FormBuilder.jsx';

// ── Route guards — role checked from dbUser.roles array (MongoDB) ─────────────

// Returns true if user needs to complete profile setup
function needsProfile(dbUser) {
  if (!dbUser) return false;
  const systemRoles = ['admin', 'reviewer', 'desh_manager', 'desh_reviewer', 'desh_assessor'];
  if (systemRoles.some(r => userHasRole(dbUser, r))) return false;
  return !dbUser.userType;
}

// ── Get the redirect destination based on highest-privilege role ──────────────
function getRoleRedirect(dbUser) {
  if (userHasRole(dbUser, 'admin'))        return '/admin';
  if (userHasRole(dbUser, 'desh_manager')) return '/manager/submissions';
  if (userHasRole(dbUser, 'desh_reviewer', 'desh_assessor', 'reviewer'))
                                           return '/reviewer/submissions';
  return null; // falls through to dashboard / profile setup
}

function PrivateRoute({ children }) {
  const { user, dbUser } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (needsProfile(dbUser)) return <Navigate to="/create-profile" replace />;
  return children;
}

// Route for /create-profile — redirect away if already completed
function ProfileSetupRoute({ children }) {
  const { user, dbUser } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  const redirect = getRoleRedirect(dbUser);
  if (redirect) return <Navigate to={redirect} replace />;
  if (dbUser?.userType) return <Navigate to="/dashboard" replace />;
  return children;
}

function GuestRoute({ children }) {
  const { user, dbUser } = useAuth();
  if (!user) return children;
  const redirect = getRoleRedirect(dbUser);
  if (redirect) return <Navigate to={redirect} replace />;
  if (needsProfile(dbUser)) return <Navigate to="/create-profile" replace />;
  return <Navigate to="/dashboard" replace />;
}

function AdminGuestRoute({ children }) {
  const { user, dbUser } = useAuth();
  if (!user) return children;
  if (userHasRole(dbUser, 'admin')) return <Navigate to="/admin" replace />;
  return <Navigate to="/dashboard" replace />;
}

function AdminRoute({ children }) {
  const { user, dbUser } = useAuth();
  if (!user) return <Navigate to="/admin/login" replace />;
  if (!userHasRole(dbUser, 'admin')) return <Navigate to="/dashboard" replace />;
  return children;
}

function ReviewerRoute({ children }) {
  const { user, dbUser } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  // Admin should use /admin routes, not reviewer routes
  if (userHasRole(dbUser, 'admin')) return <Navigate to="/admin" replace />;
  const allowed = ['reviewer', 'desh_reviewer', 'desh_assessor', 'desh_manager'];
  if (!userHasRole(dbUser, ...allowed))
    return <Navigate to="/dashboard" replace />;
  return children;
}

function ManagerRoute({ children }) {
  const { user, dbUser } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!userHasRole(dbUser, 'desh_manager', 'admin'))
    return <Navigate to="/dashboard" replace />;
  return children;
}

// ── Multi-role user route: allow users who have the "user" role (for project submission) ──
// This route allows access even if they also have reviewer/other roles.
function UserRoute({ children }) {
  const { user, dbUser } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  // Admin always goes to admin panel
  if (userHasRole(dbUser, 'admin')) return <Navigate to="/admin" replace />;
  // Manager goes to manager panel
  if (userHasRole(dbUser, 'desh_manager')) return <Navigate to="/manager/submissions" replace />;
  if (!userHasRole(dbUser, 'user')) return <Navigate to="/reviewer/submissions" replace />;
  if (needsProfile(dbUser))        return <Navigate to="/create-profile" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login"       element={<GuestRoute><Login/></GuestRoute>} />
      <Route path="/register"    element={<GuestRoute><Register/></GuestRoute>} />
      <Route path="/admin/login" element={<AdminGuestRoute><AdminLogin/></AdminGuestRoute>} />

      {/* Profile setup */}
      <Route path="/create-profile" element={<ProfileSetupRoute><CreateProfile/></ProfileSetupRoute>} />

      {/* User routes — accessible by any authenticated user with "user" role */}
      <Route path="/dashboard"    element={<UserRoute><UserDashboard/></UserRoute>} />
      <Route path="/projects"     element={<UserRoute><Projects/></UserRoute>} />
      <Route path="/projects/new" element={<UserRoute><NewProject/></UserRoute>} />
      <Route path="/projects/:id" element={<UserRoute><ProjectAssessment/></UserRoute>} />
      <Route path="/projects/:id/info" element={<UserRoute><ProjectInfoForm/></UserRoute>} />
      <Route path="/notes"              element={<PrivateRoute><Notes/></PrivateRoute>} />
      <Route path="/manual"             element={<PrivateRoute><Manual/></PrivateRoute>} />
      <Route path="/account"            element={<PrivateRoute><Account/></PrivateRoute>} />
      <Route path="/calculations"       element={<UserRoute><CalculationsArchivePage/></UserRoute>} />
      <Route path="/calculations/:id"   element={<UserRoute><CalculationViewPage/></UserRoute>} />

      {/* Reviewer routes */}
      <Route path="/reviewer/submissions"     element={<ReviewerRoute><ReviewerSubmissions/></ReviewerRoute>} />
      <Route path="/reviewer/submissions/:id" element={<ReviewerRoute><ReviewerSubmissionDetail/></ReviewerRoute>} />

      {/* Manager routes */}
      <Route path="/manager/submissions"      element={<ManagerRoute><ManagerSubmissions/></ManagerRoute>} />
      <Route path="/manager/users"            element={<ManagerRoute><ManagerUsers/></ManagerRoute>} />

      {/* Admin routes */}
      <Route path="/admin"                  element={<AdminRoute><AdminDashboard/></AdminRoute>} />
      <Route path="/admin/submissions"      element={<AdminRoute><Submissions/></AdminRoute>} />
      <Route path="/admin/submissions/:id"  element={<AdminRoute><SubmissionDetail/></AdminRoute>} />
      <Route path="/admin/modules"          element={<AdminRoute><Modules/></AdminRoute>} />
      <Route path="/admin/categories"       element={<AdminRoute><Categories/></AdminRoute>} />
      <Route path="/admin/tabs"             element={<AdminRoute><Tabs/></AdminRoute>} />
      <Route path="/admin/sections"         element={<AdminRoute><Sections/></AdminRoute>} />
      <Route path="/admin/evaluation"       element={<AdminRoute><LeafLevels/></AdminRoute>} />
      <Route path="/admin/users"            element={<AdminRoute><Users/></AdminRoute>} />
      <Route path="/admin/activity"         element={<AdminRoute><ActivityLogs/></AdminRoute>} />
      <Route path="/admin/settings"         element={<AdminRoute><Settings/></AdminRoute>} />
      <Route path="/admin/import-export"   element={<AdminRoute><ImportExport/></AdminRoute>} />
      <Route path="/admin/calc-engine"     element={<AdminRoute><CalcEnginePage/></AdminRoute>} />
      <Route path="/admin/resources"       element={<AdminRoute><Resources/></AdminRoute>} />
      <Route path="/admin/form-builder"    element={<AdminRoute><FormBuilder/></AdminRoute>} />

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
              background: '#0D3B1A',
              color: '#fff',
              border: '1px solid rgba(52,201,97,0.3)',
              borderRadius: 12,
              fontSize: 13.5,
              fontFamily: 'Nunito, sans-serif',
              fontWeight: 600,
            },
            success: { iconTheme: { primary: '#34C961', secondary: '#0D3B1A' } },
            error:   { iconTheme: { primary: '#EF4444', secondary: '#fff' } },
          }}
        />
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
