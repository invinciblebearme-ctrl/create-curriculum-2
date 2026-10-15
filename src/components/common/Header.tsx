import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BookOpen, ShieldCheck, Home, Palette, ExternalLink } from 'lucide-react';
import { isDevAdminEnabled, setDevAdminMode } from '@/services/api';

export const Header: React.FC = () => {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');
  const [devAdmin, setDevAdmin] = React.useState(isDevAdminEnabled());

  const handleToggleDevAdmin = () => {
    const next = !devAdmin;
    setDevAdmin(next);
    setDevAdminMode(next);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-[#e8edf7] transition-all">
      {/* create.allforedu.kr Top Line Accent */}
      <div className="text-center tracking-[14px] text-[#c5d4fa] text-[11px] pt-1.5 select-none pointer-events-none">
        ••••••••••••••••••••••••••••••••
      </div>

      <div className="max-w-[1160px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand Logo (Links to https://create.allforedu.kr) */}
        <a
          href="https://create.allforedu.kr"
          className="flex items-center gap-3 group"
          title="create.allforedu.kr 메인 사이트로 돌아가기"
        >
          <div className="w-[43px] h-[43px] rounded-[14px] bg-[#e2eaff] text-[#6b7fe0] flex items-center justify-center text-xl font-black shadow-sm group-hover:scale-105 transition-transform duration-200">
            <Palette className="w-5 h-5 text-[#6b7fe0]" />
          </div>
          <div className="text-left">
            <strong className="text-[20px] font-extrabold tracking-[0.5px] text-[#374f7e] block leading-tight group-hover:text-[#687fe0] transition-colors">
              CREATE
            </strong>
            <small className="block text-[9.5px] font-bold tracking-[1.6px] text-[#8b9ab7] mt-0.5">
              연구학교 성과 공유 플랫폼 · 3D 교과전담 서재
            </small>
          </div>
        </a>

        {/* Navigation Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick toggle for local test */}
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f4f6fb] text-[11px] font-bold text-[#8490a8] border border-[#e8edf6]">
            <span className="w-2 h-2 rounded-full bg-[#4aab82]" />
            <span>데모 모드</span>
            <button
              onClick={handleToggleDevAdmin}
              className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-black transition ${
                devAdmin ? 'bg-[#687fe0] text-white shadow-sm' : 'bg-white text-[#8490a8] border border-[#e8edf6]'
              }`}
              title="관리자 인증 헤더 토글"
            >
              {devAdmin ? '관리자 ON' : '관리자 OFF'}
            </button>
          </div>

          <a
            href="https://create.allforedu.kr"
            className="flex items-center gap-1.5 px-3 py-2 rounded-[13px] bg-[#f5f8ff] hover:bg-[#e9f0fe] text-[#55698d] hover:text-[#374f7e] text-xs font-bold border border-[#dbe4fa] transition shadow-xs"
            title="create.allforedu.kr 메인 사이트로 이동"
          >
            <span>메인 포털</span>
            <ExternalLink className="w-3.5 h-3.5 text-[#687fe0]" />
          </a>

          {isAdmin ? (
            <Link
              to="/"
              className="flex items-center gap-1.5 px-4 py-2 rounded-[13px] bg-[#edf1ff] text-[#586fca] hover:bg-[#687fe0] hover:text-white text-xs font-extrabold transition-all shadow-sm"
            >
              <Home className="w-4 h-4" />
              <span>성과공유 서재</span>
            </Link>
          ) : (
            <Link
              to="/admin"
              className="flex items-center gap-1.5 px-4 py-2 rounded-[13px] bg-[#687fe0] hover:bg-[#566ecf] text-white text-xs font-extrabold transition shadow-edu-btn hover:-translate-y-0.5"
            >
              <ShieldCheck className="w-4 h-4 text-[#ffeef4]" />
              <span>교과전담 관리센터</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};
