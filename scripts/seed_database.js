
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Connect to database
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

// Sample data for seeding
const departments = [
  {
    id: uuidv4(),
    name: "Engineering",
    icon: "code",
    color: "#3b82f6"
  },
  {
    id: uuidv4(),
    name: "Marketing",
    icon: "megaphone",
    color: "#10b981"
  },
  {
    id: uuidv4(),
    name: "Product",
    icon: "box",
    color: "#6366f1"
  },
  {
    id: uuidv4(),
    name: "Design",
    icon: "palette",
    color: "#ec4899"
  },
  {
    id: uuidv4(),
    name: "HR",
    icon: "users",
    color: "#f59e0b"
  }
];

const users = [
  {
    id: uuidv4(),
    username: "john.doe",
    fullName: "John Doe",
    email: "john.doe@example.com",
    department: "Engineering",
    role: "admin",
    phone: "555-123-4567"
  },
  {
    id: uuidv4(),
    username: "jane.smith",
    fullName: "Jane Smith",
    email: "jane.smith@example.com",
    department: "Marketing",
    role: "user",
    phone: "555-987-6543"
  },
  {
    id: uuidv4(),
    username: "alex.wong",
    fullName: "Alex Wong",
    email: "alex.wong@example.com",
    department: "Product",
    role: "user",
    phone: "555-456-7890"
  },
  {
    id: uuidv4(),
    username: "sarah.miller",
    fullName: "Sarah Miller",
    email: "sarah.miller@example.com",
    department: "Design",
    role: "user",
    phone: "555-789-0123"
  },
  {
    id: uuidv4(),
    username: "admin",
    fullName: "Admin User",
    email: "admin@example.com",
    department: "HR",
    role: "admin",
    phone: "555-234-5678"
  }
];

const requests = [
  {
    id: uuidv4(),
    title: "Website Redesign",
    description: "Need help redesigning the company website for better user experience.",
    department: "Marketing",
    departments: JSON.stringify(["Design", "Engineering"]),
    status: "Pending",
    dateCreated: new Date().toISOString(),
    creator: "jane.smith",
    creatorDepartment: "Marketing",
    createdAt: new Date().toISOString(),
    type: "project",
    creatorRole: "user",
    multiDepartment: 1,
    usersNeeded: 3,
    acceptedBy: JSON.stringify(["jane.smith"])
  },
  {
    id: uuidv4(),
    title: "Bug Fix in Checkout Process",
    description: "There's a critical bug in the checkout process that needs immediate attention.",
    department: "Engineering",
    status: "In Process",
    dateCreated: new Date().toISOString(),
    creator: "john.doe",
    creatorDepartment: "Engineering",
    createdAt: new Date().toISOString(),
    type: "request",
    creatorRole: "admin",
    acceptedBy: JSON.stringify(["john.doe"]),
    lastStatusUpdate: new Date().toISOString(),
    lastStatusUpdateTime: new Date().toLocaleTimeString()
  },
  {
    id: uuidv4(),
    title: "Marketing Campaign Design",
    description: "Need design assets for the upcoming winter marketing campaign.",
    department: "Marketing",
    departments: JSON.stringify(["Design", "Marketing"]),
    status: "Completed",
    dateCreated: new Date().toISOString(),
    creator: "jane.smith",
    creatorDepartment: "Marketing",
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
    type: "request",
    creatorRole: "user",
    multiDepartment: 1,
    acceptedBy: JSON.stringify(["sarah.miller", "jane.smith"]),
    lastStatusUpdate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() // 2 days ago
  },
  {
    id: uuidv4(),
    title: "Product Roadmap Review",
    description: "Need to review the Q4 product roadmap with key stakeholders.",
    department: "Product",
    status: "Rejected",
    dateCreated: new Date().toISOString(),
    creator: "alex.wong",
    creatorDepartment: "Product",
    createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days ago
    type: "request",
    creatorRole: "user",
    lastStatusUpdate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString() // 10 days ago
  },
  {
    id: uuidv4(),
    title: "Team Building Event",
    description: "Organizing a team building event for all departments.",
    department: "HR",
    departments: JSON.stringify(["HR", "Engineering", "Marketing", "Product", "Design"]),
    status: "Pending",
    dateCreated: new Date().toISOString(),
    creator: "admin",
    creatorDepartment: "HR",
    createdAt: new Date().toISOString(),
    type: "project",
    creatorRole: "admin",
    multiDepartment: 1,
    usersNeeded: 5,
    acceptedBy: JSON.stringify(["admin"])
  }
];

// Function to seed the database
async function seedDatabase() {
  console.log("Starting database seeding...");
  
  try {
    // Clear existing data
    await executeQuery("DELETE FROM participants_completed");
    await executeQuery("DELETE FROM rejections");
    await executeQuery("DELETE FROM requests");
    await executeQuery("DELETE FROM users");
    await executeQuery("DELETE FROM departments");
    
    console.log("Cleared existing data");
    
    // Insert new departments
    for (const dept of departments) {
      await executeQuery(
        "INSERT INTO departments (id, name, icon, color) VALUES (?, ?, ?, ?)",
        [dept.id, dept.name, dept.icon, dept.color]
      );
    }
    console.log(`Inserted ${departments.length} departments`);
    
    // Insert new users
    for (const user of users) {
      await executeQuery(
        "INSERT INTO users (id, username, fullName, email, department, role, phone) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [user.id, user.username, user.fullName, user.email, user.department, user.role, user.phone]
      );
    }
    console.log(`Inserted ${users.length} users`);
    
    // Insert new requests
    for (const req of requests) {
      await executeQuery(
        `INSERT INTO requests (
          id, title, description, department, departments, status, 
          dateCreated, creator, creatorDepartment, createdAt, type, 
          creatorRole, multiDepartment, usersNeeded, acceptedBy,
          lastStatusUpdate, lastStatusUpdateTime
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          req.id, req.title, req.description, req.department, req.departments,
          req.status, req.dateCreated, req.creator, req.creatorDepartment,
          req.createdAt, req.type, req.creatorRole, req.multiDepartment || 0,
          req.usersNeeded || 2, req.acceptedBy, req.lastStatusUpdate || null,
          req.lastStatusUpdateTime || null
        ]
      );
      
      // Add a rejection for rejected requests
      if (req.status === "Rejected") {
        await executeQuery(
          "INSERT INTO rejections (id, requestId, username, reason, date) VALUES (?, ?, ?, ?, ?)",
          [
            uuidv4(), 
            req.id, 
            "john.doe", 
            "This request doesn't align with our current priorities.",
            new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toLocaleString()
          ]
        );
      }
      
      // Add completed participants for completed requests
      if (req.status === "Completed") {
        const acceptedBy = JSON.parse(req.acceptedBy);
        for (const user of acceptedBy) {
          await executeQuery(
            "INSERT INTO participants_completed (id, requestId, username, completedAt) VALUES (?, ?, ?, ?)",
            [
              uuidv4(),
              req.id,
              user,
              new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
            ]
          );
        }
      }
    }
    console.log(`Inserted ${requests.length} requests`);
    
    console.log("Database seeded successfully!");
    
  } catch (error) {
    console.error("Error seeding database:", error);
  } finally {
    db.close();
  }
}

// Helper function for executing queries
function executeQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

module.exports = seedDatabase;
