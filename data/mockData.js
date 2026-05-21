export const revenueData = [
  { month: "JAN", revenue: 28400, target: 25000 },
  { month: "FEB", revenue: 32100, target: 28000 },
  { month: "MAR", revenue: 29800, target: 30000 },
  { month: "APR", revenue: 35600, target: 32000 },
  { month: "MAY", revenue: 38200, target: 35000 },
  { month: "JUN", revenue: 42800, target: 38000 },
];

export const salesData = [
  { day: "Mon", sales: 4200 },
  { day: "Tue", sales: 5800 },
  { day: "Wed", sales: 3900 },
  { day: "Thu", sales: 6700 },
  { day: "Fri", sales: 8200 },
  { day: "Sat", sales: 9500 },
  { day: "Sun", sales: 4100 },
];

export const clients = [
  { id: "1", name: "Alexander Reid",  email: "a.reid@email.com",     phone: "+1 (555) 012-3456", visits: 24, spent: "$1,840", status: "VIP",     lastVisit: "Oct 12, 2024", barber: "Julian Vance",  initials: "AR" },
  { id: "2", name: "Marcus Chen",     email: "m.chen@email.com",     phone: "+1 (555) 987-6543", visits: 18, spent: "$1,240", status: "Regular", lastVisit: "Oct 10, 2024", barber: "Elias Thorne", initials: "MC" },
  { id: "3", name: "James Whitfield", email: "j.white@email.com",    phone: "+1 (555) 345-6789", visits: 31, spent: "$2,960", status: "VIP",     lastVisit: "Oct 14, 2024", barber: "Julian Vance",  initials: "JW" },
  { id: "4", name: "Noah Sterling",   email: "n.sterling@email.com", phone: "+1 (555) 654-3210", visits: 8,  spent: "$480",   status: "New",     lastVisit: "Oct 9, 2024",  barber: "Elias Thorne", initials: "NS" },
  { id: "5", name: "Oliver Hayes",    email: "o.hayes@email.com",    phone: "+1 (555) 111-2222", visits: 15, spent: "$980",   status: "Regular", lastVisit: "Oct 13, 2024", barber: "Julian Vance",  initials: "OH" },
  { id: "6", name: "Sebastian Cruz",  email: "s.cruz@email.com",     phone: "+1 (555) 333-4444", visits: 42, spent: "$3,420", status: "VIP",     lastVisit: "Oct 14, 2024", barber: "Julian Vance",  initials: "SC" },
];

export const stylists = [
  { id: "1", name: "Julian Vance",  role: "Senior Barber",   status: "Active",   bookings: 142, revenue: "$12,080", email: "j.vance@barber.com",  phone: "+1 (555) 100-2000", initials: "JV", specialties: ["Executive Cut", "Hot Towel Shave", "Beard Sculpting"] },
  { id: "2", name: "Elias Thorne",  role: "Master Barber",   status: "Active",   bookings: 118, revenue: "$9,440",  email: "e.thorne@barber.com", phone: "+1 (555) 200-3000", initials: "ET", specialties: ["Fade & Taper", "Charcoal Facial", "Hair Design"] },
  { id: "3", name: "Marcus Wolfe",  role: "Junior Barber",   status: "Active",   bookings: 64,  revenue: "$4,480",  email: "m.wolfe@barber.com",  phone: "+1 (555) 300-4000", initials: "MW", specialties: ["Classic Cut", "Beard Trim"] },
  { id: "4", name: "Dorian Knight", role: "Senior Barber",   status: "Inactive", bookings: 0,   revenue: "$0",      email: "d.knight@barber.com", phone: "+1 (555) 400-5000", initials: "DK", specialties: ["Scissor Cut", "Colour Treatment"] },
];

export const inventory = [
  { id: "1", name: "Matte Clay No. 04",    category: "STYLING",       price: "$42",  stock: 42, status: "in-stock" },
  { id: "2", name: "Sandalwood Balm",      category: "SHAVE & BEARD", price: "$38",  stock: 4,  status: "low-stock" },
  { id: "3", name: "Revitalizing Tonic",   category: "HAIR CARE",     price: "$55",  stock: 18, status: "in-stock" },
  { id: "4", name: "Heritage Shave Kit",   category: "EQUIPMENT",     price: "$185", stock: 12, status: "in-stock" },
  { id: "5", name: "Midnight Oud Splash",  category: "FRAGRANCE",     price: "$95",  stock: 2,  status: "low-stock" },
  { id: "6", name: "Black Seed Oil Serum", category: "HAIR CARE",     price: "$68",  stock: 0,  status: "out-of-stock" },
];

export const transactions = [
  { id: "TXN-8821", txnId: "TXN-8821", client: "Alexander Reid",  service: "Executive Cut & Style", barber: "Julian Vance",  amount: "$85",  date: "Oct 14, 3:22 PM",  method: "Card", status: "Completed" },
  { id: "TXN-8820", txnId: "TXN-8820", client: "James Whitfield", service: "Royal Hot Towel Shave", barber: "Julian Vance",  amount: "$120", date: "Oct 14, 2:10 PM",  method: "Cash", status: "Completed" },
  { id: "TXN-8819", txnId: "TXN-8819", client: "Sebastian Cruz",  service: "Beard Sculpting",       barber: "Elias Thorne", amount: "$65",  date: "Oct 14, 1:05 PM",  method: "Card", status: "Completed" },
  { id: "TXN-8818", txnId: "TXN-8818", client: "Noah Sterling",   service: "Executive Cut & Style", barber: "Elias Thorne", amount: "$85",  date: "Oct 14, 11:30 AM", method: "Card", status: "Refunded" },
  { id: "TXN-8817", txnId: "TXN-8817", client: "Marcus Chen",     service: "Charcoal Facial Detox", barber: "Julian Vance",  amount: "$140", date: "Oct 13, 4:55 PM",  method: "Card", status: "Completed" },
  { id: "TXN-8816", txnId: "TXN-8816", client: "Oliver Hayes",    service: "Executive Cut & Style", barber: "Julian Vance",  amount: "$85",  date: "Oct 13, 3:10 PM",  method: "Cash", status: "Completed" },
];

export const stockMovement = [
  { id: "1", product: "Matte Clay No. 04",   action: "Inventory Audit", date: "Oct 12, 2:45 PM", change: "+24", status: "Completed" },
  { id: "2", product: "Sandalwood Balm",     action: "Sale (Walk-in)",  date: "Oct 12, 1:12 PM", change: "-1",  status: "Low Level" },
  { id: "3", product: "Heritage Shave Kit",  action: "Damaged Goods",   date: "Oct 11, 4:30 PM", change: "-2",  status: "Adjusted" },
  { id: "4", product: "Midnight Oud Splash", action: "Restock Order",   date: "Oct 11, 9:00 AM", change: "+10", status: "Pending" },
];