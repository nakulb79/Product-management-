import { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import { ZodTypeAny } from 'zod';

export const validateBody =
  (schema: ZodTypeAny) =>
  (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: result.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message
        }))
      });
    }
    req.body = result.data;
    next();
  };

export const validateObjectId =
  (paramName: string) =>
  (req: Request, res: Response, next: NextFunction) => {
    if (!mongoose.isValidObjectId(req.params[paramName])) {
      return res.status(400).json({ error: `Invalid ${paramName}` });
    }
    next();
  };
