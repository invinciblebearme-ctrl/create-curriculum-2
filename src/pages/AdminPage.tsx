import React, { useState, useEffect } from 'react';
import { verifyAdmin, setAdminPassword, clearAdminPassword, getAdminPassword } from '@/services/api';
import { Header } from '@/components/common/Header';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { ShieldCheck, KeyRound, Lock, Eye, EyeOff, LogOut, ArrowRight, Sparkles } from 'lucide-react';

export const AdminPage: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [adminUser, setAdminUser] = useState<any>(null);
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const checkInitialAuth = async () => {
    setLoading(true);
    setAuthError(null);
    try {
      const savedPw = getAdminPassword();
      if (savedPw) {
        const result = await verifyAdmin(savedPw);
        if (result.authenticated) {
          setIsAuthenticated(true);
          setAdminUser(result.user || { email: 'admin@school.ed.kr' });
          return;
        }
      }
      setIsAuthenticated(false);
    } catch {
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkInitialAuth();
  }, []);

  const handlePasswordSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setAuthError(null);

    const input = passwordInput.trim();
    if (!input) {
      setAuthError('비밀번호를 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      const result = await verifyAdmin(input);
      if (result.authenticated) {
        setAdminPassword(input);
        setIsAuthenticated(true);
        setAdminUser(result.user || { email: 'admin@school.ed.kr' });
        setPasswordInput('');
      } else {
        setIsAuthenticated(false);
        setAuthError(result.error || '비밀번호가 올바르지 않습니다.');
      }
    } catch (err: any) {
      setIsAuthenticated(false);
      setAuthError(err.message || '인증 처리 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    clearAdminPassword();
    setIsAuthenticated(false);
    setAdminUser(null);
    setPasswordInput('');
    setAuthError(null);
  };

  return (
    <div className="min-h-screen flex flex-col font-sans selection:bg-[#e2eaff] selection:text-[#586fca]">
      <Header />

      <main className="flex-1 max-w-[1160px] w-full mx-auto px-4 sm:px-6 py-8 sm:py-10">
        {!isAuthenticated ? (
          <div className="max-w-md mx-auto py-12">
            <div className="p-8 bg-white border border-[#e8edf6] rounded-[28px] shadow-edu-card text-center relative overflow-hidden">
              {/* Top Accent Decoration */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#6b82e6] via-[#94a8f7] to-[#e06b98]" />

              <div className="w-16 h-16 rounded-[22px] bg-gradient-to-br from-[#edf2ff] to-[#f4e8f5] text-[#586fca] flex items-center justify-center mx-auto mb-4 shadow-sm border border-[#e2e8f8]">
                <KeyRound className="w-8 h-8 text-[#586fca]" />
              </div>

              <span className="inline-block text-[11px] font-black text-[#687fe0] bg-[#eef3ff] border border-[#dce5fb] px-3 py-1 rounded-full mb-3">
                📖 [2번 서재] 교과전담 수업지도안
              </span>
              <h2 className="text-2xl font-black text-[#34415c] mb-2 tracking-tight">교과전담 지도안 관리자 센터</h2>
              <p className="text-xs text-[#8a96aa] mb-6 leading-relaxed">
                2번 서재(교과전담 수업지도안) 전자책 관리를 위해<br />
                관리자 비밀번호를 입력해주세요.
              </p>

              <form onSubmit={handlePasswordSubmit} className="space-y-4 text-left">
                <div>
                  <label className="block text-xs font-bold text-[#55657d] mb-1.5 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-[#687fe0]" /> 관리자 비밀번호
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={passwordInput}
                      onChange={(e) => {
                        setPasswordInput(e.target.value);
                        if (authError) setAuthError(null);
                      }}
                      placeholder="비밀번호를 입력하세요"
                      autoFocus
                      className="w-full pl-3.5 pr-10 py-3 bg-[#f8fafe] border border-[#dce3f1] rounded-[14px] text-sm font-semibold text-[#34415c] placeholder-[#9eabc0] focus:outline-none focus:border-[#687fe0] focus:bg-white focus:ring-2 focus:ring-[#687fe0]/20 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8a96aa] hover:text-[#55657d] p-1"
                      aria-label="비밀번호 보기 전환"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {authError && (
                  <div className="p-3 bg-[#fff0f4] border border-[#ffd2df] rounded-[12px] text-xs font-bold text-[#d84a75] flex items-center gap-2 animate-in fade-in">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#d84a75]" />
                    {authError}
                  </div>
                )}

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-[#687fe0] hover:bg-[#566ecf] active:scale-[0.99] text-white rounded-[14px] text-sm font-black flex items-center justify-center gap-2 transition shadow-edu-btn"
                  >
                    {loading ? (
                      <span>인증 확인 중...</span>
                    ) : (
                      <>
                        <span>관리자 센터 입장하기</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>

              <div className="mt-6 pt-5 border-t border-[#edf1f8] text-[11px] text-[#97a4b8]">
                Cloudflare Pages & D1 기반 보안 인증 시스템
              </div>
            </div>
          </div>
        ) : (
          <div>
            {/* Admin Header Bar */}
            <div className="mb-6 p-4 bg-white border border-[#e8edf6] rounded-[22px] shadow-edu-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-[12px] bg-[#ebfbf3] text-[#2ba06d] flex items-center justify-center border border-[#d2f3e3]">
                  <ShieldCheck className="w-5 h-5 text-[#2ba06d]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-[#34415c]">[2번 서재] 교과전담 수업지도안 관리자 인증 완료</span>
                    <span className="text-[10px] font-extrabold bg-[#edf2ff] text-[#586fca] px-2 py-0.5 rounded-full border border-[#dbe4fa]">
                      보안 세션 활성
                    </span>
                  </div>
                  <p className="text-[11px] text-[#8a96aa] font-medium">
                    계정: <span className="font-semibold text-[#55657d]">{adminUser?.email || 'admin@school.ed.kr'}</span>
                  </p>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="self-end sm:self-auto px-3.5 py-1.5 bg-[#f7f9fd] hover:bg-[#ffebee] text-[#718096] hover:text-[#e05260] border border-[#e2e8f0] rounded-[11px] text-xs font-bold flex items-center gap-1.5 transition"
              >
                <LogOut className="w-3.5 h-3.5" />
                로그아웃
              </button>
            </div>

            {/* Dashboard Contents */}
            <AdminDashboard />
          </div>
        )}
      </main>

      <footer className="mt-auto border-t border-[#e9edf7] bg-white py-6 text-center text-xs text-[#8996ab]">
        <p className="font-medium">© 2026 CREATE 모형 연구학교 · 성과공유 플랫폼 관리 센터</p>
      </footer>
    </div>
  );
};

