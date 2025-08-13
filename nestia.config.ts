// import { FastifyAdapter } from "@nestjs/platform-fastify";
import { INestiaConfig } from '@nestia/sdk';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter } from '@nestjs/platform-fastify';

import { AppModule } from 'src/app.module';

const NESTIA_CONFIG: INestiaConfig = {
  clone: true,
  input: async () => {
    const app = await NestFactory.create(AppModule, new FastifyAdapter());
    return app;
  },
  output: 'src/api',
};
export default NESTIA_CONFIG;
