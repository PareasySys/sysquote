
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
  machine_type_id: number;
  plan_id: number;
}

export interface TrainingRequirementWithTopics {
  requirement_id: number;
  machine_type_id: number;
  plan_id: number;
  topics: TrainingTopic[];
}

export const useTrainingTopics = (machineTypeId?: number, planId?: number) => {
  const [topics, setTopics] = useState<TrainingTopic[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [requirementId, setRequirementId] = useState<number | null>(null);

  const fetchRequirement = async () => {
    if (!machineTypeId || !planId) return null;
    
    try {
      const { data, error } = await supabase
        .from('machine_training_requirements')
        .select('id')
        .eq('machine_type_id', machineTypeId)
        .eq('plan_id', planId)
        .maybeSingle();
      
      if (error) throw error;
      
      return data?.id || null;
    } catch (err) {
      console.error("Error fetching requirement:", err);
      return null;
    }
  };

  const fetchTopics = async () => {
    if (!machineTypeId || !planId) {
      setTopics([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log(`Fetching training topics for machine type ${machineTypeId} and plan ${planId}`);
      
      // Fetch topics directly using machine_type_id and plan_id
      const { data, error: fetchError } = await supabase
        .from('training_topics')
        .select('*')
        .eq('machine_type_id', machineTypeId)
        .eq('plan_id', planId)
        .order('display_order', { ascending: true, nullsFirst: true });
      
      if (fetchError) throw fetchError;
      
      console.log("Training topics fetched:", data);
      setTopics(data || []);
      
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
    if (!machineTypeId || !planId) return false;

    try {
      // Check if we need to create a requirement first
      let reqId = requirementId;
      
      if (!reqId) {
        // Create a new requirement
        const { data: newReq, error: reqError } = await supabase
          .from('machine_training_requirements')
          .insert({
            machine_type_id: machineTypeId,
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

      const { data, error: insertError } = await supabase
        .from('training_topics')
        .insert({
          requirement_id: reqId,
          machine_type_id: machineTypeId,
          plan_id: planId,
          topic_text: topicText,
          updated_at: new Date().toISOString()
        })
        .select();

      if (insertError) throw insertError;
      
      if (data && data[0]) {
        setTopics(prev => [...prev, data[0]]);
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

  useEffect(() => {
    fetchTopics();
  }, [machineTypeId, planId]);

  return {
    topics,
    loading,
    error,
    fetchTopics,
    addTopic,
    updateTopic,
    deleteTopic
  };
};
