import { JsonObjectNode, JsonArrayNode, JsonPrimitiveNode } from '@croct/json5-parser';
import type { JsonNode, JsonValueNode } from '@croct/json5-parser';

export type JsonType = 'string' | 'number' | 'boolean' | 'null' | 'object' | 'array';

function createDefaultValue(type: JsonType): JsonValueNode {
  switch (type) {
    case 'string':
      return JsonPrimitiveNode.of('');
    case 'number':
      return JsonPrimitiveNode.of(0);
    case 'boolean':
      return JsonPrimitiveNode.of(false);
    case 'null':
      return JsonPrimitiveNode.of(null);
    case 'object':
      return JsonObjectNode.of({});
    case 'array':
      return JsonArrayNode.of();
  }
}

function isObjectNode(node: JsonNode): node is JsonObjectNode {
  return node instanceof JsonObjectNode;
}

function isArrayNode(node: JsonNode): node is JsonArrayNode {
  return node instanceof JsonArrayNode;
}

export function addObjectField(node: JsonNode, key: string, type: JsonType): boolean {
  if (!isObjectNode(node) || key === '') {
    return false;
  }

  if (node.has(key)) {
    return false;
  }

  node.set(key, createDefaultValue(type));
  return true;
}

export function deleteObjectField(node: JsonNode, key: string): boolean {
  if (!isObjectNode(node)) {
    return false;
  }

  if (!node.has(key)) {
    return false;
  }

  node.delete(key);
  return true;
}

export function addArrayElement(node: JsonNode, type: JsonType, index?: number): boolean {
  if (!isArrayNode(node)) {
    return false;
  }

  const value = createDefaultValue(type);

  if (index === undefined) {
    node.push(value);
    return true;
  }

  if (index < 0 || index > node.elements.length) {
    return false;
  }

  node.splice(index, 0, value);
  return true;
}

export function deleteArrayElement(node: JsonNode, index: number): boolean {
  if (!isArrayNode(node)) {
    return false;
  }

  if (index < 0 || index >= node.elements.length) {
    return false;
  }

  node.splice(index, 1);
  return true;
}

export function moveArrayElement(node: JsonNode, fromIndex: number, toIndex: number): boolean {
  if (!isArrayNode(node)) {
    return false;
  }

  const len = node.elements.length;

  if (fromIndex < 0 || fromIndex >= len || toIndex < 0 || toIndex >= len) {
    return false;
  }

  if (fromIndex === toIndex) {
    return true;
  }

  const [element] = node.splice(fromIndex, 1);
  node.splice(toIndex, 0, element);
  return true;
}

export function isMixedArray(node: JsonNode): boolean {
  if (!isArrayNode(node)) {
    return false;
  }

  const { elements } = node;

  if (elements.length <= 1) {
    return false;
  }

  const firstType = getNodeJsonType(elements[0]);

  return elements.some(el => getNodeJsonType(el) !== firstType);
}

function getNodeJsonType(node: JsonValueNode): string {
  if (node instanceof JsonPrimitiveNode) {
    const val = node.toJSON();
    if (val === null) return 'null';
    return typeof val;
  }
  if (node instanceof JsonObjectNode) return 'object';
  if (node instanceof JsonArrayNode) return 'array';
  return 'unknown';
}
