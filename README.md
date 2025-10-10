# PayMyDine - Server Deployment Package

A complete restaurant management system with multi-tenant architecture, theme system, and modern frontend.

## 🚀 What's Included

### Backend (Laravel)
- **Multi-tenant API servers** (`api-server-multi-tenant.php`, `admin-api-multi-tenant.php`)
- **Complete Laravel application** with admin panel
- **Database schema** (`paymydine.sql`) with all tables and relationships
- **Theme management system** with 5 complete themes
- **Payment integration** components
- **Order management** and table booking system

### Frontend (Next.js)
- **Modern React/Next.js application** with TypeScript
- **Complete theme system** with 5 themes:
  - Clean Light
  - Modern Dark  
  - Gold Luxury
  - Vibrant Colors
  - Minimal
- **Responsive design** for all devices
- **Payment flow** components
- **Menu management** and ordering system

### Themes
- **Multiple theme options** for different restaurant styles
- **Customizable colors** and branding
- **Responsive layouts** for all screen sizes

## 🛠️ Installation

### Prerequisites
- PHP 8.1+
- Node.js 18+
- MySQL 8.0+
- Composer
- NPM/Yarn

### Backend Setup
```bash
# Install PHP dependencies
composer install

# Configure environment
cp example.env .env
# Edit .env with your database credentials

# Run migrations
php artisan migrate

# Generate application key
php artisan key:generate
```

### Frontend Setup
```bash
cd frontend
npm install
npm run build
```

### Database Setup
```bash
# Import the database schema
mysql -u username -p database_name < paymydine.sql
```

## 🎨 Theme System

The application includes a comprehensive theme system with:
- **5 complete themes** ready to use
- **Dynamic theme switching** without page reload
- **Consistent styling** across all components
- **Customizable colors** and branding

## 📱 Features

- **Multi-tenant architecture** for multiple restaurants
- **Table management** and QR code ordering
- **Menu management** with categories and items
- **Order processing** and payment integration
- **Admin dashboard** for restaurant management
- **Responsive design** for mobile and desktop
- **Theme customization** options

## 🔧 Configuration

### Environment Variables
- Database configuration
- API endpoints
- Theme settings
- Payment gateway credentials

### Theme Configuration
Themes can be customized in `frontend/lib/theme-system.ts` and `frontend/store/theme-store.ts`.

## 📦 Deployment

This package is ready for production deployment with:
- **Optimized builds** for both frontend and backend
- **Production configuration** files
- **Database migrations** and seeders
- **Asset compilation** and optimization

## 🎯 Quick Start

1. Clone this repository
2. Set up your database and configure `.env`
3. Run `composer install` and `npm install`
4. Import the database schema
5. Start the Laravel server: `php artisan serve`
6. Start the Next.js frontend: `cd frontend && npm run dev`

## 📄 License

This project is licensed under the MIT License - see the LICENSE.txt file for details.

## 🤝 Support

For support and questions, please contact the development team.

---

**Ready for Production Deployment** 🚀