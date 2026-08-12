declare module 'graphql-validation-complexity' {
  import type { ASTVisitor, GraphQLError, ValidationContext } from 'graphql';

  export interface ComplexityLimitRuleOptions {
    onCost?: (cost: number, context: ValidationContext) => void;
    createError?: (cost: number, node: unknown) => GraphQLError;
    formatErrorMessage?: (maxCost: number) => string;
    scalarCost?: number;
    objectCost?: number;
    listFactor?: number;
    introspectionListFactor?: number;
  }

  export function createComplexityLimitRule(
    maxCost: number,
    options?: ComplexityLimitRuleOptions,
  ): (context: ValidationContext) => ASTVisitor;

  export const complexityLimitExceededErrorMessage: string;
}
