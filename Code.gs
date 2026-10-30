// Silsilah Keluarga - server penyimpan data terenkripsi (Google Apps Script)
const FOLDER_ID = '1bpNwsRVr4_MdvSt2Zk9SSukymSENIpcB'; // ID folder Google Drive
const FILE_NAME = 'silsilah.enc';

function out_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

function doGet() { return out_({ ok: true, info: 'Silsilah API' }); }

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    const req = JSON.parse(e.postData.contents);
    const props = PropertiesService.getScriptProperties();
    if (typeof req.token !== 'string' || !/^[0-9a-f]{64}$/.test(req.token)) return out_({ error: 'Kode akses tidak valid' });
    let saved = props.getProperty('TOKEN');
    if (!saved) {                       // penyimpanan pertama menetapkan kode akses
      if (req.action !== 'put') return out_({ data: '', version: '' });
      props.setProperty('TOKEN', req.token);
      saved = req.token;
    }
    if (req.token !== saved) return out_({ error: 'Akses ditolak: sandi tidak cocok dengan yang pertama kali dipakai' });
    const folder = DriveApp.getFolderById(FOLDER_ID);
    const it = folder.getFilesByName(FILE_NAME);
    const file = it.hasNext() ? it.next() : null;
    const version = file ? String(file.getLastUpdated().getTime()) : '';
    if (req.action === 'get') return out_({ data: file ? file.getBlob().getDataAsString() : '', version: version });
    if (req.action === 'put') {
      if (typeof req.data !== 'string' || req.data.length > 2000000) return out_({ error: 'Data tidak valid' });
      if (file && String(req.base || '') !== version) return out_({ conflict: true });
      if (file) file.setContent(req.data); else folder.createFile(FILE_NAME, req.data, MimeType.PLAIN_TEXT);
      return out_({ ok: true });
    }
    return out_({ error: 'Aksi tidak dikenal' });
  } catch (err) {
    return out_({ error: String(err) });
  } finally {
    try { lock.releaseLock(); } catch (x) {}
  }
}

// Jalankan SEKALI bila perlu mengganti sandi: menghapus kode akses tersimpan.
function resetKodeAkses() { PropertiesService.getScriptProperties().deleteProperty('TOKEN'); }
