# Shop Manager MVP - Folder Structure

## Overview
This document outlines the scalable folder structure for the Shop Manager MVP, a progressive web app for managing retail businesses.

## Root Structure
```
shop-manager-mvp/
├── src/
│   ├── app/                    # Next.js App Router pages
│   ├── components/             # Reusable UI components
│   ├── lib/                    # Utility libraries and configurations
│   ├── types/                  # TypeScript type definitions
│   └── locales/                # Internationalization files
├── public/                     # Static assets
├── supabase-schema.sql         # Database schema
└── package.json
```

## Detailed Structure

### `/src/app/` - Next.js App Router
```
app/
├── (tabs)/                     # Route group for tabbed navigation
│   ├── layout.tsx              # Tab layout with bottom navigation
│   ├── page.tsx                # Home page (Dashboard)
│   ├── inventory/
│   │   └── page.tsx            # Inventory management page
│   ├── reports/
│   │   └── page.tsx            # Reports and analytics page
│   └── settings/
│       └── page.tsx            # Settings and configuration page
├── layout.tsx                  # Root layout with i18n initialization
├── page.tsx                    # Root page (redirects to home)
├── globals.css                 # Global styles
└── favicon.ico                 # App icon
```

### `/src/components/` - Reusable Components
```
components/
├── ui/                         # Base UI components
│   ├── Button.tsx              # Reusable button component
│   ├── Card.tsx                # Card component with header/body
│   └── Input.tsx               # Input component with variants
├── LanguageSwitcher.tsx        # Language selection component
└── [feature]/                  # Feature-specific components
    ├── ProductCard.tsx         # Product display component
    ├── CartItem.tsx            # Cart item component
    ├── SaleForm.tsx            # Sale creation form
    └── ReportChart.tsx         # Chart components for reports
```

### `/src/lib/` - Libraries and Utilities
```
lib/
├── supabaseClient.ts           # Supabase client configuration
├── i18n.ts                     # i18next configuration
├── database.ts                 # Database utility functions
└── utils.ts                    # Common utility functions
```

### `/src/types/` - TypeScript Definitions
```
types/
└── index.ts                    # All TypeScript interfaces and types
```

### `/src/locales/` - Internationalization
```
locales/
├── en.json                     # English translations
├── hi.json                     # Hindi translations
└── mr.json                     # Marathi translations
```

## Key Features of This Structure

### 1. **Scalable Organization**
- Clear separation of concerns
- Feature-based component organization
- Reusable UI components in `/ui/`
- Type-safe development with TypeScript

### 2. **Mobile-First Design**
- Bottom navigation for mobile devices
- Responsive layouts using Tailwind CSS
- PWA-ready structure

### 3. **Internationalization**
- Centralized translation files
- Language detection and persistence
- Easy to add new languages

### 4. **Database Integration**
- Type-safe database operations
- Centralized database utilities
- Clean separation of data layer

### 5. **Component Architecture**
- Reusable base components
- Consistent styling patterns
- Easy to maintain and extend

## Best Practices

### Component Organization
- Keep components small and focused
- Use composition over inheritance
- Export components from index files for clean imports

### File Naming
- Use PascalCase for components: `ProductCard.tsx`
- Use camelCase for utilities: `formatCurrency.ts`
- Use kebab-case for pages: `product-details.tsx`

### Import Structure
```typescript
// Prefer absolute imports
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/lib/utils';
import type { Product } from '@/types';

// Avoid relative imports for shared code
// ❌ import { Button } from '../../../components/ui/Button';
```

### Type Safety
- Define interfaces in `/types/`
- Use TypeScript for all components
- Export types from index files

## Future Extensions

### Additional Folders to Consider
```
src/
├── hooks/                      # Custom React hooks
├── stores/                     # State management (Zustand)
├── services/                   # API services
├── constants/                  # App constants
└── styles/                     # Additional styling
```

### Feature Modules
```
src/
└── features/                   # Feature-based organization
    ├── auth/                   # Authentication feature
    ├── products/               # Product management
    ├── sales/                  # Sales and checkout
    └── reports/                # Analytics and reporting
```

This structure provides a solid foundation for scaling the application while maintaining code quality and developer experience. 