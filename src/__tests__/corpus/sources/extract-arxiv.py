"""
arXiv 수식 추출 스크립트
Kyudan/MathBridge 데이터셋에서 3,000개 샘플링 (복잡한 수식 위주)
"""

from datasets import load_dataset
import json
import random
import re

random.seed(42)

print("MathBridge arXiv 수식 로딩 (streaming, 100,000개 스캔)...")
ds = load_dataset('Kyudan/MathBridge', split='train', streaming=True)

formulas = []
for i, item in enumerate(ds):
    if i >= 100000:
        break

    latex = item.get('equation', '')
    if not latex or len(latex) < 10:
        continue

    # $ 구분자 제거
    latex = latex.strip()
    for delim in ['$$', '$']:
        if latex.startswith(delim) and latex.endswith(delim):
            latex = latex[len(delim):-len(delim)].strip()
            break

    # 커스텀 명령어가 남아있으면 스킵
    if '\\newcommand' in latex or '\\def' in latex:
        continue

    # 너무 긴 수식 제한
    if len(latex) > 5000:
        continue

    # 너무 짧거나 단순한 수식(변수 하나, 숫자 하나 등) 스킵
    if len(latex) < 5:
        continue

    # 복잡도 점수 계산
    commands = re.findall(r'\\[a-zA-Z]+', latex)
    braces = latex.count('{')
    score = len(commands) + braces

    formulas.append({
        'latex': latex,
        'score': score,
        'length': len(latex)
    })

    if (i + 1) % 20000 == 0:
        print(f"  {i + 1}개 스캔, {len(formulas)}개 유효...")

print(f"총 {len(formulas)}개 유효 수식 수집 완료")

# 복잡도 기반으로 정렬 후 중~고 복잡도 위주 샘플링
formulas.sort(key=lambda x: x['score'])
n = len(formulas)

sampled = []
# 하위 20% (단순) 에서 500개
sampled += random.sample(formulas[:n // 5], min(500, n // 5))
# 중간 40% (보통) 에서 1,250개
sampled += random.sample(formulas[n // 5:3 * n // 5], min(1250, 2 * n // 5))
# 상위 40% (복잡) 에서 1,250개
sampled += random.sample(formulas[3 * n // 5:], min(1250, 2 * n // 5))

result = {
    'source': 'MathBridge (arXiv 2023)',
    'license': 'MIT',
    'total_available': len(formulas),
    'sampled': len(sampled),
    'formulas': [
        {
            'id': f'arxiv-{i:04d}',
            'latex': s['latex'],
            'source': 'arxiv',
            'complexity': 'simple' if s['score'] < 5 else ('medium' if s['score'] < 15 else 'complex')
        }
        for i, s in enumerate(sampled)
    ]
}

with open('src/__tests__/corpus/sources/arxiv-formulas.json', 'w') as f:
    json.dump(result, f, indent=2, ensure_ascii=False)

print(f"arXiv: {len(sampled)}개 수식 샘플링 ({len(formulas)}개 중)")
complexity_counts = {}
for f in result['formulas']:
    complexity_counts[f['complexity']] = complexity_counts.get(f['complexity'], 0) + 1
print(f"  복잡도 분포: {complexity_counts}")
