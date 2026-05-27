import { JsonObjectNode, JsonArrayNode } from '@croct/json5-parser';
import type { JsonNode as CroctJsonNode } from '@croct/json5-parser';

export interface ValidationError {
  path: string;
  key: string;
  message: string;
  severity: 'error' | 'warning';
}

function escapePathSegment(segment: string): string {
  return segment.replace(/~/g, '~0').replace(/\//g, '~1');
}

export function validateKey(key: string, siblingKeys: string[]): ValidationError[] {
  const errors: ValidationError[] = [];

  if (key === '') {
    errors.push({
      path: '',
      key,
      message: '字段名不能为空',
      severity: 'error',
    });
  }

  const count = siblingKeys.filter((k) => k === key).length;
  if (count > 1) {
    errors.push({
      path: '',
      key,
      message: `字段名已存在: ${key}`,
      severity: 'warning',
    });
  }

  return errors;
}

export function validateJsonNode(node: CroctJsonNode, path = '/'): ValidationError[] {
  const errors: ValidationError[] = [];

  if (node instanceof JsonObjectNode) {
    const properties = node.properties;
    const keys = properties.map((p) => p.key.toJSON());

    for (let i = 0; i < properties.length; i++) {
      const property = properties[i];
      const key = keys[i];
      const keyErrors = validateKey(key, keys);

      for (const error of keyErrors) {
        error.path = path;
      }

      errors.push(...keyErrors);

      const childPath = path === '/'
        ? `/${escapePathSegment(key)}`
        : `${path}/${escapePathSegment(key)}`;

      errors.push(...validateJsonNode(property.value, childPath));
    }
  } else if (node instanceof JsonArrayNode) {
    const elements = node.elements;

    for (let i = 0; i < elements.length; i++) {
      const childPath = path === '/'
        ? `/${i}`
        : `${path}/${i}`;

      errors.push(...validateJsonNode(elements[i], childPath));
    }
  }

  return errors;
}
