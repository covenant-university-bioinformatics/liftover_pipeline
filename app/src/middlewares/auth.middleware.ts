import { UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { User } from '../auth/models/user.model';

const authMiddleware = async (req, res, next) => {
  const token = req.cookies?.accessToken;
  if (!token) {
    throw new UnauthorizedException();
  }

  const decoded = jwt.verify(token, process.env.JWT_KEY);
  const { username } = decoded as any;
  const user = await User.findOne({ username });

  if (!user) {
    throw new UnauthorizedException();
  }

  req.user = user;

  next();
};

export default authMiddleware;
