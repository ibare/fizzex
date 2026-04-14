"""
Wikipedia LaTeX 수식 추출 스크립트
OleehyO/latex-formulas 데이터셋에서 5,000개 샘플링
"""

from datasets import load_dataset
import json
import random
import re

random.seed(42)

print("Wikipedia LaTeX 수식 로딩 (streaming)...")
ds = load_dataset('OleehyO/latex-formulas', 'raw_formulas', split='train', streaming=True)

formulas = []
for i, item in enumerate(ds):
    latex = item.get('latex_formula', '')
    if not latex or len(latex) < 5:
        continue

    # 복잡도 점수 계산 (명령어 수 + 구조 깊이)
    commands = re.findall(r'\\[a-zA-Z]+', latex)
    braces = latex.count('{')
    score = len(commands) + braces

    formulas.append({
        'latex': latex,
        'score': score,
        'length': len(latex)
    })

    if (i + 1) % 50000 == 0:
        print(f"  {i + 1}개 스캔, {len(formulas)}개 유효...")

print(f"총 {len(formulas)}개 유효 수식 수집 완료")

# 복잡도 기준으로 정렬하고 다양한 복잡도에서 샘플링
formulas.sort(key=lambda x: x['score'])
n = len(formulas)

sampled = []
# 하위 20% (단순) 에서 1,000개
sampled += random.sample(formulas[:n // 5], min(1000, n // 5))
# 중간 40% (보통) 에서 2,000개
sampled += random.sample(formulas[n // 5:3 * n // 5], min(2000, 2 * n // 5))
# 상위 40% (복잡) 에서 2,000개
sampled += random.sample(formulas[3 * n // 5:], min(2000, 2 * n // 5))

result = {
    'source': 'wikipedia-latex-formulas-319k',
    'license': 'CC BY-SA',
    'total_available': len(formulas),
    'sampled': len(sampled),
    'formulas': [
        {
            'id': f'wiki-{i:04d}',
            'latex': s['latex'],
            'source': 'wikipedia',
            'complexity': 'simple' if s['score'] < 5 else ('medium' if s['score'] < 15 else 'complex')
        }
        for i, s in enumerate(sampled)
    ]
}

with open('src/__tests__/corpus/sources/wikipedia-formulas.json', 'w') as f:
    json.dump(result, f, indent=2, ensure_ascii=False)

print(f"Wikipedia: {len(sampled)}개 수식 샘플링 ({len(formulas)}개 중)")
complexity_counts = {}
for f in result['formulas']:
    complexity_counts[f['complexity']] = complexity_counts.get(f['complexity'], 0) + 1
print(f"  복잡도 분포: {complexity_counts}")
