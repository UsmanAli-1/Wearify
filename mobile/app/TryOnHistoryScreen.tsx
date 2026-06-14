import { API_URL } from "@/constants/config";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Modal,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useGlassAlert } from "@/components/GlassAlert";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TryOnRecord {
  _id: string;
  imagePath: string; // generated result image (Cloudinary)
  createdAt: string;
  garment?: {
    _id: string | null;
    name: string;
    imagePath: string;
  };
  garmentImagePath?: string;
}

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 52) / 2;

async function getAuthToken(): Promise<string> {
  const token = await AsyncStorage.getItem("authToken");
  return token ?? "";
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-PK", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TryOnHistoryScreen() {
  const router = useRouter();
  const { show: showAlert, element: alertElement } = useGlassAlert();

  const [records, setRecords] = useState<TryOnRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<TryOnRecord | null>(
    null,
  );
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ── Fetch history whenever screen is focused ─────────────────────────────────

  const fetchHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = await getAuthToken();
      const { data } = await axios.get(`${API_URL}/images/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRecords(data);
    } catch (err) {
      console.error("Failed to fetch history:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchHistory();
    }, [fetchHistory]),
  );

  // ── Delete ───────────────────────────────────────────────────────────────────

  const handleDelete = (record: TryOnRecord) => {
    showAlert(
      "Delete Try-On",
      "Are you sure you want to delete this try-on? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeletingId(record._id);
            setSelectedRecord(null);
            try {
              const token = await getAuthToken();
              await axios.delete(`${API_URL}/images/${record._id}`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              setRecords((prev) => prev.filter((r) => r._id !== record._id));
            } catch {
              showAlert("Error", "Failed to delete. Please try again.");
            } finally {
              setDeletingId(null);
            }
          },
        },
      ],
    );
  };

  // ── Render card ──────────────────────────────────────────────────────────────

  const renderCard = ({ item }: { item: TryOnRecord }) => {
    const isDeleting = deletingId === item._id;
    const garmentThumb =
      item.garment?.imagePath ?? item.garmentImagePath ?? null;

    return (
      <TouchableOpacity
        style={[styles.card, isDeleting && { opacity: 0.4 }]}
        onPress={() => !isDeleting && setSelectedRecord(item)}
        activeOpacity={0.85}
        disabled={isDeleting}
      >
        {/* Main generated image */}
        <Image source={{ uri: item.imagePath }} style={styles.cardImage} />

        {/* Garment thumbnail overlay (top right) */}
        {garmentThumb && (
          <View style={styles.garmentThumb}>
            <Image
              source={{
                uri: garmentThumb.startsWith("http")
                  ? garmentThumb
                  : `${API_URL.replace("/api", "")}/${garmentThumb.replace(/\\/g, "/")}`,
              }}
              style={styles.garmentThumbImage}
            />
          </View>
        )}

        {/* Deleting spinner */}
        {isDeleting && (
          <View style={styles.deletingOverlay}>
            <ActivityIndicator color="#FFF" />
          </View>
        )}

        {/* Date */}
        <View style={styles.cardFooter}>
          <Text style={styles.cardDate}>{formatDate(item.createdAt)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  // ── Empty state ──────────────────────────────────────────────────────────────

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>👗</Text>
      <Text style={styles.emptyTitle}>No Try-Ons Yet</Text>
      <Text style={styles.emptySubtitle}>
        Your generated try-on images will appear here.
      </Text>
      <TouchableOpacity style={styles.emptyBtn} onPress={() => router.back()}>
        <LinearGradient
          colors={["#8b5cf6", "#3b82f6"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.emptyBtnGradient}
        >
          <Text style={styles.emptyBtnText}>Start Trying On →</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  // ── Main render ──────────────────────────────────────────────────────────────

  return (
    <LinearGradient
      colors={["#1c103f", "#080d1a", "#080d1a", "#2d1445"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.background}
    >
      <SafeAreaView style={styles.container}>
        {/* Header — heading removed (#14) */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
          >
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{records.length}</Text>
          </View>
        </View>

        {/* Content */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#8b5cf6" />
            <Text style={styles.loadingText}>Loading your history...</Text>
          </View>
        ) : (
          <FlatList
            data={records}
            keyExtractor={(item) => item._id}
            renderItem={renderCard}
            numColumns={2}
            columnWrapperStyle={styles.row}
            contentContainerStyle={[
              styles.listContent,
              records.length === 0 && styles.listContentEmpty,
            ]}
            ListEmptyComponent={renderEmpty}
            showsVerticalScrollIndicator={false}
          />
        )}
      </SafeAreaView>

      {/* ── Detail Modal ── */}
      <Modal
        visible={selectedRecord !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedRecord(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedRecord && (
              <>
                {/* Close */}
                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => setSelectedRecord(null)}
                >
                  <Text style={styles.modalCloseTxt}>✕</Text>
                </TouchableOpacity>

                {/* Generated image */}
                <Image
                  source={{ uri: selectedRecord.imagePath }}
                  style={styles.modalImage}
                  resizeMode="contain"
                />

                {/* Meta */}
                <View style={styles.modalMeta}>
                  <Text style={styles.modalDate}>
                    Generated on {formatDate(selectedRecord.createdAt)}
                  </Text>

                  {/* Garment used */}
                  {(selectedRecord.garment ??
                    selectedRecord.garmentImagePath) && (
                    <View style={styles.modalGarmentRow}>
                      <Text style={styles.modalGarmentLabel}>
                        Garment used:
                      </Text>
                      <Image
                        source={{
                          uri: (() => {
                            const path =
                              selectedRecord.garment?.imagePath ??
                              selectedRecord.garmentImagePath ??
                              "";
                            return path.startsWith("http")
                              ? path
                              : `${API_URL.replace("/api", "")}/${path.replace(/\\/g, "/")}`;
                          })(),
                        }}
                        style={styles.modalGarmentThumb}
                      />
                    </View>
                  )}
                </View>

                {/* Delete button */}
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => handleDelete(selectedRecord)}
                >
                  <Text style={styles.deleteBtnText}>
                    🗑 Delete This Try-On
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {alertElement}
    </LinearGradient>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  background: { flex: 1 },
  container: { flex: 1 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginBottom: 8,
    marginTop: 50,
  },
  backBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "rgba(139, 92, 246, 0.15)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(139, 92, 246, 0.3)",
  },
  backBtnText: { color: "#8b5cf6", fontWeight: "600", fontSize: 14 },
  headerTitle: { color: "#FFFFFF", fontSize: 18, fontWeight: "bold" },
  countBadge: {
    backgroundColor: "rgba(139, 92, 246, 0.2)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(139, 92, 246, 0.4)",
  },
  countText: { color: "#d8b4fe", fontWeight: "bold", fontSize: 13 },

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  loadingText: { color: "#A0AEC0", fontSize: 14 },

  listContent: { paddingHorizontal: 16, paddingBottom: 30 },
  listContentEmpty: { flex: 1 },
  row: { justifyContent: "space-between", marginBottom: 12 },

  card: {
    width: CARD_WIDTH,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  cardImage: { width: "100%", height: CARD_WIDTH * 1.4, resizeMode: "cover" },
  garmentThumb: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 40,
    height: 40,
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.3)",
    backgroundColor: "#000",
  },
  garmentThumbImage: { width: "100%", height: "100%", resizeMode: "cover" },
  deletingOverlay: {
    position: "absolute",
    inset: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  cardFooter: {
    padding: 10,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  cardDate: { color: "#A0AEC0", fontSize: 11 },

  // Empty state
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  emptyIcon: { fontSize: 64, marginBottom: 16 },
  emptyTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 8,
  },
  emptySubtitle: {
    color: "#64748b",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 32,
  },
  emptyBtn: { width: "100%", borderRadius: 14, overflow: "hidden" },
  emptyBtnGradient: { paddingVertical: 14, alignItems: "center" },
  emptyBtnText: { color: "#FFF", fontWeight: "bold", fontSize: 15 },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#0A0F1C",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 40,
    maxHeight: "90%",
    borderTopWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  modalCloseBtn: {
    alignSelf: "flex-end",
    backgroundColor: "rgba(255,255,255,0.08)",
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  modalCloseTxt: { color: "#A0AEC0", fontWeight: "bold", fontSize: 16 },
  modalImage: {
    width: "100%",
    height: 380,
    borderRadius: 16,
    marginBottom: 16,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  modalMeta: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    gap: 10,
  },
  modalDate: { color: "#A0AEC0", fontSize: 13 },
  modalGarmentRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  modalGarmentLabel: { color: "#A0AEC0", fontSize: 13, flex: 1 },
  modalGarmentThumb: {
    width: 48,
    height: 48,
    borderRadius: 8,
    resizeMode: "cover",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  deleteBtn: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  deleteBtnText: { color: "#ef4444", fontWeight: "600", fontSize: 15 },
});
