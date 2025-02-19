import { launchBrowser } from './utils/browser.js';
import { createCDPSession, executeJavaScript, waitForPageLoad, waitForNetworkIdle } from './controllers/cdp.js';
import { logger } from './utils/logger.js';
import { settings } from './config/settings.js';
import { simulateMouseMovement, clickElement } from './utils/mouse.js';
import { typeText, pressKey } from './utils/keyboard.js';
import {
    performGoogleSearch,
    scrollPageNaturally,
    openNewTab,
    switchToTab,
    clickRandomAd
} from './controllers/advanced_interactions.js';

async function main() {
    let browser = null;
    let cdpSession = null;

    try {
        // Launch browser instance
        logger.info('Launching browser...');
        browser = await launchBrowser(settings.browser);
        logger.info(`Browser launched successfully on port ${browser.port}`);

        // Create CDP session with extended timeout
        logger.info('Establishing CDP session...');
        cdpSession = await createCDPSession(browser.port);
        logger.info('CDP session established successfully');

        // Perform a Google search
        await performGoogleSearch(cdpSession, 'automation testing best practices');
        logger.info('Search completed, waiting for results...');
        await waitForNetworkIdle(cdpSession);

        // Scroll through results naturally
        await scrollPageNaturally(cdpSession, 3000);

        // Open a new tab and switch to it
        const newTabId = await openNewTab(cdpSession);
        await switchToTab(cdpSession, newTabId);

        // Navigate to a test page in the new tab
        logger.info('Navigating to example.com in new tab...');
        await cdpSession.Page.navigate({ url: 'https://example.com' });
        await waitForPageLoad(cdpSession);
        await waitForNetworkIdle(cdpSession);

        // Try to interact with any ads present
        await clickRandomAd(cdpSession);

    } catch (error) {
        logger.error('Error in main execution:', error);
        throw error;
    } finally {
        // Cleanup
        if (cdpSession) {
            logger.info('Closing CDP session...');
            await cdpSession.close();
        }
        if (browser) {
            logger.info('Closing browser...');
            await browser.kill();
        }
        logger.info('Cleanup completed');
    }
}

// Handle process termination
process.on('SIGINT', async () => {
    logger.info('Received SIGINT signal, shutting down...');
    process.exit(0);
});

process.on('unhandledRejection', (error) => {
    logger.error('Unhandled rejection:', error);
    process.exit(1);
});

main().catch((error) => {
    logger.error('Fatal error:', error);
    process.exit(1);
});