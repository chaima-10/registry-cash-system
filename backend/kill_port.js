const { exec } = require('child_process');

const PORT = 5000;

const command = process.platform === 'win32'
    ? `netstat -ano | findstr :${PORT}`
    : `lsof -i :${PORT} -t`;

exec(command, (err, stdout, stderr) => {
    if (err) {
        console.log(`Port ${PORT} is free.`);
        return;
    }

    const lines = stdout.trim().split('\n');
    lines.forEach(line => {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1]; // PID is the last element in windows netstat

        if (pid && !isNaN(pid)) {
            console.log(`Killing process ${pid} on port ${PORT}...`);
            exec(`taskkill /PID ${pid} /F`, (killErr) => {
                if (killErr) {
                    console.error(`Failed to kill process ${pid}:`, killErr.message);
                } else {
                    console.log(`Process ${pid} killed.`);
                }
            });
        }
    });
});
