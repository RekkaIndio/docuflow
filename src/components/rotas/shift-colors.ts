export type ShiftColorKey =
  | "blue"
  | "amber"
  | "indigo"
  | "green"
  | "purple"
  | "teal"
  | "rose"
  | "slate";

interface ShiftColorTheme {
  legendBox: string;
  legendText: string;
  legendBorder: string;
  summaryContainer: string;
  summaryDot: string;
  detailContainer: string;
  detailBadge: string;
  printBackground: string;
  printText: string;
}

const THEMES: Record<ShiftColorKey, ShiftColorTheme> = {
  blue: {
    legendBox: "bg-blue-100 dark:bg-slate-800",
    legendText: "text-blue-800 dark:text-blue-200",
    legendBorder: "border-blue-300 dark:border-blue-700",
    summaryContainer: "bg-blue-50 border-blue-200 dark:bg-slate-800 dark:border-blue-700",
    summaryDot: "bg-blue-500",
    detailContainer: "border-blue-300 bg-blue-100 text-blue-800 dark:border-blue-700 dark:bg-slate-800 dark:text-blue-200",
    detailBadge: "border-blue-500 text-blue-700 dark:border-blue-600 dark:text-blue-200",
    printBackground: "#dbeafe",
    printText: "#1d4ed8",
  },
  amber: {
    legendBox: "bg-amber-100 dark:bg-slate-800",
    legendText: "text-amber-800 dark:text-amber-200",
    legendBorder: "border-amber-300 dark:border-amber-700",
    summaryContainer: "bg-amber-50 border-amber-200 dark:bg-slate-800 dark:border-amber-700",
    summaryDot: "bg-amber-500",
    detailContainer: "border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-700 dark:bg-slate-800 dark:text-amber-200",
    detailBadge: "border-amber-500 text-amber-700 dark:border-amber-600 dark:text-amber-200",
    printBackground: "#fef3c7",
    printText: "#b45309",
  },
  indigo: {
    legendBox: "bg-indigo-100 dark:bg-slate-800",
    legendText: "text-indigo-800 dark:text-indigo-200",
    legendBorder: "border-indigo-300 dark:border-indigo-700",
    summaryContainer: "bg-indigo-50 border-indigo-200 dark:bg-slate-800 dark:border-indigo-700",
    summaryDot: "bg-indigo-500",
    detailContainer: "border-indigo-300 bg-indigo-100 text-indigo-800 dark:border-indigo-700 dark:bg-slate-800 dark:text-indigo-200",
    detailBadge: "border-indigo-500 text-indigo-700 dark:border-indigo-600 dark:text-indigo-200",
    printBackground: "#e0e7ff",
    printText: "#4338ca",
  },
  green: {
    legendBox: "bg-green-100 dark:bg-slate-800",
    legendText: "text-green-800 dark:text-green-200",
    legendBorder: "border-green-300 dark:border-green-700",
    summaryContainer: "bg-green-50 border-green-200 dark:bg-slate-800 dark:border-green-700",
    summaryDot: "bg-green-500",
    detailContainer: "border-green-300 bg-green-100 text-green-800 dark:border-green-700 dark:bg-slate-800 dark:text-green-200",
    detailBadge: "border-green-500 text-green-700 dark:border-green-600 dark:text-green-200",
    printBackground: "#dcfce7",
    printText: "#047857",
  },
  purple: {
    legendBox: "bg-purple-100 dark:bg-slate-800",
    legendText: "text-purple-800 dark:text-purple-200",
    legendBorder: "border-purple-300 dark:border-purple-700",
    summaryContainer: "bg-purple-50 border-purple-200 dark:bg-slate-800 dark:border-purple-700",
    summaryDot: "bg-purple-500",
    detailContainer: "border-purple-300 bg-purple-100 text-purple-800 dark:border-purple-700 dark:bg-slate-800 dark:text-purple-200",
    detailBadge: "border-purple-500 text-purple-700 dark:border-purple-600 dark:text-purple-200",
    printBackground: "#ede9fe",
    printText: "#6d28d9",
  },
  teal: {
    legendBox: "bg-teal-100 dark:bg-slate-800",
    legendText: "text-teal-800 dark:text-teal-200",
    legendBorder: "border-teal-300 dark:border-teal-700",
    summaryContainer: "bg-teal-50 border-teal-200 dark:bg-slate-800 dark:border-teal-700",
    summaryDot: "bg-teal-500",
    detailContainer: "border-teal-300 bg-teal-100 text-teal-800 dark:border-teal-700 dark:bg-slate-800 dark:text-teal-200",
    detailBadge: "border-teal-500 text-teal-700 dark:border-teal-600 dark:text-teal-200",
    printBackground: "#ccfbf1",
    printText: "#0f766e",
  },
  rose: {
    legendBox: "bg-rose-100 dark:bg-slate-800",
    legendText: "text-rose-800 dark:text-rose-200",
    legendBorder: "border-rose-300 dark:border-rose-700",
    summaryContainer: "bg-rose-50 border-rose-200 dark:bg-slate-800 dark:border-rose-700",
    summaryDot: "bg-rose-500",
    detailContainer: "border-rose-300 bg-rose-100 text-rose-800 dark:border-rose-700 dark:bg-slate-800 dark:text-rose-200",
    detailBadge: "border-rose-500 text-rose-700 dark:border-rose-600 dark:text-rose-200",
    printBackground: "#ffe4e6",
    printText: "#be123c",
  },
  slate: {
    legendBox: "bg-slate-200 dark:bg-slate-800",
    legendText: "text-slate-800 dark:text-slate-200",
    legendBorder: "border-slate-300 dark:border-slate-600",
    summaryContainer: "bg-slate-100 border-slate-200 dark:bg-slate-800 dark:border-slate-600",
    summaryDot: "bg-slate-500",
    detailContainer: "border-slate-300 bg-slate-100 text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200",
    detailBadge: "border-slate-500 text-slate-700 dark:border-slate-500 dark:text-slate-200",
    printBackground: "#e2e8f0",
    printText: "#334155",
  },
};

export const DEFAULT_SHIFT_COLOR: ShiftColorKey = "blue";

export function getShiftColorTheme(color?: string): ShiftColorTheme {
  if (!color) {
    return THEMES[DEFAULT_SHIFT_COLOR];
  }

  return THEMES[(color as ShiftColorKey) ?? DEFAULT_SHIFT_COLOR] ?? THEMES[DEFAULT_SHIFT_COLOR];
}

export const SHIFT_COLOR_OPTIONS: { value: ShiftColorKey; label: string }[] = [
  { value: "blue", label: "Blue" },
  { value: "amber", label: "Amber" },
  { value: "indigo", label: "Indigo" },
  { value: "green", label: "Green" },
  { value: "purple", label: "Purple" },
  { value: "teal", label: "Teal" },
  { value: "rose", label: "Rose" },
  { value: "slate", label: "Slate" },
];
