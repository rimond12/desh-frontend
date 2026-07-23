import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth, getPrimaryRole, getActiveRole, userHasRole } from './context/AuthContext.jsx';
import { NotificationProvider } from './context/NotificationContext.jsx';

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

import NotificationsPage from './pages/NotificationsPage.jsx';

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
import ChatbotRules     from './pages/admin/ChatbotRules.jsx';
import SupportChat      from './pages/admin/SupportChat.jsx';
import DeshAiChatBot    from './components/shared/DeshAiChatBot.jsx';

import TicketDashboard     from './pages/admin/TicketDashboard.jsx';
import AdminTicketDetail   from './pages/admin/AdminTicketDetail.jsx';
import TicketFormBuilder   from './pages/admin/TicketFormBuilder.jsx';
import TicketConfig        from './pages/admin/TicketConfig.jsx';
import ManagerTicketDashboard from './pages/manager/ManagerTicketDashboard.jsx';
import ManagerTicketDetail   from './pages/manager/ManagerTicketDetail.jsx';
import ReviewerTickets     from './pages/reviewer/ReviewerTickets.jsx';
import ReviewerTicketDetail from './pages/reviewer/ReviewerTicketDetail.jsx';

// ── Route guards — role checked from dbUser.roles array (MongoDB) ─────────────

// Returns true if user needs to complete profile setup
function needsProfile(dbUser) {
  if (!dbUser) return false;
  const systemRoles = ['admin', 'reviewer', 'desh_manager', 'desh_reviewer', 'desh_assessor'];
  if (systemRoles.some(r => userHasRole(dbUser, r))) return false;
  return !dbUser.userType;
}

// ── Central redirect resolver ─────────────────────────────────────────────────
// Single source of truth: maps activeRole → correct destination path.
// Used by ALL route guards so the logic is never duplicated.
function resolveRedirect(dbUser) {
  const active = getActiveRole(dbUser);
  if (active === 'admin')                                               return '/admin';
  if (active === 'desh_manager')                                        return '/manager/submissions';
  if (['desh_reviewer', 'desh_assessor', 'reviewer'].includes(active)) return '/reviewer/submissions';
  return '/dashboard'; // 'user', 'owner', or any other role
}

// Kept for backward compat with GuestRoute / ProfileSetupRoute
function getRoleRedirect(dbUser) {
  const dest = resolveRedirect(dbUser);
  // Only return a redirect if the destination is NOT /dashboard
  // (so profile-setup logic can fall through)
  return dest !== '/dashboard' ? dest : null;
}

// ─────────────────────────────────────────────────────────────────────────────

// ── Unified Loading Screen for route transitions ──────────────────────────────
const RouteLoader = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-soft)' }}>
    <div style={{ width: 44, height: 44, borderRadius: '50%', border: '4px solid var(--g100)', borderTopColor: 'var(--g600)', animation: 'spin 0.8s linear infinite' }} />
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────

function PrivateRoute({ children }) {
  const { user, dbUser } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!dbUser) return <RouteLoader />;
  if (needsProfile(dbUser)) return <Navigate to="/create-profile" replace />;
  return children;
}

function ProfileSetupRoute({ children }) {
  const { user, dbUser } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!dbUser) return <RouteLoader />;
  const redirect = getRoleRedirect(dbUser);
  if (redirect) return <Navigate to={redirect} replace />;
  if (dbUser?.userType) return <Navigate to="/dashboard" replace />;
  return children;
}

function GuestRoute({ children }) {
  const { user, dbUser } = useAuth();
  if (!user) return children;
  if (!dbUser) return <RouteLoader />;
  const redirect = getRoleRedirect(dbUser);
  if (redirect) return <Navigate to={redirect} replace />;
  if (needsProfile(dbUser)) return <Navigate to="/create-profile" replace />;
  return <Navigate to="/dashboard" replace />;
}

function AdminGuestRoute({ children }) {
  const { user, dbUser } = useAuth();
  if (!user) return children;
  if (!dbUser) return <RouteLoader />;
  if (userHasRole(dbUser, 'admin')) return <Navigate to="/admin" replace />;
  return <Navigate to="/dashboard" replace />;
}

// ── AdminRoute ────────────────────────────────────────────────────────────────
// Security: user must actually HAVE the admin role (userHasRole check — unchanged).
// Routing:  if they've switched their activeRole away from 'admin', redirect them
//           out of the admin panel to wherever their activeRole points.
function AdminRoute({ children }) {
  const { user, dbUser } = useAuth();
  if (!user) return <Navigate to="/admin/login" replace />;
  if (!dbUser) return <RouteLoader />;

  // 1. Respect activeRole first — if the active role is not admin, redirect
  const active = getActiveRole(dbUser);
  if (active !== 'admin') {
    return <Navigate to={resolveRedirect(dbUser)} replace />;
  }

  // 2. Security check: must actually have admin role to access this route
  if (!userHasRole(dbUser, 'admin')) {
    return <Navigate to={resolveRedirect(dbUser)} replace />;
  }

  return children;
}

