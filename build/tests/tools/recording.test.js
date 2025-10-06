/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import assert from 'node:assert';
import { describe, it } from 'node:test';
import { recordStart, recordStop } from '../../src/tools/recording.js';
import { withBrowser } from '../utils.js';
describe('recording', () => {
    describe('record_start', () => {
        it('starts recording', async () => {
            await withBrowser(async (response, context) => {
                const page = context.getSelectedPage();
                await page.goto('about:blank');
                await recordStart.handler({
                    params: {
                        format: 'webm',
                        fps: 30,
                        quality: 30,
                        scale: 1,
                        speed: 1,
                    },
                }, response, context);
                assert.equal(response.responseLines.length, 2);
                assert(response.responseLines[0]?.includes('Started recording screencast in webm format at 30 FPS'));
                // Stop the recording to clean up
                await recordStop.handler({ params: {} }, response, context);
            });
        });
        it('starts recording with custom parameters', async () => {
            await withBrowser(async (response, context) => {
                const page = context.getSelectedPage();
                await page.goto('about:blank');
                await recordStart.handler({
                    params: {
                        format: 'gif',
                        fps: 15,
                        quality: 20,
                        scale: 0.5,
                        speed: 2,
                    },
                }, response, context);
                assert.equal(response.responseLines.length, 2);
                assert(response.responseLines[0]?.includes('Started recording screencast in gif format at 15 FPS'));
                // Stop the recording to clean up
                await recordStop.handler({ params: {} }, response, context);
            });
        });
        it('errors when trying to start recording while one is already active', async () => {
            await withBrowser(async (response, context) => {
                const page = context.getSelectedPage();
                await page.goto('about:blank');
                // Start first recording
                await recordStart.handler({
                    params: {
                        format: 'webm',
                        fps: 30,
                        quality: 30,
                        scale: 1,
                        speed: 1,
                    },
                }, response, context);
                // Try to start second recording
                try {
                    await recordStart.handler({
                        params: {
                            format: 'webm',
                            fps: 30,
                            quality: 30,
                            scale: 1,
                            speed: 1,
                        },
                    }, response, context);
                    assert.fail('Expected error was not thrown');
                }
                catch (error) {
                    assert(error instanceof Error);
                    assert(error.message.includes('A recording is already in progress'));
                }
                // Stop the recording to clean up
                await recordStop.handler({ params: {} }, response, context);
            });
        });
    });
    describe('record_stop', () => {
        it('stops recording', async () => {
            await withBrowser(async (response, context) => {
                const page = context.getSelectedPage();
                await page.goto('about:blank');
                // Start recording first
                await recordStart.handler({
                    params: {
                        format: 'webm',
                        fps: 30,
                        quality: 30,
                        scale: 1,
                        speed: 1,
                    },
                }, response, context);
                // Stop recording
                await recordStop.handler({ params: {} }, response, context);
                assert(response.responseLines.some(line => line.includes('Screencast recording stopped successfully')));
            });
        });
        it('errors when trying to stop recording when none is active', async () => {
            await withBrowser(async (response, context) => {
                const page = context.getSelectedPage();
                await page.goto('about:blank');
                try {
                    await recordStop.handler({ params: {} }, response, context);
                    assert.fail('Expected error was not thrown');
                }
                catch (error) {
                    assert(error instanceof Error);
                    assert(error.message.includes('No recording is currently in progress'));
                }
            });
        });
    });
});
