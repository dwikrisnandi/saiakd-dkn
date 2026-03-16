import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { PenTool, Plus, Users, DownloadCloud, FileText, XCircle, CheckCircle, Eye, ArrowLeft } from 'lucide-react';

export default function DosenTugas() {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState([]);
  const [selectedSchedule, setSelectedSchedule] = useState('');
  
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [formData, setFormData] = useState({ title: '', description: '', deadline: '' });

  // For viewing submissions
  const [viewingAssignment, setViewingAssignment] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [gradingValues, setGradingValues] = useState({});
  
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
    
    const fetchAssignments = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/assignments/${selectedSchedule}`);
        setAssignments(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAssignments();
  }, [selectedSchedule]);

  const openModal = () => {
    setEditMode(false);
    setEditingId(null);
    setFormData({ title: '', description: '', deadline: '' });
    setShowModal(true);
  };

  const openEditModal = (a) => {
    setEditMode(true);
    setEditingId(a.id);
    let isoStr = '';
    try {
      const d = new Date(a.deadline);
      isoStr = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    } catch(e) {}
    setFormData({
      title: a.title,
      description: a.description,
      deadline: isoStr
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus tugas ini? Semua file pengumpulan mahasiswa akan ikut terhapus!")) return;
    try {
      await api.delete(`/assignments/${id}`);
      const res = await api.get(`/assignments/${selectedSchedule}`);
      setAssignments(res.data);
    } catch (err) {
      console.error(err);
      alert('Gagal menghapus tugas');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSchedule) return;

    try {
      if (editMode && editingId) {
        await api.put(`/assignments/${editingId}`, {
          title: formData.title,
          description: formData.description,
          deadline: formData.deadline
        });
      } else {
        await api.post('/assignments', {
          schedule_id: parseInt(selectedSchedule),
          ...formData
        });
      }
      setShowModal(false);
      setFormData({ title: '', description: '', deadline: '' });
      // Refresh list
      const res = await api.get(`/assignments/${selectedSchedule}`);
      setAssignments(res.data);
    } catch (err) {
      console.error(err);
      alert('Gagal menyimpan tugas');
    }
  };

  const handleViewSubmissions = async (assignment) => {
    setViewingAssignment(assignment);
    setLoadingSubmissions(true);
    try {
      const res = await api.get(`/submissions/${assignment.id}`);
      setSubmissions(res.data);
      
      const initialGrades = {};
      res.data.forEach(s => {
        initialGrades[s.id] = s.nilai || '';
      });
      setGradingValues(initialGrades);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const handleGradeChange = (subId, value) => {
    setGradingValues(prev => ({...prev, [subId]: value}));
  };

  const handleSaveGrade = async (subId) => {
    try {
      await api.put(`/submissions/${subId}/nilai`, { nilai: gradingValues[subId] });
      alert("Nilai berhasil disimpan!");
      // Update local state to reflect saved grade
      setSubmissions(submissions.map(s => s.id === subId ? { ...s, nilai: gradingValues[subId] } : s));
    } catch (err) {
      console.error("Gagal simpan nilai:", err);
      alert("Gagal menyimpan nilai.");
    }
  };

  const handleViewFile = (submission) => {
    if (!submission.file_data || !submission.file_data.startsWith('data:')) {
      alert("File PDF tertaut kosong atau tidak valid.");
      return;
    }
    
    try {
      const arr = submission.file_data.split(',');
      const mime = arr[0].match(/:(.*?);/)[1];
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while(n--){
          u8arr[n] = bstr.charCodeAt(n);
      }
      const blob = new Blob([u8arr], {type: mime});
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (e) {
      console.error("Failed to open PDF in new tab", e);
      alert("Gagal membuka file PDF mahasiswa.");
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="d-flex align-items-center gap-3 mb-4">
        {selectedSchedule && (
          <button className="btn btn-sm btn-outline-secondary" onClick={() => { setSelectedSchedule(''); setAssignments([]); }}>
             <ArrowLeft size={16} />
          </button>
        )}
        <div className="d-flex justify-content-between align-items-center w-100">
           <div>
             <h3 className="fw-bold mb-0">Kelola Tugas Mahasiswa</h3>
             {selectedSchedule && <small className="text-muted">Kelas yang dipilih</small>}
           </div>
           {selectedSchedule && (
             <button className="btn btn-primary d-flex align-items-center gap-2" onClick={openModal}>
               <Plus size={18} /> Buat Tugas Baru
             </button>
           )}
        </div>
      </div>

      {!selectedSchedule ? (
        <>
          <p className="text-muted mb-4">Pilih matakuliah untuk mengelola tugas:</p>
          {schedules.length === 0 ? (
            <div className="text-center text-muted py-5">
              <PenTool size={48} className="mb-3 opacity-50" />
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
            <div className="col-12 text-center text-muted">Memuat tugas...</div>
          ) : assignments.length === 0 ? (
            <div className="col-12 text-center text-muted py-5">
              <PenTool size={48} className="mb-3 opacity-50" />
              <h5>Belum ada tugas</h5>
              <p>Mulai assign tugas mahasiswa untuk penilaian.</p>
            </div>
          ) : (
            assignments.map((a) => (
              <div className="col-md-6 col-lg-4" key={a.id}>
                <div className="card shadow-sm border-0 h-100 rounded-4">
                  <div className="card-body p-4 pb-0">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                       <h5 className="fw-bold mb-1">{a.title}</h5>
                       {new Date(a.deadline) < new Date() ? (
                         <span className="badge bg-danger">Ditutup</span>
                       ) : (
                         <span className="badge bg-success">Aktif</span>
                       )}
                    </div>
                    <p className="text-muted small fw-bold mb-3 text-danger">Tenggat: {new Date(a.deadline).toLocaleString('id-ID')}</p>
                    <p className="text-muted small mb-4">{a.description}</p>
                  </div>
                  <div className="card-footer bg-light border-top-0 border-0 p-3 mt-auto rounded-bottom-4">
                    <button className="btn btn-outline-primary w-100 btn-sm fw-bold mb-2" onClick={() => handleViewSubmissions(a)}>
                      <Users size={16} className="me-2" /> Lihat Pengumpulan
                    </button>
                    <div className="d-flex gap-2">
                       <button className="btn btn-sm btn-outline-secondary w-50 fw-bold" onClick={() => openEditModal(a)}>Edit</button>
                       <button className="btn btn-sm btn-outline-danger w-50 fw-bold" onClick={() => handleDelete(a.id)}>Hapus</button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {showModal && (
        <>
          <div className="modal-backdrop fade show"></div>
          <div className="modal fade show d-block" tabIndex="-1">
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content border-0 shadow">
                <div className="modal-header border-bottom-0 pb-0">
                  <h5 className="modal-title fw-bold">{editMode ? 'Edit Tugas' : 'Buat Tugas Baru'}</h5>
                  <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
                </div>
                <div className="modal-body">
                  <form onSubmit={handleSubmit}>
                    <div className="mb-3">
                      <label className="form-label text-muted small fw-bold">Judul Tugas</label>
                      <input type="text" className="form-control" required
                             value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                    </div>
                    <div className="mb-3">
                      <label className="form-label text-muted small fw-bold">Instruksi / Penjelasan</label>
                      <textarea className="form-control" rows="4" required
                                value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}></textarea>
                    </div>
                    <div className="mb-3">
                      <label className="form-label text-muted small fw-bold">Batas Waktu (Deadline)</label>
                      <input type="datetime-local" className="form-control" required
                             value={formData.deadline} onChange={e => setFormData({...formData, deadline: e.target.value})} />
                    </div>
                    
                    <div className="d-flex justify-content-end gap-2 mt-4">
                      <button type="button" className="btn btn-light" onClick={() => setShowModal(false)}>Batal</button>
                      <button type="submit" className="btn btn-primary px-4">{editMode ? 'Simpan Perubahan' : 'Terbitkan Tugas'}</button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* SUBMISSIONS LIST MODAL */}
      {viewingAssignment && (
        <>
          <div className="modal-backdrop fade show"></div>
          <div className="modal fade show d-block" tabIndex="-1">
            <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
              <div className="modal-content border-0 shadow">
                <div className="modal-header border-bottom-0 pb-0">
                  <div>
                    <h5 className="modal-title fw-bold mb-0">Pengumpulan Tugas</h5>
                    <small className="text-muted">{viewingAssignment.title}</small>
                  </div>
                  <button type="button" className="btn-close" onClick={() => setViewingAssignment(null)}></button>
                </div>
                <div className="modal-body">
                  {loadingSubmissions ? (
                    <div className="text-center text-muted py-5">Memuat data pengumpulan...</div>
                  ) : submissions.length === 0 ? (
                    <div className="text-center text-muted py-4">
                      <FileText size={48} className="mb-3 opacity-50" />
                      <h5>Belum Ada yang Mengumpulkan</h5>
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-hover align-middle">
                        <thead className="table-light">
                          <tr>
                            <th>NIM</th>
                            <th>Nama Mahasiswa</th>
                            <th>Waktu Kumpul</th>
                            <th>File Tugas</th>
                            <th>Nilai</th>
                          </tr>
                        </thead>
                        <tbody>
                          {submissions.map((s) => (
                            <tr key={s.id}>
                              <td className="fw-bold">{s.mahasiswa_nim}</td>
                              <td>{s.mahasiswa_name}</td>
                              <td>
                                <small className={new Date(s.submitted_at) > new Date(viewingAssignment.deadline) ? 'text-danger fw-bold' : 'text-success'}>
                                  {new Date(s.submitted_at).toLocaleString('id-ID')}
                                </small>
                              </td>
                              <td>
                                <button 
                                  className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1"
                                  onClick={() => handleViewFile(s)}
                                >
                                  <Eye size={14} /> Lihat File
                                </button>
                              </td>
                              <td>
                                <div className="d-flex align-items-center gap-2">
                                  <input 
                                    type="number" 
                                    className="form-control form-control-sm text-center" 
                                    style={{ width: '70px' }}
                                    min="0" max="100"
                                    placeholder="0-100"
                                    value={gradingValues[s.id] !== undefined ? gradingValues[s.id] : ''}
                                    onChange={(e) => handleGradeChange(s.id, e.target.value)}
                                  />
                                  <button 
                                    className="btn btn-sm btn-success fw-bold"
                                    onClick={() => handleSaveGrade(s.id)}
                                    title="Simpan Nilai"
                                  >
                                    <CheckCircle size={14} /> Simpan
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
