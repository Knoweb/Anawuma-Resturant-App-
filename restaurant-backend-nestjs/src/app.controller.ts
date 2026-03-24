import { Controller, Get, Header } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @Header('Content-Type', 'text/html')
  getApiInfo() {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Restaurant Management API</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 2rem;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 16px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 2rem;
            text-align: center;
        }
        .header h1 { font-size: 2.5rem; margin-bottom: 0.5rem; }
        .header p { font-size: 1.1rem; opacity: 0.9; }
        .badge {
            display: inline-block;
            background: #10b981;
            color: white;
            padding: 0.25rem 0.75rem;
            border-radius: 20px;
            font-size: 0.85rem;
            font-weight: 600;
            margin-top: 0.5rem;
        }
        .content { padding: 2rem; }
        .section {
            margin-bottom: 2rem;
            border-left: 4px solid #667eea;
            padding-left: 1.5rem;
        }
        .section h2 {
            color: #667eea;
            font-size: 1.5rem;
            margin-bottom: 1rem;
        }
        .endpoint {
            background: #f8fafc;
            padding: 1rem;
            margin: 0.5rem 0;
            border-radius: 8px;
            border-left: 3px solid #667eea;
        }
        .endpoint .method {
            display: inline-block;
            padding: 0.25rem 0.75rem;
            border-radius: 4px;
            font-weight: 600;
            font-size: 0.85rem;
            margin-right: 0.5rem;
        }
        .post { background: #34d399; color: white; }
        .get { background: #60a5fa; color: white; }
        .endpoint code {
            background: #1e293b;
            color: #10b981;
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
            font-family: 'Courier New', monospace;
        }
        .features {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1rem;
        }
        .feature-card {
            background: linear-gradient(135deg, #667eea15 0%, #764ba215 100%);
            padding: 1rem;
            border-radius: 8px;
            border: 2px solid #667eea30;
        }
        .feature-card::before {
            content: "✓";
            display: inline-block;
            background: #10b981;
            color: white;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            text-align: center;
            line-height: 24px;
            margin-right: 0.5rem;
            font-weight: bold;
        }
        .status-list { list-style: none; }
        .status-list li {
            padding: 0.5rem;
            margin: 0.25rem 0;
            border-radius: 4px;
        }
        .completed { background: #d1fae5; color: #065f46; }
        .pending { background: #fef3c7; color: #92400e; }
        .info-box {
            background: #eff6ff;
            border: 2px solid #3b82f6;
            color: #1e40af;
            padding: 1rem;
            border-radius: 8px;
            margin-bottom: 1rem;
        }
        .footer {
            background: #f8fafc;
            padding: 1.5rem;
            text-align: center;
            color: #64748b;
            border-top: 1px solid #e2e8f0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🍽️ Restaurant Management API</h1>
            <p>NestJS Backend for Restaurant Management System</p>
            <span class="badge">✓ RUNNING</span>
            <span class="badge">v1.0.0</span>
        </div>
        
        <div class="content">
            <div class="info-box">
                <strong>📊 Database:</strong> Connected to MySQL (restaurant_db) | 
                <strong>🔒 Auth:</strong> JWT Token Based | 
                <strong>⚡ Framework:</strong> NestJS + TypeScript
            </div>

            <div class="section">
                <h2>🔐 Authentication Endpoints</h2>
                <div class="endpoint">
                    <span class="method post">POST</span>
                    <code>/api/auth/login</code>
                    <p style="margin-top: 0.5rem; color: #64748b;">Login for Admin and Super Admin users</p>
                </div>
                <div class="endpoint">
                    <span class="method get">GET</span>
                    <code>/api/auth/profile</code>
                    <p style="margin-top: 0.5rem; color: #64748b;">Get authenticated user profile (Protected - requires JWT token)</p>
                </div>
            </div>

            <div class="section">
                <h2>📚 Documentation Endpoints</h2>
                <div class="endpoint">
                    <span class="method get">GET</span>
                    <code>/api</code>
                    <p style="margin-top: 0.5rem; color: #64748b;">This page - API documentation and info</p>
                </div>
                <div class="endpoint">
                    <span class="method get">GET</span>
                    <code>/api/health</code>
                    <p style="margin-top: 0.5rem; color: #64748b;">Health check and server status</p>
                </div>
            </div>

            <div class="section">
                <h2>✨ Features</h2>
                <div class="features">
                    <div class="feature-card">JWT Authentication</div>
                    <div class="feature-card">Role-based Access Control</div>
                    <div class="feature-card">Restaurant Management</div>
                    <div class="feature-card">Menu Management</div>
                    <div class="feature-card">Order Management</div>
                    <div class="feature-card">Housekeeping System</div>
                </div>
            </div>

            <div class="section">
                <h2>📈 Migration Status</h2>
                <ul class="status-list">
                    <li class="completed">✓ Authentication System</li>
                    <li class="pending">⏳ Restaurant Management APIs</li>
                    <li class="pending">⏳ Menu Management APIs</li>
                    <li class="pending">⏳ Order Management APIs</li>
                    <li class="pending">⏳ Housekeeping APIs</li>
                    <li class="pending">⏳ Reports & Analytics</li>
                </ul>
            </div>
        </div>

        <div class="footer">
            <p><strong>Restaurant Management System</strong> | Powered by NestJS & TypeScript</p>
            <p style="margin-top: 0.5rem; font-size: 0.9rem;">
                Port: 3000 | Environment: Development | 
                <a href="/api/health" style="color: #667eea;">Health Check</a>
            </p>
        </div>
    </div>
</body>
</html>
    `;
  }

  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
    };
  }
}
