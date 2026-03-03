# MyLife Backend API

Node.js + Express + MongoDB backend for MyLife mobile app.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Set Up Environment Variables
Create a `.env` file:
```bash
cp .env.example .env
```

Edit `.env` and add your MongoDB connection string:
```
MONGODB_URI=mongodb://localhost:27017/mylife
JWT_SECRET=your_super_secret_key_here
PORT=5000
FRONTEND_URL=http://localhost:8081
```

### 3. Install MongoDB
- **Option A:** Install MongoDB locally: https://www.mongodb.com/try/download/community
- **Option B:** Use MongoDB Atlas (cloud): https://www.mongodb.com/cloud/atlas/register

### 4. Start the Server
```bash
npm run dev  # Development with auto-restart
# or
npm start    # Production
```

Server will run at: **http://localhost:5000**

## 📋 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (requires auth)

### Profile
- `GET /api/profile` - Get user profile
- `POST /api/profile` - Create profile
- `PUT /api/profile` - Update profile

### Family
- `GET /api/family` - Get all family members
- `GET /api/family/:id` - Get single member
- `POST /api/family` - Add family member
- `PUT /api/family/:id` - Update member
- `DELETE /api/family/:id` - Delete member

### Shopping
- `GET /api/shopping` - Get all shopping items (query: ?type=urgent&bought=false)
- `GET /api/shopping/:id` - Get single item
- `POST /api/shopping` - Add shopping item
- `PUT /api/shopping/:id` - Update item
- `PATCH /api/shopping/:id/bought` - Mark as bought
- `DELETE /api/shopping/:id` - Delete item

### Future Events
- `GET /api/events` - Get all events (query: ?upcoming=true&type=Birthday)
- `GET /api/events/:id` - Get single event
- `POST /api/events` - Create event
- `PUT /api/events/:id` - Update event
- `PATCH /api/events/:id/complete` - Mark as completed
- `DELETE /api/events/:id` - Delete event

## 🔐 Authentication

All endpoints except `/api/auth/*` require authentication.

Include JWT token in request headers:
```
Authorization: Bearer <your_token>
```

## 🗄️ Database Models

- **User** - Authentication (email, password)
- **Profile** - User profile information
- **FamilyMember** - Family members with birthday reminders
- **ShoppingItem** - Shopping list items
- **FutureEvent** - Upcoming events with reminders

## 🧪 Testing

Use Postman or curl to test endpoints:

```bash
# Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"123456"}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"123456"}'
```

## 📁 Project Structure

```
backend/
├── models/           # MongoDB schemas
│   ├── User.js
│   ├── Profile.js
│   ├── FamilyMember.js
│   ├── ShoppingItem.js
│   └── FutureEvent.js
├── routes/           # API routes
│   ├── auth.js
│   ├── profile.js
│   ├── family.js
│   ├── shopping.js
│   └── events.js
├── middleware/       # Custom middleware
│   └── auth.js
├── server.js         # Main server file
├── package.json
└── .env              # Environment variables
```

## 🔧 Development

```bash
npm run dev    # Auto-restart on file changes
```

## 🚢 Deployment

Deploy to:
- Heroku
- Railway
- Render
- DigitalOcean
- AWS/Google Cloud

## 📝 License

MIT
