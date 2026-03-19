const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const path = require('path');

// 儲存所有格子的狀態，格式為 {"f1-t1": "#hexColor", "f2-t3": "#hexColor"}
let gameState = {};

// 定義四位玩家的代表色：紅、藍、黃、紫
const PLAYER_COLORS = ['#e74c3c', '#3498db', '#f1c40f', '#9b59b6'];
let colorIndex = 0;

app.use(express.static(__dirname));

// 路由設定
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Socket.io 通訊邏輯
io.on('connection', (socket) => {
    // 1. 分配顏色給新連線的玩家
    const myColor = PLAYER_COLORS[colorIndex % PLAYER_COLORS.length];
    colorIndex++;
    socket.emit('assignColor', myColor);

    // 2. 發送目前盤面狀態給新玩家
    socket.emit('sync', gameState);

    // 3. 處理點擊事件
    socket.on('click', (data) => {
        const { floor, tile, color } = data;
        const key = `f${floor}-${tile}`;

        // 如果這格已經是「我的顏色」，就取消選取 (變回白色)
        // 如果這格是空的或是別人的顏色，就標記為我的顏色
        if (gameState[key] === color) {
            delete gameState[key];
        } else {
            gameState[key] = color;
        }
        
        // 廣播最新狀態給所有人
        io.emit('sync', gameState);
    });

    // 4. 處理重置事件
    socket.on('reset', () => {
        gameState = {};
        io.emit('sync', gameState);
    });

    socket.on('disconnect', () => {
        console.log('一位玩家已離線');
    });
});

// 自動偵測環境變數 Port (Render 專用)
const PORT = process.env.PORT || 3000;
http.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
});
