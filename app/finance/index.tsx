// ============================================
// Finance Module - Income & Expense Tracker
// Premium redesign with period pills, budget progress bar,
// grouped transaction list, and themed modals.
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
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import React, { useEffect, useState, useRef } from "react";
import {
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

// Category with Tabler Icon mappings
const INCOME_CATEGORIES_WITH_ICONS: { name: IncomeCategoryType; icon: string }[] = [
  { name: "Salary", icon: "ti-briefcase" },
  { name: "Business", icon: "ti-building" },
  { name: "Freelance", icon: "ti-device-laptop" },
  { name: "Investment", icon: "ti-chart-line" },
  { name: "Rental", icon: "ti-home" },
  { name: "Bonus", icon: "ti-gift" },
  { name: "Gift", icon: "ti-heart" },
  { name: "Other", icon: "ti-dots" },
];

const EXPENSE_CATEGORIES_WITH_ICONS: { name: ExpenseCategoryType; icon: string }[] = [
  { name: "Food", icon: "ti-soup" },
  { name: "Transport", icon: "ti-car" },
  { name: "Bills", icon: "ti-file-invoice" },
  { name: "Shopping", icon: "ti-shopping-cart" },
  { name: "Entertainment", icon: "ti-device-tv" },
  { name: "Health", icon: "ti-first-aid-kit" },
  { name: "Education", icon: "ti-book" },
  { name: "Clothing", icon: "ti-shirt" },
  { name: "Personal Care", icon: "ti-sparkles" },
  { name: "Other", icon: "ti-dots" },
];

// Tabler icons to MaterialCommunityIcons mapping to avoid external package build breakages
const TABLER_TO_MCI_MAP: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> = {
  "ti-briefcase": "briefcase-outline",
  "ti-building": "office-building-outline",
  "ti-device-laptop": "laptop",
  "ti-chart-line": "chart-line",
  "ti-home": "home-outline",
  "ti-gift": "gift-outline",
  "ti-heart": "heart-outline",
  "ti-dots": "dots-horizontal",
  "ti-soup": "food-variant",
  "ti-car": "car-outline",
  "ti-file-invoice": "file-document-outline",
  "ti-shopping-cart": "cart-outline",
  "ti-device-tv": "television",
  "ti-first-aid-kit": "medical-bag",
  "ti-book": "book-open-variant",
  "ti-shirt": "tshirt-crew-outline",
  "ti-sparkles": "sparkles",
};

type ViewMode = "today" | "week" | "month" | "custom";
type AlertLevel = "caution" | "warning" | "danger" | null;

interface GroupedTransactions {
  title: string;
  data: FinanceTransaction[];
}

export default function FinanceScreen() {
  const { profile } = useAppStore();
  const [todaySummary, setTodaySummary] = useState<FinanceSummary>({
    totalIncome: 0,
    totalExpense: 0,
    balance: 0,
    profitLossPercentage: 0,
  });
  const [recentTransactions, setRecentTransactions] = useState<FinanceTransaction[]>([]);
  const [prevBalance, setPrevBalance] = useState(0);

  // Add/Edit Transaction Modal States
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<FinanceTransaction | null>(null);
  const [transactionType, setTransactionType] = useState<TransactionType>("income");
  const [amount, setAmount] = useState("");
  const [incomeCategory, setIncomeCategory] = useState<IncomeCategoryType>("Salary");
  const [expenseCategory, setExpenseCategory] = useState<ExpenseCategoryType>("Food");
  const [notes, setNotes] = useState("");
  const [transactionDate, setTransactionDate] = useState(new Date());

  // Picker Overlays
  const [showTransactionCalendar, setShowTransactionCalendar] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("today");
  const [customStartDate, setCustomStartDate] = useState<Date | null>(null);
  const [customEndDate, setCustomEndDate] = useState<Date | null>(null);
  const [showStartCalendar, setShowStartCalendar] = useState(false);
  const [showEndCalendar, setShowEndCalendar] = useState(false);

  // Alert State
  const [alertLevel, setAlertLevel] = useState<AlertLevel>(null);
  const [alertRatio, setAlertRatio] = useState(0);
  const [alertDismissed, setAlertDismissed] = useState(false);

  const amountInputRef = useRef<TextInput>(null);

  useEffect(() => {
    loadFinanceData();
    checkBudgetAlert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, viewMode, customStartDate, customEndDate]);

  // Recalculates strictly the current month's budget details
  const checkBudgetAlert = async () => {
    if (!profile) return;
    const monthYear = `${new Date().getFullYear()}-${new Date().getMonth() + 1}`;
    const monthly = await financeService.getMonthlySummary(profile.id, monthYear);
    const { income, expense } = monthly;
    let level: AlertLevel = null;
    let ratio = 0;
    if (income === 0 && expense > 0) {
      level = "danger";
      ratio = 100;
    } else if (income > 0) {
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
    let prevBal = 0;

    switch (viewMode) {
      case "week": {
        summary = await financeService.getWeeklySummary(profile.id);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        transactions = await financeService.getTransactionsByDateRange(
          profile.id,
          weekAgo,
          new Date()
        );

        // Previous equivalent 7 days before
        const prevStart = new Date();
        prevStart.setDate(prevStart.getDate() - 14);
        prevStart.setHours(0, 0, 0, 0);
        const prevEnd = new Date();
        prevEnd.setDate(prevEnd.getDate() - 8);
        prevEnd.setHours(23, 59, 59, 999);
        const prevSummary = await financeService.getSummaryByDateRange(
          profile.id,
          prevStart,
          prevEnd
        );
        prevBal = prevSummary.balance;
        break;
      }
      case "month": {
        const now = new Date();
        const monthYear = `${now.getFullYear()}-${now.getMonth() + 1}`;
        const monthlySummary = await financeService.getMonthlySummary(
          profile.id,
          monthYear
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
          now.getFullYear(),
          now.getMonth(),
          1
        );
        transactions = await financeService.getTransactionsByDateRange(
          profile.id,
          monthStart,
          new Date()
        );

        // Previous calendar month summary
        const prevDate = new Date();
        prevDate.setMonth(prevDate.getMonth() - 1);
        const prevMonthYear = `${prevDate.getFullYear()}-${prevDate.getMonth() + 1}`;
        const prevSummary = await financeService.getMonthlySummary(
          profile.id,
          prevMonthYear
        );
        prevBal = prevSummary.balance;
        break;
      }
      case "custom": {
        if (customStartDate && customEndDate) {
          summary = await financeService.getSummaryByDateRange(
            profile.id,
            customStartDate,
            customEndDate
          );
          transactions = await financeService.getTransactionsByDateRange(
            profile.id,
            customStartDate,
            customEndDate
          );

          // Previous period of equal length
          const durationMs = customEndDate.getTime() - customStartDate.getTime();
          const prevStart = new Date(customStartDate.getTime() - durationMs - 24 * 60 * 60 * 1000);
          const prevEnd = new Date(customStartDate.getTime() - 24 * 60 * 60 * 1000);
          const prevSummary = await financeService.getSummaryByDateRange(
            profile.id,
            prevStart,
            prevEnd
          );
          prevBal = prevSummary.balance;
        } else {
          summary = await financeService.getTodaySummary(profile.id);
          transactions = await financeService.getRecentTransactions(
            profile.id,
            20
          );
          prevBal = 0;
        }
        break;
      }
      default: { // 'today'
        summary = await financeService.getTodaySummary(profile.id);
        transactions = await financeService.getRecentTransactions(
          profile.id,
          20
        );

        // Previous period (Yesterday)
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);
        const yesterdayEnd = new Date(yesterday);
        yesterdayEnd.setHours(23, 59, 59, 999);
        const yesterdaySummary = await financeService.getSummaryByDateRange(
          profile.id,
          yesterday,
          yesterdayEnd
        );
        prevBal = yesterdaySummary.balance;
      }
    }

    setTodaySummary(summary);
    setRecentTransactions(transactions);
    setPrevBalance(prevBal);
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
    if (t.type === "income") {
      setIncomeCategory(t.category as IncomeCategoryType);
    } else {
      setExpenseCategory(t.category as ExpenseCategoryType);
    }
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
          type: transactionType,
          amount: parseFloat(amount),
          category: cat,
          date: transactionDate,
          notes: notes || undefined,
        });
        Alert.alert("Success", "Transaction updated!");
      } else {
        await financeService.addTransaction({
          profileID: profile.id,
          type: transactionType,
          amount: parseFloat(amount),
          category: cat,
          date: transactionDate,
          notes: notes || undefined,
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
    Alert.alert(
      "Delete Transaction",
      "Are you sure you want to delete this transaction?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await financeService.deleteTransaction(transaction.id);
            loadFinanceData();
            checkBudgetAlert();
          },
        },
      ]
    );
  };

  const formatCurrency = (value: number) => `Rs. ${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

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

  const getCategoryIconKey = (category: string, type: TransactionType): string => {
    if (type === "income") {
      return INCOME_CATEGORIES_WITH_ICONS.find((c) => c.name === category)?.icon || "ti-dots";
    } else {
      return EXPENSE_CATEGORIES_WITH_ICONS.find((c) => c.name === category)?.icon || "ti-dots";
    }
  };

  const renderIcon = (iconKey: string, color: string, size: number = 20) => {
    const mciName = TABLER_TO_MCI_MAP[iconKey] || "help-circle-outline";
    return <MaterialCommunityIcons name={mciName} size={size} color={color} />;
  };

  // Budget Alert Banner
  const renderBudgetAlert = () => {
    if (!alertLevel || alertDismissed) return null;
    const ratioStr = alertRatio.toFixed(0);
    const cfg = {
      danger: {
        bg: "#FCEBEB",
        border: "#F09595",
        text: "#791F1F",
        msg: "Over budget — monthly expenses exceed your income.",
      },
      warning: {
        bg: "#FAEEDA",
        border: "#EF9F27",
        text: "#633806",
        msg: `Budget warning — expenses are at ${ratioStr}% of monthly income.`,
      },
      caution: {
        bg: "#FFFBEB",
        border: "#FCD34D",
        text: "#713F00",
        msg: `Budget caution — expenses are at ${ratioStr}% of monthly income.`,
      },
    }[alertLevel];

    if (!cfg) return null;

    return (
      <View style={[styles.alertBanner, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
        <View style={styles.alertBody}>
          <Text style={[styles.alertMsg, { color: cfg.text }]}>{cfg.msg}</Text>
        </View>
        <TouchableOpacity onPress={() => setAlertDismissed(true)}>
          <MaterialCommunityIcons name="close" size={16} color={cfg.text} />
        </TouchableOpacity>
      </View>
    );
  };

  // Redesigned Transaction Row Item
  const renderTransaction = (item: FinanceTransaction) => {
    const iconKey = getCategoryIconKey(item.category, item.type);
    const isInc = item.type === "income";

    return (
      <View key={item.id} style={styles.transactionCard}>
        <View style={styles.transactionCardMain}>
          <View
            style={[
              styles.categoryIconContainer,
              { backgroundColor: isInc ? "#EAF3DE" : "#FCEBEB" },
            ]}
          >
            {renderIcon(iconKey, isInc ? "#3B6D11" : "#A32D2D", 18)}
          </View>

          <View style={styles.transactionInfo}>
            <Text style={styles.transactionCategory}>{item.category}</Text>
            {item.notes ? (
              <Text
                style={styles.transactionNotes}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {item.notes}
              </Text>
            ) : null}
          </View>

          <View style={styles.transactionRight}>
            <Text
              style={[
                styles.transactionAmountText,
                { color: isInc ? "#3B6D11" : "#A32D2D" },
              ]}
            >
              {isInc ? "+" : "-"}{formatCurrency(item.amount)}
            </Text>
            <Text style={styles.transactionDateSubtext}>
              {formatDate(item.date)}
            </Text>
          </View>
        </View>

        <View style={styles.transactionActions}>
          <TouchableOpacity
            style={styles.actionPillBtn}
            onPress={() => openEditModal(item)}
          >
            <Text style={styles.actionPillBtnText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionPillBtn, styles.deletePillBtn]}
            onPress={() => handleDeleteTransaction(item)}
          >
            <Text style={[styles.actionPillBtnText, styles.deletePillBtnText]}>
              Delete
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Group transactions by date descending
  const groupTransactions = (transactions: FinanceTransaction[]): GroupedTransactions[] => {
    const groups: Record<string, FinanceTransaction[]> = {};
    transactions.forEach((tx) => {
      const d = new Date(tx.date);
      d.setHours(0, 0, 0, 0);
      const key = d.toISOString();
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(tx);
    });

    const sortedKeys = Object.keys(groups).sort(
      (a, b) => new Date(b).getTime() - new Date(a).getTime()
    );

    const todayStr = new Date();
    todayStr.setHours(0, 0, 0, 0);

    const yesterdayStr = new Date();
    yesterdayStr.setDate(yesterdayStr.getDate() - 1);
    yesterdayStr.setHours(0, 0, 0, 0);

    return sortedKeys.map((key) => {
      const d = new Date(key);
      let title = "";
      if (d.getTime() === todayStr.getTime()) {
        title = "TODAY";
      } else if (d.getTime() === yesterdayStr.getTime()) {
        title = "YESTERDAY";
      } else {
        title = d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }).toUpperCase();
      }
      return {
        title,
        data: groups[key],
      };
    });
  };

  const groupedTx = groupTransactions(recentTransactions);

  // Compute stats for current summary & progress bar
  let pctChange = 0;
  if (prevBalance !== 0) {
    pctChange = ((todaySummary.balance - prevBalance) / Math.abs(prevBalance)) * 100;
  } else if (todaySummary.balance !== 0) {
    pctChange = todaySummary.balance > 0 ? 100 : -100;
  }

  const periodRatio = todaySummary.totalIncome > 0
    ? (todaySummary.totalExpense / todaySummary.totalIncome) * 100
    : (todaySummary.totalExpense > 0 ? 100 : 0);

  const getProgressBarColor = (ratio: number) => {
    if (ratio < 60) return "#3B6D11"; // green
    if (ratio < 80) return "#D97706"; // amber
    if (ratio < 100) return "#F97316"; // orange
    return "#A32D2D"; // red
  };

  // Modal theme styling helper
  const isIncome = transactionType === "income";
  const modalTheme = {
    accent: isIncome ? "#10B981" : "#EF4444",
    amountCardBg: isIncome ? "#EAF3DE" : "#FCEBEB",
    chipSelectedBg: isIncome ? "#EAF3DE" : "#FCEBEB",
    chipSelectedBorder: isIncome ? "#97C459" : "#F09595",
    chipSelectedText: isIncome ? "#27500A" : "#791F1F",
    saveBtnBg: isIncome ? "#EAF3DE" : "#FCEBEB",
    saveBtnText: isIncome ? "#27500A" : "#791F1F",
  };

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
        {/* Sticky Period Pill Selector */}
        <View style={styles.viewModeContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.viewModeRow}>
              {(["today", "week", "month", "custom"] as ViewMode[]).map((mode) => {
                const isActive = viewMode === mode;
                const modeLabel = mode.charAt(0).toUpperCase() + mode.slice(1);
                return (
                  <TouchableOpacity
                    key={mode}
                    style={[
                      styles.viewModeButton,
                      isActive && styles.viewModeButtonActive,
                    ]}
                    onPress={() => {
                      setViewMode(mode);
                      if (mode === "custom") {
                        if (!customStartDate) setCustomStartDate(new Date());
                        if (!customEndDate) setCustomEndDate(new Date());
                      }
                    }}
                  >
                    <Text style={[styles.viewModeText, isActive && styles.viewModeTextActive]}>
                      {modeLabel}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>

        {/* Custom Range Picker row beneath pills */}
        {viewMode === "custom" && (
          <View style={styles.dateRangeContainer}>
            <TouchableOpacity
              style={styles.dateRangeButton}
              onPress={() => setShowStartCalendar(true)}
            >
              <Text style={styles.dateRangeLabel}>From:</Text>
              <Text style={styles.dateRangeValue}>
                {customStartDate ? formatDateFull(customStartDate) : "Select Date"}
              </Text>
            </TouchableOpacity>
            <Text style={styles.dateRangeSeparator}>→</Text>
            <TouchableOpacity
              style={styles.dateRangeButton}
              onPress={() => setShowEndCalendar(true)}
            >
              <Text style={styles.dateRangeLabel}>To:</Text>
              <Text style={styles.dateRangeValue}>
                {customEndDate ? formatDateFull(customEndDate) : "Select Date"}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Budget Alert Banner */}
          {renderBudgetAlert()}

          {/* Enhanced Balance Card */}
          <View style={styles.summaryCard}>
            {/* Zone 1 — Net Balance */}
            <Text style={styles.summaryTitle}>
              {"NET BALANCE · " + getViewTitle().toUpperCase()}
            </Text>
            <View style={styles.balanceContainer}>
              <Text style={styles.balanceAmount}>
                {formatCurrency(todaySummary.balance)}
              </Text>
            </View>

            {/* Zone 2 — Profit/Loss Status badge & Trend calculation */}
            <View style={styles.plStatusContainer}>
              <View style={[styles.plBadge, { backgroundColor: todaySummary.balance >= 0 ? "#EAF3DE" : "#FCEBEB" }]}>
                <Text style={[styles.plBadgeText, { color: todaySummary.balance >= 0 ? "#27500A" : "#791F1F" }]}>
                  {todaySummary.balance >= 0 ? "Profit" : "Loss"}
                </Text>
              </View>
              <View style={[styles.pctChangeBadge, { backgroundColor: pctChange >= 0 ? "#EAF3DE" : "#FCEBEB" }]}>
                <MaterialCommunityIcons
                  name={pctChange >= 0 ? "trending-up" : "trending-down"}
                  size={14}
                  color={pctChange >= 0 ? "#27500A" : "#791F1F"}
                />
                <Text style={[styles.pctChangeText, { color: pctChange >= 0 ? "#27500A" : "#791F1F" }]}>
                  {pctChange >= 0 ? "+" : ""}{pctChange.toFixed(1)}% vs prev.
                </Text>
              </View>
            </View>

            {/* Zone 3 — Income vs Expense Blocks */}
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <View style={styles.statHeaderRow}>
                  <MaterialCommunityIcons name="arrow-down" size={16} color="#3B6D11" />
                  <Text style={[styles.statLabel, { color: "#3B6D11" }]}>Income</Text>
                </View>
                <Text style={[styles.statValue, { color: "#3B6D11" }]}>
                  {formatCurrency(todaySummary.totalIncome)}
                </Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <View style={styles.statHeaderRow}>
                  <MaterialCommunityIcons name="arrow-up" size={16} color="#A32D2D" />
                  <Text style={[styles.statLabel, { color: "#A32D2D" }]}>Expense</Text>
                </View>
                <Text style={[styles.statValue, { color: "#A32D2D" }]}>
                  {formatCurrency(todaySummary.totalExpense)}
                </Text>
              </View>
            </View>

            {/* Zone 4 — Budget Progress Bar */}
            <View style={styles.progressBarSection}>
              <View style={styles.progressBarLabelRow}>
                <Text style={styles.progressBarLabel}>Period Usage</Text>
                <Text style={[styles.progressBarValue, { color: getProgressBarColor(periodRatio) }]}>
                  {periodRatio.toFixed(0)}%
                </Text>
              </View>
              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${Math.min(periodRatio, 100)}%`,
                      backgroundColor: getProgressBarColor(periodRatio),
                    },
                  ]}
                />
              </View>
            </View>
          </View>

          {/* Quick Action Row */}
          <View style={styles.quickActionRow}>
            <TouchableOpacity
              style={[styles.quickActionBtn, styles.incomeActionBtn]}
              onPress={() => openAddModal("income")}
            >
              <MaterialCommunityIcons name="plus" size={18} color="#27500A" />
              <Text style={[styles.quickActionText, { color: "#27500A" }]}>Add Income</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickActionBtn, styles.expenseActionBtn]}
              onPress={() => openAddModal("expense")}
            >
              <MaterialCommunityIcons name="minus" size={18} color="#791F1F" />
              <Text style={[styles.quickActionText, { color: "#791F1F" }]}>Add Expense</Text>
            </TouchableOpacity>
          </View>

          {/* Grouped Transaction List */}
          <View style={styles.transactionsSection}>
            <Text style={styles.sectionTitle}>Transactions</Text>
            {groupedTx.length === 0 ? (
              <View style={styles.emptyTransactions}>
                <View style={styles.emptyIconCircle}>
                  <MaterialCommunityIcons name="chart-bar" size={32} color="#9CA3AF" />
                </View>
                <Text style={styles.emptyTransactionsText}>
                  No transactions for this period.
                </Text>
                <Text style={styles.emptyTransactionsSubtext}>
                  Tap + to add one.
                </Text>
              </View>
            ) : (
              groupedTx.map((group) => (
                <View key={group.title} style={styles.sectionGroup}>
                  <Text style={styles.sectionHeader}>{group.title}</Text>
                  {group.data.map((item) => renderTransaction(item))}
                </View>
              ))
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
          <View style={[styles.modalContainer, { backgroundColor: isIncome ? "#F9FBF9" : "#FBF9F9" }]}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                <Text style={styles.modalCancel}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>
                {editingTransaction ? "Edit" : "Add"} {isIncome ? "income" : "expense"}
              </Text>
              <TouchableOpacity
                style={[styles.modalHeaderSaveBtn, { backgroundColor: modalTheme.saveBtnBg }]}
                onPress={handleSaveTransaction}
              >
                <Text style={[styles.modalHeaderSaveText, { color: modalTheme.saveBtnText }]}>
                  {editingTransaction ? "Save" : "Add"}
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Income / Expense Toggle */}
              <View style={styles.typeToggle}>
                <TouchableOpacity
                  style={[styles.typeButton, isIncome && styles.typeButtonIncomeActive]}
                  onPress={() => {
                    setTransactionType("income");
                    setIncomeCategory("Salary");
                    setAmount("");
                  }}
                >
                  <Text style={[styles.typeButtonText, isIncome && styles.typeButtonTextActive]}>
                    💚 Income
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.typeButton, !isIncome && styles.typeButtonExpenseActive]}
                  onPress={() => {
                    setTransactionType("expense");
                    setExpenseCategory("Food");
                    setAmount("");
                  }}
                >
                  <Text style={[styles.typeButtonText, !isIncome && styles.typeButtonTextActive]}>
                    ❤️ Expense
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Premium Amount Input Card */}
              <TouchableOpacity
                activeOpacity={0.9}
                style={[
                  styles.amountDisplayCard,
                  { backgroundColor: modalTheme.amountCardBg, borderColor: modalTheme.accent },
                ]}
                onPress={() => amountInputRef.current?.focus()}
              >
                <View style={[styles.amountIconCircle, { backgroundColor: isIncome ? "#EEF6E8" : "#FDECEE" }]}>
                  {renderIcon(
                    getCategoryIconKey(isIncome ? incomeCategory : expenseCategory, transactionType),
                    modalTheme.chipSelectedText,
                    20
                  )}
                </View>
                <View style={styles.amountDisplayRight}>
                  <Text style={[styles.amountCatLabel, { color: modalTheme.chipSelectedText }]}>
                    Rs. • {isIncome ? incomeCategory : expenseCategory}
                  </Text>
                  <View style={styles.amountInputRow}>
                    <Text style={[styles.amountCurrencyLabel, { color: modalTheme.chipSelectedText }]}>
                      Rs.
                    </Text>
                    <TextInput
                      ref={amountInputRef}
                      style={[styles.amountDisplayInput, { color: modalTheme.chipSelectedText }]}
                      value={amount}
                      onChangeText={setAmount}
                      placeholder="0"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="numeric"
                    />
                  </View>
                </View>
              </TouchableOpacity>

              {/* Icon Category Grid */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Category</Text>
                <View style={styles.categoryGrid}>
                  {(isIncome ? INCOME_CATEGORIES_WITH_ICONS : EXPENSE_CATEGORIES_WITH_ICONS).map((catObj) => {
                    const cat = catObj.name;
                    const iconKey = catObj.icon;
                    const isActive = isIncome ? incomeCategory === cat : expenseCategory === cat;
                    return (
                      <TouchableOpacity
                        key={cat}
                        style={[
                          styles.categoryGridItem,
                          isActive
                            ? { borderColor: modalTheme.chipSelectedBorder, backgroundColor: modalTheme.chipSelectedBg }
                            : { borderColor: "#E5E7EB", backgroundColor: "#F9FAFB" },
                        ]}
                        onPress={() => {
                          if (isIncome) {
                            setIncomeCategory(cat as IncomeCategoryType);
                          } else {
                            setExpenseCategory(cat as ExpenseCategoryType);
                          }
                        }}
                      >
                        <View style={styles.categoryGridIconWrap}>
                          {renderIcon(
                            iconKey,
                            isActive ? modalTheme.chipSelectedText : "#6B7280",
                            18
                          )}
                        </View>
                        <Text
                          style={[
                            styles.categoryGridText,
                            isActive && { color: modalTheme.chipSelectedText, fontWeight: "600" },
                          ]}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Date + Notes Row */}
              <View style={styles.dateNotesRow}>
                <TouchableOpacity
                  style={styles.datePill}
                  onPress={() => setShowTransactionCalendar(true)}
                >
                  <MaterialCommunityIcons name="calendar" size={16} color="#4B5563" />
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
    backgroundColor: "#F8FAFC",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
  },
  emptyText: {
    fontSize: 15,
    color: "#6B7280",
    fontWeight: "500",
  },
  scrollContent: {
    paddingBottom: 24,
  },
  viewModeContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
    backgroundColor: "#F8FAFC",
  },
  viewModeRow: {
    flexDirection: "row",
    gap: 8,
  },
  viewModeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  viewModeButtonActive: {
    backgroundColor: "#EEEDFE",
    borderColor: "#AFA9EC",
  },
  viewModeText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#64748B",
  },
  viewModeTextActive: {
    color: "#3C3489",
    fontWeight: "600",
  },
  dateRangeContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
    backgroundColor: "#F8FAFC",
  },
  dateRangeButton: {
    flex: 1,
    backgroundColor: "white",
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  dateRangeLabel: {
    fontSize: 11,
    color: "#64748B",
    marginBottom: 2,
    textTransform: "uppercase",
    fontWeight: "600",
  },
  dateRangeValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1E293B",
  },
  dateRangeSeparator: {
    fontSize: 16,
    color: "#64748B",
    fontWeight: "bold",
  },
  summaryCard: {
    backgroundColor: "white",
    marginHorizontal: 16,
    marginVertical: 12,
    padding: 20,
    borderRadius: 24,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94A3B8",
    letterSpacing: 1.0,
    marginBottom: 8,
  },
  balanceContainer: {
    alignItems: "flex-start",
    marginBottom: 10,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: "600",
    color: "#0F172A",
    letterSpacing: -0.5,
  },
  plStatusContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 20,
  },
  plBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  plBadgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  pctChangeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pctChangeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 16,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
  },
  statHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: "#F1F5F9",
    marginHorizontal: 16,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  statValue: {
    fontSize: 16,
    fontWeight: "700",
  },
  progressBarSection: {
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 12,
  },
  progressBarLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  progressBarLabel: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },
  progressBarValue: {
    fontSize: 12,
    fontWeight: "700",
  },
  progressBarBg: {
    height: 6,
    backgroundColor: "#F1F5F9",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  alertBanner: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
  },
  alertBody: {
    flex: 1,
  },
  alertMsg: {
    fontSize: 13,
    fontWeight: "500",
  },
  quickActionRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 20,
  },
  quickActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    minHeight: 48,
    borderRadius: 16,
  },
  incomeActionBtn: {
    backgroundColor: "#EAF3DE",
  },
  expenseActionBtn: {
    backgroundColor: "#FCEBEB",
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: "600",
  },
  transactionsSection: {
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 14,
  },
  sectionGroup: {
    marginBottom: 18,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94A3B8",
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  emptyTransactions: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
    backgroundColor: "white",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  emptyTransactionsText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 4,
  },
  emptyTransactionsSubtext: {
    fontSize: 12,
    color: "#64748B",
  },
  transactionCard: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
  },
  transactionCardMain: {
    flexDirection: "row",
    alignItems: "center",
  },
  categoryIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  transactionInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  transactionCategory: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0F172A",
    marginBottom: 2,
  },
  transactionNotes: {
    fontSize: 11,
    color: "#64748B",
  },
  transactionRight: {
    alignItems: "flex-end",
  },
  transactionAmountText: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 2,
  },
  transactionDateSubtext: {
    fontSize: 11,
    color: "#94A3B8",
  },
  transactionActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F8FAFC",
    paddingTop: 8,
  },
  actionPillBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "white",
    minWidth: 54,
    alignItems: "center",
  },
  deletePillBtn: {
    borderColor: "#FEE2E2",
  },
  actionPillBtnText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
  },
  deletePillBtnText: {
    color: "#EF4444",
  },

  // Modal styling
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  modalCancel: {
    fontSize: 15,
    color: "#64748B",
    fontWeight: "500",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    textTransform: "capitalize",
  },
  modalHeaderSaveBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  modalHeaderSaveText: {
    fontSize: 14,
    fontWeight: "600",
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  typeToggle: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderRadius: 16,
    padding: 4,
    marginBottom: 20,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 12,
  },
  typeButtonIncomeActive: {
    backgroundColor: "#10B981",
  },
  typeButtonExpenseActive: {
    backgroundColor: "#EF4444",
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748B",
  },
  typeButtonTextActive: {
    color: "white",
  },
  amountDisplayCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    marginBottom: 20,
    gap: 12,
  },
  amountIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  amountDisplayRight: {
    flex: 1,
  },
  amountCatLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 2,
  },
  amountInputRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  amountCurrencyLabel: {
    fontSize: 22,
    fontWeight: "600",
    marginRight: 2,
  },
  amountDisplayInput: {
    fontSize: 26,
    fontWeight: "500",
    flex: 1,
    padding: 0,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0F172A",
    marginBottom: 10,
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryGridItem: {
    width: "23.2%",
    aspectRatio: 1,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 4,
  },
  categoryGridIconWrap: {
    marginBottom: 4,
  },
  categoryGridText: {
    fontSize: 9,
    color: "#64748B",
    textAlign: "center",
  },
  dateNotesRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 24,
  },
  datePill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "white",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    minWidth: 130,
  },
  datePillText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1E293B",
  },
  notesInline: {
    flex: 1,
    backgroundColor: "white",
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    fontSize: 14,
    color: "#1E293B",
  },
});
