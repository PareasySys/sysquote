
import React, { useState } from "react";
import { useSoftwareTypes, SoftwareType } from "@/hooks/useSoftwareTypes";
import { Button } from "@/components/ui/button";
import { TextShimmerWave } from "@/components/ui/text-shimmer-wave";
import SoftwareTypeCard from "@/components/software/SoftwareTypeCard";
import SoftwareTypeModal from "@/components/software/SoftwareTypeModal";
import { Plus } from "lucide-react";

const SoftwareTypesTab = () => {
  const { software, loading, error, fetchSoftware } = useSoftwareTypes();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSoftware, setSelectedSoftware] = useState<SoftwareType | null>(null);

  const handleAddNew = () => {
    setSelectedSoftware(null);
    setIsModalOpen(true);
  };

  const handleEdit = (softwareItem: SoftwareType) => {
    setSelectedSoftware(softwareItem);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedSoftware(null);
  };

  const handleSave = () => {
    fetchSoftware();
  };

  if (loading) {
    return (
      <div className="p-4">
        <TextShimmerWave
          className="[--base-color:#a1a1aa] [--base-gradient-color:#ffffff] text-lg"
          duration={1}
          spread={1}
          zDistance={1}
          scaleDistance={1.1}
          rotateYDistance={10}
        >
          Loading Software Types
        </TextShimmerWave>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-900/50 border border-red-700/50 rounded-lg text-center">
        <p className="text-red-300">{error}</p>
        <Button 
          onClick={() => fetchSoftware()} 
          variant="outline" 
          className="mt-2 text-blue-300 border-blue-800 hover:bg-blue-900/50"
        >
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 h-full">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-100">Software Types</h2>
        <Button className="bg-blue-700 hover:bg-blue-800 text-white" onClick={handleAddNew}>
          <Plus className="h-4 w-4 mr-2" />
          Add New Software Type
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {/* Add New Card */}
        <SoftwareTypeCard isAddCard onAddNew={handleAddNew} />
        
        {/* Software Type Cards */}
        {software.map((softwareItem) => (
          <SoftwareTypeCard 
            key={softwareItem.software_type_id} 
            software={softwareItem} 
            onEdit={() => handleEdit(softwareItem)}
          />
        ))}
      </div>

      {/* Modal for adding/editing software types */}
      <SoftwareTypeModal
        open={isModalOpen}
        onClose={handleCloseModal}
        software={selectedSoftware}
        onSave={handleSave}
      />
    </div>
  );
};

export default SoftwareTypesTab;
