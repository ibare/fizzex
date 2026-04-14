"""
수식 정제 스크립트
추출된 수식에 공통 정제를 적용한다.
"""

import json
import re
import os


def clean_formula(latex: str):
    """수식을 정제한다. None을 반환하면 제외."""

    # 1. 앞뒤 공백, 구분자 제거
    latex = latex.strip()
    for delim in ['$$', '$', '\\(', '\\)', '\\[', '\\]']:
        latex = latex.strip(delim)
    latex = latex.strip()

    # 2. 빈 수식 제외
    if not latex or len(latex) < 2:
        return None

    # 3. 순수 텍스트 (LaTeX 명령어 없음) 제외
    if not re.search(r'[\\^_{}]', latex):
        return None

    # 4. 깨진 인코딩 제외
    if '\x00' in latex or '\ufffd' in latex:
        return None

    # 5. 주석 제거
    latex = re.sub(r'%[^\n]*', '', latex)

    # 6. 연속 공백 정리
    latex = re.sub(r'\s+', ' ', latex).strip()

    # 7. 중괄호 짝 확인
    depth = 0
    for ch in latex:
        if ch == '{':
            depth += 1
        if ch == '}':
            depth -= 1
        if depth < 0:
            return None
    if depth != 0:
        return None

    # 8. 정제 후 다시 빈 수식 체크
    if not latex or len(latex) < 2:
        return None

    return latex


def process_file(input_path: str, output_path: str):
    if not os.path.exists(input_path):
        print(f"  건너뜀: {input_path} (파일 없음)")
        return

    with open(input_path) as f:
        data = json.load(f)

    cleaned = []
    rejected = 0
    for entry in data['formulas']:
        result = clean_formula(entry['latex'])
        if result:
            entry['latex'] = result
            cleaned.append(entry)
        else:
            rejected += 1

    data['formulas'] = cleaned
    data['cleaned'] = len(cleaned)
    data['rejected'] = rejected

    with open(output_path, 'w') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"  {os.path.basename(input_path)}: {len(cleaned)}개 유지, {rejected}개 제거")


print("수식 정제 시작...")

process_file(
    'src/__tests__/corpus/sources/wikipedia-formulas.json',
    'src/__tests__/corpus/sources/wikipedia-formulas-clean.json'
)
process_file(
    'src/__tests__/corpus/sources/arxiv-formulas.json',
    'src/__tests__/corpus/sources/arxiv-formulas-clean.json'
)
process_file(
    'src/__tests__/corpus/sources/textbook-formulas.json',
    'src/__tests__/corpus/sources/textbook-formulas-clean.json'
)

print("정제 완료!")
