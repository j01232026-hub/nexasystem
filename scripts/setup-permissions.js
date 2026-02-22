/**
 * 設置員工權限系統
 * 執行：node scripts/setup-permissions.js
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 讀取 .env 檔案
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');
    for (const line of lines) {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim();
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  }
}

// 載入環境變數
loadEnv();

// 讀取環境變數
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 請設定環境變數 VITE_SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY');
  console.error('   或在 .env 檔案中設定');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupPermissions() {
  console.log('🚀 開始設置員工權限系統...\n');

  try {
    // 讀取 SQL 檔案
    const sqlPath = path.join(__dirname, '..', 'src', 'lib', 'staff_permissions_schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // 執行 SQL
    const { error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
      console.error('❌ SQL 執行失敗:', error.message);
      console.log('\n💡 提示：如果 exec_sql 函數不存在，請在 Supabase SQL Editor 手動執行上述 SQL');
      return;
    }

    console.log('✅ 資料庫結構建立完成！');
    console.log('\n📋 已建立：');
    console.log('   • roles 表（3種預設角色）');
    console.log('   • staff 表擴展（role_id, invite_token 等）');
    console.log('   • activity_logs 表（操作日誌）');
    console.log('   • RLS 安全政策');
    console.log('   • 索引和觸發器');

  } catch (err) {
    console.error('❌ 錯誤:', err.message);
    console.log('\n💡 請手動在 Supabase SQL Editor 執行 src/lib/staff_permissions_schema.sql');
  }
}

// 如果直接執行此腳本
if (import.meta.url === `file://${process.argv[1]}`) {
  setupPermissions();
}

export { setupPermissions };
