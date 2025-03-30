const express = require("express");
const cors = require("cors");
const app = express();
const PORT = 5000;

app.use(express.json());
app.use(cors());

let devices = {}; // Store device states
let taskCounter = 0;

// Assign a new task
app.get("/task", (req, res) => {
    const clientIp = req.ip;
    const challenge = "task_" + taskCounter;
    
    // Update or create device entry
    devices[clientIp] = {
        online: true,
        lastSeen: new Date().toISOString(), // Store last seen as ISO string
        challenge,
        solution: null,
        reward: devices[clientIp]?.reward || 0 // Keep previous reward
    };

    taskCounter++;
    res.json({ challenge, difficulty: 2 });
});

// Receive solution
app.post("/submit", (req, res) => {
    const clientIp = req.ip;
    
    if (devices[clientIp]) {
        devices[clientIp].solution = req.body.solution;
        devices[clientIp].reward += 10; // Reward system
        devices[clientIp].lastSeen = new Date().toISOString(); // Update timestamp
    }
    res.json({ status: "Solution received" });
});

// Monitor device status
app.get("/status", (req, res) => {
    const now = new Date();
    
    for (const ip in devices) {
        const lastSeen = new Date(devices[ip].lastSeen);
        const timeDiff = (now - lastSeen) / 1000; // Convert ms to seconds
        
        devices[ip].online = timeDiff <= 10; // If inactive for 10s, mark offline
    }
    
    res.json(devices);
});

// Serve UI
app.get("/", (req, res) => {
    let html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>ESP32 Crypto Network</title>
        <style>
            body { font-family: Arial, sans-serif; background: #222; color: #ddd; text-align: center; padding: 20px; }
            table { width: 80%; margin: auto; border-collapse: collapse; }
            th, td { padding: 10px; border: 1px solid #444; }
            th { background: #444; }
            .online { color: lime; font-weight: bold; }
            .offline { color: red; font-weight: bold; }
        </style>
        <script>
            async function fetchData() {
                const res = await fetch('/status');
                const data = await res.json();
                
                let tableHTML = '<table><tr><th>ESP32 ID</th><th>Last Solution</th><th>Last Active</th><th>Reward</th><th>Status</th></tr>';
                
                for (const ip in data) {
                    const device = data[ip];
                    const statusClass = device.online ? "online" : "offline";
                    tableHTML += 
                        '<tr>' +
                        '<td>' + ip + '</td>' +
                        '<td>' + (device.solution || "N/A") + '</td>' +
                        '<td>' + device.lastSeen + '</td>' +
                        '<td>' + device.reward + '</td>' +
                        '<td class="' + statusClass + '">' + (device.online ? "Online" : "Offline") + '</td>' +
                        '</tr>';
                }
                
                tableHTML += '</table>';
                document.getElementById('deviceTable').innerHTML = tableHTML;
            }

            setInterval(fetchData, 5000); // Refresh every 5 sec
            window.onload = fetchData;
        </script>
    </head>
    <body>
        <h1>ESP32 Crypto Network</h1>
        <div id="deviceTable">Loading...</div>
    </body>
    </html>
    `;
    res.send(html);
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
