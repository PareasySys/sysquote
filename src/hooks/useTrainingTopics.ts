import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

// Define simpler types to avoid excessive type instantiation
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

// Fix to avoid excessive type instantiation
export type NewTopicInsert = {
  topic_text: string;
  plan_id?: number | null;
  machine_type_id?: number | null;
  software_type_id?: number | null;
  requirement_id?: number | null;
  item_type?: string | null;
  display_order?: number | null;
};

export const useTrainingTopics = (selectedMachineIds: number[]) => {
  const [topics, setTopics] = useState<TrainingTopic[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [newTopic, setNewTopic] = useState<string>("");
  const [isAddingTopic, setIsAddingTopic] = useState<boolean>(false);

  const fetchTopics = useCallback(async () => {
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
        .in("machine_type_id", selectedMachineIds)
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

  const addTopic = async (newTopicText: string) => {
    if (!newTopicText.trim()) {
      toast.error("Topic text cannot be empty");
      return;
    }

    setIsAddingTopic(true);
    try {
      // Map through each selected machine ID and create a new topic for it
      const insertPromises = selectedMachineIds.map(async (machineTypeId) => {
        const newTopicData: NewTopicInsert = {
          topic_text: newTopicText,
          machine_type_id: machineTypeId,
        };

        const { data, error } = await supabase
          .from("training_topics")
          .insert([newTopicData])
          .select()
          .single();

        if (error) {
          console.error(`Error adding topic for machine ${machineTypeId}:`, error);
          toast.error(`Failed to add topic for machine ${machineTypeId}`);
          return null; // Indicate failure
        }

        return data as TrainingTopic; // Indicate success and return the new topic
      });

      // Wait for all insert operations to complete
      const results = await Promise.all(insertPromises);

      // Filter out any failed results (where the promise returned null)
      const successfulTopics = results.filter((topic): topic is TrainingTopic => topic !== null);

      if (successfulTopics.length > 0) {
        setTopics((prevTopics) => [...prevTopics, ...successfulTopics]);
        setNewTopic(""); // Clear the input field
        toast.success("Training topic added successfully for selected machines!");
      } else {
        toast.error("Failed to add training topics for any of the selected machines.");
      }
    } catch (err: any) {
      console.error("Error adding training topic:", err);
      setError(err.message || "Failed to add training topic");
      toast.error("Failed to add training topic");
    } finally {
      setIsAddingTopic(false);
    }
  };

  const updateTopic = async (topicId: number, newText: string) => {
    try {
      const { error } = await supabase
        .from("training_topics")
        .update({ topic_text: newText })
        .eq("topic_id", topicId);

      if (error) throw error;

      setTopics((prevTopics) =>
        prevTopics.map((topic) =>
          topic.topic_id === topicId ? { ...topic, topic_text: newText } : topic
        )
      );
      toast.success("Training topic updated successfully");
    } catch (err: any) {
      console.error("Error updating training topic:", err);
      toast.error("Failed to update training topic");
    }
  };

  const deleteTopic = async (topicId: number) => {
    try {
      const { error } = await supabase
        .from("training_topics")
        .delete()
        .eq("topic_id", topicId);

      if (error) throw error;

      setTopics((prevTopics) => prevTopics.filter((topic) => topic.topic_id !== topicId));
      toast.success("Training topic deleted successfully");
    } catch (err: any) {
      console.error("Error deleting training topic:", err);
      toast.error("Failed to delete training topic");
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
  };
};
