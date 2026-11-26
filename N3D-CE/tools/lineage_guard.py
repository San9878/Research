"""Small publication guard for the 24 deeply audited base comparisons.

The deep audit is separate; this guard needs only published JSON and stdlib.
"""
from pathlib import Path
import hashlib,json
COMMON=['model_variant','checkpoint_SHA256','prediction_SHA256','input_float_SHA256',
        'input_views','gt_reference_views','gt_valid_pixels','gt_evaluation_scope','GT_temporal_certified']
def read(p):return json.loads(Path(p).read_text(encoding='utf-8-sig'))
def fingerprint(value):
    return hashlib.sha256(json.dumps(value,sort_keys=True,separators=(',',':'),ensure_ascii=True,allow_nan=False).encode()).hexdigest()
def payload(kind,r):
    fields={'cloud':['id','model','model_family','family','frames','points','position_bytes','bbox','scale',
        'pack_key','package_sha256','package_bytes','external_asset_commit','path','geometry_route','trajectory','gt_trajectory'],
        'metric':['id','cloud_id','model_family','comparison_key','values'],
        'trajectory':['id','model_family','family','frames','positions_cm','GT_positions_cm','aligned_positions_cm',
        'errors_cm','raw_errors_cm','ATE_cm','accuracy_at_2mm_pct','native_accuracy_at_2mm_pct','Sim3']}[kind]
    return {k:r.get(k) for k in dict.fromkeys(COMMON+fields)}
def verify_records(report,clouds,metrics,trajectories):
    assert report['passed'] and report['verified_comparisons']==24
    assert {c['id'] for c in clouds if c.get('public_base_comparison')}=={r['id'] for r in report['records']}
    maps={'cloud':{r['id']:r for r in clouds},'metric':{r['id']:r for r in metrics},
          'trajectory':{r['id']:r for r in trajectories}}
    for row in report['records']:
        for kind in maps:
            r=maps[kind][row['id']]
            assert fingerprint(payload(kind,r))==row['fingerprints'][kind],(kind,row['id'],'lineage differs from deep audit')
            for k in COMMON:assert r.get(k)==row['identity'][k],(kind,row['id'],k)
        if row['identity']['gt_evaluation_scope']=='measured_anchor_valid_pixels':
            t=maps['trajectory'][row['id']]
            assert row['identity']['gt_reference_views']==1 and not t['GT_temporal_certified']
            for k in ['GT_positions_cm','errors_cm','ATE_cm','accuracy_at_2mm_pct']:assert t.get(k) is None,(row['id'],k)
    return {'passed':True,'comparisons':24,'clouds':24,'metric_entries':24,'trajectories':24}
def verify_root(root):
    root=Path(root);app=root/'reconstrucciones/interactivo'
    return verify_records(read(root/'tablas/verificacion_24_comparaciones.json'),read(app/'clouds.json')['clouds'],
        read(app/'metrics.json')['entries'],read(app/'trajectories.json')['trajectories'])
def verify_local_files(manifest):
    for r in read(manifest)['files']:
        s=Path(r['path']).stat()
        assert s.st_size==r['size'] and s.st_mtime_ns==r['mtime_ns'],('Scientific input changed; repeat deep audit',r['path'])
if __name__=='__main__':
    import argparse
    p=argparse.ArgumentParser();p.add_argument('--root',required=True);a=p.parse_args();print(json.dumps(verify_root(a.root)))
