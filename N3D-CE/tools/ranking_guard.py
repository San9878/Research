"""Reject stale or mismatched display-index inputs before publishing."""
import json,math
from pathlib import Path

def values(record):
    items={v['key']:v for v in record['values']}
    aliases=[('absrel','depth_absrel','r1_absrel'),('delta1','depth_delta1','r1_delta1'),('xyz','point_raw_mm','r1_xyz_cm'),('p95','point_p95_mm','r1_p95_cm')]
    out=[]
    for i,keys in enumerate(aliases):
        v=next((items[k] for k in keys if k in items),None)
        if v is None or v['unit']!=['','%','cm','cm'][i] or v['higher']!=(i==1):raise ValueError('Ranking metric/units mismatch: '+record['id'])
        if not math.isfinite(v['value']) or v['value']<0 or (i==1 and v['value']>100):raise ValueError('Invalid ranking input: '+record['id'])
        out.append(v['value'])
    return out

def verify_data(data,metrics,clouds):
    byid={r['id']:r for r in metrics['entries']};cs={r['id']:r for r in clouds['clouds']};seen=set()
    if data['weights']!=[.25]*4:raise ValueError('Unexpected comparison-index weights')
    for group in data['groups']:
        ref=byid[group['reference']['id']];b=values(ref)
        if b!=group['reference']['values'] or any(x<=0 for x in b):raise ValueError('Ranking reference changed: '+group['id'])
        if ref['comparison_key']!=group['comparison_key']:raise ValueError('Ranking reference protocol changed')
        for row in group['rows']:
            if row['id'] in seen:raise ValueError('Duplicate ranked cloud')
            seen.add(row['id']);m=byid[row['metric_id']];c=cs[row['id']]
            if m['comparison_key']!=group['comparison_key'] or values(m)!=row['values']:raise ValueError('Stale or mismatched ranking metrics: '+row['id'])
            if m.get('cloud_id')!=row['id'] and m['id']!=row['id']:raise ValueError('Ranking uses another cloud metric')
            if len(c['frames'])!=group['views']:raise ValueError('Ranking view count mismatch')
            if c.get('gt_reference_views') is not None and c['gt_reference_views']!=group['GT']:raise ValueError('Ranking GT support mismatch')
    if len(seen)!=46:raise ValueError('Expected 46 verified ranking inputs')
    return {'ranked_clouds':len(seen),'groups':len(data['groups']),'metrics_match_saved_values':True}

def verify_ranking(root):
    app=Path(root)/'reconstrucciones/interactivo'
    read=lambda name:json.loads((app/name).read_text(encoding='utf8'))
    data=read('rankings.json');receipt=verify_data(data,read('metrics.json'),read('clouds.json'))
    script=(app/'case-rankings.js').read_text(encoding='utf8');prefix='window.CASE_RANKING_DATA='
    embedded=json.loads(script[len(prefix):script.index(';\n')])
    if embedded!=data:raise ValueError('Browser ranking data differs from the published JSON')
    return receipt
