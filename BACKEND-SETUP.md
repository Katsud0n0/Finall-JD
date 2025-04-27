
# Backend Setup Guide

## SQLite Database Setup

### Initial Database Configuration

1. **Create Data Directory**:
   ```bash
   mkdir -p ./data
   ```

2. **Install Required Dependencies**:
   ```bash
   npm install sqlite3 express cors body-parser
   ```

3. **Database Location**: 
   The SQLite database file will be stored at `./data/jd-requests.db` in your project root directory.

## Backend Server Setup

### Create Express Server

1. **Create a new file** at `server/index.js`:

```javascript
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

app.put('/api/requests/:id', (req, res) => {
  const requestId = req.params.id;
  const updates = req.body;
  
  // Convert arrays to JSON strings for storage
  if (Array.isArray(updates.departments)) {
    updates.departments = JSON.stringify(updates.departments);
  }
  
  if (Array.isArray(updates.acceptedBy)) {
    updates.acceptedBy = JSON.stringify(updates.acceptedBy);
  }
  
  // Build dynamic update query
  const fields = Object.keys(updates)
    .filter(key => key !== 'id')
    .map(key => `${key} = ?`);
    
  const values = Object.keys(updates)
    .filter(key => key !== 'id')
    .map(key => updates[key]);
  
  values.push(requestId);
  
  const sql = `UPDATE requests SET ${fields.join(', ')} WHERE id = ?`;
  
  db.run(sql, values, function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Request not found' });
    }
    
    res.json({
      message: 'Request updated successfully',
      requestId
    });
  });
});

app.delete('/api/requests/:id', (req, res) => {
  const requestId = req.params.id;
  
  db.run('DELETE FROM rejections WHERE requestId = ?', [requestId], (err) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    db.run('DELETE FROM participants_completed WHERE requestId = ?', [requestId], (err) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      db.run('DELETE FROM requests WHERE id = ?', [requestId], function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        
        if (this.changes === 0) {
          return res.status(404).json({ error: 'Request not found' });
        }
        
        res.json({
          message: 'Request deleted successfully',
          requestId
        });
      });
    });
  });
});

// Accept a request
app.post('/api/requests/:id/accept', (req, res) => {
  const requestId = req.params.id;
  const { username } = req.body;
  
  db.get('SELECT * FROM requests WHERE id = ?', [requestId], (err, request) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }
    
    let acceptedBy = [];
    try {
      if (request.acceptedBy) {
        acceptedBy = JSON.parse(request.acceptedBy);
      }
    } catch (e) {
      acceptedBy = [];
    }
    
    if (!acceptedBy.includes(username)) {
      acceptedBy.push(username);
    }
    
    const usersAccepted = acceptedBy.length;
    const usersNeeded = request.usersNeeded || 2;
    const newStatus = (request.multiDepartment || request.type === 'project') && usersAccepted >= usersNeeded 
      ? 'In Process' 
      : request.status;
    
    const now = new Date().toISOString();
    
    db.run(`
      UPDATE requests 
      SET acceptedBy = ?, usersAccepted = ?, status = ?, lastStatusUpdate = ?, lastStatusUpdateTime = ?
      WHERE id = ?
    `, [
      JSON.stringify(acceptedBy),
      usersAccepted,
      newStatus,
      now,
      new Date().toLocaleTimeString(),
      requestId
    ], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      res.json({
        message: 'Request accepted successfully',
        usersAccepted,
        usersNeeded,
        status: newStatus
      });
    });
  });
});

// Complete a request
app.post('/api/requests/:id/complete', (req, res) => {
  const requestId = req.params.id;
  const { username } = req.body;
  
  // First check if the request exists
  db.get('SELECT * FROM requests WHERE id = ?', [requestId], (err, request) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }
    
    // Check if the user has already marked this as complete
    db.get('SELECT * FROM participants_completed WHERE requestId = ? AND username = ?', 
      [requestId, username], 
      (err, completed) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        
        if (completed) {
          return res.json({
            message: 'User has already marked this as complete',
            alreadyCompleted: true
          });
        }
        
        // Add user to completed participants
        const now = new Date().toISOString();
        db.run(`
          INSERT INTO participants_completed (id, requestId, username, completedAt)
          VALUES (?, ?, ?, ?)
        `, [
          Date.now().toString(),
          requestId,
          username,
          now
        ], function(err) {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          
          // Check if all participants have completed
          db.all('SELECT * FROM participants_completed WHERE requestId = ?', [requestId], (err, completedParticipants) => {
            if (err) {
              return res.status(500).json({ error: err.message });
            }
            
            let acceptedBy = [];
            try {
              if (request.acceptedBy) {
                acceptedBy = JSON.parse(request.acceptedBy);
              }
            } catch (e) {
              acceptedBy = [];
            }
            
            // Update status to Completed if all participants have completed
            if (
              (request.multiDepartment || request.type === 'project') && 
              completedParticipants.length >= acceptedBy.length && 
              acceptedBy.length >= (request.usersNeeded || 2)
            ) {
              db.run(`
                UPDATE requests 
                SET status = ?, lastStatusUpdate = ?, lastStatusUpdateTime = ?
                WHERE id = ?
              `, [
                'Completed',
                now,
                new Date().toLocaleTimeString(),
                requestId
              ]);
            }
            
            res.json({
              message: 'Completion status updated',
              requestId,
              completedParticipants: completedParticipants.map(p => p.username)
            });
          });
        });
      }
    );
  });
});

// Reject a request
app.post('/api/requests/:id/reject', (req, res) => {
  const requestId = req.params.id;
  const { username, reason } = req.body;
  
  // First check if the request exists
  db.get('SELECT * FROM requests WHERE id = ?', [requestId], (err, request) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }
    
    const now = new Date();
    const formattedDate = now.toLocaleDateString() + ' ' + now.toLocaleTimeString();
    const rejectionId = Date.now().toString();
    
    // Add rejection record
    db.run(`
      INSERT INTO rejections (id, requestId, username, reason, date)
      VALUES (?, ?, ?, ?, ?)
    `, [
      rejectionId,
      requestId,
      username,
      reason || '',
      formattedDate
    ], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      // For multi-department or project requests, remove user from acceptedBy
      if (request.multiDepartment || request.type === 'project') {
        let acceptedBy = [];
        try {
          if (request.acceptedBy) {
            acceptedBy = JSON.parse(request.acceptedBy);
          }
        } catch (e) {
          acceptedBy = [];
        }
        
        const updatedAcceptedBy = acceptedBy.filter(u => u !== username);
        const usersAccepted = updatedAcceptedBy.length;
        
        // Status returns to Pending if participant count drops
        const newStatus = usersAccepted < (request.usersNeeded || 2) ? 'Pending' : request.status;
        
        db.run(`
          UPDATE requests 
          SET acceptedBy = ?, usersAccepted = ?, status = ?, lastStatusUpdate = ?, lastStatusUpdateTime = ?
          WHERE id = ?
        `, [
          JSON.stringify(updatedAcceptedBy),
          usersAccepted,
          newStatus,
          now.toISOString(),
          now.toLocaleTimeString(),
          requestId
        ]);
        
        // Also remove from completed participants if present
        db.run('DELETE FROM participants_completed WHERE requestId = ? AND username = ?', [requestId, username]);
      } else {
        // For single department requests, change status to Rejected
        db.run(`
          UPDATE requests 
          SET status = ?, acceptedBy = ?, usersAccepted = ?, lastStatusUpdate = ?, lastStatusUpdateTime = ?, statusChangedBy = ?
          WHERE id = ?
        `, [
          'Rejected',
          '[]',
          0,
          now.toISOString(),
          now.toLocaleTimeString(),
          username,
          requestId
        ]);
      }
      
      res.json({
        message: 'Request rejected successfully',
        rejectionId
      });
    });
  });
});

// Clear rejection notes
app.delete('/api/users/:username/rejections', (req, res) => {
  const username = req.params.username;
  
  db.run('UPDATE rejections SET hidden = 1 WHERE username = ?', [username], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    res.json({
      message: 'All rejection notes cleared successfully',
      count: this.changes
    });
  });
});

// Clear specific rejection note
app.delete('/api/users/:username/rejections/:rejectionId', (req, res) => {
  const { username, rejectionId } = req.params;
  
  db.run('UPDATE rejections SET hidden = 1 WHERE id = ? AND username = ?', [rejectionId, username], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Rejection note not found' });
    }
    
    res.json({
      message: 'Rejection note cleared successfully'
    });
  });
});

// Check expiration
app.post('/api/requests/check-expiration', (req, res) => {
  const now = new Date();
  
  // Find completed/rejected requests that should be marked as expired
  db.all(`
    SELECT id, lastStatusUpdate, status FROM requests 
    WHERE (status = 'Completed' OR status = 'Rejected') 
    AND lastStatusUpdate IS NOT NULL
    AND isExpired = 0
  `, [], (err, requests) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    let expiredCount = 0;
    let deletedCount = 0;
    
    for (const request of requests) {
      const statusUpdateDate = new Date(request.lastStatusUpdate);
      const oneDayLater = new Date(statusUpdateDate);
      oneDayLater.setDate(oneDayLater.getDate() + 1);
      
      if (now > oneDayLater) {
        db.run('UPDATE requests SET isExpired = 1 WHERE id = ?', [request.id]);
        expiredCount++;
      }
    }
    
    // Find already expired requests to delete
    db.all('SELECT id FROM requests WHERE isExpired = 1', [], (err, expiredRequests) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      for (const request of expiredRequests) {
        db.run('DELETE FROM participants_completed WHERE requestId = ?', [request.id]);
        db.run('DELETE FROM rejections WHERE requestId = ?', [request.id]);
        db.run('DELETE FROM requests WHERE id = ?', [request.id]);
        deletedCount++;
      }
      
      // Find and expire pending requests
      db.all(`
        SELECT id, createdAt, type, multiDepartment FROM requests 
        WHERE status = 'Pending'
      `, [], (err, pendingRequests) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        
        for (const request of pendingRequests) {
          const createdDate = new Date(request.createdAt);
          let shouldDelete = false;
          
          if (request.type === 'request') {
            const expiryDays = request.multiDepartment ? 45 : 30;
            const expiryDate = new Date(createdDate);
            expiryDate.setDate(expiryDate.getDate() + expiryDays);
            
            if (now > expiryDate) {
              shouldDelete = true;
            }
          } else if (request.type === 'project') {
            const archiveDays = 60;
            const archiveDate = new Date(createdDate);
            archiveDate.setDate(archiveDate.getDate() + archiveDays);
            
            if (now > archiveDate) {
              // Mark project as archived instead of deleting
              db.run(`
                UPDATE requests 
                SET archived = 1, archivedAt = ?
                WHERE id = ?
              `, [now.toISOString(), request.id]);
            }
          }
          
          if (shouldDelete) {
            db.run('DELETE FROM participants_completed WHERE requestId = ?', [request.id]);
            db.run('DELETE FROM rejections WHERE requestId = ?', [request.id]);
            db.run('DELETE FROM requests WHERE id = ?', [request.id]);
            deletedCount++;
          }
        }
        
        // Check for archived projects that need to be deleted
        db.all(`
          SELECT id, archivedAt FROM requests 
          WHERE archived = 1 AND archivedAt IS NOT NULL
        `, [], (err, archivedProjects) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          
          for (const project of archivedProjects) {
            const archiveDate = new Date(project.archivedAt);
            const deleteDate = new Date(archiveDate);
            deleteDate.setDate(deleteDate.getDate() + 7);
            
            if (now > deleteDate) {
              db.run('DELETE FROM participants_completed WHERE requestId = ?', [project.id]);
              db.run('DELETE FROM rejections WHERE requestId = ?', [project.id]);
              db.run('DELETE FROM requests WHERE id = ?', [project.id]);
              deletedCount++;
            }
          }
          
          res.json({
            message: 'Expiration check completed',
            expiredCount,
            deletedCount
          });
        });
      });
    });
  });
});

// Data Import Endpoints (for setup)
app.post('/api/import/departments', (req, res) => {
  const departments = req.body;
  
  const insertDepartment = (department) => {
    return new Promise((resolve, reject) => {
      db.run(`
        INSERT OR REPLACE INTO departments (id, name, icon, color)
        VALUES (?, ?, ?, ?)
      `, [
        department.id,
        department.name,
        department.icon,
        department.color
      ], function(err) {
        if (err) reject(err);
        else resolve();
      });
    });
  };
  
  Promise.all(departments.map(insertDepartment))
    .then(() => {
      res.json({
        message: 'Departments imported successfully',
        count: departments.length
      });
    })
    .catch(err => {
      res.status(500).json({ error: err.message });
    });
});

app.post('/api/import/users', (req, res) => {
  const users = req.body;
  
  const insertUser = (user) => {
    return new Promise((resolve, reject) => {
      db.run(`
        INSERT OR REPLACE INTO users (id, username, fullName, email, department, role, phone, password)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        user.id,
        user.username,
        user.fullName,
        user.email,
        user.department,
        user.role,
        user.phone,
        user.password || 'password123' // Default password
      ], function(err) {
        if (err) reject(err);
        else resolve();
      });
    });
  };
  
  Promise.all(users.map(insertUser))
    .then(() => {
      res.json({
        message: 'Users imported successfully',
        count: users.length
      });
    })
    .catch(err => {
      res.status(500).json({ error: err.message });
    });
});

