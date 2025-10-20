import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is not set');

export const pool = new Pool({ 
  connectionString,
    ssl: {
       rejectUnauthorized: false,  
  },
 });

pool.on('error', (err) => {
  console.error('Unexpected PG client error', err);
});
