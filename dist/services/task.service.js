"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteTask = exports.updateTask = exports.createTask = exports.getAllTasks = void 0;
const db_1 = require("../config/db");
const getAllTasks = async () => {
    const res = await db_1.pool.query(`SELECT t.*, u.username AS created_by_username, u2.username AS last_edited_by_username
     FROM tasks t
     LEFT JOIN users u ON t.created_by = u.id
     LEFT JOIN users u2 ON t.last_edited_by = u2.id
     ORDER BY t.created_at DESC`);
    return res.rows;
};
exports.getAllTasks = getAllTasks;
const createTask = async (title, body, userId) => {
    const res = await db_1.pool.query(`INSERT INTO tasks (title, body, created_by, last_edited_by) VALUES ($1, $2, $3, $3) RETURNING *`, [title, body, userId]);
    return res.rows[0];
};
exports.createTask = createTask;
const updateTask = async (id, title, body, userId) => {
    const res = await db_1.pool.query(`UPDATE tasks SET title=$1, body=$2, last_edited_by=$3, updated_at=NOW() WHERE id=$4 RETURNING *`, [title, body, userId, id]);
    return res.rows[0];
};
exports.updateTask = updateTask;
const deleteTask = async (id) => {
    await db_1.pool.query('DELETE FROM tasks WHERE id=$1', [id]);
};
exports.deleteTask = deleteTask;
