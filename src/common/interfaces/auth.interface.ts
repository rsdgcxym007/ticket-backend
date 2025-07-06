import { Request } from 'express';
import { UserRole } from '../enums';

export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    roles: UserRole[];
    role: UserRole;
    [key: string]: any;
  };
}
