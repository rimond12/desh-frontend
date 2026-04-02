import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import toast from 'react-hot-toast';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) { toast.error('Passwords do not match'); return; }
    if (form.password.length < 6) { toast.error('Password must be at least 6 characters'); return; }

    setLoading(true);
    try {
      await register(form.email, form.password, form.name);
      toast.success('Account created! Welcome to DESH.');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.message || 'Registration failed');
    } finally { setLoading(false); }
  };

  // Password Strength Logic
  const strength = form.password.length === 0 ? 0 : form.password.length < 6 ? 1 : form.password.length < 10 ? 2 : 3;
  const strengthColors = ['', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500'];
  const textColors = ['', 'text-orange-500', 'text-yellow-600', 'text-green-600'];
  const strengthLabels = ['', 'Weak', 'Fair', 'Strong'];

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-between py-8 px-4 font-sans">

      {/* 1. Top Govt Logo Area */}
      <div className="w-full flex flex-col items-center mt-2 mb-2">
        <img
          src="/images/bdLogo.jpg"
          alt="Govt Logo"
          className="h-40 w-auto object-contain mb-3"
        />
      </div>

      {/* 2. Main Register Card Area */}
      <div className="w-full max-w-[500px] flex flex-col items-center">

        {/* DESH Logo */}
        <div className="mb-6 flex flex-col items-center">
          <img
            src="/images/DESH_Picture1.png"
            alt="DESH Logo"
            className="h-48 w-auto object-contain"
          />
        </div>

        {/* Form Container */}
        <div className="w-full    p-8 md:p-10">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-black text-gray-800 tracking-tight">Create Account</h2>
            <p className="text-gray-500 text-sm mt-1">Join the green building community</p>
          </div>

          <form onSubmit={submit} className="space-y-5">
            {/* Full Name */}
            <div>
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Full Name</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">👤</span>
                <input
                  type="text" name="name" value={form.name} onChange={handle} required
                  placeholder="Muhammad Rahman"
                  /* text-gray-900 যোগ করা হয়েছে */
                  className="w-full pl-11 pr-4 py-3.5 bg-[#EBF2FE] text-gray-900 border border-transparent rounded-xl focus:outline-none focus:ring-2 focus:ring-green-100 focus:bg-white focus:border-green-500 transition-all text-sm"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Email Address</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">✉</span>
                <input
                  type="email" name="email" value={form.email} onChange={handle} required
                  placeholder="you@example.com"
                  /* text-gray-900 যোগ করা হয়েছে */
                  className="w-full pl-11 pr-4 py-3.5 bg-[#EBF2FE] text-gray-900 border border-transparent rounded-xl focus:outline-none focus:ring-2 focus:ring-green-100 focus:bg-white focus:border-green-500 transition-all text-sm"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Password</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">🔒</span>
                <input
                  type={showPass ? 'text' : 'password'} name="password" value={form.password} onChange={handle} required
                  placeholder="Min. 6 characters"
                  /* text-gray-900 যোগ করা হয়েছে */
                  className="w-full pl-11 pr-12 py-3.5 bg-[#EBF2FE] text-gray-900 border border-transparent rounded-xl focus:outline-none focus:ring-2 focus:ring-green-100 focus:bg-white focus:border-green-500 transition-all text-sm"
                />
                <button
                  type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400 hover:text-green-600 uppercase transition-colors"
                >
                  {showPass ? 'Hide' : 'Show'}
                </button>
              </div>

              {/* Password Strength Indicator */}
              {form.password && (
                <div className="mt-3 px-1">
                  <div className="flex gap-1.5 mb-1.5">
                    {[1, 2, 3].map(i => (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-500 ${strength >= i ? strengthColors[strength] : 'bg-gray-100'}`} />
                    ))}
                  </div>
                  <p className={`text-[10px] font-bold uppercase tracking-wider ${textColors[strength]}`}>{strengthLabels[strength]} Password</p>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Confirm Password</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">🔒</span>
                <input
                  type="password" name="confirm" value={form.confirm} onChange={handle} required
                  placeholder="Repeat password"
                  /* text-gray-900 যোগ করা হয়েছে */
                  className="w-full pl-11 pr-4 py-3.5 bg-[#EBF2FE] text-gray-900 border border-transparent rounded-xl focus:outline-none focus:ring-2 focus:ring-green-100 focus:bg-white focus:border-green-500 transition-all text-sm"
                />
              </div>
              {form.confirm && form.password !== form.confirm && (
                <p className="mt-2 text-xs text-orange-500 font-medium ml-1">Passwords don't match</p>
              )}
            </div>

            <button
              type="submit" disabled={loading}
              className="w-full py-4 bg-[#2D8A56] hover:bg-[#246e45] text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_10px_20px_rgba(45,138,86,0.15)] active:scale-[0.98] disabled:opacity-70 mt-4"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 5a.75.75 0 01.75.75v3.5h3.5a.75.75 0 010 1.5h-3.5v3.5a.75.75 0 01-1.5 0v-3.5h-3.5a.75.75 0 010-1.5h3.5v-3.5A.75.75 0 0110 5z" /></svg>
                  Create Account
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center pt-6 border-t border-gray-50">
            <p className="text-gray-500 text-sm">
              Already have an account?{' '}
              <Link to="/login" className="text-[#2D8A56] font-bold hover:underline">Sign in →</Link>
            </p>
          </div>
        </div>
      </div>

      {/* 3. Footer Partner Logos */}
      <div className="w-full max-w-7xl mt-12 mb-4 bg-gray-50/50 py-8 px-6 rounded-3xl border border-gray-100">
        <p className="text-center text-[10px] text-gray-400 mb-8 font-bold uppercase tracking-[0.2em]">Institutional Partners & Supporters</p>
        <div className="flex flex-wrap justify-center items-center gap-10 md:gap-16">
          <img src="/images/0_HBRI_Picture3.png" alt="HBRI" className="h-14 w-auto object-contain" />
          <img src="/images/1_UNOPS_Picture4.png" alt="UNOPS" className="h-10 w-auto object-contain" />
          <img src="/images/2_PS3_Picture5.png" alt="UN Environment" className="h-12 w-auto object-contain" />
          <img src="/images/3_UN_HABITAT_Picture8.png" alt="UN Habitat" className="h-12 w-auto object-contain" />
          <img src="/images/4_UNEP_Picture6.png" alt="UNEP" className="h-14 w-auto object-contain" />
          <img src="/images/5_GABC_Picture7.png" alt="GABC" className="h-14 w-auto object-contain" />
        </div>
      </div>
    </div>
  );
}