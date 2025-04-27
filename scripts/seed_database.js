
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Import sample data
const { departments } = require('../src/data/departments');
const { teamMembers } = require('../src/data/team');

// Connect to the SQLite database
const dbPath = path.resolve(__dirname, '../data/jd-requests.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to database:', err.message);
    process.exit(1);
  } else {
    console.log('Connected to SQLite database at', dbPath);
    seedDatabase();
  }
});

// Seed the database with initial data
async function seedDatabase() {
  try {
    console.log('Starting database seeding process...');
    
    // Seed departments
    await seedDepartments();
    
    // Seed users
    await seedUsers();
    
    // Seed sample requests
    await seedRequests();
    
    console.log('Database seeding completed successfully!');
    db.close();
  } catch (error) {
    console.error('Error seeding database:', error);
    db.close();
  }
}

// Import departments from the frontend data file
async function seedDepartments() {
  return new Promise((resolve, reject) => {
    console.log('Seeding departments table...');
    
    // First check if departments already exist
    db.get('SELECT COUNT(*) as count FROM departments', [], (err, row) => {
      if (err) {
        return reject(err);
      }
      
      if (row.count > 0) {
        console.log(`${row.count} departments already exist. Skipping.`);
        return resolve();
      }
      
      // Begin transaction
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        
        const stmt = db.prepare(`
          INSERT INTO departments (id, name, icon, color)
          VALUES (?, ?, ?, ?)
        `);
        
        departments.forEach(dept => {
          stmt.run(dept.id, dept.name, dept.icon, dept.color);
        });
        
        stmt.finalize();
        
        db.run('COMMIT', err => {
          if (err) {
            console.error('Error committing department data:', err);
            db.run('ROLLBACK');
            return reject(err);
          }
          console.log(`${departments.length} departments added successfully.`);
          resolve();
        });
      });
    });
  });
}

// Import users from the frontend data file
async function seedUsers() {
  return new Promise((resolve, reject) => {
    console.log('Seeding users table...');
    
    // First check if users already exist
    db.get('SELECT COUNT(*) as count FROM users', [], (err, row) => {
      if (err) {
        return reject(err);
      }
      
      if (row.count > 0) {
        console.log(`${row.count} users already exist. Skipping.`);
        return resolve();
      }
      
      // Begin transaction
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        
        const stmt = db.prepare(`
          INSERT INTO users (id, username, fullName, email, department, role, phone, password)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        teamMembers.forEach(user => {
          const id = uuidv4();
          const username = user.username || user.email.split('@')[0];
          stmt.run(
            id, 
            username, 
            user.name, 
            user.email, 
            user.department, 
            user.role.toLowerCase(), 
            user.phone || '', 
            'password123' // Default password
          );
        });
        
        stmt.finalize();
        
        db.run('COMMIT', err => {
          if (err) {
            console.error('Error committing user data:', err);
            db.run('ROLLBACK');
            return reject(err);
          }
          console.log(`${teamMembers.length} users added successfully.`);
          resolve();
        });
      });
    });
  });
}

// Create sample requests
async function seedRequests() {
  return new Promise((resolve, reject) => {
    console.log('Seeding sample requests...');
    
    // First check if requests already exist
    db.get('SELECT COUNT(*) as count FROM requests', [], (err, row) => {
      if (err) {
        return reject(err);
      }
      
      if (row.count > 0) {
        console.log(`${row.count} requests already exist. Skipping.`);
        return resolve();
      }
      
      // Get all users
      db.all('SELECT username, department, role FROM users', [], (err, users) => {
        if (err) {
          return reject(err);
        }
        
        if (users.length === 0) {
          console.log('No users found. Skipping request creation.');
          return resolve();
        }
        
        // Filter users by role
        const admins = users.filter(user => user.role === 'admin' || user.role.includes('head'));
        const clients = users.filter(user => user.role === 'client' || user.role === 'staff');
        
        // Begin transaction
        db.serialize(() => {
          db.run('BEGIN TRANSACTION');
          
          // Create sample requests
          const sampleRequests = [
            {
              id: `#${Math.floor(100000 + Math.random() * 900000)}`,
              title: 'Website Update Request',
              description: 'Need to update our department website with new content and images.',
              status: 'Pending',
              creator: clients[0]?.username || users[0].username,
              creatorDepartment: clients[0]?.department || users[0].department,
              department: 'IT',
              multiDepartment: 0,
              type: 'request'
            },
            {
              id: `#${Math.floor(100000 + Math.random() * 900000)}`,
              title: 'Equipment Maintenance',
              description: 'The printer on the 3rd floor needs maintenance.',
              status: 'In Process',
              creator: clients[1]?.username || users[0].username,
              creatorDepartment: clients[1]?.department || users[0].department,
              department: 'Facilities',
              multiDepartment: 0,
              type: 'request'
            },
            {
              id: `#${Math.floor(100000 + Math.random() * 900000)}`,
              title: 'Annual Report Collaboration',
              description: 'Need multiple departments to collaborate on the annual report.',
              status: 'Pending',
              creator: admins[0]?.username || users[0].username,
              creatorDepartment: admins[0]?.department || users[0].department,
              department: 'Marketing',
              departments: JSON.stringify(['Marketing', 'Finance', 'HR']),
              multiDepartment: 1,
              type: 'project',
              usersNeeded: 3
            },
            {
              id: `#${Math.floor(100000 + Math.random() * 900000)}`,
              title: 'Training Session Request',
              description: 'Request for a training session on the new software.',
              status: 'Completed',
              creator: clients[2]?.username || users[0].username,
              creatorDepartment: clients[2]?.department || users[0].department,
              department: 'HR',
              multiDepartment: 0,
              type: 'request'
            }
          ];
          
          const now = new Date();
          const stmt = db.prepare(`
            INSERT INTO requests (
              id, title, description, department, departments, status, dateCreated,
              creator, creatorDepartment, createdAt, type, creatorRole, 
              multiDepartment, usersNeeded
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          
          sampleRequests.forEach(req => {
            stmt.run(
              req.id,
              req.title,
              req.description,
              req.department,
              req.departments || null,
              req.status,
              now.toLocaleDateString('en-GB'),
              req.creator,
              req.creatorDepartment,
              now.toISOString(),
              req.type,
              req.creator === admins[0]?.username ? 'admin' : 'client',
              req.multiDepartment,
              req.usersNeeded || 1
            );
          });
          
          stmt.finalize();
          
          db.run('COMMIT', err => {
            if (err) {
              console.error('Error committing request data:', err);
              db.run('ROLLBACK');
              return reject(err);
            }
            console.log(`${sampleRequests.length} sample requests added successfully.`);
            resolve();
          });
        });
      });
    });
  });
}
