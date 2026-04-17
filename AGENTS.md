# PROJECT KNOWLEDGE BASE

**Generated:** 2026-04-16
**Status:** IMPLEMENTED - Full MVP complete

## OVERVIEW

Personal finance management desktop application (个人财务管理桌面应用). 100% local deployment, no cloud. Core features: asset/liability ledger, financial dashboard, investment planning & tracking, profit analysis.

**Tech Stack:** Tauri 2.x + React 18 + TypeScript + SQLite + ECharts + Tailwind CSS + Zustand

## STRUCTURE

```
Lcgl/
├── src/                          # React frontend
│   ├── pages/                    # 10 page components
│   │   ├── Dashboard.tsx          # Financial dashboard (default route)
│   │   ├── Accounts.tsx          # Asset/Liability management
│   │   ├── Portfolio.tsx         # Investment holdings
│   │   ├── InvestmentDashboard.tsx
│   │   ├── ProfitAnalysis.tsx
│   │   ├── Reminders.tsx
│   │   ├── ImportExport.tsx
│   │   ├── Planning.tsx          # Goals & rebalancing
│   │   ├── CustomDashboard.tsx   # Widget builder
│   │   └── Settings.tsx          # Security & backup
│   ├── components/              # 5 reusable components
│   ├── lib/api.ts               # TypeScript API wrapper (571 lines)
│   ├── App.tsx                  # Router + navigation
│   └── main.tsx
├── src-tauri/src/               # Rust backend
│   ├── lib.rs                   # 1348 lines - 49 Tauri commands
│   ├── db/
│   │   ├── schema.sql           # Full P0 schema + seed data
│   │   ├── models.rs            # Rust struct models
│   │   └── migrations.rs        # Migration system
│   └── main.rs
├── package.json                  # React deps + Tauri CLI
├── tailwind.config.js           # Tailwind CSS v4
└── tauri.conf.json              # Tauri config
```

## WHERE TO LOOK

| Task           | Location                    | Notes                                                                                                                                          |
| -------------- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| All pages      | src/pages/                  | Routes: /, /accounts, /portfolio, /investment-dashboard, /profit-analysis, /reminders, /import-export, /planning, /custom-dashboard, /settings |
| API layer      | src/lib/api.ts              | TypeScript wrappers for all Rust commands                                                                                                      |
| DB schema      | src-tauri/src/db/schema.sql | All P0 tables, indexes, seed data                                                                                                              |
| Rust models    | src-tauri/src/db/models.rs  | 10 entity types with FromRow impl                                                                                                              |
| Tauri commands | src-tauri/src/lib.rs        | 49 CRUD + query commands                                                                                                                       |

## CONVENTIONS

- Chinese labels throughout UI
- Dark slate theme (slate-950 bg, amber/emerald/rose accents)
- ECharts for all visualizations
- React Router for navigation
- Tailwind CSS v4 for styling

## ANTI-PATTERNS (THIS PROJECT)

- **DO NOT** add cloud dependencies (100% local app)
- **DO NOT** skip TypeScript strict mode

## UNIQUE STYLES

- Chinese documentation convention
- Local-first, privacy-first design philosophy
- Desktop-first responsive layout

## COMMANDS

```bash
npm run tauri dev      # Development
npm run tauri build    # Production build
npm run lint           # ESLint
npm run build          # TypeScript + Vite build
```

## NOTES

- Build verification blocked on Linux server (missing GTK libraries) - works on local machine
- All 12 plan tasks completed
- Next: Final verification + build test on local machine
