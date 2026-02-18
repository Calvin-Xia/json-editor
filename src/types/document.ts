export type JSONValueType = 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';

export interface JSONNodeMeta {
  indent: string;
  newline: '\n' | '\r\n';
  quote: '"' | "'";
  trailingComma: boolean;
  comment: {
    leading?: string;
    trailing?: string;
    inner?: string[];
  };
  rawValue?: string;
  unknownFields?: Map<string, string>;
}

export interface JSONNode {
  id: string;
  type: JSONValueType;
  key?: string;
  index?: number;
  value: string | number | boolean | null | JSONNode[] | undefined;
  parent: JSONNode | null;
  meta: JSONNodeMeta;
  order: number;
}

export interface Document {
  filePath: string | null;
  originalContent: string;
  root: JSONNode | null;
  isModified: boolean;
  encoding: string;
  format: 'json' | 'json5';
}

export interface DocumentState {
  document: Document | null;
  isLoading: boolean;
  error: string | null;
}

export type ParseStatus = 'idle' | 'parsing' | 'success' | 'error';
