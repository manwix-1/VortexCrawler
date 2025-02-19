import CDP from 'chrome-remote-interface';
import { logger } from '../utils/logger.js';

const DEFAULT_TIMEOUT = 30000;
const MAX_RETRIES = 3;

class NetworkRequestCounter {
    constructor() {
        this._count = 0;
    }

    increment() {
        this._count++;
        return this._count;
    }

    decrement() {
        this._count = Math.max(0, this._count - 1);
        return this._count;
    }

    get count() {
        return this._count;
    }

    reset() {
        this._count = 0;
    }
}

async function retryOperation(operation, maxRetries = MAX_RETRIES) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            if (attempt === maxRetries) throw error;
            logger.warn(`Operation failed, attempt ${attempt}/${maxRetries}. Retrying...`, error);
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
    }
}

export async function createCDPSession(port) {
    try {
        logger.debug(`Attempting to create CDP session on port ${port}`);
        const client = await CDP({
            port,
            domains: ['Network', 'Page', 'DOM', 'Runtime', 'Input']
        });

        client.on('error', (err) => {
            logger.error('CDP Error:', err);
        });

        client.on('disconnect', () => {
            logger.info('CDP disconnected');
        });

        logger.debug('Enabling CDP domains...');
        await Promise.all([
            client.Network.enable(),
            client.Page.enable(),
            client.DOM.enable(),
            client.Runtime.enable()
        ]);
        logger.info('All CDP domains enabled successfully');

        return client;
    } catch (error) {
        logger.error('Error creating CDP session:', error);
        throw error;
    }
}

export async function waitForDOMReady(client, timeout = DEFAULT_TIMEOUT) {
    return await retryOperation(async () => {
        try {
            logger.debug('Waiting for DOM to be ready');
            const result = await executeJavaScript(client, `
                new Promise((resolve) => {
                    if (document.readyState === 'complete') {
                        resolve(true);
                    } else {
                        document.addEventListener('DOMContentLoaded', () => resolve(true));
                    }
                })
            `, timeout);
            logger.info('DOM is ready');
            return result;
        } catch (error) {
            logger.error('Error waiting for DOM ready:', error);
            throw error;
        }
    });
}

export async function executeJavaScript(client, script, timeout = DEFAULT_TIMEOUT) {
    return await retryOperation(async () => {
        try {
            logger.debug(`Executing JavaScript with timeout ${timeout}ms: ${script}`);
            const result = await Promise.race([
                client.Runtime.evaluate({
                    expression: script,
                    returnByValue: true,
                    awaitPromise: true
                }),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('JavaScript execution timeout')), timeout)
                )
            ]);

            if (result.exceptionDetails) {
                throw new Error(`JavaScript execution failed: ${result.exceptionDetails.text}`);
            }

            logger.debug('JavaScript execution result:', result.result.value);
            return result.result.value;
        } catch (error) {
            logger.error('Error executing JavaScript:', error);
            throw error;
        }
    });
}

export async function waitForPageLoad(client, timeout = DEFAULT_TIMEOUT) {
    return await retryOperation(async () => {
        try {
            logger.debug(`Waiting for page load with timeout: ${timeout}ms`);
            await Promise.race([
                new Promise((resolve) => {
                    client.Page.loadEventFired(() => resolve());
                }),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Page load timeout')), timeout)
                )
            ]);
            await waitForDOMReady(client);
            logger.info('Page loaded successfully');
        } catch (error) {
            logger.error('Error waiting for page load:', error);
            throw error;
        }
    });
}

export async function waitForNetworkIdle(client, maxInflightRequests = 0, timeout = DEFAULT_TIMEOUT) {
    return await retryOperation(async () => {
        try {
            logger.debug(`Waiting for network idle (max ${maxInflightRequests} requests) with timeout: ${timeout}ms`);
            const requestCounter = new NetworkRequestCounter();
            let resolveIdle;
            const idlePromise = new Promise(resolve => { resolveIdle = resolve; });

            const checkIdle = () => {
                if (requestCounter.count <= maxInflightRequests) {
                    resolveIdle();
                }
            };

            const onRequestStarted = () => {
                const count = requestCounter.increment();
                logger.debug(`Network request started. Current requests: ${count}`);
            };

            const onRequestFinished = () => {
                const count = requestCounter.decrement();
                logger.debug(`Network request finished. Current requests: ${count}`);
                checkIdle();
            };

            client.Network.requestWillBeSent(() => onRequestStarted());
            client.Network.loadingFinished(() => onRequestFinished());
            client.Network.loadingFailed(() => onRequestFinished());

            await Promise.race([
                idlePromise,
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Network idle timeout')), timeout)
                )
            ]);

            logger.info('Network is idle');
            requestCounter.reset();
        } catch (error) {
            logger.error('Error waiting for network idle:', error);
            throw error;
        }
    });
}

export async function waitForElement(client, selector, timeout = DEFAULT_TIMEOUT) {
    return await retryOperation(async () => {
        try {
            logger.debug(`Waiting for element: ${selector} with timeout: ${timeout}ms`);
            const startTime = Date.now();

            while (Date.now() - startTime < timeout) {
                try {
                    const { root } = await client.DOM.getDocument();
                    const { nodeId } = await client.DOM.querySelector({
                        nodeId: root.nodeId,
                        selector: selector
                    });

                    if (nodeId) {
                        const { model } = await client.DOM.getBoxModel({ nodeId });
                        if (model) {
                            logger.info(`Element ${selector} found and visible`);
                            return true;
                        }
                    }
                } catch (error) {
                    logger.debug(`Element not found in current attempt: ${error.message}`);
                }

                await new Promise(resolve => setTimeout(resolve, 100));
            }

            throw new Error(`Timeout waiting for element: ${selector}`);
        } catch (error) {
            logger.error(`Error waiting for element ${selector}:`, error);
            throw error;
        }
    });
}

export async function captureScreenshot(client, options = {}) {
    return await retryOperation(async () => {
        try {
            logger.debug('Capturing screenshot with options:', options);
            const { data } = await client.Page.captureScreenshot(options);
            logger.info('Screenshot captured successfully');
            return Buffer.from(data, 'base64');
        } catch (error) {
            logger.error('Error capturing screenshot:', error);
            throw error;
        }
    });
}