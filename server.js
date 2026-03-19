const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const path = require('path');

// 儲存狀態：{ floor: { tile: 數字, color: 顏色 } }
let gameState = {};

// 預設四種顏色
const PLAYER_COLORS = ['#e74c3c', '#3498db', '#f1c40f', '#9b59b6']; // 紅, 藍, 黃, 紫
let colorIndex = 0;

app.use(express.static(__dirname));

io.on('connection', (socket) => {
    // 分配一個固定顏色給這位玩家
    const myColor = PLAYER_COLORS[colorIndex % PLAYER_COLORS.length];
    colorIndex++;
    socket.emit('assignColor', myColor);

    // 發送目前進度
    socket.emit('sync', gameState);

    socket.on('click', (data) => {
        const { floor, tile, color } = data;

        // 如果點擊的是「已經被選中」的格子，則取消選取 (Toggle 功能)
        if (gameState[floor] && gameState[floor].tile === tile) {
            delete gameState[floor];
        } else {
            // 更新該層為此人的顏色與數字
            gameState[floor] = { tile, color };
        }
        
        io.emit('sync', gameState);
    });

    socket.on('reset', () => {
        gameState = {};
        io.emit('sync', gameState);
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
