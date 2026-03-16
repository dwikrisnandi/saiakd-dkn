import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { BookOpen, ArrowLeft, FileText, Eye } from 'lucide-react';

export default function MahasiswaRPS() {
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [rps, setRps] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const res = await api.get('/schedules');
        const unique = [];
        const map = new Map();
        for (const item of res.data) {
          if (!map.has(item.course_id)) {
            map.set(item.course_id, true);
            unique.push({ course_id: item.course_id, course_code: item.course_code, course_name: item.course_name, dosen_name: item.dosen_name });
          }
        }
        setCourses(unique);
      } catch (err) {
        console.error(err);
      }
    };
    fetchCourses();
  }, []);

  useEffect(() => {
    if (!selectedCourse) return;
    const fetchRPS = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/rps/${selectedCourse.course_id}`);
        setRps(res.data.length > 0 ? res.data[0] : null);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchRPS();
  }, [selectedCourse]);

  const handleViewPDF = (rpsDoc) => {
    if (!rpsDoc?.file_data || !rpsDoc.file_data.startsWith('data:')) {
      alert('File PDF tidak tersedia.');
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

  return (
    <div className="animate-fade-in">
      <div className="d-flex align-items-center gap-3 mb-4">
        {selectedCourse && (
          <button className="btn btn-sm btn-outline-secondary" onClick={() => { setSelectedCourse(null); setRps(null); }}>
            <ArrowLeft size={16} />
          </button>
        )}
        <div>
          <h3 className="fw-bold mb-0">Rencana Pembelajaran Semester (RPS)</h3>
          {selectedCourse && <small className="text-muted">{selectedCourse.course_name}</small>}
        </div>
      </div>

      {!selectedCourse ? (
        <>
          <p className="text-muted mb-4">Pilih matakuliah untuk melihat RPS yang diunggah oleh Dosen:</p>
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
                      <div className="bg-info-subtle p-3 rounded-3 me-3">
                        <BookOpen size={22} className="text-info" />
                      </div>
                      <span className="badge bg-info-subtle text-info border border-info-subtle">{c.course_code}</span>
                    </div>
                    <h5 className="fw-bold mb-1">{c.course_name}</h5>
                    <p className="text-muted small mb-0">🎓 {c.dosen_name}</p>
                  </div>
                  <div className="card-footer bg-info-subtle border-0 text-center rounded-bottom-4 py-2">
                    <small className="fw-bold text-info">Lihat RPS →</small>
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
              <BookOpen size={52} className="text-muted mb-3 opacity-50" />
              <h5 className="fw-bold">RPS Belum Tersedia</h5>
              <p className="text-muted mb-0">Dosen belum mengunggah dokumen RPS untuk matakuliah ini.</p>
            </div>
          ) : (
            <div className="p-4">
              <div className="d-flex align-items-start gap-4 p-4 bg-info-subtle rounded-4">
                <div className="bg-white p-3 rounded-3 shadow-sm">
                  <FileText size={36} className="text-danger" />
                </div>
                <div className="flex-grow-1">
                  <p className="text-info fw-bold small mb-1">📄 FILE PDF — RPS Pertemuan 1 hingga 16</p>
                  <h4 className="fw-bold mb-1">{rps.title}</h4>
                  <p className="text-muted small mb-3">
                    Diunggah: {new Date(rps.uploaded_at).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                  <button className="btn btn-info text-white rounded-pill px-4 d-inline-flex align-items-center gap-2" onClick={() => handleViewPDF(rps)}>
                    <Eye size={14} /> Buka Dokumen RPS
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
