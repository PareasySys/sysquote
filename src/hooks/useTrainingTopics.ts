
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { PostgrestResponse, PostgrestSingleResponse } from "@supabase/supabase-js"; // Import Supabase response types

// Interface for a single training topic
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
  item_type: "machine" | "software"; // Using specific union type instead of string
}

// Interface used internally for fetching requirement ID
interface RequirementId {
  id: number;
}

// Type for the object inserted into training_topics
// Omit topic_id and created_at as they are generated by the DB
type NewTopicInsert = Omit<TrainingTopic, 'topic_id' | 'created_at'> & {
  // Make requirement_id required since the DB schema requires it
  requirement_id: number;
};

export const useTrainingTopics = (
  itemId?: number,
  planId?: number,
  itemType?: "machine" | "software" // Use union type for clarity
) => {
  const [topics, setTopics] = useState<TrainingTopic[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  // Store the requirement ID associated with the current itemId/planId/itemType
  const [requirementId, setRequirementId] = useState<number | null>(null);

  // Fetches the requirement ID for the given combination
  const fetchRequirement = useCallback(async (): Promise<number | null> => {
    // Guard clause: ensure all necessary parameters are present
    if (itemId === undefined || planId === undefined || !itemType) return null;

    try {
      const tableName = itemType === "machine" ? 'machine_training_requirements' : 'software_training_requirements';
      const columnName = itemType === "machine" ? 'machine_type_id' : 'software_type_id';

      // Explicitly type the expected response from Supabase
      const { data, error } = await supabase
        .from(tableName)
        .select('id')
        .eq(columnName, itemId)
        .eq('plan_id', planId)
        .maybeSingle(); // Fetches zero or one row

      if (error) {
        // Don't throw here, just log and return null if not found or error
        console.error(`Error fetching requirement for ${itemType} ${itemId}, plan ${planId}:`, error.message);
        return null;
      }

      // Return the ID if data exists, otherwise null
      return data?.id ?? null;

    } catch (err: any) {
      // Catch unexpected errors during the fetch process
      console.error("Unexpected error fetching requirement:", err);
      setError("Failed to check for training requirement."); // Set user-facing error
      return null;
    }
  }, [itemId, planId, itemType]); // Dependencies for useCallback

  // Fetches the training topics associated with the requirement
  const fetchTopics = useCallback(async () => {
    // Guard clause: ensure all necessary parameters are present
    if (itemId === undefined || planId === undefined || !itemType) {
      setTopics([]); // Clear topics if parameters are missing
      setLoading(false);
      setRequirementId(null); // Reset requirement ID
      return;
    }

    setLoading(true);
    setError(null);

    try {
       // First, get the requirement ID for the current item/plan combination
       const currentRequirementId = await fetchRequirement();
       setRequirementId(currentRequirementId); // Update state

       // If no requirement exists, there are no topics for it
       if (currentRequirementId === null) {
          console.log(`No requirement found for ${itemType} ${itemId}, plan ${planId}. No topics to fetch.`);
          setTopics([]);
          setLoading(false);
          return;
       }

       console.log(`Fetching training topics for requirement_id: ${currentRequirementId}`);

       // Fetch topics using the found requirement_id
       const { data: topicsData, error: fetchError } = await supabase
         .from('training_topics')
         .select('*') // Select all columns defined in TrainingTopic
         .eq('requirement_id', currentRequirementId) // Filter by the requirement ID
         .order('display_order', { ascending: true, nullsFirst: true }); // Order topics

      if (fetchError) throw fetchError; // Throw if Supabase returns an error

      console.log("Training topics fetched:", topicsData);

      if (topicsData) {
        // Map the fetched data, ensuring all properties match the TrainingTopic interface
        // Use nullish coalescing (??) for safer default values
        const formattedTopics: TrainingTopic[] = topicsData.map((topic) => ({
          ...topic,
          topic_id: topic.topic_id, // Ensure required fields are present
          requirement_id: topic.requirement_id,
          topic_text: topic.topic_text,
          display_order: topic.display_order ?? null,
          created_at: topic.created_at,
          updated_at: topic.updated_at,
          machine_type_id: topic.machine_type_id ?? null,
          software_type_id: topic.software_type_id ?? null,
          plan_id: topic.plan_id ?? null,
          item_type: (topic.item_type as "machine" | "software") ?? itemType, // Force the union type
        }));
        setTopics(formattedTopics);
      } else {
        setTopics([]); // Set to empty array if no data is returned
      }

    } catch (err: any) {
      console.error("Error fetching training topics:", err);
      setError(err.message || "Failed to load training topics");
      toast.error(err.message || "Failed to load training topics"); // Notify user
      setTopics([]); // Clear topics on error
    } finally {
      setLoading(false); // Ensure loading state is turned off
    }
  }, [itemId, planId, itemType, fetchRequirement]); // Dependencies for useCallback

  // Adds a new training topic
  const addTopic = async (topicText: string): Promise<boolean> => {
    // Guard clause: ensure necessary parameters are present
    if (itemId === undefined || planId === undefined || !itemType || !topicText.trim()) {
        toast.error("Cannot add topic: Missing information or empty text.");
        return false;
    }

    try {
      let currentRequirementId = requirementId;

      // If requirement ID isn't already known (e.g., first topic being added)
      // try to fetch or create the requirement
      if (!currentRequirementId) {
        console.log("Requirement ID not found in state, attempting to fetch or create...");
        const fetchedReqId = await fetchRequirement();

        if (fetchedReqId) {
          currentRequirementId = fetchedReqId;
          setRequirementId(currentRequirementId); // Update state
          console.log("Found existing requirement ID:", currentRequirementId);
        } else {
          // Requirement doesn't exist, so create it
          console.log("Existing requirement not found, creating new one...");
          const tableName = itemType === "machine" ? 'machine_training_requirements' : 'software_training_requirements';
          const columnName = itemType === "machine" ? 'machine_type_id' : 'software_type_id';

          // Explicitly type the expected response when creating a requirement
          const { data: newReqData, error: reqError } = await supabase
            .from(tableName)
            .insert({
              [columnName]: itemId,
              plan_id: planId,
              // resource_id: null // Assuming this is nullable or defaults
            })
            .select('id') // Select the ID of the newly created row
            .single(); // Expecting exactly one row back

          if (reqError) throw reqError; // Throw if requirement creation fails
          if (!newReqData?.id) throw new Error("Failed to create or retrieve requirement ID.");

          currentRequirementId = newReqData.id;
          setRequirementId(currentRequirementId); // Update state with new ID
          console.log("Created new requirement ID:", currentRequirementId);
        }
      }

      // Now we have a requirement_id, so prepare the new topic object
      const newTopicData: NewTopicInsert = {
        requirement_id: currentRequirementId,
        plan_id: planId,
        topic_text: topicText.trim(),
        item_type: itemType,
        updated_at: new Date().toISOString(),
        display_order: null,
        machine_type_id: itemType === "machine" ? itemId : null,
        software_type_id: itemType === "software" ? itemId : null,
      };

      // Insert the new topic
      // Explicitly type the expected response (a single TrainingTopic object)
      const { data: insertedTopicData, error: insertError } = await supabase
        .from('training_topics')
        .insert(newTopicData)
        .select() // Select all columns of the inserted row
        .single(); // Expect exactly one row back

      if (insertError) throw insertError; // Throw if insertion fails
      if (!insertedTopicData) throw new Error("Failed to add topic or retrieve inserted data.");

      console.log("Topic added successfully:", insertedTopicData);

      // Add the fully formed topic (matching TrainingTopic interface) to the local state
      const addedTopic: TrainingTopic = {
        ...insertedTopicData,
        // Ensure nullability and item_type are correctly set from returned data or defaults
        machine_type_id: insertedTopicData.machine_type_id ?? null,
        software_type_id: insertedTopicData.software_type_id ?? null,
        plan_id: insertedTopicData.plan_id ?? planId, // Default to current planId if needed
        item_type: insertedTopicData.item_type as "machine" | "software" ?? itemType, // Default to current itemType
      };

      setTopics(prev => [...prev, addedTopic]); // Add to existing topics
      toast.success("Training topic added successfully!");
      return true;

    } catch (err: any) {
      console.error("Error adding training topic:", err);
      toast.error(err.message || "Failed to add training topic");
      return false;
    }
  };

  // Updates an existing training topic's text
  const updateTopic = async (topicId: number, topicText: string): Promise<boolean> => {
     if (!topicText.trim()) {
        toast.error("Topic text cannot be empty.");
        return false;
    }
    try {
      // Explicitly type the response (we don't need data back, just success/error)
      const { error: updateError } = await supabase
        .from('training_topics')
        .update({
          topic_text: topicText.trim(),
          updated_at: new Date().toISOString() // Update timestamp
        })
        .eq('topic_id', topicId); // Match the specific topic ID

      if (updateError) throw updateError; // Throw if update fails

      // Update the topic in the local state
      setTopics(prev => prev.map(topic =>
        topic.topic_id === topicId
        ? { ...topic, topic_text: topicText.trim(), updated_at: new Date().toISOString() }
        : topic
      ));

      toast.success("Training topic updated.");
      return true;

    } catch (err: any) {
      console.error("Error updating training topic:", err);
      toast.error(err.message || "Failed to update training topic");
      return false;
    }
  };

  // Deletes a specific training topic by its ID
  const deleteTopic = async (topicId: number): Promise<boolean> => {
    try {
      // Explicitly type the response
      const { error: deleteError } = await supabase
        .from('training_topics')
        .delete()
        .eq('topic_id', topicId); // Match the specific topic ID

      if (deleteError) throw deleteError; // Throw if delete fails

      // Remove the topic from the local state
      setTopics(prev => prev.filter(topic => topic.topic_id !== topicId));
      toast.success("Training topic deleted.");
      return true;

    } catch (err: any) {
      console.error("Error deleting training topic:", err);
      toast.error(err.message || "Failed to delete training topic");
      return false;
    }
  };

  // Deletes ALL topics associated with a specific machine or software item ID
  // NOTE: This is a destructive operation and does not care about planId. Use with caution.
  const deleteTopicsByItemId = async (itemIdToDelete: number, itemTypeToDelete: "machine" | "software"): Promise<boolean> => {
     if (itemIdToDelete === undefined || !itemTypeToDelete) {
        console.error("Cannot delete topics: Missing item ID or type.");
        return false;
     }
    try {
      const columnName = itemTypeToDelete === "machine" ? 'machine_type_id' : 'software_type_id';
      console.warn(`Attempting to delete ALL training topics for ${itemTypeToDelete} ID: ${itemIdToDelete}`);

      // Explicitly type the response
      const { error: deleteError } = await supabase
        .from('training_topics')
        .delete()
        .eq(columnName, itemIdToDelete); // Match all topics for this item ID

      if (deleteError) throw deleteError; // Throw if delete fails

      // If the deleted item ID and type match the currently viewed ones, clear the local state
      if (itemIdToDelete === itemId && itemTypeToDelete === itemType) {
         setTopics([]);
      }
      toast.success(`All training topics for ${itemTypeToDelete} ${itemIdToDelete} deleted.`);
      return true;

    } catch (err: any) {
      console.error(`Error deleting training topics for ${itemTypeToDelete} ${itemIdToDelete}:`, err);
      toast.error(err.message || `Failed to delete training topics for ${itemTypeToDelete}`);
      return false;
    }
  };

  // Effect hook to fetch topics when item ID, plan ID, or item type changes
  useEffect(() => {
    // Check if parameters are valid before fetching
    if (itemId !== undefined && planId !== undefined && itemType) {
       fetchTopics();
    } else {
       // Clear state if parameters become invalid/undefined
       setTopics([]);
       setLoading(false);
       setError(null);
       setRequirementId(null);
    }
  // fetchTopics is wrapped in useCallback, include it in the dependency array
  }, [itemId, planId, itemType, fetchTopics]);

  // Return the state and action functions from the hook
  return {
    topics,
    loading,
    error,
    requirementId, // Expose the requirement ID if needed elsewhere
    fetchTopics,   // Expose fetchTopics if manual refetch is needed
    addTopic,
    updateTopic,
    deleteTopic,
    deleteTopicsByItemId // Expose the bulk delete function
  };
};
