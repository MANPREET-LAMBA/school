const express = require("express");
const bodyParser = require("body-parser");
const mysql = require("mysql2");
const fs = require("fs");

const haversine = require("haversine-distance"); // For geographical distance calculation

const app = express();
const port = 3000;

// Middleware
app.use(bodyParser.json());

// MySQL Database Connection
const db = mysql.createPool({
    host: "mysql-2d0d0b97-manpreetsingh20031-67fe.e.aivencloud.com", // Replace with your Aiven host
    port: 28585, // Default Aiven MySQL port
    user: "avnadmin",   // Replace with your Aiven username
    password: "AVNS_KWGTTjfkqwFLHL-DjGS", // Replace with your Aiven password
    database: "defaultdb", // Replace with your database name
    
});

db.getConnection((err, connection) => {
    if (err) {
        console.error("Error connecting to Aiven MySQL:", err.message);
    } else {
        console.log("Connected to Aiven MySQL successfully!");
        connection.release(); // Release the connection back to the pool
    }
});

const createTableQuery = `
CREATE TABLE IF NOT EXISTS schools (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address VARCHAR(255) NOT NULL,
    latitude FLOAT NOT NULL,
    longitude FLOAT NOT NULL
);
`;

db.query(createTableQuery, (err) => {
    if (err) {
        console.error("Error creating table:", err.message);
    } else {
        console.log("Table 'schools' created or already exists.");
    }
   
});
// Add School API
app.post("/addSchool", (req, res) => {
    const { name, address, latitude, longitude } = req.body;

    // Validate input
    if (!name || !address || !latitude || !longitude) {
        return res.status(400).json({ error: "All fields are required." });
    }

    const query = "INSERT INTO schools (name, address, latitude, longitude) VALUES (?, ?, ?, ?)";
    db.query(query, [name, address, latitude, longitude], (err, result) => {
        if (err) {
            console.error("Error adding school:", err.message);
            return res.status(500).json({ error: "Failed to add school." });
        }
        res.status(201).json({ message: "School added successfully!", schoolId: result.insertId });
    });
});

// List Schools API
app.get("/listSchools", (req, res) => {
    const { latitude, longitude } = req.body;
    

    // Validate input
    if (!latitude || !longitude) {
        return res.status(400).json({ error: "User's latitude and longitude are required." });
    }
   
    const userLocation = { lat: parseFloat(latitude), lon: parseFloat(longitude) };

    const query = "SELECT * FROM schools";
    db.query(query, (err, results) => {
        if (err) {
            console.error("Error fetching schools:", err.message);
            return res.status(500).json({ error: "Failed to retrieve schools." });
        }

        // Calculate distance and sort schools by proximity
        const sortedSchools = results.map((school) => {
            const schoolLocation = { lat: school.latitude, lon: school.longitude };
            const distance = haversine(userLocation, schoolLocation);
            return { ...school, distance };
        }).sort((a, b) => a.distance - b.distance);

        res.status(200).json(sortedSchools);
    });
});

// Start Server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});