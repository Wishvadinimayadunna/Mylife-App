// Utility Module Placeholder
import { Stack } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function UtilityScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Utility', headerShown: true }} />
      <View style={styles.container}>
        <Text style={styles.icon}>💡</Text>
        <Text style={styles.title}>Utility Module</Text>
        <Text style={styles.subtitle}>Coming Soon</Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
  },
  icon: { fontSize: 80, marginBottom: 20 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1F2937', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#60A5FA', fontWeight: '600' },
});
