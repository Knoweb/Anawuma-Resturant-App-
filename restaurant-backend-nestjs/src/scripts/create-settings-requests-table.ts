import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DataSource } from 'typeorm';

async function createSettingsRequestsTable() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);

  const sql = `
    CREATE TABLE IF NOT EXISTS \`settings_requests\` (
      \`requestId\` int(11) NOT NULL AUTO_INCREMENT,
      \`restaurantId\` int(11) NOT NULL,
      \`requestedBy\` int(11) NOT NULL COMMENT 'Admin user ID who created the request',
      \`requestedChanges\` json NOT NULL COMMENT 'JSON object with requested settings changes',
      \`currentSettings\` json NOT NULL COMMENT 'JSON object with current settings before changes',
      \`status\` enum('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
      \`requestReason\` text DEFAULT NULL COMMENT 'Reason provided by admin for the change request',
      \`reviewedBy\` int(11) DEFAULT NULL COMMENT 'Super Admin user ID who reviewed the request',
      \`reviewNotes\` text DEFAULT NULL COMMENT 'Notes provided by Super Admin during review',
      \`reviewedAt\` datetime DEFAULT NULL COMMENT 'Timestamp when the request was reviewed',
      \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
      \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
      PRIMARY KEY (\`requestId\`),
      KEY \`idx_restaurant_id\` (\`restaurantId\`),
      KEY \`idx_status\` (\`status\`),
      KEY \`idx_created_at\` (\`createdAt\`),
      CONSTRAINT \`fk_settings_requests_restaurant\` FOREIGN KEY (\`restaurantId\`) REFERENCES \`restaurant_tbl\` (\`restaurant_id\`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Stores settings change requests requiring Super Admin approval';
  `;

  await dataSource.query(sql);
  console.log('✅ settings_requests table created successfully');

  await app.close();
  process.exit(0);
}

createSettingsRequestsTable().catch((error) => {
  console.error('❌ Error creating table:', error);
  process.exit(1);
});
