/**
 * Template Utilities
 *
 * Provides template variable extraction and substitution utilities.
 * Used for communication templates and notification content.
 */
/**
 * Extract template variable names from content
 * Variables are denoted using {{variableName}} syntax
 *
 * @param content - The template content to scan
 * @returns Array of unique variable names found in the content
 *
 * @example
 * extractTemplateVariables("Hello {{name}}, your appointment is {{date}}")
 * // Returns: ["name", "date"]
 */
export declare function extractTemplateVariables(content: string): string[];
/**
 * Substitute template variables with values
 * Only substitutes alphanumeric variable names for security
 *
 * @param content - The template content
 * @param variables - Object mapping variable names to values
 * @returns Content with variables substituted
 *
 * @example
 * substituteTemplateVariables("Hello {{name}}", { name: "John" })
 * // Returns: "Hello John"
 */
export declare function substituteTemplateVariables(
  content: string,
  variables: Record<string, string>,
): string;
/**
 * Validate that all required variables have values
 *
 * @param content - The template content
 * @param variables - Object with variable values
 * @returns Object with validation result and missing variables
 */
export declare function validateTemplateVariables(
  content: string,
  variables: Record<string, string>,
): {
  valid: boolean;
  missing: string[];
};
//# sourceMappingURL=template.d.ts.map
