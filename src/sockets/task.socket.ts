import { Server, Socket } from "socket.io";

interface TaskLock {
  taskId: string;
  userId: string;
}

const activeLocks: Record<string, string> = {}; // taskId -> userId

export const initTaskSocket = (io: Server) => {
  io.on("connection", (socket: Socket) => {
    console.log(` User connected: ${socket.id}`);

    // Lock task
    socket.on("lockTask", ({ taskId, userId }) => {
      if (activeLocks[taskId] && activeLocks[taskId] !== userId) {
        socket.emit("lockError", {
          message: "Task is currently being edited by another user",
        });
        return;
      }

      activeLocks[taskId] = userId;
      io.emit("taskLocked", { taskId, userId });
      console.log(`Task ${taskId} locked by ${userId}`);
    });

    //  Unlock task
    socket.on("unlockTask", ({ taskId, userId }) => {
      if (activeLocks[taskId] === userId) {
        delete activeLocks[taskId];
        io.emit("taskUnlocked", { taskId, userId });
        console.log(` Task ${taskId} unlocked by ${userId}`);
      }
    });

    //  Task created
    socket.on("taskCreated", (task) => {
      io.emit("taskCreated", task);
      console.log(` Task created: ${task.title}`);
    });

    // Task updated
    socket.on("taskUpdated", (task) => {
      io.emit("taskUpdated", task);
      console.log(`✏️ Task updated: ${task.id}`);
    });

    // Task deleted
    socket.on("taskDeleted", (taskId) => {
      io.emit("taskDeleted", taskId);
      console.log(` Task deleted: ${taskId}`);
    });

    // On disconnect
    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.id}`);
      // release any locks held by disconnected user
      for (const [taskId, userId] of Object.entries(activeLocks)) {
        if (userId === socket.id) {
          delete activeLocks[taskId];
          io.emit("taskUnlocked", { taskId, userId });
        }
      }
    });
  });
};
