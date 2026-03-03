// ============================================
// Finance Module - Income & Expense Tracker
// Track daily transactions, view summaries, profit/loss
// ============================================

import Calendar from '@/components/ui/calendar';
import financeService from '@/services/financeService';
import { useAppStore } from '@/store/appStore';
import { FinanceCategory, FinanceSummary, FinanceTransaction, TransactionType } from '@/types';
import { Stack } from 'expo-router';
import React, { useEffect, useState } from 'react';
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
} from 'react-native';

const CATEGORIES: FinanceCategory[] = [
  'Salary',
  'Food',
  'Transport',
  'Bills',
  'Shopping',
  'Entertainment',
  'Health',
  'Education',
  'Investment',
  'Other',
];

type ViewMode = 'today' | 'week' | 'month' | 'custom';

export default function FinanceScreen() {
  const { profile } = useAppStore();
  const [todaySummary, setTodaySummary] = useState<FinanceSummary>({
    totalIncome: 0,
    totalExpense: 0,
    balance: 0,
    profitLossPercentage: 0,
  });
  const [recentTransactions, setRecentTransactions] = useState<FinanceTransaction[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [transactionType, setTransactionType] = useState<TransactionType>('income');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<FinanceCategory>('Salary');
  const [notes, setNotes] = useState('');
  const [transactionDate, setTransactionDate] = useState(new Date());
  const [showTransactionCalendar, setShowTransactionCalendar] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('today');
  const [customStartDate, setCustomStartDate] = useState<Date | null>(null);
  const [customEndDate, setCustomEndDate] = useState<Date | null>(null);
  const [showStartCalendar, setShowStartCalendar] = useState(false);
  const [showEndCalendar, setShowEndCalendar] = useState(false);

  useEffect(() => {
    loadFinanceData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, viewMode, customStartDate, customEndDate]);

  const loadFinanceData = async () => {
    if (!profile) return;

    let summary: FinanceSummary;
    let transactions: FinanceTransaction[];

    switch (viewMode) {
      case 'week':
        summary = await financeService.getWeeklySummary(profile.id);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        transactions = await financeService.getTransactionsByDateRange(profile.id, weekAgo, new Date());
        break;
      case 'month':
        const monthYear = `${new Date().getFullYear()}-${new Date().getMonth() + 1}`;
        const monthlySummary = await financeService.getMonthlySummary(profile.id, monthYear);
        summary = {
          totalIncome: monthlySummary.income,
          totalExpense: monthlySummary.expense,
          balance: monthlySummary.balance,
          profitLossPercentage: monthlySummary.income > 0 ? ((monthlySummary.balance / monthlySummary.income) * 100) : 0,
        };
        const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        transactions = await financeService.getTransactionsByDateRange(profile.id, monthStart, new Date());
        break;
      case 'custom':
        if (customStartDate && customEndDate) {
          summary = await financeService.getSummaryByDateRange(profile.id, customStartDate, customEndDate);
          transactions = await financeService.getTransactionsByDateRange(profile.id, customStartDate, customEndDate);
        } else {
          summary = await financeService.getTodaySummary(profile.id);
          transactions = await financeService.getRecentTransactions(profile.id, 20);
        }
        break;
      default: // 'today'
        summary = await financeService.getTodaySummary(profile.id);
        transactions = await financeService.getRecentTransactions(profile.id, 20);
    }

    setTodaySummary(summary);
    setRecentTransactions(transactions);
  };

  const openAddModal = (type: TransactionType) => {
    setTransactionType(type);
    setAmount('');
    setCategory(type === 'income' ? 'Salary' : 'Food');
    setNotes('');
    setTransactionDate(new Date());
    setIsModalVisible(true);
  };

  const handleAddTransaction = async () => {
    if (!profile || !amount || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    try {
      await financeService.addTransaction({
        profileID: profile.id,
        type: transactionType,
        amount: parseFloat(amount),
        category,
        date: transactionDate,
        notes: notes || undefined,
      });

      setIsModalVisible(false);
      loadFinanceData();
      Alert.alert('Success', 'Transaction added successfully!');
    } catch {
      Alert.alert('Error', 'Failed to add transaction');
    }
  };

  const handleDeleteTransaction = (transaction: FinanceTransaction) => {
    Alert.alert(
      'Delete Transaction',
      'Are you sure you want to delete this transaction?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await financeService.deleteTransaction(transaction.id);
            loadFinanceData();
          },
        },
      ]
    );
  };

  const formatCurrency = (value: number) => {
    return `₹${value.toFixed(0)}`;
  };

  const formatDate = (date: Date) => {
    const d = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const compareDate = new Date(d);
    compareDate.setHours(0, 0, 0, 0);

    if (compareDate.getTime() === today.getTime()) {
      return 'Today';
    }

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (compareDate.getTime() === yesterday.getTime()) {
      return 'Yesterday';
    }

    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatDateFull = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getViewTitle = () => {
    switch (viewMode) {
      case 'week':
        return 'This Week';
      case 'month':
        return 'This Month';
      case 'custom':
        if (customStartDate && customEndDate) {
          return `${formatDateFull(customStartDate)} - ${formatDateFull(customEndDate)}`;
        }
        return 'Custom Range';
      default:
        return "Today's Overview";
    }
  };

  const getCategoryEmoji = (cat: FinanceCategory): string => {
    const map: Record<FinanceCategory, string> = {
      Salary: '💼',
      Food: '🍔',
      Transport: '🚗',
      Bills: '📄',
      Shopping: '🛍️',
      Entertainment: '🎬',
      Health: '🏥',
      Education: '📚',
      Investment: '📈',
      Other: '💳',
    };
    return map[cat];
  };

  const renderTransaction = ({ item }: { item: FinanceTransaction }) => (
    <TouchableOpacity
      style={styles.transactionCard}
      onLongPress={() => handleDeleteTransaction(item)}
      activeOpacity={0.7}
    >
      <View style={styles.transactionLeft}>
        <View style={styles.categoryIcon}>
          <Text style={styles.categoryEmoji}>{getCategoryEmoji(item.category)}</Text>
        </View>
        <View style={styles.transactionInfo}>
          <Text style={styles.transactionCategory}>{item.category}</Text>
          <Text style={styles.transactionDate}>{formatDate(item.date)}</Text>
          {item.notes && <Text style={styles.transactionNotes}>{item.notes}</Text>}
        </View>
      </View>
      <Text
        style={[
          styles.transactionAmount,
          item.type === 'income' ? styles.incomeAmount : styles.expenseAmount,
        ]}
      >
        {item.type === 'income' ? '+' : '-'}{formatCurrency(item.amount)}
      </Text>
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
      <Stack.Screen options={{ title: 'Finance', headerShown: true }} />
      <View style={styles.container}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* View Mode Selector */}
          <View style={styles.viewModeContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.viewModeRow}>
                <TouchableOpacity
                  style={[styles.viewModeButton, viewMode === 'today' && styles.viewModeButtonActive]}
                  onPress={() => setViewMode('today')}
                >
                  <Text style={[styles.viewModeText, viewMode === 'today' && styles.viewModeTextActive]}>
                    Today
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.viewModeButton, viewMode === 'week' && styles.viewModeButtonActive]}
                  onPress={() => setViewMode('week')}
                >
                  <Text style={[styles.viewModeText, viewMode === 'week' && styles.viewModeTextActive]}>
                    Week
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.viewModeButton, viewMode === 'month' && styles.viewModeButtonActive]}
                  onPress={() => setViewMode('month')}
                >
                  <Text style={[styles.viewModeText, viewMode === 'month' && styles.viewModeTextActive]}>
                    Month
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.viewModeButton, viewMode === 'custom' && styles.viewModeButtonActive]}
                  onPress={() => {
                    setViewMode('custom');
                    if (!customStartDate) setCustomStartDate(new Date());
                    if (!customEndDate) setCustomEndDate(new Date());
                  }}
                >
                  <Text style={[styles.viewModeText, viewMode === 'custom' && styles.viewModeTextActive]}>
                    Custom
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>

          {/* Custom Date Range Selector */}
          {viewMode === 'custom' && (
            <View style={styles.dateRangeContainer}>
              <TouchableOpacity
                style={styles.dateRangeButton}
                onPress={() => setShowStartCalendar(true)}
              >
                <Text style={styles.dateRangeLabel}>From:</Text>
                <Text style={styles.dateRangeValue}>
                  {customStartDate ? formatDateFull(customStartDate) : 'Select date'}
                </Text>
              </TouchableOpacity>
              <Text style={styles.dateRangeSeparator}>→</Text>
              <TouchableOpacity
                style={styles.dateRangeButton}
                onPress={() => setShowEndCalendar(true)}
              >
                <Text style={styles.dateRangeLabel}>To:</Text>
                <Text style={styles.dateRangeValue}>
                  {customEndDate ? formatDateFull(customEndDate) : 'Select date'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Today's Overview */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>{getViewTitle()}</Text>
            <View style={styles.balanceContainer}>
              <Text style={styles.balanceAmount}>{formatCurrency(todaySummary.balance)}</Text>
              <Text
                style={[
                  styles.balanceLabel,
                  todaySummary.balance >= 0 ? styles.profit : styles.loss,
                ]}
              >
                {todaySummary.balance >= 0 ? 'Profit' : 'Loss'}
                {todaySummary.profitLossPercentage !== 0 &&
                  ` ${todaySummary.balance >= 0 ? '▲' : '▼'} ${Math.abs(
                    todaySummary.profitLossPercentage
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
              onPress={() => openAddModal('income')}
            >
              <Text style={styles.actionButtonText}>+ Add Income</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.expenseButton]}
              onPress={() => openAddModal('expense')}
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
                <Text style={styles.emptyTransactionsText}>No transactions yet</Text>
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

        {/* Add Transaction Modal */}
        <Modal
          visible={isModalVisible}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setIsModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                <Text style={styles.modalCancel}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>
                Add {transactionType === 'income' ? 'Income' : 'Expense'}
              </Text>
              <TouchableOpacity onPress={handleAddTransaction}>
                <Text style={styles.modalSave}>Add</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              {/* Type Toggle */}
              <View style={styles.typeToggle}>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    transactionType === 'income' && styles.typeButtonActive,
                  ]}
                  onPress={() => setTransactionType('income')}
                >
                  <Text
                    style={[
                      styles.typeButtonText,
                      transactionType === 'income' && styles.typeButtonTextActive,
                    ]}
                  >
                    Income
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    transactionType === 'expense' && styles.typeButtonActive,
                  ]}
                  onPress={() => setTransactionType('expense')}
                >
                  <Text
                    style={[
                      styles.typeButtonText,
                      transactionType === 'expense' && styles.typeButtonTextActive,
                    ]}
                  >
                    Expense
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Amount */}
              <View style={styles.amountSection}>
                <Text style={styles.currencySymbol}>₹</Text>
                <TextInput
                  style={styles.amountInput}
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="0"
                  keyboardType="numeric"
                  autoFocus
                />
              </View>

              {/* Category */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Category</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.categoryRow}>
                    {CATEGORIES.map((cat) => (
                      <TouchableOpacity
                        key={cat}
                        style={[
                          styles.categoryChip,
                          category === cat && styles.categoryChipActive,
                        ]}
                        onPress={() => setCategory(cat)}
                      >
                        <Text style={styles.categoryChipEmoji}>{getCategoryEmoji(cat)}</Text>
                        <Text
                          style={[
                            styles.categoryChipText,
                            category === cat && styles.categoryChipTextActive,
                          ]}
                        >
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>

              {/* Date */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Date</Text>
                <TouchableOpacity
                  style={styles.datePickerButton}
                  onPress={() => setShowTransactionCalendar(true)}
                >
                  <Text style={styles.datePickerText}>
                    {formatDateFull(transactionDate)}
                  </Text>
                  <Text style={styles.datePickerIcon}>📅</Text>
                </TouchableOpacity>
              </View>

              {/* Notes */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Notes (Optional)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Add a note..."
                  multiline
                  numberOfLines={3}
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
    backgroundColor: '#F5F7FA',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
  },
  viewModeContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  viewModeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  viewModeButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  viewModeButtonActive: {
    backgroundColor: '#34D399',
    borderColor: '#34D399',
  },
  viewModeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  viewModeTextActive: {
    color: 'white',
  },
  dateRangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  dateRangeButton: {
    flex: 1,
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dateRangeLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  dateRangeValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  dateRangeSeparator: {
    fontSize: 18,
    color: '#6B7280',
  },
  summaryCard: {
    backgroundColor: 'white',
    margin: 16,
    padding: 24,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  summaryTitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 16,
  },
  balanceContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  balanceAmount: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  balanceLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  profit: {
    color: '#34D399',
  },
  loss: {
    color: '#EF4444',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E5E7EB',
  },
  statLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  incomeText: {
    color: '#34D399',
  },
  expenseText: {
    color: '#EF4444',
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  incomeButton: {
    backgroundColor: '#34D399',
  },
  expenseButton: {
    backgroundColor: '#EF4444',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  transactionsSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  emptyTransactions: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTransactionsText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  emptyTransactionsSubtext: {
    fontSize: 14,
    color: '#6B7280',
  },
  transactionCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  categoryEmoji: {
    fontSize: 24,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionCategory: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  transactionNotes: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: 18,
    fontWeight: '700',
  },
  incomeAmount: {
    color: '#34D399',
  },
  expenseAmount: {
    color: '#EF4444',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalCancel: {
    fontSize: 16,
    color: '#6B7280',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  modalSave: {
    fontSize: 16,
    color: '#34D399',
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  typeToggle: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  typeButtonActive: {
    backgroundColor: '#34D399',
  },
  typeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  typeButtonTextActive: {
    color: 'white',
  },
  amountSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 16,
    marginBottom: 24,
  },
  currencySymbol: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#1F2937',
    marginRight: 8,
  },
  amountInput: {
    fontSize: 56,
    fontWeight: 'bold',
    color: '#1F2937',
    flex: 1,
    textAlign: 'left',
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryChipActive: {
    backgroundColor: '#34D39920',
    borderColor: '#34D399',
  },
  categoryChipEmoji: {
    fontSize: 20,
  },
  categoryChipText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  categoryChipTextActive: {
    color: '#34D399',
    fontWeight: '600',
  },
  datePickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 14,
  },
  datePickerText: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '500',
  },
  datePickerIcon: {
    fontSize: 20,
  },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#1F2937',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
});
