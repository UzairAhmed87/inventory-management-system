import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, User, AlertCircle } from 'lucide-react';
import { toast } from '../ui/use-toast';
import { login as apiLogin } from '@/services/api';
import './LoginForm.css';

interface LoginFormProps {
  onLogin: (token: string, login_id: string, companyName: string) => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onLogin }) => {
  const [formData, setFormData] = useState({
    userId: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (!formData.userId || !formData.password) {
      setError('Please fill in all fields');
      setIsLoading(false);
      return;
    }

    try {
      const { token, company_name } = await apiLogin(formData.userId, formData.password);
      onLogin(token, formData.userId, company_name);
    } catch (err: any) {
      setError(err.message || 'Login failed');
      toast({
        title: "Login Failed",
        description: err.message || "Invalid credentials provided",
        variant: "destructive",
      });
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 via-indigo-200 to-pink-200 flex items-center justify-center p-2">
      <div className="w-full max-w-sm">
        <Card className="login-animate glass-card shadow-2xl border-0 backdrop-blur-md pt-12 pb-12 mt-8 mb-8 rounded-3xl">
          <style>{`.glass-card { box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.18), 0 0 32px 4px rgba(59,130,246,0.12); }`}</style>
          <CardHeader className="space-y-1 text-center pb-1 pt-1">
            <div className="mx-auto mb-2 flex flex-col items-center w-fit">
              <img src="/logo.png" alt="UA Trackistory Logo" className="h-20 w-auto mb-2 drop-shadow-lg" />
              <span className="text-4xl font-extrabold tracking-wide bg-gradient-to-r from-slate-700 to-blue-700 bg-clip-text text-transparent drop-shadow-sm">
                Trackistory
              </span>
            </div>
            <CardTitle className="text-3xl font-bold tracking-tight text-gray-800 drop-shadow-sm">Sign In</CardTitle>
            <p className="text-base text-gray-600">Enter your credentials to continue</p>
          </CardHeader>
          <CardContent className="pt-1 pb-1">
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="userId" className="text-gray-700 font-semibold">User ID</Label>
                <div className="relative">
                  <User className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                  <Input
                    id="userId"
                    type="text"
                    placeholder="Enter your user ID"
                    value={formData.userId}
                    onChange={(e) => setFormData(prev => ({ ...prev, userId: e.target.value }))}
                    className="pl-10 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all duration-200 hover:border-blue-300 focus:shadow-lg focus:shadow-blue-100"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-700 font-semibold">Password</Label>
                <div className="relative">
                  <Lock className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    className="pl-10 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all duration-200 hover:border-blue-300 focus:shadow-lg focus:shadow-blue-100"
                    required
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-center space-x-2 text-red-600 text-sm bg-red-50 p-3 rounded-md shadow">
                  <AlertCircle className="h-4 w-4" />
                  <span>{error}</span>
                </div>
              )}

              <Button 
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 shadow-lg transition-all duration-200 rounded-lg"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Signing in...</span>
                  </div>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>

            <div className="mt-4 text-center text-xs text-gray-500">
              <p>Access is restricted to registered users only.</p>
              <p className="mt-0.5">Contact your administrator for account registration.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
