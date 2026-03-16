const { run, query } = require('./db');
require('dotenv').config();
const bcrypt = require('bcryptjs');

async function seed() {
  try {
    console.log('Creating tables...');
    
    // Drop existing tables for a clean reset
    await run('DROP TABLE IF EXISTS attendance');
    await run('DROP TABLE IF EXISTS submissions');
    await run('DROP TABLE IF EXISTS assignments');
    await run('DROP TABLE IF EXISTS materials');
    await run('DROP TABLE IF EXISTS rps');
    await run('DROP TABLE IF EXISTS class_enrollments');
    await run('DROP TABLE IF EXISTS enrollments'); // cleanup old table
    await run('DROP TABLE IF EXISTS schedules');
    await run('DROP TABLE IF EXISTS classes');
    await run('DROP TABLE IF EXISTS courses');
    await run('DROP TABLE IF EXISTS users');

    // 1. Users table handling Admin, Dosen, Mahasiswa
    await run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nidn_nim TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        password TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Courses (Matakuliah)
    await run(`
      CREATE TABLE IF NOT EXISTS courses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        sks INTEGER NOT NULL,
        semester INTEGER NOT NULL
      )
    `);

    // 3. Classes (Kelas) - Independent Group of Students
    await run(`
      CREATE TABLE IF NOT EXISTS classes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL
      )
    `);

    // 4. Class Enrollments (KRS - Mahasiswa ambil Kelas apa)
    await run(`
      CREATE TABLE IF NOT EXISTS class_enrollments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        class_id INTEGER NOT NULL,
        mahasiswa_id INTEGER NOT NULL,
        FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
        FOREIGN KEY (mahasiswa_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(class_id, mahasiswa_id)
      )
    `);

    // 5. Schedules (Jadwal) - Ties Class, Course, and Dosen
    await run(`
      CREATE TABLE IF NOT EXISTS schedules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        class_id INTEGER NOT NULL,
        course_id INTEGER NOT NULL,
        dosen_id INTEGER NOT NULL,
        day TEXT NOT NULL,
        time_start TEXT NOT NULL,
        time_end TEXT NOT NULL,
        room TEXT,
        FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
        FOREIGN KEY (dosen_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Materials (Materi)
    await run(`
      CREATE TABLE IF NOT EXISTS materials (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        schedule_id INTEGER,
        title TEXT NOT NULL,
        description TEXT,
        file_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (schedule_id) REFERENCES schedules(id) ON DELETE CASCADE
      )
    `);

    // Assignments (Tugas)
    await run(`
      CREATE TABLE IF NOT EXISTS assignments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        schedule_id INTEGER,
        title TEXT NOT NULL,
        description TEXT,
        deadline DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (schedule_id) REFERENCES schedules(id) ON DELETE CASCADE
      )
    `);

    // Submissions (Pengiriman Tugas) & Grades (Nilai)
    await run(`
      CREATE TABLE IF NOT EXISTS submissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        assignment_id INTEGER,
        mahasiswa_id INTEGER,
        file_url TEXT,
        grade INTEGER DEFAULT NULL,
        submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
        FOREIGN KEY (mahasiswa_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Attendance (Absensi)
    await run(`
      CREATE TABLE IF NOT EXISTS attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        schedule_id INTEGER,
        mahasiswa_id INTEGER,
        meeting_number INTEGER NOT NULL,
        status TEXT NOT NULL,
        date TEXT NOT NULL,
        FOREIGN KEY (schedule_id) REFERENCES schedules(id) ON DELETE CASCADE,
        FOREIGN KEY (mahasiswa_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Syllabus (RPS)
    await run(`
      CREATE TABLE IF NOT EXISTS rps (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        course_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        file_url TEXT NOT NULL,
        uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
      )
    `);

    // 3. Insert Seed Data
    console.log('Inserting seed data...');
    
    // Seed Users
    const hashedAdmin = await bcrypt.hash('admin123', 10);
    const hashedDosen1 = await bcrypt.hash('dosen123', 10);
    const hashedDosen2 = await bcrypt.hash('dosen123', 10);
    const hashedMhs1 = await bcrypt.hash('mhs123', 10);
    const hashedMhs2 = await bcrypt.hash('mhs123', 10);
    const hashedMhs3 = await bcrypt.hash('mhs123', 10);
    
    const u1 = await run('INSERT INTO users (nidn_nim, name, role, password) VALUES (?, ?, ?, ?)', ['admin', 'Administrator', 'admin', hashedAdmin]);
    const d1 = await run('INSERT INTO users (nidn_nim, name, role, password) VALUES (?, ?, ?, ?)', ['11111111', 'Dr. Algoritma', 'dosen', hashedDosen1]);
    const d2 = await run('INSERT INTO users (nidn_nim, name, role, password) VALUES (?, ?, ?, ?)', ['22222222', 'Prof. Jaringan', 'dosen', hashedDosen2]);
    const m1 = await run('INSERT INTO users (nidn_nim, name, role, password) VALUES (?, ?, ?, ?)', ['20230001', 'Andi', 'mahasiswa', hashedMhs1]);
    const m2 = await run('INSERT INTO users (nidn_nim, name, role, password) VALUES (?, ?, ?, ?)', ['20230002', 'Budi', 'mahasiswa', hashedMhs2]);
    const m3 = await run('INSERT INTO users (nidn_nim, name, role, password) VALUES (?, ?, ?, ?)', ['20230003', 'Citra', 'mahasiswa', hashedMhs3]);
    console.log('Users seeded');

    // Seed Courses
    const c1 = await run('INSERT INTO courses (code, name, sks, semester) VALUES (?, ?, ?, ?)', ['IF101', 'Algoritma Pemrograman', 3, 1]);
    const c2 = await run('INSERT INTO courses (code, name, sks, semester) VALUES (?, ?, ?, ?)', ['IF201', 'Jaringan Komputer', 3, 3]);
    console.log('Courses seeded');

    // Seed Classes (Independent)
    const cl_a = await run('INSERT INTO classes (name) VALUES (?)', ['Kelas TI Pagi A']);
    const cl_b = await run('INSERT INTO classes (name) VALUES (?)', ['Kelas TI Malam B']);
    console.log('Classes seeded');

    // Seed Enrollments (Mahasiswa A -> Kelas A, Mhs B -> Kelas B)
    await run('INSERT INTO class_enrollments (class_id, mahasiswa_id) VALUES (?, ?)', [cl_a.id, m1.id]);
    await run('INSERT INTO class_enrollments (class_id, mahasiswa_id) VALUES (?, ?)', [cl_a.id, m2.id]);
    await run('INSERT INTO class_enrollments (class_id, mahasiswa_id) VALUES (?, ?)', [cl_b.id, m3.id]);
    console.log('Enrollments seeded');

    console.log('Seed completed successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    process.exit();
  }
}

seed();
