#!/usr/bin/env node
/**
 * Pattern Validation Script
 * Enforces code quality patterns during pre-commit
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

// Get staged files
const stagedFiles = execSync('git diff --cached --name-only --diff-filter=ACM')
  .toString()
  .trim()
  .split('\n')
  .filter(Boolean)

const errors = []
const warnings = []

// ============================================================================
// Pattern Validators
// ============================================================================

/**
 * Check for direct Firestore WRITE operations in frontend services
 *
 * API-First Architecture:
 * - WRITES must go through API (authFetchJSON) - block addDoc, updateDoc, deleteDoc, setDoc
 * - READS can use Firestore SDK directly - allow collection, getDocs, getDoc, query
 */
function validateApiFirstPattern(filePath, content) {
  if (!filePath.includes('packages/frontend/src/services/')) return

  // Block direct Firestore WRITE operations - these must go through API
  const writePatterns = [
    { pattern: /addDoc\(/, message: 'Use API endpoint instead of direct addDoc() - writes must go through API' },
    { pattern: /updateDoc\(/, message: 'Use API endpoint instead of direct updateDoc() - writes must go through API' },
    { pattern: /deleteDoc\(/, message: 'Use API endpoint instead of direct deleteDoc() - writes must go through API' },
    { pattern: /setDoc\(/, message: 'Use API endpoint instead of direct setDoc() - writes must go through API' },
  ]

  // Exception: Services using authFetchJSON are following API-first pattern
  // They may still have Firestore reads for real-time or helper queries
  const usesApiPattern = content.includes('authFetchJSON')

  writePatterns.forEach(({ pattern, message }) => {
    if (pattern.test(content)) {
      // If using API pattern, this might be legacy code being migrated - warn instead of error
      if (usesApiPattern) {
        warnings.push(`${filePath}: ${message}`)
      } else {
        errors.push(`${filePath}: ${message}`)
      }
    }
  })
}

/**
 * Check for useState + useEffect data fetching in components
 */
function validateTanStackQuery(filePath, content) {
  if (!filePath.includes('packages/frontend/src/components/')) return
  if (!filePath.endsWith('.tsx')) return

  // Pattern: useState + useEffect with async data fetching
  const hasUseState = /useState.*\[\]/.test(content)
  const hasUseEffect = /useEffect/.test(content)
  const hasAsync = /\.then\(|await/.test(content)

  if (hasUseState && hasUseEffect && hasAsync) {
    // Check if TanStack Query is used
    if (!content.includes('useQuery') && !content.includes('useFirestoreQuery')) {
      warnings.push(
        `${filePath}: Consider using TanStack Query instead of useState + useEffect for data fetching`
      )
    }
  }
}

/**
 * Check for duplicate type definitions
 */
function validateSharedTypes(filePath, content) {
  if (!filePath.includes('/types/')) return

  const typeKeywords = ['interface Horse', 'interface Stable', 'interface User', 'type Horse']

  typeKeywords.forEach(keyword => {
    if (content.includes(keyword)) {
      // Check if it's importing from shared
      if (!content.includes('@shared/types')) {
        warnings.push(
          `${filePath}: Type definition found. Ensure it's not duplicating @shared/types`
        )
      }
    }
  })
}

/**
 * Check for hardcoded constants
 */
function validateConstants(filePath, content) {
  if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) return

  // Check for color arrays
  const colorArrayPattern = /const.*=\s*\[\s*['"]#[0-9a-fA-F]{6}['"]/
  if (colorArrayPattern.test(content)) {
    if (!content.includes('@shared/constants')) {
      warnings.push(
        `${filePath}: Hardcoded color array found. Consider using @shared/constants/activity`
      )
    }
  }
}

/**
 * Check for proper Timestamp imports
 */
function validateTimestampImports(filePath, content) {
  const sharedPackage = filePath.includes('packages/shared/')
  const frontend = filePath.includes('packages/frontend/')
  const backend = filePath.includes('packages/api/') || filePath.includes('packages/functions/')

  if (sharedPackage || frontend) {
    // Should use client SDK
    if (content.includes("from 'firebase-admin/firestore'")) {
      errors.push(
        `${filePath}: Use 'firebase/firestore' for Timestamp in frontend/shared (client SDK)`
      )
    }
  }

  if (backend) {
    // Should use admin SDK
    if (content.includes("from 'firebase/firestore'")) {
      warnings.push(
        `${filePath}: Consider using 'firebase-admin/firestore' for Timestamp in backend (admin SDK)`
      )
    }
  }
}

// ============================================================================
// Run Validators
// ============================================================================

stagedFiles.forEach(filePath => {
  if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx')) return

  try {
    const fullPath = path.join(process.cwd(), filePath)
    if (!fs.existsSync(fullPath)) return

    const content = fs.readFileSync(fullPath, 'utf8')

    validateApiFirstPattern(filePath, content)
    validateTanStackQuery(filePath, content)
    validateSharedTypes(filePath, content)
    validateConstants(filePath, content)
    validateTimestampImports(filePath, content)
  } catch (err) {
    // File might be deleted or binary
  }
})

// ============================================================================
// Report Results
// ============================================================================

if (errors.length > 0) {
  console.error('\n❌ Pattern Validation FAILED:\n')
  errors.forEach(err => console.error(`  • ${err}`))
  console.error('\n📖 See docs/DEVELOPMENT_PATTERNS.md for guidance\n')
  process.exit(1)
}

if (warnings.length > 0) {
  console.warn('\n⚠️  Pattern Validation Warnings:\n')
  warnings.forEach(warn => console.warn(`  • ${warn}`))
  console.warn('\n📖 See docs/DEVELOPMENT_PATTERNS.md for best practices\n')
}

if (errors.length === 0 && warnings.length === 0) {
  console.log('✅ Pattern validation passed!')
}
