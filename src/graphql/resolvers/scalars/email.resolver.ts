import { GraphQLScalarType, Kind } from 'graphql';

// Intentionally simple (not a full RFC 5322 parser) -- good enough to catch
// the obvious "not an email" mistakes (missing @, missing domain) without
// rejecting valid-but-unusual addresses. Mirrors the level of strictness
// Mongoose's own validators typically use.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(value: unknown): string {
  if (typeof value !== 'string' || !EMAIL_REGEX.test(value)) {
    throw new TypeError(`EmailAddress: "${String(value)}" is not a valid email address`);
  }
  return value.toLowerCase();
}

export const EmailAddressScalar = new GraphQLScalarType({
  name: 'EmailAddress',
  description: 'A valid email address string (validated at the GraphQL layer, lowercased on input)',
  serialize(value) {
    if (typeof value !== 'string') {
      throw new TypeError('EmailAddress: value is not serializable');
    }
    return value;
  },
  parseValue(value) {
    return validate(value);
  },
  parseLiteral(ast) {
    if (ast.kind !== Kind.STRING) {
      throw new TypeError('EmailAddress: can only parse string literals');
    }
    return validate(ast.value);
  },
});
