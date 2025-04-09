
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

export interface TrainingTopic {
  topic_id: number;
  requirement_id: number;
  topic_text: string;
  display_order: number | null;
  created_at: string;
  updated_at: string;
  machine_type_id: number | null;
  software_type_id: number | null;
  plan_id: number | null;
  item_type: string; // "machine" or "software"
}

export interface TrainingRequirementWithTopics {
  requirement_id: number;
  machine_type_id?: number | null;
  software_type_id?: number | null;
  plan_id: number;
  topics: TrainingTopic[];
}

export const useTrainingTopics = (
  itemId?: number, 
  planId?: number, 
  itemType?: string // "machine" or "software"
) => {
  const [topics, setTopics] = useState<TrainingTopic[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [requirementId, setRequirementId] = useState<number | null>(null);

  const fetchRequirement = async () => {
    if (!itemId || !planId || !itemType) return null;
    
    try {
      const tableName = itemType === "machine" ? 'machine_training_requirements' : 'software_training_requirements';
      const columnName = itemType === "machine" ? 'machine_type_id' : 'software_type_id';
      
      const { data: reqData, error } = await supabase
        .from(tableName)
        .select('id')
        .eq(columnName, itemId)
        .eq('plan_id', planId)
        .maybeSingle();
      
      if (error) throw error;
      
      return reqData?.id || null;
    } catch (err) {
      console.error("Error fetching requirement:", err);
      return null;
    }
  };

  const fetchTopics = async () => {
    if (!itemId || !planId || !itemType) {
      setTopics([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log(`Fetching training topics for ${itemType} ${itemId} and plan ${planId}`);
      
      // Determine which column to query based on itemType
      const columnName = itemType === "machine" ? 'machine_type_id' : 'software_type_id';
      
      // Fetch topics using the appropriate column
      const { data: topicsData, error: fetchError } = await supabase
        .from('training_topics')
        .select('*')
        .eq(columnName, itemId)
        .eq('plan_id', planId)
        .order('display_order', { ascending: true, nullsFirst: true });
      
      if (fetchError) throw fetchError;
      
      console.log("Training topics fetched:", topicsData);
      
      // Set item_type on each topic if needed
      if (topicsData) {
        const topicsWithType: TrainingTopic[] = topicsData.map((topic: any) => ({
          ...topic,
          software_type_id: topic.software_type_id || null,
          machine_type_id: topic.machine_type_id || null,
          item_type: topic.item_type || itemType // Preserve existing or set new
        }));
        setTopics(topicsWithType);
      } else {
        setTopics([]);
      }
      
      // Also fetch or create the requirement ID for later use
      const reqId = await fetchRequirement();
      setRequirementId(reqId);
      
    } catch (err: any) {
      console.error("Error fetching training topics:", err);
      setError(err.message || "Failed to load training topics");
    } finally {
      setLoading(false);
    }
  };

  const addTopic = async (topicText: string): Promise<boolean> => {
    if (!itemId || !planId || !itemType) return false;

    try {
      // Check if we need to create a requirement first
      let reqId = requirementId;
      
      if (!reqId) {
        // Create a new requirement based on item type
        const tableName = itemType === "machine" ? 'machine_training_requirements' : 'software_training_requirements';
        const columnName = itemType === "machine" ? 'machine_type_id' : 'software_type_id';
        
        const { data: newReq, error: reqError } = await supabase
          .from(tableName)
          .insert({
            [columnName]: itemId,
            plan_id: planId,
            resource_id: null
          })
          .select();
          
        if (reqError) throw reqError;
        if (newReq && newReq.length > 0) {
          reqId = newReq[0].id;
          setRequirementId(reqId);
        }
      }

      // Define type for new topic with required fields
      type NewTopic = {
        requirement_id: number;
        plan_id: number;
        topic_text: string;
        item_type: string;
        updated_at: string;
        machine_type_id?: number | null;
        software_type_id?: number | null;
      };

      // Determine which column to set based on itemType
      const newTopic: NewTopic = {
        requirement_id: reqId as number,
        plan_id: planId,
        topic_text: topicText,
        item_type: itemType,
        updated_at: new Date().toISOString()
      };

      // Set the appropriate ID column based on itemType
      if (itemType === "machine") {
        newTopic.machine_type_id = itemId;
        newTopic.software_type_id = null;
      } else {
        newTopic.software_type_id = itemId;
        newTopic.machine_type_id = null;
      }

      const { data: topicData, error: insertError } = await supabase
        .from('training_topics')
        .insert(newTopic)
        .select();

      if (insertError) throw insertError;
      
      if (topicData && topicData[0]) {
        // Make sure we're adding a complete TrainingTopic object with item_type
        const addedTopic: TrainingTopic = {
          ...topicData[0],
          software_type_id: topicData[0].software_type_id || null,
          machine_type_id: topicData[0].machine_type_id || null,
          item_type: topicData[0].item_type || itemType
        };
        
        setTopics(prev => [...prev, addedTopic]);
        return true;
      }
      
      return false;
    } catch (err: any) {
      console.error("Error adding training topic:", err);
      toast.error(err.message || "Failed to add training topic");
      return false;
    }
  };

  const updateTopic = async (topicId: number, topicText: string): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from('training_topics')
        .update({ 
          topic_text: topicText,
          updated_at: new Date().toISOString()
        })
        .eq('topic_id', topicId);

      if (updateError) throw updateError;
      
      setTopics(prev => prev.map(topic => 
        topic.topic_id === topicId ? { ...topic, topic_text: topicText } : topic
      ));
      
      return true;
    } catch (err: any) {
      console.error("Error updating training topic:", err);
      toast.error(err.message || "Failed to update training topic");
      return false;
    }
  };

  const deleteTopic = async (topicId: number): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('training_topics')
        .delete()
        .eq('topic_id', topicId);

      if (deleteError) throw deleteError;
      
      setTopics(prev => prev.filter(topic => topic.topic_id !== topicId));
      return true;
    } catch (err: any) {
      console.error("Error deleting training topic:", err);
      toast.error(err.message || "Failed to delete training topic");
      return false;
    }
  };

  // Helper function to delete all topics for a specific machine or software type
  const deleteTopicsByItemId = async (itemIdToDelete: number, itemTypeToDelete: string): Promise<boolean> => {
    try {
      const columnName = itemTypeToDelete === "machine" ? 'machine_type_id' : 'software_type_id';
      
      const { error: deleteError } = await supabase
        .from('training_topics')
        .delete()
        .eq(columnName, itemIdToDelete);

      if (deleteError) throw deleteError;
      
      return true;
    } catch (err: any) {
      console.error(`Error deleting training topics for ${itemTypeToDelete} ${itemIdToDelete}:`, err);
      toast.error(err.message || `Failed to delete training topics for ${itemTypeToDelete}`);
      return false;
    }
  };

  useEffect(() => {
    fetchTopics();
  }, [itemId, planId, itemType]);

  return {
    topics,
    loading,
    error,
    fetchTopics,
    addTopic,
    updateTopic,
    deleteTopic,
    deleteTopicsByItemId
  };
};
