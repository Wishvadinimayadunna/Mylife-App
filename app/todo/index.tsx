// ============================================
// ToDo Module
// Task management with priority, categories, subtasks
// ============================================

import { Calendar } from "@/components/ui/calendar";
import todoService from "@/services/todoService";
import {
    RecurrencePattern,
    TaskCategory,
    TaskPriority,
    ToDoTask,
} from "@/types";
import { Stack, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

type TabType = "pending" | "completed" | "all";

const PRIORITIES: TaskPriority[] = ["High", "Medium", "Low"];
const CATEGORIES: TaskCategory[] = [
  "Personal",
  "Work",
  "Shopping",
  "Health",
  "Family",
  "Finance",
  "Other",
];
const RECURRENCE_PATTERNS: RecurrencePattern[] = [
  "Daily",
  "Weekly",
  "Monthly",
  "Yearly",
];

const PRIORITY_COLORS = {
  High: "#EF4444",
  Medium: "#F59E0B",
  Low: "#3B82F6",
};

const PRIORITY_ICONS = {
  High: "🔴",
  Medium: "🟡",
  Low: "🔵",
};

const CATEGORY_ICONS: Record<TaskCategory, string> = {
  Personal: "👤",
  Work: "💼",
  Shopping: "🛒",
  Health: "❤️",
  Family: "👨‍👩‍👧‍👦",
  Finance: "💰",
  Other: "📌",
};

export default function ToDoScreen() {
  const [activeTab, setActiveTab] = useState<TabType>("pending");
  const [tasks, setTasks] = useState<ToDoTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<ToDoTask | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showPrioritySelector, setShowPrioritySelector] = useState(false);
  const [showCategorySelector, setShowCategorySelector] = useState(false);
  const [showRecurrenceSelector, setShowRecurrenceSelector] = useState(false);
  const [subtaskInput, setSubtaskInput] = useState("");
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "Medium" as TaskPriority,
    category: "Personal" as TaskCategory,
    dueDate: null as Date | null,
    dueTime: "",
    isRecurring: false,
    recurrencePattern: undefined as RecurrencePattern | undefined,
    reminderEnabled: false,
    reminderTime: "09:00",
    isShared: false,
    tags: [] as string[],
  });

  // Load tasks
  const loadTasks = async () => {
    setLoading(true);
    try {
      let data: ToDoTask[] = [];
      if (activeTab === "pending") {
        data = await todoService.getPendingTasks();
      } else if (activeTab === "completed") {
        data = await todoService.getCompletedTasks();
      } else {
        data = await todoService.getAllTasks();
      }
      setTasks(data);
    } catch (error) {
      console.error("Load tasks error:", error);
      Alert.alert("Error", "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadTasks();
    }, [activeTab]),
  );

  // Reset form
  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      priority: "Medium",
      category: "Personal",
      dueDate: null,
      dueTime: "",
      isRecurring: false,
      recurrencePattern: undefined,
      reminderEnabled: false,
      reminderTime: "09:00",
      isShared: false,
      tags: [],
    });
    setEditingTask(null);
  };

  // Open add modal
  const openAddModal = () => {
    resetForm();
    setModalVisible(true);
  };

  // Open edit modal
  const openEditModal = (task: ToDoTask) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description || "",
      priority: task.priority,
      category: task.category,
      dueDate: task.dueDate ? new Date(task.dueDate) : null,
      dueTime: task.dueTime || "",
      isRecurring: task.isRecurring,
      recurrencePattern: task.recurrencePattern,
      reminderEnabled: task.reminderEnabled,
      reminderTime: task.reminderTime || "09:00",
      isShared: task.isShared,
      tags: task.tags || [],
    });
    setModalVisible(true);
  };

  // Save task
  const saveTask = async () => {
    if (!formData.title.trim()) {
      Alert.alert("Error", "Please enter task title");
      return;
    }

    try {
      const taskData = {
        title: formData.title,
        description: formData.description,
        priority: formData.priority,
        category: formData.category,
        dueDate: formData.dueDate,
        dueTime: formData.dueTime,
        isRecurring: formData.isRecurring,
        recurrencePattern: formData.isRecurring
          ? formData.recurrencePattern
          : undefined,
        reminderEnabled: formData.reminderEnabled,
        reminderTime: formData.reminderTime,
        isShared: formData.isShared,
        tags: formData.tags,
        isCompleted: false,
      };

      if (editingTask) {
        await todoService.updateTask(editingTask.id, taskData);
      } else {
        await todoService.createTask(taskData as any);
      }

      setModalVisible(false);
      resetForm();
      loadTasks();
    } catch (error) {
      console.error("Save task error:", error);
      Alert.alert("Error", "Failed to save task");
    }
  };

  // Delete task
  const deleteTask = (task: ToDoTask) => {
    Alert.alert("Delete Task", `Delete "${task.title}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await todoService.deleteTask(task.id);
            loadTasks();
          } catch (error) {
            console.error("Delete error:", error);
            Alert.alert("Error", "Failed to delete task");
          }
        },
      },
    ]);
  };

  // Toggle task completion
  const toggleCompletion = async (task: ToDoTask) => {
    try {
      await todoService.toggleTaskCompletion(task.id);
      loadTasks();
    } catch (error) {
      console.error("Toggle completion error:", error);
      Alert.alert("Error", "Failed to update task");
    }
  };

  // Add subtask
  const addSubtask = async (taskId: string) => {
    if (!subtaskInput.trim()) {
      Alert.alert("Error", "Please enter subtask title");
      return;
    }

    try {
      await todoService.addSubtask(taskId, subtaskInput);
      setSubtaskInput("");
      loadTasks();
    } catch (error) {
      console.error("Add subtask error:", error);
      Alert.alert("Error", "Failed to add subtask");
    }
  };

  // Toggle subtask
  const toggleSubtask = async (taskId: string, subtaskId: string) => {
    try {
      await todoService.toggleSubtaskCompletion(taskId, subtaskId);
      loadTasks();
    } catch (error) {
      console.error("Toggle subtask error:", error);
      Alert.alert("Error", "Failed to update subtask");
    }
  };

  // Delete subtask
  const deleteSubtask = async (taskId: string, subtaskId: string) => {
    try {
      await todoService.deleteSubtask(taskId, subtaskId);
      loadTasks();
    } catch (error) {
      console.error("Delete subtask error:", error);
      Alert.alert("Error", "Failed to delete subtask");
    }
  };

  // Render task card
  const renderTaskCard = (task: ToDoTask) => {
    const isExpanded = expandedTaskId === task.id;
    const dueDate = task.dueDate ? new Date(task.dueDate) : null;
    const today = new Date();
    const isOverdue = !task.isCompleted && dueDate && dueDate < today;

    const completedSubtasks =
      task.subtasks?.filter((st) => st.isCompleted).length || 0;
    const totalSubtasks = task.subtasks?.length || 0;

    return (
      <View key={task.id} style={styles.card}>
        <View style={styles.cardHeader}>
          <TouchableOpacity
            onPress={() => toggleCompletion(task)}
            style={styles.checkbox}
          >
            <Text style={styles.checkboxIcon}>
              {task.isCompleted ? "✅" : "⬜"}
            </Text>
          </TouchableOpacity>

          <View style={styles.taskInfo}>
            <Text
              style={[
                styles.taskTitle,
                task.isCompleted && styles.taskTitleCompleted,
              ]}
            >
              {task.title}
            </Text>
            <View style={styles.taskMeta}>
              <View
                style={[
                  styles.priorityBadge,
                  { backgroundColor: PRIORITY_COLORS[task.priority] + "20" },
                ]}
              >
                <Text
                  style={[
                    styles.priorityText,
                    { color: PRIORITY_COLORS[task.priority] },
                  ]}
                >
                  {PRIORITY_ICONS[task.priority]} {task.priority}
                </Text>
              </View>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>
                  {CATEGORY_ICONS[task.category]} {task.category}
                </Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => setExpandedTaskId(isExpanded ? null : task.id)}
          >
            <Text style={styles.expandIcon}>{isExpanded ? "▼" : "▶"}</Text>
          </TouchableOpacity>
        </View>

        {isExpanded && (
          <View style={styles.cardBody}>
            {task.description && (
              <Text style={styles.description}>{task.description}</Text>
            )}

            {dueDate && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>📅 Due:</Text>
                <Text
                  style={[styles.infoValue, isOverdue && styles.overdueText]}
                >
                  {dueDate.toLocaleDateString()}
                  {task.dueTime && ` at ${task.dueTime}`}
                  {isOverdue && " (Overdue)"}
                </Text>
              </View>
            )}

            {task.isRecurring && task.recurrencePattern && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>🔄 Recurring:</Text>
                <Text style={styles.infoValue}>{task.recurrencePattern}</Text>
              </View>
            )}

            {task.tags && task.tags.length > 0 && (
              <View style={styles.tagsContainer}>
                {task.tags.map((tag, idx) => (
                  <View key={idx} style={styles.tag}>
                    <Text style={styles.tagText}>#{tag}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Subtasks */}
            {totalSubtasks > 0 && (
              <View style={styles.subtasksContainer}>
                <Text style={styles.subtasksHeader}>
                  Subtasks ({completedSubtasks}/{totalSubtasks})
                </Text>
                {task.subtasks?.map((subtask) => (
                  <View key={subtask._id} style={styles.subtaskRow}>
                    <TouchableOpacity
                      onPress={() => toggleSubtask(task.id, subtask._id!)}
                    >
                      <Text style={styles.subtaskCheckbox}>
                        {subtask.isCompleted ? "✅" : "⬜"}
                      </Text>
                    </TouchableOpacity>
                    <Text
                      style={[
                        styles.subtaskTitle,
                        subtask.isCompleted && styles.subtaskCompleted,
                      ]}
                    >
                      {subtask.title}
                    </Text>
                    <TouchableOpacity
                      onPress={() => deleteSubtask(task.id, subtask._id!)}
                    >
                      <Text style={styles.subtaskDelete}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* Add subtask */}
            <View style={styles.addSubtaskRow}>
              <TextInput
                style={styles.subtaskInput}
                placeholder="Add subtask..."
                value={subtaskInput}
                onChangeText={setSubtaskInput}
              />
              <TouchableOpacity
                style={styles.addSubtaskButton}
                onPress={() => addSubtask(task.id)}
              >
                <Text style={styles.addSubtaskButtonText}>+</Text>
              </TouchableOpacity>
            </View>

            {/* Actions */}
            <View style={styles.cardActions}>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => openEditModal(task)}
              >
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => deleteTask(task)}
              >
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <>
      <Stack.Screen options={{ title: "To-Do List", headerShown: true }} />
      <View style={styles.container}>
        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "pending" && styles.activeTab]}
            onPress={() => setActiveTab("pending")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "pending" && styles.activeTabText,
              ]}
            >
              ⏳ Pending
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === "completed" && styles.activeTab]}
            onPress={() => setActiveTab("completed")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "completed" && styles.activeTabText,
              ]}
            >
              ✅ Done
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === "all" && styles.activeTab]}
            onPress={() => setActiveTab("all")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "all" && styles.activeTabText,
              ]}
            >
              📋 All
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3B82F6" />
          </View>
        ) : tasks.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>✅</Text>
            <Text style={styles.emptyText}>No tasks found</Text>
            <Text style={styles.emptySubtext}>
              Tap + to create your first task
            </Text>
          </View>
        ) : (
          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {tasks.map(renderTaskCard)}
            <View style={styles.bottomPadding} />
          </ScrollView>
        )}

        {/* FAB */}
        <TouchableOpacity style={styles.fab} onPress={openAddModal}>
          <Text style={styles.fabIcon}>+</Text>
        </TouchableOpacity>

        {/* Add/Edit Modal */}
        <Modal
          visible={modalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => {
            setModalVisible(false);
            resetForm();
          }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editingTask ? "Edit Task" : "New Task"}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setModalVisible(false);
                    resetForm();
                  }}
                >
                  <Text style={styles.closeButton}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.modalBody}
                showsVerticalScrollIndicator={false}
              >
                {/* Title */}
                <Text style={styles.label}>Title *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter task title"
                  value={formData.title}
                  onChangeText={(text) =>
                    setFormData({ ...formData, title: text })
                  }
                />

                {/* Description */}
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Add details..."
                  multiline
                  numberOfLines={3}
                  value={formData.description}
                  onChangeText={(text) =>
                    setFormData({ ...formData, description: text })
                  }
                />

                {/* Priority */}
                <Text style={styles.label}>Priority</Text>
                <TouchableOpacity
                  style={styles.input}
                  onPress={() => setShowPrioritySelector(true)}
                >
                  <Text style={styles.inputText}>
                    {PRIORITY_ICONS[formData.priority]} {formData.priority}
                  </Text>
                </TouchableOpacity>

                {/* Category */}
                <Text style={styles.label}>Category</Text>
                <TouchableOpacity
                  style={styles.input}
                  onPress={() => setShowCategorySelector(true)}
                >
                  <Text style={styles.inputText}>
                    {CATEGORY_ICONS[formData.category]} {formData.category}
                  </Text>
                </TouchableOpacity>

                {/* Due Date */}
                <Text style={styles.label}>Due Date</Text>
                <TouchableOpacity
                  style={styles.input}
                  onPress={() => setShowCalendar(true)}
                >
                  <Text style={styles.inputText}>
                    {formData.dueDate
                      ? formData.dueDate.toLocaleDateString()
                      : "No date set"}
                  </Text>
                </TouchableOpacity>

                {formData.dueDate && (
                  <>
                    <Text style={styles.label}>Due Time</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="HH:MM (e.g., 14:30)"
                      value={formData.dueTime}
                      onChangeText={(text) =>
                        setFormData({ ...formData, dueTime: text })
                      }
                    />
                  </>
                )}

                {/* Recurring */}
                <View style={styles.switchRow}>
                  <Text style={styles.label}>Recurring Task</Text>
                  <Switch
                    value={formData.isRecurring}
                    onValueChange={(value) =>
                      setFormData({ ...formData, isRecurring: value })
                    }
                    trackColor={{ false: "#E5E7EB", true: "#3B82F6" }}
                  />
                </View>

                {formData.isRecurring && (
                  <>
                    <Text style={styles.label}>Recurrence Pattern</Text>
                    <TouchableOpacity
                      style={styles.input}
                      onPress={() => setShowRecurrenceSelector(true)}
                    >
                      <Text style={styles.inputText}>
                        {formData.recurrencePattern || "Select pattern"}
                      </Text>
                    </TouchableOpacity>
                  </>
                )}

                {/* Reminder */}
                <View style={styles.switchRow}>
                  <Text style={styles.label}>Enable Reminder</Text>
                  <Switch
                    value={formData.reminderEnabled}
                    onValueChange={(value) =>
                      setFormData({ ...formData, reminderEnabled: value })
                    }
                    trackColor={{ false: "#E5E7EB", true: "#3B82F6" }}
                  />
                </View>

                {formData.reminderEnabled && (
                  <>
                    <Text style={styles.label}>Reminder Time</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="HH:MM (e.g., 09:00)"
                      value={formData.reminderTime}
                      onChangeText={(text) =>
                        setFormData({ ...formData, reminderTime: text })
                      }
                    />
                  </>
                )}

                {/* Shared */}
                <View style={styles.switchRow}>
                  <Text style={styles.label}>Shared Task</Text>
                  <Switch
                    value={formData.isShared}
                    onValueChange={(value) =>
                      setFormData({ ...formData, isShared: value })
                    }
                    trackColor={{ false: "#E5E7EB", true: "#3B82F6" }}
                  />
                </View>

                {/* Save Button */}
                <TouchableOpacity style={styles.saveButton} onPress={saveTask}>
                  <Text style={styles.saveButtonText}>
                    {editingTask ? "Update Task" : "Create Task"}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Calendar Modal */}
        {showCalendar && (
          <Modal
            visible={showCalendar}
            animationType="fade"
            transparent={true}
            onRequestClose={() => setShowCalendar(false)}
          >
            <View style={styles.calendarOverlay}>
              <View style={styles.calendarModal}>
                <View style={styles.calendarHeader}>
                  <Text style={styles.calendarTitle}>Select Due Date</Text>
                  <TouchableOpacity onPress={() => setShowCalendar(false)}>
                    <Text style={styles.closeButton}>✕</Text>
                  </TouchableOpacity>
                </View>
                <Calendar
                  onSelectDate={(date) => {
                    setFormData({ ...formData, dueDate: date });
                    setShowCalendar(false);
                  }}
                  selectedDate={formData.dueDate || new Date()}
                />
                <TouchableOpacity
                  style={styles.clearDateButton}
                  onPress={() => {
                    setFormData({ ...formData, dueDate: null });
                    setShowCalendar(false);
                  }}
                >
                  <Text style={styles.clearDateText}>Clear Date</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        )}

        {/* Priority Selector Modal */}
        {showPrioritySelector && (
          <Modal
            visible={showPrioritySelector}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setShowPrioritySelector(false)}
          >
            <View style={styles.selectorOverlay}>
              <View style={styles.selectorContent}>
                <View style={styles.selectorHeader}>
                  <Text style={styles.selectorTitle}>Select Priority</Text>
                  <TouchableOpacity
                    onPress={() => setShowPrioritySelector(false)}
                  >
                    <Text style={styles.closeButton}>✕</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.selectorBody}>
                  {PRIORITIES.map((priority) => (
                    <TouchableOpacity
                      key={priority}
                      style={[
                        styles.selectorOption,
                        formData.priority === priority &&
                          styles.activeSelectorOption,
                      ]}
                      onPress={() => {
                        setFormData({ ...formData, priority });
                        setShowPrioritySelector(false);
                      }}
                    >
                      <Text style={styles.selectorIcon}>
                        {PRIORITY_ICONS[priority]}
                      </Text>
                      <Text
                        style={[
                          styles.selectorText,
                          { color: PRIORITY_COLORS[priority] },
                        ]}
                      >
                        {priority}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          </Modal>
        )}

        {/* Category Selector Modal */}
        {showCategorySelector && (
          <Modal
            visible={showCategorySelector}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setShowCategorySelector(false)}
          >
            <View style={styles.selectorOverlay}>
              <View style={styles.selectorContent}>
                <View style={styles.selectorHeader}>
                  <Text style={styles.selectorTitle}>Select Category</Text>
                  <TouchableOpacity
                    onPress={() => setShowCategorySelector(false)}
                  >
                    <Text style={styles.closeButton}>✕</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.selectorBody}>
                  {CATEGORIES.map((category) => (
                    <TouchableOpacity
                      key={category}
                      style={[
                        styles.selectorOption,
                        formData.category === category &&
                          styles.activeSelectorOption,
                      ]}
                      onPress={() => {
                        setFormData({ ...formData, category });
                        setShowCategorySelector(false);
                      }}
                    >
                      <Text style={styles.selectorIcon}>
                        {CATEGORY_ICONS[category]}
                      </Text>
                      <Text style={styles.selectorText}>{category}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          </Modal>
        )}

        {/* Recurrence Selector Modal */}
        {showRecurrenceSelector && (
          <Modal
            visible={showRecurrenceSelector}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setShowRecurrenceSelector(false)}
          >
            <View style={styles.selectorOverlay}>
              <View style={styles.selectorContent}>
                <View style={styles.selectorHeader}>
                  <Text style={styles.selectorTitle}>
                    Select Recurrence Pattern
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowRecurrenceSelector(false)}
                  >
                    <Text style={styles.closeButton}>✕</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.selectorBody}>
                  {RECURRENCE_PATTERNS.map((pattern) => (
                    <TouchableOpacity
                      key={pattern}
                      style={[
                        styles.selectorOption,
                        formData.recurrencePattern === pattern &&
                          styles.activeSelectorOption,
                      ]}
                      onPress={() => {
                        setFormData({
                          ...formData,
                          recurrencePattern: pattern,
                        });
                        setShowRecurrenceSelector(false);
                      }}
                    >
                      <Text style={styles.selectorText}>{pattern}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          </Modal>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  activeTab: {
    borderBottomColor: "#3B82F6",
  },
  tabText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  activeTabText: {
    color: "#3B82F6",
    fontWeight: "700",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginBottom: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  checkbox: {
    marginRight: 12,
  },
  checkboxIcon: {
    fontSize: 24,
  },
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 6,
  },
  taskTitleCompleted: {
    textDecorationLine: "line-through",
    color: "#9CA3AF",
  },
  taskMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  priorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: "600",
  },
  categoryBadge: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 12,
    color: "#374151",
    fontWeight: "500",
  },
  expandIcon: {
    fontSize: 16,
    color: "#6B7280",
    marginLeft: 8,
  },
  cardBody: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  description: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 12,
    lineHeight: 20,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "500",
  },
  infoValue: {
    fontSize: 13,
    color: "#1F2937",
    fontWeight: "600",
  },
  overdueText: {
    color: "#DC2626",
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  tag: {
    backgroundColor: "#DBEAFE",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 11,
    color: "#1E40AF",
    fontWeight: "600",
  },
  subtasksContainer: {
    marginTop: 12,
    backgroundColor: "#F9FAFB",
    padding: 12,
    borderRadius: 8,
  },
  subtasksHeader: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 8,
  },
  subtaskRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  subtaskCheckbox: {
    fontSize: 16,
    marginRight: 8,
  },
  subtaskTitle: {
    flex: 1,
    fontSize: 13,
    color: "#1F2937",
  },
  subtaskCompleted: {
    textDecorationLine: "line-through",
    color: "#9CA3AF",
  },
  subtaskDelete: {
    fontSize: 16,
    color: "#EF4444",
    marginLeft: 8,
  },
  addSubtaskRow: {
    flexDirection: "row",
    marginTop: 12,
    gap: 8,
  },
  subtaskInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    backgroundColor: "#FFFFFF",
  },
  addSubtaskButton: {
    backgroundColor: "#3B82F6",
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  addSubtaskButtonText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "600",
  },
  cardActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 12,
  },
  editButton: {
    backgroundColor: "#3B82F6",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
  },
  editButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  deleteButton: {
    backgroundColor: "#EF4444",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  deleteButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#3B82F6",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  fabIcon: {
    fontSize: 28,
    color: "#FFFFFF",
    fontWeight: "300",
  },
  bottomPadding: {
    height: 100,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
  },
  closeButton: {
    fontSize: 24,
    color: "#6B7280",
    fontWeight: "400",
  },
  modalBody: {
    padding: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    backgroundColor: "#FFFFFF",
    color: "#1F2937",
  },
  inputText: {
    fontSize: 15,
    color: "#1F2937",
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
  },
  saveButton: {
    backgroundColor: "#3B82F6",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 24,
    marginBottom: 8,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  calendarOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  calendarModal: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    width: "100%",
    maxWidth: 400,
  },
  calendarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  calendarTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  clearDateButton: {
    padding: 16,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  clearDateText: {
    color: "#EF4444",
    fontSize: 14,
    fontWeight: "600",
  },
  selectorOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  selectorContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "70%",
  },
  selectorHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  selectorTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  selectorBody: {
    padding: 8,
  },
  selectorOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    marginBottom: 4,
  },
  activeSelectorOption: {
    backgroundColor: "#EFF6FF",
  },
  selectorIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  selectorText: {
    fontSize: 16,
    color: "#1F2937",
    fontWeight: "500",
  },
});
