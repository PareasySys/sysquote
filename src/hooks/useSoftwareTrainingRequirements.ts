
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

// Reuse the same TopicItem interface as for machine requirements
export interface TopicItem {
  topic_id: number;
  topic_name: string;
  description?: string | null;
  parent_topic_id?: number | null;
  hours_required?: number;
}

export const useSoftwareTrainingRequirements = (softwareIds: number[]) => {
  const [topicsBySoftware, setTopicsBySoftware] = useState<Record<string, TopicItem[]>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTrainingRequirements = async () => {
      if (softwareIds.length === 0) {
        setTopicsBySoftware({});
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        setError(null);
        
        console.log("Fetching software training requirements for:", softwareIds);
        
        const { data, error: fetchError } = await supabase
          .from("software_training_requirements")
          .select(`
            software_type_id,
            hours_required,
            training_topics(
              topic_id,
              topic_name,
              description,
              parent_topic_id
            )
          `)
          .in("software_type_id", softwareIds)
          .order("software_type_id");
          
        if (fetchError) throw fetchError;
        
        console.log("Software training requirements data:", data);
        
        // Format data by software ID
        const topicMap: Record<string, TopicItem[]> = {};
        
        data?.forEach(req => {
          const softwareKey = `software_${req.software_type_id}`;
          
          if (!topicMap[softwareKey]) {
            topicMap[softwareKey] = [];
          }
          
          if (req.training_topics) {
            const topic: TopicItem = {
              topic_id: req.training_topics.topic_id,
              topic_name: req.training_topics.topic_name,
              description: req.training_topics.description,
              parent_topic_id: req.training_topics.parent_topic_id,
              hours_required: req.hours_required
            };
            
            topicMap[softwareKey].push(topic);
          }
        });
        
        setTopicsBySoftware(topicMap);
      } catch (err: any) {
        console.error("Error fetching software training requirements:", err);
        setError(err.message || "Failed to load software training requirements");
        toast.error("Failed to load software training requirements");
      } finally {
        setLoading(false);
      }
    };
    
    fetchTrainingRequirements();
  }, [softwareIds]);
  
  return { topicsBySoftware, loading, error };
};
