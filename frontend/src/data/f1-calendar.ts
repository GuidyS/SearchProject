export interface F1Race {
  round: number;
  name: string;
  country: string;
  circuit: string;
  circuitId?: string;
  date: string;
  flag: string;
  flagImg: string;
  month: string;
  days: string;
}

export const f1Calendar2025: F1Race[] = [
  { round: 1, name: "Australian Grand Prix", country: "Australia", circuit: "Albert Park", date: "2025-03-16", flag: "🇦🇺", flagImg: "au", month: "MAR", days: "16" },
  { round: 2, name: "Chinese Grand Prix", country: "China", circuit: "Shanghai", date: "2025-03-23", flag: "🇨🇳", flagImg: "cn", month: "MAR", days: "23" },
  { round: 3, name: "Japanese Grand Prix", country: "Japan", circuit: "Suzuka", date: "2025-04-06", flag: "🇯🇵", flagImg: "jp", month: "APR", days: "06" },
  { round: 4, name: "Bahrain Grand Prix", country: "Bahrain", circuit: "Sakhir", date: "2025-04-13", flag: "🇧🇭", flagImg: "bh", month: "APR", days: "13" },
  { round: 5, name: "Saudi Arabian Grand Prix", country: "Saudi Arabia", circuit: "Jeddah", date: "2025-04-20", flag: "🇸🇦", flagImg: "sa", month: "APR", days: "20" },
  { round: 6, name: "Miami Grand Prix", country: "United States", circuit: "Miami", date: "2025-05-04", flag: "🇺🇸", flagImg: "us", month: "MAY", days: "04" },
  { round: 7, name: "Emilia Romagna Grand Prix", country: "Italy", circuit: "Imola", date: "2025-05-18", flag: "🇮🇹", flagImg: "it", month: "MAY", days: "18" },
  { round: 8, name: "Monaco Grand Prix", country: "Monaco", circuit: "Monte Carlo", date: "2025-05-25", flag: "🇲🇨", flagImg: "mc", month: "MAY", days: "25" },
  { round: 9, name: "Spanish Grand Prix", country: "Spain", circuit: "Barcelona", date: "2025-06-01", flag: "🇪🇸", flagImg: "es", month: "JUN", days: "01" },
  { round: 10, name: "Canadian Grand Prix", country: "Canada", circuit: "Montreal", date: "2025-06-15", flag: "🇨🇦", flagImg: "ca", month: "JUN", days: "15" },
  { round: 11, name: "Austrian Grand Prix", country: "Austria", circuit: "Spielberg", date: "2025-06-29", flag: "🇦🇹", flagImg: "at", month: "JUN", days: "29" },
  { round: 12, name: "British Grand Prix", country: "Great Britain", circuit: "Silverstone", date: "2025-07-06", flag: "🇬🇧", flagImg: "gb", month: "JUL", days: "06" },
  { round: 13, name: "Belgian Grand Prix", country: "Belgium", circuit: "Spa-Francorchamps", date: "2025-07-27", flag: "🇧🇪", flagImg: "be", month: "JUL", days: "27" },
  { round: 14, name: "Hungarian Grand Prix", country: "Hungary", circuit: "Budapest", date: "2025-08-03", flag: "🇭🇺", flagImg: "hu", month: "AUG", days: "03" },
  { round: 15, name: "Dutch Grand Prix", country: "Netherlands", circuit: "Zandvoort", date: "2025-08-31", flag: "🇳🇱", flagImg: "nl", month: "AUG", days: "31" },
  { round: 16, name: "Italian Grand Prix", country: "Italy", circuit: "Monza", date: "2025-09-07", flag: "🇮🇹", flagImg: "it", month: "SEP", days: "07" },
  { round: 17, name: "Azerbaijan Grand Prix", country: "Azerbaijan", circuit: "Baku", date: "2025-09-21", flag: "🇦🇿", flagImg: "az", month: "SEP", days: "21" },
  { round: 18, name: "Singapore Grand Prix", country: "Singapore", circuit: "Marina Bay", date: "2025-10-05", flag: "🇸🇬", flagImg: "sg", month: "OCT", days: "05" },
  { round: 19, name: "United States Grand Prix", country: "United States", circuit: "Austin", date: "2025-10-19", flag: "🇺🇸", flagImg: "us", month: "OCT", days: "19" },
  { round: 20, name: "Mexico City Grand Prix", country: "Mexico", circuit: "Mexico City", date: "2025-10-26", flag: "🇲🇽", flagImg: "mx", month: "OCT", days: "26" },
  { round: 21, name: "São Paulo Grand Prix", country: "Brazil", circuit: "Interlagos", date: "2025-11-09", flag: "🇧🇷", flagImg: "br", month: "NOV", days: "09" },
  { round: 22, name: "Las Vegas Grand Prix", country: "United States", circuit: "Las Vegas", date: "2025-11-22", flag: "🇺🇸", flagImg: "us", month: "NOV", days: "22" },
  { round: 23, name: "Qatar Grand Prix", country: "Qatar", circuit: "Lusail", date: "2025-11-30", flag: "🇶🇦", flagImg: "qa", month: "NOV", days: "30" },
  { round: 24, name: "Abu Dhabi Grand Prix", country: "Abu Dhabi", circuit: "Yas Marina", date: "2025-12-07", flag: "🇦🇪", flagImg: "ae", month: "DEC", days: "07" },
];

export function getUpcomingRace(): F1Race {
  const now = new Date();
  const upcoming = f1Calendar2025.find(r => new Date(r.date) >= now);
  return upcoming || f1Calendar2025[f1Calendar2025.length - 1];
}
