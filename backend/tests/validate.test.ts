import { Request, Response } from 'express';
import { validateBody, validateObjectId } from '../src/middleware/validate';
import { createProductSchema } from '../src/validation/schemas';

const mockRes = () => {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const validProductBody = {
  name: 'Wireless Mouse',
  price: '499.5',
  costPrice: '300',
  category: '507f1f77bcf86cd799439011'
};

describe('validateBody', () => {
  it('rejects fields not in the schema, closing the mass-assignment gap', () => {
    const req = { body: { ...validProductBody, createdBy: '000000000000000000000000' } } as Request;
    const res = mockRes();
    const next = jest.fn();

    validateBody(createProductSchema)(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    const payload = (res.json as jest.Mock).mock.calls[0][0];
    expect(payload.details.some((d: { message: string }) => /createdBy|Unrecognized/i.test(d.message))).toBe(true);
  });

  it('coerces numeric strings and replaces req.body with the parsed result', () => {
    const req = { body: { ...validProductBody } } as Request;
    const res = mockRes();
    const next = jest.fn();

    validateBody(createProductSchema)(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.body.price).toBe(499.5);
    expect(typeof req.body.price).toBe('number');
  });

  it('rejects a missing required field', () => {
    const { category: _category, ...withoutCategory } = validProductBody;
    const req = { body: withoutCategory } as Request;
    const res = mockRes();
    const next = jest.fn();

    validateBody(createProductSchema)(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('validateObjectId', () => {
  it('rejects a malformed id with 400 instead of letting a Mongoose CastError through', () => {
    const req = { params: { id: 'not-a-valid-id' } } as unknown as Request;
    const res = mockRes();
    const next = jest.fn();

    validateObjectId('id')(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('allows a well-formed ObjectId through', () => {
    const req = { params: { id: '507f1f77bcf86cd799439011' } } as unknown as Request;
    const res = mockRes();
    const next = jest.fn();

    validateObjectId('id')(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });
});
