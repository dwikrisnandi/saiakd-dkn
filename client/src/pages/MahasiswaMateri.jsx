import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { FileText, Code, X, ExternalLink, ArrowLeft } from 'lucide-react';

export default function MahasiswaMateri() {
  const [schedules, setSchedules] = useState([]);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewingMaterial, setViewingMaterial] = useState(null);

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

  useEffect(() => {
    if (!selectedSchedule) return;
    const fetchMaterials = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/materials/${selectedSchedule.id}`);
        setMaterials(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchMaterials();
  }, [selectedSchedule]);

  const isHtmlContent = (m) => m.content_type === 'html' || (m.content && m.content.trim().length > 0);

  return (
    <div className="animate-fade-in">
      <div className="d-flex align-items-center gap-3 mb-4">
        {selectedSchedule && (
          <button className="btn btn-sm btn-outline-secondary" onClick={() => { setSelectedSchedule(null); setMaterials([]); }}>
            <ArrowLeft size={16} />
          </button>
        )}
        <div>
          <h3 className="fw-bold mb-0">Materi Perkuliahan</h3>
          {selectedSchedule && <small className="text-muted">{selectedSchedule.course_name} — {selectedSchedule.class_name}</small>}
        </div>
      </div>

      {!selectedSchedule ? (
        <>
          <p className="text-muted mb-4">Pilih matakuliah untuk melihat materi:</p>
          <div className="row g-3">
            {schedules.map(s => (
              <div className="col-md-6 col-lg-4" key={s.id}>
                <div
                  className="card shadow-sm border-0 rounded-4 h-100"
                  style={{ cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                  onClick={() => setSelectedSchedule(s)}
                >
                  <div className="card-body p-4">
                    <div className="d-flex align-items-center mb-3">
                      <div className="bg-primary-subtle p-3 rounded-3 me-3">
                        <FileText size={22} className="text-primary" />
                      </div>
                      <span className="badge bg-primary-subtle text-primary border border-primary-subtle">{s.course_code}</span>
                    </div>
                    <h5 className="fw-bold mb-1">{s.course_name}</h5>
                    <p className="text-muted small mb-2">{s.class_name}</p>
                    <div className="d-flex gap-2 text-muted" style={{fontSize:'12px'}}>
                      <span>🎓 {s.dosen_name}</span>
                      <span>•</span>
                      <span>📅 {s.day}</span>
                    </div>
                  </div>
                  <div className="card-footer bg-primary-subtle border-0 text-center rounded-bottom-4 py-2">
                    <small className="fw-bold text-primary">Klik untuk melihat materi →</small>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="row g-4">
          {loading ? (
            <div className="col-12 text-center text-muted">Memuat materi...</div>
          ) : materials.length === 0 ? (
            <div className="col-12 text-center text-muted py-5">
              <FileText size={48} className="mb-3 opacity-50" />
              <h5>Belum ada materi</h5>
              <p>Dosen belum mengupload materi untuk kelas ini.</p>
            </div>
          ) : (
            materials.map((m) => (
              <div className="col-md-6 col-lg-4" key={m.id}>
                <div className="card shadow-sm border-0 h-100 rounded-4">
                  <div className="card-body p-4">
                    <div className="d-flex align-items-center mb-3">
                      <div className={`p-3 rounded-circle me-3 ${isHtmlContent(m) ? 'bg-success-subtle' : 'bg-primary-subtle'}`}>
                        {isHtmlContent(m) ? <Code size={24} className="text-success" /> : <FileText size={24} className="text-primary" />}
                      </div>
                      <div>
                        <h5 className="fw-bold mb-0">{m.title}</h5>
                        <p className="text-muted small mb-0">{new Date(m.created_at).toLocaleDateString('id-ID')}</p>
                      </div>
                    </div>
                    {isHtmlContent(m)
                      ? <span className="badge bg-success-subtle text-success border mb-2">Konten Interaktif</span>
                      : <span className="badge bg-primary-subtle text-primary border mb-2">Link / File</span>
                    }
                    <p className="text-muted small">{m.description}</p>
                  </div>
                  <div className="card-footer bg-light border-0 p-3 rounded-bottom-4">
                    {isHtmlContent(m) ? (
                      <button onClick={() => setViewingMaterial(m)} className="btn btn-success w-100 btn-sm fw-bold d-flex justify-content-center align-items-center gap-2">
                        <Code size={16} /> Buka Materi
                      </button>
                    ) : (
                      <a href={m.file_url} target="_blank" rel="noreferrer" className="btn btn-outline-primary w-100 btn-sm fw-bold d-flex justify-content-center align-items-center gap-2">
                        <ExternalLink size={16} /> Buka Lampiran
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
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
