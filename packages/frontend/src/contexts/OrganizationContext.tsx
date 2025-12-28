import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface OrganizationContextType {
  currentOrganizationId: string | null
  setCurrentOrganizationId: (id: string | null) => void
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined)

interface OrganizationProviderProps {
  children: ReactNode
}

export function OrganizationProvider({ children }: OrganizationProviderProps) {
  const [currentOrganizationId, setCurrentOrganizationId] = useState<string | null>(() => {
    // Initialize from localStorage on mount
    return localStorage.getItem('currentOrganizationId')
  })

  // Sync with localStorage whenever currentOrganizationId changes
  useEffect(() => {
    if (currentOrganizationId) {
      localStorage.setItem('currentOrganizationId', currentOrganizationId)
    } else {
      localStorage.removeItem('currentOrganizationId')
    }
  }, [currentOrganizationId])

  return (
    <OrganizationContext.Provider value={{ currentOrganizationId, setCurrentOrganizationId }}>
      {children}
    </OrganizationContext.Provider>
  )
}

export function useOrganizationContext() {
  const context = useContext(OrganizationContext)
  if (context === undefined) {
    throw new Error('useOrganizationContext must be used within an OrganizationProvider')
  }
  return context
}
