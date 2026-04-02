import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import toast from 'react-hot-toast';

const ADMIN_EMAILS = ['draculabile55@gmail.com', 'rimondey010@gmail.com'];

export default function Login() {
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [gLoading, setGLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const redirectAfterLogin = (email) => {
    if (ADMIN_EMAILS.includes(email)) {
      navigate('/admin');
    } else {
      navigate('/dashboard');
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const cred = await login(form.email, form.password);
      toast.success('Welcome back!');
      redirectAfterLogin(cred.user.email);
    } catch {
      toast.error('Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setGLoading(true);
    try {
      const cred = await loginWithGoogle();
      toast.success('Signed in with Google!');
      redirectAfterLogin(cred.user.email);
    } catch {
      toast.error('Google sign-in failed.');
    } finally {
      setGLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-between py-8 px-4 font-sans">

      {/* 1. Top Govt Logo - বড় এবং সাদা ব্যাকগ্রাউন্ডে স্পষ্ট */}
      <div className="w-full flex justify-center mt-4 mb-5">
        <img
          src="/images/bdLogo.jpg"
          alt="Govt Logo"
          className="h-40 w-auto object-contain"
        />
      </div>

      {/* 2. Main Login Card Area */}
      <div className="w-full max-w-[440px] flex flex-col items-center">

        {/* DESH Main Logo - স্ক্রিনশটের মতো বড় সাইজ */}
        <div className="mb-8 flex flex-col items-center">
          <img
            src="/images/DESH_Picture1.png"
            alt="DESH Logo"
            className="h-48 w-auto object-contain"
          />
        </div>

        {/* Form Container */}
        <div className="w-full space-y-5">
          {/* Email Field */}
          <div>
            <label className="block text-gray-700 font-semibold mb-1.5 ml-1">Email Address</label>
            <div className="relative flex items-center">
              <div className="absolute left-4 text-gray-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
              </div>
              <input
                type="email" name="email" value={form.email} onChange={handle} required
                placeholder="ashikj2000@gmail.com"
                className="w-full pl-12 pr-4 py-3.5 bg-[#EBF2FE] border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all text-gray-700"
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <label className="block text-gray-700 font-semibold mb-1.5 ml-1">Password</label>
            <div className="relative flex items-center">
              <div className="absolute left-4 text-gray-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
              </div>
              <input
                type={showPass ? 'text' : 'password'} name="password" value={form.password} onChange={handle} required
                placeholder="••••••"
                className="w-full pl-12 pr-12 py-3.5 bg-[#EBF2FE] border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all text-gray-700"
              />
              <button
                type="button" onClick={() => setShowPass(!showPass)}
                className="absolute right-4 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
              </button>
            </div>
          </div>

          {/* Sign In Button */}
          <button
            onClick={submit} disabled={loading}
            className="w-full py-4 bg-[#2D8A56] hover:bg-[#246e45] text-white font-bold rounded-lg flex items-center justify-center gap-2 transition-colors shadow-md mt-2"
          >
            {loading ? 'Processing...' : <><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" transform="rotate(180)"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"></path></svg> Sign In</>}
          </button>

          {/* Google Button (Optional but added for functionality) */}
          <button
            onClick={handleGoogle} disabled={gLoading}
            className="w-full py-3 border border-gray-200 rounded-lg flex items-center justify-center gap-3 text-gray-600 font-medium hover:bg-gray-50 transition-all text-sm shadow-sm"
          >
            {gLoading ? 'Connecting...' : 'Sign in with Google'}
          </button>
        </div>

        {/* Divider & Links */}
        <div className="mt-8 text-center">
          <div className="w-full h-px bg-gray-100 mb-6"></div>
          <p className="text-gray-600 mb-4 font-medium">
            Don't have an account? <Link to="/register" className="text-[#2D8A56] font-bold hover:underline">Register here</Link>
          </p>
          <Link to="/admin/login" className="flex items-center justify-center gap-1.5 text-gray-500 hover:text-gray-800 transition-colors text-sm font-semibold">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"></path></svg>
            Admin Login
          </Link>
        </div>
      </div>

      {/* 3. Footer Partners - স্ক্রিনশটের মতো বড় এবং কালারফুল */}
      <div className="w-full max-w-7xl mt-12 mb-4">
        <div className="flex flex-wrap justify-center items-center gap-10 md:gap-16">
          <img src="/images/0_HBRI_Picture3.png" alt="HBRI" className="h-16 w-auto" />
          <img src="/images/1_UNOPS_Picture4.png" alt="UNOPS" className="h-12 w-auto" />
          <img src="/images/2_PS3_Picture5.png" alt="UN Environment" className="h-14 w-auto" />
          <img src="/images/3_UN_HABITAT_Picture8.png" alt="GABC" className="h-12 w-auto" />
          <img src="/images/4_UNEP_Picture6.png" alt="German Coop" className="h-16 w-auto" />
          <img src="/images/5_GABC_Picture7.png" alt="German Coop" className="h-16 w-auto" />
        </div>
      </div>

    </div>
  );
}