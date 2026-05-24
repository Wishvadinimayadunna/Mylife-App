// ============================================
// Shopping Module - Premium Redesigned UX
// Reorganized layout conforming to solid visual guidelines
// ============================================

import Calendar from "@/components/ui/calendar";
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
  Modal,
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
const COLOR_NAVY = "#1a1f36";
const COLOR_BORDER = "#E5E7EB";

const CATEGORY_COLORS = {
  Groceries: { fill: "#E6F4F2", border: "#0D9488", text: "#0D9488" },
  Household: { fill: "#FEF3C7", border: "#D97706", text: "#D97706" },
  Medicine: { fill: "#FEE2E2", border: "#DC2626", text: "#DC2626" },
  Miscellaneous: { fill: "#F3F4F6", border: "#4B5563", text: "#4B5563" },
};

const PRIORITY_COLORS = {
  High: { dot: "#E24B4A", tint: "#FCE8E6" },
  Medium: { dot: "#EF9F27", tint: "#FEF3E6" },
  Low: { dot: "#639922", tint: "#EFF5E9" },
};

export default function ShoppingScreen() {
  const { profile } = useAppStore();
  const router = useRouter();

  // Navigation states
  const [activeScreen, setActiveScreen] = useState<"main" | "add" | "templates">("main");
  const [addMode, setAddMode] = useState<"single" | "bulk">("single");

  // Core data states
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [filterType, setFilterType] = useState<"all" | "urgent" | "monthly" | "history">("all");
  const [expandedGroups, setExpandedGroups] = useState<{ [groupId: string]: boolean }>({});
  const [showDueDateCalendar, setShowDueDateCalendar] = useState(false);

  // Single Add form state
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

  // Templates state
  const [templates, setTemplates] = useState<{ name: string; items: string[]; saveDate: string }[]>([]);
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");

  // Loading items
  useEffect(() => {
    loadShoppingItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  const loadShoppingItems = async () => {
    if (!profile) return;
    const data = await shoppingService.getShoppingItems(profile.id);
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
    if (!profile || parsedBulkPreview.length === 0) return;

    try {
      const groupId = `bulk_${Date.now()}`;
      for (const item of parsedBulkPreview) {
        await shoppingService.addShoppingItem({
          profileID: profile.id,
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
      setActiveScreen("main");
      loadShoppingItems();
    } catch (err) {
      console.error("Bulk add error:", err);
      Alert.alert("Error", "Failed to add bulk items");
    }
  };

  // Submit single item add/edit to backend
  const handleSingleSubmit = async () => {
    if (!profile) return;
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
          profileID: profile.id,
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
      setActiveScreen("main");
      loadShoppingItems();
    } catch (err) {
      console.error("Single submit error:", err);
      Alert.alert("Error", "Failed to save item");
    }
  };

  // Trigger item editing
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
    setAddMode("single");
    setActiveScreen("add");
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

  // Save current list as Template
  const handleSaveAsTemplate = () => {
    const activeItems = items.filter((item) => !item.isBought);
    if (activeItems.length === 0) {
      Alert.alert("Error", "No active items to save as template");
      return;
    }
    setNewTemplateName("");
    setShowSaveTemplateModal(true);
  };

  const saveTemplate = () => {
    if (!newTemplateName.trim()) {
      Alert.alert("Error", "Please enter a template name");
      return;
    }
    const activeItems = items.filter((item) => !item.isBought);
    const itemNames = activeItems.map((item) => item.name);

    const newTemplate = {
      name: newTemplateName,
      items: itemNames,
      saveDate: new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
    };

    setTemplates([...templates, newTemplate]);
    setShowSaveTemplateModal(false);
    Alert.alert("Success", `Template "${newTemplateName}" saved!`);
  };

  // Load Saved Template
  const handleLoadTemplate = async (template: { name: string; items: string[] }) => {
    if (!profile) return;

    try {
      const groupId = `bulk_${Date.now()}`;
      for (const itemName of template.items) {
        await shoppingService.addShoppingItem({
          profileID: profile.id,
          name: itemName,
          category: autoCategorizeItem(itemName),
          type: "urgent",
          priority: "Medium",
          isShared: false,
          groupId: groupId,
        });
      }
      Alert.alert("Success", `Loaded ${template.items.length} items from "${template.name}"`);
      setActiveScreen("main");
      loadShoppingItems();
    } catch (err) {
      console.error("Load template error:", err);
      Alert.alert("Error", "Failed to load template");
    }
  };

  // Delete Saved Template
  const handleDeleteTemplate = (index: number) => {
    Alert.alert("Delete Template", `Are you sure you want to delete "${templates[index].name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          setTemplates(templates.filter((_, i) => i !== index));
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

  // Subtitle header resolver
  const getScreenSubtitle = () => {
    if (activeScreen === "add") return addMode === "single" ? (editingItem ? "Edit item details" : "Add item details") : "Import multiple items";
    if (activeScreen === "templates") return "Load or configure checklists";
    return "Track family essentials";
  };

  // Render standard single card row
  const renderItemCard = (item: ShoppingItem, isInsideFolder = false) => {
    const catColors = CATEGORY_COLORS[item.category] || CATEGORY_COLORS.Miscellaneous;
    const prioColor = PRIORITY_COLORS[item.priority || "Medium"] || PRIORITY_COLORS.Medium;

    return (
      <View
        key={item.id}
        style={[
          styles.itemCard,
          item.isBought && styles.itemCardBought,
          isInsideFolder && styles.nestedFolderItem,
        ]}
      >
        {/* Left: circular checkbox */}
        <TouchableOpacity
          style={[styles.circularCheckbox, item.isBought && styles.circularCheckboxChecked]}
          onPress={() => handleToggleBought(item.id, item.isBought)}
        >
          {item.isBought && <View style={styles.circularCheckboxInner} />}
        </TouchableOpacity>

        {/* Category color block */}
        <View style={[styles.categorySquare, { backgroundColor: catColors.fill }]}>
          <Text style={[styles.categorySquareEmoji, { color: catColors.text }]}>
            {getCategoryIcon(item.category)}
          </Text>
        </View>

        {/* Name & Subtitle */}
        <View style={styles.itemCardMainInfo}>
          <Text style={[styles.itemName, item.isBought && styles.itemNameBought]}>
            {item.name}
          </Text>
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

        {/* Edit / Delete action indicators on Long Press or clean buttons */}
        <View style={styles.cardActionsContainer}>
          <TouchableOpacity onPress={() => handleToggleShare(item.id, item.isShared)} style={styles.cardActionIcon}>
            <Text style={styles.actionIconEmoji}>{item.isShared ? "👥" : "👤"}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleStartEdit(item)} style={styles.cardActionIcon}>
            <Text style={styles.actionIconEmoji}>✏️</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.cardActionIcon}>
            <Text style={styles.actionIconEmoji}>🗑️</Text>
          </TouchableOpacity>
        </View>

        {/* Right: priority dot */}
        <View style={[styles.priorityDot, { backgroundColor: prioColor.dot }]} />
      </View>
    );
  };

  // Render dynamic Category Stacks (Screen 1 core grouping)
  const renderMainListCategoryGroups = () => {
    const filteredUnboughtItems = getUnboughtFilteredItems();
    if (filteredUnboughtItems.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🛒</Text>
          <Text style={styles.emptyText}>No items found</Text>
          <Text style={styles.emptySubtext}>Use the buttons below to populate your list</Text>
        </View>
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
                const folderCatColors = CATEGORY_COLORS[category] || CATEGORY_COLORS.Miscellaneous;

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
                        <View style={[styles.itemCountBadge, { backgroundColor: folderCatColors.fill }]}>
                          <Text style={[styles.itemCountBadgeText, { color: folderCatColors.text }]}>
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

  // Render Screen 5: History View
  const renderHistoryView = () => {
    const historyItems = items
      .filter((item) => item.isBought)
      .sort((a, b) => {
        if (!a.boughtAt || !b.boughtAt) return 0;
        return new Date(b.boughtAt).getTime() - new Date(a.boughtAt).getTime();
      });

    if (historyItems.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🕰️</Text>
          <Text style={styles.emptyText}>Empty history</Text>
          <Text style={styles.emptySubtext}>Purchased items will stack here</Text>
        </View>
      );
    }

    return (
      <FlatList
        data={historyItems}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listScrollContent}
        renderItem={({ item }) => {
          const catColors = CATEGORY_COLORS[item.category] || CATEGORY_COLORS.Miscellaneous;
          return (
            <View style={[styles.itemCard, styles.itemCardBought]}>
              {/* Checked circle */}
              <TouchableOpacity
                style={[styles.circularCheckbox, styles.circularCheckboxChecked]}
                onPress={() => handleToggleBought(item.id, item.isBought)}
              >
                <View style={styles.circularCheckboxInner} />
              </TouchableOpacity>

              {/* category square block */}
              <View style={[styles.categorySquare, { backgroundColor: catColors.fill }]}>
                <Text style={[styles.categorySquareEmoji, { color: catColors.text }]}>
                  {getCategoryIcon(item.category)}
                </Text>
              </View>

              {/* main Info details */}
              <View style={styles.itemCardMainInfo}>
                <Text style={[styles.itemName, styles.itemNameBought]}>{item.name}</Text>
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
          );
        }}
      />
    );
  };

  return (
    <>
      <Stack.Screen options={{ title: "Shopping Module", headerShown: false }} />

      {/* SOLID HEADER */}
      <View style={styles.screenHeader}>
        <TouchableOpacity
          style={styles.backArrowButton}
          onPress={() => {
            if (activeScreen !== "main") { setEditingItem(null); setActiveScreen("main"); }
            else { router.back(); }
          }}
        >
          <Text style={styles.backArrowText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitleText}>
            {activeScreen === "main"
              ? "Shopping Checklists"
              : activeScreen === "add"
              ? addMode === "single"
                ? editingItem
                  ? "Edit Item"
                  : "Add Single Item"
                : "Bulk Add Checklist"
              : "Checklist Templates"}
          </Text>
          <Text style={styles.headerSubtitleText}>{getScreenSubtitle()}</Text>
        </View>
      </View>

      <View style={styles.appContainer}>
        {/* ========================================================
            SCREEN 1 & 5: MAIN & HISTORY SCREEN
            ======================================================== */}
        {activeScreen === "main" && (
          <>
            {/* Stat chips */}
            <View style={styles.statsContainer}>
              <View style={styles.statChip}>
                <View style={[styles.statIconBox, { backgroundColor: "#FCE8E6" }]}>
                  <Text style={{ color: "#E24B4A", fontWeight: "bold" }}>🚨</Text>
                </View>
                <View style={styles.statChipInfo}>
                  <Text style={styles.statChipCount}>{stats.urgentCount}</Text>
                  <Text style={styles.statChipLabel}>Urgent items</Text>
                </View>
              </View>

              <View style={styles.statChip}>
                <View style={[styles.statIconBox, { backgroundColor: "#DBEAFE" }]}>
                  <Text style={{ color: "#1D4ED8", fontWeight: "bold" }}>📅</Text>
                </View>
                <View style={styles.statChipInfo}>
                  <Text style={styles.statChipCount}>{stats.monthlyCount}</Text>
                  <Text style={styles.statChipLabel}>Monthly stock</Text>
                </View>
              </View>
            </View>

            {/* Navy filter tabs */}
            <View style={styles.filterTabsRow}>
              {["all", "urgent", "monthly", "history"].map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.filterTabButton,
                    filterType === type && styles.filterTabButtonActive,
                  ]}
                  onPress={() => setFilterType(type as any)}
                >
                  <Text
                    style={[
                      styles.filterTabButtonText,
                      filterType === type && styles.filterTabButtonTextActive,
                    ]}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* List stacks content */}
            <View style={{ flex: 1 }}>
              {filterType === "history" ? renderHistoryView() : renderMainListCategoryGroups()}
            </View>

            {/* Footer Buttons (hidden in History view) */}
            {filterType !== "history" && (
              <View style={styles.footerOutlineRow}>
                <TouchableOpacity
                  style={styles.outlineFooterButton}
                  onPress={() => {
                    setEditingItem(null);
                    setFormData({
                      name: "",
                      category: "Groceries",
                      type: "urgent",
                      priority: "Medium",
                      dueDate: "",
                      isShared: false,
                    });
                    setAddMode("single");
                    setActiveScreen("add");
                  }}
                >
                  <Text style={styles.outlineFooterButtonText}>➕ Add item</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.outlineFooterButton}
                  onPress={() => setActiveScreen("templates")}
                >
                  <Text style={styles.outlineFooterButtonText}>📋 Templates</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        {/* ========================================================
            SCREEN 2 & 3: ADD SCREENS (SINGLE & BULK MODE SWITCHER)
            ======================================================== */}
        {activeScreen === "add" && (
          <ScrollView contentContainerStyle={styles.addScreenScroll} showsVerticalScrollIndicator={false}>
            {/* Mode Switcher */}
            <View style={styles.switcherContainer}>
              <TouchableOpacity
                style={[styles.switcherTab, addMode === "single" && styles.switcherTabActive]}
                onPress={() => setAddMode("single")}
              >
                <Text style={[styles.switcherTabText, addMode === "single" && styles.switcherTabTextActive]}>
                  Single Mode
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.switcherTab, addMode === "bulk" && styles.switcherTabActive]}
                onPress={() => setAddMode("bulk")}
              >
                <Text style={[styles.switcherTabText, addMode === "bulk" && styles.switcherTabTextActive]}>
                  Bulk Add
                </Text>
              </TouchableOpacity>
            </View>

            {/* ----------------------------------------------------
                SCREEN 2: SINGLE ADD MODE
                ---------------------------------------------------- */}
            {addMode === "single" && (
              <View style={styles.formContainer}>
                {/* 1. Item Name Input */}
                <Text style={styles.formLabel}>Item Name</Text>
                <TextInput
                  style={styles.formTextInput}
                  value={formData.name}
                  onChangeText={handleNameChange}
                  placeholder="e.g. Milk, Apples, Ibuprofen"
                  placeholderTextColor="#999"
                />

                {/* 2. Category selection pill chips */}
                <Text style={styles.formLabel}>Category</Text>
                <View style={styles.pillChipGrid}>
                  {CATEGORIES.map((cat) => {
                    const isSelected = formData.category === cat;
                    const catColors = CATEGORY_COLORS[cat];
                    return (
                      <TouchableOpacity
                        key={cat}
                        style={[
                          styles.pillChip,
                          isSelected && {
                            backgroundColor: catColors.fill,
                            borderColor: catColors.border,
                          },
                        ]}
                        onPress={() => setFormData({ ...formData, category: cat })}
                      >
                        <Text
                          style={[
                            styles.pillChipText,
                            isSelected && { color: catColors.text, fontWeight: "bold" },
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
                    const colorTokens = PRIORITY_COLORS[prio as "High" | "Medium" | "Low"];
                    return (
                      <TouchableOpacity
                        key={prio}
                        style={[
                          styles.priorityButton,
                          isSelected && {
                            backgroundColor: colorTokens.tint,
                            borderColor: colorTokens.dot,
                          },
                        ]}
                        onPress={() => setFormData({ ...formData, priority: prio as any })}
                      >
                        <View style={[styles.prioBtnDot, { backgroundColor: colorTokens.dot }]} />
                        <Text
                          style={[
                            styles.priorityButtonText,
                            isSelected && { color: colorTokens.dot, fontWeight: "bold" },
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
                    thumbColor={formData.isShared ? "#639922" : "#F3F4F6"}
                  />
                </View>

                {/* Bottom Add button */}
                <TouchableOpacity
                  style={styles.fullSubmitNavyButton}
                  onPress={handleSingleSubmit}
                >
                  <Text style={styles.fullSubmitNavyButtonText}>
                    {editingItem ? "Update Item Details" : "Add to list"}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* ----------------------------------------------------
                SCREEN 3: BULK ADD MODE
                ---------------------------------------------------- */}
            {addMode === "bulk" && (
              <View style={styles.formContainer}>
                <Text style={styles.formLabel}>Enter Items List</Text>
                <TextInput
                  style={styles.bulkTextarea}
                  value={bulkItemsText}
                  onChangeText={handleBulkTextChange}
                  placeholder="Type items separated by comma, 'and', or new line.&#10;e.g. Bread, Soap and Apples"
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={8}
                  textAlignVertical="top"
                />

                {/* Live parsed preview stack */}
                {parsedBulkPreview.length > 0 && (
                  <View style={styles.previewContainer}>
                    <Text style={styles.previewHeading}>
                      {parsedBulkPreview.length} items detected — categories auto-assigned below.
                    </Text>
                    <View style={styles.previewListScroll}>
                      {parsedBulkPreview.map((item, idx) => {
                        const colors = CATEGORY_COLORS[item.category];
                        return (
                          <View key={idx} style={styles.previewRow}>
                            <View style={styles.previewRowLeft}>
                              <Text style={styles.previewRowEmoji}>
                                {getCategoryIcon(item.category)}
                              </Text>
                              <Text style={styles.previewRowName}>{item.name}</Text>
                            </View>
                            <View style={[styles.previewCategoryPill, { backgroundColor: colors.fill }]}>
                              <Text style={[styles.previewCategoryPillText, { color: colors.text }]}>
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
                    styles.fullSubmitNavyButton,
                    parsedBulkPreview.length === 0 && { opacity: 0.5 },
                  ]}
                  disabled={parsedBulkPreview.length === 0}
                  onPress={handleBulkSubmit}
                >
                  <Text style={styles.fullSubmitNavyButtonText}>
                    Add {parsedBulkPreview.length} items
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        )}

        {/* ========================================================
            SCREEN 4: TEMPLATES SCREEN
            ======================================================== */}
        {activeScreen === "templates" && (
          <View style={styles.templatesScreenContainer}>
            {templates.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>📋</Text>
                <Text style={styles.emptyText}>No templates saved</Text>
                <Text style={styles.emptySubtext}>
                  Save active unbought lists below to populate reusable checklists.
                </Text>
              </View>
            ) : (
              <FlatList
                data={templates}
                keyExtractor={(item, index) => index.toString()}
                contentContainerStyle={styles.templatesListContent}
                renderItem={({ item, index }) => (
                  <View style={styles.templateCard}>
                    {/* Left: colored icon box */}
                    <View style={[styles.templateIconBox, { backgroundColor: "#E6F4F2" }]}>
                      <Text style={{ color: "#0D9488", fontSize: 18 }}>📋</Text>
                    </View>

                    {/* Middle Info */}
                    <View style={styles.templateDetails}>
                      <Text style={styles.templateTitleText}>{item.name}</Text>
                      <Text style={styles.templateSubText}>
                        {item.items.length} items • Saved {item.saveDate}
                      </Text>
                    </View>

                    {/* Right action row */}
                    <View style={styles.templateActionsRow}>
                      <TouchableOpacity
                        style={styles.templateLoadButton}
                        onPress={() => handleLoadTemplate(item)}
                      >
                        <Text style={styles.templateLoadButtonText}>Load</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.templateDeleteButtonPill}
                        onPress={() => handleDeleteTemplate(index)}
                      >
                        <Text style={{ fontSize: 14 }}>🗑️</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              />
            )}

            {/* Bottom template save trigger */}
            <View style={styles.templatesFooter}>
              <TouchableOpacity
                style={styles.fullSubmitNavyButton}
                onPress={handleSaveAsTemplate}
              >
                <Text style={styles.fullSubmitNavyButtonText}>Save current list as template</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
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

      {/* Save Template Overlay Mini Modal */}
      <Modal visible={showSaveTemplateModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalHeadingText}>💾 Save Current Checklist</Text>
            <Text style={styles.modalDescText}>
              All active unbought shopping items will be captured into a new template configuration.
            </Text>

            <Text style={styles.formLabel}>Template Name</Text>
            <TextInput
              style={styles.formTextInput}
              value={newTemplateName}
              onChangeText={setNewTemplateName}
              placeholder="e.g. Weekly Groceries, Monthly Restocks"
              placeholderTextColor="#999"
            />

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={[styles.outlineFooterButton, { flex: 1 }]}
                onPress={() => setShowSaveTemplateModal(false)}
              >
                <Text style={styles.outlineFooterButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalNavySaveButton, { flex: 1 }]}
                onPress={saveTemplate}
              >
                <Text style={styles.modalNavySaveButtonText}>Save Template</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  appContainer: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  // Solid Header Layout
  screenHeader: {
    backgroundColor: COLOR_NAVY,
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
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
    fontWeight: "bold",
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitleText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  headerSubtitleText: {
    color: "#A5B4FC",
    fontSize: 12,
    marginTop: 2,
  },

  // Stat chips at top
  statsContainer: {
    flexDirection: "row",
    padding: 16,
    gap: 12,
  },
  statChip: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderWidth: 0.5,
    borderColor: COLOR_BORDER,
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  statIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  statChipInfo: {
    marginLeft: 10,
  },
  statChipCount: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1F2937",
  },
  statChipLabel: {
    fontSize: 10,
    color: "#6B7280",
    marginTop: 1,
  },

  // Filter tabs bar
  filterTabsRow: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 0.5,
    borderBottomColor: COLOR_BORDER,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  filterTabButton: {
    flex: 1,
    paddingVertical: 6,
    marginHorizontal: 3,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  filterTabButtonActive: {
    backgroundColor: COLOR_NAVY,
  },
  filterTabButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4B5563",
  },
  filterTabButtonTextActive: {
    color: "#FFFFFF",
  },

  // Stacks / Scrolling
  listScrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  categoryStack: {
    marginBottom: 20,
  },
  categoryStackLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#6B7280",
    letterSpacing: 1.2,
    marginBottom: 8,
    marginLeft: 4,
  },

  // standard item card row
  itemCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 0.5,
    borderColor: COLOR_BORDER,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  itemCardBought: {
    backgroundColor: "#F9FAFB",
    borderColor: "#E5E7EB",
    opacity: 0.7,
  },
  nestedFolderItem: {
    marginLeft: 15,
    borderLeftWidth: 3,
    borderLeftColor: "#E5E7EB",
  },

  // left circular checkbox
  circularCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: COLOR_NAVY,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  circularCheckboxChecked: {
    borderColor: "#639922",
    backgroundColor: "#639922",
  },
  circularCheckboxInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FFFFFF",
  },

  // category icon block
  categorySquare: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  categorySquareEmoji: {
    fontSize: 16,
  },

  // Main Card Text details
  itemCardMainInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 13,
    fontWeight: "500",
    color: "#1F2937",
    marginBottom: 2,
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
  },
  sharedBadge: {
    backgroundColor: "#EFF5E9",
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  sharedBadgeText: {
    fontSize: 9,
    fontWeight: "600",
    color: "#639922",
  },

  // Action icons container inside cards
  cardActionsContainer: {
    flexDirection: "row",
    marginRight: 10,
    gap: 8,
  },
  cardActionIcon: {
    padding: 4,
  },
  actionIconEmoji: {
    fontSize: 13,
  },

  // priority right dot
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 6,
  },

  // expandable folder items cards
  folderCardContainer: {
    marginBottom: 8,
  },
  folderHeader: {
    backgroundColor: "#FFFFFF",
    borderWidth: 0.5,
    borderColor: COLOR_BORDER,
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
    fontSize: 22,
  },
  folderName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1F2937",
  },
  folderSubtitle: {
    fontSize: 10,
    color: "#9CA3AF",
    marginTop: 1,
  },
  folderHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  itemCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  itemCountBadgeText: {
    fontSize: 10,
    fontWeight: "bold",
  },
  chevronIcon: {
    fontSize: 10,
    color: "#6B7280",
    marginRight: 2,
  },
  folderItemsContainer: {
    marginTop: 4,
    paddingLeft: 4,
  },

  // Footer navigation outline row
  footerOutlineRow: {
    flexDirection: "row",
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 0.5,
    borderTopColor: COLOR_BORDER,
    gap: 12,
  },
  outlineFooterButton: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: COLOR_NAVY,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  outlineFooterButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: COLOR_NAVY,
  },

  // ========================================================
  // ADD SCREENS LAYOUT
  // ========================================================
  addScreenScroll: {
    paddingBottom: 40,
  },
  switcherContainer: {
    flexDirection: "row",
    backgroundColor: "#E5E7EB",
    borderRadius: 10,
    margin: 16,
    padding: 4,
  },
  switcherTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  switcherTabActive: {
    backgroundColor: "#FFFFFF",
  },
  switcherTabText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },
  switcherTabTextActive: {
    color: COLOR_NAVY,
    fontWeight: "bold",
  },

  // Form Fields Single mode
  formContainer: {
    paddingHorizontal: 16,
  },
  formLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#4B5563",
    letterSpacing: 1.1,
    marginBottom: 8,
    marginTop: 14,
  },
  formTextInput: {
    backgroundColor: "#FFFFFF",
    borderWidth: 0.5,
    borderColor: COLOR_BORDER,
    borderRadius: 10,
    padding: 14,
    fontSize: 13,
    color: "#1F2937",
  },

  // Pill Chips
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
  },

  // Type selection grid
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
    paddingVertical: 12,
    alignItems: "center",
  },
  typeButtonActive: {
    backgroundColor: COLOR_NAVY,
    borderColor: COLOR_NAVY,
  },
  typeButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4B5563",
  },
  typeButtonTextActive: {
    color: "#FFFFFF",
    fontWeight: "bold",
  },

  // Priority selection row
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
    paddingVertical: 12,
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
    fontWeight: "600",
  },

  // Date picker target
  datePickerContainer: {
    width: "100%",
  },
  datePickerField: {
    backgroundColor: "#FFFFFF",
    borderWidth: 0.5,
    borderColor: COLOR_BORDER,
    borderRadius: 10,
    padding: 14,
  },
  dateText: {
    fontSize: 13,
    color: "#1F2937",
    fontWeight: "500",
  },
  placeholderDateText: {
    fontSize: 13,
    color: "#9CA3AF",
  },

  // Share Switch toggle row
  shareToggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 0.5,
    borderColor: COLOR_BORDER,
    borderRadius: 12,
    padding: 14,
    marginTop: 20,
    marginBottom: 24,
  },
  shareToggleTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1F2937",
  },
  shareToggleSubtitle: {
    fontSize: 10,
    color: "#9CA3AF",
    marginTop: 2,
  },

  // Navy submission buttons
  fullSubmitNavyButton: {
    backgroundColor: COLOR_NAVY,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    marginBottom: 20,
  },
  fullSubmitNavyButtonText: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "bold",
  },

  // Bulk Text Area
  bulkTextarea: {
    backgroundColor: "#FFFFFF",
    borderWidth: 0.5,
    borderColor: COLOR_BORDER,
    borderRadius: 12,
    padding: 16,
    fontSize: 13,
    color: "#1F2937",
    minHeight: 180,
    marginBottom: 16,
  },

  // Preview blocks
  previewContainer: {
    marginBottom: 20,
  },
  previewHeading: {
    fontSize: 11,
    fontWeight: "700",
    color: "#D97706",
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  previewListScroll: {
    maxHeight: 220,
    borderWidth: 0.5,
    borderColor: COLOR_BORDER,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    padding: 10,
  },
  previewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
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
  },
  previewCategoryPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  previewCategoryPillText: {
    fontSize: 10,
    fontWeight: "600",
  },

  // ========================================================
  // TEMPLATES SCREEN LAYOUT
  // ========================================================
  templatesScreenContainer: {
    flex: 1,
  },
  templatesListContent: {
    padding: 16,
  },
  templateCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 0.5,
    borderColor: COLOR_BORDER,
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  templateIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  templateDetails: {
    flex: 1,
  },
  templateTitleText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1F2937",
  },
  templateSubText: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 2,
  },
  templateActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  templateLoadButton: {
    borderWidth: 1.5,
    borderColor: COLOR_NAVY,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  templateLoadButtonText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLOR_NAVY,
  },
  templateDeleteButtonPill: {
    padding: 6,
  },
  templatesFooter: {
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 0.5,
    borderTopColor: COLOR_BORDER,
  },

  // Mini overlays modals
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(26, 31, 54, 0.4)", // matches dark navy opacity
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: COLOR_BORDER,
    padding: 20,
    width: "100%",
    maxWidth: 380,
  },
  modalHeadingText: {
    fontSize: 15,
    fontWeight: "700",
    color: COLOR_NAVY,
    marginBottom: 6,
  },
  modalDescText: {
    fontSize: 11,
    color: "#6B7280",
    lineHeight: 16,
    marginBottom: 16,
  },
  modalActionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },
  modalNavySaveButton: {
    backgroundColor: COLOR_NAVY,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modalNavySaveButtonText: {
    fontSize: 13,
    color: "#FFFFFF",
    fontWeight: "700",
  },

  // History views
  historyTimeContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  historyTimeText: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
    paddingHorizontal: 20,
  },
  emptyIcon: {
    fontSize: 54,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 12,
    color: "#9CA3AF",
    textAlign: "center",
  },
});
