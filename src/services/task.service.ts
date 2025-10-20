import { pool } from '../config/db';

export const getAllTasks = async () => {
  const res = await pool.query(
    `SELECT t.*, u.username AS created_by_username, u2.username AS last_edited_by_username
     FROM tasks t
     LEFT JOIN users u ON t.created_by = u.id
     LEFT JOIN users u2 ON t.last_edited_by = u2.id
     ORDER BY t.created_at DESC`
  );
  return res.rows;
};

export const createTask = async (title: string, body: string | null, userId: string) => {
  const res = await pool.query(
    `INSERT INTO tasks (title, body, created_by, last_edited_by) VALUES ($1, $2, $3, $3) RETURNING *`,
    [title, body, userId]
  );
  return res.rows[0];
};

export const updateTask = async (id: string, title: string, body: string | null, userId: string) => {
  const res = await pool.query(
    `UPDATE tasks SET title=$1, body=$2, last_edited_by=$3, updated_at=NOW() WHERE id=$4 RETURNING *`,
    [title, body, userId, id]
  );
  return res.rows[0];
};

export const deleteTask = async (id: string) => {
  await pool.query('DELETE FROM tasks WHERE id=$1', [id]);
};
