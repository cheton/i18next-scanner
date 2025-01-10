import { ensureArray, ensureBoolean, ensureString } from 'ensure-type';
import { get as _get, find } from 'lodash';

const isJSXText = (node) => {
  if (!node) {
    return false;
  }

  return node.type === 'JSXText';
};

const isNumericLiteral = (node) => {
  if (!node) {
    return false;
  }

  return node.type === 'Literal' && typeof node.value === 'number';
};

const isStringLiteral = (node) => {
  if (!node) {
    return false;
  }

  return node.type === 'Literal' && typeof node.value === 'string';
};

const isObjectExpression = (node) => {
  if (!node) {
    return false;
  }

  return node.type === 'ObjectExpression';
};

const trimValue = value => ensureString(value)
  .replace(/^[\r\n]+\s*/g, '') // remove leading spaces containing a leading newline character
  .replace(/[\r\n]+\s*$/g, '') // remove trailing spaces containing a leading newline character
  .replace(/[\r\n]+\s*/g, ' '); // replace spaces containing a leading newline character with a single space character

const nodesToString = (nodes, options) => {
  const supportBasicHtmlNodes = ensureBoolean(options?.supportBasicHtmlNodes);
  const keepBasicHtmlNodesFor = ensureArray(options?.keepBasicHtmlNodesFor);
  const filteredNodes = ensureArray(nodes)
    .filter(node => {
      if (isJSXText(node)) {
        return trimValue(node.value);
      }
      return true;
    });

  let memo = '';
  filteredNodes.forEach((node, nodeIndex) => {
    if (isJSXText(node)) {
      const value = trimValue(node.value);
      if (!value) {
        return;
      }
      memo += value;
    } else if (node.type === 'JSXExpressionContainer') {
      const { expression = {} } = node;

      if (isNumericLiteral(expression)) {
        // Numeric literal is ignored in react-i18next
        memo += '';
      } if (isStringLiteral(expression)) {
        memo += expression.value;
      } else if (isObjectExpression(expression) && (_get(expression, 'properties[0].type') === 'Property')) {
        const baseProperty = expression.properties[0].key.name;
        const formatProperty = find(expression.properties, ['key.name', 'format']);
        const formatter = formatProperty ? `, ${formatProperty.value.value}` : '';
        memo += `{{${baseProperty + formatter}}}`;
      } else {
        console.error(`Unsupported JSX expression. Only static values or {{interpolation}} blocks are supported. Got ${expression.type}:`);
        console.error(ensureString(options?.code).slice(node.start, node.end));
        console.error(node.expression);
      }
    } else if (node.children) {
      const nodeType = node.openingElement?.name?.name;
      const selfClosing = node.openingElement?.selfClosing;
      const attributeCount = ensureArray(node.openingElement?.attributes).length;
      const filteredChildNodes = ensureArray(node.children)
        .filter(childNode => {
          if (isJSXText(childNode)) {
            return trimValue(childNode.value);
          }
          return true;
        });
      const childCount = filteredChildNodes.length;
      const firstChildNode = filteredChildNodes[0];
      const shouldKeepChild = supportBasicHtmlNodes && keepBasicHtmlNodesFor.indexOf(node.openingElement?.name?.name) > -1;

      if (selfClosing && shouldKeepChild && (attributeCount === 0)) {
        // actual e.g. lorem <br/> ipsum
        // expected e.g. lorem <br/> ipsum
        memo += `<${nodeType}/>`;
      } else if ((childCount === 0 && !shouldKeepChild) || (childCount === 0 && attributeCount !== 0)) {
        // actual e.g. lorem <hr className="test" /> ipsum
        // expected e.g. lorem <0></0> ipsum
        memo += `<${nodeIndex}></${nodeIndex}>`;
      } else if (shouldKeepChild && (attributeCount === 0) && (childCount === 1) && (isJSXText(firstChildNode) || isStringLiteral(firstChildNode?.expression))) {
        // actual e.g. dolor <strong>bold</strong> amet
        // expected e.g. dolor <strong>bold</strong> amet
        memo += `<${nodeType}>${nodesToString(node.children, options)}</${nodeType}>`;
      } else {
        // regular case mapping the inner children
        memo += `<${nodeIndex}>${nodesToString(node.children, options)}</${nodeIndex}>`;
      }
    }
  });

  return memo;
};

export default nodesToString;
