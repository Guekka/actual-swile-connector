import { chromium } from 'playwright';
import { getCachePath, log } from './utils';

const baseUrl = 'https://team.swile.co';
const walletUrl = `${baseUrl}/wallets`;


async function makeBrowser(username: string) {
    let dataDir = getCachePath({ subDir: username })
    return await chromium.launchPersistentContext(dataDir, {
        headless: false,
    });

}

export async function getToken(username: string, password: string) {
    log('info', 'Get token');
    const browser = await makeBrowser(username);
    let page = await browser.newPage();
    await page.goto(walletUrl, { waitUntil: 'networkidle' });

    try {
        await page.waitForURL(walletUrl, { timeout: 1000 });
    } catch (e) {
        await login(username, password, page);
    }


    const cookies = await page.context().cookies();
    const cookie = cookies.find(c => c.name === 'lunchr:jwt');
    if (!cookie) {
        throw new Error('No JWT found');
    }

    await browser.close();
    return cookie.value;
}

export async function login(username: string, password: string, page: any) {
    log('info', 'Not logged in, logging in...');
    await page.waitForSelector('form', { timeout: 1000 });

    const form = await page.$('form');
    if (!form) {
        throw new Error('No form found');
    }

    // reject cookies
    try {
        const cookieButton = await page.$('#onetrust-reject-all-handler');
        if (cookieButton) {
            await cookieButton.click();
        }
    } catch (e) {
        log('info', 'No cookie banner');
    }

    const usernameInput = await form.$('input[name="username"]');
    const passwordInput = await form.$('input[name="password"]');
    if (!usernameInput || !passwordInput) {
        throw new Error('Username or password input not found');
    }

    await usernameInput.type(username);
    await passwordInput.type(password);

    await page.waitForLoadState('networkidle');

    const submitButton = await form.$('button[type="submit"]');
    if (submitButton) {
        await submitButton.click();
    }

    // let time for the user to fill 2FA
    await page.waitForURL(walletUrl, { timeout: 60000 });

}
