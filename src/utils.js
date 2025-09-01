export const TIME_SLOTS = ["Morning","Noon","Evening"];
export const MEAL_STATES = ["Fasting","Post-meal"]; // 식전/식후

export const MGDL_PER_MMOL = 18;
export const mgdlToMmol = (mg) => +(mg / MGDL_PER_MMOL).toFixed(1);
export const mmolToMgdl = (mmol) => Math.round(mmol * MGDL_PER_MMOL);

export function todayLocalISO(){
  return new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD
}

/**
 * mmol/L 기준 소수점 임계
 * Fasting:
 *   <3.9 저혈당 / 3.9–5.5 정상 / 5.6–6.9 경계 / ≥7.0 고위험
 * Post-meal (2h):
 *   <3.9 저혈당 / <7.8 정상 / 7.8–11.0 경계 / ≥11.1 고위험
 */
export function statusClassByMmolFromMg(mgdl, mealState){
  const mmol = mgdlToMmol(mgdl);
  if (mealState === "Fasting"){
    if (mmol < 3.9) return "text-red-600";
    if (mmol <= 5.5) return "text-green-600";
    if (mmol <= 6.9) return "text-yellow-600";
    return "text-red-600";
  } else {
    if (mmol < 3.9) return "text-red-600";
    if (mmol < 7.8) return "text-green-600";
    if (mmol <= 11.0) return "text-yellow-600";
    return "text-red-600";
  }
}

// ISO 날짜(YYYY-MM-DD)에 일수 가감
export function shiftISO(isoDate, deltaDays) {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + deltaDays);
  return dt.toLocaleDateString("en-CA"); // YYYY-MM-DD
}
