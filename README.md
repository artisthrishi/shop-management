# Shop Manager MVP

A mobile-first, multilingual, offline-capable PWA for small shopkeepers (grocery/pharmacy).

## Features

### Reports Tab
- **Real-time Data**: All metrics show actual data from your database
- **Period Filtering**: Filter by Today, Last Week, or Last Month
- **PDF Export**: Export reports as PDF using browser's print functionality
- **Loading States**: Smooth loading animations and skeleton loaders
- **Error Handling**: Graceful error messages with retry options
- **Mobile Responsive**: Works perfectly on all screen sizes

### PDF Export
The reports tab includes a PDF export feature that:
- Uses the browser's native print functionality
- No additional dependencies required
- Generates professional-looking reports
- Includes all key metrics and data
- Works offline
- Automatically opens the print dialog

To export a PDF:
1. Navigate to the Reports tab
2. Select your desired time period
3. Click "Export as PDF"
4. Use your browser's print dialog to save as PDF

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase
- **PWA**: Next-PWA
- **Internationalization**: i18next
- **State Management**: Zustand

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables (see `.env.local.example`)
4. Run the development server: `npm run dev`
5. Open [http://localhost:3000](http://localhost:3000)

## Environment Variables

Create a `.env.local` file with:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Database Schema

The application uses the following Supabase tables:
- `users` - User management
- `products` - Product catalog
- `product_variations` - Product variations with stock
- `sales` - Sales records
- `sale_items` - Individual items in sales
- `units` - Measurement units
- `shop_settings` - Shop configuration

## Deployment

The app is configured as a PWA and can be deployed to:
- Vercel (recommended)
- Netlify
- Any static hosting service

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request
