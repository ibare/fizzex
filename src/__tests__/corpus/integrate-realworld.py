"""
실전 수식 코퍼스 통합 스크립트
정제된 Wikipedia/arXiv/교과서 수식을 하나로 통합하고 중복 제거
"""

import json
import os

sources = [
    ('sources/wikipedia-formulas-clean.json', 'wikipedia'),
    ('sources/arxiv-formulas-clean.json', 'arxiv'),
    ('sources/textbook-formulas-clean.json', 'textbook'),
]

all_formulas = []
stats = {}

print("실전 수식 코퍼스 통합 시작...\n")

for path, source_name in sources:
    full_path = f'src/__tests__/corpus/{path}'
    if not os.path.exists(full_path):
        print(f"  {source_name}: 파일 없음, 건너뜀")
        continue

    with open(full_path) as f:
        data = json.load(f)
    formulas = data['formulas']
    all_formulas.extend(formulas)
    stats[source_name] = len(formulas)
    print(f"  {source_name}: {len(formulas)}개 로드")

# 전역 중복 제거 (LaTeX 문자열 기준)
seen = set()
deduped = []
for f in all_formulas:
    key = f['latex'].strip()
    if key not in seen:
        seen.add(key)
        deduped.append(f)

dupes_removed = len(all_formulas) - len(deduped)
print(f"\n통합: {len(all_formulas)}개 → {len(deduped)}개 (중복 {dupes_removed}개 제거)")

# 저장
result = {
    'source': 'real-world formulas (Wikipedia + arXiv + Textbook)',
    'license': 'CC BY-SA / MIT',
    'stats': stats,
    'total': len(deduped),
    'formulas': deduped
}

out_path = 'src/__tests__/corpus/realworld-formulas.json'
with open(out_path, 'w') as f:
    json.dump(result, f, indent=2, ensure_ascii=False)

print(f"\n저장: {out_path}")
print(f"총 {len(deduped)}개 실전 수식")
