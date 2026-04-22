import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Portfolio from './pages/Portfolio';
import Accounts from './pages/Accounts';
import Reminders from './pages/Reminders';
import ImportExport from './pages/ImportExport';
import InvestmentDashboard from './pages/InvestmentDashboard';
import ProfitAnalysis from './pages/ProfitAnalysis';
import Planning from './pages/Planning';
import Insurance from './pages/Insurance';
import './App.css';

const navGroups = [
  {
    label: '核心看板',
    items: [
      {
        path: '/',
        label: '财务仪表盘',
        icon: '📊',
        description: '总览财务健康',
        badge: null,
      },
    ],
  },
  {
    label: '资产管理',
    items: [
      {
        path: '/accounts',
        label: '资产负债',
        icon: '🏦',
        description: '管理资产与负债',
        badge: null,
      },
      {
        path: '/portfolio',
        label: '投资组合',
        icon: '📈',
        description: '追踪持仓与盈亏',
        badge: null,
      },
      {
        path: '/insurance',
        label: '保险管理',
        icon: '🛡️',
        description: '管理保险保单',
        badge: null,
      },
    ],
  },
  {
    label: '分析工具',
    items: [
      {
        path: '/investment-dashboard',
        label: '投资看板',
        icon: '🎯',
        description: '市场数据总览',
        badge: null,
      },
      {
        path: '/profit-analysis',
        label: '收益分析',
        icon: '💹',
        description: '分析投资表现',
        badge: null,
      },
    ],
  },
  {
    label: '实用功能',
    items: [
      {
        path: '/reminders',
        label: '提醒中心',
        icon: '🔔',
        description: '还款 & 投资提醒',
        badge: null,
      },
      {
        path: '/import-export',
        label: '导入导出',
        icon: '📥',
        description: '数据备份与恢复',
        badge: null,
      },
      {
        path: '/planning',
        label: '规划中心',
        icon: '🧭',
        description: '理财目标与再平衡',
        badge: null,
      },
    ],
  },
];

function MascotSmile() {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ filter: 'drop-shadow(0 4px 8px rgba(99,102,241,0.25))' }}
    >
      <circle cx="24" cy="24" r="22" fill="url(#mascotGrad)" />
      <circle cx="17" cy="20" r="3" fill="white" />
      <circle cx="31" cy="20" r="3" fill="white" />
      <circle cx="18" cy="20" r="1.5" fill="#4f46e5" />
      <circle cx="32" cy="20" r="1.5" fill="#4f46e5" />
      <circle cx="19.5" cy="18.5" r="0.7" fill="white" />
      <circle cx="33.5" cy="18.5" r="0.7" fill="white" />
      <path
        d="M17 29 Q24 36 31 29"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="13" cy="27" r="3" fill="rgba(255,182,193,0.35)" />
      <circle cx="35" cy="27" r="3" fill="rgba(255,182,193,0.35)" />
      <defs>
        <linearGradient
          id="mascotGrad"
          x1="2"
          y1="2"
          x2="46"
          y2="46"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#818cf8" />
          <stop offset="1" stopColor="#6366f1" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function NavItem({
  path,
  label,
  icon,
  description,
}: {
  path: string;
  label: string;
  icon: string;
  description: string;
}) {
  const location = useLocation();
  const isActive = path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);
  return (
    <NavLink
      to={path}
      title={description}
      end={path === '/'}
      className={
        `group relative flex items-start gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150 ` +
        (isActive
          ? 'bg-gradient-to-r from-[#eef2ff] to-[#e0e7ff] text-[#4f46e5] font-semibold shadow-sm'
          : 'text-[#6b7280] hover:text-[#374151] hover:bg-[#f5f6ff]')
      }
    >
      {isActive && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-[#6366f1] rounded-r-full" />
      )}
      <span className="mt-0.5 text-base leading-none">{icon}</span>
      <div className="flex flex-col min-w-0">
        <span className="leading-tight">{label}</span>
        <span className="text-[10px] leading-tight mt-0.5 transition-opacity text-[#9ca3af] group-hover:opacity-100 opacity-0">
          {description}
        </span>
      </div>
    </NavLink>
  );
}

function Logo() {
  return (
    <svg
      width="36"
      height="36"
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="18" cy="18" r="18" fill="url(#logoGradient)" />
      <rect x="9" y="18" width="4" height="9" rx="1" fill="white" fillOpacity="0.7" />
      <rect x="16" y="13" width="4" height="14" rx="1" fill="white" fillOpacity="0.85" />
      <rect x="23" y="8" width="4" height="19" rx="1" fill="white" />
      <defs>
        <linearGradient
          id="logoGradient"
          x1="0"
          y1="0"
          x2="36"
          y2="36"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#6366f1" />
          <stop offset="1" stopColor="#4f46e5" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function App() {
  return (
    <BrowserRouter>
      <div className="flex min-h-screen bg-[#f8f9fc]">
        <nav className="w-64 bg-white border-r border-[#e8eaf0] shrink-0 flex flex-col overflow-hidden">
          <div className="px-5 py-4 border-b border-[#e8eaf0]">
            <div className="flex items-center gap-3">
              <Logo />
              <div>
                <h1 className="text-base font-bold text-[#1e293b] tracking-tight leading-tight">
                  Lcgl
                </h1>
                <p className="text-xs text-[#94a3b8] mt-0.5">理财管家</p>
              </div>
              <div className="ml-auto">
                <MascotSmile />
              </div>
            </div>
          </div>

          <div className="flex-1 py-3 px-3 overflow-y-auto space-y-5">
            {navGroups.map((group) => (
              <div key={group.label}>
                <div className="flex items-center gap-2 px-3 mb-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#c7d2fe]">
                    {group.label}
                  </span>
                  <div className="flex-1 h-px bg-gradient-to-r from-[#e0e7ff] to-transparent" />
                </div>
                <div className="space-y-0.5">
                  {group.items.map((item) => (
                    <NavItem key={item.path} {...item} />
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="px-5 py-3 border-t border-[#e8eaf0]">
            <p className="text-xs text-[#9ca3af]">v1.0 · 100% 本地存储</p>
          </div>
        </nav>
        <main className="flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/accounts" element={<Accounts />} />
            <Route path="/portfolio" element={<Portfolio />} />
            <Route path="/investment-dashboard" element={<InvestmentDashboard />} />
            <Route path="/reminders" element={<Reminders />} />
            <Route path="/insurance" element={<Insurance />} />
            <Route path="/import-export" element={<ImportExport />} />
            <Route path="/profit-analysis" element={<ProfitAnalysis />} />
            <Route path="/planning" element={<Planning />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
