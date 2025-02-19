export const settings = {
    browser: {
        headless: false, // Run in headless mode for Replit
        defaultViewport: {
            width: 1920,
            height: 1080
        },
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--disable-gpu',
            '--headless=new',
            '--remote-debugging-address=0.0.0.0',
            '--disable-software-rasterizer',
            '--disable-dev-tools',
            '--no-zygote',
            '--single-process'
        ]
    },
    proxy: {
        enabled: false,
        server: 'http://proxy.example.com:8080'
    },
    mouse: {
        naturalMovements: true,
        movementSpeed: 1000
    },
    debugging: {
        enabled: true,
        logLevel: 'debug' // Changed from 'info' to 'debug' for more detailed logging
    }
};