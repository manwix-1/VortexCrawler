import { logger } from './logger.js';
import { Bezier } from 'bezier-js';
import { settings } from '../config/settings.js';

async function getElementHandle(client, selector) {
    try {
        logger.debug(`Getting document root`);
        const { root } = await client.DOM.getDocument();

        logger.debug(`Querying for selector: ${selector}`);
        const { nodeId } = await client.DOM.querySelector({
            nodeId: root.nodeId,
            selector: selector
        });

        if (!nodeId) {
            throw new Error(`Element not found: ${selector}`);
        }

        logger.debug(`Getting box model for nodeId: ${nodeId}`);
        const { model } = await client.DOM.getBoxModel({ nodeId });

        if (!model) {
            throw new Error(`Could not get element position for: ${selector}`);
        }

        return { nodeId, model };
    } catch (error) {
        logger.error('Error getting element handle:', error);
        throw error;
    }
}

function calculateClickPoint(model) {
    try {
        // Box model coordinates are returned as [x1, y1, x2, y2, ...]
        const content = model.content;
        // Add some randomization to the click point within the element bounds
        const width = content[2] - content[0];
        const height = content[5] - content[1];
        const randomX = Math.random() * 0.6 + 0.2; // Random point between 20% and 80% of width
        const randomY = Math.random() * 0.6 + 0.2; // Random point between 20% and 80% of height

        const x = Math.floor(content[0] + (width * randomX));
        const y = Math.floor(content[1] + (height * randomY));

        logger.debug(`Calculated click point: x=${x}, y=${y}`);
        return { x, y };
    } catch (error) {
        logger.error('Error calculating click point:', error);
        throw error;
    }
}

function generateMousePath(startX, startY, endX, endY) {
    try {
        // Validate input coordinates
        if (!Number.isFinite(startX) || !Number.isFinite(startY) || 
            !Number.isFinite(endX) || !Number.isFinite(endY)) {
            throw new Error('Invalid coordinates provided for mouse path generation');
        }

        logger.debug(`Generating mouse path from (${startX}, ${startY}) to (${endX}, ${endY})`);

        // Generate control points for the Bezier curve
        const midX = (startX + endX) / 2;
        const midY = (startY + endY) / 2;

        // Add some randomness to control points
        const randomness = Math.min(Math.abs(endX - startX), Math.abs(endY - startY)) * 0.5;
        const ctrl1X = midX + (Math.random() - 0.5) * randomness;
        const ctrl1Y = midY + (Math.random() - 0.5) * randomness;
        const ctrl2X = midX + (Math.random() - 0.5) * randomness;
        const ctrl2Y = midY + (Math.random() - 0.5) * randomness;

        // Create a cubic Bezier curve
        const curve = new Bezier(
            startX, startY,
            ctrl1X, ctrl1Y,
            ctrl2X, ctrl2Y,
            endX, endY
        );

        // Calculate the number of steps based on distance and settings
        const distance = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
        const steps = Math.max(10, Math.floor(distance / 10));

        logger.debug(`Generated Bezier curve with ${steps} steps`);

        // Generate points along the curve
        const points = Array.from({ length: steps }, (_, i) => {
            const t = i / (steps - 1);
            const point = curve.get(t);
            return {
                x: Math.round(point.x),
                y: Math.round(point.y)
            };
        });

        logger.debug(`Mouse path generated successfully with ${points.length} points`);
        return points;
    } catch (error) {
        logger.error('Error generating mouse path, falling back to linear path:', error);
        // Fallback to linear path if Bezier curve fails
        const steps = 10;
        return Array.from({ length: steps }, (_, i) => ({
            x: Math.round(startX + (endX - startX) * (i / (steps - 1))),
            y: Math.round(startY + (endY - startY) * (i / (steps - 1)))
        }));
    }
}

export async function simulateMouseMovement(client, targetSelector) {
    try {
        logger.debug(`Looking for element: ${targetSelector}`);
        const element = await getElementHandle(client, targetSelector);

        if (!element || !element.model) {
            throw new Error(`Element not found or invalid: ${targetSelector}`);
        }

        const targetPoint = calculateClickPoint(element.model);
        logger.debug(`Target point calculated: (${targetPoint.x}, ${targetPoint.y})`);

        // Get current mouse position or use default starting point
        const startPoint = { x: 0, y: 0 }; // You might want to track actual mouse position
        const path = generateMousePath(startPoint.x, startPoint.y, targetPoint.x, targetPoint.y);

        // Move mouse along the path with variable speed
        for (let i = 0; i < path.length; i++) {
            const point = path[i];
            const progress = i / path.length;
            const speed = settings.mouse.movementSpeed * (0.5 + Math.sin(progress * Math.PI) * 0.5);

            await client.Input.dispatchMouseEvent({
                type: 'mouseMoved',
                x: point.x,
                y: point.y
            });

            // Add variable delay between movements
            await new Promise(resolve => setTimeout(resolve, speed));
        }

        logger.info('Mouse movement completed successfully');
        return targetPoint;
    } catch (error) {
        logger.error('Error simulating mouse movement:', error);
        throw error;
    }
}

export async function clickElement(client, selector) {
    try {
        logger.debug(`Attempting to click element: ${selector}`);
        const point = await simulateMouseMovement(client, selector);

        // Mouse down event
        await client.Input.dispatchMouseEvent({
            type: 'mousePressed',
            x: point.x,
            y: point.y,
            button: 'left',
            clickCount: 1
        });

        // Add a small random delay between press and release
        await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));

        // Mouse up event - corrected to dispatchMouseEvent
        await client.Input.dispatchMouseEvent({
            type: 'mouseReleased',
            x: point.x,
            y: point.y,
            button: 'left',
            clickCount: 1
        });

        logger.info(`Successfully clicked element: ${selector}`);
    } catch (error) {
        logger.error('Error clicking element:', error);
        throw error;
    }
}