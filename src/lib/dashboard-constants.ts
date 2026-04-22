export type WidgetType =
  | 'kpi_networth'
  | 'kpi_assets'
  | 'kpi_liabilities'
  | 'kpi_debt_ratio'
  | 'kpi_cashflow'
  | 'kpi_investment_value'
  | 'kpi_investment_return'
  | 'chart_asset_dist'
  | 'chart_liability'
  | 'chart_trend'
  | 'chart_invest_return'
  | 'chart_holdings_rank'
  | 'table_transactions'
  | 'table_reminders'
  | 'insurance_summary';

export type LayoutInfo = {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

export interface LayoutItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface WidgetConfig {
  type: WidgetType;
  id: string;
  title: string;
}

export interface DashboardLayout {
  name: string;
  widgets: WidgetConfig[];
  layout: LayoutItem[];
  created_at: string;
}

export const WIDGET_DEFAULTS: Record<WidgetType, { w: number; h: number }> = {
  kpi_networth: { w: 3, h: 4 },
  kpi_assets: { w: 3, h: 4 },
  kpi_liabilities: { w: 3, h: 4 },
  kpi_debt_ratio: { w: 3, h: 4 },
  kpi_cashflow: { w: 3, h: 4 },
  kpi_investment_value: { w: 3, h: 4 },
  kpi_investment_return: { w: 3, h: 4 },
  chart_asset_dist: { w: 5, h: 8 },
  chart_liability: { w: 5, h: 8 },
  chart_trend: { w: 15, h: 10 },
  chart_invest_return: { w: 8, h: 9 },
  chart_holdings_rank: { w: 7, h: 9 },
  table_transactions: { w: 4, h: 9 },
  table_reminders: { w: 4, h: 8 },
  insurance_summary: { w: 4, h: 8 },
};

export const ALL_WIDGET_TYPES: Array<{ type: WidgetType; label: string }> = [
  { type: 'kpi_networth', label: '净资产' },
  { type: 'kpi_assets', label: '总资产' },
  { type: 'kpi_liabilities', label: '总负债' },
  { type: 'kpi_debt_ratio', label: '负债资产比' },
  { type: 'kpi_cashflow', label: '月现金流' },
  { type: 'kpi_investment_value', label: '投资收益' },
  { type: 'kpi_investment_return', label: '投资回报率' },
  { type: 'chart_asset_dist', label: '资产分布图' },
  { type: 'chart_liability', label: '负债结构图' },
  { type: 'chart_trend', label: '资产负债趋势' },
  { type: 'chart_invest_return', label: '投资回报趋势' },
  { type: 'chart_holdings_rank', label: '持仓排名' },
  { type: 'table_transactions', label: '近期交易' },
  { type: 'table_reminders', label: '待办提醒' },
  { type: 'insurance_summary', label: '保险保障' },
];

export function buildDefaultLayout(): { widgets: WidgetConfig[]; layout: LayoutItem[] } {
  const widgets: WidgetConfig[] = [
    { type: 'kpi_networth', id: 'w1', title: '净资产' },
    { type: 'kpi_assets', id: 'w2', title: '总资产' },
    { type: 'kpi_liabilities', id: 'w3', title: '总负债' },
    { type: 'kpi_investment_value', id: 'w4', title: '投资总额' },
    { type: 'kpi_cashflow', id: 'w5', title: '月现金流' },
    { type: 'insurance_summary', id: 'w6', title: '保险保障' },
    { type: 'chart_asset_dist', id: 'w7', title: '资产分布' },
    { type: 'chart_trend', id: 'w8', title: '资产负债趋势' },
  ];
  const layout: LayoutItem[] = [
    { i: 'w1', x: 0, y: 0, w: 4, h: 3 },
    { i: 'w2', x: 4, y: 0, w: 3, h: 3 },
    { i: 'w3', x: 7, y: 0, w: 3, h: 3 },
    { i: 'w4', x: 10, y: 0, w: 3, h: 3 },
    { i: 'w5', x: 13, y: 0, w: 2, h: 3 },
    { i: 'w6', x: 0, y: 3, w: 4, h: 5 },
    { i: 'w7', x: 4, y: 3, w: 5, h: 5 },
    { i: 'w8', x: 9, y: 3, w: 6, h: 5 },
  ];
  return { widgets, layout };
}

export function buildInvestmentFocusLayout(): { widgets: WidgetConfig[]; layout: LayoutItem[] } {
  const widgets: WidgetConfig[] = [
    { type: 'kpi_networth', id: 'w1', title: '净资产' },
    { type: 'kpi_investment_value', id: 'w2', title: '投资总额' },
    { type: 'kpi_investment_return', id: 'w3', title: '投资收益' },
    { type: 'kpi_assets', id: 'w4', title: '总资产' },
    { type: 'chart_invest_return', id: 'w5', title: '投资收益' },
    { type: 'chart_holdings_rank', id: 'w6', title: '持仓排名' },
    { type: 'chart_asset_dist', id: 'w7', title: '资产分布' },
    { type: 'chart_trend', id: 'w8', title: '资产负债趋势' },
  ];
  const layout: LayoutItem[] = [
    { i: 'w1', x: 0, y: 0, w: 4, h: 3 },
    { i: 'w2', x: 4, y: 0, w: 4, h: 3 },
    { i: 'w3', x: 8, y: 0, w: 3, h: 3 },
    { i: 'w4', x: 11, y: 0, w: 4, h: 3 },
    { i: 'w5', x: 0, y: 3, w: 8, h: 5 },
    { i: 'w6', x: 8, y: 3, w: 7, h: 5 },
    { i: 'w7', x: 0, y: 8, w: 7, h: 5 },
    { i: 'w8', x: 7, y: 8, w: 8, h: 5 },
  ];
  return { widgets, layout };
}

export function buildWealthHealthLayout(): { widgets: WidgetConfig[]; layout: LayoutItem[] } {
  const widgets: WidgetConfig[] = [
    { type: 'kpi_assets', id: 'w1', title: '总资产' },
    { type: 'kpi_networth', id: 'w2', title: '净资产' },
    { type: 'kpi_liabilities', id: 'w3', title: '总负债' },
    { type: 'kpi_debt_ratio', id: 'w4', title: '负债率' },
    { type: 'kpi_cashflow', id: 'w5', title: '现金流' },
    { type: 'chart_asset_dist', id: 'w6', title: '资产分布' },
    { type: 'chart_trend', id: 'w7', title: '趋势变化' },
    { type: 'chart_liability', id: 'w8', title: '负债结构' },
    { type: 'insurance_summary', id: 'w9', title: '保险保障' },
  ];
  const layout: LayoutItem[] = [
    { i: 'w1', x: 0, y: 0, w: 3, h: 3 },
    { i: 'w2', x: 3, y: 0, w: 3, h: 3 },
    { i: 'w3', x: 6, y: 0, w: 3, h: 3 },
    { i: 'w4', x: 9, y: 0, w: 3, h: 3 },
    { i: 'w5', x: 12, y: 0, w: 3, h: 3 },
    { i: 'w6', x: 0, y: 3, w: 5, h: 5 },
    { i: 'w7', x: 5, y: 3, w: 10, h: 5 },
    { i: 'w8', x: 0, y: 8, w: 7, h: 5 },
    { i: 'w9', x: 7, y: 8, w: 8, h: 5 },
  ];
  return { widgets, layout };
}

export interface LayoutTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  build: () => { widgets: WidgetConfig[]; layout: LayoutItem[] };
}

export const LAYOUT_TEMPLATES: LayoutTemplate[] = [
  {
    id: 'default',
    name: '财务概览',
    description: '日常财务总览，重点关注净资产变化和现金流状况',
    icon: '📊',
    build: buildDefaultLayout,
  },
  {
    id: 'investment',
    name: '投资详情',
    description: '专注投资组合分析，持仓排名、回报趋势一目了然',
    icon: '📈',
    build: buildInvestmentFocusLayout,
  },
  {
    id: 'wealth_health',
    name: '财富健康',
    description: '全面财务健康检查，资产负债结构和保险保障一览无余',
    icon: '💰',
    build: buildWealthHealthLayout,
  },
];
