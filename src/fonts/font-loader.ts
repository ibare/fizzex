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

/** STIX Two Math 폰트 설정 */
export const STIX_TWO_MATH_CONFIG: MathFontConfig = {
  name: 'STIX Two Math',
  fontFamily: 'STIXMathJax',
  // MathJax STIX Web 폰트 (확장 글리프 포함)
  url: 'https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.9/fonts/HTML-CSS/STIX-Web/woff/STIXMathJax_Main-Regular.woff',
  fallback: '"Times New Roman", Times, serif',
};

/** 대체 CDN URL들 */
const STIX_MATH_URLS = [
  // MathJax Size 폰트들 (더 큰 글리프)
  'https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.9/fonts/HTML-CSS/STIX-Web/woff/STIXMathJax_Size1-Regular.woff',
  // 백업: Google Fonts의 Noto Sans Math
  'https://fonts.gstatic.com/s/notosansmath/v15/7Aump_cpkSecTWaHRlH2hyV5UHkG-V048PW0.woff2',
];

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

    // 이미 문서에 폰트가 있는지 확인
    if (document.fonts.check(`16px "${fontFamily}"`)) {
      return {
        status: 'loaded',
        fontFamily: `"${fontFamily}", ${fallback}`,
      };
    }

    // 폰트 페이스 생성 및 로드
    const fontFace = new FontFace(fontFamily, `url(${url})`, {
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
 * 여러 URL에서 폰트 로드 시도
 */
async function loadFontWithFallbackUrls(
  config: MathFontConfig,
  urls: string[]
): Promise<FontLoadResult> {
  // 먼저 기본 URL 시도
  let result = await loadFontFace(config);
  if (result.status === 'loaded' && !result.error) {
    return result;
  }

  // 실패 시 대체 URL들 시도
  for (const url of urls) {
    result = await loadFontFace({ ...config, url });
    if (result.status === 'loaded' && !result.error) {
      return result;
    }
  }

  // 모두 실패 시 폴백 반환
  return {
    status: 'error',
    fontFamily: config.fallback,
    error: new Error('All font URLs failed'),
  };
}

/**
 * STIX Two Math 폰트 로드
 *
 * @returns 로드 결과
 */
export async function loadSTIXMathFont(): Promise<FontLoadResult> {
  const cacheKey = 'stix-two-math';

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
  const loadPromise = loadFontWithFallbackUrls(STIX_TWO_MATH_CONFIG, STIX_MATH_URLS);
  loadingPromises.set(cacheKey, loadPromise);

  const result = await loadPromise;
  loadedFonts.set(cacheKey, result);
  loadingPromises.delete(cacheKey);

  return result;
}

/**
 * 폰트 로드 상태 확인
 */
export function getFontLoadStatus(fontName: string = 'stix-two-math'): FontLoadStatus {
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
export function getAvailableFontFamily(fontName: string = 'stix-two-math'): string {
  const cached = loadedFonts.get(fontName);
  if (cached) {
    return cached.fontFamily;
  }

  return STIX_TWO_MATH_CONFIG.fallback;
}

/**
 * React Hook용 폰트 로드 함수
 *
 * 컴포넌트에서 사용:
 * ```
 * const [fontFamily, setFontFamily] = useState(STIX_TWO_MATH_CONFIG.fallback);
 *
 * useEffect(() => {
 *   loadSTIXMathFont().then(result => {
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
    load: loadSTIXMathFont,
  };
}