// Migration endpoint to move from localStorage to SQLite
app.post('/api/migrate/localstorage', (req, res) => {
  const requests = req.body;
  
  if (!Array.isArray(requests)) {
    return res.status(400).json({ error: 'Expected an array of requests' });
  }
  
  const insertRequest = (request) => {
    return new Promise((resolve, reject) => {
      // Convert arrays to JSON strings for storage
      const departmentsStr = Array.isArray(request.departments) 
        ? JSON.stringify(request.departments) 
        : request.departments;
      
      const acceptedByStr = Array.isArray(request.acceptedBy) 
        ? JSON.stringify(request.acceptedBy) 
        : (request.acceptedBy ? JSON.stringify([request.acceptedBy]) : '[]');
      
      db.run(`
        INSERT OR REPLACE INTO requests (
          id, title, description, department, departments, status, dateCreated, 
          creator, creatorDepartment, createdAt, type, creatorRole, 
          multiDepartment, usersNeeded, acceptedBy, usersAccepted,
          lastStatusUpdate, lastStatusUpdateTime, priority, archived, archivedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        request.id,
        request.title,
        request.description,
        request.department,
        departmentsStr,
        request.status,
        request.dateCreated,
        request.creator,
        request.creatorDepartment,
        request.createdAt || request.dateCreated,
        request.type || 'request',
        request.creatorRole,
        request.multiDepartment ? 1 : 0,
        request.usersNeeded || 2,
        acceptedByStr,
        request.usersAccepted || 0,
        request.lastStatusUpdate,
        request.lastStatusUpdateTime,
        request.priority,
        request.archived ? 1 : 0,
        request.archivedAt
      ], function(err) {
        if (err) {
          console.error('Error inserting request:', err);
          reject(err);
        } else {
          // Now handle rejections if any
          if (Array.isArray(request.rejections) && request.rejections.length > 0) {
            const rejectionPromises = request.rejections.map(rejection => {
              return new Promise((resolveRejection, rejectRejection) => {
                db.run(`
                  INSERT INTO rejections (id, requestId, username, reason, date, hidden)
                  VALUES (?, ?, ?, ?, ?, ?)
                `, [
                  Date.now() + Math.random().toString(36).substring(2, 9),
                  request.id,
                  rejection.username,
                  rejection.reason || '',
                  rejection.date,
                  rejection.hidden ? 1 : 0
                ], function(rejErr) {
                  if (rejErr) rejectRejection(rejErr);
                  else resolveRejection();
                });
              });
            });
            
            Promise.all(rejectionPromises)
              .then(() => resolve())
              .catch(err => reject(err));
          } else {
            resolve();
          }
        }
      });
    });
  };
  
  Promise.all(requests.map(insertRequest))
    .then(() => {
      res.json({
        message: 'LocalStorage data migrated successfully',
        count: requests.length
      });
    })
    .catch(err => {
      res.status(500).json({ error: err.message });
    });
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
```

2. **Create a migration script** at `scripts/migrate_to_sqlite.js`:

```javascript
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

// Function to migrate localStorage data to SQLite
async function migrateToSQLite() {
  try {
    console.log('Starting migration from localStorage to SQLite...');
    
    // Read localStorage data from a JSON file (you'll need to export this first)
    const localStorageFile = path.join(__dirname, '../data/localStorage_export.json');
    
    if (!fs.existsSync(localStorageFile)) {
      console.error('localStorage export file not found. Please run the export script first.');
      process.exit(1);
    }
    
    const localStorageData = JSON.parse(fs.readFileSync(localStorageFile, 'utf8'));
    const requests = localStorageData['jd-requests'] || [];
    
    if (!requests.length) {
      console.log('No requests found in localStorage export.');
      return;
    }
    
    console.log(`Found ${requests.length} requests to migrate.`);
    
    // Send data to backend migration endpoint
    const response = await fetch('http://localhost:3000/api/migrate/localstorage', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requests)
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('Migration successful:', result.message);
      console.log(`Migrated ${result.count} requests to SQLite database.`);
    } else {
      console.error('Migration failed:', result.error);
    }
  } catch (error) {
    console.error('Migration error:', error);
  }
}

migrateToSQLite();
```

## Frontend Integration Changes

To ensure the frontend successfully connects to the backend, update the `src/api/index.ts` file:

<lov-write file_path="src/api/index.ts">
// API utilities for connecting to the SQLite backend
const API_URL = 'http://localhost:3000/api';

// Helper function for handling API errors
const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'API request failed');
  }
  return response.json();
};

// Wrapper for fetch with localStorage fallback
const fetchWithFallback = async (url: string, options: RequestInit = {}) => {
  try {
    const response = await fetch(url, options);
    return await handleResponse(response);
  } catch (error) {
    console.error(`API Error: ${error.message}. Falling back to localStorage.`);
    // Return null to indicate backend failed - will trigger localStorage fallback
    return null;
  }
};

export const api = {
  // User endpoints
  login: async (username: string, password?: string) => {
    try {
      const response = await fetch(`${API_URL}/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      return await handleResponse(response);
    } catch (error) {
      console.error('Login API Error:', error.message);
      // Use localStorage fallback for login
      const users = JSON.parse(localStorage.getItem('jd-users') || '[]');
      const user = users.find((u: any) => u.username === username);
      if (user) {
        return user;
      }
      throw new Error('User not found');
    }
  },
  
  getUsers: async () => {
    const result = await fetchWithFallback(`${API_URL}/users`);
    if (result !== null) return result;
    
    // Fallback to localStorage
    return JSON.parse(localStorage.getItem('jd-users') || '[]');
  },
  
  // Department endpoints
  getDepartments: async () => {
    const result = await fetchWithFallback(`${API_URL}/departments`);
    if (result !== null) return result;
    
    // Fallback to localStorage - use data/departments.ts as reference
    return JSON.parse(localStorage.getItem('jd-departments') || '[]');
  },
  
  // Request endpoints
  getRequests: async () => {
    const result = await fetchWithFallback(`${API_URL}/requests`);
    if (result !== null) return result;
    
    // Fallback to localStorage
    return JSON.parse(localStorage.getItem('jd-requests') || '[]');
  },
  
  createRequest: async (requestData: any) => {
    try {
      const response = await fetch(`${API_URL}/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      });
      
      return await handleResponse(response);
    } catch (error) {
      console.error('Create Request API Error:', error.message);
      
      // Fallback to localStorage
      const existingRequests = JSON.parse(localStorage.getItem('jd-requests') || '[]');
      const updatedRequests = [requestData, ...existingRequests];
      localStorage.setItem('jd-requests', JSON.stringify(updatedRequests));
      
      return {
        message: 'Request created successfully (localStorage fallback)',
        requestId: requestData.id
      };
    }
  },
  
  updateRequest: async (requestId: string, requestData: any) => {
    try {
      const response = await fetch(`${API_URL}/requests/${requestId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      });
      
      return await handleResponse(response);
    } catch (error) {
      console.error('Update Request API Error:', error.message);
      
      // Fallback to localStorage
      const existingRequests = JSON.parse(localStorage.getItem('jd-requests') || '[]');
      const updatedRequests = existingRequests.map((req: any) => 
        req.id === requestId ? { ...req, ...requestData } : req
      );
      localStorage.setItem('jd-requests', JSON.stringify(updatedRequests));
      
      return {
        message: 'Request updated successfully (localStorage fallback)',
        requestId
      };
    }
  },
  
  deleteRequest: async (requestId: string) => {
    try {
      const response = await fetch(`${API_URL}/requests/${requestId}`, {
        method: 'DELETE'
      });
      
      return await handleResponse(response);
    } catch (error) {
      console.error('Delete Request API Error:', error.message);
      
      // Fallback to localStorage
      const existingRequests = JSON.parse(localStorage.getItem('jd-requests') || '[]');
      const updatedRequests = existingRequests.filter((req: any) => req.id !== requestId);
      localStorage.setItem('jd-requests', JSON.stringify(updatedRequests));
      
      return {
        message: 'Request deleted successfully (localStorage fallback)',
        requestId
      };
    }
  },
  
  acceptRequest: async (requestId: string, username: string) => {
    try {
      const response = await fetch(`${API_URL}/requests/${requestId}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      });
      
      return await handleResponse(response);
    } catch (error) {
      console.error('Accept Request API Error:', error.message);
      
      // Fallback to localStorage
      const existingRequests = JSON.parse(localStorage.getItem('jd-requests') || '[]');
      const request = existingRequests.find((req: any) => req.id === requestId);
      
      if (!request) {
        throw new Error('Request not found');
      }
      
      // Parse acceptedBy or create new array
      let acceptedBy = [];
      try {
        acceptedBy = Array.isArray(request.acceptedBy) ? request.acceptedBy : 
                     (request.acceptedBy ? JSON.parse(request.acceptedBy) : []);
      } catch (e) {
        acceptedBy = [];
      }
      
      if (!acceptedBy.includes(username)) {
        acceptedBy.push(username);
      }
      
      const usersAccepted = acceptedBy.length;
      const usersNeeded = request.usersNeeded || 2;
      const newStatus = (request.multiDepartment || request.type === 'project') && usersAccepted >= usersNeeded 
        ? 'In Process' 
        : request.status;
      
      const now = new Date().toISOString();
      
      // Update the request
      const updatedRequests = existingRequests.map((req: any) => 
        req.id === requestId 
          ? { 
              ...req, 
              acceptedBy, 
              usersAccepted, 
              status: newStatus,
              lastStatusUpdate: now,
              lastStatusUpdateTime: new Date().toLocaleTimeString()
            } 
          : req
      );
      
      localStorage.setItem('jd-requests', JSON.stringify(updatedRequests));
      
      return {
        message: 'Request accepted successfully (localStorage fallback)',
        usersAccepted,
        usersNeeded,
        status: newStatus
      };
    }
  },
  
  completeRequest: async (requestId: string, username: string) => {
    try {
      const response = await fetch(`${API_URL}/requests/${requestId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      });
      
      return await handleResponse(response);
    } catch (error) {
      console.error('Complete Request API Error:', error.message);
      
      // Fallback to localStorage
      const existingRequests = JSON.parse(localStorage.getItem('jd-requests') || '[]');
      const request = existingRequests.find((req: any) => req.id === requestId);
      
      if (!request) {
        throw new Error('Request not found');
      }
      
      // Initialize or get completedBy array
      if (!request.completedBy) request.completedBy = [];
      
      if (!request.completedBy.includes(username)) {
        request.completedBy.push(username);
      }
      
      // Parse acceptedBy
      let acceptedBy = [];
      try {
        acceptedBy = Array.isArray(request.acceptedBy) ? request.acceptedBy : 
                     (request.acceptedBy ? JSON.parse(request.acceptedBy) : []);
      } catch (e) {
        acceptedBy = [];
      }
      
      // Check if all participants have completed
      if (
        (request.multiDepartment || request.type === 'project') && 
        request.completedBy.length >= acceptedBy.length && 
        acceptedBy.length >= (request.usersNeeded || 2)
      ) {
        request.status = 'Completed';
        request.lastStatusUpdate = new Date().toISOString();
        request.lastStatusUpdateTime = new Date().toLocaleTimeString();
      }
      
      // Update the request
      const updatedRequests = existingRequests.map((req: any) => 
        req.id === requestId ? request : req
      );
      
      localStorage.setItem('jd-requests', JSON.stringify(updatedRequests));
      
      return {
        message: 'Completion status updated (localStorage fallback)',
        requestId,
        completedParticipants: request.completedBy
      };
    }
  },
  
  rejectRequest: async (requestId: string, username: string, reason?: string) => {
    try {
      const response = await fetch(`${API_URL}/requests/${requestId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, reason })
      });
      
      return await handleResponse(response);
    } catch (error) {
      console.error('Reject Request API Error:', error.message);
      
      // Fallback to localStorage
      const existingRequests = JSON.parse(localStorage.getItem('jd-requests') || '[]');
      const request = existingRequests.find((req: any) => req.id === requestId);
      
      if (!request) {
        throw new Error('Request not found');
      }
      
      const now = new Date();
      const formattedDate = now.toLocaleDateString() + ' ' + now.toLocaleTimeString();
      const rejectionId = Date.now().toString();
      
      // Initialize rejections array if needed
      if (!request.rejections) request.rejections = [];
      
      // Add rejection
      request.rejections.push({
        id: rejectionId,
        requestId: requestId,
        username: username,
        reason: reason || '',
        date: formattedDate,
        hidden: 0
      });
      
      // Parse acceptedBy for multi-department/project requests
      if (request.multiDepartment || request.type === 'project') {
        let acceptedBy = [];
        try {
          acceptedBy = Array.isArray(request.acceptedBy) ? request.acceptedBy : 
                     (request.acceptedBy ? JSON.parse(request.acceptedBy) : []);
        } catch (e) {
          acceptedBy = [];
        }
        
        const updatedAcceptedBy = acceptedBy.filter((u: string) => u !== username);
        
        request.acceptedBy = updatedAcceptedBy;
        request.usersAccepted = updatedAcceptedBy.length;
        
        // Status returns to Pending if participant count drops
        request.status = updatedAcceptedBy.length < (request.usersNeeded || 2) ? 'Pending' : request.status;
        
        // Remove from completed if present
        if (request.completedBy) {
          request.completedBy = request.completedBy.filter((u: string) => u !== username);
        }
      } else {
        // For single department requests, change status to Rejected
        request.status = 'Rejected';
        request.acceptedBy = [];
        request.usersAccepted = 0;
        request.statusChangedBy = username;
      }
      
      request.lastStatusUpdate = now.toISOString();
      request.lastStatusUpdateTime = now.toLocaleTimeString();
      
      // Update the request
      const updatedRequests = existingRequests.map((req: any) => 
        req.id === requestId ? request : req
      );
      
      localStorage.setItem('jd-requests', JSON.stringify(updatedRequests));
      
      return {
        message: 'Request rejected successfully (localStorage fallback)',
        rejectionId
      };
    }
  },
  
  checkExpiredRequests: async () => {
    const result = await fetchWithFallback(`${API_URL}/requests/check-expiration`, {
      method: 'POST'
    });
    
    if (result !== null) return result;
    
    // Fallback to localStorage
    // This is a simplified version of the expiration logic
    const existingRequests = JSON.parse(localStorage.getItem('jd-requests') || '[]');
    const now = new Date();
    let expiredCount = 0;
    let deletedCount = 0;
    
    const updatedRequests = existingRequests.filter((request: any) => {
      // Check completed/rejected requests
      if ((request.status === 'Completed' || request.status === 'Rejected') && request.lastStatusUpdate) {
        const statusUpdateDate = new Date(request.lastStatusUpdate);
        const oneDayLater = new Date(statusUpdateDate);
        oneDayLater.setDate(oneDayLater.getDate() + 1);
        
        if (now > oneDayLater) {
          if (!request.isExpired) {
            expiredCount++;
            request.isExpired = true;
          } else {
            deletedCount++;
            return false; // Remove from array
          }
        }
      }
      
      // Check pending requests
      if (request.status === 'Pending' && request.createdAt) {
        const createdDate = new Date(request.createdAt);
        
        if (request.type === 'request') {
          const expiryDays = request.multiDepartment ? 45 : 30;
          const expiryDate = new Date(createdDate);
          expiryDate.setDate(expiryDate.getDate() + expiryDays);
          
          if (now > expiryDate) {
            deletedCount++;
            return false; // Remove from array
          }
        } else if (request.type === 'project') {
          const archiveDays = 60;
          const archiveDate = new Date(createdDate);
          archiveDate.setDate(archiveDate.getDate() + archiveDays);
          
          if (now > archiveDate) {
            // Mark project as archived instead of deleting
            request.archived = true;
            request.archivedAt = now.toISOString();
          }
          
          // If already archived, check if it should be deleted
          if (request.archived && request.archivedAt) {
            const archiveDate = new Date(request.archivedAt);
            const deleteDate = new Date(archiveDate);
            deleteDate.setDate(deleteDate.getDate() + 7);
            
            if (now > deleteDate) {
              deletedCount++;
              return false; // Remove from array
            }
          }
        }
      }
      
      return true;
    });
    
    localStorage.setItem('jd-requests', JSON.stringify(updatedRequests));
    
    return {
      message: 'Expiration check completed (localStorage fallback)',
      expiredCount,
      deletedCount
    };
  }
};

export default api;
