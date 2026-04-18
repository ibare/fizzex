/**
 * 케플러 궤도 공용 물리 상수.
 *
 * Visualizer 간 동일하게 쓰이는 상수와 시각화 전용 가속 계수만 둔다.
 */

/** 만유인력 상수 (N m² / kg²) */
export const G = 6.674e-11;

/** 지구 질량 (kg) */
export const M_EARTH = 5.972e24;

/** 지구 반지름 (km) — 시각적 크기 산정용 */
export const R_EARTH = 6371;

/** GM 곱 (fallback 물리 계산용) */
export const GM = G * M_EARTH;

/**
 * 시각화용 시간 가속 계수.
 * 실제 공전 주기는 시각적으로 너무 길어 1/600 시간으로 표시한다.
 * 예: ISS(90분 주기) → 9초, 정지궤도(24시간) → 144초.
 */
export const TIME_ACCELERATION = 600;
