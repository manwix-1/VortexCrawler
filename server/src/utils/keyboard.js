import { logger } from './logger.js';
import { generateTypingPattern } from './fingerprint.js';

export async function typeText(client, text, options = {}) {
    try {
        logger.debug(`Preparing to type text: ${text}`);
        const pattern = generateTypingPattern(text);

        for (const item of pattern) {
            if (typeof item === 'number') {
                // Regular character typing with natural delay
                const char = text[0];
                text = text.slice(1);

                await client.Input.dispatchKeyEvent({
                    type: 'keyDown',
                    text: char,
                    unmodifiedText: char,
                    key: char,
                    code: `Key${char.toUpperCase()}`,
                    windowsVirtualKeyCode: char.charCodeAt(0)
                });

                await client.Input.dispatchKeyEvent({
                    type: 'keyUp',
                    text: char,
                    unmodifiedText: char,
                    key: char,
                    code: `Key${char.toUpperCase()}`,
                    windowsVirtualKeyCode: char.charCodeAt(0)
                });

                await new Promise(resolve => setTimeout(resolve, item));
            } else {
                // Handle special typing patterns (typos, corrections)
                if (item.type === 'typo' || item.type === 'correct') {
                    await client.Input.dispatchKeyEvent({
                        type: 'keyDown',
                        text: item.char,
                        unmodifiedText: item.char,
                        key: item.char,
                        code: `Key${item.char.toUpperCase()}`,
                        windowsVirtualKeyCode: item.char.charCodeAt(0)
                    });

                    await client.Input.dispatchKeyEvent({
                        type: 'keyUp',
                        text: item.char,
                        unmodifiedText: item.char,
                        key: item.char,
                        code: `Key${item.char.toUpperCase()}`,
                        windowsVirtualKeyCode: item.char.charCodeAt(0)
                    });
                } else if (item.type === 'backspace') {
                    await pressKey(client, 'Backspace');
                }

                await new Promise(resolve => setTimeout(resolve, item.delay));
            }
        }

        logger.info('Text input completed with natural typing pattern');
    } catch (error) {
        logger.error('Error typing text:', error);
        throw error;
    }
}

export async function pressKey(client, key, modifiers = []) {
    try {
        logger.debug(`Pressing key: ${key} with modifiers: ${modifiers}`);

        const keyMap = {
            'Enter': { code: 'Enter', keyCode: 13 },
            'Tab': { code: 'Tab', keyCode: 9 },
            'Backspace': { code: 'Backspace', keyCode: 8 },
            'Delete': { code: 'Delete', keyCode: 46 },
            'Escape': { code: 'Escape', keyCode: 27 },
            'ArrowLeft': { code: 'ArrowLeft', keyCode: 37 },
            'ArrowRight': { code: 'ArrowRight', keyCode: 39 },
            'ArrowUp': { code: 'ArrowUp', keyCode: 38 },
            'ArrowDown': { code: 'ArrowDown', keyCode: 40 }
        };

        const keyDetails = keyMap[key] || { 
            code: `Key${key.toUpperCase()}`, 
            keyCode: key.charCodeAt(0)
        };

        // Add random delay before key press
        await new Promise(resolve => setTimeout(resolve, Math.random() * 50 + 20));

        for (const modifier of modifiers) {
            await client.Input.dispatchKeyEvent({
                type: 'keyDown',
                modifiers: 1,
                text: '',
                key: modifier,
                code: `Key${modifier.toUpperCase()}`
            });
        }

        await client.Input.dispatchKeyEvent({
            type: 'keyDown',
            text: key.length === 1 ? key : '',
            key: key,
            code: keyDetails.code,
            windowsVirtualKeyCode: keyDetails.keyCode
        });

        // Random delay between down and up events
        await new Promise(resolve => setTimeout(resolve, Math.random() * 30 + 10));

        await client.Input.dispatchKeyEvent({
            type: 'keyUp',
            text: key.length === 1 ? key : '',
            key: key,
            code: keyDetails.code,
            windowsVirtualKeyCode: keyDetails.keyCode
        });

        for (const modifier of modifiers.reverse()) {
            await client.Input.dispatchKeyEvent({
                type: 'keyUp',
                modifiers: 1,
                text: '',
                key: modifier,
                code: `Key${modifier.toUpperCase()}`
            });
        }

        logger.info(`Key ${key} pressed successfully`);
    } catch (error) {
        logger.error('Error pressing key:', error);
        throw error;
    }
}