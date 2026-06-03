// ============================================
// Shopping Module - Premium Redesigned UX
// Conforming to solid visual guidelines, font weight limits,
// inline expanding composer cards, and category accent bars.
// ============================================

import Calendar from "@/components/ui/calendar";
import { AppCard } from "@/components/ui/AppCard";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { EmptyState, LoadingState } from "@/components/ui/States";
import { StatChip } from "@/components/ui/StatChip";
import shoppingService from "@/services/shoppingService";
import { useAppStore } from "@/store/appStore";
import {
  ShoppingCategory,
  ShoppingItem,
  ShoppingItemType,
  ShoppingPriority,
} from "@/types";
import { Stack, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

// Category configuration
const CATEGORIES: ShoppingCategory[] = [
  "Groceries",
  "Household",
  "Medicine",
  "Miscellaneous",
];
const PRIORITIES: ShoppingPriority[] = ["High", "Medium", "Low"];
const TYPES: ShoppingItemType[] = ["urgent", "monthly"];

// Design tokens
const COLOR_BLUE = "#2563EB";
const COLOR_BORDER = "#E5E7EB";
const COLOR_BG = "#F5F7FA";
const COLOR_CARD = "#FFFFFF";

const CATEGORY_COLORS = {
  Groceries: "#F59E0B",   // Amber
  Household: "#3B82F6",   // Blue
  Medicine: "#EF4444",    // Red
  Miscellaneous: "#6B7280", // Gray
};

const PRIORITY_COLORS = {
  High: "#EF4444",
  Medium: "#F59E0B",
  Low: "#10B981",
};

export default function ShoppingScreen() {
  const { profile } = useAppStore();
  const router = useRouter();

  // Core data states
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [filterType, setFilterType] = useState<"all" | "urgent" | "monthly" | "history">("all");
  const [expandedGroups, setExpandedGroups] = useState<{ [groupId: string]: boolean }>({});
  const [expandedItems, setExpandedItems] = useState<{ [itemId: string]: boolean }>({});
  const [showDueDateCalendar, setShowDueDateCalendar] = useState(false);

  // Inline panels expand state
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showBulkAdd, setShowBulkAdd] = useState(false);

  // Single Add/Edit form state
  const [editingItem, setEditingItem] = useState<ShoppingItem | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    category: "Groceries" as ShoppingCategory,
    type: "urgent" as ShoppingItemType,
    priority: "Medium" as ShoppingPriority,
    dueDate: "",
    isShared: false,
  });

  // Bulk Add state
  const [bulkItemsText, setBulkItemsText] = useState("");
  const [parsedBulkPreview, setParsedBulkPreview] = useState<{ name: string; category: ShoppingCategory }[]>([]);

  // Loading items
  useEffect(() => {
    loadShoppingItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  const loadShoppingItems = async () => {
    const data = await shoppingService.getShoppingItems(profile?.id || "");
    setItems(data);
  };

  // Helper keyword categorization matcher
  const autoCategorizeItem = (itemName: string): ShoppingCategory => {
    const name = itemName.toLowerCase();
    if (name.match(/milk|bread|egg|butter|cheese|meat|chicken|fish|vegetable|fruit|rice|flour|sugar|salt|oil|pasta|cereal|apple|banana|berry|vegetables|juice|soda|coffee|tea|snacks|snack|spices/i)) {
      return "Groceries";
    }
    if (name.match(/soap|shampoo|detergent|cleaner|tissue|towel|broom|mop|bulb|battery|brush|sponge|plate|napkin|cup|trash/i)) {
      return "Household";
    }
    if (name.match(/medicine|tablet|pill|syrup|aspirin|paracetamol|antibiotic|vitamin|bandage|cream|ointment|cough|allergy|first aid/i)) {
      return "Medicine";
    }
    return "Miscellaneous";
  };

  // Run auto categorization dynamically as user types name input
  const handleNameChange = (text: string) => {
    const matchedCategory = autoCategorizeItem(text);
    setFormData((prev) => ({
      ...prev,
      name: text,
      category: text.trim().length > 0 ? matchedCategory : prev.category,
    }));
  };

  // Live bulk text parser as user types
  const handleBulkTextChange = (text: string) => {
    setBulkItemsText(text);
    if (!text.trim()) {
      setParsedBulkPreview([]);
      return;
    }

    const itemNames = text
      .split(/[,\n]|\sand\s/i)
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

    const previews = itemNames.map((name) => ({
      name,
      category: autoCategorizeItem(name),
    }));

    setParsedBulkPreview(previews);
  };

  // Submit bulk items to backend
  const handleBulkSubmit = async () => {
    if (parsedBulkPreview.length === 0) return;

    try {
      const groupId = `bulk_${Date.now()}`;
      for (const item of parsedBulkPreview) {
        await shoppingService.addShoppingItem({
          profileID: profile?.id || "",
          name: item.name,
          category: item.category,
          type: "urgent",
          priority: "Medium",
          isShared: false,
          groupId: groupId,
        });
      }
      Alert.alert("Success", `Added ${parsedBulkPreview.length} items to your list!`);
      setBulkItemsText("");
      setParsedBulkPreview([]);
      setShowBulkAdd(false);
      loadShoppingItems();
    } catch (err) {
      console.error("Bulk add error:", err);
      Alert.alert("Error", "Failed to add bulk items");
    }
  };

  // Submit single item add/edit to backend
  const handleSingleSubmit = async () => {
    if (!formData.name.trim()) {
      Alert.alert("Error", "Please enter item name");
      return;
    }

    try {
      if (editingItem) {
        await shoppingService.editShoppingItem(editingItem.id, {
          name: formData.name,
          category: formData.category,
          type: formData.type,
          priority: formData.priority,
          dueDate: formData.dueDate ? new Date(formData.dueDate) : undefined,
          isShared: formData.isShared,
        });
        Alert.alert("Success", "Item updated successfully!");
      } else {
        await shoppingService.addShoppingItem({
          profileID: profile?.id || "",
          name: formData.name,
          category: formData.category,
          type: formData.type,
          priority: formData.priority,
          dueDate: formData.dueDate ? new Date(formData.dueDate) : undefined,
          isShared: formData.isShared,
        });
        Alert.alert("Success", "Item added successfully!");
      }

      setFormData({
        name: "",
        category: "Groceries",
        type: "urgent",
        priority: "Medium",
        dueDate: "",
        isShared: false,
      });
      setEditingItem(null);
      setShowQuickAdd(false);
      loadShoppingItems();
    } catch (err) {
      console.error("Single submit error:", err);
      Alert.alert("Error", "Failed to save item");
    }
  };

  // Trigger item editing inline
  const handleStartEdit = (item: ShoppingItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      category: item.category,
      type: item.type,
      priority: item.priority || "Medium",
      dueDate: item.dueDate ? new Date(item.dueDate).toISOString().split("T")[0] : "",
      isShared: item.isShared,
    });
    setShowQuickAdd(true);
    setShowBulkAdd(false);
    // Collapse item action row
    setExpandedItems((prev) => ({ ...prev, [item.id]: false }));
  };

  // Cancel edit
  const handleCancelEdit = () => {
    setEditingItem(null);
    setFormData({
      name: "",
      category: "Groceries",
      type: "urgent",
      priority: "Medium",
      dueDate: "",
      isShared: false,
    });
    setShowQuickAdd(false);
  };

  // Toggle item purchase checkbox state
  const handleToggleBought = async (itemId: string, currentStatus: boolean) => {
    const success = await shoppingService.markItemAsBought(itemId, !currentStatus);
    if (success) {
      loadShoppingItems();
    }
  };

  // Toggle sharing status
  const handleToggleShare = async (itemId: string, currentStatus: boolean) => {
    const success = await shoppingService.shareShoppingList(itemId, !currentStatus);
    if (success) {
      loadShoppingItems();
    }
  };

  // Delete shopping item
  const handleDelete = (itemId: string) => {
    Alert.alert("Delete Item", "Are you sure you want to delete this item?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const success = await shoppingService.deleteShoppingItem(itemId);
          if (success) {
            loadShoppingItems();
          }
        },
      },
    ]);
  };

  // Collapse/Expand toggler for folder groups
  const toggleGroupExpand = (groupId: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  // Collapse/Expand toggler for item inline actions
  const toggleItemExpand = (itemId: string) => {
    setExpandedItems((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  // Helper date formatters
  const formatDateToInput = (date: Date): string => {
    return date.toISOString().split("T")[0];
  };

  const formatDate = (date: any) => {
    if (!date) return "";
    const d = new Date(date);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatPurchaseTime = (dateInput: any) => {
    if (!dateInput) return "";
    const d = new Date(dateInput);
    const now = new Date();

    const isToday =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();

    if (isToday) {
      return d.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } else {
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
  };

  // Category Icon Resolver
  const getCategoryIcon = (category: ShoppingCategory) => {
    switch (category) {
      case "Groceries":
        return "🛒";
      case "Household":
        return "🏠";
      case "Medicine":
        return "💊";
      case "Miscellaneous":
        return "📦";
      default:
        return "🛍️";
    }
  };

  // Filter unbought items count for stats
  const stats = {
    urgentCount: items.filter((item) => !item.isBought && item.type === "urgent").length,
    monthlyCount: items.filter((item) => !item.isBought && item.type === "monthly").length,
  };

  // Filter items matching active filter tabs
  const getUnboughtFilteredItems = () => {
    return items.filter((item) => {
      if (item.isBought) return false;
      if (filterType === "urgent") return item.type === "urgent";
      if (filterType === "monthly") return item.type === "monthly";
      return true; // "all"
    });
  };

  // Render standard single card row
  const renderItemCard = (item: ShoppingItem, isInsideFolder = false) => {
    const isExpanded = !!expandedItems[item.id];
    const stripeColor = CATEGORY_COLORS[item.category] || CATEGORY_COLORS.Miscellaneous;
    const prioColor = PRIORITY_COLORS[item.priority || "Medium"];

    return (
      <AppCard
        key={item.id}
        stripeColor={stripeColor}
        style={[
          { paddingVertical: 12, paddingHorizontal: 16, marginBottom: 8 },
          item.isBought && styles.itemCardBought,
          isInsideFolder && styles.nestedFolderItem,
        ]}
      >
        <View style={styles.itemCardRow}>
          {/* Left: circular checkbox */}
          <TouchableOpacity
            style={[styles.circularCheckbox, item.isBought && styles.circularCheckboxChecked]}
            onPress={() => handleToggleBought(item.id, item.isBought)}
          >
            {item.isBought && <View style={styles.circularCheckboxInner} />}
          </TouchableOpacity>

          {/* Name & Subtitle */}
          <View style={styles.itemCardMainInfo}>
            <View style={styles.itemNameRow}>
              <Text style={styles.categoryEmoji}>{getCategoryIcon(item.category)}</Text>
              <Text style={[styles.itemName, item.isBought && styles.itemNameBought]}>
                {item.name}
              </Text>
            </View>
            <View style={styles.subLabelRow}>
              <Text style={styles.itemSublabel}>
                {item.type.toUpperCase()}
                {item.dueDate ? ` • Due ${formatDate(item.dueDate)}` : ""}
              </Text>
              {item.isShared && (
                <View style={styles.sharedBadge}>
                  <Text style={styles.sharedBadgeText}>Shared</Text>
                </View>
              )}
            </View>
          </View>

          {/* Chevron to expand actions */}
          <TouchableOpacity onPress={() => toggleItemExpand(item.id)} style={styles.chevronButton}>
            <Text style={styles.chevronIconText}>{isExpanded ? "▲" : "▼"}</Text>
          </TouchableOpacity>

          {/* Right: priority dot */}
          <View style={[styles.priorityDot, { backgroundColor: prioColor }]} />
        </View>

        {/* Collapsible Actions */}
        {isExpanded && (
          <View style={styles.inlineActionsRow}>
            <TouchableOpacity onPress={() => handleToggleShare(item.id, item.isShared)} style={styles.inlineActionBtn}>
              <Text style={styles.inlineActionText}>{item.isShared ? "Unshare" : "Share"}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleStartEdit(item)} style={styles.inlineActionBtn}>
              <Text style={styles.inlineActionText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.inlineActionBtn}>
              <Text style={[styles.inlineActionText, styles.deleteActionText]}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
      </AppCard>
    );
  };

  // Render dynamic Category Stacks (Main list grouping)
  const renderMainListCategoryGroups = () => {
    const filteredUnboughtItems = getUnboughtFilteredItems();
    if (filteredUnboughtItems.length === 0) {
      return (
        <EmptyState
          emoji="🛒"
          title="No items found"
          subtitle="Expand the panels above to add items to your list"
        />
      );
    }

    return (
      <ScrollView contentContainerStyle={styles.listScrollContent} showsVerticalScrollIndicator={false}>
        {CATEGORIES.map((category) => {
          const categoryItems = filteredUnboughtItems.filter((item) => item.category === category);
          if (categoryItems.length === 0) return null;

          // Separate folder items vs solo items
          const groupedFolders: { [groupId: string]: ShoppingItem[] } = {};
          const soloItems: ShoppingItem[] = [];

          categoryItems.forEach((item) => {
            if (item.groupId) {
              if (!groupedFolders[item.groupId]) {
                groupedFolders[item.groupId] = [];
              }
              groupedFolders[item.groupId].push(item);
            } else {
              soloItems.push(item);
            }
          });

          return (
            <View key={category} style={styles.categoryStack}>
              {/* uppercase Category Label */}
              <Text style={styles.categoryStackLabel}>{category.toUpperCase()}</Text>

              {/* Group Folders in Category */}
              {Object.keys(groupedFolders).map((groupId) => {
                const groupItems = groupedFolders[groupId];
                const isExpanded = !!expandedGroups[groupId];

                return (
                  <View key={groupId} style={styles.folderCardContainer}>
                    {/* Folder Header */}
                    <TouchableOpacity
                      style={styles.folderHeader}
                      onPress={() => toggleGroupExpand(groupId)}
                    >
                      <View style={styles.folderHeaderLeft}>
                        <Text style={styles.folderIcon}>📦</Text>
                        <View style={{ marginLeft: 10 }}>
                          <Text style={styles.folderName}>Bulk List {formatDate(groupItems[0].createdAt)}</Text>
                          <Text style={styles.folderSubtitle}>{groupItems.length} items inside</Text>
                        </View>
                      </View>
                      <View style={styles.folderHeaderRight}>
                        <View style={styles.itemCountBadge}>
                          <Text style={styles.itemCountBadgeText}>
                            {groupItems.length}
                          </Text>
                        </View>
                        <Text style={styles.chevronIcon}>{isExpanded ? "▲" : "▼"}</Text>
                      </View>
                    </TouchableOpacity>

                    {/* Collapsible Children */}
                    {isExpanded && (
                      <View style={styles.folderItemsContainer}>
                        {groupItems.map((childItem) => renderItemCard(childItem, true))}
                      </View>
                    )}
                  </View>
                );
              })}

              {/* Solo items */}
              {soloItems.map((soloItem) => renderItemCard(soloItem, false))}
            </View>
          );
        })}
      </ScrollView>
    );
  };

  // Render History View
  const renderHistoryView = () => {
    const historyItems = items
      .filter((item) => item.isBought)
      .sort((a, b) => {
        if (!a.boughtAt || !b.boughtAt) return 0;
        return new Date(b.boughtAt).getTime() - new Date(a.boughtAt).getTime();
      });

    if (historyItems.length === 0) {
      return (
        <EmptyState
          emoji="🕰️"
          title="Empty history"
          subtitle="Purchased items will stack here"
        />
      );
    }

    return (
      <FlatList
        data={historyItems}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listScrollContent}
        renderItem={({ item }) => {
          const stripeColor = CATEGORY_COLORS[item.category] || CATEGORY_COLORS.Miscellaneous;
          return (
            <AppCard
              stripeColor={stripeColor}
              style={[{ paddingVertical: 12, paddingHorizontal: 16, marginBottom: 8 }, styles.itemCardBought]}
            >
              <View style={styles.itemCardRow}>
                {/* Checked circle */}
                <TouchableOpacity
                  style={[styles.circularCheckbox, styles.circularCheckboxChecked]}
                  onPress={() => handleToggleBought(item.id, item.isBought)}
                >
                  <View style={styles.circularCheckboxInner} />
                </TouchableOpacity>

                {/* main Info details */}
                <View style={styles.itemCardMainInfo}>
                  <View style={styles.itemNameRow}>
                    <Text style={styles.categoryEmoji}>{getCategoryIcon(item.category)}</Text>
                    <Text style={[styles.itemName, styles.itemNameBought]}>{item.name}</Text>
                  </View>
                  <Text style={styles.itemSublabel}>{item.category}</Text>
                </View>

                {/* Date/Time purchase stamp */}
                <View style={styles.historyTimeContainer}>
                  <Text style={styles.historyTimeText}>{formatPurchaseTime(item.boughtAt)}</Text>
                  <TouchableOpacity onPress={() => handleDelete(item.id)} style={{ marginLeft: 8 }}>
                    <Text style={{ fontSize: 14 }}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </AppCard>
          );
        }}
      />
    );
  };

  return (
    <>
      <Stack.Screen options={{ title: "Shopping", headerShown: false }} />

      {/* PREMIUM SOLID BLUE HEADER */}
      <View style={styles.screenHeader}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity
            style={styles.backArrowButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backArrowText}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitleText}>Shopping</Text>
            <Text style={styles.headerSubtitleText}>
              {items.filter((item) => !item.isBought).length} items pending
            </Text>
          </View>
        </View>
        
        {/* Header Stats Chips Row */}
        <View style={styles.headerStatsRow}>
          <StatChip
            count={stats.urgentCount}
            label="Urgent"
            type="danger"
          />
          <StatChip
            count={stats.monthlyCount}
            label="Monthly"
            type="info"
          />
        </View>
      </View>

      <View style={styles.appContainer}>
        {/* INLINE PANELS (Embedded Creation) */}
        <View style={styles.panelsContainer}>
          
          {/* Panel 1: Quick Add Card */}
          <View style={[styles.inlinePanelCard, { backgroundColor: "#EFF6FF", borderColor: "#BFDBFE" }]}>
            <TouchableOpacity 
              style={styles.panelHeaderRow} 
              onPress={() => {
                setShowQuickAdd(!showQuickAdd);
                setShowBulkAdd(false);
                if (editingItem) handleCancelEdit();
              }}
            >
              <View style={styles.panelHeaderLeft}>
                <Text style={styles.panelIcon}>⚡</Text>
                <Text style={styles.panelTitle}>
                  {editingItem ? "Edit Item Details" : "Quick Add Item"}
                </Text>
              </View>
              <Text style={styles.chevronIconText}>{showQuickAdd ? "▲" : "▼"}</Text>
            </TouchableOpacity>

            {showQuickAdd && (
              <View style={styles.panelContent}>
                {/* 1. Item Name Input */}
                <Text style={styles.formLabel}>Item Name</Text>
                <TextInput
                  style={styles.formTextInput}
                  value={formData.name}
                  onChangeText={handleNameChange}
                  placeholder="e.g. Milk, Apples, Ibuprofen"
                  placeholderTextColor="#9CA3AF"
                />

                {/* 2. Category selection pill chips */}
                <Text style={styles.formLabel}>Category</Text>
                <View style={styles.pillChipGrid}>
                  {CATEGORIES.map((cat) => {
                    const isSelected = formData.category === cat;
                    const colorVal = CATEGORY_COLORS[cat];
                    return (
                      <TouchableOpacity
                        key={cat}
                        style={[
                          styles.pillChip,
                          isSelected && {
                            backgroundColor: colorVal + "20",
                            borderColor: colorVal,
                          },
                        ]}
                        onPress={() => setFormData({ ...formData, category: cat })}
                      >
                        <Text
                          style={[
                            styles.pillChipText,
                            isSelected && { color: colorVal, fontWeight: "500" },
                          ]}
                        >
                          {getCategoryIcon(cat)} {cat}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* 3. Type selector */}
                <Text style={styles.formLabel}>Type</Text>
                <View style={styles.typeSelectorRow}>
                  {TYPES.map((type) => {
                    const isSelected = formData.type === type;
                    return (
                      <TouchableOpacity
                        key={type}
                        style={[
                          styles.typeButton,
                          isSelected && styles.typeButtonActive,
                        ]}
                        onPress={() => setFormData({ ...formData, type })}
                      >
                        <Text
                          style={[
                            styles.typeButtonText,
                            isSelected && styles.typeButtonTextActive,
                          ]}
                        >
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* 4. Priority selector */}
                <Text style={styles.formLabel}>Priority</Text>
                <View style={styles.prioritySelectorRow}>
                  {PRIORITIES.map((prio) => {
                    const isSelected = formData.priority === prio;
                    const colorVal = PRIORITY_COLORS[prio];
                    return (
                      <TouchableOpacity
                        key={prio}
                        style={[
                          styles.priorityButton,
                          isSelected && {
                            backgroundColor: colorVal + "15",
                            borderColor: colorVal,
                          },
                        ]}
                        onPress={() => setFormData({ ...formData, priority: prio })}
                      >
                        <View style={[styles.prioBtnDot, { backgroundColor: colorVal }]} />
                        <Text
                          style={[
                            styles.priorityButtonText,
                            isSelected && { color: colorVal, fontWeight: "500" },
                          ]}
                        >
                          {prio}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* 5. Due date picker (Urgent only) */}
                {formData.type === "urgent" && (
                  <View style={styles.datePickerContainer}>
                    <Text style={styles.formLabel}>Due Date (Optional)</Text>
                    <TouchableOpacity
                      style={styles.datePickerField}
                      onPress={() => setShowDueDateCalendar(true)}
                    >
                      <Text style={formData.dueDate ? styles.dateText : styles.placeholderDateText}>
                        {formData.dueDate
                          ? formatDate(new Date(formData.dueDate))
                          : "Select target due date"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* 6. Share Switch */}
                <View style={styles.shareToggleRow}>
                  <View>
                    <Text style={styles.shareToggleTitle}>Share with family</Text>
                    <Text style={styles.shareToggleSubtitle}>Spouse will see checklist in dashboard</Text>
                  </View>
                  <Switch
                    value={formData.isShared}
                    onValueChange={(val) => setFormData({ ...formData, isShared: val })}
                    trackColor={{ false: "#D1D5DB", true: "#A7F3D0" }}
                    thumbColor={formData.isShared ? COLOR_BLUE : "#F3F4F6"}
                  />
                </View>

                {/* Buttons */}
                <View style={styles.formButtonsRow}>
                  {editingItem && (
                    <TouchableOpacity
                      style={[styles.formSubmitButton, styles.formCancelButton]}
                      onPress={handleCancelEdit}
                    >
                      <Text style={styles.formCancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[styles.formSubmitButton, { backgroundColor: COLOR_BLUE }]}
                    onPress={handleSingleSubmit}
                  >
                    <Text style={styles.formSubmitButtonText}>
                      {editingItem ? "Save Changes" : "Save Item"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          {/* Panel 2: Bulk Add Card */}
          <View style={[styles.inlinePanelCard, { backgroundColor: "#F5F3FF", borderColor: "#DDD6FE" }]}>
            <TouchableOpacity 
              style={styles.panelHeaderRow} 
              onPress={() => {
                setShowBulkAdd(!showBulkAdd);
                setShowQuickAdd(false);
                if (editingItem) handleCancelEdit();
              }}
            >
              <View style={styles.panelHeaderLeft}>
                <Text style={styles.panelIcon}>📝</Text>
                <Text style={styles.panelTitle}>Bulk Add List</Text>
              </View>
              <Text style={styles.chevronIconText}>{showBulkAdd ? "▲" : "▼"}</Text>
            </TouchableOpacity>

            {showBulkAdd && (
              <View style={styles.panelContent}>
                <Text style={styles.formLabel}>Enter Items List</Text>
                <TextInput
                  style={styles.bulkTextarea}
                  value={bulkItemsText}
                  onChangeText={handleBulkTextChange}
                  placeholder="Type items separated by comma, 'and', or new line.&#10;e.g. Bread, Soap and Apples"
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />

                {/* Live parsed preview stack */}
                {parsedBulkPreview.length > 0 && (
                  <View style={styles.previewContainer}>
                    <Text style={styles.previewHeading}>
                      {parsedBulkPreview.length} items detected:
                    </Text>
                    <View style={styles.previewListScroll}>
                      {parsedBulkPreview.map((item, idx) => {
                        const colorVal = CATEGORY_COLORS[item.category];
                        return (
                          <View key={idx} style={styles.previewRow}>
                            <View style={styles.previewRowLeft}>
                              <Text style={styles.previewRowEmoji}>
                                {getCategoryIcon(item.category)}
                              </Text>
                              <Text style={styles.previewRowName}>{item.name}</Text>
                            </View>
                            <View style={[styles.previewCategoryPill, { backgroundColor: colorVal + "20" }]}>
                              <Text style={[styles.previewCategoryPillText, { color: colorVal }]}>
                                {item.category}
                              </Text>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                )}

                {/* Submit bulk items */}
                <TouchableOpacity
                  style={[
                    styles.formSubmitButton,
                    { backgroundColor: "#7C3AED" },
                    parsedBulkPreview.length === 0 && { opacity: 0.5 },
                  ]}
                  disabled={parsedBulkPreview.length === 0}
                  onPress={handleBulkSubmit}
                >
                  <Text style={styles.formSubmitButtonText}>
                    Add {parsedBulkPreview.length} Items
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

        </View>

        {/* Segmented Filter Bar Selector */}
        <SegmentedControl
          tabs={[
            { id: "all", label: "All" },
            { id: "urgent", label: "Urgent" },
            { id: "monthly", label: "Monthly" },
            { id: "history", label: "History" },
          ]}
          activeTab={filterType}
          onChange={(id) => setFilterType(id as any)}
          style={{ marginHorizontal: 16, marginBottom: 12 }}
        />

        {/* List Stacks content */}
        <View style={{ flex: 1 }}>
          {filterType === "history" ? renderHistoryView() : renderMainListCategoryGroups()}
        </View>
      </View>

      {/* Due Date Calendar Modal Component */}
      <Calendar
        visible={showDueDateCalendar}
        onClose={() => setShowDueDateCalendar(false)}
        onSelectDate={(date: Date) => {
          setFormData({ ...formData, dueDate: formatDateToInput(date) });
          setShowDueDateCalendar(false);
        }}
        selectedDate={formData.dueDate ? new Date(formData.dueDate) : undefined}
        minDate={new Date()}
      />
    </>
  );
}

const styles = StyleSheet.create({
  appContainer: {
    flex: 1,
    backgroundColor: COLOR_BG,
  },
  // Premium Solid Header
  screenHeader: {
    backgroundColor: COLOR_BLUE,
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: "column",
    alignItems: "stretch",
    gap: 12,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  backArrowButton: {
    marginRight: 15,
    padding: 5,
  },
  backArrowText: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "500",
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitleText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "500",
    letterSpacing: 0.3,
  },
  headerSubtitleText: {
    color: "#EFF6FF",
    fontSize: 12,
    marginTop: 2,
    fontWeight: "400",
  },
  headerStatsRow: {
    flexDirection: "row",
    gap: 8,
  },
  headerStatChip: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  headerStatCount: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "500",
  },
  headerStatLabel: {
    color: "#EFF6FF",
    fontSize: 10,
    fontWeight: "400",
  },

  // Inline expanding cards style
  panelsContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 10,
  },
  inlinePanelCard: {
    borderWidth: 0.5,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: COLOR_CARD,
  },
  panelHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
  },
  panelHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  panelIcon: {
    fontSize: 16,
  },
  panelTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1F2937",
  },
  panelContent: {
    padding: 14,
    borderTopWidth: 0.5,
    borderTopColor: COLOR_BORDER,
  },

  // Segmented filter pill tabs
  filterBarContainer: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 2,
  },
  filterContainer: {
    flexDirection: "row",
    backgroundColor: "#E5E7EB",
    borderRadius: 24,
    padding: 3,
    marginBottom: 10,
  },
  filterPill: {
    flex: 1,
    paddingVertical: 9,
    alignItems: "center",
    borderRadius: 20,
  },
  filterPillActive: {
    backgroundColor: COLOR_CARD,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  filterPillText: {
    fontSize: 13,
    fontWeight: "400",
    color: "#6B7280",
  },
  filterPillTextActive: {
    color: "#1F2937",
    fontWeight: "500",
  },

  // List scroll and stacks
  listScrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  categoryStack: {
    marginBottom: 16,
  },
  categoryStackLabel: {
    fontSize: 11,
    fontWeight: "500",
    color: "#6B7280",
    letterSpacing: 1.1,
    marginBottom: 8,
    marginLeft: 4,
  },

  // Premium item card row layout
  itemCard: {
    backgroundColor: COLOR_CARD,
    borderWidth: 0.5,
    borderColor: COLOR_BORDER,
    borderLeftWidth: 4,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  itemCardRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  itemCardBought: {
    backgroundColor: "#F9FAFB",
    borderColor: COLOR_BORDER,
    opacity: 0.55,
  },
  nestedFolderItem: {
    marginLeft: 15,
  },

  // left circular checkbox
  circularCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: COLOR_BLUE,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  circularCheckboxChecked: {
    borderColor: "#10B981",
    backgroundColor: "#10B981",
  },
  circularCheckboxInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLOR_CARD,
  },

  // Main Card Text details
  itemCardMainInfo: {
    flex: 1,
  },
  itemNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  categoryEmoji: {
    fontSize: 14,
  },
  itemName: {
    fontSize: 13,
    fontWeight: "500",
    color: "#1F2937",
  },
  itemNameBought: {
    textDecorationLine: "line-through",
    color: "#9CA3AF",
  },
  subLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  itemSublabel: {
    fontSize: 11,
    color: "#9CA3AF",
    fontWeight: "400",
  },
  sharedBadge: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  sharedBadgeText: {
    fontSize: 9,
    fontWeight: "500",
    color: COLOR_BLUE,
  },

  // chevron to expand actions
  chevronButton: {
    padding: 6,
    marginRight: 8,
  },
  chevronIconText: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "500",
  },

  // priority dot
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 4,
  },

  // inline collapsible action row
  inlineActionsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 10,
    borderTopWidth: 0.5,
    borderTopColor: COLOR_BORDER,
    paddingTop: 8,
  },
  inlineActionBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  inlineActionText: {
    fontSize: 12,
    color: COLOR_BLUE,
    fontWeight: "500",
  },
  deleteActionText: {
    color: "#EF4444",
  },

  // Folder accordion styles
  folderCardContainer: {
    marginBottom: 8,
  },
  folderHeader: {
    backgroundColor: COLOR_CARD,
    borderWidth: 0.5,
    borderColor: COLOR_BORDER,
    borderLeftWidth: 4,
    borderLeftColor: "#6B7280", // folder left gray accent bar
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  folderHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  folderIcon: {
    fontSize: 20,
  },
  folderName: {
    fontSize: 13,
    fontWeight: "500",
    color: "#1F2937",
  },
  folderSubtitle: {
    fontSize: 10,
    color: "#9CA3AF",
    marginTop: 1,
    fontWeight: "400",
  },
  folderHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  itemCountBadge: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  itemCountBadgeText: {
    fontSize: 10,
    fontWeight: "500",
    color: "#4B5563",
  },
  chevronIcon: {
    fontSize: 10,
    color: "#6B7280",
    fontWeight: "500",
  },
  folderItemsContainer: {
    marginTop: 4,
    paddingLeft: 4,
  },

  // Form Fields layout
  formLabel: {
    fontSize: 11,
    fontWeight: "500",
    color: "#4B5563",
    letterSpacing: 1.1,
    marginBottom: 8,
    marginTop: 12,
  },
  formTextInput: {
    backgroundColor: COLOR_CARD,
    borderWidth: 0.5,
    borderColor: COLOR_BORDER,
    borderRadius: 10,
    padding: 12,
    fontSize: 13,
    color: "#1F2937",
    fontWeight: "400",
  },
  pillChipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  pillChip: {
    backgroundColor: "#F3F4F6",
    borderWidth: 0.5,
    borderColor: COLOR_BORDER,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  pillChipText: {
    fontSize: 12,
    color: "#4B5563",
    fontWeight: "400",
  },
  typeSelectorRow: {
    flexDirection: "row",
    gap: 10,
  },
  typeButton: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    borderWidth: 0.5,
    borderColor: COLOR_BORDER,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  typeButtonActive: {
    backgroundColor: COLOR_BLUE,
    borderColor: COLOR_BLUE,
  },
  typeButtonText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#4B5563",
  },
  typeButtonTextActive: {
    color: "#FFFFFF",
  },
  prioritySelectorRow: {
    flexDirection: "row",
    gap: 10,
  },
  priorityButton: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    borderWidth: 0.5,
    borderColor: COLOR_BORDER,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  prioBtnDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  priorityButtonText: {
    fontSize: 12,
    color: "#4B5563",
    fontWeight: "400",
  },
  datePickerContainer: {
    width: "100%",
  },
  datePickerField: {
    backgroundColor: COLOR_CARD,
    borderWidth: 0.5,
    borderColor: COLOR_BORDER,
    borderRadius: 10,
    padding: 12,
  },
  dateText: {
    fontSize: 13,
    color: "#1F2937",
    fontWeight: "500",
  },
  placeholderDateText: {
    fontSize: 13,
    color: "#9CA3AF",
    fontWeight: "400",
  },
  shareToggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: COLOR_CARD,
    borderWidth: 0.5,
    borderColor: COLOR_BORDER,
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
    marginBottom: 16,
  },
  shareToggleTitle: {
    fontSize: 13,
    fontWeight: "500",
    color: "#1F2937",
  },
  shareToggleSubtitle: {
    fontSize: 10,
    color: "#9CA3AF",
    marginTop: 2,
    fontWeight: "400",
  },
  formButtonsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  formSubmitButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  formCancelButton: {
    backgroundColor: "#F3F4F6",
    borderWidth: 0.5,
    borderColor: COLOR_BORDER,
  },
  formSubmitButtonText: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "500",
  },
  formCancelButtonText: {
    fontSize: 14,
    color: "#4B5563",
    fontWeight: "500",
  },

  // Bulk Text Area
  bulkTextarea: {
    backgroundColor: COLOR_CARD,
    borderWidth: 0.5,
    borderColor: COLOR_BORDER,
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    color: "#1F2937",
    minHeight: 120,
    marginBottom: 12,
    fontWeight: "400",
  },
  previewContainer: {
    marginBottom: 16,
  },
  previewHeading: {
    fontSize: 11,
    fontWeight: "500",
    color: "#D97706",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  previewListScroll: {
    maxHeight: 150,
    borderWidth: 0.5,
    borderColor: COLOR_BORDER,
    borderRadius: 12,
    backgroundColor: COLOR_CARD,
    padding: 8,
  },
  previewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: "#F3F4F6",
  },
  previewRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  previewRowEmoji: {
    fontSize: 15,
  },
  previewRowName: {
    fontSize: 13,
    color: "#1F2937",
    fontWeight: "400",
  },
  previewCategoryPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  previewCategoryPillText: {
    fontSize: 10,
    fontWeight: "500",
  },

  // Common Layout placeholders
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#1F2937",
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 12,
    color: "#9CA3AF",
    textAlign: "center",
    fontWeight: "400",
  },

  // History views
  historyTimeContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  historyTimeText: {
    fontSize: 11,
    color: "#9CA3AF",
    fontWeight: "400",
  },
});
