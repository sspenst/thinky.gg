import { Types } from 'mongoose';
import { ValidArray, ValidEnum, ValidNumber, ValidObjectId, ValidObjectIdPNG } from '../../helpers/apiWrapper';

describe('helpers/apiWrapper.ts', () => {
  test('ValidEnum', async () => {
    const validEnum = ValidEnum(['v1', 'v2']);

    expect(validEnum()).toBe(false);
    expect(validEnum('v3')).toBe(false);
    expect(validEnum('v1')).toBe(true);
  });
  test('ValidArray', async () => {
    const validArray = ValidArray(false);

    expect(validArray()).toBe(true);
    expect(validArray(1)).toBe(false);
    expect(validArray([1])).toBe(true);
  });
  test('ValidNumber', async () => {
    const validNumber = ValidNumber(false, 3, 10);

    expect(validNumber()).toBe(true);
    expect(validNumber('s')).toBe(false);
    expect(validNumber(1)).toBe(false);
    expect(validNumber(11)).toBe(false);
    expect(validNumber(7)).toBe(true);
  });
  test('ValidObjectId', async () => {
    const validObjectId = ValidObjectId(false);

    expect(validObjectId()).toBe(true);
    expect(validObjectId('id')).toBe(false);
    expect(validObjectId(new Types.ObjectId())).toBe(true);
  });
  test('ValidObjectIdPNG', async () => {
    let validObjectIdPNG = ValidObjectIdPNG(false);

    expect(validObjectIdPNG()).toBe(true);
    expect(validObjectIdPNG('id')).toBe(false);
    expect(validObjectIdPNG(`${(new Types.ObjectId()).toString()}.png`)).toBe(true);

    validObjectIdPNG = ValidObjectIdPNG();

    expect(validObjectIdPNG()).toBe(false);
  });
});

export { };
