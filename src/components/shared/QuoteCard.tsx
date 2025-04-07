
import { useNavigate } from "react-router-dom";
import { formatDate } from "@/utils/formatters";
import { FileText, Calendar, Trash2, MapPin } from "lucide-react";
import { Card } from "@/components/ui/card";

type QuoteCardProps = {
  quote_id: string;
  quote_name: string;
  client_name?: string;
  area_name?: string;
  created_at: string;
};

const QuoteCard = ({ quote_id, quote_name, client_name, area_name, created_at }: QuoteCardProps) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/quote/${quote_id}/input`);
  };

  return (
    <Card
      onClick={handleClick}
      className="bg-slate-800/80 p-6 rounded-lg border border-white/5 shadow-sm 
                hover:shadow-md hover:bg-slate-700/80 transition-all cursor-pointer relative h-[220px] flex flex-col"
    >
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-gray-400" />
          <span className="font-medium text-lg text-gray-200">{quote_name}</span>
        </div>
        <button 
          className="p-1 h-auto text-gray-400 hover:text-red-400 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            console.log("Delete quote", quote_id);
          }}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      
      <div className="space-y-3 flex-1">
        <div>
          <p className="text-sm text-gray-400">Client</p>
          <p className="font-medium text-gray-300">{client_name || "No client specified"}</p>
        </div>
        
        <div>
          <p className="text-sm text-gray-400">Area</p>
          <p className="font-medium text-gray-300 flex items-center gap-1">
            {area_name ? (
              <>
                <MapPin className="h-3 w-3" /> 
                {area_name}
              </>
            ) : "Not specified"}
          </p>
        </div>
      </div>
      
      <div className="flex items-center mt-4 text-sm text-gray-400">
        <Calendar className="h-4 w-4 mr-1" />
        Created {formatDate(created_at)}
      </div>
    </Card>
  );
};

export default QuoteCard;
