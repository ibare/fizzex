/**
 * 수학 폰트 로더
 *
 * 웹폰트 로딩 및 상태 관리
 */

/** 폰트 로드 상태 */
export type FontLoadStatus = 'idle' | 'loading' | 'loaded' | 'error';

/** 폰트 로드 결과 */
export interface FontLoadResult {
  status: FontLoadStatus;
  fontFamily: string;
  error?: Error;
}

/** 폰트 설정 */
export interface MathFontConfig {
  /** 폰트 이름 */
  name: string;
  /** CSS font-family 값 */
  fontFamily: string;
  /** 폰트 URL (woff2) */
  url: string;
  /** 폴백 폰트 */
  fallback: string;
}

/** New Computer Modern Math 폰트 설정 */
export const NEW_CM_MATH_CONFIG: MathFontConfig = {
  name: 'New Computer Modern Math',
  fontFamily: 'NewCMMath',
  // 로컬 WOFF2 폰트 (프로젝트 번들)
  url: '/fonts/NewCMMath-Regular.woff2',
  fallback: '"Latin Modern Math", "Computer Modern", "Times New Roman", serif',
};

/**
 * 폰트 URL 설정
 *
 * 배포 환경의 base path에 맞게 폰트 URL을 조정할 때 사용.
 * loadMathFont() 호출 전에 설정해야 함.
 *
 * @example
 * // Vite 프로젝트에서 base path가 있는 경우
 * setMathFontUrl(import.meta.env.BASE_URL + 'fonts/NewCMMath-Regular.woff2');
 */
export function setMathFontUrl(url: string): void {
  NEW_CM_MATH_CONFIG.url = url;
}

/** 로드된 폰트 캐시 */
const loadedFonts = new Map<string, FontLoadResult>();

/** 로드 진행 중인 Promise 캐시 */
const loadingPromises = new Map<string, Promise<FontLoadResult>>();

/**
 * 폰트 페이스 등록 및 로드
 */
async function loadFontFace(config: MathFontConfig): Promise<FontLoadResult> {
  const { name, fontFamily, url, fallback } = config;

  try {
    // FontFace API 지원 확인
    if (typeof FontFace === 'undefined') {
      console.warn('FontFace API not supported, using fallback font');
      return {
        status: 'loaded',
        fontFamily: fallback,
      };
    }

    // 이미 document.fonts에 같은 이름의 FontFace가 등록되어 있는지 확인
    // (document.fonts.check()는 등록된 @font-face가 없어도 true를 반환할 수 있으므로 사용하지 않음)
    let alreadyRegistered = false;
    document.fonts.forEach((face) => {
      if (face.family === fontFamily && face.status === 'loaded') {
        alreadyRegistered = true;
      }
    });
    if (alreadyRegistered) {
      return {
        status: 'loaded',
        fontFamily: `"${fontFamily}", ${fallback}`,
      };
    }

    // 폰트 페이스 생성 및 로드
    const fontFace = new FontFace(fontFamily, `url("${url}")`, {
      style: 'normal',
      weight: '400',
    });

    const loadedFont = await fontFace.load();
    document.fonts.add(loadedFont);

    // 폰트가 실제로 사용 가능한지 확인
    await document.fonts.ready;

    return {
      status: 'loaded',
      fontFamily: `"${fontFamily}", ${fallback}`,
    };
  } catch (error) {
    console.warn(`Failed to load ${name} font:`, error);
    return {
      status: 'error',
      fontFamily: fallback,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}


/**
 * New Computer Modern Math 폰트 로드
 *
 * @returns 로드 결과
 */
export async function loadMathFont(): Promise<FontLoadResult> {
  const cacheKey = 'new-cm-math';

  // 이미 로드됨
  const cached = loadedFonts.get(cacheKey);
  if (cached) {
    return cached;
  }

  // 로드 진행 중
  const loading = loadingPromises.get(cacheKey);
  if (loading) {
    return loading;
  }

  // 새로 로드
  const loadPromise = loadFontFace(NEW_CM_MATH_CONFIG);
  loadingPromises.set(cacheKey, loadPromise);

  const result = await loadPromise;
  loadedFonts.set(cacheKey, result);
  loadingPromises.delete(cacheKey);

  return result;
}

/**
 * 폰트 로드 상태 확인
 */
export function getFontLoadStatus(fontName: string = 'new-cm-math'): FontLoadStatus {
  const cached = loadedFonts.get(fontName);
  if (cached) {
    return cached.status;
  }

  if (loadingPromises.has(fontName)) {
    return 'loading';
  }

  return 'idle';
}

/**
 * 현재 사용 가능한 폰트 패밀리 반환
 */
export function getAvailableFontFamily(fontName: string = 'new-cm-math'): string {
  const cached = loadedFonts.get(fontName);
  if (cached) {
    return cached.fontFamily;
  }

  return NEW_CM_MATH_CONFIG.fallback;
}

/**
 * React Hook용 폰트 로드 함수
 *
 * 컴포넌트에서 사용:
 * ```
 * const [fontFamily, setFontFamily] = useState(NEW_CM_MATH_CONFIG.fallback);
 *
 * useEffect(() => {
 *   loadMathFont().then(result => {
 *     setFontFamily(result.fontFamily);
 *   });
 * }, []);
 * ```
 */
export function useMathFont(): {
  fontFamily: string;
  status: FontLoadStatus;
  load: () => Promise<FontLoadResult>;
} {
  // 이 함수는 React 외부에서도 동작하도록 상태 없이 구현
  return {
    fontFamily: getAvailableFontFamily(),
    status: getFontLoadStatus(),
    load: loadMathFont,
  };
}
