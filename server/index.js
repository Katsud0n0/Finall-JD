const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Database connection
const dbPath = path.resolve(__dirname, '../data/jd-requests.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to database:', err.message);
  } else {
    console.log('Connected to SQLite database at', dbPath);
    setupDatabase();
  }
});

// Set up database tables
function setupDatabase() {
  // Create requests table
  db.run(`CREATE TABLE IF NOT EXISTS requests (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    department TEXT,
    departments TEXT,
    status TEXT NOT NULL,
    dateCreated TEXT NOT NULL,
    creator TEXT NOT NULL,
    creatorDepartment TEXT,
    createdAt TEXT,
    type TEXT NOT NULL,
    creatorRole TEXT,
    isExpired INTEGER DEFAULT 0,
    archived INTEGER DEFAULT 0,
    multiDepartment INTEGER DEFAULT 0,
    acceptedBy TEXT,
    usersAccepted INTEGER DEFAULT 0,
    usersNeeded INTEGER DEFAULT 2,
    lastStatusUpdateTime TEXT,
    lastStatusUpdate TEXT,
    priority TEXT,
    archivedAt TEXT,
    statusChangedBy TEXT
  )`);

  // Create rejections table
  db.run(`CREATE TABLE IF NOT EXISTS rejections (
    id TEXT PRIMARY KEY,
    requestId TEXT NOT NULL,
    username TEXT NOT NULL,
    reason TEXT,
    date TEXT NOT NULL,
    hidden INTEGER DEFAULT 0,
    FOREIGN KEY (requestId) REFERENCES requests(id)
  )`);

  // Create participants_completed table
  db.run(`CREATE TABLE IF NOT EXISTS participants_completed (
    id TEXT PRIMARY KEY,
    requestId TEXT NOT NULL,
    username TEXT NOT NULL,
    completedAt TEXT NOT NULL,
    FOREIGN KEY (requestId) REFERENCES requests(id)
  )`);

  // Create departments table
  db.run(`CREATE TABLE IF NOT EXISTS departments (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    icon TEXT,
    color TEXT
  )`);

  // Create users table
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    fullName TEXT NOT NULL,
    email TEXT NOT NULL,
    department TEXT NOT NULL,
    role TEXT NOT NULL,
    phone TEXT,
    password TEXT,
    FOREIGN KEY (department) REFERENCES departments(name)
  )`);
}

// API Routes
// Departments
app.get('/api/departments', (req, res) => {
  db.all('SELECT * FROM departments', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Users
app.get('/api/users', (req, res) => {
  db.all('SELECT id, username, fullName, email, department, role, phone FROM users', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

app.post('/api/users/login', (req, res) => {
  const { username, password } = req.body;
  
  db.get('SELECT id, username, fullName, email, department, role, phone FROM users WHERE username = ?', 
    [username], 
    (err, user) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // In a real app you'd check password hash here
      // For demo purposes we'll accept any password
      res.json(user);
    }
  );
});

// Requests
app.get('/api/requests', (req, res) => {
  db.all('SELECT * FROM requests', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    // Process each request to handle JSON fields
    const processedRows = rows.map(row => {
      try {
        if (row.departments) row.departments = JSON.parse(row.departments);
        if (row.acceptedBy) row.acceptedBy = JSON.parse(row.acceptedBy);
        
        // Get rejections for this request
        db.all('SELECT * FROM rejections WHERE requestId = ?', [row.id], (err, rejections) => {
          if (!err && rejections) {
            row.rejections = rejections;
          }
        });
        
        // Get completed participants
        db.all('SELECT username FROM participants_completed WHERE requestId = ?', [row.id], (err, completed) => {
          if (!err && completed) {
            row.participantsCompleted = completed.map(p => p.username);
          }
        });
      } catch (e) {
        console.error('Error processing request data:', e);
      }
      return row;
    });
    
    res.json(processedRows);
  });
});

app.post('/api/requests', (req, res) => {
  const request = req.body;
  
  // Convert arrays to JSON strings for storage
  if (Array.isArray(request.departments)) {
    request.departments = JSON.stringify(request.departments);
  }
  
  if (Array.isArray(request.acceptedBy)) {
    request.acceptedBy = JSON.stringify(request.acceptedBy);
  }
  
  const sql = `INSERT INTO requests (
    id, title, description, department, departments, status, dateCreated, 
    creator, creatorDepartment, createdAt, type, creatorRole, 
    multiDepartment, usersNeeded
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  
  db.run(sql, [
    request.id,
    request.title,
    request.description,
    request.department,
    request.departments,
    request.status,
    request.dateCreated,
    request.creator,
    request.creatorDepartment,
    request.createdAt,
    request.type,
    request.creatorRole,
    request.multiDepartment ? 1 : 0,
    request.usersNeeded || 2
  ], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({
      message: 'Request created successfully',
      requestId: request.id
    });
  });
});

// Add seed database endpoint
app.post('/api/seed', async (req, res) => {
  try {
    // Run the seed script
    const seed = require('../scripts/seed_database');
    
    res.json({
      message: 'Database seeded successfully. Please refresh the page to see the changes.',
      success: true
    });
  } catch (error) {
    console.error('Error seeding database:', error);
    res.status(500).json({
      error: 'Failed to seed database',
      message: error.message,
      success: false
    });
  }
});

// Serve static files from the React app for production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  });
}

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
