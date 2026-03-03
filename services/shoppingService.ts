// ============================================
// Shopping Service - API Integration
// Handles shopping item data with backend API
// ============================================

import { ShoppingItem } from "@/types";
import api from "@/utils/api";

class ShoppingService {
  // ============================================
  // GET ALL SHOPPING ITEMS
  // ============================================
  async getShoppingItems(profileID: string): Promise<ShoppingItem[]> {
    try {
      // Backend uses userId from auth token, not profileID in query
      const response = await api.get("/shopping");
      // Map MongoDB _id to id and ensure it's a string
      return response.data.map((item: any) => ({
        ...item,
        id: String(item._id || item.id),
        _id: undefined, // Remove _id to avoid confusion
      }));
    } catch (error: any) {
      console.error("Error getting shopping items:", error);
      console.error("Error details:", error.response?.data);
      return [];
    }
  }

  // ============================================
  // ADD MONTHLY ESSENTIAL (from class diagram)
  // ============================================
  async addMonthlyEssential(
    itemData: Omit<
      ShoppingItem,
      "id" | "createdAt" | "updatedAt" | "type" | "isBought"
    >,
  ): Promise<ShoppingItem> {
    try {
      const newItem = {
        ...itemData,
        type: "monthly",
        isBought: false,
      };

      const response = await api.post("/shopping", newItem);
      return response.data;
    } catch (error: any) {
      console.error("Error adding monthly essential:", error);
      const message =
        error.response?.data?.message || "Failed to add monthly essential";
      throw new Error(message);
    }
  }

  // ============================================
  // ADD SHOPPING ITEM (General)
  // ============================================
  async addShoppingItem(
    itemData: Omit<ShoppingItem, "id" | "createdAt" | "updatedAt" | "isBought">,
  ): Promise<ShoppingItem> {
    try {
      // Remove profileID as backend uses userId from auth token
      const { profileID, ...dataToSend } = itemData as any;

      const newItem = {
        ...dataToSend,
        isBought: false,
      };

      const response = await api.post("/shopping", newItem);
      const item = response.data;
      // Map MongoDB _id to id and ensure it's a string
      return {
        ...item,
        id: String(item._id || item.id),
        _id: undefined, // Remove _id to avoid confusion
      };
    } catch (error: any) {
      console.error("Error adding shopping item:", error);
      console.error("Error details:", error.response?.data);
      const message =
        error.response?.data?.message ||
        error.response?.data?.error ||
        "Failed to add shopping item";
      throw new Error(message);
    }
  }

  // ============================================
  // EDIT SHOPPING ITEM
  // ============================================
  async editShoppingItem(
    itemId: string,
    updates: Partial<ShoppingItem>,
  ): Promise<ShoppingItem | null> {
    try {
      const response = await api.put(`/shopping/${itemId}`, updates);
      return response.data;
    } catch (error: any) {
      console.error("Error editing shopping item:", error);
      const message =
        error.response?.data?.message || "Failed to update shopping item";
      throw new Error(message);
    }
  }

  // ============================================
  // DELETE SHOPPING ITEM
  // ============================================
  async deleteShoppingItem(itemId: string): Promise<boolean> {
    try {
      await api.delete(`/shopping/${itemId}`);
      return true;
    } catch (error: any) {
      console.error("Error deleting shopping item:", error);
      console.error("Error details:", error.response?.data);
      return false;
    }
  }

  // ============================================
  // MARK ITEM AS BOUGHT (from class diagram)
  // ============================================
  async markItemAsBought(itemId: string, isBought: boolean): Promise<boolean> {
    try {
      await api.put(`/shopping/${itemId}`, {
        isBought,
        boughtAt: isBought ? new Date() : undefined,
      });
      return true;
    } catch (error: any) {
      console.error("Error marking item as bought:", error);
      return false;
    }
  }

  // ============================================
  // VIEW HISTORY (from class diagram)
  // ============================================
  async viewHistory(profileID: string): Promise<ShoppingItem[]> {
    try {
      const items = await this.getShoppingItems(profileID);

      // Return bought items, sorted by boughtAt date
      return items
        .filter((item) => item.isBought)
        .sort((a, b) => {
          if (!a.boughtAt || !b.boughtAt) return 0;
          return (
            new Date(b.boughtAt).getTime() - new Date(a.boughtAt).getTime()
          );
        });
    } catch (error) {
      console.error("Error getting shopping history:", error);
      return [];
    }
  }

  // ============================================
  // SHARE SHOPPING LIST (from class diagram)
  // ============================================
  async shareShoppingList(
    itemId: string,
    shareWithFamily: boolean,
  ): Promise<boolean> {
    try {
      await api.put(`/shopping/${itemId}`, {
        isShared: shareWithFamily,
      });
      return true;
    } catch (error) {
      console.error("Error sharing shopping list:", error);
      return false;
    }
  }

  // ============================================
  // GET MONTHLY ITEMS
  // ============================================
  async getMonthlyItems(profileID: string): Promise<ShoppingItem[]> {
    try {
      const items = await this.getShoppingItems(profileID);
      return items.filter((item) => item.type === "monthly");
    } catch (error) {
      console.error("Error getting monthly items:", error);
      return [];
    }
  }

  // ============================================
  // GET URGENT ITEMS
  // ============================================
  async getUrgentItems(profileID: string): Promise<ShoppingItem[]> {
    try {
      const items = await this.getShoppingItems(profileID);
      return items.filter((item) => item.type === "urgent");
    } catch (error) {
      console.error("Error getting urgent items:", error);
      return [];
    }
  }

  // ============================================
  // GET PENDING ITEMS (Not Bought)
  // ============================================
  async getPendingItems(profileID: string): Promise<ShoppingItem[]> {
    try {
      const items = await this.getShoppingItems(profileID);
      return items.filter((item) => !item.isBought);
    } catch (error) {
      console.error("Error getting pending items:", error);
      return [];
    }
  }
}

export default new ShoppingService();
