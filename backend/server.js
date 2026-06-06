const dns = require('dns');
if (dns.setServers) {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
}

const dotenv = require('dotenv');
dotenv.config();

const app = require('./src/app');
const connectDB = require('./src/config/db');

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`\n🏥  Hospital Incident API running on port ${PORT}`);
    console.log(`📊  Environment: ${process.env.NODE_ENV}`);
    console.log(`🌐  CORS Origin: ${process.env.FRONTEND_URL}`);
    console.log(`\n📌  Endpoints:`);
    console.log(`    POST  /api/auth/login`);
    console.log(`    GET   /api/incidents`);
    console.log(`    GET   /api/analytics/summary`);
    console.log(`    GET   /api/export/excel`);
    console.log(`    GET   /health\n`);
  });
}).catch((err) => {
  console.error('Failed to connect to database:', err);
  process.exit(1);
});

// Trigger nodemon restart
