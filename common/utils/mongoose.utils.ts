import { Type } from '@nestjs/common';
import { ModelDefinition, SchemaFactory } from '@nestjs/mongoose';

export function createModelDefinition<T>(entity: Type<T>): ModelDefinition {
  return {
    name: entity.name,
    schema: SchemaFactory.createForClass(entity),
  };
}
