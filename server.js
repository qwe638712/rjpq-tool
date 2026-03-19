const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const path = require('path');

// 儲存房間狀態：{ 樓層: 選中的數字 }
let gameState = {};

// 提供靜態檔案
app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Socket.io 邏輯
io.on('connection', (socket) => {
    // 玩家連線時，發送當前進度
    socket.emit('sync', gameState);

    // 接收點擊事件
    socket.on('click', (data) => {
        // data 格式: { floor: 1, tile: 3 }
        gameState[data.floor] = data.tile;
        // 廣播給所有人 (包含自己)
        io.emit('sync', gameState);
    });

    // 清除按鈕 (選擇性功能)
    socket.on('reset', () => {
        gameState = {};
        io.emit('sync', gameState);
    });
});

const PORT = 3000;
http.listen(PORT, '0.0.0.0', () => {
    console.log(`伺服器運作中: http://localhost:${PORT}`);
});