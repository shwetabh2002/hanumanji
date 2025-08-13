import 'fastify';

import { ContextUser, Meta, Token } from '@app/auth';

declare module 'fastify' {
  interface FastifyRequest {
    meta: Meta;
    token: Token;
    user: ContextUser;
  }
}
