import { Pool } from "pg";

export const pool = new Pool({
  user: "test",
  host: "localhost",
  database: "test",
  password: "test",
  port: 5432,
});