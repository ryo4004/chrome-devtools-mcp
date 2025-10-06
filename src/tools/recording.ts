/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type {ScreenRecorder} from 'puppeteer-core';
import z from 'zod';

import {ToolCategories} from './categories.js';
import {defineTool} from './ToolDefinition.js';

let activeRecorder: ScreenRecorder | null = null;

export const recordStart = defineTool({
  name: 'record_start',
  description: 'Start recording a screencast of the current page.',
  annotations: {
    category: ToolCategories.DEBUGGING,
    readOnlyHint: false,
  },
  schema: {
    filePath: z
      .string()
      .optional()
      .describe(
        'The absolute path, or a path relative to the current working directory, to save the recording to. If not provided, a temporary file will be created.',
      ),
    format: z
      .enum(['webm', 'gif'])
      .default('webm')
      .describe('Output file format. Default is "webm".'),
    fps: z
      .number()
      .min(1)
      .max(60)
      .default(30)
      .describe('Frame rate in frames per second. Default is 30 (20 for GIF).'),
    quality: z
      .number()
      .min(1)
      .max(51)
      .default(30)
      .describe('Recording quality (Constant Rate Factor). Lower values mean better quality. Default is 30.'),
    scale: z
      .number()
      .min(0.1)
      .max(2)
      .default(1)
      .describe('Scales output video dimensions. Default is 1.'),
    speed: z
      .number()
      .min(0.1)
      .max(10)
      .default(1)
      .describe('Recording playback speed. Default is 1.'),
  },
  handler: async (request, response, context) => {
    if (activeRecorder) {
      throw new Error('A recording is already in progress. Stop the current recording before starting a new one.');
    }

    const page = context.getSelectedPage();
    
    const options: any = {
      format: request.params.format,
      fps: request.params.format === 'gif' ? Math.min(request.params.fps, 20) : request.params.fps,
      quality: request.params.quality,
      scale: request.params.scale,
      speed: request.params.speed,
    };

    if (request.params.filePath) {
      options.path = request.params.filePath;
    }

    try {
      activeRecorder = await page.screencast(options);
      response.appendResponseLine(
        `Started recording screencast in ${request.params.format} format at ${options.fps} FPS.`
      );
      if (request.params.filePath) {
        response.appendResponseLine(`Recording will be saved to: ${request.params.filePath}`);
      } else {
        response.appendResponseLine('Recording will be saved to a temporary file.');
      }
    } catch (error) {
      throw new Error(`Failed to start recording: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
});

export const recordStop = defineTool({
  name: 'record_stop',
  description: 'Stop the current screencast recording.',
  annotations: {
    category: ToolCategories.DEBUGGING,
    readOnlyHint: false,
  },
  schema: {},
  handler: async (_request, response, _context) => {
    if (!activeRecorder) {
      throw new Error('No recording is currently in progress.');
    }

    try {
      await activeRecorder.stop();
      response.appendResponseLine('Screencast recording stopped successfully.');
      activeRecorder = null;
    } catch (error) {
      activeRecorder = null;
      throw new Error(`Failed to stop recording: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
});