import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Plus, Users, Edit2, Trash2 } from 'lucide-react';

export default function AdminKelas() {
  const [classes, setClasses] = useState([]);
  const [mahasiswa, setMahasiswa] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [showAddClassModal, setShowAddClassModal] = useState(false);
  const [showEditClassModal, setShowEditClassModal] = useState(false);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [showViewStudentsModal, setShowViewStudentsModal] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedClassName, setSelectedClassName] = useState('');
  
  const [classForm, setClassForm] = useState({ name: '' });
  const [editClassForm, setEditClassForm] = useState({ id: '', name: '' });
  const [enrollForm, setEnrollForm] = useState({ mahasiswa_ids: [] });
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleRemoveStudent = async (mahasiswaId, mahasiswaName) => {
    if (!window.confirm(`Yakin ingin mengeluarkan ${mahasiswaName} dari kelas ini?`)) return;
    try {
      await api.delete(`/enrollments/${mahasiswaId}`);
      setSuccess(`${mahasiswaName} berhasil dikeluarkan dari kelas.`);
      await fetchData();
    } catch (err) {
      setError('Gagal mengeluarkan mahasiswa dari kelas.');
    }
  };

  const fetchData = async () => {
    try {
      const [classRes, mhsRes, enrollRes] = await Promise.all([
        api.get('/classes'),
        api.get('/users?role=mahasiswa'),
        api.get('/enrollments')
      ]);
      setClasses(classRes.data);
      setMahasiswa(mhsRes.data);
      setEnrollments(enrollRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddClass = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    
    try {
      await api.post('/classes', classForm);
      setShowAddClassModal(false);
      setClassForm({ name: '' });
      setSuccess('Kelas berhasil ditambahkan');
      fetchData();
    } catch (err) {
      setError('Gagal menambah kelas');
    }
  };

  const openEditModal = (cls) => {
    setEditClassForm({ id: cls.id, name: cls.name });
    setShowEditClassModal(true);
    setError(''); setSuccess('');
  };

  const handleEditClass = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    try {
      await api.put(`/classes/${editClassForm.id}`, { name: editClassForm.name });
      setShowEditClassModal(false);
      setSuccess('Kelas berhasil diupdate');
      fetchData();
    } catch (err) {
      setError('Gagal mengupdate kelas');
    }
  };

  const handleDeleteClass = async (id) => {
    if (window.confirm('Yakin ingin menghapus kelas ini beserta semua data mahasiswa di dalamnya?')) {
      setError(''); setSuccess('');
      try {
        await api.delete(`/classes/${id}`);
        setSuccess('Kelas berhasil dihapus');
        fetchData();
      } catch (err) {
        setError('Gagal menghapus kelas');
      }
    }
  };

  const handleEnrollClick = (cls) => {
    setSelectedClassId(cls.id);
    setSelectedClassName(cls.name);
    setEnrollForm({ mahasiswa_ids: [] });
    setShowEnrollModal(true);
    setError(''); setSuccess('');
  };

  const handleViewStudentsClick = (cls) => {
    setSelectedClassId(cls.id);
    setSelectedClassName(cls.name);
    setShowViewStudentsModal(true);
  };

  const handleEnrollSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    
    if (enrollForm.mahasiswa_ids.length === 0) {
      setError('Pilih minimal satu mahasiswa');
      return;
    }

    try {
      const res = await api.post('/enrollments/bulk', {
        class_id: parseInt(selectedClassId),
        mahasiswa_ids: enrollForm.mahasiswa_ids.map(Number)
      });
      setShowEnrollModal(false);
      setSuccess(res.data.message || 'Mahasiswa berhasil didaftarkan ke kelas');
      fetchData(); // Refresh enrollments data
    } catch (err) {
      setError(err.response?.data?.error || 'Gagal mendaftarkan mahasiswa');
    }
  };

  const handleStudentToggle = (mhsId) => {
    setEnrollForm(prev => {
      const isSelected = prev.mahasiswa_ids.includes(mhsId);
      if (isSelected) {
        return { mahasiswa_ids: prev.mahasiswa_ids.filter(id => id !== mhsId) };
      } else {
        return { mahasiswa_ids: [...prev.mahasiswa_ids, mhsId] };
      }
    });
  };

  return (
    <div className="animate-fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3 className="fw-bold mb-0">Manajemen Kelas (Enrollment)</h3>
        <button className="btn btn-primary d-flex align-items-center gap-2" onClick={() => setShowAddClassModal(true)}>
          <Plus size={18} /> Buat Kelas Baru
        </button>
      </div>

      {success && <div className="alert alert-success">{success}</div>}
      
      <div className="card shadow-sm border-0 rounded-4 mb-4">
         <div className="card-body bg-light rounded-4">
            <p className="mb-0 text-muted"><i className="bi bi-info-circle me-2"></i><b>Sistem Kelas:</b> Buat kelas peserta didik (misal: Kelas Reguler A, Kelas Karyawan B). Kemudian tambahkan mahasiswa secara bulk ke dalam kelas tersebut. Jadwal kuliah nantinya akan menghubungkan Kelas, Dosen, dan Matakuliah.</p>
         </div>
      </div>

      <div className="row g-4">
        {loading ? (
          <div className="col-12 text-center text-muted">Memuat data kelas...</div>
        ) : classes.length === 0 ? (
          <div className="col-12 text-center text-muted py-5">
             <div className="bg-light d-inline-block p-4 rounded-circle mb-3"><Users size={32} className="text-secondary" /></div>
             <h5>Belum ada kelas yang dibuat</h5>
          </div>
        ) : (
          classes.map((cls) => {
            const classEnrollments = enrollments.filter(e => e.class_id === cls.id);
            return (
              <div className="col-md-6 col-lg-4" key={cls.id}>
                <div className="card shadow-sm border-0 h-100 rounded-4">
                  <div className="card-body p-4">
                    <div className="d-flex justify-content-between align-items-start mb-3">
                      <span className="badge bg-primary-subtle text-primary border">Group Mahasiswa</span>
                      <div className="d-flex gap-2">
                        <button className="btn btn-sm btn-light text-primary p-1" onClick={() => openEditModal(cls)} title="Edit Kelas">
                          <Edit2 size={16} />
                        </button>
                        <button className="btn btn-sm btn-light text-danger p-1" onClick={() => handleDeleteClass(cls.id)} title="Hapus Kelas">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    <h4 className="fw-bold mb-4">{cls.name}</h4>
                    
                    <div className="d-flex align-items-center gap-2 mb-3">
                       <button 
                         className="btn btn-sm btn-primary flex-grow-1"
                         onClick={() => handleEnrollClick(cls)}
                       >
                         <Plus size={14} className="me-1 mb-1"/> Enrol Mahasiswa
                       </button>
                       <button 
                         className="btn btn-sm btn-outline-primary"
                         onClick={() => handleViewStudentsClick(cls)}
                         title="Lihat Daftar Mahasiswa"
                       >
                         <Users size={14} className="me-1 mb-1"/> 
                         {classEnrollments.length} Peserta
                       </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL: Tambah Kelas */}
      {showAddClassModal && (
        <>
          <div className="modal-backdrop fade show"></div>
          <div className="modal fade show d-block" tabIndex="-1">
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content border-0 shadow">
                <div className="modal-header border-bottom-0 pb-0">
                  <h5 className="modal-title fw-bold">Buat Kelas Baru</h5>
                  <button type="button" className="btn-close" onClick={() => setShowAddClassModal(false)}></button>
                </div>
                <div className="modal-body">
                  {error && <div className="alert alert-danger py-2">{error}</div>}
                  <form onSubmit={handleAddClass}>
                    <div className="mb-3">
                      <label className="form-label text-muted small fw-bold">Nama Kelas</label>
                      <input type="text" className="form-control" required placeholder="Contoh: Kelas TI-A, Kelas Karyawan, dll"
                             value={classForm.name} onChange={e => setClassForm({...classForm, name: e.target.value})} />
                    </div>
                    <div className="d-flex justify-content-end gap-2 mt-4">
                      <button type="button" className="btn btn-light" onClick={() => setShowAddClassModal(false)}>Batal</button>
                      <button type="submit" className="btn btn-primary px-4">Simpan Kelas</button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* MODAL: Edit Kelas */}
      {showEditClassModal && (
        <>
          <div className="modal-backdrop fade show"></div>
          <div className="modal fade show d-block" tabIndex="-1">
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content border-0 shadow">
                <div className="modal-header border-bottom-0 pb-0">
                  <h5 className="modal-title fw-bold">Edit Kelas</h5>
                  <button type="button" className="btn-close" onClick={() => setShowEditClassModal(false)}></button>
                </div>
                <div className="modal-body">
                  {error && <div className="alert alert-danger py-2">{error}</div>}
                  <form onSubmit={handleEditClass}>
                    <div className="mb-3">
                      <label className="form-label text-muted small fw-bold">Nama Kelas</label>
                      <input type="text" className="form-control" required placeholder="Contoh: Kelas TI-A, Kelas Karyawan, dll"
                             value={editClassForm.name} onChange={e => setEditClassForm({...editClassForm, name: e.target.value})} />
                    </div>
                    <div className="d-flex justify-content-end gap-2 mt-4">
                      <button type="button" className="btn btn-light" onClick={() => setShowEditClassModal(false)}>Batal</button>
                      <button type="submit" className="btn btn-primary px-4">Simpan Perubahan</button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* MODAL: Enroll Mahasiswa */}
      {showEnrollModal && (
        <>
          <div className="modal-backdrop fade show"></div>
          <div className="modal fade show d-block" tabIndex="-1">
            <div className="modal-dialog modal-dialog-centered modal-lg">
              <div className="modal-content border-0 shadow">
                <div className="modal-header border-bottom-0 pb-0">
                  <h5 className="modal-title fw-bold">Daftarkan Mahasiswa ke Kelas</h5>
                  <button type="button" className="btn-close" onClick={() => setShowEnrollModal(false)}></button>
                </div>
                <div className="modal-body">
                  {error && <div className="alert alert-danger py-2">{error}</div>}
                  <p className="text-muted small mb-3">Pilih mahasiswa yang akan secara otomatis mendapatkan jadwal dari kelas ini (KRS Kolektif).</p>
                  
                  <div className="border rounded-3" style={{maxHeight: '300px', overflowY: 'auto'}}>
                    <table className="table table-hover mb-0">
                       <thead className="table-light sticky-top">
                          <tr>
                             <th className="px-3" style={{width: '50px'}}>Pilih</th>
                             <th>NIM</th>
                             <th>Nama Mahasiswa</th>
                          </tr>
                       </thead>
                       <tbody>
                          {mahasiswa
                            .filter(mhs => !enrollments.some(e => e.mahasiswa_id === mhs.id))
                            .map(mhs => (
                             <tr key={mhs.id} style={{cursor: 'pointer'}} onClick={() => handleStudentToggle(mhs.id)}>
                                <td className="px-3">
                                   <input type="checkbox" className="form-check-input" 
                                          checked={enrollForm.mahasiswa_ids.includes(mhs.id)} 
                                          onChange={() => handleStudentToggle(mhs.id)} />
                                </td>
                                <td>{mhs.nidn_nim}</td>
                                <td>{mhs.name}</td>
                             </tr>
                          ))}
                          {mahasiswa.filter(mhs => !enrollments.some(e => e.mahasiswa_id === mhs.id)).length === 0 && (
                            <tr>
                              <td colSpan="3" className="text-center py-4 text-muted">Semua mahasiswa yang ada saat ini sudah didaftarkan ke kelas lain.</td>
                            </tr>
                          )}
                       </tbody>
                    </table>
                  </div>

                  <div className="d-flex justify-content-between align-items-center mt-4">
                    <span className="fw-bold">{enrollForm.mahasiswa_ids.length} Mahasiswa terpilih</span>
                    <div className="gap-2 d-flex">
                      <button type="button" className="btn btn-light" onClick={() => setShowEnrollModal(false)}>Batal</button>
                      <button type="button" className="btn btn-primary px-4" onClick={handleEnrollSubmit}>Simpan Peserta</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* MODAL: Lihat Daftar Mahasiswa */}
      {showViewStudentsModal && (
        <>
          <div className="modal-backdrop fade show"></div>
          <div className="modal fade show d-block" tabIndex="-1">
            <div className="modal-dialog modal-dialog-centered modal-lg">
              <div className="modal-content border-0 shadow">
                <div className="modal-header border-bottom-0 pb-0">
                  <h5 className="modal-title fw-bold">Daftar Mahasiswa - {selectedClassName}</h5>
                  <button type="button" className="btn-close" onClick={() => setShowViewStudentsModal(false)}></button>
                </div>
                <div className="modal-body pb-4">
                  <div className="border rounded-3" style={{maxHeight: '400px', overflowY: 'auto'}}>
                    <table className="table table-hover mb-0">
                       <thead className="table-light sticky-top">
                          <tr>
                             <th className="ps-4">No.</th>
                             <th>NIM</th>
                             <th>Nama Mahasiswa</th>
                             <th className="text-end pe-4">Aksi</th>
                          </tr>
                       </thead>
                       <tbody>
                          {enrollments.filter(e => e.class_id === selectedClassId).length === 0 ? (
                            <tr>
                              <td colSpan="4" className="text-center py-4 text-muted">Belum ada mahasiswa di kelas ini.</td>
                            </tr>
                          ) : (
                            enrollments
                              .filter(e => e.class_id === selectedClassId)
                              .map((e, idx) => (
                               <tr key={idx}>
                                  <td className="ps-4 text-muted">{idx + 1}</td>
                                  <td className="fw-semibold text-muted">{e.mahasiswa_nim}</td>
                                  <td className="fw-bold">{e.mahasiswa_name}</td>
                                  <td className="text-end pe-4">
                                    <button
                                      className="btn btn-sm btn-light text-danger"
                                      title="Keluarkan dari kelas"
                                      onClick={() => handleRemoveStudent(e.mahasiswa_id, e.mahasiswa_name)}
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </td>
                               </tr>
                            ))
                          )}
                       </tbody>
                    </table>
                  </div>
                  <div className="d-flex justify-content-end mt-4">
                    <button type="button" className="btn btn-secondary px-4" onClick={() => setShowViewStudentsModal(false)}>Tutup</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
