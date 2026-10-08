import { describe, expect, test } from 'bun:test'
import { parseCookieConsent } from './cookieConsent'

describe('cookie choices', () => {
  test('first-time visitors have no consent', () => {
    expect(parseCookieConsent(null)).toBeNull()
  })
  test('Accept is remembered as accepted', () => {
    expect(parseCookieConsent('accepted')).toBe('accepted')
  })
  test('Decline is remembered as declined', () => {
    expect(parseCookieConsent('declined')).toBe('declined')
  })
  test('invalid saved values do not grant consent', () => {
    expect(parseCookieConsent('true')).toBeNull()
  })
})