import * as chromeLauncher from 'chrome-launcher';
import ProxyChain from 'proxy-chain';
import { settings } from '../config/settings.js';
import { logger } from './logger.js';
import { execSync } from 'child_process';
import { generateFingerprint, applyFingerprint } from './fingerprint.js';
import CDP from 'chrome-remote-interface';

function findChromiumPath() {
    try {
        const chromePath = execSync('which chromium').toString().trim();
        logger.info(`Found Chromium at: ${chromePath}`);
        return chromePath;
    } catch (error) {
        logger.error('Failed to find Chromium executable:', error);
        throw new Error('Chromium executable not found. Please ensure Chromium is installed.');
    }
}

export async function launchBrowser(options = {}) {
    try {
        const chromePath = findChromiumPath();
        const fingerprint = generateFingerprint();

        let launchOptions = {
            ...settings.browser,
            port: 0, // Use any available port
            chromeFlags: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--headless=new',
                '--disable-software-rasterizer',
                '--no-zygote',
                '--single-process',
                '--remote-debugging-address=0.0.0.0',
                `--window-size=${fingerprint.viewport.width},${fingerprint.viewport.height}`,
                `--user-agent=${fingerprint.userAgent}`,
                `--lang=${fingerprint.language}`,
                '--disable-blink-features=AutomationControlled',
                '--disable-webgl',
                '--disable-debugger-auto-attach'
            ],
            startingUrl: 'about:blank',
            connectionPollInterval: 1000,
            maxConnectionRetries: 10,
            chromePath,
            ...options
        };

        if (settings.proxy.enabled) {
            try {
                const proxyUrl = await ProxyChain.anonymizeProxy(settings.proxy.server);
                launchOptions.chromeFlags.push(`--proxy-server=${proxyUrl}`);
                logger.info('Proxy configured successfully');
            } catch (proxyError) {
                logger.error('Failed to configure proxy:', proxyError);
                throw proxyError;
            }
        }

        logger.debug('Launching Chrome with options:', launchOptions);
        const chrome = await chromeLauncher.launch(launchOptions);
        logger.info(`Chrome launched on port ${chrome.port}`);

        // Create CDP client and apply fingerprint
        const client = await CDP({ port: chrome.port });
        await applyFingerprint(client, fingerprint);

        // Add event handlers for graceful shutdown
        process.on('SIGINT', () => closeBrowser({chrome, client}));
        process.on('SIGTERM', () => closeBrowser({chrome, client}));

        return { chrome, client };
    } catch (error) {
        logger.error('Error launching browser:', error);
        throw error;
    }
}

export async function closeBrowser(browser) {
    try {
        if (browser) {
            if (browser.client) {
                await browser.client.close();
            }
            await browser.chrome.kill();
            logger.info('Browser closed successfully');
        }
    } catch (error) {
        logger.error('Error closing browser:', error);
        throw error;
    }
}

export async function restartBrowser(browser, options = {}) {
    try {
        logger.info('Restarting browser...');
        await closeBrowser(browser);
        return await launchBrowser(options);
    } catch (error) {
        logger.error('Error restarting browser:', error);
        throw error;
    }
}