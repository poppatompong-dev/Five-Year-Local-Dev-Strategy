import { YEARS } from "./mock-data";

export function getCurrentFiscalYear(date = new Date()) {
  const gregorianYear = date.getFullYear();
  const isThaiFiscalYearRollover = date.getMonth() >= 9;
  return gregorianYear + 543 + (isThaiFiscalYearRollover ? 1 : 0);
}

export function getActivePlanFiscalYear(date = new Date()) {
  const current = getCurrentFiscalYear(date);
  if ((YEARS as readonly number[]).includes(current)) return current;
  if (current < YEARS[0]) return YEARS[0];
  return YEARS[YEARS.length - 1];
}

export function getFiscalQuarter(date = new Date()) {
  const month = date.getMonth();
  if (month >= 9) return 1;
  if (month <= 2) return 2;
  if (month <= 5) return 3;
  return 4;
}
