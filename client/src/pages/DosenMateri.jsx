import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { FileText, Plus, Code, Link as LinkIcon, X, ArrowLeft, Users } from 'lucide-react';

export default function DosenMateri() {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState([]);
  const [selectedSchedule, setSelectedSchedule] = useState('');
  
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [viewingMaterial, setViewingMaterial] = useState(null);
  
  const [contentMode, setContentMode] = useState('link'); // 'link' or 'html'
  const [formData, setFormData] = useState({ title: '', description: '', file_url: '', content: '' });

  useEffect(() => {
    const fetchSchedules = async () => {
      try {
        const res = await api.get('/schedules');
        const mySchedules = res.data.filter(s => s.dosen_id === user.id);
        setSchedules(mySchedules);
      } catch (err) {
        console.error(err);
      }
    };
    fetchSchedules();
  }, [user.id]);

  useEffect(() => {
    if (!selectedSchedule) return;
    
    const fetchMaterials = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/materials/${selectedSchedule}`);
        setMaterials(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchMaterials();
  }, [selectedSchedule]);

  const openModal = () => {
    setEditMode(false);
    setEditingId(null);
    setContentMode('link');
    setFormData({ title: '', description: '', file_url: '', content: '' });
    setShowModal(true);
  };

  const openEditModal = (m) => {
    setEditMode(true);
    setEditingId(m.id);
    setContentMode(m.content_type || 'link');
    setFormData({
      title: m.title,
      description: m.description,
      file_url: m.file_url || '',
      content: m.content || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus materi ini?")) return;
    try {
      await api.delete(`/materials/${id}`);
      const res = await api.get(`/materials/${selectedSchedule}`);
      setMaterials(res.data);
    } catch (err) {
      console.error(err);
      alert('Gagal menghapus materi');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSchedule) return;

    const payload = {
      schedule_id: parseInt(selectedSchedule),
      title: formData.title,
      description: formData.description,
      file_url: contentMode === 'link' ? formData.file_url : null,
      content: contentMode === 'html' ? formData.content : null,
      content_type: contentMode
    };

    try {
      if (editMode && editingId) {
        await api.put(`/materials/${editingId}`, payload);
      } else {
        await api.post('/materials', payload);
      }
      setShowModal(false);
      setFormData({ title: '', description: '', file_url: '', content: '' });
      const res = await api.get(`/materials/${selectedSchedule}`);
      setMaterials(res.data);
    } catch (err) {
      console.error(err);
      alert('Gagal mengupload materi');
    }
  };

  const contentTypeLabel = (m) => {
    if (m.content_type === 'html' || m.content) return { label: 'Konten HTML', color: 'bg-success-subtle text-success' };
    return { label: 'Link File', color: 'bg-primary-subtle text-primary' };
  };

  return (
    <div className="animate-fade-in">
      <div className="d-flex align-items-center gap-3 mb-4">
        {selectedSchedule && (
          <button className="btn btn-sm btn-outline-secondary" onClick={() => { setSelectedSchedule(''); setMaterials([]); }}>
             <ArrowLeft size={16} />
          </button>
        )}
        <div className="d-flex justify-content-between align-items-center w-100">
           <div>
             <h3 className="fw-bold mb-0">Manajemen Materi Kuliah</h3>
             {selectedSchedule && <small className="text-muted">Kelas yang dipilih</small>}
           </div>
           {selectedSchedule && (
             <button className="btn btn-primary d-flex align-items-center gap-2" onClick={openModal}>
               <Plus size={18} /> Tambah Materi
             </button>
           )}
        </div>
      </div>

      {!selectedSchedule ? (
        <>
          <p className="text-muted mb-4">Pilih matakuliah untuk mengelola materi:</p>
          {schedules.length === 0 ? (
            <div className="text-center text-muted py-5">
              <FileText size={48} className="mb-3 opacity-50" />
              <h5>Belum ada jadwal</h5>
              <p>Anda belum diassign sebagai dosen untuk kelas manapun.</p>
            </div>
          ) : (
            <div className="row g-3">
              {schedules.map(s => (
                <div className="col-md-6 col-lg-4" key={s.id}>
                  <div
                    className="card shadow-sm border-0 rounded-4 h-100 cursor-pointer text-decoration-none text-dark"
                    style={{ cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                    onClick={() => setSelectedSchedule(s.id)}
                  >
                    <div className="card-body p-4">
                      <div className="d-flex align-items-center mb-3">
                        <div className="bg-primary-subtle p-3 rounded-3 me-3">
                          <Users size={22} className="text-primary" />
                        </div>
                        <span className="badge bg-primary-subtle text-primary border border-primary-subtle">{s.course_code}</span>
                      </div>
                      <h5 className="fw-bold mb-1">{s.course_name}</h5>
                      <p className="text-muted small mb-2">{s.class_name || 'Kelas Umum'}</p>
                      <div className="d-flex gap-2 text-muted" style={{fontSize:'12px'}}>
                        <span>📅 {s.day}</span>
                      </div>
                    </div>
                    <div className="card-footer bg-primary-subtle border-0 text-center rounded-bottom-4 py-2">
                      <small className="fw-bold text-primary">Kelola Kelas Ini →</small>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="row g-4">
          {loading ? (
            <div className="col-12 text-center text-muted">Memuat materi...</div>
          ) : materials.length === 0 ? (
            <div className="col-12 text-center text-muted py-5">
              <FileText size={48} className="mb-3 opacity-50" />
              <h5>Belum ada materi</h5>
              <p>Klik "Tambah Materi" untuk menambahkan konten.</p>
            </div>
          ) : (
            materials.map((m) => {
              const typeInfo = contentTypeLabel(m);
              return (
                <div className="col-md-6 col-lg-4" key={m.id}>
                  <div className="card shadow-sm border-0 h-100 rounded-4">
                    <div className="card-body p-4">
                      <div className="d-flex align-items-center mb-3">
                        <div className="bg-primary-subtle p-3 rounded-circle me-3">
                          {m.content_type === 'html' || m.content ? <Code size={24} className="text-success" /> : <FileText size={24} className="text-primary" />}
                        </div>
                        <div>
                          <h5 className="fw-bold mb-0">{m.title}</h5>
                          <p className="text-muted small mb-0">
                            {new Date(m.created_at).toLocaleDateString('id-ID')}
                          </p>
                        </div>
                      </div>
                      <span className={`badge ${typeInfo.color} mb-2`}>{typeInfo.label}</span>
                      <p className="text-muted small">{m.description}</p>
                    </div>
                    <div className="card-footer bg-light border-0 p-3 pt-0 d-flex flex-column gap-2">
                      {m.content_type === 'html' || m.content ? (
                        <button onClick={() => setViewingMaterial(m)} className="btn btn-success w-100 btn-sm fw-bold mb-0">
                          <Code size={16} className="me-2 text-white" /> Buka Pratinjau
                        </button>
                      ) : (
                        <a href={m.file_url} target="_blank" rel="noreferrer" className="btn btn-outline-primary w-100 btn-sm fw-bold mb-0">
                          🔗 Buka Lampiran
                        </a>
                      )}
                      <div className="d-flex gap-2">
                         <button className="btn btn-sm btn-outline-secondary w-50 fw-bold" onClick={() => openEditModal(m)}>Edit</button>
                         <button className="btn btn-sm btn-outline-danger w-50 fw-bold" onClick={() => handleDelete(m.id)}>Hapus</button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {showModal && (
        <>
          <div className="modal-backdrop fade show"></div>
          <div className="modal fade show d-block" tabIndex="-1">
            <div className="modal-dialog modal-dialog-centered modal-xl">
              <div className="modal-content border-0 shadow">
                <div className="modal-header border-bottom-0 pb-0">
                  <h5 className="modal-title fw-bold">{editMode ? 'Edit Materi' : 'Tambah Materi Baru'}</h5>
                  <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
                </div>
                <div className="modal-body">
                  <form onSubmit={handleSubmit}>
                    <div className="mb-3">
                      <label className="form-label text-muted small fw-bold">Judul Materi</label>
                      <input type="text" className="form-control" required
                             value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                    </div>
                    <div className="mb-3">
                      <label className="form-label text-muted small fw-bold">Deskripsi Singkat</label>
                      <input type="text" className="form-control"
                             value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                    </div>

                    {/* Content Type Tabs */}
                    <div className="mb-3">
                      <label className="form-label text-muted small fw-bold">Tipe Konten</label>
                      <div className="d-flex gap-2 mb-3">
                        <button type="button"
                          className={`btn btn-sm ${contentMode === 'link' ? 'btn-primary' : 'btn-outline-secondary'}`}
                          onClick={() => setContentMode('link')}>
                          <LinkIcon size={14} className="me-1" /> Link / File URL
                        </button>
                        <button type="button"
                          className={`btn btn-sm ${contentMode === 'html' ? 'btn-success' : 'btn-outline-secondary'}`}
                          onClick={() => setContentMode('html')}>
                          <Code size={14} className="me-1" /> Konten HTML
                        </button>
                      </div>

                      {contentMode === 'link' ? (
                        <div>
                          <label className="form-label text-muted small fw-bold">URL / Link File</label>
                          <input type="url" className="form-control" placeholder="https://..."
                                 value={formData.file_url} onChange={e => setFormData({...formData, file_url: e.target.value})} />
                          <small className="text-muted">Contoh: link Google Drive, YouTube, PDF online, dll.</small>
                        </div>
                      ) : (
                        <div>
                          <label className="form-label text-muted small fw-bold d-flex justify-content-between">
                            <span>Konten HTML (Paste HTML penuh di sini)</span>
                            <span className="text-success small">Mendukung Tailwind CSS, Reveal.js, dll.</span>
                          </label>
                          <textarea
                            className="form-control font-monospace"
                            rows="15"
                            required={contentMode === 'html'}
                            placeholder={`<!DOCTYPE html>\n<html lang="id">\n<head>...</head>\n<body>...\nPaste HTML presentasi Anda di sini...\n</body>\n</html>`}
                            value={formData.content}
                            onChange={e => setFormData({...formData, content: e.target.value})}
                            style={{ fontSize: '13px', background: '#1e2736', color: '#a8c0dd', borderColor: '#334155' }}
                          />
                          <small className="text-muted">💡 Paste HTML apapun termasuk slide presentasi, artikel, atau halaman interaktif.</small>
                        </div>
                      )}
                    </div>
                    
                    <div className="d-flex justify-content-end gap-2 mt-4">
                      <button type="button" className="btn btn-light" onClick={() => setShowModal(false)}>Batal</button>
                      <button type="submit" className="btn btn-primary px-4">{editMode ? 'Simpan Perubahan' : 'Terbitkan Materi'}</button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {viewingMaterial && (
        <>
          <div className="modal-backdrop fade show" style={{ zIndex: 1050 }}></div>
          <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex: 1055 }}>
            <div className="modal-dialog modal-fullscreen">
              <div className="modal-content border-0">
                <div className="modal-header bg-dark text-white border-0 py-2">
                  <h6 className="modal-title fw-bold mb-0"><Code size={16} className="me-2 mb-1 text-success" />{viewingMaterial.title}</h6>
                  <button type="button" className="btn btn-sm btn-outline-light" onClick={() => setViewingMaterial(null)}>
                    <X size={16} className="me-1" /> Tutup
                  </button>
                </div>
                <div className="modal-body p-0" style={{ height: 'calc(100vh - 56px)' }}>
                  <iframe srcDoc={viewingMaterial.content} title={viewingMaterial.title}
                    style={{ width: '100%', height: '100%', border: 'none' }}
                    sandbox="allow-scripts allow-same-origin allow-popups" />
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
