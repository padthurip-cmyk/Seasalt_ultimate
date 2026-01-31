# 🫙 SeaSalt Pickles - E-Commerce Platform

A production-ready e-commerce web application for SeaSalt Pickles, featuring authentic Andhra-style pickles, masalas, and sweets.

![SeaSalt Pickles](https://via.placeholder.com/800x400/D4451A/FFFFFF?text=SeaSalt+Pickles)

## 🌟 Features

### Customer Features
- **Mobile-First Design**: Swiggy-inspired UI optimized for mobile devices
- **Product Catalog**: Browse products by category with search functionality
- **Spin Wheel Marketing**: Welcome gift spin wheel with wallet rewards
- **Firebase OTP Authentication**: Secure phone-based login
- **Wallet System**: Store rewards and use for purchases
- **Cart & Checkout**: Seamless shopping experience
- **Razorpay Integration**: Secure payment processing

### Admin Features
- **Product Management**: Add, edit, delete products
- **Order Management**: View and update order status
- **User Management**: View users and wallet balances
- **Spin Wheel Control**: Enable/disable spin wheel, reset user spins
- **Site Configuration**: Manage delivery charges, rewards, etc.

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | HTML5, Tailwind CSS, Vanilla JavaScript |
| **Backend** | Netlify Functions (Node.js) |
| **Database** | MongoDB Atlas |
| **Authentication** | Firebase OTP |
| **Payments** | Razorpay |
| **Hosting** | Netlify |

## 📁 Project Structure

```
seasalt-pickles/
├── public/                    # Static frontend files
│   ├── index.html            # Main application
│   ├── css/
│   │   └── main.css          # Custom styles
│   ├── js/
│   │   ├── config.js         # Configuration
│   │   ├── store.js          # State management
│   │   ├── api.js            # API service
│   │   ├── ui.js             # UI rendering
│   │   ├── spinwheel.js      # Spin wheel module
│   │   ├── cart.js           # Cart & checkout
│   │   └── app.js            # Main application
│   └── data/
│       └── products-seed.json # Product seed data
├── admin/                     # Admin panel
│   ├── index.html
│   └── js/
│       └── admin.js
├── netlify/
│   └── functions/            # Serverless functions
│       ├── products.js
│       ├── categories.js
│       ├── orders.js
│       ├── users.js
│       ├── wallet.js
│       ├── spin.js
│       └── config.js
├── scripts/
│   └── seed-database.js      # Database seeding script
├── data/
│   └── products-seed.json    # Master product data
├── netlify.toml              # Netlify configuration
├── package.json              # Dependencies
└── README.md                 # This file
```

## 🚀 Deployment Guide

### Prerequisites

1. **GitHub Account**: For version control
2. **Netlify Account**: For hosting (free tier available)
3. **MongoDB Atlas Account**: For database (free tier available)
4. **Firebase Project**: For OTP authentication
5. **Razorpay Account**: For payments (optional for testing)

### Step 1: Set Up MongoDB Atlas

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a new cluster (free tier M0)
3. Create a database user with password
4. Whitelist IP addresses (0.0.0.0/0 for development)
5. Get your connection string:
   ```
   mongodb+srv://username:password@cluster0.xxxxx.mongodb.net
   ```

### Step 2: Set Up Firebase

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project
3. Enable Phone Authentication
4. Copy your Firebase config from Project Settings
5. Update `public/js/config.js` with your Firebase credentials

### Step 3: Set Up Razorpay (Optional)

1. Go to [Razorpay Dashboard](https://dashboard.razorpay.com)
2. Create an account and get API keys
3. Update `public/js/config.js` with your Razorpay Key ID

### Step 4: Push to GitHub

```bash
# Initialize git repository
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit: SeaSalt Pickles e-commerce platform"

# Add your GitHub repository as remote
git remote add origin https://github.com/YOUR_USERNAME/seasalt-pickles.git

# Push to GitHub
git push -u origin main
```

### Step 5: Deploy to Netlify

#### Option A: Via Netlify Dashboard

1. Go to [Netlify](https://app.netlify.com)
2. Click "Add new site" → "Import an existing project"
3. Connect to GitHub and select your repository
4. Configure build settings:
   - Build command: (leave empty)
   - Publish directory: `public`
5. Click "Deploy site"

#### Option B: Via Netlify CLI

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Initialize site
netlify init

# Deploy
netlify deploy --prod
```

### Step 6: Configure Environment Variables

In Netlify Dashboard → Site Settings → Environment Variables, add:

| Variable | Description |
|----------|-------------|
| `MONGODB_URI` | MongoDB connection string |
| `DB_NAME` | Database name (default: `seasalt_pickles`) |
| `RAZORPAY_KEY_ID` | Razorpay API Key ID |
| `RAZORPAY_KEY_SECRET` | Razorpay API Secret |

### Step 7: Seed the Database

```bash
# Set environment variables
export MONGODB_URI="your-mongodb-connection-string"
export DB_NAME="seasalt_pickles"

# Install dependencies
npm install

# Run seed script
npm run seed
```

Or use the Admin Panel to import products.

## 📱 Usage

### Customer App
- Visit your Netlify URL (e.g., `https://seasalt-pickles.netlify.app`)
- First-time visitors see the spin wheel
- Browse products, add to cart, checkout

### Admin Panel
- Visit `/admin` (e.g., `https://seasalt-pickles.netlify.app/admin`)
- Default credentials:
  - Username: `admin`
  - Password: `seasalt@2024`
- **⚠️ Change these in production!**

## ⚙️ Configuration

### Spin Wheel Settings

In `public/js/config.js`:

```javascript
SPIN_WHEEL: {
    ENABLED: true,           // Master switch
    WINNING_ODDS: 30,        // 1 in 30 chance
    REWARDS: [99, 299, 599], // Reward amounts in INR
    REWARD_PROBABILITIES: {
        99: 0.7,    // 70% of wins
        299: 0.25,  // 25% of wins
        599: 0.05   // 5% of wins
    }
}
```

### Delivery Settings

```javascript
DELIVERY: {
    STANDARD_CHARGE: 50,
    FREE_DELIVERY_ABOVE: 500,
    ESTIMATED_DAYS: {
        LOCAL: '2-3',
        OUTSTATION: '5-7'
    }
}
```

## 🗄️ MongoDB Schema

### Products Collection
```javascript
{
    id: String,
    name: String,
    description: String,
    images: [String],
    primaryCategory: String,
    subCategory: String,
    ribbon: String,
    variants: [{
        size: String,
        price: Number
    }],
    active: Boolean,
    brand: String,
    createdAt: Date,
    updatedAt: Date
}
```

### Orders Collection
```javascript
{
    orderId: String,
    user: { phone: String, name: String },
    address: Object,
    items: Array,
    subtotal: Number,
    deliveryCharge: Number,
    walletDiscount: Number,
    total: Number,
    paymentMethod: String,
    paymentId: String,
    status: String,
    statusHistory: Array,
    createdAt: Date
}
```

### Wallets Collection
```javascript
{
    phone: String,
    balance: Number,
    transactions: [{
        id: String,
        type: 'credit' | 'debit',
        amount: Number,
        description: String,
        timestamp: Date
    }]
}
```

## 🔒 Security Considerations

1. **Change Default Admin Credentials**: Update in `admin/js/admin.js`
2. **Environment Variables**: Never commit secrets to git
3. **MongoDB Access**: Use IP whitelisting in production
4. **HTTPS**: Netlify provides free SSL certificates
5. **Rate Limiting**: Consider implementing for APIs

## 🐛 Troubleshooting

### Products Not Loading
- Check if MongoDB URI is correct
- Verify database has been seeded
- Check Netlify function logs

### Spin Wheel Not Showing
- Check `CONFIG.SPIN_WHEEL.ENABLED` in config
- Clear localStorage and refresh
- Check browser console for errors

### Payment Failing
- Verify Razorpay credentials
- Check if in test mode
- Review Razorpay dashboard for errors

## 📞 Support

For support or customization:
- Email: support@seasaltpickles.com
- Website: https://seasaltpickles.com

## 📄 License

MIT License - feel free to use for your own projects!

---

Made with ❤️ for SeaSalt Pickles
