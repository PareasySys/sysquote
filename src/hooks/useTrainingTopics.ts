// src/hooks/useTrainingTopics.ts

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
// --- CORRECTED IMPORT ---
// Import the OBJECT that contains the methods
import { dataSyncService } from "@/services/planningDetailsSync";

// --- Interfaces (ensure these match your actual types) ---
export interface TrainingTopicBase {
  topic_id: number;
  topic_text: string;
  plan_id: number | null;
  machine_type_id: number | null;
  software_type_id: number | null;
  requirement_id: number | null; // Assuming this can be null
  item_type: string | null;
  display_order: number | null;
  created_at: string;
  updated_at: string;
}

export type TrainingTopic = TrainingTopicBase;

export type NewTopicInsert = {
  topic_text: string;
  plan_id?: number | null;
  machine_type_id?: number | null;
  software_type_id?: number | null;
  requirement_id: number | null; // Allow null
  item_type?: string | null;
  display_order?: number | null;
};
// --- End Interfaces ---


export const useTrainingTopics = (
  selectedMachineIds: number[] = [],
  selectedPlanId?: number | null,
  selectedItemType?: string | null // Note: These plan/type params seem unused in fetch logic
) => {
  const [topics, setTopics] = useState<TrainingTopic[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [newTopic, setNewTopic] = useState<string>("");
  const [isAddingTopic, setIsAddingTopic] = useState<boolean>(false);

  // Fetch topics related ONLY to the selected machines
  const fetchTopics = useCallback(async () => {
    // This currently ONLY fetches topics linked to machine_type_id.
    // If you need software topics shown in the tree, you'll need to adjust this
    // perhaps by fetching based on selectedItemType and selectedSoftwareIds as well.
    if (!selectedMachineIds || selectedMachineIds.length === 0) {
      setTopics([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from("training_topics")
        .select("*")
        .in("machine_type_id", selectedMachineIds) // Only fetches machine topics currently
        .order("display_order", { ascending: true, nullsFirst: false });
      if (error) throw error;
      setTopics(data || []);
    } catch (err: any) {
      console.error("Error fetching training topics:", err);
      setError(err.message || "Failed to load training topics");
      toast.error("Failed to load training topics");
    } finally {
      setLoading(false);
    }
  }, [selectedMachineIds]);

  useEffect(() => {
    fetchTopics();
  }, [fetchTopics]);

  const addTopic = async (newTopicText: string): Promise<boolean> => {
    if (!newTopicText.trim()) {
      toast.error("Topic text cannot be empty");
      return false;
    }
    if (selectedMachineIds.length === 0) {
        toast.error("No machines selected to add topic to.");
        return false;
    }

    setIsAddingTopic(true);
    try {
      const insertPromises = selectedMachineIds.map(async (machineTypeId) => {
        const newTopicData: NewTopicInsert = {
          topic_text: newTopicText,
          machine_type_id: machineTypeId,
          plan_id: selectedPlanId, // Use selected plan if available
          item_type: 'machine',    // Explicitly set type
          requirement_id: null     // Set requirement_id to null
        };
        const { data, error } = await supabase.from("training_topics").insert([newTopicData]).select().single();
        if (error) { console.error(`Error adding topic for machine ${machineTypeId}:`, error); return null; }
        return data as TrainingTopic;
      });
      const results = await Promise.all(insertPromises);
      const successfulTopics = results.filter((topic): topic is TrainingTopic => topic !== null);

      if (successfulTopics.length > 0) {
        setTopics((prevTopics) => [...prevTopics, ...successfulTopics].sort((a, b) => (a.display_order ?? 999) - (b.display_order ?? 999)));
        setNewTopic("");
        // --- CORRECTED CALL ---
        await dataSyncService.syncTrainingTopicChanges(); // Call the METHOD
        toast.success("Training topic added successfully!");
        return true;
      } else {
        toast.error("Failed to add training topics.");
        return false;
      }
    } catch (err: any) {
      console.error("Error adding training topic:", err);
      setError(err.message || "Failed to add training topic");
      toast.error("Failed to add training topic");
      return false;
    } finally {
      setIsAddingTopic(false);
    }
  };

  const updateTopic = async (topicId: number, newText: string): Promise<boolean> => {
    if (!newText.trim()) return false;
    try {
      const { error } = await supabase.from("training_topics").update({ topic_text: newText, updated_at: new Date().toISOString() }).eq("topic_id", topicId);
      if (error) throw error;
      setTopics((prevTopics) => prevTopics.map((topic) => topic.topic_id === topicId ? { ...topic, topic_text: newText } : topic));
      // --- CORRECTED CALL ---
      await dataSyncService.syncTrainingTopicChanges(); // Call the METHOD
      toast.success("Training topic updated successfully");
      return true;
    } catch (err: any) {
      console.error("Error updating training topic:", err);
      toast.error("Failed to update training topic");
      return false;
    }
  };

  const deleteTopic = async (topicId: number): Promise<boolean> => {
    try {
      const { error } = await supabase.from("training_topics").delete().eq("topic_id", topicId);
      if (error) throw error;
      setTopics((prevTopics) => prevTopics.filter((topic) => topic.topic_id !== topicId));
      // --- CORRECTED CALL ---
      await dataSyncService.syncTrainingTopicChanges(); // Call the METHOD
      toast.success("Training topic deleted successfully");
      return true;
    } catch (err: any) {
      console.error("Error deleting training topic:", err);
      toast.error("Failed to delete training topic");
      return false;
    }
  };

  const deleteTopicsByItemId = async (itemId: number, itemType: "machine" | "software"): Promise<boolean> => {
    try {
      const fieldName = itemType === "machine" ? "machine_type_id" : "software_type_id";
      const { error } = await supabase.from("training_topics").delete().eq(fieldName, itemId);
      if (error) throw error;
      await fetchTopics(); // Refetch after deletion
      // --- CORRECTED CALL ---
      await dataSyncService.syncTrainingTopicChanges(); // Call the METHOD
      toast.success(`Training topics for ${itemType} ${itemId} deleted successfully`);
      return true;
    } catch (err: any) {
      console.error(`Error deleting training topics for ${itemType} ${itemId}:`, err);
      toast.error(`Failed to delete training topics for ${itemType}`);
      return false;
    }
  };

  return {
    topics,
    loading,
    error,
    newTopic,
    setNewTopic,
    addTopic,
    updateTopic,
    deleteTopic,
    isAddingTopic,
    deleteTopicsByItemId,
  };
};