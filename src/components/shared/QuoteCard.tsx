
import { useNavigate } from "react-router-dom";
import { formatDate } from "@/utils/formatters";

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
    <div
      onClick={handleClick}
      className="bg-gray-800 p-4 rounded-lg border border-gray-700 shadow-md 
                transition duration-200 ease-in-out hover:bg-gray-750 hover:scale-[1.02] 
                cursor-pointer"
    >
      <h3 className="text-lg font-semibold text-gray-200 mb-2">{quote_name}</h3>
      <p className="text-sm text-gray-400 mb-1">
        Client: {client_name || "No client specified"}
      </p>
      <p className="text-sm text-gray-400">
        Created: {formatDate(created_at)}
      </p>
    </div>
  );
};

export default QuoteCard;
