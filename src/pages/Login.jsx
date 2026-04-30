import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import { ShoppingCart, Lock, User, Eye, EyeOff } from 'lucide-react';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import { ROLES } from '../utils/permissions';
import LanguageSelector from '../components/layout/LanguageSelector';
import { useLanguage } from '../context/LanguageContext';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { t } = useLanguage();
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!username || !password) {
      toast.error(t('Please enter username and password'));
      return;
    }

    setLoading(true);
    try {
      const user = await login({ username, password });
      
      toast.success(t(`Welcome back, ${user.username}!`));
      
      // Redirect based on role
      if (user.role === ROLES.CASHIER) {
        navigate('/pos');
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      toast.error(t(error.response?.data?.message || 'Invalid credentials'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 flex items-center justify-center p-4">
      <div className="fixed right-4 top-4 z-10">
        <LanguageSelector />
      </div>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-full mb-4 shadow-lg">
            <ShoppingCart className="text-blue-600" size={32} />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">{t('POS System')}</h1>
          <p className="text-blue-100">{t('Sign in to your account')}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {t('Username')}
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={t('Enter username')}
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {t('Password')}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  // Added Tailwind arbitrary variants here to hide browser default icons
                  className="w-full pl-10 pr-12 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent [&::-ms-reveal]:hidden [&::-webkit-credentials-auto-fill-button]:hidden"
                  placeholder={t('Enter password')}
                />
                
                {/* Removed the conditional rendering wrapper so this button is always visible */}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full py-3 text-lg"
              disabled={loading}
            >
              {loading ? t('Signing in...') : t('Sign In')}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
