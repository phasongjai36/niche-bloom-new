# -*- coding: utf-8 -*-
"""
NICHE BLOOM — Import customers & contracts from ตารางสรุปยอดชำระ.xlsx into Supabase

Source data (3 payment groups from the workbook):
  Sheet 1: เก็บทุกวันที่ 25  — เบียร์ ×4, พี่นัด ×1
  Sheet 2: เก็บทุกวันที่ 20  — อุ้ม (Fila), ใข่ (True)
  Sheet 3: เก็บวันที่ 1 — อุ้ม, เบียร์, ใข่, ลูกบอล, แด๊ดดี้

Usage:
  python import-data.py          # dry run (no writes) — shows exactly what would be inserted
  python import-data.py --apply  # actually POST to Supabase

Idempotent: customers are upserted on customer_number; contracts are skipped
if an identical row (customer + item + installment + total periods) already exists.
"""

import json
import sys
import urllib.request

SUPABASE_URL = 'https://peucfeyxzvsnqrejnawy.supabase.co'
SUPABASE_ANON_KEY = ('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6'
                     'InBldWNmZXl4enZzbnFyZWpuYXd5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3MjMxNzMs'
                     'ImV4cCI6MjEwMDI5OTE3M30.YDP8OTBArJRpwP2a68ENJK55-yho_YBEt1vU8vtxJek')

# ================= DATA (parsed from the Excel file) =================
# rows: [customer, item, amount, months_paid, final_month]
GROUPS = [
    {
        'day': 25, 'label': 'ทุกวันที่ 25',
        'rows': [
            ['เบียร์', 'cash', 4297, 3, 9],
            ['เบียร์', 'cash', 5016, 5, 6],
            ['เบียร์', 'Cash', 3119, 2, 6],
            ['เบียร์', 'cash', 2068, 0, 6],
            ['พี่นัด', 'cash', 2079, 9, 12],
        ],
    },
    {
        'day': 20, 'label': 'ทุกวันที่ 20',
        'rows': [
            ['อุ้ม', 'Fila', 216, 1, 4],
            ['ใข่', 'True', 3350, 5, 5],
        ],
    },
    {
        'day': 1, 'label': 'ทุกวันที่ 1',
        'rows': [
            ['อุ้ม', 'Fila', 311, 4, 5],
            ['อุ้ม', 'Ipad', 1264, 1, 12],
            ['เบียร์', 'ทอง', 1556, 11, 12],
            ['เบียร์', 'มือถือ', 1057, 9, 18],
            ['ใข่', 'มือถือ', 1304, 9, 18],
            ['ใข่', 'Ipad', 669, 7, 18],
            ['ลูกบอล', 'ตู้เย็น', 663, 2, 12],
            ['แด๊ดดี้', 'น้ำหอม', 1857, 1, 5],
        ],
    },
]

CUSTOMER_CODES = {
    'เบียร์': 'CNNB001',
    'พี่นัด': 'CNNB002',
    'อุ้ม': 'CNNB003',
    'ใข่': 'CNNB004',
    'ลูกบอล': 'CNNB005',
    'แด๊ดดี้': 'CNNB006',
}

ITEM_TH = {
    'cash': 'เงินสด',
    'fila': 'Fila',
    'true': 'True',
    'ipad': 'iPad',
}


def normalize_item(item):
    key = str(item).strip().lower()
    return ITEM_TH.get(key, str(item).strip())


def build_contracts():
    contracts = []
    for g in GROUPS:
        for name, item, amount, months_paid, final_month in g['rows']:
            total_periods = final_month - months_paid
            if total_periods <= 0:
                # fully paid off — keep the record, marked as paid
                contracts.append({
                    'customer_number': CUSTOMER_CODES[name],
                    '_customer': name,
                    'item': normalize_item(item),
                    'installment': amount,
                    'current_period': 1,
                    'total_periods': 1,
                    'notification_day': g['label'],
                    'status': 'ชำระแล้ว',
                })
                continue
            contracts.append({
                'customer_number': CUSTOMER_CODES[name],
                '_customer': name,
                'item': normalize_item(item),
                'installment': amount,
                'current_period': 1,
                'total_periods': total_periods,
                'notification_day': g['label'],
                'status': 'ค้างชำระ',
            })
    return contracts


def build_customers(contracts):
    seen = {}
    for c in contracts:
        seen.setdefault(c['customer_number'], c['_customer'])
    return [
        {'customer_number': no, 'customer_name': name, 'line_uid': None, 'phone': None}
        for no, name in seen.items()
    ]


def sb(table, method='GET', body=None, filters=''):
    url = SUPABASE_URL + '/rest/v1/' + table + filters
    headers = {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
    }
    if method == 'POST':
        headers['Prefer'] = 'resolution=merge-duplicates,return=representation'
    data = json.dumps(body).encode('utf-8') if body is not None else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30) as res:
            raw = res.read().decode('utf-8')
            return json.loads(raw) if raw else []
    except urllib.error.HTTPError as e:
        raise RuntimeError('%s %s %s: %s' % (table, method, e.code, e.read().decode('utf-8', 'ignore')))


def main():
    apply = '--apply' in sys.argv
    contracts = build_contracts()
    customers = build_customers(contracts)

    print('=== NICHE BLOOM import (from ตารางสรุปยอดชำระ.xlsx) ===')
    print('Customers: %d' % len(customers))
    for c in customers:
        print('  %s  %s' % (c['customer_number'], c['customer_name']))
    print('\nContracts: %d' % len(contracts))
    by_cust = {}
    for c in contracts:
        by_cust.setdefault(c['_customer'], []).append(c)
    for name, lst in by_cust.items():
        total = sum(c['installment'] for c in lst)
        print('  %s: %d สัญญา, รวม %s บาท/เดือน' % (name, len(lst), format(total, ',')))
        for c in lst:
            print('     - %s: %s x %d งวด (%s)' % (c['item'], format(c['installment'], ','), c['total_periods'], c['notification_day']))

    if not apply:
        print('\n[DRY RUN] No data written. Run "python import-data.py --apply" to import.')
        return

    print('\nImporting...')
    upserted = sb('customers', 'POST', customers)
    print('customers: upserted %d rows' % (len(upserted) if isinstance(upserted, list) else -1))

    existing = sb('contracts')
    added = skipped = 0
    for c in contracts:
        clean = {k: v for k, v in c.items() if not k.startswith('_')}
        dup = any(
            e.get('customer_number') == clean['customer_number']
            and e.get('item') == clean['item']
            and int(e.get('installment') or 0) == int(clean['installment'])
            and int(e.get('total_periods') or 0) == int(clean['total_periods'])
            for e in existing
        )
        if dup:
            skipped += 1
            continue
        sb('contracts', 'POST', [clean])
        added += 1
        print('  + contract: %s / %s (%s x %d)' % (c['_customer'], c['item'], format(c['installment'], ','), c['total_periods']))
    print('contracts: added %d, skipped(existing) %d' % (added, skipped))
    print('Done.')


if __name__ == '__main__':
    try:
        main()
    except Exception as e:
        print('FAILED:', e)
        sys.exit(1)
