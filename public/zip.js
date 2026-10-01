// Pembuat berkas ZIP sederhana (tanpa kompresi, cocok untuk JPEG) yang berjalan di browser.
(function (root) {
  'use strict';
  var table = null;
  function crc32(u8) {
    if (!table) {
      table = new Uint32Array(256);
      for (var n = 0; n < 256; n++) {
        var c = n;
        for (var k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        table[n] = c >>> 0;
      }
    }
    var crc = 0xffffffff;
    for (var i = 0; i < u8.length; i++) crc = table[(crc ^ u8[i]) & 0xff] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
  }
  function dosTime(d) {
    return {
      time: (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1),
      date: ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()
    };
  }
  // files: [{name, data: Uint8Array}] -> Blob
  function makeZip(files) {
    var enc = new TextEncoder();
    var parts = [];
    var central = [];
    var offset = 0;
    var t = dosTime(new Date());
    files.forEach(function (f) {
      var name = enc.encode(f.name);
      var crc = crc32(f.data);
      var size = f.data.length;
      var lh = new DataView(new ArrayBuffer(30));
      lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true);
      lh.setUint16(8, 0, true); lh.setUint16(10, t.time, true); lh.setUint16(12, t.date, true);
      lh.setUint32(14, crc, true); lh.setUint32(18, size, true); lh.setUint32(22, size, true);
      lh.setUint16(26, name.length, true); lh.setUint16(28, 0, true);
      parts.push(lh.buffer, name, f.data);
      var ch = new DataView(new ArrayBuffer(46));
      ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true);
      ch.setUint16(10, 0, true); ch.setUint16(12, t.time, true); ch.setUint16(14, t.date, true);
      ch.setUint32(16, crc, true); ch.setUint32(20, size, true); ch.setUint32(24, size, true);
      ch.setUint16(28, name.length, true); ch.setUint32(42, offset, true);
      central.push(ch.buffer, name);
      offset += 30 + name.length + size;
    });
    var cdSize = 0;
    central.forEach(function (b) { cdSize += b.byteLength !== undefined ? b.byteLength : b.length; });
    var end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
    end.setUint32(12, cdSize, true); end.setUint32(16, offset, true);
    return new Blob(parts.concat(central, [end.buffer]), { type: 'application/zip' });
  }
  // Mengunduh semua foto lalu menyimpannya sebagai zip. onProgress(selesai, total)
  function downloadAll(items, zipName, onProgress) {
    var files = [];
    var done = 0;
    function next(i) {
      if (i >= items.length) {
        var url = URL.createObjectURL(makeZip(files));
        var a = document.createElement('a');
        a.href = url; a.download = zipName;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
        return Promise.resolve(files.length);
      }
      return fetch('/api/photo/' + items[i].id).then(function (r) {
        if (!r.ok) throw new Error('Gagal mengunduh foto ' + (i + 1));
        return r.arrayBuffer();
      }).then(function (buf) {
        files.push({ name: 'foto-' + String(i + 1).padStart(3, '0') + '.jpg', data: new Uint8Array(buf) });
        done++; if (onProgress) onProgress(done, items.length);
        return next(i + 1);
      });
    }
    return next(0);
  }
  root.PhotoboxZip = { makeZip: makeZip, downloadAll: downloadAll };
})(window);
