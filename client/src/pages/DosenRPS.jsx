import React, { useState, useEffect, useRef } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { BookOpen, ArrowLeft, FileText, Trash2, RefreshCw, UploadCloud, Eye } from 'lucide-react';

export default function DosenRPS() {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  
  const [rps, setRps] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const [formTitle, setFormTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef();

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const res = await api.get('/schedules');
        const mySchedules = res.data.filter(s => s.dosen_id === user.id);
        const unique = [];
        const map = new Map();
        for (const item of mySchedules) {
          if (!map.has(item.course_id)) {
            map.set(item.course_id, true);
            unique.push({ course_id: item.course_id, course_code: item.course_code, course_name: item.course_name });
          }
        }
        setCourses(unique);
      } catch (err) {
        console.error(err);
      }
    };
    fetchCourses();
  }, [user.id]);

  const fetchRPS = async (course) => {
    setLoading(true);
    try {
      const res = await api.get(`/rps/${course.course_id}`);
      setRps(res.data.length > 0 ? res.data[0] : null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedCourse) return;
    fetchRPS(selectedCourse);
  }, [selectedCourse]);

  const openModal = () => {
    setFormTitle(rps?.title || `RPS ${selectedCourse?.course_name}`);
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setShowModal(true);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf')) {
      alert('Hanya file PDF yang diizinkan.');
      e.target.value = '';
      return;
    }
    setSelectedFile(file);
  };

  const handleDelete = async () => {
    if (!rps) return;
    if (!window.confirm("Hapus RPS ini? Mahasiswa tidak akan dapat mengaksesnya.")) return;
    try {
      await api.delete(`/rps/${rps.id}`);
      setRps(null);
    } catch (err) {
      alert('Gagal menghapus RPS');
    }
  };

  const handleViewPDF = (rpsDoc) => {
    if (!rpsDoc?.file_data || !rpsDoc.file_data.startsWith('data:')) {
      alert('File PDF tidak valid atau tidak tersedia.');
      return;
    }
    const arr = rpsDoc.file_data.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) u8arr[n] = bstr.charCodeAt(n);
    const blob = new Blob([u8arr], { type: mime });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile || !selectedCourse) return;

    setUploading(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        if (rps) await api.delete(`/rps/${rps.id}`);
        await api.post('/rps', {
          course_id: selectedCourse.course_id,
          title: formTitle,
          file_data: ev.target.result
        });
        setShowModal(false);
        fetchRPS(selectedCourse);
      } catch (err) {
        alert('Gagal mengunggah RPS. Coba lagi.');
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(selectedFile);
  };

  return (
    <div className="animate-fade-in">
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div className="d-flex align-items-center gap-3">
          {selectedCourse && (
            <button className="btn btn-sm btn-outline-secondary" onClick={() => { setSelectedCourse(null); setRps(null); }}>
              <ArrowLeft size={16} />
            </button>
          )}
          <div>
            <h3 className="fw-bold mb-0">Kelola RPS Perkuliahan</h3>
            {selectedCourse && <small className="text-muted">{selectedCourse.course_name}</small>}
          </div>
        </div>
      </div>

      {!selectedCourse ? (
        <>
          <p className="text-muted mb-4">Pilih matakuliah untuk mengelola Rencana Pembelajaran Semester (1 file PDF per matakuliah):</p>
          <div className="row g-3">
            {courses.map(c => (
              <div className="col-md-6 col-lg-4" key={c.course_id}>
                <div
                  className="card shadow-sm border-0 rounded-4 h-100"
                  style={{ cursor: 'pointer', transition: 'transform 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                  onClick={() => setSelectedCourse(c)}
                >
                  <div className="card-body p-4">
                    <div className="d-flex align-items-center mb-3">
                      <div className="bg-primary-subtle p-3 rounded-3 me-3">
                        <BookOpen size={22} className="text-primary" />
                      </div>
                      <span className="badge bg-primary-subtle text-primary border border-primary-subtle">{c.course_code}</span>
                    </div>
                    <h5 className="fw-bold mb-0">{c.course_name}</h5>
                  </div>
                  <div className="card-footer bg-primary-subtle border-0 text-center rounded-bottom-4 py-2">
                    <small className="fw-bold text-primary">Kelola RPS →</small>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="card shadow-sm border-0 rounded-4">
          {loading ? (
            <div className="text-center py-5 text-muted">Memuat RPS...</div>
          ) : !rps ? (
            <div className="text-center py-5">
              <UploadCloud size={52} className="text-muted mb-3 opacity-50" />
              <h5 className="fw-bold">RPS Belum Diunggah</h5>
              <p className="text-muted mb-4">Upload 1 file PDF RPS yang mencakup seluruh 16 pertemuan.</p>
              <button className="btn btn-primary rounded-pill px-4" onClick={openModal}>
                <UploadCloud size={18} className="me-2" /> Upload PDF RPS
              </button>
            </div>
          ) : (
            <div className="p-4">
              <div className="d-flex align-items-start gap-4 p-4 bg-primary-subtle rounded-4">
                <div className="bg-white p-3 rounded-3 shadow-sm">
                  <FileText size={36} className="text-danger" />
                </div>
                <div className="flex-grow-1">
                  <p className="text-primary fw-bold small mb-1">📄 FILE PDF — RPS Pertemuan 1 hingga 16</p>
                  <h4 className="fw-bold mb-1">{rps.title}</h4>
                  <p className="text-muted small mb-3">
                    Diunggah: {new Date(rps.uploaded_at).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                  <div className="d-flex gap-2 flex-wrap">
                    <button className="btn btn-primary rounded-pill px-4 d-inline-flex align-items-center gap-2" onClick={() => handleViewPDF(rps)}>
                      <Eye size={14} /> Lihat PDF
                    </button>
                    <button className="btn btn-outline-secondary rounded-pill px-3 d-inline-flex align-items-center gap-2" onClick={openModal}>
                      <RefreshCw size={14} /> Ganti PDF
                    </button>
                    <button className="btn btn-outline-danger rounded-pill px-3 d-inline-flex align-items-center gap-2" onClick={handleDelete}>
                      <Trash2 size={14} /> Hapus
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <>
          <div className="modal-backdrop fade show"></div>
          <div className="modal fade show d-block" tabIndex="-1">
            <div className="modal-dialog modal-dialog-centered">
              <form onSubmit={handleSubmit} className="modal-content border-0 shadow-lg rounded-4">
                <div className="modal-header border-0 pb-0">
                  <h5 className="modal-title fw-bold">{rps ? 'Ganti PDF RPS' : 'Upload PDF RPS'}</h5>
                  <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
                </div>
                <div className="modal-body">
                  <div className="alert border-0 rounded-3 p-3 mb-3 d-flex align-items-center gap-2" style={{background:'#e8f4fd'}}>
                    <BookOpen size={16} className="text-info flex-shrink-0" />
                    <small className="text-info">Upload 1 file PDF yang sudah mencakup <strong>seluruh 16 pertemuan</strong>.</small>
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Judul Dokumen</label>
                    <input type="text" className="form-control" value={formTitle} onChange={e => setFormTitle(e.target.value)} required placeholder={`Misal: RPS ${selectedCourse?.course_name}`} />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">File PDF RPS</label>
                    <input
                      type="file"
                      accept=".pdf,application/pdf"
                      className="form-control"
                      onChange={handleFileChange}
                      ref={fileInputRef}
                      required
                    />
                    {selectedFile && (
                      <div className="mt-2 d-flex align-items-center gap-2 text-success">
                        <FileText size={14} /> <small className="fw-bold">{selectedFile.name}</small>
                      </div>
                    )}
                  </div>
                </div>
                <div className="modal-footer border-0 pt-0">
                  <button type="button" className="btn btn-light rounded-pill px-4" onClick={() => setShowModal(false)} disabled={uploading}>Batal</button>
                  <button type="submit" className="btn btn-primary rounded-pill px-4" disabled={uploading || !selectedFile}>
                    {uploading ? <><span className="spinner-border spinner-border-sm me-2"></span>Mengunggah...</> : (rps ? 'Ganti PDF' : 'Upload PDF')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
