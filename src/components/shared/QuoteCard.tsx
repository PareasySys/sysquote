
import { useNavigate } from "react-router-dom";
import { formatDate } from "@/utils/formatters";
import { FileText, Calendar } from "lucide-react";
import { Card } from "@/components/ui/card";

type QuoteCardProps = {
  quote_id: string;
  quote_name: string;
  client_name?: string;
  created_at: string;
};

const QuoteCard = ({ quote_id, quote_name, client_name, created_at }: QuoteCardProps) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/quote/${quote_id}/input`);
  };

  return (
    <Card
      onClick={handleClick}
      className="bg-sidebar p-6 rounded-lg border border-white/10 shadow-sm 
                hover:shadow-md transition-shadow cursor-pointer relative h-[250px] flex flex-col"
    >
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-gray-400" />
          <span className="font-medium text-lg text-gray-200">{quote_name}</span>
        </div>
        <button 
          className="p-1 h-auto text-gray-400 hover:text-gray-300"
          onClick={(e) => {
            e.stopPropagation();
            console.log("Delete quote", quote_id);
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
      
      <div className="space-y-3 flex-1">
        <div>
          <p className="text-sm text-gray-400">Client</p>
          <p className="font-medium text-gray-300">{client_name || "No client specified"}</p>
        </div>
        
        <div>
          <p className="text-sm text-gray-400">Area</p>
          <p className="font-medium text-gray-300">Europe</p>
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
