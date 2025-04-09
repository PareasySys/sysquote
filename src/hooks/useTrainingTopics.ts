
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
  // Extended information (joined from machine_training_requirements)
  machine_type_id?: number;
  plan_id?: number;
}

export interface TrainingRequirementWithTopics {
  requirement_id: number;
  machine_type_id: number;
  plan_id: number;
  topics: TrainingTopic[];
}

export const useTrainingTopics = (requirementId?: number) => {
  const [topics, setTopics] = useState<TrainingTopic[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTopics = async () => {
    if (!requirementId) {
      setTopics([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log("Fetching training topics for requirement ID:", requirementId);
      
      // Fetch requirement first to get machine_type_id and plan_id
      const { data: requirementData, error: reqError } = await supabase
        .from('machine_training_requirements')
        .select('*')
        .eq('id', requirementId)
        .single();
      
      if (reqError) throw reqError;
      
      // Then fetch topics with the requirement info
      const { data: topicsData, error: fetchError } = await supabase
        .from('training_topics')
        .select('*')
        .eq('requirement_id', requirementId)
        .order('display_order', { ascending: true, nullsFirst: true });
      
      if (fetchError) throw fetchError;
      
      // Combine the requirement data with each topic
      const enrichedTopics = topicsData?.map(topic => ({
        ...topic,
        machine_type_id: requirementData.machine_type_id,
        plan_id: requirementData.plan_id
      })) || [];
      
      console.log("Training topics fetched:", enrichedTopics);
      
      // Cast the data to the correct type
      setTopics(enrichedTopics as unknown as TrainingTopic[]);
    } catch (err: any) {
      console.error("Error fetching training topics:", err);
      setError(err.message || "Failed to load training topics");
    } finally {
      setLoading(false);
    }
  };

  const addTopic = async (topicText: string): Promise<boolean> => {
    if (!requirementId) return false;

    try {
      const { data: requirementData, error: reqError } = await supabase
        .from('machine_training_requirements')
        .select('machine_type_id, plan_id')
        .eq('id', requirementId)
        .single();
        
      if (reqError) throw reqError;

      const { data, error: insertError } = await supabase
        .from('training_topics')
        .insert({
          requirement_id: requirementId,
          topic_text: topicText,
          updated_at: new Date().toISOString()
        })
        .select();

      if (insertError) throw insertError;
      
      if (data && data[0]) {
        const newTopic = {
          ...data[0],
          machine_type_id: requirementData.machine_type_id,
          plan_id: requirementData.plan_id
        } as unknown as TrainingTopic;
        
        setTopics(prev => [...prev, newTopic]);
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
  }, [requirementId]);

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
