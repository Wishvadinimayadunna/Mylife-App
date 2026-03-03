// ============================================
// Shopping Module - Shopping List Management
// Add, edit, mark items as bought, share with family
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
import { Stack } from "expo-router";
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

const CATEGORIES: ShoppingCategory[] = [
  "Groceries",
  "Household",
  "Medicine",
  "Miscellaneous",
];
const PRIORITIES: ShoppingPriority[] = ["High", "Medium", "Low"];
const TYPES: ShoppingItemType[] = ["urgent", "monthly"];

export default function ShoppingScreen() {
  const { profile } = useAppStore();
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<ShoppingItem | null>(null);
  const [filterType, setFilterType] = useState<
    "all" | "urgent" | "monthly" | "bought"
  >("all");
  const [showDueDateCalendar, setShowDueDateCalendar] = useState(false);

  // Bulk Add feature
  const [showBulkAddModal, setShowBulkAddModal] = useState(false);
  const [bulkItemsText, setBulkItemsText] = useState("");
  const [bulkAddedGroup, setBulkAddedGroup] = useState<string | null>(null);

  // Templates feature
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [templates, setTemplates] = useState<
    { name: string; items: string[] }[]
  >([]);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    category: "Groceries" as ShoppingCategory,
    type: "urgent" as ShoppingItemType,
    priority: "Medium" as ShoppingPriority,
    dueDate: "",
    reminderTime: "",
    isShared: false,
  });

  useEffect(() => {
    loadShoppingItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  const loadShoppingItems = async () => {
    if (!profile) return;
    const data = await shoppingService.getShoppingItems(profile.id);
    setItems(data);
  };

  // Auto-categorize based on item name
  const autoCategorizeItem = (itemName: string): ShoppingCategory => {
    const name = itemName.toLowerCase();

    // Groceries keywords
    if (
      name.match(
        /milk|bread|egg|butter|cheese|meat|chicken|fish|vegetable|fruit|rice|flour|sugar|salt|oil|pasta|cereal/i,
      )
    ) {
      return "Groceries";
    }

    // Medicine keywords
    if (
      name.match(
        /medicine|tablet|pill|syrup|aspirin|paracetamol|antibiotic|vitamin|bandage|cream|ointment/i,
      )
    ) {
      return "Medicine";
    }

    // Household keywords
    if (
      name.match(
        /soap|shampoo|detergent|cleaner|tissue|towel|broom|mop|bulb|battery|brush/i,
      )
    ) {
      return "Household";
    }

    return "Miscellaneous";
  };

  // Process bulk items from text
  const processBulkItems = async (text: string) => {
    if (!profile) return;

    // Split by comma, "and", or new lines
    const itemNames = text
      .split(/[,\n]|\sand\s/i)
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

    if (itemNames.length === 0) {
      Alert.alert("Error", "No items found");
      return;
    }

    try {
      // Create a unique group ID for this bulk add
      const groupId = `bulk_${Date.now()}`;
      setBulkAddedGroup(groupId);

      // Add all items with the same groupId
      for (const itemName of itemNames) {
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

      Alert.alert("Success", `Added ${itemNames.length} items in one group!`);
      loadShoppingItems();
    } catch (error) {
      console.error("Bulk add error:", error);
      Alert.alert("Error", "Failed to add some items");
    }
  };

  // Bulk Add Modal Handler
  const handleBulkAdd = () => {
    setShowBulkAddModal(true);
    setBulkItemsText("");
  };

  const handleBulkAddSave = async () => {
    if (!bulkItemsText.trim()) {
      Alert.alert("Error", "Please enter at least one item");
      return;
    }

    await processBulkItems(bulkItemsText);
    setShowBulkAddModal(false);
    setBulkItemsText("");
  };

  const openEditModal = (item: ShoppingItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      category: item.category,
      type: item.type,
      priority: item.priority || "Medium",
      dueDate: item.dueDate ? formatDateToInput(item.dueDate) : "",
      reminderTime: item.reminderTime || "",
      isShared: item.isShared,
    });
    setIsModalVisible(true);
  };

  const handleSave = async () => {
    if (!profile) return;

    if (!formData.name) {
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
          reminderTime: formData.reminderTime || undefined,
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
          reminderTime: formData.reminderTime || undefined,
          isShared: formData.isShared,
        });
        Alert.alert("Success", "Item added successfully!");
      }

      setIsModalVisible(false);
      loadShoppingItems();
    } catch {
      Alert.alert("Error", "Failed to save item");
    }
  };

  const handleDelete = async (itemId: string) => {
    Alert.alert("Delete Item", "Are you sure you want to delete this item?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const success = await shoppingService.deleteShoppingItem(itemId);
            if (success) {
              Alert.alert("Success", "Item deleted");
              loadShoppingItems();
            } else {
              Alert.alert("Error", "Failed to delete item");
            }
          } catch (error) {
            console.error("Delete error:", error);
            Alert.alert("Error", "Failed to delete item");
          }
        },
      },
    ]);
  };

  const handleToggleBought = async (itemId: string, currentStatus: boolean) => {
    await shoppingService.markItemAsBought(itemId, !currentStatus);
    loadShoppingItems();
  };

  const handleToggleShare = async (itemId: string, currentStatus: boolean) => {
    await shoppingService.shareShoppingList(itemId, !currentStatus);
    loadShoppingItems();
  };

  // Template Management
  const handleSaveAsTemplate = () => {
    const activeItems = items.filter((item) => !item.isBought);
    if (activeItems.length === 0) {
      Alert.alert("Error", "No active items to save as template");
      return;
    }
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
    };

    setTemplates([...templates, newTemplate]);
    setShowSaveTemplateModal(false);
    setNewTemplateName("");
    Alert.alert("Success", `Template "${newTemplateName}" saved!`);
  };

  const loadTemplate = async (template: { name: string; items: string[] }) => {
    if (!profile) return;

    try {
      for (const itemName of template.items) {
        await shoppingService.addShoppingItem({
          profileID: profile.id,
          name: itemName,
          category: autoCategorizeItem(itemName),
          type: "urgent",
          priority: "Medium",
          isShared: false,
        });
      }

      setShowTemplatesModal(false);
      Alert.alert(
        "Success",
        `Loaded ${template.items.length} items from "${template.name}"`,
      );
      loadShoppingItems();
    } catch (err) {
      console.error("Load template error:", err);
      Alert.alert("Error", "Failed to load template");
    }
  };

  const deleteTemplate = (index: number) => {
    Alert.alert("Delete Template", `Delete "${templates[index].name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          const newTemplates = templates.filter((_, i) => i !== index);
          setTemplates(newTemplates);
        },
      },
    ]);
  };

  const formatDateToInput = (date: Date): string => {
    const d = new Date(date);
    return d.toISOString().split("T")[0];
  };

  const formatDate = (date: Date | undefined) => {
    if (!date) return "";
    const d = new Date(date);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Group items by groupId
  const groupItemsByGroupId = (items: ShoppingItem[]) => {
    const grouped: { [key: string]: ShoppingItem[] } = {};
    const ungrouped: ShoppingItem[] = [];

    items.forEach((item) => {
      if (item.groupId) {
        if (!grouped[item.groupId]) {
          grouped[item.groupId] = [];
        }
        grouped[item.groupId].push(item);
      } else {
        ungrouped.push(item);
      }
    });

    return { grouped, ungrouped };
  };

  const getFilteredItems = () => {
    switch (filterType) {
      case "urgent":
        return items.filter((item) => item.type === "urgent" && !item.isBought);
      case "monthly":
        return items.filter(
          (item) => item.type === "monthly" && !item.isBought,
        );
      case "bought":
        return items.filter((item) => item.isBought);
      default:
        return items;
    }
  };

  const getPriorityColor = (priority?: ShoppingPriority) => {
    switch (priority) {
      case "High":
        return "#EF4444";
      case "Medium":
        return "#F59E0B";
      case "Low":
        return "#10B981";
      default:
        return "#6B7280";
    }
  };

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

  const renderItem = ({ item }: { item: ShoppingItem }) => (
    <View style={[styles.itemCard, item.isBought && styles.itemBought]}>
      <View style={styles.itemHeader}>
        <TouchableOpacity
          style={styles.checkbox}
          onPress={() => handleToggleBought(item.id, item.isBought)}
        >
          {item.isBought && <View style={styles.checkboxChecked} />}
        </TouchableOpacity>
        <View style={styles.itemInfo}>
          <Text
            style={[styles.itemName, item.isBought && styles.itemNameBought]}
          >
            {getCategoryIcon(item.category)} {item.name}
          </Text>
          <View style={styles.itemTags}>
            <View
              style={[
                styles.tag,
                { backgroundColor: getPriorityColor(item.priority) },
              ]}
            >
              <Text style={styles.tagText}>{item.priority}</Text>
            </View>
            <View style={[styles.tag, styles.typeTag]}>
              <Text style={styles.tagText}>{item.type}</Text>
            </View>
            {item.isShared && (
              <View style={[styles.tag, styles.sharedTag]}>
                <Text style={styles.tagText}>👨‍👩‍👧 Shared</Text>
              </View>
            )}
          </View>
          {item.dueDate && (
            <Text style={styles.dueDate}>Due: {formatDate(item.dueDate)}</Text>
          )}
          {item.boughtAt && (
            <Text style={styles.boughtDate}>
              Bought: {formatDate(item.boughtAt)}
            </Text>
          )}
        </View>
      </View>
      <View style={styles.itemActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleToggleShare(item.id, item.isShared)}
        >
          <Text style={styles.actionButtonText}>
            {item.isShared ? "🔗" : "🔓"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => openEditModal(item)}
        >
          <Text style={styles.actionButtonText}>✏️</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleDelete(item.id)}
        >
          <Text style={styles.actionButtonText}>🗑️</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Render a grouped card showing multiple items from bulk add
  const renderGroupedCard = (groupId: string, groupItems: ShoppingItem[]) => {
    const allBought = groupItems.every((item) => item.isBought);
    const anyShared = groupItems.some((item) => item.isShared);

    return (
      <View
        style={[styles.groupedCard, allBought && styles.itemBought]}
        key={groupId}
      >
        <View style={styles.groupedHeader}>
          <Text style={styles.groupedTitle}>
            📦 Bulk Items ({groupItems.length})
          </Text>
          {anyShared && (
            <View style={[styles.tag, styles.sharedTag]}>
              <Text style={styles.tagText}>👨‍👩‍👧 Shared</Text>
            </View>
          )}
        </View>

        {groupItems.map((item) => (
          <View key={item.id} style={styles.groupedItem}>
            <View style={styles.groupedItemHeader}>
              <TouchableOpacity
                style={styles.checkbox}
                onPress={() => handleToggleBought(item.id, item.isBought)}
              >
                {item.isBought && <View style={styles.checkboxChecked} />}
              </TouchableOpacity>
              <View style={styles.groupedItemInfo}>
                <Text
                  style={[
                    styles.groupedItemName,
                    item.isBought && styles.itemNameBought,
                  ]}
                >
                  {getCategoryIcon(item.category)} {item.name}
                </Text>
                <View style={styles.itemTags}>
                  <View
                    style={[
                      styles.tag,
                      { backgroundColor: getPriorityColor(item.priority) },
                    ]}
                  >
                    <Text style={styles.tagText}>{item.priority}</Text>
                  </View>
                  <View style={[styles.tag, styles.typeTag]}>
                    <Text style={styles.tagText}>{item.type}</Text>
                  </View>
                </View>
                {item.dueDate && (
                  <Text style={styles.dueDate}>
                    Due: {formatDate(item.dueDate)}
                  </Text>
                )}
              </View>
            </View>
            <View style={styles.groupedItemActions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleToggleShare(item.id, item.isShared)}
              >
                <Text style={styles.actionButtonText}>
                  {item.isShared ? "🔗" : "🔓"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => openEditModal(item)}
              >
                <Text style={styles.actionButtonText}>✏️</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleDelete(item.id)}
              >
                <Text style={styles.actionButtonText}>🗑️</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
    );
  };

  return (
    <>
      <Stack.Screen options={{ title: "Shopping List", headerShown: true }} />
      <View style={styles.container}>
        {/* Filter Tabs */}
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[
              styles.filterTab,
              filterType === "all" && styles.filterTabActive,
            ]}
            onPress={() => setFilterType("all")}
          >
            <Text
              style={[
                styles.filterText,
                filterType === "all" && styles.filterTextActive,
              ]}
            >
              All ({items.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterTab,
              filterType === "urgent" && styles.filterTabActive,
            ]}
            onPress={() => setFilterType("urgent")}
          >
            <Text
              style={[
                styles.filterText,
                filterType === "urgent" && styles.filterTextActive,
              ]}
            >
              Urgent
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterTab,
              filterType === "monthly" && styles.filterTabActive,
            ]}
            onPress={() => setFilterType("monthly")}
          >
            <Text
              style={[
                styles.filterText,
                filterType === "monthly" && styles.filterTextActive,
              ]}
            >
              Monthly
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterTab,
              filterType === "bought" && styles.filterTabActive,
            ]}
            onPress={() => setFilterType("bought")}
          >
            <Text
              style={[
                styles.filterText,
                filterType === "bought" && styles.filterTextActive,
              ]}
            >
              History
            </Text>
          </TouchableOpacity>
        </View>

        {/* Items List */}
        <FlatList
          data={(() => {
            const filtered = getFilteredItems();
            const { grouped, ungrouped } = groupItemsByGroupId(filtered);

            // Create a mixed array with group markers and individual items
            const mixedData: any[] = [];

            // Add grouped items first
            Object.keys(grouped).forEach((groupId) => {
              mixedData.push({
                type: "group",
                groupId,
                items: grouped[groupId],
              });
            });

            // Add ungrouped items
            ungrouped.forEach((item) => {
              mixedData.push({
                type: "item",
                item,
              });
            });

            return mixedData;
          })()}
          renderItem={({ item: dataItem }) => {
            if (dataItem.type === "group") {
              return renderGroupedCard(dataItem.groupId, dataItem.items);
            } else {
              return renderItem({ item: dataItem.item });
            }
          }}
          keyExtractor={(dataItem, index) => {
            if (dataItem.type === "group") {
              return `group-${dataItem.groupId}`;
            } else {
              return `item-${dataItem.item.id}`;
            }
          }}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🛒</Text>
              <Text style={styles.emptyText}>No items yet</Text>
              <Text style={styles.emptySubtext}>
                Use the buttons below to add items
              </Text>
            </View>
          }
        />

        {/* Main Action Buttons */}
        <View style={styles.mainActionsContainer}>
          <View style={styles.mainActionsRow}>
            <TouchableOpacity
              style={styles.mainActionButton}
              onPress={handleBulkAdd}
            >
              <Text style={styles.mainActionIcon}>📝</Text>
              <Text style={styles.mainActionTitle}>Bulk Add</Text>
              <Text style={styles.mainActionSubtitle}>Type multiple</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.mainActionButton}
              onPress={() => setShowTemplatesModal(true)}
            >
              <Text style={styles.mainActionIcon}>📋</Text>
              <Text style={styles.mainActionTitle}>Templates</Text>
              <Text style={styles.mainActionSubtitle}>Load saved lists</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.mainActionsRow}>
            <TouchableOpacity
              style={styles.mainActionButton}
              onPress={handleSaveAsTemplate}
            >
              <Text style={styles.mainActionIcon}>💾</Text>
              <Text style={styles.mainActionTitle}>Save List</Text>
              <Text style={styles.mainActionSubtitle}>As template</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.mainActionButton}
              onPress={() => setIsModalVisible(true)}
            >
              <Text style={styles.mainActionIcon}>➕</Text>
              <Text style={styles.mainActionTitle}>Add Single</Text>
              <Text style={styles.mainActionSubtitle}>One item</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Add/Edit Modal */}
        <Modal visible={isModalVisible} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.modalTitle}>
                  {editingItem ? "Edit Item" : "Add Shopping Item"}
                </Text>

                <Text style={styles.label}>Item Name *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.name}
                  onChangeText={(text) =>
                    setFormData({ ...formData, name: text })
                  }
                  placeholder="e.g., Milk, Bread"
                />

                <Text style={styles.label}>Category</Text>
                <View style={styles.buttonGroup}>
                  {CATEGORIES.map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.optionButton,
                        formData.category === cat && styles.optionButtonActive,
                      ]}
                      onPress={() =>
                        setFormData({ ...formData, category: cat })
                      }
                    >
                      <Text
                        style={[
                          styles.optionText,
                          formData.category === cat && styles.optionTextActive,
                        ]}
                      >
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.label}>Type</Text>
                <View style={styles.buttonGroup}>
                  {TYPES.map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.optionButton,
                        formData.type === type && styles.optionButtonActive,
                      ]}
                      onPress={() => setFormData({ ...formData, type })}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          formData.type === type && styles.optionTextActive,
                        ]}
                      >
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.label}>Priority</Text>
                <View style={styles.buttonGroup}>
                  {PRIORITIES.map((priority) => (
                    <TouchableOpacity
                      key={priority}
                      style={[
                        styles.optionButton,
                        formData.priority === priority &&
                          styles.optionButtonActive,
                      ]}
                      onPress={() => setFormData({ ...formData, priority })}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          formData.priority === priority &&
                            styles.optionTextActive,
                        ]}
                      >
                        {priority}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {formData.type === "urgent" && (
                  <>
                    <Text style={styles.label}>Due Date (Optional)</Text>
                    <TouchableOpacity
                      style={styles.input}
                      onPress={() => setShowDueDateCalendar(true)}
                    >
                      <Text
                        style={
                          formData.dueDate
                            ? styles.dateText
                            : styles.placeholder
                        }
                      >
                        {formData.dueDate
                          ? formatDate(new Date(formData.dueDate))
                          : "Select due date"}
                      </Text>
                    </TouchableOpacity>

                    <Text style={styles.label}>Reminder Time (Optional)</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.reminderTime}
                      onChangeText={(text) =>
                        setFormData({ ...formData, reminderTime: text })
                      }
                      placeholder="e.g., 18:00"
                    />
                  </>
                )}

                <View style={styles.switchRow}>
                  <Text style={styles.label}>Share with Family</Text>
                  <Switch
                    value={formData.isShared}
                    onValueChange={(value) =>
                      setFormData({ ...formData, isShared: value })
                    }
                  />
                </View>

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.button, styles.buttonCancel]}
                    onPress={() => setIsModalVisible(false)}
                  >
                    <Text style={styles.buttonCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.button, styles.buttonSave]}
                    onPress={handleSave}
                  >
                    <Text style={styles.buttonSaveText}>
                      {editingItem ? "Update" : "Add Item"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Due Date Calendar Modal */}
        <Calendar
          visible={showDueDateCalendar}
          onClose={() => setShowDueDateCalendar(false)}
          onSelectDate={(date: Date) => {
            setFormData({ ...formData, dueDate: formatDateToInput(date) });
            setShowDueDateCalendar(false);
          }}
          selectedDate={
            formData.dueDate ? new Date(formData.dueDate) : undefined
          }
        />
      </View>

      {/* Bulk Add Modal */}
      <Modal visible={showBulkAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📝 Bulk Add Items</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowBulkAddModal(false);
                  setBulkItemsText("");
                }}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>
              Enter multiple items, one per line or separated by commas
            </Text>

            <TextInput
              style={styles.bulkTextInput}
              value={bulkItemsText}
              onChangeText={setBulkItemsText}
              placeholder="Milk, Bread, Eggs&#10;Butter&#10;Cheese"
              placeholderTextColor="#999"
              multiline
              numberOfLines={10}
              textAlignVertical="top"
            />

            <Text style={styles.bulkHint}>
              ✨ Items will be auto-categorized based on their names
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={() => setShowBulkAddModal(false)}
              >
                <Text style={styles.modalButtonTextSecondary}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={handleBulkAddSave}
              >
                <Text style={styles.modalButtonText}>Add All Items</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Templates Modal */}
      <Modal visible={showTemplatesModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📋 Shopping Templates</Text>
              <TouchableOpacity
                onPress={() => setShowTemplatesModal(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>Load saved shopping lists</Text>

            {templates.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>
                  No templates saved yet
                </Text>
                <Text style={styles.emptyStateSubtext}>
                  Add items to your list and tap &quot;Save&quot; to create a
                  template
                </Text>
              </View>
            ) : (
              <ScrollView style={styles.templatesList}>
                {templates.map((template, index) => (
                  <View key={index} style={styles.templateItem}>
                    <TouchableOpacity
                      style={styles.templateInfo}
                      onPress={() => loadTemplate(template)}
                    >
                      <Text style={styles.templateName}>{template.name}</Text>
                      <Text style={styles.templateCount}>
                        {template.items.length} items
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.templateDeleteButton}
                      onPress={() => deleteTemplate(index)}
                    >
                      <Text style={styles.templateDeleteText}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}

            <TouchableOpacity
              style={[
                styles.modalButton,
                styles.modalButtonSecondary,
                { marginTop: 16 },
              ]}
              onPress={() => setShowTemplatesModal(false)}
            >
              <Text style={styles.modalButtonTextSecondary}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Save Template Modal */}
      <Modal visible={showSaveTemplateModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>💾 Save as Template</Text>
            <Text style={styles.modalSubtitle}>
              Save your current shopping list for quick reuse
            </Text>

            <Text style={styles.label}>Template Name</Text>
            <TextInput
              style={styles.input}
              value={newTemplateName}
              onChangeText={setNewTemplateName}
              placeholder="e.g., Weekly Groceries, Monthly Essentials"
              placeholderTextColor="#999"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={() => {
                  setShowSaveTemplateModal(false);
                  setNewTemplateName("");
                }}
              >
                <Text style={styles.modalButtonTextSecondary}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={saveTemplate}
              >
                <Text style={styles.modalButtonText}>Save Template</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },
  filterContainer: {
    flexDirection: "row",
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginHorizontal: 4,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
  },
  filterTabActive: {
    backgroundColor: "#A78BFA",
  },
  filterText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },
  filterTextActive: {
    color: "#FFFFFF",
  },
  listContainer: {
    padding: 16,
  },
  itemCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  itemBought: {
    opacity: 0.6,
    backgroundColor: "#F9FAFB",
  },
  itemHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#A78BFA",
    marginRight: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    width: 14,
    height: 14,
    borderRadius: 3,
    backgroundColor: "#A78BFA",
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 8,
  },
  itemNameBought: {
    textDecorationLine: "line-through",
    color: "#9CA3AF",
  },
  itemTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 4,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  typeTag: {
    backgroundColor: "#DBEAFE",
  },
  sharedTag: {
    backgroundColor: "#D1FAE5",
  },
  tagText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  dueDate: {
    fontSize: 12,
    color: "#EF4444",
    marginTop: 4,
  },
  boughtDate: {
    fontSize: 12,
    color: "#10B981",
    marginTop: 4,
  },
  itemActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 12,
    gap: 8,
  },
  actionButton: {
    padding: 8,
    backgroundColor: "#F3F4F6",
    borderRadius: 6,
  },
  actionButtonText: {
    fontSize: 16,
  },
  addButton: {
    position: "absolute",
    bottom: 24,
    right: 24,
    backgroundColor: "#A78BFA",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  addButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 80,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#9CA3AF",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    width: "100%",
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1F2937",
    flex: 1,
    textAlign: "center",
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    position: "absolute",
    right: 0,
    top: 0,
  },
  closeButtonText: {
    fontSize: 18,
    color: "#6B7280",
    fontWeight: "bold",
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 16,
    textAlign: "center",
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#1F2937",
  },
  placeholder: {
    color: "#9CA3AF",
    fontSize: 16,
  },
  dateText: {
    color: "#1F2937",
    fontSize: 16,
  },
  buttonGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  optionButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  optionButtonActive: {
    backgroundColor: "#A78BFA",
    borderColor: "#A78BFA",
  },
  optionText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  optionTextActive: {
    color: "#FFFFFF",
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonCancel: {
    backgroundColor: "#F3F4F6",
  },
  buttonSave: {
    backgroundColor: "#A78BFA",
  },
  buttonCancelText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6B7280",
  },
  buttonSaveText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  calendarModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  calendarModalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    width: "100%",
    maxWidth: 400,
  },
  mainActionsContainer: {
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  mainActionsRow: {
    flexDirection: "row",
    marginBottom: 12,
    gap: 12,
  },
  mainActionButton: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  mainActionIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  mainActionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 4,
  },
  mainActionSubtitle: {
    fontSize: 12,
    color: "#6B7280",
  },
  quickActionsContainer: {
    flexDirection: "row",
    padding: 12,
    paddingBottom: 8,
    backgroundColor: "#FFFFFF",
    justifyContent: "space-around",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  quickActionButton: {
    alignItems: "center",
    padding: 8,
    borderRadius: 12,
    backgroundColor: "#F9FAFB",
    minWidth: 70,
  },
  quickActionIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  quickActionText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6B7280",
  },
  bulkTextInput: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: "#1F2937",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    minHeight: 200,
    marginBottom: 12,
  },
  bulkHint: {
    fontSize: 13,
    color: "#6B7280",
    fontStyle: "italic",
    marginBottom: 16,
  },
  voiceInputContainer: {
    marginBottom: 20,
  },
  voiceInputLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 8,
  },
  voiceInputExample: {
    fontSize: 13,
    color: "#6B7280",
    fontStyle: "italic",
    marginBottom: 12,
    paddingLeft: 4,
  },
  voiceInput: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: "#1F2937",
    borderWidth: 2,
    borderColor: "#A78BFA",
    minHeight: 150,
    textAlignVertical: "top",
  },
  voiceInputHint: {
    fontSize: 12,
    color: "#8B5CF6",
    marginTop: 8,
    paddingLeft: 4,
  },
  templatesList: {
    maxHeight: 400,
  },
  templateItem: {
    flexDirection: "row",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: "center",
  },
  templateInfo: {
    flex: 1,
  },
  templateName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  templateCount: {
    fontSize: 13,
    color: "#6B7280",
  },
  templateDeleteButton: {
    padding: 8,
  },
  templateDeleteText: {
    fontSize: 20,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  modalButtonPrimary: {
    backgroundColor: "#A78BFA",
  },
  modalButtonSecondary: {
    backgroundColor: "#F3F4F6",
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  modalButtonTextSecondary: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6B7280",
  },
  emptyState: {
    padding: 40,
    alignItems: "center",
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
  },
  // Grouped card styles
  groupedCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "#A78BFA",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  groupedHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  groupedTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#A78BFA",
  },
  groupedItem: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  groupedItemHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  groupedItemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  groupedItemName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 6,
  },
  groupedItemActions: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "flex-end",
    marginTop: 4,
  },
});
