import { z } from 'zod';
import { JSONSchema } from 'json-schema';

export interface Tool<InputSchema extends z.ZodTypeAny = z.ZodTypeAny> {
  name: string;
  description: string;
  inputSchema: InputSchema;
  schema: JSONSchema;
  handler: (args: z.infer<InputSchema>) => Promise<ToolResult>;
}

export interface ToolResult {
  content: Array<{ type: 'text'; text: string }>;
 isError?: boolean;
}

export function ok<T>(data: T): ToolResult {
  return {
    content: [{ type: 'text', text: JSON.stringify(data) }],
    isError: false,
  };
}

export function err(message: string): ToolResult {
  return {
    content: [{ type: 'text', text: message }],
    isError: true,
  };
}

export function defineTool<InputSchema extends z.ZodTypeAny>(
  name: string,
  description: string,
  schema: InputSchema,
  handler: (args: z.infer<InputSchema>) => Promise<ToolResult>
): Tool<InputSchema> {
  return {
    name,
    description,
    inputSchema: schema,
    schema: schemaToJsonSchema(schema),
    handler,
  };
}

function schemaToJsonSchema(schema: z.ZodTypeAny): JSONSchema {
  const def = schema._def;
  
  if (def.typeName === 'ZodObject') {
    const shape = (def.shape as Record<string, z.ZodTypeAny>)();
    const properties: Record<string, JSONSchema> = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(shape)) {
      properties[key] = zodToJsonSchema(value);
      required.push(key);
    }

    return {
      type: 'object',
      properties,
      required,
    };
  }

  if (def.typeName === 'ZodString') {
    return { type: 'string' };
  }

  if (def.typeName === 'ZodNumber') {
    return { type: 'number' };
  }

  if (def.typeName === 'ZodBoolean') {
    return { type: 'boolean' };
  }

  if (def.typeName === 'ZodArray') {
    return {
      type: 'array',
      items: zodToJsonSchema(def.type),
    };
  }

  return {};
}

function zodToJsonSchema(zodType: z.ZodTypeAny): JSONSchema {
  const def = zodType._def;
  
  if (def.typeName === 'ZodString') return { type: 'string' };
  if (def.typeName === 'ZodNumber') return { type: 'number' };
  if (def.typeName === 'ZodBoolean') return { type: 'boolean' };
  if (def.typeName === 'ZodOptional') return zodToJsonSchema(def.innerType);
  if (def.typeName === 'ZodArray') return { type: 'array', items: zodToJsonSchema(def.type) };
  
  return {};
}
