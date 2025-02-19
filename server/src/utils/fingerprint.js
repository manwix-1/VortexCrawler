import { logger } from './logger.js';

// Common user agents for major browsers
const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2.1 Safari/605.1.15',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
];

const viewportSizes = [
    { width: 1920, height: 1080 },
    { width: 1680, height: 1050 },
    { width: 1440, height: 900 },
    { width: 1366, height: 768 },
    { width: 1280, height: 1024 }
];

const languages = ['en-US', 'en-GB', 'en-CA', 'en-AU'];
const timezones = ['America/New_York', 'Europe/London', 'Asia/Tokyo', 'Australia/Sydney', 'Europe/Paris'];

export function generateFingerprint() {
    const userAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
    const viewport = viewportSizes[Math.floor(Math.random() * viewportSizes.length)];
    const language = languages[Math.floor(Math.random() * languages.length)];
    const timezone = timezones[Math.floor(Math.random() * timezones.length)];

    logger.debug('Generated fingerprint:', { userAgent, viewport, language, timezone });

    return {
        userAgent,
        viewport,
        language,
        timezone
    };
}

export async function applyFingerprint(client, fingerprint) {
    try {
        logger.debug('Applying browser fingerprint');

        // Set user agent
        await client.Network.setUserAgentOverride({
            userAgent: fingerprint.userAgent,
            acceptLanguage: fingerprint.language,
            platform: 'Win32'
        });

        // Set timezone
        await client.Emulation.setTimezoneOverride({
            timezoneId: fingerprint.timezone
        });

        // Set viewport
        await client.Emulation.setDeviceMetricsOverride({
            width: fingerprint.viewport.width,
            height: fingerprint.viewport.height,
            deviceScaleFactor: 1,
            mobile: false
        });

        // Randomize screen size slightly from viewport
        const screenWidth = fingerprint.viewport.width + Math.floor(Math.random() * 100);
        const screenHeight = fingerprint.viewport.height + Math.floor(Math.random() * 100);

        await client.Emulation.setScreenOrientation({
            type: 'landscapePrimary',
            angle: 0
        });

        // Set window size
        await client.Browser.setWindowBounds({
            bounds: {
                width: screenWidth,
                height: screenHeight
            }
        });

        logger.info('Browser fingerprint applied successfully');
    } catch (error) {
        logger.error('Error applying browser fingerprint:', error);
        throw error;
    }
}

export function generateTypingPattern(text) {
    // Generate natural typing speeds and patterns
    const baseDelay = 100; // Base delay between keystrokes
    const pattern = [];

    for (let i = 0; i < text.length; i++) {
        // Add natural variation to typing speed
        const speed = baseDelay + (Math.random() * 100) - 50;

        // Occasionally add longer pauses
        if (Math.random() < 0.1) {
            pattern.push(speed * 3);
        } 
        // Simulate thinking time after punctuation
        else if ('.!?,:'.includes(text[i])) {
            pattern.push(speed * 2);
        }
        // Normal typing speed with slight randomization
        else {
            pattern.push(speed);
        }

        // Occasionally add typos and corrections
        if (Math.random() < 0.05) {
            // Add a typo
            const typoChar = 'qwertyuiopasdfghjklzxcvbnm'[Math.floor(Math.random() * 26)];
            pattern.push({ type: 'typo', char: typoChar, delay: speed });
            // Add backspace
            pattern.push({ type: 'backspace', delay: speed });
            // Retype correct character
            pattern.push({ type: 'correct', char: text[i], delay: speed * 1.5 });
        }
    }

    return pattern;
}
