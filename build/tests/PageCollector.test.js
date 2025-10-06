/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import assert from 'node:assert';
import { describe, it } from 'node:test';
import { PageCollector } from '../src/PageCollector.js';
import { getMockRequest } from './utils.js';
function mockListener() {
    const listeners = {};
    return {
        on(eventName, listener) {
            if (listeners[eventName]) {
                listeners[eventName].push(listener);
            }
            else {
                listeners[eventName] = [listener];
            }
        },
        emit(eventName, data) {
            for (const listener of listeners[eventName] ?? []) {
                listener(data);
            }
        },
    };
}
function getMockPage() {
    const mainFrame = {};
    return {
        mainFrame() {
            return mainFrame;
        },
        ...mockListener(),
    };
}
function getMockBrowser() {
    const pages = [getMockPage()];
    return {
        pages() {
            return Promise.resolve(pages);
        },
        ...mockListener(),
    };
}
describe('PageCollector', () => {
    it('works', async () => {
        const browser = getMockBrowser();
        const page = (await browser.pages())[0];
        const request = getMockRequest();
        const collector = new PageCollector(browser, (page, collect) => {
            page.on('request', req => {
                collect(req);
            });
        });
        await collector.init();
        page.emit('request', request);
        assert.equal(collector.getData(page)[0], request);
    });
    it('clean up after navigation', async () => {
        const browser = getMockBrowser();
        const page = (await browser.pages())[0];
        const mainFrame = page.mainFrame();
        const request = getMockRequest();
        const collector = new PageCollector(browser, (page, collect) => {
            page.on('request', req => {
                collect(req);
            });
        });
        await collector.init();
        page.emit('request', request);
        assert.equal(collector.getData(page)[0], request);
        page.emit('framenavigated', mainFrame);
        assert.equal(collector.getData(page).length, 0);
    });
    it('does not clean up after sub frame navigation', async () => {
        const browser = getMockBrowser();
        const page = (await browser.pages())[0];
        const request = getMockRequest();
        const collector = new PageCollector(browser, (page, collect) => {
            page.on('request', req => {
                collect(req);
            });
        });
        await collector.init();
        page.emit('request', request);
        page.emit('framenavigated', {});
        assert.equal(collector.getData(page).length, 1);
    });
    it('clean up after navigation and be able to add data after', async () => {
        const browser = getMockBrowser();
        const page = (await browser.pages())[0];
        const mainFrame = page.mainFrame();
        const request = getMockRequest();
        const collector = new PageCollector(browser, (page, collect) => {
            page.on('request', req => {
                collect(req);
            });
        });
        await collector.init();
        page.emit('request', request);
        assert.equal(collector.getData(page)[0], request);
        page.emit('framenavigated', mainFrame);
        assert.equal(collector.getData(page).length, 0);
        page.emit('request', request);
        assert.equal(collector.getData(page).length, 1);
    });
    it('should only subscribe once', async () => {
        const browser = getMockBrowser();
        const page = (await browser.pages())[0];
        const request = getMockRequest();
        const collector = new PageCollector(browser, (pageListener, collect) => {
            pageListener.on('request', req => {
                collect(req);
            });
        });
        await collector.init();
        browser.emit('targetcreated', {
            page() {
                return Promise.resolve(page);
            },
        });
        // The page inside part is async so we need to await some time
        await new Promise(res => res());
        assert.equal(collector.getData(page).length, 0);
        page.emit('request', request);
        assert.equal(collector.getData(page).length, 1);
        page.emit('request', request);
        assert.equal(collector.getData(page).length, 2);
    });
});
