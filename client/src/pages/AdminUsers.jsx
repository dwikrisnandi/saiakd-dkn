import React, { useState, useEffect, useRef } from 'react';
import api from '../utils/api';
import * as XLSX from 'xlsx';
import { Plus, Edit2, Trash2, Upload, FileSpreadsheet, CheckCircle, XCircle } from 'lucide-react';

export default function AdminUsers({ roleType, title }) {
  const [users, setUsers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [formData, setFormData] = useState({ nidn_nim: '', name: '', password: '' });
  const [editFormData, setEditFormData] = useState({ id: '', nidn_nim: '', name: '', password: '', class_id: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Import states
  const [importRows, setImportRows] = useState([]);
  const [importStatus, setImportStatus] = useState({}); // { rowIndex: 'success' | 'error' | 'loading' }
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef();

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/users?role=${roleType}`);
      setUsers(res.data);
      if (roleType === 'mahasiswa') {
        const clsRes = await api.get('/classes');
        setClasses(clsRes.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [roleType]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    try {
      await api.post('/users', { ...formData, role: roleType });
      setShowModal(false);
      setFormData({ nidn_nim: '', name: '', password: '' });
      setSuccess(`Data ${title} berhasil ditambahkan`);
      fetchUsers();
    } catch (err) {
      setError(`Gagal menyimpan data ${title}`);
    }
  };

  const openEditModal = (user) => {
    setEditFormData({ id: user.id, nidn_nim: user.nidn_nim, name: user.name, password: '', class_id: user.class_id || '' });
    setShowEditModal(true);
    setError(''); setSuccess('');
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    try {
      await api.put(`/users/${editFormData.id}`, { ...editFormData, role: roleType });
      setShowEditModal(false);
      setSuccess(`Data ${title} berhasil diupdate`);
      fetchUsers();
    } catch (err) {
      setError(`Gagal mengupdate data ${title}`);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm(`Yakin ingin menghapus ${title} ini?`)) {
      setError(''); setSuccess('');
      try {
        await api.delete(`/users/${id}`);
        setSuccess(`Data ${title} berhasil dihapus`);
        fetchUsers();
      } catch (err) {
        setError(`Gagal menghapus data ${title}`);
      }
    }
  };

  // ---- EXCEL IMPORT ----
  const handleXLSFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const data = new Uint8Array(ev.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      // Skip header row, map to objects
      const parsed = rows
        .slice(1) // skip first row (header)
        .filter(r => r[0] || r[1]) // skip empty rows
        .map((r, idx) => ({
          rowNum: idx + 2,
          nim: String(r[0] || '').trim(),
          name: String(r[1] || '').trim(),
          password: String(r[2] || '').trim()
        }))
        .filter(r => r.nim && r.name && r.password);

      setImportRows(parsed);
      setImportStatus({});
    };
    reader.readAsArrayBuffer(file);
  };

  const openImportModal = () => {
    setImportRows([]);
    setImportStatus({});
    if (fileInputRef.current) fileInputRef.current.value = '';
    setShowImportModal(true);
  };

  const handleConfirmImport = async () => {
    if (importRows.length === 0) return;
    setImporting(true);

    const newStatus = {};
    for (let i = 0; i < importRows.length; i++) {
      const row = importRows[i];
      newStatus[i] = 'loading';
      setImportStatus({ ...newStatus });
      try {
        await api.post('/users', { nidn_nim: row.nim, name: row.name, password: row.password, role: roleType });
        newStatus[i] = 'success';
      } catch {
        newStatus[i] = 'error';
      }
      setImportStatus({ ...newStatus });
    }

    setImporting(false);
    const successCount = Object.values(newStatus).filter(s => s === 'success').length;
    setSuccess(`Import selesai! ${successCount} dari ${importRows.length} data berhasil ditambahkan.`);
    fetchUsers();
  };
  // ---- END EXCEL IMPORT ----

  return (
    <div className="animate-fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <h3 className="fw-bold mb-0">Manajemen {title}</h3>
        <div className="d-flex gap-2">
          {roleType === 'mahasiswa' && (
            <button className="btn btn-outline-success d-flex align-items-center gap-2 rounded-pill px-3" onClick={openImportModal}>
              <FileSpreadsheet size={16} /> Import Excel
            </button>
          )}
          <button className="btn btn-primary d-flex align-items-center gap-2 rounded-pill px-3" onClick={() => setShowModal(true)}>
            <Plus size={18} /> Tambah {title}
          </button>
        </div>
      </div>

      {success && <div className="alert alert-success alert-dismissible" onClick={() => setSuccess('')}>{success}</div>}
      {error && <div className="alert alert-danger alert-dismissible" onClick={() => setError('')}>{error}</div>}

      <div className="card shadow-sm border-0 rounded-4">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover mb-0 align-middle">
              <thead className="table-light">
                  <tr>
                    <th className="ps-4 py-3">{roleType === 'dosen' ? 'NIDN' : 'NIM'}</th>
                    <th className="py-3">Nama Lengkap</th>
                    {roleType === 'mahasiswa' && <th className="py-3">Kelas</th>}
                    <th className="py-3">Tanggal Terdaftar</th>
                    <th className="pe-4 py-3 text-end">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={roleType === 'mahasiswa' ? "5" : "4"} className="text-center py-4">Memuat data...</td></tr>
                  ) : users.length === 0 ? (
                    <tr><td colSpan={roleType === 'mahasiswa' ? "5" : "4"} className="text-center py-4 text-muted">Belum ada data {title}</td></tr>
                  ) : (
                    users.map(u => (
                      <tr key={u.id}>
                        <td className="ps-4 fw-semibold text-muted">{u.nidn_nim}</td>
                        <td>{u.name}</td>
                        {roleType === 'mahasiswa' && (
                          <td>
                            {u.class_name ? (
                              <span className="badge bg-info-subtle text-info border border-info-subtle">{u.class_name}</span>
                            ) : (
                              <span className="text-muted small border rounded px-2 py-1 bg-light">Belum Masuk Kelas</span>
                            )}
                          </td>
                        )}
                        <td>{new Date(u.created_at).toLocaleDateString('id-ID')}</td>
                        <td className="pe-4 text-end">
                        <button className="btn btn-sm btn-light text-primary me-2" onClick={() => openEditModal(u)} title={`Edit ${title}`}>
                          <Edit2 size={16} />
                        </button>
                        <button className="btn btn-sm btn-light text-danger" onClick={() => handleDelete(u.id)} title={`Hapus ${title}`}>
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ADD MODAL */}
      {showModal && (
        <>
          <div className="modal-backdrop fade show"></div>
          <div className="modal fade show d-block" tabIndex="-1">
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content border-0 shadow">
                <div className="modal-header border-bottom-0 pb-0">
                  <h5 className="modal-title fw-bold">Tambah {title}</h5>
                  <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
                </div>
                <div className="modal-body">
                  {error && <div className="alert alert-danger py-2">{error}</div>}
                  <form onSubmit={handleSubmit}>
                    <div className="mb-3">
                      <label className="form-label text-muted small fw-bold">{roleType === 'dosen' ? 'NIDN' : 'NIM'}</label>
                      <input type="text" className="form-control" required value={formData.nidn_nim} onChange={e => setFormData({...formData, nidn_nim: e.target.value})} />
                    </div>
                    <div className="mb-3">
                      <label className="form-label text-muted small fw-bold">Nama Lengkap</label>
                      <input type="text" className="form-control" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                    </div>
                    <div className="mb-3">
                      <label className="form-label text-muted small fw-bold">Password Login</label>
                      <input type="password" className="form-control" required minLength="6" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                    </div>
                    <div className="d-flex justify-content-end gap-2 mt-4">
                      <button type="button" className="btn btn-light" onClick={() => setShowModal(false)}>Batal</button>
                      <button type="submit" className="btn btn-primary px-4">Simpan</button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* EDIT MODAL */}
      {showEditModal && (
        <>
          <div className="modal-backdrop fade show"></div>
          <div className="modal fade show d-block" tabIndex="-1">
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content border-0 shadow">
                <div className="modal-header border-bottom-0 pb-0">
                  <h5 className="modal-title fw-bold">Edit {title}</h5>
                  <button type="button" className="btn-close" onClick={() => setShowEditModal(false)}></button>
                </div>
                <div className="modal-body">
                  {error && <div className="alert alert-danger py-2">{error}</div>}
                  <form onSubmit={handleEditSubmit}>
                    <div className="mb-3">
                      <label className="form-label text-muted small fw-bold">{roleType === 'dosen' ? 'NIDN' : 'NIM'}</label>
                      <input type="text" className="form-control" required value={editFormData.nidn_nim} onChange={e => setEditFormData({...editFormData, nidn_nim: e.target.value})} />
                    </div>
                    <div className="mb-3">
                      <label className="form-label text-muted small fw-bold">Nama Lengkap</label>
                      <input type="text" className="form-control" required value={editFormData.name} onChange={e => setEditFormData({...editFormData, name: e.target.value})} />
                    </div>
                    <div className="mb-3">
                      <label className="form-label text-muted small fw-bold">Password Login (Kosongkan jika tidak ingin diubah)</label>
                      <input type="password" className="form-control" minLength="6" placeholder="Opsional" value={editFormData.password} onChange={e => setEditFormData({...editFormData, password: e.target.value})} />
                    </div>
                    {roleType === 'mahasiswa' && (
                      <div className="mb-3">
                        <label className="form-label text-muted small fw-bold">Alokasi Kelas Mahasiswa</label>
                        <select className="form-select" value={editFormData.class_id} onChange={e => setEditFormData({...editFormData, class_id: e.target.value})}>
                          <option value="">-- Tidak Terdaftar (Tanpa Kelas) --</option>
                          {classes.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                        <small className="text-muted">Setiap mahasiswa hanya dapat terdaftar ke dalam satu kelas pada satu jadwal kurikulum.</small>
                      </div>
                    )}
                    <div className="d-flex justify-content-end gap-2 mt-4">
                      <button type="button" className="btn btn-light" onClick={() => setShowEditModal(false)}>Batal</button>
                      <button type="submit" className="btn btn-primary px-4">Simpan Perubahan</button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* IMPORT EXCEL MODAL */}
      {showImportModal && (
        <>
          <div className="modal-backdrop fade show"></div>
          <div className="modal fade show d-block" tabIndex="-1">
            <div className="modal-dialog modal-dialog-centered modal-lg">
              <div className="modal-content border-0 shadow rounded-4">
                <div className="modal-header border-0 pb-0">
                  <h5 className="modal-title fw-bold d-flex align-items-center gap-2">
                    <FileSpreadsheet size={20} className="text-success" /> Import Excel — Data Mahasiswa
                  </h5>
                  <button type="button" className="btn-close" onClick={() => setShowImportModal(false)} disabled={importing}></button>
                </div>
                <div className="modal-body">
                  {/* Format info */}
                  <div className="alert border-0 rounded-3 p-3 mb-3" style={{background:'#e8f4fd'}}>
                    <small className="text-info fw-semibold">📋 Format kolom Excel yang diperlukan (baris pertama = header, diabaikan):</small>
                    <table className="table table-sm table-bordered mt-2 mb-0 small">
                      <thead className="table-success"><tr><th>Kolom A: NIM</th><th>Kolom B: Nama Lengkap</th><th>Kolom C: Password</th></tr></thead>
                      <tbody><tr><td>2024001</td><td>Budi Santoso</td><td>password123</td></tr></tbody>
                    </table>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold">Pilih File Excel (.xls / .xlsx)</label>
                    <input
                      type="file"
                      accept=".xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                      className="form-control"
                      onChange={handleXLSFile}
                      ref={fileInputRef}
                      disabled={importing}
                    />
                  </div>

                  {importRows.length > 0 && (
                    <>
                      <p className="fw-semibold mb-2">Preview Data ({importRows.length} baris terdeteksi):</p>
                      <div className="table-responsive" style={{maxHeight:'250px', overflowY:'auto'}}>
                        <table className="table table-sm table-hover align-middle mb-0">
                          <thead className="table-light sticky-top">
                            <tr><th>#</th><th>NIM</th><th>Nama Lengkap</th><th>Password</th><th>Status</th></tr>
                          </thead>
                          <tbody>
                            {importRows.map((row, i) => (
                              <tr key={i}>
                                <td className="text-muted small">{row.rowNum}</td>
                                <td className="fw-semibold">{row.nim}</td>
                                <td>{row.name}</td>
                                <td className="text-muted">{'*'.repeat(Math.min(row.password.length, 8))}</td>
                                <td>
                                  {importStatus[i] === 'success' && <CheckCircle size={16} className="text-success" />}
                                  {importStatus[i] === 'error' && <span><XCircle size={16} className="text-danger" /> <small className="text-danger">Gagal/Duplikat</small></span>}
                                  {importStatus[i] === 'loading' && <span className="spinner-border spinner-border-sm text-primary"></span>}
                                  {!importStatus[i] && <span className="badge bg-secondary-subtle text-secondary rounded-pill">Siap</span>}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
                <div className="modal-footer border-0 pt-0">
                  <button type="button" className="btn btn-light rounded-pill px-4" onClick={() => setShowImportModal(false)} disabled={importing}>Tutup</button>
                  <button
                    type="button"
                    className="btn btn-success rounded-pill px-4 d-flex align-items-center gap-2"
                    onClick={handleConfirmImport}
                    disabled={importRows.length === 0 || importing}
                  >
                    {importing
                      ? <><span className="spinner-border spinner-border-sm"></span> Mengimpor...</>
                      : <><Upload size={16} /> Import {importRows.length} Data</>
                    }
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
