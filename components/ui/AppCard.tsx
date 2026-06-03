import React from "react";
import { StyleProp, StyleSheet, TouchableOpacity, View, ViewStyle } from "react-native";

interface AppCardProps {
  children: React.ReactNode;
  stripeColor?: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function AppCard({ children, stripeColor, onPress, style }: AppCardProps) {
  const Container = onPress ? TouchableOpacity : View;
  const containerProps = onPress ? { onPress, activeOpacity: 0.75 } : {};

  return (
    <Container {...containerProps} style={[styles.card, style]}>
      {stripeColor ? <View style={[styles.stripe, { backgroundColor: stripeColor }]} /> : null}
      <View style={styles.content}>{children}</View>
    </Container>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    flexDirection: "row",
    overflow: "hidden",
    borderWidth: 0.5,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    marginBottom: 8,
  },
  stripe: {
    width: 5,
    height: "100%",
  },
  content: {
    flex: 1,
    padding: 12,
  },
});
