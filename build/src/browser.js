/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
let browser;
const ignoredPrefixes = new Set([
    'chrome://',
    'chrome-extension://',
    'chrome-untrusted://',
    'devtools://',
]);
function targetFilter(target) {
    if (target.url() === 'chrome://newtab/') {
        return true;
    }
    for (const prefix of ignoredPrefixes) {
        if (target.url().startsWith(prefix)) {
            return false;
        }
    }
    return true;
}
const connectOptions = {
    targetFilter,
    // We do not expect any single CDP command to take more than 10sec.
    protocolTimeout: 10_000,
};
export async function ensureBrowserConnected(browserURL) {
    if (browser?.connected) {
        return browser;
    }
    browser = await puppeteer.connect({
        ...connectOptions,
        browserURL,
        defaultViewport: null,
    });
    return browser;
}
export async function launch(options) {
    const { channel, executablePath, customDevTools, headless, isolated } = options;
    const profileDirName = channel && channel !== 'stable'
        ? `chrome-profile-${channel}`
        : 'chrome-profile';
    let userDataDir = options.userDataDir;
    if (!isolated && !userDataDir) {
        userDataDir = path.join(os.homedir(), '.cache', 'chrome-devtools-mcp', profileDirName);
        await fs.promises.mkdir(userDataDir, {
            recursive: true,
        });
    }
    const args = [
        ...(options.args ?? []),
        '--hide-crash-restore-bubble',
    ];
    if (customDevTools) {
        args.push(`--custom-devtools-frontend=file://${customDevTools}`);
    }
    let puppeteerChannel;
    if (!executablePath) {
        puppeteerChannel =
            channel && channel !== 'stable'
                ? `chrome-${channel}`
                : 'chrome';
    }
    try {
        const browser = await puppeteer.launch({
            ...connectOptions,
            channel: puppeteerChannel,
            executablePath,
            defaultViewport: null,
            userDataDir,
            pipe: true,
            headless,
            args,
            acceptInsecureCerts: options.acceptInsecureCerts,
        });
        if (options.logFile) {
            // FIXME: we are probably subscribing too late to catch startup logs. We
            // should expose the process earlier or expose the getRecentLogs() getter.
            browser.process()?.stderr?.pipe(options.logFile);
            browser.process()?.stdout?.pipe(options.logFile);
        }
        if (options.viewport) {
            const [page] = await browser.pages();
            // @ts-expect-error internal API for now.
            await page?.resize({
                contentWidth: options.viewport.width,
                contentHeight: options.viewport.height,
            });
        }
        return browser;
    }
    catch (error) {
        if (userDataDir &&
            (error.message.includes('The browser is already running') ||
                error.message.includes('Target closed') ||
                error.message.includes('Connection closed'))) {
            throw new Error(`The browser is already running for ${userDataDir}. Use --isolated to run multiple browser instances.`, {
                cause: error,
            });
        }
        throw error;
    }
}
export async function ensureBrowserLaunched(options) {
    if (browser?.connected) {
        return browser;
    }
    browser = await launch(options);
    return browser;
}
