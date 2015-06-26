"use strict";

function xpathIterator(node, expr, type) {
	var nsResolver = node.createNSResolver(node.ownerDocument == null
		? node.documentElement
		: node.ownerDocument.documentElement);

	return node.evaluate(expr, node, nsResolver, type, null);
}

function xpathArrayFromIterator(iterator) {
	var found = [];
	for (var res; res = iterator.iterateNext();)
		found.push(res);

	return found;
}

Document.prototype.xpath = Node.prototype.xpath = function (expr, type) {
	var result = xpathIterator(this, expr, type || XPathResult.ANY_TYPE);

	switch (result.resultType) {
		case XPathResult.NUMBER_TYPE:
			return result.numberValue;

		case XPathResult.STRING_TYPE:
			return result.stringValue;

		case XPathResult.BOOLEAN_TYPE:
			return result.booleanValue;

		case XPathResult.ANY_UNORDERED_NODE_TYPE: // fallthrough
		case XPathResult.FIRST_ORDERED_NODE_TYPE:
			return result.singleNodeValue;

		default:
			return xpathArrayFromIterator(result);
	}
};