import { describe, expect, it } from 'vitest'
import { assertAssetKeyForUser } from '../functions/api/assets/[[path]]'

describe('assertAssetKeyForUser', () => {
  it('accepts key owned by user', () => {
    expect(assertAssetKeyForUser('user-1/abc.jpg', 'user-1')).toBe(true)
  })

  it('rejects other user prefix', () => {
    expect(assertAssetKeyForUser('user-2/abc.jpg', 'user-1')).toBe(false)
  })

  it('rejects path traversal', () => {
    expect(assertAssetKeyForUser('user-1/../other/x.jpg', 'user-1')).toBe(false)
  })

  it('rejects missing slash', () => {
    expect(assertAssetKeyForUser('nope', 'user-1')).toBe(false)
  })
})
