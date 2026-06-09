import type { Page, Cookie } from 'playwright';

/**
 * Auth detection rules per domain.
 * Maps domains to their auth cookie names.
 */
const AUTH_COOKIES: Record<string, string[]> = {
  'twitter.com': ['auth_token', 'ct0'],
  'x.com': ['auth_token', 'ct0'],
  'github.com': ['logged_in', 'dotcom_user'],
  'google.com': ['ACCOUNT_CHOOSER', 'LSID'],
  'linkedin.com': ['li_at', 'JSESSIONID'],
  'facebook.com': ['c_user', 'xs'],
  'instagram.com': ['sessionid', 'csrftoken', 'mid'],
  'reddit.com': ['reddit_session', 'loid'],
  'youtube.com': ['LOGIN_INFO'],
};

/**
 * Check if cookies indicate user is logged in for a given URL.
 */
export function isContextLoggedIn(cookies: Cookie[], url: string): boolean {
  try {
    const hostname = new URL(url).hostname;
    const domain = hostname.replace(/^www\./, '');
    const baseDomain = domain.split('.')[0]; // e.g., "twitter" from "twitter.com"

    // Find matching domain rules
    for (const [authDomain, authCookieNames] of Object.entries(AUTH_COOKIES)) {
      const authDomainBase = authDomain.split('.')[0];
      
      // Check if domain matches or contains the auth domain
      if (domain.includes(authDomain) || 
          authDomain.includes(baseDomain) || 
          baseDomain === authDomainBase) {
        const hasAuth = cookies.some(c => 
          authCookieNames.includes(c.name) && 
          c.value && 
          c.value.length > 10 &&
          c.expires !== 0 // Not expired
        );
        if (hasAuth) return true;
      }
    }
    
    // Generic check: any cookie with 'session', 'token', 'auth', 'logged_in' in name
    const hasGenericAuth = cookies.some(c => {
      const name = c.name.toLowerCase();
      return (
        name.includes('session') || 
        name.includes('token') || 
        name.includes('auth') || 
        name.includes('logged_in')
      ) && c.value && c.value.length > 10;
    });
    
    return hasGenericAuth;
  } catch {
    return false;
  }
}

/**
 * Check if localStorage contains auth tokens.
 */
export async function checkLocalStorageAuth(page: Page): Promise<boolean> {
  try {
    const result = await page.evaluate(() => {
      const keys = Object.keys(localStorage);
      return keys.some(key => {
        const value = localStorage.getItem(key);
        return value && value.length > 10 && (
          key.toLowerCase().includes('token') ||
          key.toLowerCase().includes('auth') ||
          key.toLowerCase().includes('session') ||
          key.toLowerCase().includes('user')
        );
      });
    });
    return result;
  } catch {
    return false;
  }
}

/**
 * Check if the page shows a logged-in state by examining the DOM.
 * Useful as a fallback when cookies aren't accessible.
 */
export async function checkDomLoginState(page: Page, url: string): Promise<{ loggedIn: boolean; reason: string }> {
  try {
    const hostname = new URL(url).hostname;
    const domain = hostname.replace(/^www\./, '');
    const baseDomain = domain.split('.')[0];

    // Domain-specific DOM checks
    if (baseDomain === 'twitter' || baseDomain === 'x') {
      // Check for logged-in indicators
      const loggedOut = await page.locator('[data-testid="LoginForm"]').count();
      if (loggedOut > 0) {
        return { loggedIn: false, reason: 'Twitter login form visible' };
      }
      const homeTimeline = await page.locator('[data-testid="primaryColumn"]').count();
      if (homeTimeline > 0) {
        return { loggedIn: true, reason: 'Twitter home timeline visible' };
      }
    }

    if (baseDomain === 'instagram') {
      const loginButton = await page.locator('button:has-text("Log In")').count();
      if (loginButton > 0) {
        return { loggedIn: false, reason: 'Instagram login button visible' };
      }
      const nav = await page.locator('nav').count();
      if (nav > 0) {
        return { loggedIn: true, reason: 'Instagram navigation visible' };
      }
    }

    if (baseDomain === 'github') {
      const signIn = await page.locator('text=Sign in to GitHub').count();
      if (signIn > 0) {
        return { loggedIn: false, reason: 'GitHub sign-in visible' };
      }
      const avatar = await page.locator('[aria-label="View profile"]').count();
      if (avatar > 0) {
        return { loggedIn: true, reason: 'GitHub profile avatar visible' };
      }
    }

    // Generic check: look for login/signin buttons
    const loginTexts = await page.evaluate(() => {
      const buttons = document.querySelectorAll('button, a, input[type="submit"]');
      return Array.from(buttons).some(el => {
        const text = (el.textContent || '').toLowerCase();
        return text.includes('log in') || text.includes('sign in') || text.includes('login');
      });
    });

    if (loginTexts) {
      return { loggedIn: false, reason: 'Login buttons found on page' };
    }

    // Check for user-related elements (avatar, profile, etc.)
    const hasUserUI = await page.evaluate(() => {
      return document.querySelector('[class*="avatar"], [class*="profile"], [aria-label*="profile"]') !== null;
    });

    return { 
      loggedIn: hasUserUI, 
      reason: hasUserUI ? 'User interface elements found' : 'No login indicators found' 
    };
  } catch (error) {
    return { loggedIn: false, reason: `Error checking DOM: ${error}` };
  }
}

/**
 * Check if user is logged in using all available methods.
 * Returns login state and helpful message.
 */
export async function checkLoginStatus(page: Page): Promise<{
  loggedIn: boolean;
  method: string;
  message: string;
}> {
  const url = page.url();
  
  // First check cookies
  try {
    const cookies = await page.context().cookies();
    const cookieLoggedIn = isContextLoggedIn(cookies, url);
    if (cookieLoggedIn) {
      return { 
        loggedIn: true, 
        method: 'cookies',
        message: 'Auth cookies detected' 
      };
    }
  } catch {
    // Cookies not accessible, continue to other methods
  }

  // Check localStorage
  try {
    const localStorageLoggedIn = await checkLocalStorageAuth(page);
    if (localStorageLoggedIn) {
      return { 
        loggedIn: true, 
        method: 'localStorage',
        message: 'Auth tokens in localStorage' 
      };
    }
  } catch {
    // localStorage not accessible
  }

  // Check DOM
  const domResult = await checkDomLoginState(page, url);
  return {
    loggedIn: domResult.loggedIn,
    method: 'dom',
    message: domResult.reason,
  };
}