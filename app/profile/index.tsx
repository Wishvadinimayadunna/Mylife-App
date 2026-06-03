// ============================================
// Profile Screen - View & Edit Profile
// Matches UI mockup with profile information
// ============================================

import Calendar from '@/components/ui/calendar';
import { AppCard } from '@/components/ui/AppCard';
import { Colors } from '@/constants/theme';
import profileService from '@/services/profileService';
import { useAppStore } from '@/store/appStore';
import { Profile } from '@/types';
import * as ImagePicker from 'expo-image-picker';
import { Stack } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

export default function ProfileScreen() {
  const { profile, setProfile } = useAppStore();
  const [isEditing, setIsEditing] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [formData, setFormData] = useState<Partial<Profile>>({
    fullName: '',
    dateOfBirth: new Date(),
    email: '',
    phoneNumber: '',
    gender: 'Male',
    address: '',
    photoUri: undefined,
  });

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadProfile = async () => {
    const profileData = await profileService.getProfile();
    if (profileData) {
      setProfile(profileData);
      setFormData({
        ...profileData,
        dateOfBirth: new Date(profileData.dateOfBirth) // Ensure it's a Date object
      });
    } else {
      setIsEditing(true); // No profile exists, start in edit mode
    }
  };

  const handleSave = async () => {
    try {
      if (!formData.fullName || !formData.email || !formData.phoneNumber || !formData.address) {
        Alert.alert('Error', 'Please fill in all required fields (Name, Email, Phone, and Address)');
        return;
      }
      if (formData.dateOfBirth && formData.dateOfBirth > new Date()) {
        Alert.alert('Error', 'Date of birth cannot be in the future');
        return;
      }

      let savedProfile: Profile;
      if (profile) {
        savedProfile = (await profileService.editProfile(formData))!;
      } else {
        savedProfile = await profileService.addProfile(formData as any);
      }

      setProfile(savedProfile);
      setIsEditing(false);
      Alert.alert('Success', 'Profile saved successfully!');
    } catch {
      Alert.alert('Error', 'Failed to save profile');
    }
  };

  const handleImagePick = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please grant camera roll permission');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setFormData({ ...formData, photoUri: result.assets[0].uri });
    }
  };

  const formatDate = (date: Date | undefined) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const handleDateChange = (selectedDate: Date) => {
    setFormData({ ...formData, dateOfBirth: selectedDate });
    setShowDatePicker(false);
  };

  if (!profile && !isEditing) {
    return null; // Loading
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Profile', headerShown: true }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {/* Profile Photo */}
        <View style={styles.photoContainer}>
          <TouchableOpacity onPress={isEditing ? handleImagePick : undefined}>
            {formData.photoUri ? (
              <Image source={{ uri: formData.photoUri }} style={styles.photo} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Text style={styles.photoPlaceholderText}>📷</Text>
              </View>
            )}
            {isEditing && (
              <View style={styles.editBadge}>
                <Text style={styles.editBadgeText}>Edit</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Profile Details */}
        <AppCard style={styles.detailsContainer}>
          {/* Name */}
          <View style={styles.fieldRow}>
            <Text style={styles.label}>
              Name{isEditing ? <Text style={styles.requiredStar}> *</Text> : null}
            </Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={formData.fullName}
                onChangeText={(text) => setFormData({ ...formData, fullName: text })}
                placeholder="John Doe"
              />
            ) : (
              <Text style={styles.value}>{profile?.fullName}</Text>
            )}
          </View>

          {/* Date of Birth */}
          <View style={styles.fieldRow}>
            <Text style={styles.label}>Date of Birth</Text>
            {isEditing ? (
              <TouchableOpacity 
                style={styles.dateInput} 
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={styles.dateInputText}>
                  {formatDate(formData.dateOfBirth)}
                </Text>
                <Text style={styles.dateInputIcon}>📅</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.value}>{formatDate(profile?.dateOfBirth)}</Text>
            )}
          </View>
          
          <Calendar
            visible={showDatePicker}
            onClose={() => setShowDatePicker(false)}
            onSelectDate={handleDateChange}
            selectedDate={formData.dateOfBirth}
          />

          {/* Email */}
          <View style={styles.fieldRow}>
            <Text style={styles.label}>
              Email{isEditing ? <Text style={styles.requiredStar}> *</Text> : null}
            </Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={formData.email}
                onChangeText={(text) => setFormData({ ...formData, email: text })}
                placeholder="johndoe@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            ) : (
              <Text style={styles.value}>{profile?.email}</Text>
            )}
          </View>

          {/* Phone */}
          <View style={styles.fieldRow}>
            <Text style={styles.label}>
              Phone{isEditing ? <Text style={styles.requiredStar}> *</Text> : null}
            </Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={formData.phoneNumber}
                onChangeText={(text) => setFormData({ ...formData, phoneNumber: text })}
                placeholder="+1 234 567 8900"
                keyboardType="phone-pad"
              />
            ) : (
              <Text style={styles.value}>{profile?.phoneNumber}</Text>
            )}
          </View>

          {/* Gender */}
          <View style={styles.fieldRow}>
            <Text style={styles.label}>Gender</Text>
            {isEditing ? (
              <View style={styles.genderContainer}>
                {(['Male', 'Female', 'Other'] as const).map((gender) => (
                  <TouchableOpacity
                    key={gender}
                    style={[
                      styles.genderOption,
                      formData.gender === gender && styles.genderOptionSelected,
                    ]}
                    onPress={() => setFormData({ ...formData, gender })}
                  >
                    <Text
                      style={[
                        styles.genderText,
                        formData.gender === gender && styles.genderTextSelected,
                      ]}
                    >
                      {gender}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <Text style={styles.value}>{profile?.gender}</Text>
            )}
          </View>

          {/* Address */}
          <View style={styles.fieldRow}>
            <Text style={styles.label}>
              Address{isEditing ? <Text style={styles.requiredStar}> *</Text> : null}
            </Text>
            {isEditing ? (
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.address}
                onChangeText={(text) => setFormData({ ...formData, address: text })}
                placeholder="123 Main St, Springfield, IL 62701"
                multiline
                numberOfLines={2}
              />
            ) : (
              <Text style={styles.value}>{profile?.address}</Text>
            )}
          </View>
        </AppCard>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          {isEditing ? (
            <>
              <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                <Text style={styles.saveButtonText}>Save Profile</Text>
              </TouchableOpacity>
              {profile && (
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setIsEditing(false);
                    setFormData(profile);
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              )}
            </>
          ) : (
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => setIsEditing(true)}
            >
              <Text style={styles.editButtonText}>Edit Profile</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  contentContainer: {
    padding: 20,
  },
  photoContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#E0E0E0',
  },
  photoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPlaceholderText: {
    fontSize: 48,
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Colors.light.tint,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  editBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  detailsContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  fieldRow: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  requiredStar: {
    color: '#FF3B30',
  },
  value: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#F9F9F9',
  },
  dateInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#F9F9F9',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateInputText: {
    fontSize: 16,
    color: '#000',
  },
  dateInputIcon: {
    fontSize: 20,
  },
  textArea: {
    height: 60,
    textAlignVertical: 'top',
  },
  genderContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  genderOption: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  genderOptionSelected: {
    borderColor: Colors.light.tint,
    backgroundColor: `${Colors.light.tint}10`,
  },
  genderText: {
    fontSize: 14,
    color: '#666',
  },
  genderTextSelected: {
    color: Colors.light.tint,
    fontWeight: '600',
  },
  buttonContainer: {
    gap: 12,
    marginBottom: 40,
  },
  saveButton: {
    backgroundColor: Colors.light.tint,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  editButton: {
    backgroundColor: Colors.light.tint,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  editButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#F5F5F5',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
});
