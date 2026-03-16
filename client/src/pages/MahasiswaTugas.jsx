import React, { useState, useEffect, useRef } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { PenTool, UploadCloud, CheckCircle, XCircle, Clock, ArrowLeft, FileText, Trash2, DownloadCloud } from 'lucide-react';

export default function MahasiswaTugas() {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState([]);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  
  const [assignments, setAssignments] = useState([]);
  const [mySubmissions, setMySubmissions] = useState({}); // map assignment_id -> submission
  const [loading, setLoading] = useState(false);

  // For file submission view/edit
  const [submittingFor, setSubmittingFor] = useState(null); 
  const [selectedFile, setSelectedFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);
  const fileInputRef = useRef();
  useEffect(() => {
    const fetchSchedules = async () => {
      try {
        const res = await api.get('/schedules');
        setSchedules(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchSchedules();
  }, []);

  const loadAssignmentsAndSubmissions = async () => {
    if (!selectedSchedule) return;
    setLoading(true);
    try {
      // Fetch assignments
      const res = await api.get(`/assignments/${selectedSchedule.id}`);
      const assignData = res.data;
      setAssignments(assignData);

      // Fetch submissions for all assignments to find student's own work
      const submissionsMap = {};
      for (const a of assignData) {
        try {
          const subRes = await api.get(`/submissions/${a.id}`);
          // Find submission belonging to this user
          const mySub = subRes.data.find(s => s.mahasiswa_id === user.id);
          if (mySub) {
            submissionsMap[a.id] = mySub;
          }
        } catch (e) {
          console.error("Failed fetching submission for", a.id, e);
        }
      }
      setMySubmissions(submissionsMap);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssignmentsAndSubmissions();
  }, [selectedSchedule, user.id]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      alert('Maaf, hanya file berformat PDF yang diperbolehkan.');
      e.target.value = '';
      return;
    }
    setSelectedFile(file);
  };

  const handleSubmitTugas = async (e) => {
    e.preventDefault();
    if (!selectedFile || !submittingFor) return;

    setSubmitting(true);
    try {
      // Simulate base64 reading and save
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const fileData = ev.target.result; // Store actual base64 data for viewing
        
        await api.post('/submissions', {
          assignment_id: submittingFor.id,
          file_url: selectedFile.name,
          file_data: fileData
        });

        setSubmitResult({ success: true, message: `File "${selectedFile.name}" berhasil ${mySubmissions[submittingFor.id] ? 'diperbarui' : 'dikumpulkan'}!` });
        setSelectedFile(null);
        setSubmitting(false);
        // Refresh local data
        loadAssignmentsAndSubmissions();
      };
      reader.readAsDataURL(selectedFile);
    } catch (err) {
      setSubmitResult({ success: false, message: 'Gagal mengumpulkan tugas. Coba lagi.' });
      setSubmitting(false);
    }
  };

  const handleDeleteTugas = async (assignmentId) => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus tugas yang sudah dikumpulkan?")) return;
    
    try {
      await api.delete(`/submissions/${assignmentId}`);
      // Refresh local data
      loadAssignmentsAndSubmissions();
      alert("Tugas berhasil dihapus.");
    } catch (err) {
      console.error(err);
      alert("Gagal menghapus tugas.");
    }
  };

  const handleViewFile = (submission) => {
    if (!submission.file_data || !submission.file_data.startsWith('data:')) {
      alert("File PDF lama atau tidak valid dan tidak dapat dibuka.");
      return;
    }
    
    try {
      // Convert base64 to blob to bypass data URI navigation blocking
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
      alert("Gagal membuka file PDF.");
    }
  };

  const openSubmit = (assignment) => {
    setSubmittingFor(assignment);
    setSelectedFile(null);
    setSubmitResult(null);
  };

  const getDeadlineStatus = (deadline) => {
    const now = new Date();
    const dl = new Date(deadline);
    const diffHours = (dl - now) / (1000 * 60 * 60);
    if (diffHours < 0) return { label: 'Ditutup', color: 'danger', active: false };
    if (diffHours < 24) return { label: 'Segera Berakhir', color: 'warning', active: true };
    return { label: 'Berlangsung', color: 'success', active: true };
  };

  return (
    <div className="animate-fade-in">
      <div className="d-flex align-items-center gap-3 mb-4">
        {selectedSchedule && (
          <button className="btn btn-sm btn-outline-secondary" onClick={() => { setSelectedSchedule(null); setAssignments([]); setMySubmissions({}); }}>
            <ArrowLeft size={16} />
          </button>
        )}
        <div>
          <h3 className="fw-bold mb-0">Tugas Mahasiswa</h3>
          {selectedSchedule && <small className="text-muted">{selectedSchedule.course_name} — {selectedSchedule.class_name}</small>}
        </div>
      </div>
      
      {!selectedSchedule ? (
        // --- CARD-BASED SCHEDULE SELECTION ---
        <>
          <p className="text-muted mb-4">Pilih matakuliah untuk melihat daftar tugas:</p>
          {schedules.length === 0 ? (
            <div className="text-center text-muted py-5">
              <PenTool size={48} className="mb-3 opacity-50" />
              <h5>Belum ada jadwal</h5>
              <p>Anda belum terdaftar di kelas manapun.</p>
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
                    onClick={() => setSelectedSchedule(s)}
                  >
                    <div className="card-body p-4">
                      <div className="d-flex align-items-center mb-3">
                        <div className="bg-warning-subtle p-3 rounded-3 me-3">
                          <PenTool size={22} className="text-warning" />
                        </div>
                        <span className="badge bg-warning-subtle text-warning border border-warning-subtle">{s.course_code}</span>
                      </div>
                      <h5 className="fw-bold mb-1">{s.course_name}</h5>
                      <p className="text-muted small mb-2">{s.class_name}</p>
                      <div className="d-flex gap-2 text-muted" style={{fontSize:'12px'}}>
                        <span>🎓 {s.dosen_name}</span>
                        <span>•</span>
                        <span>📅 {s.day}</span>
                      </div>
                    </div>
                    <div className="card-footer bg-warning-subtle border-0 text-center rounded-bottom-4 py-2">
                      <small className="fw-bold text-warning">Klik untuk melihat tugas →</small>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        // --- ASSIGNMENT LIST ---
        <div className="row g-4">
          {loading ? (
            <div className="col-12 text-center text-muted">Memuat tugas...</div>
          ) : assignments.length === 0 ? (
            <div className="col-12 text-center text-muted py-5">
              <PenTool size={48} className="mb-3 opacity-50" />
              <h5>Belum ada tugas</h5>
              <p>Dosen belum memberikan tugas untuk kelas ini.</p>
            </div>
          ) : (
            assignments.map((a) => {
              const status = getDeadlineStatus(a.deadline);
              const submission = mySubmissions[a.id];
              const isSubmitted = !!submission;
              
              return (
                <div className="col-md-6 col-lg-4" key={a.id}>
                  <div className={`card shadow-sm border-0 h-100 rounded-4 border-top border-3 border-${isSubmitted ? 'primary' : status.color}`}>
                    <div className="card-body p-4 pb-2">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <h5 className="fw-bold mb-1">{a.title}</h5>
                        {isSubmitted ? (
                          <span className="badge bg-primary-subtle text-primary border border-primary-subtle">
                            <CheckCircle size={12} className="me-1 mb-1" /> Dikumpulkan
                          </span>
                        ) : (
                          <span className={`badge bg-${status.color}-subtle text-${status.color} border border-${status.color}-subtle`}>
                            {status.label}
                          </span>
                        )}
                      </div>
                      <p className="text-muted small mb-1 d-flex align-items-center gap-1">
                        <Clock size={13} /> Batas: {new Date(a.deadline).toLocaleString('id-ID')}
                      </p>
                      <p className="text-muted small mt-3 border-bottom pb-3 mb-3">{a.description}</p>
                      
                      {/* Submission Status UI */}
                      {isSubmitted && (
                        <div className="bg-light p-3 rounded-3 mb-2 border">
                          <p className="fw-bold small mb-1">File Terkirim:</p>
                          <div 
                            className="d-flex align-items-center gap-2 text-primary small cursor-pointer" 
                            style={{ cursor: 'pointer' }}
                            onClick={() => handleViewFile(submission)}
                            title="Klik untuk melihat file"
                          >
                            <FileText size={16} />
                            <span className="text-truncate text-decoration-underline fw-bold">{submission.file_url}</span>
                          </div>
                          <p className="text-muted mb-0 mt-2" style={{fontSize: '11px'}}>
                            Waktu kumpul: {new Date(submission.submitted_at).toLocaleString('id-ID')}
                          </p>
                        </div>
                      )}
                      
                    </div>
                    <div className="card-footer bg-white border-0 p-3 pt-0 rounded-bottom-4">
                      {isSubmitted ? (
                        <div className="d-flex gap-2">
                           {status.active && (
                             <>
                               <button 
                                 onClick={() => openSubmit(a)} 
                                 className="btn btn-outline-primary flex-grow-1 btn-sm fw-bold"
                               >
                                 <UploadCloud size={14} className="me-1" /> Edit 
                               </button>
                               <button 
                                 onClick={() => handleDeleteTugas(a.id)} 
                                 className="btn btn-outline-danger flex-grow-1 btn-sm fw-bold"
                               >
                                 <Trash2 size={14} className="me-1" /> Hapus
                               </button>
                             </>
                           )}
                           {!status.active && (
                             <button className="btn btn-secondary w-100 btn-sm fw-bold" disabled>Selesai (Ditutup)</button>
                           )}
                        </div>
                      ) : (
                        status.active ? (
                          <button
                            onClick={() => openSubmit(a)}
                            className="btn btn-primary w-100 btn-sm fw-bold d-flex justify-content-center align-items-center gap-2"
                          >
                            <UploadCloud size={16} /> Kumpulkan Tugas
                          </button>
                        ) : (
                          <button className="btn btn-secondary w-100 btn-sm fw-bold" disabled>Lewat Tenggat Waktu</button>
                        )
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* SUBMISSION MODAL */}
      {submittingFor && (
        <>
          <div className="modal-backdrop fade show"></div>
          <div className="modal fade show d-block" tabIndex="-1">
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content border-0 shadow">
                <div className="modal-header border-0 pb-0">
                  <div>
                    <h5 className="modal-title fw-bold mb-0">{mySubmissions[submittingFor.id] ? 'Edit Tugas' : 'Kumpulkan Tugas'}</h5>
                    <small className="text-muted">{submittingFor.title}</small>
                  </div>
                  <button type="button" className="btn-close" onClick={() => setSubmittingFor(null)}></button>
                </div>
                <div className="modal-body">
                  {submitResult ? (
                    <div className={`text-center py-4`}>
                      {submitResult.success 
                        ? <CheckCircle size={56} className="text-success mb-3" />
                        : <XCircle size={56} className="text-danger mb-3" />
                      }
                      <h5>{submitResult.success ? 'Berhasil!' : 'Gagal!'}</h5>
                      <p className="text-muted">{submitResult.message}</p>
                      <button className="btn btn-primary mt-2" onClick={() => setSubmittingFor(null)}>Tutup</button>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmitTugas}>
                      <div className="mb-4">
                        <div className="alert alert-warning py-2 small mb-3">
                          ⏰ <b>Batas Kumpul:</b> {new Date(submittingFor.deadline).toLocaleString('id-ID')}
                        </div>
                        
                        {mySubmissions[submittingFor.id] && (
                          <div className="alert alert-info py-2 small">
                            ℹ️ Mengunggah file baru akan menimpa file **{mySubmissions[submittingFor.id].file_url}** yang sudah Anda kumpulkan sebelumnya.
                          </div>
                        )}
                      </div>

                      <div className="mb-4">
                        <label className="form-label fw-bold">Upload File Tugas</label>
                        <div
                          className="border-2 border rounded-3 p-4 text-center"
                          style={{ borderStyle: 'dashed', cursor: 'pointer', borderColor: selectedFile ? '#0d6efd' : '#dee2e6' }}
                          onClick={() => fileInputRef.current.click()}
                        >
                          <input
                            type="file"
                            ref={fileInputRef}
                            className="d-none"
                            onChange={handleFileChange}
                            accept=".pdf,application/pdf"
                          />
                          {selectedFile ? (
                            <div className="text-primary">
                              <CheckCircle size={32} className="mb-2" />
                              <p className="fw-bold mb-0 text-truncate px-3">{selectedFile.name}</p>
                              <small className="text-muted">{(selectedFile.size / 1024).toFixed(1)} KB — Klik untuk ganti</small>
                            </div>
                          ) : (
                            <div className="text-muted">
                              <UploadCloud size={32} className="mb-2" />
                              <p className="mb-0">Klik atau drag file PDF ke sini</p>
                              <small className="text-danger fw-bold">Hanya mendukung format PDF</small>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="d-flex gap-2 justify-content-end">
                        <button type="button" className="btn btn-light" onClick={() => setSubmittingFor(null)}>Batal</button>
                        <button type="submit" className="btn btn-primary px-4" disabled={!selectedFile || submitting}>
                          {submitting ? 'Mengupload...' : (mySubmissions[submittingFor.id] ? 'Ganti File' : '📤 Kumpulkan')}
                        </button>
                      </div>
                    </form>
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
