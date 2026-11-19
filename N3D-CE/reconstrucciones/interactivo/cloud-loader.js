/* Lossless package transport. Geometry and point selection are not changed. */
(function (root) {
  'use strict';
  let sequence = 0;
  const pending = new Map();
  const abortError = () => new DOMException('Carga cancelada.', 'AbortError');
  function validate(meta, data) {
    if (data.key !== meta.pack_key || data.count !== meta.points || data.codec !== 'xor-byteplanes-v1') {
      throw Error('El paquete no corresponde a esta nube. Recarga la página para actualizar el catálogo.');
    }
    if (![4, 8].includes(data.position_bytes) || !Array.isArray(data.chunks) ||
        data.chunks.reduce((n, c) => n + c.count, 0) !== meta.points) throw Error('Cantidad o formato de puntos incoherente.');
    return data;
  }
  function parse(meta, buffer) {
    const bytes = new Uint8Array(buffer);
    if (new TextDecoder().decode(bytes.subarray(0, 8)) === 'N3DPACK1') {
      if (bytes.length < 12) throw Error('Cabecera binaria incompleta.');
      const size = new DataView(buffer).getUint32(8, true);
      if (size > 1048576 || 12 + size > bytes.length) throw Error('Cabecera binaria inválida.');
      const data = JSON.parse(new TextDecoder().decode(bytes.subarray(12, 12 + size)));
      let offset = 12 + size;
      data.chunks = data.chunks.map(c => {
        const end = offset + c.bytes;
        if (!Number.isSafeInteger(c.bytes) || c.bytes <= 0 || end > bytes.length) throw Error('Paquete binario incompleto.');
        const out = { count: c.count, binary: bytes.subarray(offset, end) }; offset = end; return out;
      });
      if (offset !== bytes.length) throw Error('Tamaño binario incoherente.');
      return validate(meta, data);
    }
    const text = new TextDecoder().decode(bytes).trim();
    const prefix = 'window.__receiveCloudPack(' + JSON.stringify(meta.pack_key) + ',';
    if (!text.startsWith(prefix) || !text.endsWith(');')) throw Error('Paquete de nube incompatible o respuesta HTTP incompleta.');
    return validate(meta, JSON.parse(text.slice(prefix.length, -2)));
  }
  async function fetchPackage(meta, signal, progress) {
    const response = await fetch(meta.path, { signal, cache: 'default' });
    if (!response.ok) throw Error('No se pudo descargar la nube (HTTP ' + response.status + '). Reintenta o abre el visor en otra pestaña.');
    const encoded = response.headers.get('content-encoding');
    const total = encoded && encoded !== 'identity' ? (meta.package_bytes || 0) :
      Number(response.headers.get('content-length')) || meta.package_bytes || 0;
    if (!response.body) return parse(meta, await response.arrayBuffer());
    const reader = response.body.getReader(), parts = []; let received = 0;
    try {
      while (true) {
        const { value, done } = await reader.read(); if (done) break;
        if (signal.aborted) throw abortError();
        parts.push(value); received += value.byteLength; progress?.({ received, total });
      }
    } finally { reader.releaseLock(); }
    if (signal.aborted) throw abortError();
    const buffer = new Uint8Array(received); let offset = 0;
    for (const part of parts) { buffer.set(part, offset); offset += part.length; }
    parts.length = 0;
    return parse(meta, buffer.buffer);
  }
  function filePackage(meta, signal) {
    return new Promise((resolve, reject) => {
      if (signal.aborted) { reject(abortError()); return; }
      const script = document.createElement('script'), token = 'cloud-' + (++sequence);
      const cleanup = () => { pending.delete(token); script.remove(); signal.removeEventListener('abort', cancel); };
      const cancel = () => { cleanup(); reject(abortError()); };
      pending.set(token, { key: meta.pack_key, resolve: data => { cleanup(); try { resolve(validate(meta, data)); } catch (e) { reject(e); } } });
      script.dataset.cloudRequest = token; script.src = meta.path; script.async = true;
      script.onerror = () => { cleanup(); reject(Error('No se encontró el paquete local. Conserva la carpeta datos junto al visor.')); };
      signal.addEventListener('abort', cancel, { once: true }); document.head.append(script);
    });
  }
  root.__receiveCloudPack = (key, data) => {
    const token = root.document?.currentScript?.dataset.cloudRequest;
    const request = pending.get(token);
    if (request?.key === key) request.resolve(data);
    // A cancelled old script never resolves a newer request for the same key.
  };
  async function load(meta, options = {}) {
    const controller = new AbortController(), parent = options.signal;
    const cancel = () => controller.abort();
    if (parent?.aborted) throw abortError();
    parent?.addEventListener('abort', cancel, { once: true });
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; controller.abort(); }, options.timeoutMs ?? 900000);
    try {
      return (root.location?.protocol === 'file:') ? await filePackage(meta, controller.signal) :
        await fetchPackage(meta, controller.signal, options.onProgress);
    } catch (e) {
      if (timedOut) throw Error('La descarga excedió 15 minutos. Reintenta una nube individual o revisa la conexión.');
      throw e;
    } finally { clearTimeout(timer); parent?.removeEventListener('abort', cancel); }
  }
  root.BookCloudTransport = { load, parse };
  if (typeof module !== 'undefined') module.exports = root.BookCloudTransport;
})(typeof window !== 'undefined' ? window : globalThis);
