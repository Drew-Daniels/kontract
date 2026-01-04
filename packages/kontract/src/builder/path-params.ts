/**
 * Path parameter extraction utilities.
 *
 * Provides both compile-time type inference and runtime extraction
 * of path parameters from route strings.
 *
 * @example
 * ```typescript
 * // Type-level inference
 * type Params = ParamsFromPath<'/users/:userId/posts/:postId'>
 * // Result: { userId: string, postId: string }
 *
 * // Runtime extraction
 * const names = extractParamNames('/users/:userId/posts/:postId')
 * // Result: ['userId', 'postId']
 * ```
 */
import { Type, type TObject, type TString, type TSchema } from '@sinclair/typebox'

// =============================================================================
// Type-Level Inference
// =============================================================================

/**
 * Extract path parameter names from a route string using template literal types.
 *
 * @example
 * ```typescript
 * type Single = ExtractRouteParams<'/users/:id'>
 * // Result: 'id'
 *
 * type Multiple = ExtractRouteParams<'/users/:userId/posts/:postId'>
 * // Result: 'userId' | 'postId'
 *
 * type None = ExtractRouteParams<'/users'>
 * // Result: never
 * ```
 */
export type ExtractRouteParams<T extends string>
  = T extends `${string}:${infer Param}/${infer Rest}`
    ? Param | ExtractRouteParams<`/${Rest}`>
    : T extends `${string}:${infer Param}`
      ? Param
      : never

/**
 * Check if a path has any parameters.
 *
 * @example
 * ```typescript
 * type Has = HasPathParams<'/users/:id'>  // true
 * type None = HasPathParams<'/users'>     // false
 * ```
 */
export type HasPathParams<T extends string> = ExtractRouteParams<T> extends never ? false : true

/**
 * Create an object type from path parameter names.
 * All parameters are typed as `string` by default.
 *
 * Returns `undefined` if the path has no parameters.
 *
 * @example
 * ```typescript
 * type Params = ParamsFromPath<'/users/:id'>
 * // Result: { id: string }
 *
 * type Multi = ParamsFromPath<'/users/:userId/posts/:postId'>
 * // Result: { userId: string, postId: string }
 *
 * type None = ParamsFromPath<'/users'>
 * // Result: undefined
 * ```
 */
export type ParamsFromPath<T extends string> = [ExtractRouteParams<T>] extends [never]
  ? undefined
  : { [K in ExtractRouteParams<T>]: string }

/**
 * Infer params type: use explicit TParams if provided, otherwise infer from path.
 *
 * @example
 * ```typescript
 * // With explicit params
 * type Explicit = InferParams<'/users/:id', TObject<{ id: TString }>>
 * // Result: { id: string } (from Static<TParams>)
 *
 * // Without explicit params (undefined)
 * type Inferred = InferParams<'/users/:id', undefined>
 * // Result: { id: string } (from ParamsFromPath)
 * ```
 */
export type InferParams<TPath extends string, TParams>
  = TParams extends undefined
    ? ParamsFromPath<TPath>
    : TParams

// =============================================================================
// Runtime Extraction
// =============================================================================

/**
 * Extract parameter names from a path string at runtime.
 *
 * @param path - Route path with `:param` placeholders
 * @returns Array of parameter names
 *
 * @example
 * ```typescript
 * extractParamNames('/users/:id')
 * // Result: ['id']
 *
 * extractParamNames('/users/:userId/posts/:postId')
 * // Result: ['userId', 'postId']
 *
 * extractParamNames('/users')
 * // Result: []
 * ```
 */
export function extractParamNames(path: string): string[] {
  const matches = path.matchAll(/:(\w+)/g)
  return [...matches].map((m) => m[1])
}

/**
 * Create a TypeBox schema for path parameters.
 * All parameters are `Type.String()` by default.
 *
 * @param paramNames - Array of parameter names
 * @returns TypeBox object schema, or undefined if no params
 *
 * @example
 * ```typescript
 * createParamsSchema(['id'])
 * // Result: Type.Object({ id: Type.String() })
 *
 * createParamsSchema(['userId', 'postId'])
 * // Result: Type.Object({ userId: Type.String(), postId: Type.String() })
 *
 * createParamsSchema([])
 * // Result: undefined
 * ```
 */
export function createParamsSchema(paramNames: string[]): TObject | undefined {
  if (paramNames.length === 0) return undefined

  const properties: Record<string, TString> = {}
  for (const name of paramNames) {
    properties[name] = Type.String()
  }
  return Type.Object(properties)
}

/**
 * Get or create a params schema for a route.
 * Uses explicit schema if provided, otherwise generates from path.
 *
 * @param path - Route path
 * @param explicitSchema - Explicitly provided params schema (optional)
 * @returns TypeBox schema or undefined
 */
export function getParamsSchema(path: string, explicitSchema?: TSchema): TSchema | undefined {
  if (explicitSchema) return explicitSchema
  return createParamsSchema(extractParamNames(path))
}
