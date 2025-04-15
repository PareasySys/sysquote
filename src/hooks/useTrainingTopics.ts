// src/hooks/useTrainingTopics.ts

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
// --- CORRECTED IMPORT ---
// Import the entire service object
import { dataSyncService } from "@/services/planningDetailsSync";

// --- Interfaces ---
export interface TrainingTopicBase {
  topic_id: number;
  topic_text: string;
  plan_id: number | null;
  machine_type_id: number | null;
  software_type_id: number | null;
  requirement_id: number | null;
  item_type: string | null;
  display_order: number | null;
  created_at: string;
  updated_at: string;
}

export type TrainingTopic = TrainingTopicBase;
export type RequirementId = { requirement_id: number };

export type NewTopicInsert = {
  topic_text: string;
  plan_id?: number | null;
  machine_type_id?: number | null;
  software_type_id?: number | null;
  requirement_id: number | null;
  item_type?: string | null;
  display_order?: number | null;
};
// --- End Interfaces ---

export const useTrainingTopics = (
  selectedMachineIds: number[] = [],
  selectedPlanId?: number | null, // These params seem unused in the current fetch logic, consider removing if not needed
  selectedItemType?: string | null // These params seem unused in the current fetch logic, consider removing if not needed
) => {
  const [topics, setTopics] = useState<TrainingTopic[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [newTopic, setNewTopic] = useState<string>("");
  const [isAddingTopic, setIsAddingTopic] = useState<boolean>(false);

  // Fetch topics related ONLY to the selected machines
  // If you need software topics too, this fetch logic needs adjustment
  const fetchTopics = useCallback(async () => {
    if (!selectedMachineIds || selectedMachineIds.length === 0) {
      setTopics([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch topics for the currently selected machines
      const { data, error } = await supabase
        .from("training_topics")
        .select("*")
        .in("machine_type_id", selectedMachineIds) // Only fetch for selected machines
        // Add filter for software_type_id if needed based on selectedItemType/selectedSoftwareIds
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
  }, [selectedMachineIds]); // Dependency on selected machines

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
      // Create topic for each selected machine
      const insertPromises = selectedMachineIds.map(async (machineTypeId) => {
        const newTopicData: NewTopicInsert = {
          topic_text: newTopicText,
          machine_type_id: machineTypeId, // Link to machine
          software_type_id: null, // Explicitly null if machine topic
          plan_id: selectedPlanId, // Link to specific plan if selected, else null? Check requirement
          item_type: 'machine', // Set item type
          requirement_id: null // Usually null unless linked to a specific requirement
        };

        const { data, error } = await supabase
          .from("training_topics")
          .insert([newTopicData])
          .select()
          .single();

        if (error) {
          console.error(`Error adding topic for machine ${machineTypeId}:`, error);
          toast.error(`Failed to add topic for machine ${machineTypeId}`);
          return null;
        }
        return data as TrainingTopic;
      });

      const results = await Promise.all(insertPromises);
      const successfulTopics = results.filter((topic): topic is TrainingTopic => topic !== null);

      if (successfulTopics.length > 0) {
        setTopics((prevTopics) => [...prevTopics, ...successfulTopics].sort((a, b) => (a.display_order ?? 999) - (b.display_order ?? 999))); // Add and re-sort
        setNewTopic("");
        // --- CORRECTED CALL ---
        await dataSyncService.syncTrainingTopicChanges(); // Call the METHOD on the service object
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
    if (!newText.trim()) {
      toast.error("Topic text cannot be empty");
      return false;
    }
    try {
      const { error } = await supabase
        .from("training_topics")
        .update({ topic_text: newText, updated_at: new Date().toISOString() })
        .eq("topic_id", topicId);

      if (error) throw error;

      setTopics((prevTopics) =>
        prevTopics.map((topic) =>
          topic.topic_id === topicId ? { ...topic, topic_text: newText } : topic
        )
      );
      // --- CORRECTED CALL ---
      await dataSyncService.syncTrainingTopicChanges(); // Call the method
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
      const { error } = await supabase
        .from("training_topics")
        .delete()
        .eq("topic_id", topicId);

      if (error) throw error;

      setTopics((prevTopics) => prevTopics.filter((topic) => topic.topic_id !== topicId));
      // --- CORRECTED CALL ---
      await dataSyncService.syncTrainingTopicChanges(); // Call the method
      toast.success("Training topic deleted successfully");
      return true;
    } catch (err: any) {
      console.error("Error deleting training topic:", err);
      toast.error("Failed to delete training topic");
      return false;
    }
  };

  // This function might still be useful if called from elsewhere, like settings pages
  const deleteTopicsByItemId = async (itemId: number, itemType: "machine" | "software"): Promise<boolean> => {
    try {
      const fieldName = itemType === "machine" ? "machine_type_id" : "software_type_id";
      const { error } = await supabase
        .from("training_topics")
        .delete()
        .eq(fieldName, itemId);

      if (error) throw error;

      await fetchTopics(); // Refetch topics after deletion
      // --- CORRECTED CALL ---
      await dataSyncService.syncTrainingTopicChanges(); // Call the method
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
    deleteTopicsByItemId, // Keep exported if used elsewhere
  };
};