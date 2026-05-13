import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Lock, User, UserPlus } from 'lucide-react';
import Button from '../components/common/Button';
import { BRAND_NAME } from '../utils/branding';
import api from '../api/axios'; // ඔයා හදපු axios instance එක

const Register = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    // මූලික validation
    if (!username || !password || !confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      // Backend එකට request එක යවනවා
      await api.post('/auth/register-admin', {
        username,
        password
      });

      toast.success('Admin account created successfully!');
      navigate('/login'); // සාර්ථක නම් login පේජ් එකට යවනවා
    } catch (error) {
      toast.error(error.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-screen flex min-h-screen items-center justify-center p-4">
      <div className="auth-panel-enter w-full max-w-md" style={{ animationDelay: '90ms' }}>
        <div className="page-section-enter mb-8 text-center" style={{ animationDelay: '180ms' }}>
          <div className="shell-chip mx-auto mb-4 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-[0.22em] text-blue-900">
            Admin Setup
          </div>
          <h1 className="mb-2 text-4xl font-bold text-white">{BRAND_NAME}</h1>
          <p className="text-blue-100">Create your admin account</p>
        </div>

        <div className="auth-card rounded-2xl p-8">
          <form onSubmit={handleSubmit} className="page-section-enter space-y-5" style={{ animationDelay: '260ms' }}>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Username</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="auth-input w-full rounded-lg border border-slate-300 py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Choose a username"
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="auth-input w-full rounded-lg border border-slate-300 py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter password"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="auth-input w-full rounded-lg border border-slate-300 py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Confirm your password"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="flex w-full items-center justify-center gap-2 py-3 text-lg shadow-lg shadow-blue-600/20 hover:-translate-y-0.5"
              disabled={loading}
            >
              {loading ? 'Registering...' : (
                <>
                  <UserPlus size={20} />
                  Register Admin
                </>
              )}
            </Button>
          </form>

          <div className="page-section-enter mt-6 text-center" style={{ animationDelay: '340ms' }}>
            <p className="text-sm text-slate-600">
              Already have an account?{' '}
              <Link to="/login" className="text-blue-600 font-semibold hover:underline">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
