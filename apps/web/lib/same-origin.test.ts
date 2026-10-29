// Run with:  node --test lib/same-origin.test.ts   (Node 22.18+/24 strips the types itself)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isSameOriginJsonRequest, isSameOriginRequest } from './same-origin.ts';

const h = (init: Record<string, string>) => new Headers(init);
const HOST = 'www.futurestack.co.in';

test('accepts a same-origin fetch (Origin matches Host, Sec-Fetch-Site same-origin)', () => {
  assert.equal(
    isSameOriginRequest({ headers: h({ origin: `https://${HOST}`, host: HOST, 'sec-fetch-site': 'same-origin' }) }),
    true,
  );
});

test('accepts Origin matching the forwarded host behind a proxy', () => {
  assert.equal(
    isSameOriginRequest({ headers: h({ origin: `https://${HOST}`, host: 'internal:3000', 'x-forwarded-host': HOST }) }),
    true,
  );
});

test('accepts Origin matching the resolved URL host', () => {
  assert.equal(isSameOriginRequest({ headers: h({ origin: `https://${HOST}` }), urlHost: HOST }), true);
});

test('accepts an older browser that sends Origin but no Sec-Fetch-Site', () => {
  assert.equal(isSameOriginRequest({ headers: h({ origin: `https://${HOST}`, host: HOST }) }), true);
});

test('accepts when only Sec-Fetch-Site: same-origin is present', () => {
  assert.equal(isSameOriginRequest({ headers: h({ 'sec-fetch-site': 'same-origin' }) }), true);
});

test('rejects a cross-site request (attacker page auto-submitting a form)', () => {
  assert.equal(
    isSameOriginRequest({
      headers: h({ origin: 'https://evil.example', host: HOST, 'sec-fetch-site': 'cross-site' }),
    }),
    false,
  );
});

test('rejects a cross-site request that hides Sec-Fetch-Site but sends a foreign Origin', () => {
  assert.equal(isSameOriginRequest({ headers: h({ origin: 'https://evil.example', host: HOST }) }), false);
});

test('rejects same-SITE but different-origin (a sibling subdomain)', () => {
  assert.equal(
    isSameOriginRequest({
      headers: h({ origin: `https://blog.${HOST}`, host: HOST, 'sec-fetch-site': 'same-site' }),
    }),
    false,
  );
});

test('rejects a lookalike host that merely contains ours', () => {
  assert.equal(isSameOriginRequest({ headers: h({ origin: `https://${HOST}.evil.example`, host: HOST }) }), false);
});

test('rejects Origin: null (sandboxed iframes, some redirects)', () => {
  assert.equal(isSameOriginRequest({ headers: h({ origin: 'null', host: HOST }) }), false);
});

test('rejects a request that carries neither Origin nor Sec-Fetch-Site', () => {
  assert.equal(isSameOriginRequest({ headers: h({ host: HOST }) }), false);
});

test('rejects Sec-Fetch-Site: none (typed URL / bookmark navigation)', () => {
  assert.equal(isSameOriginRequest({ headers: h({ 'sec-fetch-site': 'none', host: HOST }) }), false);
});

test('JSON variant also requires a JSON content type (blocks text/plain form posts)', () => {
  const sameOrigin = { origin: `https://${HOST}`, host: HOST, 'sec-fetch-site': 'same-origin' };
  assert.equal(isSameOriginJsonRequest({ headers: h({ ...sameOrigin, 'content-type': 'application/json' }) }), true);
  assert.equal(
    isSameOriginJsonRequest({ headers: h({ ...sameOrigin, 'content-type': 'application/json; charset=utf-8' }) }),
    true,
  );
  assert.equal(isSameOriginJsonRequest({ headers: h({ ...sameOrigin, 'content-type': 'text/plain' }) }), false);
  assert.equal(isSameOriginJsonRequest({ headers: h(sameOrigin) }), false);
});

test('JSON variant still refuses a cross-site JSON request', () => {
  assert.equal(
    isSameOriginJsonRequest({
      headers: h({ origin: 'https://evil.example', host: HOST, 'sec-fetch-site': 'cross-site', 'content-type': 'application/json' }),
    }),
    false,
  );
});
