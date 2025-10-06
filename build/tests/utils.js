/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import logger from 'debug';
import puppeteer from 'puppeteer';
import { McpContext } from '../src/McpContext.js';
import { McpResponse } from '../src/McpResponse.js';
let browser;
export async function withBrowser(cb, options = {}) {
    const { debug = false } = options;
    if (!browser) {
        browser = await puppeteer.launch({
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
            headless: !debug,
            defaultViewport: null,
        });
    }
    const newPage = await browser.newPage();
    // Close other pages.
    await Promise.all((await browser.pages()).map(async (page) => {
        if (page !== newPage) {
            await page.close();
        }
    }));
    const response = new McpResponse();
    const context = await McpContext.from(browser, logger('test'));
    await cb(response, context);
}
export function getMockRequest(options = {}) {
    return {
        url() {
            return 'http://example.com';
        },
        method() {
            return options.method ?? 'GET';
        },
        response() {
            return options.response ?? null;
        },
        failure() {
            return options.failure?.() ?? null;
        },
        resourceType() {
            return options.resourceType ?? 'document';
        },
        headers() {
            return {
                'content-size': '10',
            };
        },
        redirectChain() {
            return [];
        },
    };
}
export function getMockResponse(options = {}) {
    return {
        status() {
            return options.status ?? 200;
        },
    };
}
export function html(strings, ...values) {
    const bodyContent = strings.reduce((acc, str, i) => {
        return acc + str + (values[i] || '');
    }, '');
    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>My test page</title>
  </head>
  <body>
    ${bodyContent}
  </body>
</html>`;
}
