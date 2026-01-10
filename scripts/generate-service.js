#!/usr/bin/env node
/**
 * Service Generator
 * Creates a new service file following best practices
 *
 * Usage: node scripts/generate-service.js EntityName [options]
 * Options:
 *   --parent fieldName    Add parent field configuration
 *   --subcollection       Create as subcollection
 *   --composite key1,key2 Create with composite key
 */

const fs = require('fs')
const path = require('path')

const args = process.argv.slice(2)
if (args.length === 0) {
  console.error('Usage: node scripts/generate-service.js EntityName [--parent fieldName] [--subcollection] [--composite key1,key2]')
  process.exit(1)
}

const entityName = args[0]
const entityNameLower = entityName.toLowerCase()
const entityNameCamel = entityName.charAt(0).toLowerCase() + entityName.slice(1)

// Parse options
const hasParent = args.includes('--parent')
const parentField = hasParent ? args[args.indexOf('--parent') + 1] : null
const isSubcollection = args.includes('--subcollection')
const hasComposite = args.includes('--composite')
const compositeKeys = hasComposite ? args[args.indexOf('--composite') + 1].split(',') : []

// ============================================================================
// Template Generation
// ============================================================================

function generateServiceTemplate() {
  let template = `import { where, orderBy } from 'firebase/firestore'
import type { ${entityName} } from '@shared/types/domain'
import { createCrudService } from './firestoreCrud'

// ============================================================================
// CRUD Service (using Factory)
// ============================================================================

const ${entityNameCamel}Crud = createCrudService<${entityName}>({
  collectionName: '${entityNameLower}s',
  timestampsEnabled: true,`

  // Add parent field configuration
  if (hasParent && parentField) {
    template += `
  parentField: {
    field: '${parentField}',
    required: true
  },`
  }

  // Add subcollection configuration
  if (isSubcollection && parentField) {
    template += `
  subcollection: {
    parentCollection: '${parentField}s',
    pathSegments: ['${parentField}']
  },`
  }

  // Add composite key configuration
  if (hasComposite && compositeKeys.length > 0) {
    template += `
  compositeKey: {
    fields: [${compositeKeys.map(k => `'${k}'`).join(', ')}],
    separator: '_'
  }`
  }

  template += `
})

// ============================================================================
// Query Operations
// ============================================================================

/**
 * Get all ${entityNameLower}s
 * @returns Promise with array of ${entityNameLower}s
 */
export async function getAll${entityName}s(): Promise<${entityName}[]> {
  return ${entityNameCamel}Crud.query([orderBy('createdAt', 'desc')])
}
`

  // Add parent-based query if parent field exists
  if (hasParent && parentField) {
    template += `
/**
 * Get ${entityNameLower}s by ${parentField}
 * @param ${parentField} - ${parentField.charAt(0).toUpperCase() + parentField.slice(1)} ID
 * @returns Promise with array of ${entityNameLower}s
 */
export async function get${entityName}sBy${parentField.charAt(0).toUpperCase() + parentField.slice(1)}(
  ${parentField}: string
): Promise<${entityName}[]> {
  return ${entityNameCamel}Crud.getByParent(${parentField})
}
`
  }

  template += `
/**
 * Get a single ${entityNameLower} by ID
 * @param id - ${entityName} ID
 * @returns Promise with ${entityNameLower} data or null
 */
export async function get${entityName}(id: string): Promise<${entityName} | null> {
  return ${entityNameCamel}Crud.getById(id)
}

// ============================================================================
// CRUD Operations
// ============================================================================

/**
 * Create a new ${entityNameLower}
 * @param userId - User ID creating the ${entityNameLower}
 * @param data - ${entityName} data
 * @returns Promise with created ${entityNameLower} ID
 */
export async function create${entityName}(
  userId: string,
  data: Omit<${entityName}, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'lastModifiedBy'>
): Promise<string> {
  return ${entityNameCamel}Crud.create(userId, data)
}

/**
 * Update an existing ${entityNameLower}
 * @param id - ${entityName} ID
 * @param userId - User ID making the update
 * @param updates - Partial ${entityNameLower} data to update
 * @returns Promise that resolves when update is complete
 */
export async function update${entityName}(
  id: string,
  userId: string,
  updates: Partial<Omit<${entityName}, 'id' | 'createdAt' | 'createdBy'>>
): Promise<void> {
  return ${entityNameCamel}Crud.update(id, userId, updates)
}

/**
 * Delete a ${entityNameLower}
 * @param id - ${entityName} ID
 * @returns Promise that resolves when deletion is complete
 */
export async function delete${entityName}(id: string): Promise<void> {
  return ${entityNameCamel}Crud.delete(id)
}
`

  return template
}

// ============================================================================
// Write File
// ============================================================================

const outputPath = path.join(
  process.cwd(),
  'packages/frontend/src/services',
  `${entityNameCamel}Service.ts`
)

if (fs.existsSync(outputPath)) {
  console.error(`❌ Error: ${entityNameCamel}Service.ts already exists!`)
  process.exit(1)
}

const template = generateServiceTemplate()
fs.writeFileSync(outputPath, template)

console.log(`✅ Created ${entityNameCamel}Service.ts`)
console.log(`\n📝 Next steps:`)
console.log(`1. Add ${entityName} type to @shared/types/domain.ts`)
console.log(`2. Add query keys to packages/frontend/src/lib/queryClient.ts:`)
console.log(`   ${entityNameLower}s: {`)
console.log(`     all: ['${entityNameLower}s'] as const,`)
console.log(`     lists: () => [...queryKeys.${entityNameLower}s.all, 'list'] as const,`)
console.log(`     list: (filters: Record<string, any>) => [...queryKeys.${entityNameLower}s.lists(), filters] as const,`)
console.log(`     details: () => [...queryKeys.${entityNameLower}s.all, 'detail'] as const,`)
console.log(`     detail: (id: string) => [...queryKeys.${entityNameLower}s.details(), id] as const,`)
console.log(`   }`)
console.log(`3. Review docs/DEVELOPMENT_PATTERNS.md for usage examples`)
