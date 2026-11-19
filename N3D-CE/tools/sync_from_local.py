"""Copy the public notebook edition. Original research files remain local."""
from pathlib import Path
import argparse,csv,hashlib,html,io,json,re,shutil
from public_package import publish_binary,remove_verified_redundant_js,adapt_viewer

IDS=['c3vd-v9','c3vd-vn19-a','c3vd-vn19-b','c3vd-vn18','c3vd-zero','scared8-vn18','scared8-v9','scared8-vn19-a','scared9-vn18','scared9-v9','scared9-vn19-a','c3vd-scared-vn18','scared8-scared-v9','scared9-scared-v9','c3vd-scared-v9']
def read(p):return json.loads(p.read_text(encoding='utf-8-sig'))
def dump(p,obj):p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(obj,ensure_ascii=False,indent=2),encoding='utf8')
def sha(p):
    h=hashlib.sha256()
    with p.open('rb') as f:
        for b in iter(lambda:f.read(8*2**20),b''):h.update(b)
    return h.hexdigest()
def copy(src,dst):
    dst.parent.mkdir(parents=True,exist_ok=True)
    if dst.exists() and src.stat().st_size==dst.stat().st_size and sha(src)==sha(dst):return
    shutil.copyfile(src,dst)
def clean(obj):
    if isinstance(obj,dict):return {k:clean(v) for k,v in obj.items() if k not in ['source','sources','colors','source_sha256_expected']}
    if isinstance(obj,list):return [clean(v) for v in obj]
    return obj
def same_tables(a,b):
    a=re.findall(r'(?m)(?:^\|[^\n]*\n)+',a);b=re.findall(r'(?m)(?:^\|[^\n]*\n)+',b)
    return a==b

