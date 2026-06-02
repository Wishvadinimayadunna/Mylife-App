// ============================================
// ToDo Service
// Task management with priority, categories, subtasks
// ============================================

import { ToDoTask } from "@/types";
import apiClient from "@/utils/api";

const mapTask = (task: any): ToDoTask => {
  if (!task) return task;
  return {
    ...task,
    id: String(task._id || task.id),
  };
};

const mapTasks = (tasks: any[]): ToDoTask[] => {
  if (!Array.isArray(tasks)) return [];
  return tasks.map(mapTask);
};

const todoService = {
  // Get all tasks
  async getAllTasks(): Promise<ToDoTask[]> {
    try {
      const response = await apiClient.get("/todo");
      return mapTasks(response.data);
    } catch (error) {
      console.error("Get all tasks error:", error);
      throw error;
    }
  },

  // Get pending tasks
  async getPendingTasks(): Promise<ToDoTask[]> {
    try {
      const response = await apiClient.get("/todo/pending");
      return mapTasks(response.data);
    } catch (error) {
      console.error("Get pending tasks error:", error);
      throw error;
    }
  },

  // Get completed tasks
  async getCompletedTasks(): Promise<ToDoTask[]> {
    try {
      const response = await apiClient.get("/todo/completed");
      return mapTasks(response.data);
    } catch (error) {
      console.error("Get completed tasks error:", error);
      throw error;
    }
  },

  // Get tasks by priority
  async getTasksByPriority(priority: string): Promise<ToDoTask[]> {
    try {
      const response = await apiClient.get(`/todo/priority/${priority}`);
      return mapTasks(response.data);
    } catch (error) {
      console.error("Get tasks by priority error:", error);
      throw error;
    }
  },

  // Get tasks by category
  async getTasksByCategory(category: string): Promise<ToDoTask[]> {
    try {
      const response = await apiClient.get(`/todo/category/${category}`);
      return mapTasks(response.data);
    } catch (error) {
      console.error("Get tasks by category error:", error);
      throw error;
    }
  },

  // Get overdue tasks
  async getOverdueTasks(): Promise<ToDoTask[]> {
    try {
      const response = await apiClient.get("/todo/overdue");
      return mapTasks(response.data);
    } catch (error) {
      console.error("Get overdue tasks error:", error);
      throw error;
    }
  },

  // Create task
  async createTask(
    data: Omit<ToDoTask, "id" | "createdAt" | "updatedAt">,
  ): Promise<ToDoTask> {
    try {
      const response = await apiClient.post("/todo", data);
      return mapTask(response.data);
    } catch (error) {
      console.error("Create task error:", error);
      throw error;
    }
  },

  // Update task
  async updateTask(id: string, data: Partial<ToDoTask>): Promise<ToDoTask> {
    try {
      const response = await apiClient.put(`/todo/${id}`, data);
      return mapTask(response.data);
    } catch (error) {
      console.error("Update task error:", error);
      throw error;
    }
  },

  // Toggle task completion
  async toggleTaskCompletion(id: string): Promise<ToDoTask> {
    try {
      const response = await apiClient.patch(`/todo/${id}/toggle`);
      return mapTask(response.data);
    } catch (error) {
      console.error("Toggle task error:", error);
      throw error;
    }
  },

  // Delete task
  async deleteTask(id: string): Promise<void> {
    try {
      await apiClient.delete(`/todo/${id}`);
    } catch (error) {
      console.error("Delete task error:", error);
      throw error;
    }
  },

  // Add subtask
  async addSubtask(taskId: string, title: string): Promise<ToDoTask> {
    try {
      const response = await apiClient.post(`/todo/${taskId}/subtasks`, {
        title,
      });
      return mapTask(response.data);
    } catch (error) {
      console.error("Add subtask error:", error);
      throw error;
    }
  },

  // Toggle subtask completion
  async toggleSubtaskCompletion(
    taskId: string,
    subtaskId: string,
  ): Promise<ToDoTask> {
    try {
      const response = await apiClient.patch(
        `/todo/${taskId}/subtasks/${subtaskId}/toggle`,
      );
      return mapTask(response.data);
    } catch (error) {
      console.error("Toggle subtask error:", error);
      throw error;
    }
  },

  // Delete subtask
  async deleteSubtask(taskId: string, subtaskId: string): Promise<ToDoTask> {
    try {
      const response = await apiClient.delete(
        `/todo/${taskId}/subtasks/${subtaskId}`,
      );
      return mapTask(response.data);
    } catch (error) {
      console.error("Delete subtask error:", error);
      throw error;
    }
  },
};

export default todoService;
