import { scheduler } from 'timers/promises';

import { AxiosError } from 'axios';

import * as protobuf from 'protobufjs';

export interface AxiosErrorLog {
  config: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: string | any;
    headers: Record<string, string> | string;
    method: string;
    url: string;
  };
  message: string;
  name: string;
  request: {
    baseURL: string;
    timeout: number | string;
  };
  response: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    headers: any;
    status: number | string;
    statusText: string;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  stack: any;
}

export const filterObjKeys = (obj: object): object => {
  return Object.fromEntries(
    Object.entries(obj).filter(
      ([, value]) => value != null && value !== undefined,
    ),
  );
};
export const stringToEnum = <T extends object, V extends string>(
  enumObject: T,
  value: V,
): T[keyof T] | undefined => {
  const enumValues = Object.values(enumObject) as V[];
  return enumValues.includes(value)
    ? (value as unknown as T[keyof T])
    : undefined;
};

export const handleAxiosErrorLog = (error: AxiosError): AxiosErrorLog => {
  return {
    config: {
      data: error?.config?.data || 'No data available',
      headers:
        (error?.config?.headers as Record<string, string>) ||
        'No headers available',
      method: error?.config?.method || 'No method available',
      url: error?.config?.url || 'No URL available',
    },
    message: error?.message || 'No message available',
    name: error?.name || 'UnknownError',
    request: {
      baseURL: error?.config?.baseURL || 'No baseURL available',
      timeout: error?.config?.timeout || 'No timeout available',
    },
    response: {
      data: error?.response?.data || 'No response data available',
      headers: error?.response?.headers || 'No headers available',
      status: error?.response?.status || 'No status available',
      statusText: error?.response?.statusText || 'No status text available',
    },
    stack: error?.stack || 'No stack trace available',
  };
};

export const toPaisa = (amount: number): number => {
  return amount * 100;
};

export const toRupee = (amount: number): number => {
  return amount / 100;
};

export const convertMilliCurrencyUnit = (amount: number): number => {
  return amount / 1000;
};

export const delay = async (ms: number) => await scheduler.wait(ms);

export function objectToProtobuf(
  obj: Record<string, unknown>,
  schemaDefinition: string, // Protobuf schema as a string
  rootType: string, // Root message type name (e.g., "MyMessage")
): Buffer {
  // Create a root from the schema
  const root = protobuf.Root.fromJSON(
    protobuf.parse(schemaDefinition, { keepCase: true }).root,
  );

  // Get the message type
  const Type = root.lookupType(rootType);

  // Validate the object against the schema
  const validationError = Type.verify(obj);
  if (validationError) throw new Error(validationError);

  // Create and encode the message
  const message = Type.create(obj);
  return Buffer.from(Type.encode(message).finish());
}

export function protobufToObject(
  buffer: Buffer,
  schemaDefinition: string, // Protobuf schema as a string
  rootType: string, // Root message type name (e.g., "MyMessage")
): Record<string, unknown> {
  // Create a root from the schema
  const root = protobuf.Root.fromJSON(
    protobuf.parse(schemaDefinition, { keepCase: true }).root,
  );

  // Get the message type
  const Type = root.lookupType(rootType);

  // Decode the buffer to a message
  const message = Type.decode(buffer);

  // Convert to plain object
  return Type.toObject(message, {
    bytes: String,
    enums: String,
    longs: String,
  });
}
