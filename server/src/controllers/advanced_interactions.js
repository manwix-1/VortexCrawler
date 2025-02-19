import { logger } from '../utils/logger.js';
import { executeJavaScript, waitForNetworkIdle, waitForElement, waitForPageLoad, waitForDOMReady } from './cdp.js';
import { typeText, pressKey } from '../utils/keyboard.js';
import { simulateMouseMovement, clickElement } from '../utils/mouse.js';

export async function performGoogleSearch(client, searchQuery) {
    try {
        logger.info(`Initiating Google search for: ${searchQuery}`);

        // Step 1: Navigate to Google
        logger.debug('Navigating to Google homepage');
        await client.Page.navigate({ url: 'https://www.google.com' });

        // Step 2: Wait for complete page load with extended timeout
        try {
            await waitForPageLoad(client, 45000);
            logger.debug('Page load complete, waiting for network idle');
            await waitForNetworkIdle(client, 0, 45000);
        } catch (loadError) {
            logger.error('Error during page load:', loadError);
            // Attempt recovery by refreshing the page
            logger.info('Attempting page refresh...');
            await client.Page.reload();
            await waitForPageLoad(client, 45000);
        }

        // Step 3: Additional DOM readiness check with retry
        let domReady = false;
        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                await waitForDOMReady(client);
                domReady = true;
                break;
            } catch (domError) {
                logger.warn(`DOM ready check failed (attempt ${attempt}/3):`, domError);
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        if (!domReady) {
            throw new Error('Failed to verify DOM readiness after multiple attempts');
        }

        logger.debug('DOM is ready and interactive');

        // Step 4: Locate and verify search input with extended timeout
        logger.debug('Locating search input field');
        const searchInputExists = await waitForElement(client, 'input[name="q"]', 45000);

        if (!searchInputExists) {
            throw new Error('Search input element not found after extended waiting period');
        }

        // Step 5: Prepare for input interaction
        logger.debug('Moving mouse to search input');
        await simulateMouseMovement(client, 'input[name="q"]');

        // Add a small delay before clicking
        await new Promise(resolve => setTimeout(resolve, 500));

        logger.debug('Clicking search input');
        await clickElement(client, 'input[name="q"]');

        // Add a small delay before typing
        await new Promise(resolve => setTimeout(resolve, 300));

        // Step 6: Enter search query with natural timing
        logger.debug(`Typing search query: ${searchQuery}`);
        await typeText(client, searchQuery, Math.random() * 100 + 50);

        // Add a small delay before pressing Enter
        await new Promise(resolve => setTimeout(resolve, 200));

        logger.debug('Pressing Enter to submit search');
        await pressKey(client, 'Enter');

        // Step 7: Wait for search results with extended timeout
        logger.info('Search query submitted, waiting for results');
        try {
            await waitForPageLoad(client, 45000);
            await waitForNetworkIdle(client, 0, 45000);
        } catch (resultError) {
            logger.error('Error waiting for search results:', resultError);
            throw new Error('Failed to load search results: ' + resultError.message);
        }

        // Verify search results loaded
        const resultsExist = await waitForElement(client, '#search');
        if (!resultsExist) {
            throw new Error('Search results not found after query submission');
        }

        logger.info('Search completed successfully');
        return true;
    } catch (error) {
        logger.error('Error performing Google search:', error);
        // Provide detailed error context
        throw new Error(`Google search failed: ${error.message}`);
    }
}

export async function scrollPageNaturally(client, duration = 5000) {
    try {
        logger.debug('Initiating natural scroll behavior');

        const scrollScript = `
            function smoothScroll(duration) {
                return new Promise((resolve) => {
                    const start = window.pageYOffset;
                    const distance = document.documentElement.scrollHeight - window.innerHeight - start;
                    const startTime = performance.now();

                    function scrollStep(timestamp) {
                        const currentTime = timestamp - startTime;
                        const progress = Math.min(currentTime / duration, 1);

                        // Easing function for natural feel
                        const easing = t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

                        window.scrollTo(0, start + distance * easing(progress));

                        if (progress < 1) {
                            window.requestAnimationFrame(scrollStep);
                        } else {
                            resolve();
                        }
                    }

                    window.requestAnimationFrame(scrollStep);
                });
            }
            smoothScroll(${duration});
        `;

        await executeJavaScript(client, scrollScript);
        await waitForNetworkIdle(client);
        logger.info('Natural scroll completed');
    } catch (error) {
        logger.error('Error during natural scrolling:', error);
        throw error;
    }
}

export async function openNewTab(client) {
    try {
        logger.info('Opening new tab');
        const { targetId } = await client.Target.createTarget({
            url: 'about:blank'
        });

        logger.debug(`New tab created with target ID: ${targetId}`);
        return targetId;
    } catch (error) {
        logger.error('Error opening new tab:', error);
        throw error;
    }
}

export async function switchToTab(client, targetId) {
    try {
        logger.debug(`Switching to tab with target ID: ${targetId}`);
        await client.Target.activateTarget({ targetId });

        // Ensure the tab is ready
        await waitForDOMReady(client);
        logger.info('Tab switch completed');
    } catch (error) {
        logger.error('Error switching tabs:', error);
        throw error;
    }
}

export async function clickRandomAd(client) {
    try {
        logger.info('Looking for advertisement elements');

        const adSelectors = [
            'div[id*="google_ads"]',
            'iframe[id*="google_ads"]',
            'div[class*="ad-"]',
            'div[class*="advertisement"]'
        ];

        for (const selector of adSelectors) {
            try {
                // Try to find ad element with a short timeout
                if (await waitForElement(client, selector, 5000)) {
                    await simulateMouseMovement(client, selector);
                    await clickElement(client, selector);
                    logger.info(`Successfully clicked ad with selector: ${selector}`);
                    return true;
                }
            } catch (error) {
                logger.debug(`No ad found with selector: ${selector}`);
                continue;
            }
        }

        logger.info('No clickable ads found on the page');
        return false;
    } catch (error) {
        logger.error('Error interacting with ads:', error);
        throw error;
    }
}