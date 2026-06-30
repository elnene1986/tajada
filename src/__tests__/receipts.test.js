// Receipt backup/restore — the URI rebasing that makes receipts survive
// a restore onto a different device. The byte read/write touches the
// filesystem (covered by a device smoke test); this locks the pure
// rebasing logic so a receipt always re-points at the LOCAL receipts dir
// after restore, and unknown/old references are left untouched.

import { receiptBasename, rebaseReceiptUris } from '../utils/receipts';

describe('receiptBasename', () => {
  test('takes the filename off a path', () => {
    expect(receiptBasename('file:///var/app/receipts/r_42_1700.jpg')).toBe('r_42_1700.jpg');
    expect(receiptBasename('r_42_1700.jpg')).toBe('r_42_1700.jpg');
    expect(receiptBasename(null)).toBe('');
  });
});

describe('rebaseReceiptUris', () => {
  const dir = 'file:///NEW-DEVICE/receipts/';
  const sessions = [{
    id: 's1',
    transactions: [
      { id: 't1', receiptUri: 'file:///OLD-DEVICE/receipts/r_t1_100.jpg' },
      { id: 't2', receiptUri: 'file:///OLD-DEVICE/receipts/r_t2_200.jpg' },
      { id: 't3' }, // no receipt
    ],
  }];

  test('re-points known receipts onto the local dir', () => {
    const out = rebaseReceiptUris(sessions, ['r_t1_100.jpg', 'r_t2_200.jpg'], dir);
    expect(out[0].transactions[0].receiptUri).toBe(dir + 'r_t1_100.jpg');
    expect(out[0].transactions[1].receiptUri).toBe(dir + 'r_t2_200.jpg');
    expect(out[0].transactions[2].receiptUri).toBeUndefined();
  });

  test('leaves a receipt untouched when its bytes are not in the bundle', () => {
    const out = rebaseReceiptUris(sessions, ['r_t1_100.jpg'], dir);
    expect(out[0].transactions[0].receiptUri).toBe(dir + 'r_t1_100.jpg');
    // t2 not in the bundle → keep original path rather than inventing one
    expect(out[0].transactions[1].receiptUri).toBe('file:///OLD-DEVICE/receipts/r_t2_200.jpg');
  });

  test('accepts a names map as well as an array', () => {
    const out = rebaseReceiptUris(sessions, { 'r_t1_100.jpg': 'base64...' }, dir);
    expect(out[0].transactions[0].receiptUri).toBe(dir + 'r_t1_100.jpg');
  });

  test('does not mutate the input sessions', () => {
    rebaseReceiptUris(sessions, ['r_t1_100.jpg'], dir);
    expect(sessions[0].transactions[0].receiptUri).toBe('file:///OLD-DEVICE/receipts/r_t1_100.jpg');
  });
});