def main():
    p=argparse.ArgumentParser();p.add_argument('--source',required=True,type=Path);p.add_argument('--repository',required=True,type=Path);args=p.parse_args()
    src=args.source.resolve();repo=args.repository.resolve();dst=repo/'N3D-CE'
    if not (repo/'.git').is_dir() or not (src/'Bitacora.qmd').is_file():raise RuntimeError('Expected the local notebook and Research Git checkout')
    dst.mkdir(exist_ok=True)
    q=(src/'Bitacora.qmd').read_text(encoding='utf8');original=q
    # These two records are lightweight diagnostic data, not the original archives.
    refs={
      'antiguos%20informes/trabajo_C/study_vn19_priority_review_20261113/checkpoint_inventory.json':'tablas/diagnosticos/checkpoint_inventory.json',
      'antiguos%20informes/trabajo_C/study_vn19_priority_review_20261113/retained_intermediate_comparisons.csv':'tablas/diagnosticos/retained_intermediate_comparisons.csv',
      'antiguos%20informes/Kaust_G/VGGT-TTT/experiments/metricas_papers_c3vd_v2/tablas_pdf_overleaf_20261027/main.tex':'tablas/tablas_papers_c3vd.tex',
      'antiguos%20informes/Kaust_G/VGGT-TTT/experiments/metricas_papers_c3vd_v2/index.html':'tablas/index.html',
      'antiguos%20informes/Kaust_G/Papers/2503.11651v1.pdf':'https://arxiv.org/abs/2503.11651',
    }
    from urllib.parse import unquote
    for old,new in refs.items():
        if old not in q:continue
        if not new.startswith('http') and new!='tablas/index.html':copy(src/unquote(old),dst/new)
        q=q.replace(old,new)
    if re.search(r'\]\(antiguos(?:%20| )informes',q):raise RuntimeError('An unpublished archive link needs an explicit public replacement')
    q=q.replace('[Catálogo activo de documentos]','[Contenido de la edición web]')
    q=q.replace('Los originales y ediciones anteriores siguen conservados; no se han borrado resultados ni modificado entrenamientos.','Los originales y ediciones anteriores se conservan en el archivo local. Esta edición web comparte la documentación, las tablas y una selección de reconstrucciones completas.')
    published=set(IDS)
    def action(m):
        tag=m[0];ids=re.search(r'data-clouds="([^"]+)"',tag)[1].split(',');kept=[i for i in ids if i in published]
        if not kept:return ''
        return re.sub(r'data-clouds="[^"]+"','data-clouds="'+','.join(kept)+'"',tag)
    q=re.sub(r'<button\b[^>]*class="book-open-clouds"[^>]*>.*?</button>',action,q)
    def note(m):
        block=m[0]
        if 'class="book-open-clouds"' not in block:
            block=re.sub(r'<p class="book-cloud-note">.*?</p>','<p class="book-cloud-note">La edición web conserva las mediciones de esta ficha. Las exportaciones específicas del diagnóstico, cuando existen, permanecen en el archivo local.</p>',block)
        return block
    q=re.sub(r'<details class="experiment-card".*?</details>',note,q,flags=re.S)
    q=q.replace('## Comparadores interactivos {#comparadores}','## Comparadores interactivos {#comparadores}\n\nEsta edición web ofrece **15 nubes principales completas** de C3VD y SCARED. Cada nube conserva el **100 % de sus puntos guardados**. Las demás exportaciones del archivo local no se incluyen en esta publicación.\n')
    if not same_tables(original,q):raise RuntimeError('Public export changed a notebook data table')
    if q.count('class="experiment-card"')!=original.count('class="experiment-card"'):raise RuntimeError('An experiment card was lost')
    (dst/'Bitacora.qmd').write_text(q,encoding='utf8')
    for rel in ['recursos/bitacora.css','recursos/offline.scss','recursos/navegacion.html','recursos/comparadores_integracion.js']:
        copy(src/rel,dst/rel)
    for img in (src/'imagenes').glob('*'):
        if img.is_file():copy(img,dst/'imagenes'/img.name)
    app=dst/'reconstrucciones/interactivo';app.mkdir(parents=True,exist_ok=True)
    for name in ['comparador.html','app.css','viewer.js','metric-viewer.js']:copy(src/'reconstrucciones/interactivo'/name,app/name)
    # A network download of a full cloud may take longer than a local disk read.
    viewer=(app/'viewer.js').read_text(encoding='utf8')
    viewer=viewer.replace('}},120000);','}},600000);').replace(')),120000);',')),600000);')
    viewer=viewer.replace("')),120000);","')),600000);")
    viewer=viewer.replace('el paquete local. Conserva la carpeta datos junto al visor.','el paquete de puntos. Comprueba la conexión y vuelve a cargarlo.')
    viewer=adapt_viewer(viewer)
    (app/'viewer.js').write_text(viewer,encoding='utf8')
    manifest=read(src/'reconstrucciones/interactivo/clouds.json');byid={x['id']:x for x in manifest['clouds']}
    clouds=[];packages={}
    for id in IDS:
        r=byid[id]
        if not r.get('available') or not r.get('all_source_pixels'):raise RuntimeError('Primary cloud is incomplete: '+id)
        key=r['pack_key'];file=src/'reconstrucciones/interactivo'/r['path'];receipt=file.with_suffix('.json');info=read(receipt)
        if file.stat().st_size>=100*2**20:raise RuntimeError('Package exceeds GitHub file limit')
        if sha(file)!=info['package_sha256']:raise RuntimeError('Package checksum differs: '+id)
        if id in {'scared8-scared-v9','scared9-scared-v9','c3vd-scared-v9'}:
            info=publish_binary(file,app/'datos',info)
            remove_verified_redundant_js(app/'datos',key,info['source_js_package_sha256'])
        else:
            copy(file,app/r['path']);copy(receipt,app/'datos'/receipt.name)
        packages[key]=info
        safe=clean(r);safe['source']='Exportación guardada · '+r['label']
        for field in ['path','package_bytes','container','source_js_package_sha256']:
            if field in info:safe[field]=info[field]
        clouds.append(safe)
    public={'version':manifest['version'],'clouds':clouds,'errors':[],'no_new_inference_or_training':manifest.get('no_new_inference_or_training', True),'point_sampling':False,'public_scope':str(len(IDS))+' main complete clouds; other historical exports remain local','unique_packages':len(packages),'physical_package_bytes':sum(x['package_bytes'] for x in packages.values())}
    dump(app/'clouds.json',public);(app/'clouds.js').write_text('window.CLOUD_REGISTRY='+json.dumps(public,ensure_ascii=False).replace('<','\\u003c')+';',encoding='utf8')
    met=clean(read(src/'reconstrucciones/interactivo/metrics.json'));dump(app/'metrics.json',met)
    (app/'metrics.js').write_text('window.METRIC_REGISTRY='+json.dumps(met,ensure_ascii=False).replace('<','\\u003c')+';',encoding='utf8')
    raw=(src/'tablas/biblioteca.js').read_text(encoding='utf8');tables=json.loads(raw[len('window.tablas='):].rstrip(';\n\r '))
    for t in tables:
        for o in t.get('origins',[]):
            o['path']=re.split(r'[\\/]',o.get('path',''))[-1]
            o.pop('archive',None)
    dump(dst/'tablas/biblioteca.json',tables)
    (dst/'tablas/biblioteca.js').write_text('window.tablas='+json.dumps(tables,ensure_ascii=False).replace('<','\\u003c')+';',encoding='utf8')
    experiments=clean(read(src/'tablas/experimentos_c3vd.json'));dump(dst/'tablas/experimentos_c3vd.json',experiments)
    with (dst/'tablas/experimentos_c3vd.csv').open('w',encoding='utf-8-sig',newline='') as f:
        w=csv.DictWriter(f,fieldnames=list(experiments[0]));w.writeheader()
        for r in experiments:w.writerow({k:json.dumps(v,ensure_ascii=False) if isinstance(v,(dict,list)) else v for k,v in r.items()})
    for name in ['scared_v9_validation.csv','scared_v9_resultados.json','c3vd_scared_transfer_v1.csv','c3vd_scared_transfer_v1.json','experimentos_scared_e01_e12.json','experimentos_scared_e01_e12.csv','scared_e01_e12_datos.csv','scared_followups_b_resumen.json','scared_followups_b_tablas.csv','scared_protocolos_preparados.json','menu_experimentos_scared.json']:
        # Granular SCARED records remain local; only the authorized summary is public.
        if name=='experimentos_scared_e01_e12.json' and (src/'tablas'/name).exists():
            if 'detailed_results' in read(src/'tablas'/name):raise RuntimeError('Granular SCARED records are not approved for public export')
        if name=='scared_e01_e12_datos.csv' and (src/'tablas'/name).exists():
            with (src/'tablas'/name).open(encoding='utf-8-sig',newline='') as f:
                if any(r['experimento'] not in {f'E{i:02d}' for i in range(1,13)} for r in csv.DictReader(f)):raise RuntimeError('Only summary tables are approved for public export')
        # Followup summaries contain no granular exports.
        if name in {'scared_followups_b_resumen.json','scared_protocolos_preparados.json'} and (src/'tablas'/name).exists():
            summary=read(src/'tablas'/name)
            if summary.get('technical_records_exported') is not False or 'detailed_results' in summary:raise RuntimeError('Only approved summaries may be published')
        if name=='scared_followups_b_tablas.csv' and (src/'tablas'/name).exists():
            with (src/'tablas'/name).open(encoding='utf-8-sig',newline='') as f:
                if any(r['experimento'] not in {'E10-B','E11-B','E07-B','E05-B'} for r in csv.DictReader(f)):raise RuntimeError('Only four summary tables are approved')
        if (src/'tablas'/name).exists():copy(src/'tablas'/name,dst/'tablas'/name)
    # Export report contains reproducible hashes, never machine paths or credentials.
    report={'project':'N3D-CE','source_qmd_sha256':sha(src/'Bitacora.qmd'),'public_qmd_sha256':sha(dst/'Bitacora.qmd'),'source_data_tables_preserved':len(re.findall(r'(?m)(?:^\|[^\n]*\n)+',q)),'experiment_cards':q.count('class="experiment-card"'),'scared_experiment_cards':q.count('class="scared-experiment-card"'),'scared_followup_cards':q.count('class="scared-followup-card"'),'prepared_protocol_cards':q.count('class="prepared-experiment-card"'),'public_clouds':[{'id':r['id'],'points':r['points'],'package_sha256':packages[r['pack_key']]['package_sha256']} for r in clouds],'cloud_bytes':public['physical_package_bytes'],'metric_entries':len(met['entries']),'historical_tables':len(tables),'all_saved_vertices_preserved':True,'new_training':False,'new_inference':False}
    dump(dst/'publication_manifest.json',report)
    print(json.dumps({k:v for k,v in report.items() if k!='public_clouds'},ensure_ascii=True))
if __name__=='__main__':main()
