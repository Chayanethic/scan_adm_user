const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server, { cors: { origin: "*" } });
const path = require('path');

app.use(express.static(path.join(__dirname, 'public')));

// Store rooms and their history
// Structure: { "1234": { history: ["link1", "link2"...] } }
const activeRooms = {};

io.on('connection', (socket) => {

    // --- ADMIN: Create Room ---
    socket.on('create_room', () => {
        const roomCode = Math.floor(1000 + Math.random() * 9000).toString();
        // Initialize with empty history
        activeRooms[roomCode] = { history: [] };
        
        socket.join(roomCode);
        socket.emit('room_created', roomCode);
    });

    // --- ADMIN: Scan & Send ---
    socket.on('admin_scan_send', ({ roomCode, data }) => {
        if (activeRooms[roomCode]) {
            const room = activeRooms[roomCode];

            // 1. Add new scan to the TOP of the list
            room.history.unshift(data);

            // 2. Keep only the latest 8
            if (room.history.length > 8) {
                room.history = room.history.slice(0, 8);
            }

            // 3. Send the WHOLE updated list to everyone (ensures perfect sync)
            io.to(roomCode).emit('update_list', room.history);
        }
    });

    // --- USER: Join Room ---
    socket.on('join_room', (roomCode) => {
        if (activeRooms[roomCode]) {
            socket.join(roomCode);
            // Send existing history immediately so they see what's already there
            socket.emit('update_list', activeRooms[roomCode].history);
            socket.emit('joined_success', roomCode);
        } else {
            socket.emit('error_message', "Invalid Room Code");
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
