import csv, glob, os, sys

files = sorted(glob.glob('backtest_20*.csv'))
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

out = 'backtest_all.csv'
with open(out, 'w', newline='', encoding='utf-8-sig') as fp:
    writer = csv.DictWriter(fp, fieldnames=rows[0].keys())
    writer.writeheader()
    writer.writerows(rows)

print(f'merged: {len(rows)} rows -> {out}')
