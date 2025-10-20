import { Request, Response } from "express";
import * as taskService from "../services/task.service";
import { io } from "../server"; // 👈 import the Socket.IO instance

export const getAllTasks = async (_req: Request, res: Response) => {
  try {
    const tasks = await taskService.getAllTasks();
    res.json(tasks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

export const createTask = async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const { title, body } = req.body;
    if (!title) return res.status(400).json({ message: "Title required" });

    const task = await taskService.createTask(title, body || null, user.id);

    // 🔥 Emit real-time event
    io.emit("taskCreated", task);

    res.status(201).json(task);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

export const updateTask = async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const { id } = req.params;
    const { title, body } = req.body;
    const updated = await taskService.updateTask(id, title, body || null, user.id);

    // 🔥 Emit real-time event
    io.emit("taskUpdated", updated);

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

export const deleteTask = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await taskService.deleteTask(id);

    // 🔥 Emit real-time event
    io.emit("taskDeleted", { id });

    res.json({ message: "Deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
