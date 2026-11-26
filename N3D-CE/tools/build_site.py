"""Assemble and validate the exact GitHub Pages allowlist."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit,unquote
import argparse,json,re,shutil
from public_package import remove_verified_redundant_js
from lineage_guard import verify_root

class Doc(HTMLParser):
    def __init__(self):super().__init__();self.links=[];self.ids=set()
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if a.get('id'):self.ids.add(a['id'])
        for k in ['src','href']:
            if a.get(k):self.links.append(a[k])

def verify(site):
    errors=[];checked=0
    for p in site.rglob('*.html'):
        d=Doc();d.feed(p.read_text(encoding='utf8'))
        for link in d.links:
            u=urlsplit(link)
            if u.scheme or u.netloc:continue
            if u.path.startswith('/Research/'):target=site/u.path[len('/Research/'):]
            elif u.path.startswith('/'):errors.append([str(p.relative_to(site)),link,'absolute unscoped path']);continue
            else:target=(p.parent/unquote(u.path)) if u.path else p
            if not target.resolve().is_relative_to(site.resolve()):errors.append([str(p.relative_to(site)),link,'outside site']);continue
            if target.is_dir():target=target/'index.html'
            checked+=1
            if not target.exists():errors.append([str(p.relative_to(site)),link,'missing resource'])
            elif not u.path and u.fragment and unquote(u.fragment) not in d.ids:errors.append([str(p.relative_to(site)),link,'missing anchor'])
    verify_root(site/'N3D-CE')
    app=site/'N3D-CE/reconstrucciones/interactivo'
    registry=json.loads((app/'clouds.json').read_text(encoding='utf8'))['clouds']
    expected=json.loads((site/'N3D-CE/publication_manifest.json').read_text(encoding='utf8'))['public_clouds']
    assert {r['id'] for r in registry}=={r['id'] for r in expected}
    assert all(r['available'] and r['all_source_pixels'] for r in registry)
    for r in registry:
        if r.get('external_asset_commit'):
            expected='https://raw.githubusercontent.com/San9878/Research/'+r['external_asset_commit']+'/clouds/'+r['pack_key']+'.bin'
            assert re.fullmatch('[0-9a-f]{40}',r['external_asset_commit']) and r['path']==expected
            receipt=json.loads((app/'datos'/(r['pack_key']+'.json')).read_text(encoding='utf8'))
            assert receipt['points']==r['points'] and receipt['package_sha256']==r['package_sha256']
            assert receipt['package_bytes']==r['package_bytes'] and receipt['all_vertices_preserved']
            continue
        if r.get('container')=='binary-chunks-v1':
            remove_verified_redundant_js(app/'datos',r['pack_key'],r['source_js_package_sha256'])
        f=app/r['path'];assert f.is_file() and f.stat().st_size==r['package_bytes']
    size=sum(p.stat().st_size for p in site.rglob('*') if p.is_file())
    if size>=985_000_000:errors.append(['site',str(size),'exceeds safety budget below Pages 1 GB'])
    files=[p for p in site.rglob('*') if p.is_file()]
    if any(p.stat().st_size>=100*2**20 for p in files):errors.append(['site','','file exceeds 100 MiB'])
    if errors:raise RuntimeError(json.dumps(errors,ensure_ascii=False))
    print(json.dumps({'link_checks':checked,'broken_links':0,'site_bytes':size,'clouds':len(registry),'all_points_preserved':True}))

def main():
    p=argparse.ArgumentParser();p.add_argument('--root',type=Path,default=Path(__file__).resolve().parents[2]);args=p.parse_args()
    root=args.root.resolve();source=root/'N3D-CE';site=root/'_site'
    if not (root/'.git').is_dir() or not (source/'Bitacora.html').is_file():raise RuntimeError('Render Bitacora.qmd in the Research checkout first')
    site.mkdir(exist_ok=True);public=site/'N3D-CE';public.mkdir(exist_ok=True)
    for name in ['index.html','Bitacora.html','publication_manifest.json']:
        shutil.copyfile(source/name,public/name)
    for folder in ['Bitacora_files','imagenes','recursos','tablas','catalogo','reconstrucciones','contenido']:
        src=source/folder;dest=public/folder
        if src.exists():shutil.copytree(src,dest,dirs_exist_ok=True,ignore=shutil.ignore_patterns('navegacion.html') if folder=='recursos' else None)
    shutil.copyfile(root/'index.html',site/'index.html')
    (site/'.nojekyll').write_text('',encoding='ascii')
    verify(site)
if __name__=='__main__':main()
