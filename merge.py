import csv, glob, sys

def merge(pattern, out):
    files = sorted(glob.glob(pattern))
    files = [f for f in files if 'all' not in f]
    print(f'found: {files}')
    rows = []
    for f in files:
        with open(f, newline='', encoding='utf-8-sig') as fp:
            reader = csv.DictReader(fp)
            file_rows = list(reader)
            rows.extend(file_rows)
            print(f'  {f}: {len(file_rows)} rows')
    if not rows:
        print('no data')
        sys.exit(1)
    with open(out, 'w', newline='', encoding='utf-8-sig') as fp:
        writer = csv.DictWriter(fp, fieldnames=rows[0].keys())
        writer.writeheader()
        writer.writerows(rows)
    print(f'merged: {len(rows)} rows -> {out}')

mode = sys.argv[1] if len(sys.argv) > 1 else 'raw'
if mode == 'enriched':
    merge('backtest_20*_enriched.csv', 'backtest_all_enriched.csv')
else:
    merge('backtest_20*.csv', 'backtest_all.csv')
