// ============================================
// Finance Module - Income & Expense Tracker
// Premium redesign conforming to solid visual guidelines,
// font weight limits, and custom blue header stats.
// ============================================

import Calendar from "@/components/ui/calendar";
import { AppCard } from "@/components/ui/AppCard";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { EmptyState, LoadingState } from "@/components/ui/States";
import { StatChip } from "@/components/ui/StatChip";
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
import { Stack, useFocusEffect } from "expo-router";
import React, { useState, useRef, useCallback } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

// Colors conforming to design system tokens
const COLOR_BORDER = "#E5E7EB";
const COLOR_BG = "#F5F7FA";
const COLOR_CARD = "#FFFFFF";
const COLOR_DARK = "#1F2937";
const COLOR_MUTED = "#6B7280";

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

// Tabler icons mapping
const TABLER_TO_MCI_MAP: Record<string, any> = {
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

  // Add/Edit Transaction Composer States
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [expandedTransactions, setExpandedTransactions] = useState<Record<string, boolean>>({});
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
  const scrollViewRef = useRef<ScrollView>(null);



  // Recalculates strictly the current month's budget details
  const checkBudgetAlert = useCallback(async () => {
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
  }, [profile]);

  const loadFinanceData = useCallback(async () => {
    if (!profile) return;

    let summary: FinanceSummary = {
      totalIncome: 0,
      totalExpense: 0,
      balance: 0,
      profitLossPercentage: 0,
    };
    let transactions: FinanceTransaction[] = [];
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
  }, [profile, viewMode, customStartDate, customEndDate]);

  useFocusEffect(
    useCallback(() => {
      loadFinanceData();
      checkBudgetAlert();
    }, [loadFinanceData, checkBudgetAlert])
  );

  const openAddModal = (type: TransactionType) => {
    setEditingTransaction(null);
    setTransactionType(type);
    setAmount("");
    setIncomeCategory("Salary");
    setExpenseCategory("Food");
    setNotes("");
    setTransactionDate(new Date());
    setIsModalVisible(true);
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
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
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
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
            try {
              await financeService.deleteTransaction(transaction.id);
              Alert.alert("Success", "Transaction deleted successfully!");
              loadFinanceData();
              checkBudgetAlert();
            } catch (error) {
              console.error("Delete transaction error:", error);
              Alert.alert("Error", "Failed to delete transaction");
            }
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
    const isExpanded = !!expandedTransactions[item.id];

    return (
      <AppCard key={item.id} stripeColor={isInc ? "#10B981" : "#EF4444"}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => {
            setExpandedTransactions((prev) => ({
              ...prev,
              [item.id]: !prev[item.id],
            }));
          }}
          style={styles.transactionCardMain}
        >
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
                numberOfLines={isExpanded ? undefined : 1}
                ellipsizeMode="tail"
              >
                {item.notes}
              </Text>
            ) : null}
          </View>

          <View style={styles.transactionRight}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Text
                style={[
                  styles.transactionAmountText,
                  { color: isInc ? "#3B6D11" : "#A32D2D" },
                ]}
              >
                {isInc ? "+" : "-"}{formatCurrency(item.amount)}
              </Text>
              <MaterialCommunityIcons
                name={isExpanded ? "chevron-up" : "chevron-down"}
                size={16}
                color="#94A3B8"
              />
            </View>
            <Text style={styles.transactionDateSubtext}>
              {formatDate(item.date)}
            </Text>
          </View>
        </TouchableOpacity>

        {isExpanded && (
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
        )}
      </AppCard>
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
      <Stack.Screen options={{ title: "Finance Tracker", headerShown: true }} />
      
      <View style={styles.container}>
        <ScrollView ref={scrollViewRef} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          
          {/* Header Productivity Card styled after To-Do module */}
          <View style={[styles.headerCard, { backgroundColor: "#2563EB", marginHorizontal: 16, marginTop: 16, marginBottom: 16, borderRadius: 16, borderColor: "#2563EB" }]}>
            <View style={styles.headerTopRow}>
              <View style={styles.greetingSection}>
                <Text style={[styles.greetingTitle, { color: "#93C5FD" }]}>
                  {"Net Balance · " + getViewTitle()}
                </Text>
                <Text style={[styles.greetingSubtitle, { color: "#FFFFFF", fontSize: 26, fontWeight: "700" }]}>
                  {formatCurrency(todaySummary.balance)}
                </Text>
                
                {/* Small profit/loss trend subtext */}
                <View style={{ flexDirection: "row", alignItems: "center", marginTop: 6, gap: 4 }}>
                  <MaterialCommunityIcons
                    name={pctChange >= 0 ? "trending-up" : "trending-down"}
                    size={14}
                    color="#93C5FD"
                  />
                  <Text style={{ fontSize: 12, fontWeight: "600", color: "#93C5FD" }}>
                    {pctChange >= 0 ? "+" : ""}{pctChange.toFixed(1)}% vs prev. period
                  </Text>
                </View>
              </View>
              
              {/* Dynamic Usage Progress Ring */}
              <View style={[styles.progressCircle, { borderColor: "#60A5FA", backgroundColor: "rgba(255,255,255,0.1)" }]}>
                <Text style={[styles.progressPercentText, { color: "#FFFFFF" }]}>{Math.round(periodRatio)}%</Text>
                <Text style={[styles.progressSubtext, { color: "#93C5FD" }]}>Spent</Text>
              </View>
            </View>
            
            {/* Quick Stat Chips */}
            <View style={styles.statChipsRow}>
              <StatChip
                count={formatCurrency(todaySummary.totalIncome)}
                label="Income"
                type="success"
              />
              <StatChip
                count={formatCurrency(todaySummary.totalExpense)}
                label="Expense"
                type="danger"
              />
              <StatChip
                count={recentTransactions.length}
                label="Logs"
                type="default"
              />
            </View>
          </View>

          {/* Segmented Period Pill Selector */}
          <SegmentedControl
            tabs={[
              { id: "today", label: "Today" },
              { id: "week", label: "Week" },
              { id: "month", label: "Month" },
              { id: "custom", label: "Custom" },
            ]}
            activeTab={viewMode}
            onChange={(id) => {
              setViewMode(id as ViewMode);
              if (id === "custom") {
                if (!customStartDate) setCustomStartDate(new Date());
                if (!customEndDate) setCustomEndDate(new Date());
              }
            }}
            style={{ marginHorizontal: 16 }}
          />

          {/* Custom Range Picker row beneath pills */}
          {viewMode === "custom" && (
            <View style={[styles.dateRangeContainer, { paddingTop: 4 }]}>
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

          {/* Budget Alert Banner */}
          {renderBudgetAlert()}

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

          {/* Inline Collapsible Composer Panel */}
          {isModalVisible && (
            <View style={[styles.inlinePanelCard, { backgroundColor: isIncome ? "#F9FBF9" : "#FBF9F9", borderColor: modalTheme.chipSelectedBorder, borderWidth: 1, marginHorizontal: 16, marginBottom: 20, borderRadius: 12, padding: 14 }]}>
              {/* Header */}
              <View style={[styles.panelHeaderRow, { borderBottomWidth: 0.5, borderBottomColor: COLOR_BORDER, paddingBottom: 10, marginBottom: 14, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }]}>
                <View style={[styles.panelHeaderLeft, { flexDirection: "row", alignItems: "center", gap: 6 }]}>
                  <Text style={{ fontSize: 16 }}>{isIncome ? "💚" : "❤️"}</Text>
                  <Text style={[styles.panelTitle, { fontSize: 14, fontWeight: "600", color: COLOR_DARK }]}>
                    {editingTransaction ? "Edit" : "Add"} {isIncome ? "Income" : "Expense"}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                  <Text style={{ color: COLOR_MUTED, fontSize: 13, fontWeight: "500" }}>Cancel</Text>
                </TouchableOpacity>
              </View>

              {/* Amount & Date Input Row */}
              <View style={{ flexDirection: "row", gap: 10, marginBottom: 12 }}>
                <View style={[styles.fieldContainer, { flex: 1.2 }]}>
                  <Text style={styles.fieldLabel}>Amount (Rs.)</Text>
                  <TextInput
                    ref={amountInputRef}
                    style={styles.fieldInput}
                    value={amount}
                    onChangeText={setAmount}
                    placeholder="0.00"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                  />
                </View>
                <TouchableOpacity
                  style={[styles.fieldContainer, { flex: 0.8 }]}
                  onPress={() => setShowTransactionCalendar(true)}
                >
                  <Text style={styles.fieldLabel}>Date</Text>
                  <View style={styles.dateFieldRow}>
                    <MaterialCommunityIcons name="calendar" size={14} color="#6B7280" />
                    <Text style={styles.dateFieldText}>{formatDate(transactionDate)}</Text>
                  </View>
                </TouchableOpacity>
              </View>

              {/* Category selector row */}
              <View style={{ marginBottom: 12 }}>
                <Text style={styles.fieldLabel}>Category</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
                  {(isIncome ? INCOME_CATEGORIES_WITH_ICONS : EXPENSE_CATEGORIES_WITH_ICONS).map((catObj) => {
                    const cat = catObj.name;
                    const iconKey = catObj.icon;
                    const isActive = isIncome ? incomeCategory === cat : expenseCategory === cat;
                    return (
                      <TouchableOpacity
                        key={cat}
                        style={[
                          styles.categoryChip,
                          isActive && {
                            borderColor: modalTheme.chipSelectedBorder,
                            backgroundColor: modalTheme.chipSelectedBg,
                          }
                        ]}
                        onPress={() => {
                          if (isIncome) {
                            setIncomeCategory(cat as IncomeCategoryType);
                          } else {
                            setExpenseCategory(cat as ExpenseCategoryType);
                          }
                        }}
                      >
                        {renderIcon(iconKey, isActive ? modalTheme.chipSelectedText : "#6B7280", 14)}
                        <Text style={[styles.categoryChipText, isActive && { color: modalTheme.chipSelectedText, fontWeight: "600" }]}>
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Notes Input */}
              <View style={[styles.fieldContainer, { marginBottom: 14 }]}>
                <Text style={styles.fieldLabel}>Notes / Description</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Add description..."
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              {/* Save / Submit Button at the bottom */}
              <TouchableOpacity
                style={[styles.submitButton, { backgroundColor: isIncome ? "#10B981" : "#EF4444" }]}
                onPress={handleSaveTransaction}
              >
                <Text style={styles.submitButtonText}>
                  {editingTransaction ? "Save Changes" : `Add ${isIncome ? "Income" : "Expense"}`}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Grouped Transaction List */}
          <View style={styles.transactionsSection}>
            <Text style={styles.sectionTitle}>Transactions</Text>
            {groupedTx.length === 0 ? (
              <EmptyState
                emoji="📊"
                title="No transactions for this period"
                subtitle="Tap Add Income/Expense to log transactions."
              />
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


  // Segmented tab styles
  tabContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 2,
    backgroundColor: COLOR_BG,
  },
  tabScroll: {
    backgroundColor: "#E5E7EB",
    borderRadius: 24,
    padding: 3,
    flexDirection: "row",
    gap: 2,
  },
  tabPill: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  tabPillActive: {
    backgroundColor: COLOR_CARD,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  tabPillText: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "400",
  },
  tabPillTextActive: {
    color: COLOR_DARK,
    fontWeight: "500",
  },

  container: {
    flex: 1,
    backgroundColor: COLOR_BG,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLOR_BG,
  },
  emptyText: {
    fontSize: 15,
    color: COLOR_MUTED,
    fontWeight: "500",
  },
  scrollContent: {
    paddingBottom: 24,
  },
  dateRangeContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
    backgroundColor: COLOR_BG,
  },
  dateRangeButton: {
    flex: 1,
    backgroundColor: COLOR_CARD,
    padding: 10,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: COLOR_BORDER,
  },
  dateRangeLabel: {
    fontSize: 11,
    color: COLOR_MUTED,
    marginBottom: 2,
    textTransform: "uppercase",
    fontWeight: "500",
  },
  dateRangeValue: {
    fontSize: 13,
    fontWeight: "500",
    color: COLOR_DARK,
  },
  dateRangeSeparator: {
    fontSize: 16,
    color: COLOR_MUTED,
    fontWeight: "500",
  },
  headerCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 0.5,
    borderColor: "#E5E7EB",
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  greetingSection: {
    flex: 1,
  },
  greetingTitle: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  greetingSubtitle: {
    fontSize: 26,
    fontWeight: "700",
    color: "#1F2937",
    marginTop: 4,
  },
  progressCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 4.5,
    justifyContent: "center",
    alignItems: "center",
  },
  progressPercentText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2937",
  },
  progressSubtext: {
    fontSize: 8,
    color: "#6B7280",
    textTransform: "uppercase",
    fontWeight: "600",
    marginTop: 1,
  },
  statChipsRow: {
    flexDirection: "row",
    gap: 8,
  },
  statChip: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  statChipCount: {
    fontSize: 13,
    fontWeight: "700",
  },
  statChipLabel: {
    fontSize: 10,
    fontWeight: "600",
    marginTop: 2,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  progressBarSection: {
    borderTopWidth: 0.5,
    borderTopColor: COLOR_BORDER,
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
    color: COLOR_MUTED,
    fontWeight: "500",
  },
  progressBarValue: {
    fontSize: 12,
    fontWeight: "500",
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
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: COLOR_BORDER,
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
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: COLOR_BORDER,
  },
  incomeActionBtn: {
    backgroundColor: "#EAF3DE",
  },
  expenseActionBtn: {
    backgroundColor: "#FCEBEB",
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: "500",
  },
  transactionsSection: {
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "500",
    color: COLOR_DARK,
    marginBottom: 14,
  },
  sectionGroup: {
    marginBottom: 18,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: "500",
    color: "#94A3B8",
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  emptyTransactions: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
    backgroundColor: COLOR_CARD,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: COLOR_BORDER,
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
    fontWeight: "500",
    color: COLOR_DARK,
    marginBottom: 4,
  },
  emptyTransactionsSubtext: {
    fontSize: 12,
    color: COLOR_MUTED,
    fontWeight: "400",
  },
  transactionCard: {
    backgroundColor: COLOR_CARD,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 0.5,
    borderColor: COLOR_BORDER,
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
    fontWeight: "500",
    color: COLOR_DARK,
    marginBottom: 2,
  },
  transactionNotes: {
    fontSize: 11,
    color: COLOR_MUTED,
    fontWeight: "400",
  },
  transactionRight: {
    alignItems: "flex-end",
  },
  transactionAmountText: {
    fontSize: 15,
    fontWeight: "500",
    marginBottom: 2,
  },
  transactionDateSubtext: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "400",
  },
  transactionActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 10,
    borderTopWidth: 0.5,
    borderTopColor: COLOR_BORDER,
    paddingTop: 8,
  },
  actionPillBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: COLOR_BORDER,
    backgroundColor: COLOR_CARD,
    minWidth: 54,
    alignItems: "center",
  },
  deletePillBtn: {
    borderColor: "#FEE2E2",
  },
  actionPillBtnText: {
    fontSize: 11,
    fontWeight: "500",
    color: COLOR_MUTED,
  },
  deletePillBtnText: {
    color: "#EF4444",
  },

  // Inline Panel and Composer styling
  inlinePanelCard: {
    borderWidth: 0.5,
    borderRadius: 12,
    overflow: "hidden",
  },
  panelHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  panelHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  panelTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: COLOR_DARK,
  },
  fieldContainer: {
    backgroundColor: "#F9FAFB",
    borderWidth: 0.5,
    borderColor: COLOR_BORDER,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flex: 1,
  },
  fieldLabel: {
    fontSize: 10,
    color: "#6B7280",
    fontWeight: "600",
    textTransform: "uppercase",
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  fieldInput: {
    fontSize: 14,
    color: COLOR_DARK,
    fontWeight: "500",
    padding: 0,
  },
  dateFieldRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 20,
  },
  dateFieldText: {
    fontSize: 13,
    color: COLOR_DARK,
    fontWeight: "500",
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: COLOR_BORDER,
    backgroundColor: "#F9FAFB",
    gap: 6,
  },
  categoryChipText: {
    fontSize: 12,
    color: "#4B5563",
    fontWeight: "500",
  },
  submitButton: {
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
});
