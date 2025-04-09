
export const formatDate = (dateString: string): string => {
  if (!dateString) return "Unknown date";
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "Invalid date";
  
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EUR",
  }).format(value);
};
