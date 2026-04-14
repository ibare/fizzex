"""
교과서 수식 추출 스크립트
Kyudan/MathBridge 데이터셋에서 단순하고 짧은 교육용 수식 1,000개 샘플링
arXiv 추출 대상과 겹치지 않도록 별도 구간(100,000~200,000)에서 로드
"""

from datasets import load_dataset
import json
import random
import re

random.seed(42)

print("MathBridge 교과서 수식 로딩 (streaming, 100,000~200,000 구간)...")
ds = load_dataset('Kyudan/MathBridge', split='train', streaming=True)

formulas = []
for i, item in enumerate(ds):
    # arXiv 추출과 겹치지 않도록 100,000번째부터 시작
    if i < 100000:
        continue
    if i >= 200000:
        break

    latex = item.get('equation', '')
    if not latex:
        continue

    # $ 구분자 제거
    latex = latex.strip()
    for delim in ['$$', '$']:
        if latex.startswith(delim) and latex.endswith(delim):
            latex = latex[len(delim):-len(delim)].strip()
            break

    # 너무 짧거나 빈 수식 스킵
    if len(latex) < 3:
        continue

    # 커스텀 명령어 스킵
    if '\\newcommand' in latex or '\\def' in latex:
        continue

    # 교과서 수준: 짧고 단순한 수식 (200자 이하)
    if len(latex) > 200:
        continue

    # 복잡도 점수
    commands = re.findall(r'\\[a-zA-Z]+', latex)
    braces = latex.count('{')
    score = len(commands) + braces

    # 교과서 수준은 복잡도가 낮은 것만 (score <= 15)
    if score > 15:
        continue

    formulas.append({
        'latex': latex,
        'score': score,
        'length': len(latex)
    })

    if (i + 1) % 20000 == 0:
        print(f"  {i + 1}개 스캔, {len(formulas)}개 유효...")

print(f"총 {len(formulas)}개 유효 교과서 수식 수집 완료")

# 1,000개 랜덤 샘플링
sampled = random.sample(formulas, min(1000, len(formulas)))

result = {
    'source': 'MathBridge (Textbook-level)',
    'license': 'MIT',
    'total_available': len(formulas),
    'sampled': len(sampled),
    'formulas': [
        {
            'id': f'textbook-{i:04d}',
            'latex': s['latex'],
            'source': 'textbook',
            'complexity': 'simple' if s['score'] < 5 else 'medium'
        }
        for i, s in enumerate(sampled)
    ]
}

with open('src/__tests__/corpus/sources/textbook-formulas.json', 'w') as f:
    json.dump(result, f, indent=2, ensure_ascii=False)

print(f"교과서: {len(sampled)}개 수식 샘플링 ({len(formulas)}개 중)")
complexity_counts = {}
for f in result['formulas']:
    complexity_counts[f['complexity']] = complexity_counts.get(f['complexity'], 0) + 1
print(f"  복잡도 분포: {complexity_counts}")
