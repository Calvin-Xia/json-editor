import type { JsonNode as CroctJsonNode } from '@croct/json5-parser';

export interface ParseError {
  line: number;
  column: number;
  message: string;
}

export interface Document {
  filePath: string | null;
  originalContent: string;
  jsonNode: CroctJsonNode | null;
  parseError: ParseError | null;
  isModified: boolean;
  encoding: string;
  format: 'json' | 'json5';
}

export type ParseStatus = 'idle' | 'parsing' | 'success' | 'error';
