
# Backend Setup Guide

## SQLite Database Setup

### Initial Database Configuration

1. **Create Data Directory**:
   ```bash
   mkdir -p ./data
   ```

2. **Install Required Dependencies**:
   ```bash
   npm install sqlite3 express cors body-parser uuid
   ```

3. **Database Location**: 
   The SQLite database file will be stored at `./data/jd-requests.db` in your project root directory.

## Backend Server Setup

### Create Express Server

1. **Create a new file** at `server/index.js`
2. **Add the required code** (this is already done in your existing server/index.js file)

### Running the Backend Server

1. **Start the server**:
   ```bash
   node server/index.js
   ```

2. The server will run on port 3000 by default (http://localhost:3000)

## Working with SQLite Database

SQLite is a file-based database that works locally on your computer. Unlike cloud databases, all data is stored in a single file (`./data/jd-requests.db`).

### Key points to understand:

1. **Local Only**: The database only exists on your computer. It does not sync automatically to any server.

2. **File-Based**: All data is stored in the `./data/jd-requests.db` file. If you delete this file, all data is lost.

3. **Persistence**: Data will remain in the database between server restarts as long as the database file is not deleted.

4. **Seeding Data**: If you want to populate your database with sample data, you can use the "Seed Database" button on the admin controls panel.

### How to See Your Data

1. **Using the Application**: Log in to the application, and it will connect to the SQLite database through the backend API.

2. **SQLite Browser**: You can use a tool like [DB Browser for SQLite](https://sqlitebrowser.org/) to open and inspect the `./data/jd-requests.db` file directly.

## Troubleshooting

### Common Issues

1. **Cannot connect to database**:
   - Make sure the `data` directory exists in the project root
   - Check if the database file `./data/jd-requests.db` exists
   - Verify the server is running (check for "Connected to SQLite database" message)

2. **No data appears in the application**:
   - Check if the server is running
   - Use the "Seed Database" button in the admin controls to populate with sample data
   - Verify the application is connecting to `http://localhost:3000`
   
3. **Database is empty even after creating items**:
   - Make sure the backend server is running while using the application
   - Check permissions on the database file
   - Try using DB Browser for SQLite to directly inspect the database

### Seeding the Database

The application includes functionality to seed your database with sample data:

1. Start the backend server: `node server/index.js`
2. Log in to the application with an admin account (username: `admin` or `john.doe`)
3. Go to your profile page
4. Click the "Seed Database" button in the admin controls panel

This will add sample departments, users and requests to your database so you can test all features.

## API Endpoints

The backend server provides several API endpoints for interacting with the database:

- `GET /api/departments` - Get all departments
- `GET /api/users` - Get all users
- `POST /api/users/login` - Login a user
- `GET /api/requests` - Get all requests
- `POST /api/requests` - Create a request
- `PUT /api/requests/:id` - Update a request
- `DELETE /api/requests/:id` - Delete a request
- `POST /api/requests/:id/accept` - Accept a request
- `POST /api/requests/:id/complete` - Complete a request
- `POST /api/requests/:id/reject` - Reject a request
- `POST /api/seed` - Seed database with sample data

The application will automatically fall back to using localStorage if the backend API is not available.
