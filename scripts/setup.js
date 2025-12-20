const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

console.log('🚀 Setting up StudyMode...\n');

// Check if .env.local exists
const envPath = path.join(__dirname, '..', '.env.local');
const envExamplePath = path.join(__dirname, '..', '.env.example');

if (fs.existsSync(envPath)) {
  console.log('✓ .env.local already exists');
} else {
  console.log('📝 Creating .env.local file...');
  
  // Generate a secure JWT secret
  const jwtSecret = crypto.randomBytes(32).toString('hex');
  
  const envContent = `# MongoDB Connection URI
MONGODB_URI=mongodb://localhost:27017/studymode
# Or use MongoDB Atlas:
# MONGODB_URI=

# JWT Secret
JWT_SECRET=${jwtSecret}

# Next.js
NEXT_PUBLIC_API_URL=http://localhost:3000
`;

  fs.writeFileSync(envPath, envContent);
  console.log('✓ .env.local created with random JWT secret');
}

console.log('\n✨ Setup complete!\n');
console.log('Next steps:');
console.log('1. Make sure MongoDB is running (mongod)');
console.log('2. Update MONGODB_URI in .env.local if needed');
console.log('3. Run: npm run dev');
console.log('4. Open: http://localhost:3000\n');

