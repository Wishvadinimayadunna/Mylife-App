// ============================================
// ToDo Module
// Redesigned with Header productivity dashboard,
// segmented filter pills, inline task composer,
// left-priority task cards, and real-time subtask progress.
// ============================================

import Calendar from "@/components/ui/calendar";
import { AppCard } from "@/components/ui/AppCard";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { EmptyState, LoadingState } from "@/components/ui/States";
import todoService from "@/services/todoService";
import {
    RecurrencePattern,
    TaskCategory,
    TaskPriority,
    ToDoTask,
} from "@/types";
import { MaterialCommunityIcons } from "@expo/vector-icons";
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
  
  // Selector targets & Modals
  const [selectorTarget, setSelectorTarget] = useState<"composer" | "modal">("composer");
  const [showCalendar, setShowCalendar] = useState(false);
  const [showPrioritySelector, setShowPrioritySelector] = useState(false);
  const [showCategorySelector, setShowCategorySelector] = useState(false);
  const [showRecurrenceSelector, setShowRecurrenceSelector] = useState(false);
  
  // Composer state
  const [composerTitle, setComposerTitle] = useState("");
  const [composerPriority, setComposerPriority] = useState<TaskPriority>("Medium");
  const [composerCategory, setComposerCategory] = useState<TaskCategory>("Personal");
  const [composerDueDate, setComposerDueDate] = useState<Date | undefined>(undefined);

  // Subtask local states
  const [subtaskInput, setSubtaskInput] = useState("");
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  // Edit Modal Form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "Medium" as TaskPriority,
    category: "Personal" as TaskCategory,
    dueDate: undefined as Date | undefined,
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
      // Fetch all tasks and filter/group client-side for smooth segmented transitions
      const data = await todoService.getAllTasks();
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
    }, []),
  );

  // Reset form
  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      priority: "Medium",
      category: "Personal",
      dueDate: undefined,
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

  // Open edit modal
  const openEditModal = (task: ToDoTask) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description || "",
      priority: task.priority,
      category: task.category,
      dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
      dueTime: task.dueTime || "",
      isRecurring: task.isRecurring,
      recurrencePattern: task.recurrencePattern,
      reminderEnabled: task.reminderEnabled,
      reminderTime: task.reminderTime || "09:00",
      isShared: task.isShared,
      tags: task.tags || [],
    });
    setSelectorTarget("modal");
    setModalVisible(true);
  };

  // Save task updates
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
      };

      if (editingTask) {
        await todoService.updateTask(editingTask.id, taskData);
      }

      setModalVisible(false);
      resetForm();
      loadTasks();
    } catch (error) {
      console.error("Save task error:", error);
      Alert.alert("Error", "Failed to save task");
    }
  };

  // Create task from inline composer
  const handleCreateTask = async () => {
    if (!composerTitle.trim()) {
      Alert.alert("Error", "Please type a task title");
      return;
    }

    try {
      const taskData = {
        title: composerTitle,
        description: "",
        priority: composerPriority,
        category: composerCategory,
        dueDate: composerDueDate,
        dueTime: "",
        isRecurring: false,
        reminderEnabled: false,
        isShared: false,
        tags: [],
        isCompleted: false,
      };

      // Optimistic locally-created task card display
      const tempId = "temp-" + Date.now();
      const optimisticTask: ToDoTask = {
        id: tempId,
        profileID: "",
        ...taskData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setTasks((prev) => [optimisticTask, ...prev]);
      setComposerTitle("");
      setComposerDueDate(undefined);

      await todoService.createTask(taskData as any);
      loadTasks();
    } catch (error) {
      console.error("Composer create task error:", error);
      Alert.alert("Error", "Failed to add task");
      loadTasks(); // rollback on error
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
    // Optimistic toggle
    setTasks((prevTasks) =>
      prevTasks.map((t) =>
        t.id === task.id ? { ...t, isCompleted: !t.isCompleted } : t,
      ),
    );

    try {
      await todoService.toggleTaskCompletion(task.id);
      loadTasks();
    } catch (error) {
      console.error("Toggle completion error:", error);
      Alert.alert("Error", "Failed to update task");
      loadTasks(); // Rollback on error
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
    // Optimistic toggle
    setTasks((prevTasks) =>
      prevTasks.map((task) => {
        if (task.id === taskId) {
          const updatedSubtasks = task.subtasks?.map((st) =>
            st._id === subtaskId ? { ...st, isCompleted: !st.isCompleted } : st,
          );
          return { ...task, subtasks: updatedSubtasks };
        }
        return task;
      }),
    );

    try {
      await todoService.toggleSubtaskCompletion(taskId, subtaskId);
      loadTasks();
    } catch (error) {
      console.error("Toggle subtask error:", error);
      Alert.alert("Error", "Failed to update subtask");
      loadTasks(); // Rollback on error
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

  const openCalendarModal = (target: "composer" | "modal") => {
    setSelectorTarget(target);
    setShowCalendar(true);
  };

  const openPrioritySelectorModal = (target: "composer" | "modal") => {
    setSelectorTarget(target);
    setShowPrioritySelector(true);
  };

  const openCategorySelectorModal = (target: "composer" | "modal") => {
    setSelectorTarget(target);
    setShowCategorySelector(true);
  };

  // Helper date matching functions
  const isSameDay = (d1: Date, d2: Date) => {
    return (
      d1.getDate() === d2.getDate() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getFullYear() === d2.getFullYear()
    );
  };

  // Split tasks into sections
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const pendingTasks = tasks.filter((t) => !t.isCompleted);
  const completedTasks = tasks.filter((t) => t.isCompleted);

  const overdueTasks = pendingTasks.filter((t) => {
    if (!t.dueDate) return false;
    const dueDate = new Date(t.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate < today;
  });

  const todayPendingTasks = pendingTasks.filter((t) => {
    if (!t.dueDate) return false;
    const dueDate = new Date(t.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    return isSameDay(dueDate, today);
  });

  const upcomingPendingTasks = pendingTasks.filter((t) => {
    if (!t.dueDate) return false;
    const dueDate = new Date(t.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate > today;
  });

  const noDatePendingTasks = pendingTasks.filter((t) => !t.dueDate);

  // Stats calculation
  const totalCount = tasks.length;
  const doneCount = completedTasks.length;
  const overdueCount = overdueTasks.length;
  const pendingCount = pendingTasks.length;
  const completionRate = totalCount > 0 ? (doneCount / totalCount) * 100 : 0;

  // Render dynamic list group
  const renderGroupSection = (title: string, list: ToDoTask[], badgeColor: string, textColor: string) => {
    if (list.length === 0) return null;
    return (
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>{title}</Text>
          <View style={[styles.sectionBadge, { backgroundColor: badgeColor }]}>
            <Text style={[styles.sectionBadgeText, { color: textColor }]}>
              {list.length}
            </Text>
          </View>
        </View>
        {list.map(renderTaskCard)}
      </View>
    );
  };

  // Render task card
  const renderTaskCard = (task: ToDoTask) => {
    const isExpanded = expandedTaskId === task.id;
    const dueDate = task.dueDate ? new Date(task.dueDate) : null;
    
    // Subtask count
    const completedSubtasks = task.subtasks?.filter((st) => st.isCompleted).length || 0;
    const totalSubtasks = task.subtasks?.length || 0;
    const subtaskPct = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;

    return (
      <AppCard
        key={task.id}
        stripeColor={PRIORITY_COLORS[task.priority]}
        style={task.isCompleted ? styles.completedCardOpacity : undefined}
      >
        <View style={styles.cardHeader}>
          <TouchableOpacity
            onPress={() => toggleCompletion(task)}
            style={styles.checkbox}
          >
            <MaterialCommunityIcons
              name={
                task.isCompleted
                  ? "checkbox-marked-circle"
                  : "checkbox-blank-circle-outline"
              }
              size={24}
              color={task.isCompleted ? "#10B981" : "#9CA3AF"}
            />
          </TouchableOpacity>

          <View style={styles.taskInfo}>
            <Text
              style={[
                styles.taskTitle,
                task.isCompleted && styles.taskTitleCompleted,
              ]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {task.title}
            </Text>
            
            <View style={styles.taskMeta}>
              {/* Priority Indicator Dot & Label */}
              <View style={styles.metaRow}>
                <View
                  style={[
                    styles.priorityDot,
                    { backgroundColor: PRIORITY_COLORS[task.priority] },
                  ]}
                />
                <Text style={styles.metaLabelText}>{task.priority}</Text>
              </View>

              {/* Category tag */}
              <View style={styles.metaRow}>
                <Text style={styles.categoryIconText}>
                  {CATEGORY_ICONS[task.category]}
                </Text>
                <Text style={styles.metaLabelText}>{task.category}</Text>
              </View>

              {/* Due Date tag */}
              {dueDate && (
                <View style={styles.metaRow}>
                  <MaterialCommunityIcons name="calendar" size={12} color="#6B7280" />
                  <Text style={[styles.metaLabelText, overdueCount > 0 && !task.isCompleted && styles.overdueDateText]}>
                    {dueDate.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Chevron toggle */}
          <TouchableOpacity
            onPress={() => setExpandedTaskId(isExpanded ? null : task.id)}
            style={styles.chevron}
          >
            <MaterialCommunityIcons
              name={isExpanded ? "chevron-down" : "chevron-right"}
              size={22}
              color="#6B7280"
            />
          </TouchableOpacity>
        </View>

        {/* Collapsible Accordion details */}
        {isExpanded && (
          <View style={styles.cardBody}>
            {task.description ? (
              <Text style={styles.descriptionText}>{task.description}</Text>
            ) : null}

            {/* Subtasks visual section */}
            <View style={styles.subtasksHeaderRow}>
              <Text style={styles.subtasksTitle}>Subtasks</Text>
              <Text style={styles.subtaskRatioText}>
                {completedSubtasks} of {totalSubtasks} completed
              </Text>
            </View>

            {/* Subtask real-time progress bar */}
            <View style={styles.subtaskProgressContainer}>
              <View style={styles.subtaskProgressTrack}>
                <View
                  style={[
                    styles.subtaskProgressFill,
                    { width: `${subtaskPct}%` },
                  ]}
                />
              </View>
            </View>

            {/* Subtask items list */}
            {totalSubtasks > 0 && (
              <View style={styles.subtaskListContainer}>
                {task.subtasks?.map((subtask) => (
                  <View key={subtask._id} style={styles.subtaskRow}>
                    <TouchableOpacity
                      onPress={() => toggleSubtask(task.id, subtask._id!)}
                    >
                      <MaterialCommunityIcons
                        name={
                          subtask.isCompleted
                            ? "checkbox-marked"
                            : "checkbox-blank-outline"
                        }
                        size={18}
                        color={subtask.isCompleted ? "#10B981" : "#9CA3AF"}
                      />
                    </TouchableOpacity>
                    <Text
                      style={[
                        styles.subtaskTitleText,
                        subtask.isCompleted && styles.subtaskTitleCompleted,
                      ]}
                    >
                      {subtask.title}
                    </Text>
                    <TouchableOpacity
                      onPress={() => deleteSubtask(task.id, subtask._id!)}
                      style={styles.subtaskDeleteButton}
                    >
                      <MaterialCommunityIcons
                        name="close-circle-outline"
                        size={16}
                        color="#EF4444"
                      />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* Add subtask bar */}
            <View style={styles.addSubtaskContainer}>
              <TextInput
                style={styles.subtaskInput}
                placeholder="Add new subtask..."
                value={subtaskInput}
                onChangeText={setSubtaskInput}
              />
              <TouchableOpacity
                style={styles.subtaskAddBtn}
                onPress={() => addSubtask(task.id)}
              >
                <MaterialCommunityIcons name="plus" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* Detailed Actions Footer */}
            <View style={styles.cardActionsContainer}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.editActionBtn]}
                onPress={() => openEditModal(task)}
              >
                <MaterialCommunityIcons name="pencil-outline" size={14} color="#FFFFFF" />
                <Text style={styles.actionBtnText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.deleteActionBtn]}
                onPress={() => deleteTask(task)}
              >
                <MaterialCommunityIcons name="trash-can-outline" size={14} color="#FFFFFF" />
                <Text style={styles.actionBtnText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </AppCard>
    );
  };

  return (
    <>
      <Stack.Screen options={{ title: "To-Do List", headerShown: true }} />
      <View style={styles.container}>
        
        {/* Scrollable Feed Container */}
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          
          {/* Header Productivity Card */}
          <View style={styles.headerCard}>
            <View style={styles.headerTopRow}>
              <View style={styles.greetingSection}>
                <Text style={styles.greetingTitle}>Your Productivity</Text>
                <Text style={styles.greetingSubtitle}>{"Let's"} check off your tasks!</Text>
              </View>
              
              {/* Dynamic Progress Ring */}
              <View style={styles.progressCircle}>
                <Text style={styles.progressPercentText}>{Math.round(completionRate)}%</Text>
                <Text style={styles.progressSubtext}>Done</Text>
              </View>
            </View>
            
            {/* Quick Stat Chips */}
            <View style={styles.statChipsRow}>
              <View style={[styles.statChip, styles.statChipOverdue]}>
                <Text style={[styles.statChipCount, styles.overdueChipText]}>{overdueCount}</Text>
                <Text style={[styles.statChipLabel, styles.overdueChipText]}>Overdue</Text>
              </View>
              
              <View style={[styles.statChip, styles.statChipPending]}>
                <Text style={[styles.statChipCount, styles.pendingChipText]}>{pendingCount}</Text>
                <Text style={[styles.statChipLabel, styles.pendingChipText]}>Pending</Text>
              </View>
              
              <View style={[styles.statChip, styles.statChipDone]}>
                <Text style={[styles.statChipCount, styles.doneChipText]}>{doneCount}</Text>
                <Text style={[styles.statChipLabel, styles.doneChipText]}>Completed</Text>
              </View>
            </View>
          </View>

          {/* Segmented Filter Bar Selector */}
          <SegmentedControl
            tabs={[
              { id: "pending", label: "Pending" },
              { id: "completed", label: "Completed" },
              { id: "all", label: "All Tasks" },
            ]}
            activeTab={activeTab}
            onChange={(id) => setActiveTab(id as TabType)}
          />

          {/* Inline Task Composer Card */}
          <View style={styles.composerCard}>
            <View style={styles.composerInputRow}>
              <TextInput
                style={styles.composerInput}
                placeholder="What needs to be done?"
                placeholderTextColor="#9CA3AF"
                value={composerTitle}
                onChangeText={setComposerTitle}
              />
              <TouchableOpacity
                style={styles.composerSubmitBtn}
                onPress={handleCreateTask}
              >
                <MaterialCommunityIcons name="arrow-up-bold" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* Chips Selector Row */}
            <View style={styles.composerChipsRow}>
              {/* Priority select chip */}
              <TouchableOpacity
                style={[styles.composerChip, styles.composerChipPriority]}
                onPress={() => openPrioritySelectorModal("composer")}
              >
                <View style={[styles.dot, { backgroundColor: PRIORITY_COLORS[composerPriority] }]} />
                <Text style={styles.composerChipText}>{composerPriority}</Text>
              </TouchableOpacity>

              {/* Category select chip */}
              <TouchableOpacity
                style={styles.composerChip}
                onPress={() => openCategorySelectorModal("composer")}
              >
                <Text style={styles.composerChipText}>
                  {CATEGORY_ICONS[composerCategory]} {composerCategory}
                </Text>
              </TouchableOpacity>

              {/* Date picker chip */}
              <TouchableOpacity
                style={styles.composerChip}
                onPress={() => openCalendarModal("composer")}
              >
                <MaterialCommunityIcons name="calendar" size={14} color="#6B7280" />
                <Text style={styles.composerChipText}>
                  {composerDueDate
                    ? composerDueDate.toLocaleDateString(undefined, { month: "short", day: "numeric" })
                    : "Add Date"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Content Loading & Section Feed */}
          {loading && tasks.length === 0 ? (
            <LoadingState />
          ) : tasks.length === 0 ? (
            <EmptyState
              emoji="✨"
              title="All clear!"
              subtitle="Type a task above and tap the up arrow to start."
            />
          ) : (
            <View style={styles.feedContainer}>
              {/* 1. Pending Tab View */}
              {activeTab === "pending" && (
                <>
                  {renderGroupSection("Overdue", overdueTasks, "#FEE2E2", "#EF4444")}
                  {renderGroupSection("Today", todayPendingTasks, "#FEF3C7", "#D97706")}
                  {renderGroupSection(
                    "Upcoming",
                    upcomingPendingTasks,
                    "#DBEAFE",
                    "#3B82F6",
                  )}
                  {renderGroupSection("No Date", noDatePendingTasks, "#F3F4F6", "#6B7280")}
                  {pendingCount === 0 && (
                    <EmptyState
                      emoji="🎉"
                      title="No pending tasks"
                      subtitle="Create some tasks or check the Completed tab."
                    />
                  )}
                </>
              )}

              {/* 2. Completed Tab View */}
              {activeTab === "completed" && (
                <>
                  {renderGroupSection("Completed", completedTasks, "#D1FAE5", "#10B981")}
                  {doneCount === 0 && (
                    <EmptyState
                      emoji="⬜"
                      title="No completed tasks"
                      subtitle="Finish some tasks to see them highlighted here."
                    />
                  )}
                </>
              )}

              {/* 3. All Tasks Tab View */}
              {activeTab === "all" && (
                <>
                  {renderGroupSection("Overdue", overdueTasks, "#FEE2E2", "#EF4444")}
                  {renderGroupSection("Today", todayPendingTasks, "#FEF3C7", "#D97706")}
                  {renderGroupSection(
                    "Upcoming",
                    upcomingPendingTasks,
                    "#DBEAFE",
                    "#3B82F6",
                  )}
                  {renderGroupSection("No Date", noDatePendingTasks, "#F3F4F6", "#6B7280")}
                  {renderGroupSection("Completed", completedTasks, "#D1FAE5", "#10B981")}
                </>
              )}
            </View>
          )}

          {/* Bottom spacer for comfortable scroll */}
          <View style={styles.bottomSpacer} />
        </ScrollView>

        {/* Modal: Edit Task details */}
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
                <Text style={styles.modalTitle}>Edit Task Details</Text>
                <TouchableOpacity
                  onPress={() => {
                    setModalVisible(false);
                    resetForm();
                  }}
                >
                  <MaterialCommunityIcons name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                {/* Title */}
                <Text style={styles.label}>Title *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Task title"
                  value={formData.title}
                  onChangeText={(text) =>
                    setFormData({ ...formData, title: text })
                  }
                />

                {/* Description */}
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Details & notes..."
                  multiline
                  numberOfLines={3}
                  value={formData.description}
                  onChangeText={(text) =>
                    setFormData({ ...formData, description: text })
                  }
                />

                {/* Priority Picker click */}
                <Text style={styles.label}>Priority</Text>
                <TouchableOpacity
                  style={styles.input}
                  onPress={() => openPrioritySelectorModal("modal")}
                >
                  <Text style={styles.inputText}>
                    {PRIORITY_ICONS[formData.priority]} {formData.priority}
                  </Text>
                </TouchableOpacity>

                {/* Category Picker click */}
                <Text style={styles.label}>Category</Text>
                <TouchableOpacity
                  style={styles.input}
                  onPress={() => openCategorySelectorModal("modal")}
                >
                  <Text style={styles.inputText}>
                    {CATEGORY_ICONS[formData.category]} {formData.category}
                  </Text>
                </TouchableOpacity>

                {/* Due Date calendar */}
                <Text style={styles.label}>Due Date</Text>
                <TouchableOpacity
                  style={styles.input}
                  onPress={() => openCalendarModal("modal")}
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
                      placeholder="HH:MM (e.g. 14:30)"
                      value={formData.dueTime}
                      onChangeText={(text) =>
                        setFormData({ ...formData, dueTime: text })
                      }
                    />
                  </>
                )}

                {/* Recurrence Pattern Switch */}
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
                        {formData.recurrencePattern || "Select recurrence frequency"}
                      </Text>
                    </TouchableOpacity>
                  </>
                )}

                {/* Reminder Alert toggle */}
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
                      placeholder="HH:MM (e.g. 09:00)"
                      value={formData.reminderTime}
                      onChangeText={(text) =>
                        setFormData({ ...formData, reminderTime: text })
                      }
                    />
                  </>
                )}

                {/* Family Share Link Switch */}
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

                {/* Submit save button */}
                <TouchableOpacity style={styles.saveButton} onPress={saveTask}>
                  <Text style={styles.saveButtonText}>Update Task Details</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Modal: Custom Calendar Select */}
        <Calendar
          visible={showCalendar}
          onClose={() => setShowCalendar(false)}
          onSelectDate={(date) => {
            if (selectorTarget === "modal") {
              setFormData((prev) => ({ ...prev, dueDate: date }));
            } else {
              setComposerDueDate(date);
            }
            setShowCalendar(false);
          }}
          selectedDate={
            (selectorTarget === "modal" ? formData.dueDate : composerDueDate) || new Date()
          }
        />

        {/* Modal: Priority Option Selector Sheet */}
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
                  <Text style={styles.selectorTitle}>Select Priority Level</Text>
                  <TouchableOpacity onPress={() => setShowPrioritySelector(false)}>
                    <MaterialCommunityIcons name="close" size={24} color="#6B7280" />
                  </TouchableOpacity>
                </View>
                <View style={styles.selectorBody}>
                  {PRIORITIES.map((p) => {
                    const currentPriority =
                      selectorTarget === "modal" ? formData.priority : composerPriority;
                    const isActive = currentPriority === p;

                    return (
                      <TouchableOpacity
                        key={p}
                        style={[
                          styles.selectorOption,
                          isActive && styles.activeSelectorOption,
                        ]}
                        onPress={() => {
                          if (selectorTarget === "modal") {
                            setFormData((prev) => ({ ...prev, priority: p }));
                          } else {
                            setComposerPriority(p);
                          }
                          setShowPrioritySelector(false);
                        }}
                      >
                        <Text style={styles.selectorIcon}>{PRIORITY_ICONS[p]}</Text>
                        <Text style={[styles.selectorText, { color: PRIORITY_COLORS[p] }]}>
                          {p}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>
          </Modal>
        )}

        {/* Modal: Category Option Selector Sheet */}
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
                  <Text style={styles.selectorTitle}>Select Task Category</Text>
                  <TouchableOpacity onPress={() => setShowCategorySelector(false)}>
                    <MaterialCommunityIcons name="close" size={24} color="#6B7280" />
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.selectorBody}>
                  {CATEGORIES.map((c) => {
                    const currentCategory =
                      selectorTarget === "modal" ? formData.category : composerCategory;
                    const isActive = currentCategory === c;

                    return (
                      <TouchableOpacity
                        key={c}
                        style={[
                          styles.selectorOption,
                          isActive && styles.activeSelectorOption,
                        ]}
                        onPress={() => {
                          if (selectorTarget === "modal") {
                            setFormData((prev) => ({ ...prev, category: c }));
                          } else {
                            setComposerCategory(c);
                          }
                          setShowCategorySelector(false);
                        }}
                      >
                        <Text style={styles.selectorIcon}>{CATEGORY_ICONS[c]}</Text>
                        <Text style={styles.selectorText}>{c}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </View>
          </Modal>
        )}

        {/* Modal: Recurrence Selector Option Sheet */}
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
                  <Text style={styles.selectorTitle}>Select Recurrence Pattern</Text>
                  <TouchableOpacity onPress={() => setShowRecurrenceSelector(false)}>
                    <MaterialCommunityIcons name="close" size={24} color="#6B7280" />
                  </TouchableOpacity>
                </View>
                <View style={styles.selectorBody}>
                  {RECURRENCE_PATTERNS.map((p) => {
                    const isActive = formData.recurrencePattern === p;
                    return (
                      <TouchableOpacity
                        key={p}
                        style={[
                          styles.selectorOption,
                          isActive && styles.activeSelectorOption,
                        ]}
                        onPress={() => {
                          setFormData((prev) => ({
                            ...prev,
                            recurrencePattern: p,
                          }));
                          setShowRecurrenceSelector(false);
                        }}
                      >
                        <Text style={styles.selectorText}>{p}</Text>
                      </TouchableOpacity>
                    );
                  })}
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
    backgroundColor: "#F3F4F6", // soft light gray background
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  bottomSpacer: {
    height: 60,
  },
  loadingContainer: {
    paddingVertical: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    paddingVertical: 60,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    paddingHorizontal: 24,
  },
  feedContainer: {
    marginTop: 8,
  },
  
  // 1. Header productivity card styling
  headerCard: {
    backgroundColor: "#2563EB", // premium productivity blue
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  greetingSection: {
    flex: 1,
    marginRight: 12,
  },
  greetingTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  greetingSubtitle: {
    color: "#BFDBFE",
    fontSize: 13,
    marginTop: 4,
    fontWeight: "500",
  },
  progressCircle: {
    width: 66,
    height: 66,
    borderRadius: 33,
    borderWidth: 4,
    borderColor: "#FFFFFF",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  progressPercentText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  progressSubtext: {
    color: "#93C5FD",
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  statChipsRow: {
    flexDirection: "row",
    marginTop: 18,
    gap: 8,
  },
  statChip: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  statChipOverdue: {
    backgroundColor: "#FEE2E2",
  },
  statChipPending: {
    backgroundColor: "#FEF3C7",
  },
  statChipDone: {
    backgroundColor: "#D1FAE5",
  },
  statChipCount: {
    fontSize: 16,
    fontWeight: "800",
  },
  statChipLabel: {
    fontSize: 10,
    fontWeight: "600",
    marginTop: 2,
  },
  overdueChipText: {
    color: "#DC2626",
  },
  pendingChipText: {
    color: "#D97706",
  },
  doneChipText: {
    color: "#10B981",
  },

  // 2. Segmented Pill Filter
  filterContainer: {
    flexDirection: "row",
    backgroundColor: "#E5E7EB",
    borderRadius: 24,
    padding: 3,
    marginBottom: 16,
  },
  filterPill: {
    flex: 1,
    paddingVertical: 9,
    alignItems: "center",
    borderRadius: 20,
  },
  filterPillActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  filterPillText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },
  filterPillTextActive: {
    color: "#1F2937",
    fontWeight: "700",
  },

  // 3. Inline Composer Card
  composerCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  composerInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    paddingBottom: 10,
  },
  composerInput: {
    flex: 1,
    fontSize: 15,
    color: "#1F2937",
    paddingVertical: 6,
    fontWeight: "500",
  },
  composerSubmitBtn: {
    backgroundColor: "#2563EB",
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  composerChipsRow: {
    flexDirection: "row",
    marginTop: 10,
    gap: 8,
    flexWrap: "wrap",
  },
  composerChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    gap: 6,
  },
  composerChipPriority: {
    backgroundColor: "#F3F4F6",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  composerChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4B5563",
  },

  // 4. Task Cards & Sections
  sectionContainer: {
    marginBottom: 20,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#4B5563",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sectionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  sectionBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginBottom: 10,
    flexDirection: "row",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  completedCardOpacity: {
    opacity: 0.55,
  },
  priorityBar: {
    width: 5,
    height: "100%",
  },
  cardMain: {
    flex: 1,
    padding: 12,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  checkbox: {
    marginRight: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1F2937",
  },
  taskTitleCompleted: {
    textDecorationLine: "line-through",
    color: "#9CA3AF",
  },
  taskMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 6,
    flexWrap: "wrap",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  priorityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  metaLabelText: {
    fontSize: 11,
    fontWeight: "500",
    color: "#6B7280",
  },
  categoryIconText: {
    fontSize: 11,
  },
  overdueDateText: {
    color: "#EF4444",
    fontWeight: "600",
  },
  chevron: {
    padding: 4,
  },

  // 5. Collapsible Body details
  cardBody: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  descriptionText: {
    fontSize: 13,
    color: "#4B5563",
    lineHeight: 18,
    marginBottom: 12,
  },
  subtasksHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  subtasksTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1F2937",
  },
  subtaskRatioText: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "500",
  },
  subtaskProgressContainer: {
    marginBottom: 12,
  },
  subtaskProgressTrack: {
    height: 6,
    backgroundColor: "#E5E7EB",
    borderRadius: 3,
    overflow: "hidden",
  },
  subtaskProgressFill: {
    height: "100%",
    backgroundColor: "#10B981",
    borderRadius: 3,
  },
  subtaskListContainer: {
    backgroundColor: "#F9FAFB",
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
  },
  subtaskRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 5,
    gap: 8,
  },
  subtaskTitleText: {
    flex: 1,
    fontSize: 12,
    color: "#374151",
  },
  subtaskTitleCompleted: {
    textDecorationLine: "line-through",
    color: "#9CA3AF",
  },
  subtaskDeleteButton: {
    padding: 2,
  },
  addSubtaskContainer: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  subtaskInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    color: "#1F2937",
  },
  subtaskAddBtn: {
    backgroundColor: "#2563EB",
    width: 32,
    height: 32,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  cardActionsContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    gap: 4,
  },
  editActionBtn: {
    backgroundColor: "#3B82F6",
  },
  deleteActionBtn: {
    backgroundColor: "#EF4444",
  },
  actionBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },

  // 6. Modals & Overlay forms
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  modalBody: {
    padding: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    backgroundColor: "#FFFFFF",
    color: "#1F2937",
  },
  inputText: {
    fontSize: 14,
    color: "#1F2937",
  },
  textArea: {
    minHeight: 60,
    textAlignVertical: "top",
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
  },
  saveButton: {
    backgroundColor: "#2563EB",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
    marginBottom: 30,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
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
    maxHeight: "60%",
  },
  selectorHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  selectorTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
  },
  selectorBody: {
    padding: 8,
  },
  selectorOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 10,
    marginBottom: 4,
  },
  activeSelectorOption: {
    backgroundColor: "#EFF6FF",
  },
  selectorIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  selectorText: {
    fontSize: 15,
    color: "#1F2937",
    fontWeight: "500",
  },
});