// ── ReviewerRoute ─────────────────────────────────────────────────────────────
// Security: user must actually HAVE a reviewer-capable role.
// Routing:  if their activeRole is not a reviewer type, redirect them out.
function ReviewerRoute({ children }) {
  const { user, dbUser } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!dbUser) return <RouteLoader />;

  // 1. Respect activeRole first — if active role is not reviewer-type, redirect
  const active = getActiveRole(dbUser);
  const reviewerRoles = ['reviewer', 'desh_reviewer', 'desh_assessor', 'desh_manager'];
  if (!reviewerRoles.includes(active)) {
    return <Navigate to={resolveRedirect(dbUser)} replace />;
  }

  // 2. Security check: must actually have a reviewer-capable role
  const allowed = ['reviewer', 'desh_reviewer', 'desh_assessor', 'desh_manager'];
  if (!userHasRole(dbUser, ...allowed)) {
    return <Navigate to={resolveRedirect(dbUser)} replace />;
  }

  return children;
}

// ── ManagerRoute ──────────────────────────────────────────────────────────────
// Security: user must actually HAVE manager or admin role.
// Routing:  if their activeRole is not desh_manager, redirect them out.
function ManagerRoute({ children }) {
  const { user, dbUser } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!dbUser) return <RouteLoader />;

  // 1. Respect activeRole first — if active role is not manager, redirect
  const active = getActiveRole(dbUser);
  if (active !== 'desh_manager') {
    return <Navigate to={resolveRedirect(dbUser)} replace />;
  }

  // 2. Security check: must actually have manager or admin role
  if (!userHasRole(dbUser, 'desh_manager', 'admin')) {
    return <Navigate to={resolveRedirect(dbUser)} replace />;
  }

  return children;
}

// ── UserRoute ─────────────────────────────────────────────────────────────────
// Security: user must actually HAVE the 'user' role.
// Routing:  if their activeRole is not 'user', redirect them to the correct portal.
function UserRoute({ children }) {
  const { user, dbUser } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!dbUser) return <RouteLoader />;

  // 1. Respect activeRole first — if active role is not user, redirect
  const active = getActiveRole(dbUser);
  if (active !== 'user') {
    return <Navigate to={resolveRedirect(dbUser)} replace />;
  }

  // 2. Security check: must actually have the 'user' role
  if (!userHasRole(dbUser, 'user')) {
    return <Navigate to="/reviewer/submissions" replace />;
  }

  if (needsProfile(dbUser)) return <Navigate to="/create-profile" replace />;

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
      <Route path="/notifications"      element={<PrivateRoute><NotificationsPage/></PrivateRoute>} />
      <Route path="/calculations"       element={<PrivateRoute><CalculationsArchivePage/></PrivateRoute>} />
      <Route path="/calculations/:id"   element={<PrivateRoute><CalculationViewPage/></PrivateRoute>} />

      {/* Reviewer routes */}
      <Route path="/reviewer/submissions"     element={<ReviewerRoute><ReviewerSubmissions/></ReviewerRoute>} />
      <Route path="/reviewer/submissions/:id" element={<ReviewerRoute><ReviewerSubmissionDetail/></ReviewerRoute>} />
      <Route path="/reviewer/tickets"         element={<ReviewerRoute><ReviewerTickets/></ReviewerRoute>} />
      <Route path="/reviewer/tickets/:id"     element={<ReviewerRoute><ReviewerTicketDetail/></ReviewerRoute>} />

      {/* Manager routes */}
      <Route path="/manager/submissions"      element={<ManagerRoute><ManagerSubmissions/></ManagerRoute>} />
      <Route path="/manager/users"            element={<ManagerRoute><ManagerUsers/></ManagerRoute>} />
      <Route path="/manager/tickets"          element={<ManagerRoute><ManagerTicketDashboard/></ManagerRoute>} />
      <Route path="/manager/tickets/:id"      element={<ManagerRoute><ManagerTicketDetail/></ManagerRoute>} />

      {/* Admin routes */}
      <Route path="/admin"                  element={<AdminRoute><AdminDashboard/></AdminRoute>} />
      <Route path="/admin/tickets"          element={<AdminRoute><TicketDashboard/></AdminRoute>} />
      <Route path="/admin/tickets/:id"      element={<AdminRoute><AdminTicketDetail/></AdminRoute>} />
      <Route path="/admin/ticket-form-builder" element={<AdminRoute><TicketFormBuilder/></AdminRoute>} />
      <Route path="/admin/ticket-config"    element={<AdminRoute><TicketConfig/></AdminRoute>} />
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
      <Route path="/admin/chatbot-rules"   element={<AdminRoute><Navigate to="/admin/desh-ai-manager" replace /></AdminRoute>} />
      <Route path="/admin/desh-ai-manager" element={<AdminRoute><ChatbotRules/></AdminRoute>} />
      <Route path="/admin/support-chat"    element={<AdminRoute><SupportChat/></AdminRoute>} />

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
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
          <DeshAiChatBot />
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
