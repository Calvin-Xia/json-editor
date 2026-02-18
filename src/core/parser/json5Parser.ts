import { JsonParser, JsonObjectNode, JsonNode as CroctJsonNode, JsonParseError } from '@croct/json5-parser';
import type { JsonValue } from '@croct/json';

export interface ParseError {
  line: number;
  column: number;
  message: string;
}

export interface ParseSuccessResult {
  success: true;
  node: CroctJsonNode;
}

export interface ParseFailureResult {
  success: false;
  error: ParseError;
}

export type ParseResult = ParseSuccessResult | ParseFailureResult;

function extractErrorLocation(error: unknown): { line: number; column: number } {
  if (error instanceof JsonParseError) {
    return {
      line: error.location.start.line,
      column: error.location.start.column,
    };
  }

  const message = error instanceof Error ? error.message : String(error);
  const lineMatch = message.match(/line (\d+)/i);
  const columnMatch = message.match(/column (\d+)/i);

  return {
    line: lineMatch ? parseInt(lineMatch[1], 10) : 1,
    column: columnMatch ? parseInt(columnMatch[1], 10) : 1,
  };
}

export function parseJson5(content: string): ParseResult {
  try {
    const node = JsonParser.parse(content);
    return {
      success: true,
      node,
    };
  } catch (e) {
    const error = e instanceof Error ? e : new Error(String(e));
    const { line, column } = extractErrorLocation(e);
    
    return {
      success: false,
      error: {
        line,
        column,
        message: error.message,
      },
    };
  }
}

export function parseJson5AsObject(content: string): ParseResult {
  try {
    const node = JsonParser.parse(content, JsonObjectNode);
    return {
      success: true,
      node,
    };
  } catch (e) {
    const error = e instanceof Error ? e : new Error(String(e));
    const { line, column } = extractErrorLocation(e);
    
    return {
      success: false,
      error: {
        line,
        column,
        message: error.message,
      },
    };
  }
}

export function serializeNode(node: CroctJsonNode): string {
  return node.toString();
}

export function setNodeValue(node: CroctJsonNode, key: string, value: JsonValue): boolean {
  if ('set' in node && typeof node.set === 'function') {
    (node as JsonObjectNode).set(key, value);
    return true;
  }
  return false;
}

export function getNodeValue(node: CroctJsonNode, key: string): JsonValue | undefined {
  if ('get' in node && typeof node.get === 'function') {
    return (node as JsonObjectNode).get(key)?.toJSON();
  }
  return undefined;
}

export function getNodeType(node: CroctJsonNode): string {
  return node.constructor.name.replace('Json', '').replace('Node', '').toLowerCase();
}

export { JsonParser, JsonObjectNode, CroctJsonNode };
export type { JsonNode } from '@croct/json5-parser';
export type { JsonValue } from '@croct/json';
