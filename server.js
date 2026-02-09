const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const path = require('path');

// Serve static files from the 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// Store active rooms in memory (No Database)
// Structure: { "ROOMCODE": { adminSocketId: "...", users: [] } }
const activeRooms = {};

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // --- ADMIN EVENTS ---

    socket.on('create_room', () => {
        // Generate a random 4-digit code
        const roomCode = Math.floor(1000 + Math.random() * 9000).toString();
        
        // Save to memory
        activeRooms[roomCode] = { admin: socket.id, active: true };
        
        // Admin joins the socket channel
        socket.join(roomCode);
        
        // Tell the admin the room is ready
        socket.emit('room_created', roomCode);
        console.log(`Room created: ${roomCode}`);
    });

    socket.on('admin_scan_send', ({ roomCode, data }) => {
        // Verify room exists
        if (activeRooms[roomCode]) {
            // Broadcast the scanned data to everyone in the room
            io.to(roomCode).emit('receive_scan_data', data);
        }
    });

    // --- USER EVENTS ---

    socket.on('join_room', (roomCode) => {
        // Check if room exists in memory
        if (activeRooms[roomCode]) {
            socket.join(roomCode);
            socket.emit('joined_success', roomCode);
            console.log(`User joined room: ${roomCode}`);
        } else {
            socket.emit('error_message', "Room not found or invalid code.");
        }
    });

    // --- CLEANUP ---
    socket.on('disconnect', () => {
        // Optional: logic to delete room if admin leaves could go here
    });
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
