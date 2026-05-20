// ============================================
// Finance Module - Income & Expense Tracker
// Track daily transactions, view summaries, profit/loss
// ============================================

import Calendar from "@/components/ui/calendar";
import financeService from "@/services/financeService";
import { useAppStore } from "@/store/appStore";
import {
    ExpenseCategoryType,
    FinanceSummary,
    FinanceTransaction,
    IncomeCategoryType,
    TransactionType,
} from "@/types";
import { Stack } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    Alert,
    FlatList,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

const INCOME_CATEGORIES: IncomeCategoryType[] = ["Salary", "Business", "Freelance", "Investment", "Rental", "Bonus", "Gift", "Other"];
const EXPENSE_CATEGORIES: ExpenseCategoryType[] = ["Food", "Transport", "Bills", "Shopping", "Entertainment", "Health", "Education", "Clothing", "Personal Care", "Other"];

const INCOME_EMOJI: Record<IncomeCategoryType, string> = {
  Salary: "💼", Business: "🏢", Freelance: "💻", Investment: "📈",
  Rental: "🏠", Bonus: "🎁", Gift: "🎀", Other: "💰",
};
const EXPENSE_EMOJI: Record<ExpenseCategoryType, string> = {
  Food: "🍔", Transport: "🚗", Bills: "📄", Shopping: "🛍️",
  Entertainment: "🎬", Health: "🏥", Education: "📚",
  Clothing: "👕", "Personal Care": "💆", Other: "💳",
};

type ViewMode = "today" | "week" | "month" | "custom";
type AlertLevel = "caution" | "warning" | "danger" | null;

