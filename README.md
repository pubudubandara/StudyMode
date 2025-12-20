# StudyMode - Flow Stopwatch & Analytics

A Next.js application for tracking study/focus sessions with timer, analytics, and MongoDB backend.

## Features

- ⏱️ **Timer**: Accurate stopwatch with target time tracking
- 📊 **Analytics**: Daily, weekly, and monthly statistics with charts
- 🔐 **Authentication**: Secure login/signup with JWT
- 💾 **Data Persistence**: MongoDB for storing session data
- 📥 **Import/Export**: XML file support for data portability
- 🎨 **Modern UI**: Beautiful dark theme with Tailwind CSS
- ⌨️ **Keyboard Shortcuts**: Space to play/pause, R to reset

## Tech Stack

- **Frontend**: Next.js 15, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, MongoDB, Mongoose
- **Authentication**: JWT (JSON Web Tokens), bcryptjs
- **Charts**: Chart.js
- **Icons**: Font Awesome

## Prerequisites

- Node.js 18+ 
- MongoDB (local or MongoDB Atlas)
- npm or yarn

## Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd studymode
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**

Create a `.env.local` file in the root directory:

```env
# MongoDB Connection URI
MONGODB_URI=mongodb://localhost:27017/studymode
# Or use MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/studymode?retryWrites=true&w=majority

# JWT Secret - Change this to a random string in production
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Next.js
NEXT_PUBLIC_API_URL=http://localhost:3000
```

4. **Start MongoDB** (if using local MongoDB)
```bash
mongod
```

5. **Run the development server**
```bash
npm run dev
```

6. **Open your browser**

Navigate to [http://localhost:3000](http://localhost:3000)

## Usage

### First Time Setup

1. Click "Sign Up" to create a new account
2. Enter your name, email, and password
3. You'll be automatically logged in and redirected to the dashboard

### Using the Timer

1. Set your target time (default: 25 minutes)
2. Click the play button or press **Space** to start
3. The timer will track your session
4. When you reach the target, the background changes to "overtime mode"
5. Click pause to stop and save your session
6. Press **R** to reset the timer

### Viewing Analytics

1. Click the "Analysis" tab
2. View your sessions by daily, weekly, or monthly view
3. See total sessions, average duration, and overtime rate
4. Charts show your focus time trends

### Managing History

- **View Today's Sessions**: Default view shows today's sessions
- **Load Previous Days**: Click to expand and see older sessions
- **Add Manual Entry**: Click + to add a session you forgot to track
- **Download Data**: Export your sessions as XML
- **Import Data**: Upload an XML file to restore sessions
- **Clear History**: Remove all sessions (with confirmation)

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Create new user account
- `POST /api/auth/login` - Login user

### Sessions
- `GET /api/sessions` - Get all user sessions
- `POST /api/sessions` - Create or update a session
- `DELETE /api/sessions?sessionId={id}` - Delete a specific session
- `DELETE /api/sessions/clear` - Delete all user sessions

## Project Structure

```
studymode/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── login/route.ts
│   │   │   └── signup/route.ts
│   │   └── sessions/
│   │       ├── route.ts
│   │       └── clear/route.ts
│   ├── dashboard/
│   │   └── page.tsx
│   ├── login/
│   │   └── page.tsx
│   ├── signup/
│   │   └── page.tsx
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── lib/
│   ├── auth-middleware.ts
│   ├── jwt.ts
│   └── mongodb.ts
├── models/
│   ├── Session.ts
│   └── User.ts
├── .env.local
├── .env.example
├── next.config.ts
├── package.json
└── README.md
```

## Database Models

### User Model
```typescript
{
  name: string;
  email: string;
  password: string; // hashed with bcrypt
  createdAt: Date;
  updatedAt: Date;
}
```

### Session Model
```typescript
{
  userId: ObjectId;
  sessionId: number;
  duration: number; // in seconds
  target: number; // in seconds
  date: Date;
  timestamp: number;
  createdAt: Date;
  updatedAt: Date;
}
```

## Security

- Passwords are hashed using bcryptjs (10 salt rounds)
- JWT tokens expire after 7 days
- API routes are protected with authentication middleware
- MongoDB connection uses environment variables

## Development

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Type checking
npm run type-check
```

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

### Environment Variables for Production

Make sure to set these in your hosting platform:
- `MONGODB_URI` - Your MongoDB connection string
- `JWT_SECRET` - A secure random string
- `NEXT_PUBLIC_API_URL` - Your production URL

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - feel free to use this project for your own purposes!

## Support

For issues, questions, or suggestions, please open an issue on GitHub.

---

Built with ❤️ using Next.js and MongoDB
