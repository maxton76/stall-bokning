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
export function extractTemplateVariables(content: string): string[] {
  const variableRegex = /\{\{(\w+)\}\}/g;
  const variables: string[] = [];
  let match;

  while ((match = variableRegex.exec(content)) !== null) {
    const varName = match[1];
    if (varName && !variables.includes(varName)) {
      variables.push(varName);
    }
  }

  return variables;
}

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
export function substituteTemplateVariables(
  content: string,
  variables: Record<string, string>,
): string {
  let result = content;

  Object.entries(variables).forEach(([key, value]) => {
    // Only allow alphanumeric variable names (security)
    if (/^\w+$/.test(key)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, "g");
      result = result.replace(regex, value);
    }
  });

  return result;
}

/**
 * Validate that all required variables have values
 *
 * @param content - The template content
 * @param variables - Object with variable values
 * @returns Object with validation result and missing variables
 */
export function validateTemplateVariables(
  content: string,
  variables: Record<string, string>,
): { valid: boolean; missing: string[] } {
  const required = extractTemplateVariables(content);
  const missing = required.filter(
    (varName) => !variables[varName] || variables[varName].trim() === "",
  );

  return {
    valid: missing.length === 0,
    missing,
  };
}
