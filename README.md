# Shop Manager MVP 🏪

A comprehensive, mobile-first, multilingual, offline-capable Progressive Web App (PWA) designed specifically for small shopkeepers, grocery stores, and pharmacies. Built with modern web technologies to provide a seamless experience across all devices.

![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)
![React](https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.0-38B2AC?style=for-the-badge&logo=tailwind-css)
![Supabase](https://img.shields.io/badge/Supabase-Database-3ECF8E?style=for-the-badge&logo=supabase)
![PWA](https://img.shields.io/badge/PWA-Ready-5A0FC8?style=for-the-badge&logo=pwa)

## ✨ Key Features

### 🛒 **Sales Management**
- **Smart Cart System**: Add products with real-time stock validation
- **Flexible Pricing**: Edit selling prices per item during checkout
- **Multiple Payment Methods**: Cash, Card, UPI support
- **Invoice Generation**: Professional PDF invoices with shop branding
- **WhatsApp Integration**: Share invoices directly via WhatsApp
- **Offline Sales**: Continue selling even without internet connection

### 📦 **Inventory Management**
- **Product Catalog**: Comprehensive product management with variations
- **Stock Tracking**: Real-time stock levels with automatic updates
- **Low Stock Alerts**: Get notified when products are running low
- **Fractional Units**: Support for decimal quantities (e.g., 1.25 kg)
- **Unit Management**: Multiple measurement units (kg, l, pcs, etc.)
- **Bulk Operations**: Add multiple product variations efficiently

### 📊 **Advanced Reporting**
- **Real-time Analytics**: Live sales, profit, and inventory metrics
- **Period Filtering**: Filter data by Today, Last Week, or Last Month
- **Top-selling Products**: Identify your best performers
- **Payment Method Analysis**: Track payment preferences
- **PDF Export**: Generate professional reports for record-keeping
- **Mobile-optimized Charts**: Beautiful visualizations on any screen

### ⚙️ **Settings & Configuration**
- **Shop Information**: Manage shop name, contact, and GST details
- **User Management**: Role-based access (Owner/Staff)
- **Data Backup/Restore**: Export and import shop data
- **Language Support**: Multi-language interface (English, Hindi, Marathi)
- **App Configuration**: Customize settings for your business needs

### 🌐 **Offline Capabilities**
- **Progressive Web App**: Install as a native app on any device
- **Offline Mode**: Full functionality without internet connection
- **Data Synchronization**: Automatic sync when connection is restored
- **Service Worker**: Background processing and caching
- **Local Storage**: Secure offline data storage

### 📱 **Mobile-First Design**
- **Responsive UI**: Optimized for phones, tablets, and desktops
- **Touch-friendly**: Large buttons and intuitive navigation
- **Fast Loading**: Optimized performance with lazy loading
- **Native Feel**: Smooth animations and transitions

## 🛠️ Tech Stack

### Frontend
- **Next.js 15** - React framework with App Router
- **React 19** - Latest React with concurrent features
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework

### Backend & Database
- **Supabase** - Backend-as-a-Service with PostgreSQL
- **Real-time Subscriptions** - Live data updates
- **Row Level Security** - Secure data access
- **Database Triggers** - Automated stock updates

### PWA & Offline
- **Service Worker** - Offline functionality and caching
- **IndexedDB** - Local data storage
- **Background Sync** - Data synchronization
- **Web App Manifest** - Native app installation

### Internationalization
- **i18next** - Multi-language support
- **Language Detection** - Automatic language switching
- **RTL Support** - Right-to-left language compatibility

### State Management
- **Zustand** - Lightweight state management
- **React Context** - Component state sharing
- **Local Storage** - Persistent data storage

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase account

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/artisthrishi/shop-management.git
   cd shop-management
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env.local` file:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Set up database**
   - Create a Supabase project
   - Run the SQL schema from `supabase-schema.sql`
   - Update environment variables with your Supabase credentials

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

### Database Setup

The application uses the following Supabase tables:

- **`users`** - User management and authentication
- **`products`** - Product catalog and information
- **`product_variations`** - Product variations with stock levels
- **`sales`** - Sales records and transactions
- **`sale_items`** - Individual items in each sale
- **`units`** - Measurement units (kg, l, pcs, etc.)
- **`shop_settings`** - Shop configuration and branding

## 📱 PWA Installation

1. Open the app in Chrome/Edge on mobile or desktop
2. Look for the "Install" prompt or use the browser menu
3. Click "Install" to add to your home screen
4. The app will work offline with full functionality

## 🌍 Multi-language Support

The app supports multiple languages:
- **English** (en) - Default language
- **Hindi** (hi) - हिंदी
- **Marathi** (mr) - मराठी

Language switching is available in the Settings tab.

## 📊 Features in Detail

### Sales Workflow
1. **Search Products**: Quick search with autocomplete
2. **Add to Cart**: Select products and quantities
3. **Adjust Prices**: Modify selling prices as needed
4. **Choose Payment**: Select payment method
5. **Complete Sale**: Generate invoice and update stock
6. **Share Invoice**: Send via WhatsApp or print

### Inventory Management
- **Add Products**: Create products with multiple variations
- **Stock Updates**: Real-time stock level tracking
- **Low Stock Monitoring**: Automatic alerts for reordering
- **Product Categories**: Organize products efficiently
- **Barcode Support**: Ready for barcode scanner integration

### Reporting & Analytics
- **Sales Dashboard**: Overview of daily performance
- **Profit Analysis**: Track margins and profitability
- **Inventory Reports**: Stock value and movement analysis
- **Customer Insights**: Payment method preferences
- **Export Capabilities**: PDF reports for record-keeping

## 🔧 Development

### Project Structure
```
src/
├── app/                 # Next.js App Router pages
│   ├── inventory/       # Inventory management
│   ├── sales/          # Sales and checkout
│   ├── reports/        # Analytics and reporting
│   └── settings/       # Configuration
├── components/         # Reusable UI components
├── lib/               # Utilities and database functions
├── hooks/             # Custom React hooks
├── types/             # TypeScript type definitions
└── locales/           # Internationalization files
```

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## 🚀 Deployment

### Vercel (Recommended)
1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Other Platforms
- **Netlify** - Static site hosting
- **Railway** - Full-stack deployment
- **DigitalOcean** - Custom server deployment

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)
- Powered by [Supabase](https://supabase.com/)
- Icons from [Heroicons](https://heroicons.com/)

## 📞 Support

For support, email support@shopmanager.com or create an issue in this repository.

---

**Built with ❤️ for small business owners**