export default function FinanceScreen() {
  const { profile } = useAppStore();
  const [todaySummary, setTodaySummary] = useState<FinanceSummary>({ totalIncome: 0, totalExpense: 0, balance: 0, profitLossPercentage: 0 });
  const [recentTransactions, setRecentTransactions] = useState<FinanceTransaction[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<FinanceTransaction | null>(null);
  const [transactionType, setTransactionType] = useState<TransactionType>("income");
  const [amount, setAmount] = useState("");
  const [incomeCategory, setIncomeCategory] = useState<IncomeCategoryType>("Salary");
  const [expenseCategory, setExpenseCategory] = useState<ExpenseCategoryType>("Food");
  const [notes, setNotes] = useState("");
  const [transactionDate, setTransactionDate] = useState(new Date());
  const [showTransactionCalendar, setShowTransactionCalendar] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("today");
  const [customStartDate, setCustomStartDate] = useState<Date | null>(null);
  const [customEndDate, setCustomEndDate] = useState<Date | null>(null);
  const [showStartCalendar, setShowStartCalendar] = useState(false);
  const [showEndCalendar, setShowEndCalendar] = useState(false);
  const [alertLevel, setAlertLevel] = useState<AlertLevel>(null);
  const [alertRatio, setAlertRatio] = useState(0);
  const [alertDismissed, setAlertDismissed] = useState(false);

  useEffect(() => {
    loadFinanceData();
    checkBudgetAlert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, viewMode, customStartDate, customEndDate]);

  const checkBudgetAlert = async () => {
    if (!profile) return;
    const monthYear = `${new Date().getFullYear()}-${new Date().getMonth() + 1}`;
    const monthly = await financeService.getMonthlySummary(profile.id, monthYear);
    const { income, expense } = monthly;
    let level: AlertLevel = null;
    let ratio = 0;
    if (income === 0 && expense > 0) { level = "danger"; ratio = 100; }
    else if (income > 0) {
      ratio = (expense / income) * 100;
      if (ratio >= 100) level = "danger";
      else if (ratio >= 80) level = "warning";
      else if (ratio >= 60) level = "caution";
    }
    setAlertLevel(level);
    setAlertRatio(ratio);
    setAlertDismissed(false);
  };

  const loadFinanceData = async () => {
    if (!profile) return;

    let summary: FinanceSummary;
    let transactions: FinanceTransaction[];

    switch (viewMode) {
      case "week":
        summary = await financeService.getWeeklySummary(profile.id);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        transactions = await financeService.getTransactionsByDateRange(
          profile.id,
          weekAgo,
          new Date(),
        );
        break;
      case "month":
        const monthYear = `${new Date().getFullYear()}-${new Date().getMonth() + 1}`;
        const monthlySummary = await financeService.getMonthlySummary(
          profile.id,
          monthYear,
        );
        summary = {
          totalIncome: monthlySummary.income,
          totalExpense: monthlySummary.expense,
          balance: monthlySummary.balance,
          profitLossPercentage:
            monthlySummary.income > 0
              ? (monthlySummary.balance / monthlySummary.income) * 100
              : 0,
        };
        const monthStart = new Date(
          new Date().getFullYear(),
          new Date().getMonth(),
          1,
        );
        transactions = await financeService.getTransactionsByDateRange(
          profile.id,
          monthStart,
          new Date(),
        );
        break;
      case "custom":
        if (customStartDate && customEndDate) {
          summary = await financeService.getSummaryByDateRange(
            profile.id,
            customStartDate,
            customEndDate,
          );
          transactions = await financeService.getTransactionsByDateRange(
            profile.id,
            customStartDate,
            customEndDate,
          );
        } else {
          summary = await financeService.getTodaySummary(profile.id);
          transactions = await financeService.getRecentTransactions(
            profile.id,
            20,
          );
        }
        break;
      default: // 'today'
        summary = await financeService.getTodaySummary(profile.id);
        transactions = await financeService.getRecentTransactions(
          profile.id,
          20,
        );
    }

    setTodaySummary(summary);
    setRecentTransactions(transactions);
  };

  const openAddModal = (type: TransactionType) => {
    setEditingTransaction(null);
    setTransactionType(type);
    setAmount("");
    setIncomeCategory("Salary");
    setExpenseCategory("Food");
    setNotes("");
    setTransactionDate(new Date());
    setIsModalVisible(true);
  };

  const openEditModal = (t: FinanceTransaction) => {
    setEditingTransaction(t);
    setTransactionType(t.type);
    setAmount(String(t.amount));
    if (t.type === "income") setIncomeCategory(t.category as IncomeCategoryType);
    else setExpenseCategory(t.category as ExpenseCategoryType);
    setNotes(t.notes || "");
    setTransactionDate(new Date(t.date));
    setIsModalVisible(true);
  };

  const handleSaveTransaction = async () => {
    if (!profile || !amount || parseFloat(amount) <= 0) {
      Alert.alert("Error", "Please enter a valid amount");
      return;
    }
    const cat = transactionType === "income" ? incomeCategory : expenseCategory;
    try {
      if (editingTransaction) {
        await financeService.updateTransaction(editingTransaction.id, {
          type: transactionType, amount: parseFloat(amount),
          category: cat, date: transactionDate, notes: notes || undefined,
        });
        Alert.alert("Success", "Transaction updated!");
      } else {
        await financeService.addTransaction({
          profileID: profile.id, type: transactionType,
          amount: parseFloat(amount), category: cat,
          date: transactionDate, notes: notes || undefined,
        });
        Alert.alert("Success", "Transaction added!");
      }
      setIsModalVisible(false);
      loadFinanceData();
      checkBudgetAlert();
    } catch {
      Alert.alert("Error", "Failed to save transaction");
    }
  };

  const handleDeleteTransaction = (transaction: FinanceTransaction) => {
    Alert.alert("Delete Transaction", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          await financeService.deleteTransaction(transaction.id);
          loadFinanceData();
          checkBudgetAlert();
        },
      },
    ]);
  };

  const formatCurrency = (value: number) => `Rs. ${value.toFixed(0)}`;

  const formatDate = (date: Date) => {
    const d = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const compareDate = new Date(d);
    compareDate.setHours(0, 0, 0, 0);

    if (compareDate.getTime() === today.getTime()) {
      return "Today";
    }

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (compareDate.getTime() === yesterday.getTime()) {
      return "Yesterday";
    }

    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const formatDateFull = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getViewTitle = () => {
    switch (viewMode) {
      case "week":
        return "This Week";
      case "month":
        return "This Month";
      case "custom":
        if (customStartDate && customEndDate) {
          return `${formatDateFull(customStartDate)} - ${formatDateFull(customEndDate)}`;
        }
        return "Custom Range";
      default:
        return "Today's Overview";
    }
  };

  const getCategoryEmoji = (cat: string, type: TransactionType): string => {
    if (type === "income") return INCOME_EMOJI[cat as IncomeCategoryType] ?? "💰";
    return EXPENSE_EMOJI[cat as ExpenseCategoryType] ?? "💳";
  };

  const renderBudgetAlert = () => {
    if (!alertLevel || alertDismissed) return null;
    const cfg = {
      danger: { bg: "#FEE2E2", border: "#EF4444", icon: "🔴", title: "Over Budget!", msg: `Expenses exceeded income this month (${alertRatio.toFixed(0)}%)` },
      warning: { bg: "#FEF3C7", border: "#F59E0B", icon: "🟠", title: "Budget Warning", msg: `You've used ${alertRatio.toFixed(0)}% of this month's income` },
      caution: { bg: "#FEFCE8", border: "#EAB308", icon: "🟡", title: "Budget Caution", msg: `You've used ${alertRatio.toFixed(0)}% of this month's income` },
    }[alertLevel];
    return (
      <View style={[styles.alertBanner, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
        <Text style={styles.alertIcon}>{cfg.icon}</Text>
        <View style={styles.alertBody}>
          <Text style={[styles.alertTitle, { color: cfg.border }]}>{cfg.title}</Text>
          <Text style={styles.alertMsg}>{cfg.msg}</Text>
        </View>
        <TouchableOpacity onPress={() => setAlertDismissed(true)}>
          <Text style={styles.alertClose}>✕</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderTransaction = ({ item }: { item: FinanceTransaction }) => (
    <TouchableOpacity
      style={styles.transactionCard}
      onPress={() => openEditModal(item)}
      onLongPress={() => handleDeleteTransaction(item)}
      activeOpacity={0.7}
    >
      <View style={[styles.categoryIcon, { backgroundColor: item.type === "income" ? "#D1FAE5" : "#FEE2E2" }]}>
        <Text style={styles.categoryEmoji}>{getCategoryEmoji(item.category, item.type)}</Text>
      </View>
      <View style={styles.transactionInfo}>
        <Text style={styles.transactionCategory}>{item.category}</Text>
        <Text style={styles.transactionDate}>{formatDate(item.date)}</Text>
        {item.notes && <Text style={styles.transactionNotes}>{item.notes}</Text>}
      </View>
      <View style={styles.transactionRight}>
        <Text style={[styles.transactionAmount, item.type === "income" ? styles.incomeAmount : styles.expenseAmount]}>
          {item.type === "income" ? "+" : "-"}{formatCurrency(item.amount)}
        </Text>
        <Text style={styles.editHint}>tap to edit</Text>
      </View>
    </TouchableOpacity>
  );

  if (!profile) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Please create a profile first</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: "Finance", headerShown: true }} />
      <View style={styles.container}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* View Mode Selector */}
          <View style={styles.viewModeContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.viewModeRow}>
                <TouchableOpacity
                  style={[
                    styles.viewModeButton,
                    viewMode === "today" && styles.viewModeButtonActive,
                  ]}
                  onPress={() => setViewMode("today")}
                >
                  <Text
                    style={[
                      styles.viewModeText,
                      viewMode === "today" && styles.viewModeTextActive,
                    ]}
                  >
                    Today
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.viewModeButton,
                    viewMode === "week" && styles.viewModeButtonActive,
                  ]}
                  onPress={() => setViewMode("week")}
                >
                  <Text
                    style={[
                      styles.viewModeText,
                      viewMode === "week" && styles.viewModeTextActive,
                    ]}
                  >
                    Week
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.viewModeButton,
                    viewMode === "month" && styles.viewModeButtonActive,
                  ]}
                  onPress={() => setViewMode("month")}
                >
                  <Text
                    style={[
                      styles.viewModeText,
                      viewMode === "month" && styles.viewModeTextActive,
                    ]}
                  >
                    Month
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.viewModeButton,
                    viewMode === "custom" && styles.viewModeButtonActive,
                  ]}
                  onPress={() => {
                    setViewMode("custom");
                    if (!customStartDate) setCustomStartDate(new Date());
                    if (!customEndDate) setCustomEndDate(new Date());
                  }}
                >
                  <Text
                    style={[
                      styles.viewModeText,
                      viewMode === "custom" && styles.viewModeTextActive,
                    ]}
                  >
                    Custom
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>

          {/* Budget Alert Banner */}
          {renderBudgetAlert()}

          {/* Custom Date Range Selector */}
          {viewMode === "custom" && (
            <View style={styles.dateRangeContainer}>
              <TouchableOpacity
                style={styles.dateRangeButton}
                onPress={() => setShowStartCalendar(true)}
              >
                <Text style={styles.dateRangeLabel}>From:</Text>
                <Text style={styles.dateRangeValue}>
                  {customStartDate
                    ? formatDateFull(customStartDate)
                    : "Select date"}
                </Text>
              </TouchableOpacity>
              <Text style={styles.dateRangeSeparator}>→</Text>
              <TouchableOpacity
                style={styles.dateRangeButton}
                onPress={() => setShowEndCalendar(true)}
              >
                <Text style={styles.dateRangeLabel}>To:</Text>
                <Text style={styles.dateRangeValue}>
                  {customEndDate
                    ? formatDateFull(customEndDate)
                    : "Select date"}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Today's Overview */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>{getViewTitle()}</Text>
            <View style={styles.balanceContainer}>
              <Text style={styles.balanceAmount}>
                {formatCurrency(todaySummary.balance)}
              </Text>
              <Text
                style={[
                  styles.balanceLabel,
                  todaySummary.balance >= 0 ? styles.profit : styles.loss,
                ]}
              >
                {todaySummary.balance >= 0 ? "Profit" : "Loss"}
                {todaySummary.profitLossPercentage !== 0 &&
                  ` ${todaySummary.balance >= 0 ? "▲" : "▼"} ${Math.abs(
                    todaySummary.profitLossPercentage,
                  ).toFixed(1)}%`}
              </Text>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Income</Text>
                <Text style={[styles.statValue, styles.incomeText]}>
                  {formatCurrency(todaySummary.totalIncome)}
                </Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Expense</Text>
                <Text style={[styles.statValue, styles.expenseText]}>
                  {formatCurrency(todaySummary.totalExpense)}
                </Text>
              </View>
            </View>
          </View>

          {/* Add Income / Expense Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.incomeButton]}
              onPress={() => openAddModal("income")}
            >
              <Text style={styles.actionButtonText}>+ Add Income</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.expenseButton]}
              onPress={() => openAddModal("expense")}
            >
              <Text style={styles.actionButtonText}>- Add Expense</Text>
            </TouchableOpacity>
          </View>

          {/* Recent Transactions */}
          <View style={styles.transactionsSection}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            {recentTransactions.length === 0 ? (
              <View style={styles.emptyTransactions}>
                <Text style={styles.emptyIcon}>💰</Text>
                <Text style={styles.emptyTransactionsText}>
                  No transactions yet
                </Text>
                <Text style={styles.emptyTransactionsSubtext}>
                  Add your first income or expense
                </Text>
              </View>
            ) : (
              <FlatList
                data={recentTransactions}
                renderItem={renderTransaction}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
              />
            )}
          </View>
        </ScrollView>

        {/* Add / Edit Modal */}
        <Modal
          visible={isModalVisible}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setIsModalVisible(false)}
        >
          <View style={[styles.modalContainer, { backgroundColor: transactionType === "income" ? "#F0FDF4" : "#FFF5F5" }]}>

            {/* Header */}
            <View style={[styles.modalHeader, { borderBottomColor: transactionType === "income" ? "#BBF7D0" : "#FECACA" }]}>
              <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                <Text style={styles.modalCancel}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>
                {editingTransaction ? "Edit" : "Add"} {transactionType === "income" ? "Income" : "Expense"}
              </Text>
              <TouchableOpacity onPress={handleSaveTransaction}>
                <Text style={[styles.modalSave, { color: transactionType === "income" ? "#10B981" : "#EF4444" }]}>
                  {editingTransaction ? "Save" : "Add"}
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

              {/* Income / Expense Toggle */}
              <View style={styles.typeToggle}>
                <TouchableOpacity
                  style={[styles.typeButton, transactionType === "income" && styles.typeButtonIncomeActive]}
                  onPress={() => { setTransactionType("income"); setIncomeCategory("Salary"); setAmount(""); }}
                >
                  <Text style={[styles.typeButtonText, transactionType === "income" && styles.typeButtonTextActive]}>💚 Income</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.typeButton, transactionType === "expense" && styles.typeButtonExpenseActive]}
                  onPress={() => { setTransactionType("expense"); setExpenseCategory("Food"); setAmount(""); }}
                >
                  <Text style={[styles.typeButtonText, transactionType === "expense" && styles.typeButtonTextActive]}>❤️ Expense</Text>
                </TouchableOpacity>
              </View>

              {/* Amount Display Card */}
              <View style={[styles.amountDisplayCard, { borderColor: transactionType === "income" ? "#10B981" : "#EF4444" }]}>
                <Text style={styles.amountCatEmoji}>
                  {transactionType === "income" ? INCOME_EMOJI[incomeCategory] : EXPENSE_EMOJI[expenseCategory]}
                </Text>
                <View style={styles.amountDisplayRight}>
                  <Text style={styles.amountCatLabel}>
                    {transactionType === "income" ? incomeCategory : expenseCategory}
                  </Text>
                  <View style={styles.amountInputRow}>
                    <Text style={[styles.amountCurrencyLabel, { color: transactionType === "income" ? "#10B981" : "#EF4444" }]}>Rs.</Text>
                    <TextInput
                      style={[styles.amountDisplayInput, { color: transactionType === "income" ? "#10B981" : "#EF4444" }]}
                      value={amount}
                      onChangeText={setAmount}
                      placeholder="0"
                      placeholderTextColor="#D1D5DB"
                      keyboardType="numeric"
                      autoFocus
                    />
                  </View>
                </View>
              </View>

              {/* Category Grid */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Category</Text>
                <View style={styles.categoryGrid}>
                  {(transactionType === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((cat) => {
                    const isActive = transactionType === "income" ? incomeCategory === cat : expenseCategory === cat;
                    const emoji = transactionType === "income" ? INCOME_EMOJI[cat as IncomeCategoryType] : EXPENSE_EMOJI[cat as ExpenseCategoryType];
                    const activeColor = transactionType === "income" ? "#10B981" : "#EF4444";
                    return (
                      <TouchableOpacity
                        key={cat}
                        style={[styles.categoryGridItem, isActive && { borderColor: activeColor, backgroundColor: activeColor + "18" }]}
                        onPress={() => transactionType === "income" ? setIncomeCategory(cat as IncomeCategoryType) : setExpenseCategory(cat as ExpenseCategoryType)}
                      >
                        <Text style={styles.categoryGridEmoji}>{emoji}</Text>
                        <Text style={[styles.categoryGridText, isActive && { color: activeColor, fontWeight: "700" }]}>{cat}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Date + Notes Row */}
              <View style={styles.dateNotesRow}>
                <TouchableOpacity style={styles.datePill} onPress={() => setShowTransactionCalendar(true)}>
                  <Text style={styles.datePillIcon}>📅</Text>
                  <Text style={styles.datePillText}>{formatDate(transactionDate)}</Text>
                </TouchableOpacity>
                <TextInput
                  style={styles.notesInline}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Add a note..."
                  placeholderTextColor="#9CA3AF"
                />
              </View>

</ScrollView>
          </View>
        </Modal>

        {/* Transaction Date Calendar */}
        <Calendar
          visible={showTransactionCalendar}
          onClose={() => setShowTransactionCalendar(false)}
          onSelectDate={(date) => setTransactionDate(date)}
          selectedDate={transactionDate}
          maxDate={new Date()}
        />

        {/* Custom Start Date Calendar */}
        <Calendar
          visible={showStartCalendar}
          onClose={() => setShowStartCalendar(false)}
          onSelectDate={(date) => {
            setCustomStartDate(date);
            if (customEndDate && date > customEndDate) {
              setCustomEndDate(date);
            }
          }}
          selectedDate={customStartDate || new Date()}
          maxDate={customEndDate || new Date()}
        />

        {/* Custom End Date Calendar */}
        <Calendar
          visible={showEndCalendar}
          onClose={() => setShowEndCalendar(false)}
          onSelectDate={(date) => setCustomEndDate(date)}
          selectedDate={customEndDate || new Date()}
          minDate={customStartDate || undefined}
          maxDate={new Date()}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#6B7280",
  },
  viewModeContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  viewModeRow: {
    flexDirection: "row",
    gap: 8,
  },
  viewModeButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  viewModeButtonActive: {
    backgroundColor: "#10B981",
    borderColor: "#10B981",
  },
  viewModeText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  viewModeTextActive: {
    color: "white",
  },
  dateRangeContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  dateRangeButton: {
    flex: 1,
    backgroundColor: "white",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  dateRangeLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 4,
  },
  dateRangeValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
  },
  dateRangeSeparator: {
    fontSize: 18,
    color: "#6B7280",
  },
  summaryCard: {
    backgroundColor: "white",
    margin: 16,
    padding: 24,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  summaryTitle: {
    fontSize: 16,
    color: "#6B7280",
    marginBottom: 16,
  },
  balanceContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  balanceAmount: {
    fontSize: 48,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 8,
  },
  balanceLabel: {
    fontSize: 16,
    fontWeight: "600",
  },
  profit: {
    color: "#10B981",
  },
  loss: {
    color: "#F97316",
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  statBox: {
    flex: 1,
    alignItems: "center",
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: "#E5E7EB",
  },
  statLabel: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
  },
  incomeText: {
    color: "#10B981",
  },
  expenseText: {
    color: "#F97316",
  },
  actionButtons: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  incomeButton: {
    backgroundColor: "#10B981",
  },
  expenseButton: {
    backgroundColor: "#F97316",
  },
  actionButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },
  transactionsSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 16,
  },
  emptyTransactions: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTransactionsText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 8,
  },
  emptyTransactionsSubtext: {
    fontSize: 14,
    color: "#6B7280",
  },
  transactionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryEmoji: {
    fontSize: 24,
  },
  transactionInfo: {
    flex: 1,
    marginLeft: 12,
  },
  transactionRight: {
    alignItems: "flex-end",
  },
  editHint: {
    fontSize: 10,
    color: "#9CA3AF",
    marginTop: 2,
  },
  // Budget Alert
  alertBanner: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 10,
  },
  alertIcon: { fontSize: 22 },
  alertBody: { flex: 1 },
  alertTitle: { fontSize: 13, fontWeight: "700" },
  alertMsg: { fontSize: 12, color: "#374151", marginTop: 2 },
  alertClose: { fontSize: 14, color: "#6B7280", fontWeight: "600", padding: 4 },
  transactionCategory: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 13,
    color: "#9CA3AF",
  },
  transactionNotes: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: 18,
    fontWeight: "700",
  },
  incomeAmount: {
    color: "#10B981",
  },
  expenseAmount: {
    color: "#F97316",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalCancel: {
    fontSize: 16,
    color: "#6B7280",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1F2937",
  },
  modalSave: {
    fontSize: 16,
    color: "#10B981",
    fontWeight: "600",
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  typeToggle: {
    flexDirection: "row",
    backgroundColor: "white",
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 8,
  },
  typeButtonActive: {
    backgroundColor: "#10B981",
  },
  typeButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6B7280",
  },
  typeButtonTextActive: {
    color: "white",
  },
  amountSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "white",
    padding: 24,
    borderRadius: 16,
    marginBottom: 24,
  },
  currencySymbol: {
    fontSize: 48,
    fontWeight: "bold",
    color: "#1F2937",
    marginRight: 8,
  },
  amountInput: {
    fontSize: 56,
    fontWeight: "bold",
    color: "#1F2937",
    flex: 1,
    textAlign: "left",
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 12,
  },
  categoryRow: {
    flexDirection: "row",
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  categoryChipActive: {
    backgroundColor: "#10B98120",
    borderColor: "#10B981",
  },
  categoryChipEmoji: {
    fontSize: 20,
  },
  categoryChipText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  categoryChipTextActive: {
    color: "#10B981",
    fontWeight: "600",
  },
  datePickerButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 14,
  },
  datePickerText: {
    fontSize: 16,
    color: "#1F2937",
    fontWeight: "500",
  },
  datePickerIcon: {
    fontSize: 20,
  },
  input: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: "#1F2937",
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  typeButtonIncomeActive: { backgroundColor: "#10B981" },
  typeButtonExpenseActive: { backgroundColor: "#EF4444" },
  // Amount display
  amountDisplayCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    marginBottom: 20,
    gap: 16,
  },
  amountCatEmoji: { fontSize: 44 },
  amountDisplayRight: { flex: 1 },
  amountCatLabel: { fontSize: 13, color: "#6B7280", marginBottom: 4 },
  amountDisplayText: { fontSize: 34, fontWeight: "800", letterSpacing: -1 },
  amountInputRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  amountCurrencyLabel: { fontSize: 22, fontWeight: "700" },
  amountDisplayInput: { fontSize: 36, fontWeight: "800", flex: 1, padding: 0 },
  // Category Grid
  categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  categoryGridItem: {
    width: "22.5%",
    aspectRatio: 1,
    backgroundColor: "white",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    padding: 4,
  },
  categoryGridEmoji: { fontSize: 24, marginBottom: 4 },
  categoryGridText: { fontSize: 9, color: "#6B7280", textAlign: "center" },
  // Date + Notes row
  dateNotesRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 20,
  },
  datePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "white",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  datePillIcon: { fontSize: 16 },
  datePillText: { fontSize: 14, fontWeight: "600", color: "#1F2937" },
  notesInline: {
    flex: 1,
    backgroundColor: "white",
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    fontSize: 14,
    color: "#1F2937",
  },
  // Numpad
  numpad: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 12,
    marginBottom: 24,
    gap: 8,
  },
  numpadRow: { flexDirection: "row", gap: 8 },
  numpadKey: {
    flex: 1,
    height: 64,
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  numpadKeyDelete: { backgroundColor: "#FEE2E2", borderColor: "#FECACA" },
  numpadKeyText: { fontSize: 22, fontWeight: "600", color: "#1F2937" },
  numpadKeyDeleteText: { color: "#EF4444", fontSize: 20 },
});
