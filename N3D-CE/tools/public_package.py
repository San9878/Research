"""Lossless binary container for existing gzip chunks; no geometry recomputation."""
from pathlib import Path
import base64,gzip,hashlib,json,struct
MAGIC=b'N3DPACK1'

def sha(p):
    h=hashlib.sha256()
    with Path(p).open('rb') as f:
        for b in iter(lambda:f.read(8*2**20),b''):h.update(b)
    return h.hexdigest()

def publish_binary(source,destination,info):
    source=Path(source);destination=Path(destination);destination.mkdir(parents=True,exist_ok=True)
    key=info['key'];target=destination/(key+'.bin');receipt=destination/(key+'.json')
    if target.exists() and receipt.exists():
        current=json.loads(receipt.read_text(encoding='utf8'))
        if current.get('source_js_package_sha256')==info['package_sha256'] and sha(target)==current['package_sha256']:
            return current
    text=source.read_text(encoding='ascii').strip();prefix='window.__receiveCloudPack('+json.dumps(key)+','
    if not text.startswith(prefix) or not text.endswith(');'):raise ValueError('Unexpected original JS container')
    payload=json.loads(text[len(prefix):-2]);compressed=[];digest=hashlib.sha256()
    if payload['key']!=key or payload['count']!=info['points']:raise ValueError('Container identity differs')
    for chunk in payload['chunks']:
        data=base64.b64decode(chunk['data'],validate=True)
        raw=gzip.decompress(data)
        if len(raw)!=chunk['count']*(3*payload['position_bytes']+3):raise ValueError('Decoded chunk population differs')
        compressed.append(data);digest.update(data)
    header={k:payload[k] for k in ['key','count','position_bytes','codec']}
    header['chunks']=[{'count':c['count'],'bytes':len(data)} for c,data in zip(payload['chunks'],compressed)]
    head=json.dumps(header,separators=(',',':')).encode('utf8');tmp=target.with_suffix('.partial')
    with tmp.open('wb') as f:
        f.write(MAGIC);f.write(struct.pack('<I',len(head)));f.write(head)
        for data in compressed:f.write(data)
    # Exact compressed-byte roundtrip ensures identical original XYZ and RGB.
    with tmp.open('rb') as f:
        if f.read(8)!=MAGIC:raise ValueError('Invalid binary header')
        size=struct.unpack('<I',f.read(4))[0];h=json.loads(f.read(size));check=hashlib.sha256()
        for chunk,data in zip(h['chunks'],compressed):
            restored=f.read(chunk['bytes'])
            if restored!=data:raise ValueError('Binary chunk changed')
            check.update(restored)
        if f.read(1) or check.hexdigest()!=digest.hexdigest():raise ValueError('Binary payload differs')
    tmp.replace(target)
    result={**info,'container':'binary-chunks-v1','source_js_package_sha256':info['package_sha256'],
            'compressed_chunks_SHA256':digest.hexdigest(),'package_sha256':sha(target),'package_bytes':target.stat().st_size,
            'path':'datos/'+target.name,'binary_container_roundtrip_exact':True}
    receipt.write_text(json.dumps(result,indent=2),encoding='utf8');return result

def remove_verified_redundant_js(directory,key,expected):
    directory=Path(directory).resolve();p=(directory/(key+'.js')).resolve()
    if p.parent!=directory:raise RuntimeError('Generated public file is outside expected directory')
    # Keep a tiny backwards-compatible loader at the former URL so browsers
    # holding an older registry can still decode exactly the same full cloud.
    shim='''(()=>{const key=KEY,url=new URL(key+'.bin',document.currentScript.src);fetch(url).then(r=>{if(!r.ok)throw Error('Cloud '+r.status);return r.arrayBuffer()}).then(buffer=>{const bytes=new Uint8Array(buffer),v=new DataView(buffer);if(new TextDecoder().decode(bytes.subarray(0,8))!=='N3DPACK1')throw Error('Cloud header');const n=v.getUint32(8,true),h=JSON.parse(new TextDecoder().decode(bytes.subarray(12,12+n)));let offset=12+n;h.chunks=h.chunks.map(c=>{const part=bytes.subarray(offset,offset+c.bytes);offset+=c.bytes;let pieces=[];for(let i=0;i<part.length;i+=32768)pieces.push(String.fromCharCode(...part.subarray(i,i+32768)));return {count:c.count,data:btoa(pieces.join(''))}});if(offset!==bytes.length||h.key!==key)throw Error('Cloud identity');window.__receiveCloudPack(key,h)}).catch(e=>console.error('Cloud compatibility loader:',e))})();'''.replace('KEY',json.dumps(key))
    if p.exists():
        if p.read_text(encoding='ascii')==shim:return
        if sha(p)!=expected:raise ValueError('Refusing to remove changed public JS file')
    tmp=p.with_suffix('.js.tmp');tmp.write_text(shim,encoding='ascii');tmp.replace(p)

PACK_BRANCH=''' if(meta.container==='binary-chunks-v1'){
  const response=await fetch(meta.path);if(!response.ok)throw Error('No se pudo leer el paquete binario: '+response.status);
  const buffer=await response.arrayBuffer(),bytes=new Uint8Array(buffer),view=new DataView(buffer);
  if(new TextDecoder().decode(bytes.subarray(0,8))!=='N3DPACK1')throw Error('Cabecera binaria incompatible');
  const length=view.getUint32(8,true),h=JSON.parse(new TextDecoder().decode(bytes.subarray(12,12+length)));
  if(h.key!==meta.pack_key||h.count!==meta.points)throw Error('Identidad o cantidad de puntos incompatible');
  let offset=12+length,total=0;const chunks=h.chunks.map(c=>{const end=offset+c.bytes;if(end>bytes.length)throw Error('Paquete binario incompleto');const chunk={count:c.count,binary:bytes.subarray(offset,end)};offset=end;total+=c.count;return chunk});
  if(offset!==bytes.length||total!==h.count)throw Error('La población del paquete binario difiere');
  return {...h,chunks};
 }
'''
DECODE_OLD=" const str=atob(chunk.data),compressed=new Uint8Array(str.length);for(let i=0;i<str.length;i++)compressed[i]=str.charCodeAt(i);"
DECODE_NEW=" let compressed;if(chunk.binary){compressed=chunk.binary;chunk.binary=null}else{const str=atob(chunk.data);compressed=new Uint8Array(str.length);for(let i=0;i<str.length;i++)compressed[i]=str.charCodeAt(i)};"

def adapt_viewer(viewer):
    if "if(meta.container==='binary-chunks-v1')" in viewer:return viewer
    if 'async function pack(meta){\n' not in viewer or DECODE_OLD not in viewer:raise ValueError('Viewer interface changed; inspect before modifying')
    return viewer.replace('async function pack(meta){\n','async function pack(meta){\n'+PACK_BRANCH,1).replace(DECODE_OLD,DECODE_NEW,1)
