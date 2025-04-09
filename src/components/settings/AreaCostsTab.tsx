
import React, { useState } from "react";
import { useAreaCosts, AreaCost } from "@/hooks/useAreaCosts";
import { useAreaIcons } from "@/hooks/useAreaIcons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TextShimmerWave } from "@/components/ui/text-shimmer-wave";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import AreaCostModal from "@/components/area-costs/AreaCostModal";
import { Layout } from "lucide-react";
import { formatCurrency } from "@/utils/formatters";

const AreaCostsTab = () => {
  const { areaCosts, loading, error, fetchAreaCosts } = useAreaCosts();
  const { icons } = useAreaIcons();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAreaCost, setSelectedAreaCost] = useState<AreaCost | null>(null);

  const handleAddNew = () => {
    setSelectedAreaCost(null);
    setIsModalOpen(true);
  };

  const handleEdit = (areaCost: AreaCost) => {
    setSelectedAreaCost(areaCost);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedAreaCost(null);
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
          Loading Area Costs
        </TextShimmerWave>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-900/50 border border-red-700/50 rounded-lg text-center">
        <p className="text-red-300">{error}</p>
        <Button 
          onClick={() => fetchAreaCosts()} 
          variant="outline" 
          className="mt-2 text-blue-300 border-blue-800 hover:bg-blue-900/50"
        >
          Try Again
        </Button>
      </div>
    );
  }

  // Find the icon URL from the icons list using area icon_name
  const getIconUrl = (iconName?: string) => {
    if (!iconName) return null;
    return icons.find(icon => icon.name === iconName)?.url || null;
  };

  return (
    <div className="p-6 h-full">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-100">Area Costs</h2>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {/* Add New Card */}
        <div className="w-full">
          <AspectRatio ratio={3/4} className="w-full">
            <Card 
              onClick={handleAddNew}
              className="group cursor-pointer overflow-hidden transition-all duration-300 hover:shadow-xl bg-gradient-to-br from-slate-700/70 to-slate-900/70 border-dashed border-slate-600/50 flex flex-col items-center justify-center h-full w-full"
            >
              <div className="p-4 text-center flex flex-col items-center">
                <svg 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="w-12 h-12 mb-3 mx-auto"
                >
                  <g id="SVGRepo_iconCarrier">
                    <path fillRule="evenodd" clipRule="evenodd" d="M3.75 4.5L4.5 3.75H10.5L11.25 4.5V10.5L10.5 11.25H4.5L3.75 10.5V4.5ZM5.25 5.25V9.75H9.75V5.25H5.25ZM13.5 3.75L12.75 4.5V10.5L13.5 11.25H19.5L20.25 10.5V4.5L19.5 3.75H13.5ZM14.25 9.75V5.25H18.75V9.75H14.25ZM17.25 20.25H15.75V17.25H12.75V15.75H15.75V12.75H17.25V15.75H20.25V17.25H17.25V20.25ZM4.5 12.75L3.75 13.5V19.5L4.5 20.25H10.5L11.25 19.5V13.5L10.5 12.75H4.5ZM5.25 18.75V14.25H9.75V18.75H5.25Z" fill="#ffffff"></path>
                  </g>
                </svg>
                <h3 className="text-sm font-medium text-gray-200 mb-1">Add New Area Cost</h3>
                <p className="text-gray-400 text-xs">Click to add a new area cost</p>
              </div>
            </Card>
          </AspectRatio>
        </div>
        
        {/* Area Cost Cards */}
        {areaCosts.map((areaCost) => (
          <div key={areaCost.area_cost_id} className="w-full">
            <AspectRatio ratio={3/4} className="w-full">
              <Card className="relative overflow-hidden h-full cursor-default w-full border-0">
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent z-10"></div>
                
                <div className="bg-slate-800 w-full h-full flex items-center justify-center">
                  {areaCost.icon_name && getIconUrl(areaCost.icon_name) ? (
                    <img 
                      src={getIconUrl(areaCost.icon_name)} 
                      alt={areaCost.area_name} 
                      className="w-full h-full object-contain p-8"
                      onError={(e) => {
                        console.error(`Error loading icon: ${getIconUrl(areaCost.icon_name!)}`);
                        const target = e.target as HTMLImageElement;
                        target.src = "/placeholder.svg";
                      }}
                    />
                  ) : (
                    <Layout className="text-slate-500 w-16 h-16" />
                  )}
                </div>
                
                <div className="absolute bottom-0 left-0 right-0 p-2 z-20">
                  <h3 className="text-sm font-semibold text-white mb-1">{areaCost.area_name}</h3>
                  <div className="text-xl font-bold text-center text-gray-200">
                    {formatCurrency(areaCost.daily_accommodation_food_cost)}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">accommodation & food/day</div>
                </div>
                
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute top-1 right-1 bg-slate-800/60 hover:bg-slate-700 z-20 h-8 w-8"
                  onClick={() => handleEdit(areaCost)}
                >
                  <svg 
                    viewBox="0 0 24 24" 
                    xmlns="http://www.w3.org/2000/svg" 
                    className="h-4 w-4"
                  >
                    <g id="SVGRepo_iconCarrier">
                      <g id="Complete">
                        <g id="edit">
                          <g>
                            <path d="M20,16v4a2,2,0,0,1-2,2H4a2,2,0,0,1-2-2V6A2,2,0,0,1,4,4H8" fill="none" stroke="#ffffff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                            <polygon fill="none" points="12.5 15.8 22 6.2 17.8 2 8.3 11.5 8 16 12.5 15.8" stroke="#ffffff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></polygon>
                          </g>
                        </g>
                      </g>
                    </g>
                  </svg>
                </Button>
              </Card>
            </AspectRatio>
          </div>
        ))}
      </div>

      {areaCosts.length === 0 && (
        <div className="text-center py-10 mt-4">
          <p className="text-gray-400">No area costs available. Add your first one to get started.</p>
        </div>
      )}

      {/* Modal for adding/editing area costs */}
      <AreaCostModal
        open={isModalOpen}
        onClose={handleCloseModal}
        areaCost={selectedAreaCost}
        onSave={fetchAreaCosts}
      />
    </div>
  );
};

export default AreaCostsTab;
