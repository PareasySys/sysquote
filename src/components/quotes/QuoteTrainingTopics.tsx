
import React, { useState } from "react";
import { useTrainingTopics } from "@/hooks/useTrainingTopics";
import { useTrainingPlans } from "@/hooks/useTrainingPlans";
import { useSoftwareTypes } from "@/hooks/useSoftwareTypes";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TextShimmerWave } from "@/components/ui/text-shimmer-wave";
import { HardDrive, Database, ListChecks } from "lucide-react";
import { QuoteMachine } from "@/hooks/useQuoteMachines";

interface QuoteTrainingTopicsProps {
  selectedMachines: QuoteMachine[];
}

const QuoteTrainingTopics: React.FC<QuoteTrainingTopicsProps> = ({ selectedMachines }) => {
  const { plans, loading: plansLoading } = useTrainingPlans();
  const { software, loading: softwareLoading } = useSoftwareTypes();
  const [selectedMachineId, setSelectedMachineId] = useState<number | null>(null);
  const [selectedSoftwareId, setSelectedSoftwareId] = useState<number | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<string>("machines");
  
  // Set default selected machine if available
  React.useEffect(() => {
    if (selectedMachines.length > 0 && !selectedMachineId) {
      setSelectedMachineId(selectedMachines[0].machine_type_id);
    }
  }, [selectedMachines, selectedMachineId]);

  // Set default selected software if available
  React.useEffect(() => {
    if (software.length > 0 && !selectedSoftwareId) {
      setSelectedSoftwareId(software[0].software_type_id);
    }
  }, [software, selectedSoftwareId]);

  // Set default selected plan if available
  React.useEffect(() => {
    if (plans.length > 0 && !selectedPlanId) {
      setSelectedPlanId(plans[0].plan_id);
    }
  }, [plans, selectedPlanId]);

  const { 
    topics: machineTopics, 
    loading: machineTopicsLoading 
  } = useTrainingTopics(
    selectedMachineId || undefined, 
    selectedPlanId || undefined,
    "machine"
  );

  const { 
    topics: softwareTopics, 
    loading: softwareTopicsLoading 
  } = useTrainingTopics(
    selectedSoftwareId || undefined, 
    selectedPlanId || undefined,
    "software"
  );

  if (plansLoading || softwareLoading) {
    return (
      <Card className="bg-slate-800/80 border border-white/5 p-4">
        <div className="p-4 text-center">
          <TextShimmerWave
            className="[--base-color:#a1a1aa] [--base-gradient-color:#ffffff] text-lg"
            duration={1}
            spread={1}
            zDistance={1}
            scaleDistance={1.1}
            rotateYDistance={10}
          >
            Loading Training Data
          </TextShimmerWave>
        </div>
      </Card>
    );
  }

  const renderNoSelection = (type: string) => (
    <Card className="bg-slate-800/80 border border-white/5 p-4">
      <div className="text-gray-400 p-4 text-center border border-dashed border-gray-700 rounded-lg">
        {type === "machines" ? (
          selectedMachines.length === 0 ? (
            "No machines selected. Please add machines to view training topics."
          ) : (
            "Select a machine and plan to view training topics."
          )
        ) : (
          "Select software and plan to view training topics."
        )}
      </div>
    </Card>
  );

  return (
    <Card className="bg-slate-800/80 border border-white/5 p-4">
      <h2 className="text-xl font-semibold mb-4 text-gray-200 flex items-center gap-2">
        <ListChecks className="h-5 w-5 text-blue-400" />
        Training Topics
      </h2>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4">
        <TabsList className="bg-slate-700/50 mb-2">
          <TabsTrigger 
            value="machines" 
            className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
          >
            Machine Topics
          </TabsTrigger>
          <TabsTrigger 
            value="software" 
            className="data-[state=active]:bg-green-600 data-[state=active]:text-white"
          >
            Software Topics
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="machines" className="mt-0">
          {selectedMachines.length === 0 ? (
            renderNoSelection("machines")
          ) : (
            <>
              {/* Machine selection tabs */}
              <Tabs 
                value={selectedMachineId?.toString()} 
                onValueChange={(value) => setSelectedMachineId(parseInt(value))}
                className="mb-4"
              >
                <TabsList className="bg-slate-700/50 mb-2">
                  {selectedMachines.map(machine => (
                    <TabsTrigger 
                      key={machine.machine_type_id} 
                      value={machine.machine_type_id.toString()}
                      className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                    >
                      <span className="flex items-center gap-1.5">
                        <HardDrive className="h-4 w-4" />
                        {machine.name}
                      </span>
                    </TabsTrigger>
                  ))}
                </TabsList>

                {selectedMachines.map(machine => (
                  <TabsContent 
                    key={machine.machine_type_id} 
                    value={machine.machine_type_id.toString()}
                    className="mt-0"
                  >
                    {/* Plan selection tabs */}
                    <Tabs 
                      value={selectedPlanId?.toString()} 
                      onValueChange={(value) => setSelectedPlanId(parseInt(value))}
                    >
                      <TabsList className="bg-slate-700/30 mb-4">
                        {plans.map(plan => (
                          <TabsTrigger 
                            key={plan.plan_id} 
                            value={plan.plan_id.toString()}
                            className="data-[state=active]:bg-green-600/60 data-[state=active]:text-white"
                          >
                            {plan.name}
                          </TabsTrigger>
                        ))}
                      </TabsList>

                      {plans.map(plan => (
                        <TabsContent 
                          key={plan.plan_id} 
                          value={plan.plan_id.toString()}
                          className="mt-0"
                        >
                          <Card className="bg-slate-700/30 border-slate-600/30">
                            <CardContent className="p-4">
                              {machineTopicsLoading ? (
                                <div className="p-4 text-center">
                                  <TextShimmerWave
                                    className="[--base-color:#a1a1aa] [--base-gradient-color:#ffffff] text-sm"
                                    duration={1}
                                    spread={1}
                                    zDistance={1}
                                    scaleDistance={1.1}
                                    rotateYDistance={10}
                                  >
                                    Loading Topics...
                                  </TextShimmerWave>
                                </div>
                              ) : machineTopics.length === 0 ? (
                                <div className="text-gray-400 p-2 text-center">
                                  No training topics found for this machine and plan.
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  <ul className="list-disc list-inside space-y-2 pl-2">
                                    {machineTopics.map((topic) => (
                                      <li key={topic.topic_id} className="text-gray-200">
                                        {topic.topic_text}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        </TabsContent>
                      ))}
                    </Tabs>
                  </TabsContent>
                ))}
              </Tabs>
            </>
          )}
        </TabsContent>
        
        <TabsContent value="software" className="mt-0">
          {/* Software selection tabs */}
          <Tabs 
            value={selectedSoftwareId?.toString()} 
            onValueChange={(value) => setSelectedSoftwareId(parseInt(value))}
            className="mb-4"
          >
            <TabsList className="bg-slate-700/50 mb-2">
              {software.map(softwareItem => (
                <TabsTrigger 
                  key={softwareItem.software_type_id} 
                  value={softwareItem.software_type_id.toString()}
                  className="data-[state=active]:bg-green-600 data-[state=active]:text-white"
                >
                  <span className="flex items-center gap-1.5">
                    <Database className="h-4 w-4" />
                    {softwareItem.name}
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>

            {software.map(softwareItem => (
              <TabsContent 
                key={softwareItem.software_type_id} 
                value={softwareItem.software_type_id.toString()}
                className="mt-0"
              >
                {/* Plan selection tabs */}
                <Tabs 
                  value={selectedPlanId?.toString()} 
                  onValueChange={(value) => setSelectedPlanId(parseInt(value))}
                >
                  <TabsList className="bg-slate-700/30 mb-4">
                    {plans.map(plan => (
                      <TabsTrigger 
                        key={plan.plan_id} 
                        value={plan.plan_id.toString()}
                        className="data-[state=active]:bg-blue-600/60 data-[state=active]:text-white"
                      >
                        {plan.name}
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  {plans.map(plan => (
                    <TabsContent 
                      key={plan.plan_id} 
                      value={plan.plan_id.toString()}
                      className="mt-0"
                    >
                      <Card className="bg-slate-700/30 border-slate-600/30">
                        <CardContent className="p-4">
                          {softwareTopicsLoading ? (
                            <div className="p-4 text-center">
                              <TextShimmerWave
                                className="[--base-color:#a1a1aa] [--base-gradient-color:#ffffff] text-sm"
                                duration={1}
                                spread={1}
                                zDistance={1}
                                scaleDistance={1.1}
                                rotateYDistance={10}
                              >
                                Loading Topics...
                              </TextShimmerWave>
                            </div>
                          ) : softwareTopics.length === 0 ? (
                            <div className="text-gray-400 p-2 text-center">
                              No training topics found for this software and plan.
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <ul className="list-disc list-inside space-y-2 pl-2">
                                {softwareTopics.map((topic) => (
                                  <li key={topic.topic_id} className="text-gray-200">
                                    {topic.topic_text}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </TabsContent>
                  ))}
                </Tabs>
              </TabsContent>
            ))}
          </Tabs>
        </TabsContent>
      </Tabs>
    </Card>
  );
};

export default QuoteTrainingTopics;
