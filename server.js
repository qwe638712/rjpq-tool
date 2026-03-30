const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);

let roomsState = {}; 
let resetTimers = {};
const PLAYER_COLORS = ['#e74c3c', '#3498db', '#f1c40f', '#9b59b6']; // 分配給四名使用者的顏色

app.use(express.static(__dirname));

function broadcastRoomCounts() {
    let counts = {};
    for (let i = 1; i <= 10; i++) {
        const clients = io.sockets.adapter.rooms.get(i.toString());
        counts[i] = clients ? clients.size : 0;
    }
    io.emit('roomCountsUpdate', counts);
}

io.on('connection', (socket) => {
    let currentRoom = null;
    broadcastRoomCounts();

    socket.on('joinRoom', (roomId) => {
        const roomStr = roomId.toString();
        const clients = io.sockets.adapter.rooms.get(roomStr);
        const currentCount = clients ? clients.size : 0;

        // 限制每個包廂最多 4 人
        if (currentCount >= 4) {
            socket.emit('errorMsg', '該包廂已滿座（限4人）！');
            return;
        }

        if (currentRoom) socket.leave(currentRoom);
        currentRoom = roomStr;
        socket.join(roomStr);

        if (!roomsState[roomStr]) roomsState[roomStr] = {};

        // 自動分配顏色
        const usedColors = [];
        const roomClients = io.sockets.adapter.rooms.get(roomStr);
        roomClients.forEach(id => {
            const s = io.sockets.sockets.get(id);
            if (s && s.myColor) usedColors.push(s.myColor);
        });
        socket.myColor = PLAYER_COLORS.find(c => !usedColors.includes(c)) || PLAYER_COLORS[0];

        socket.emit('joinSuccess', { roomId, myColor: socket.myColor, state: roomsState[roomStr] });
        broadcastRoomCounts();
    });

    socket.on('click', (data) => {
        if (!currentRoom) return;
        const { floor, tile, color } = data;
        const key = `f${floor}-${tile}`;
        if (roomsState[currentRoom][key] && roomsState[currentRoom][key] !== color) return;
        
        let isCancel = false;
        for (let k in roomsState[currentRoom]) {
            if (k.startsWith(`f${floor}-`) && roomsState[currentRoom][k] === color) {
                if (k === key) isCancel = true;
                delete roomsState[currentRoom][k];
            }
        }
        if (!isCancel) roomsState[currentRoom][key] = color;
        io.to(currentRoom).emit('sync', roomsState[currentRoom]);
    });

    socket.on('requestReset', () => {
        if (!currentRoom) return;
        if (resetTimers[currentRoom]) {
            executeReset(currentRoom);
        } else {
            let timeLeft = 60;
            io.to(currentRoom).emit('resetCounting', timeLeft);
            resetTimers[currentRoom] = setInterval(() => {
                timeLeft--;
                if (timeLeft <= 0) executeReset(currentRoom);
                else io.to(currentRoom).emit('resetCounting', timeLeft);
            }, 1000);
        }
    });

    function executeReset(rid) {
        if (resetTimers[rid]) { clearInterval(resetTimers[rid]); delete resetTimers[rid]; }
        roomsState[rid] = {};
        io.to(rid).emit('sync', {});
        io.to(rid).emit('resetFinished');
    }

    socket.on('disconnect', () => { setTimeout(broadcastRoomCounts, 500); });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, '0.0.0.0', () => console.log(`NanMoCLB server running on port ${PORT}`));
