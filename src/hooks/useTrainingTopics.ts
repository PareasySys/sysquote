
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { syncPlanningDetailsAfterChanges } from "@/services/planningDetailsSync";

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

export const useTrainingTopics = (
  selectedMachineIds: number[] = [], 
  selectedPlanId?: number | null, 
  selectedItemType?: string | null
) => {
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

  const addTopic = async (newTopicText: string): Promise<boolean> => {
    if (!newTopicText.trim()) {
      toast.error("Topic text cannot be empty");
      return false;
    }

    setIsAddingTopic(true);
    try {
      const insertPromises = selectedMachineIds.map(async (machineTypeId) => {
        const newTopicData: NewTopicInsert = {
          topic_text: newTopicText,
          machine_type_id: machineTypeId,
          requirement_id: null
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
        setTopics((prevTopics) => [...prevTopics, ...successfulTopics]);
        setNewTopic("");
        await syncPlanningDetailsAfterChanges();
        toast.success("Training topic added successfully for selected machines!");
        return true;
      } else {
        toast.error("Failed to add training topics for any of the selected machines.");
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
      await syncPlanningDetailsAfterChanges();
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
      await syncPlanningDetailsAfterChanges();
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
      
      const { error } = await supabase
        .from("training_topics")
        .delete()
        .eq(fieldName, itemId);

      if (error) throw error;

      await syncPlanningDetailsAfterChanges();
      toast.success(`Training topics for ${itemType} deleted successfully`);
      return true;
    } catch (err: any) {
      console.error(`Error deleting training topics for ${itemType}:`, err);
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
