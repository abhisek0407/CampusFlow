import json
from collections import defaultdict
import sys
import os

# Add parent directory to path
sys.path.append(os.path.abspath('CrunchWeek_StarterPack'))
from validator import load, effective_category, CAT_WEIGHT

data = load('CrunchWeek_StarterPack/data/cit_public.json')
sched = load('exports/schedule.json')
dec_by = {b['request_id']: b for b in sched['fest_week']['bookings']}

total_pts = 0
total_max = 0
for req in data['booking_requests']:
    rid = req['id']
    cat = effective_category(data, req)
    wt = CAT_WEIGHT[cat]
    if rid not in {c['request_id'] for c in data.get('cancellations', [])}:
        total_max += wt
    d = dec_by.get(rid, {})
    st = d.get('status')
    pts = wt if st == 'approved' else (wt * 0.5 if st == 'alternative_offered' else 0)
    total_pts += pts
    print(f"{rid}: {req['title'][:25]:<25} | cat: {cat:<18} | wt: {wt} | st: {st:<20} | pts: {pts}/{wt}")

print(f"\nTotal Score: {total_pts} / Max Possible: {total_max}")
