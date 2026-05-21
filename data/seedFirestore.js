import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

const clients = [
  { name: "Alexander Reid",  email: "a.reid@email.com",     phone: "+1 (555) 012-3456", visits: 24, spent: "$1,840", status: "VIP",     lastVisit: "Oct 12, 2024", barber: "Julian Vance",  initials: "AR" },
  { name: "Marcus Chen",     email: "m.chen@email.com",     phone: "+1 (555) 987-6543", visits: 18, spent: "$1,240", status: "Regular",  lastVisit: "Oct 10, 2024", barber: "Elias Thorne", initials: "MC" },
  { name: "James Whitfield", email: "j.white@email.com",    phone: "+1 (555) 345-6789", visits: 31, spent: "$2,960", status: "VIP",     lastVisit: "Oct 14, 2024", barber: "Julian Vance",  initials: "JW" },
  { name: "Noah Sterling",   email: "n.sterling@email.com", phone: "+1 (555) 654-3210", visits: 8,  spent: "$480",   status: "New",     lastVisit: "Oct 9, 2024",  barber: "Elias Thorne", initials: "NS" },
  { name: "Oliver Hayes",    email: "o.hayes@email.com",    phone: "+1 (555) 111-2222", visits: 15, spent: "$980",   status: "Regular",  lastVisit: "Oct 13, 2024", barber: "Julian Vance",  initials: "OH" },
  { name: "Sebastian Cruz",  email: "s.cruz@email.com",     phone: "+1 (555) 333-4444", visits: 42, spent: "$3,420", status: "VIP",     lastVisit: "Oct 14, 2024", barber: "Julian Vance",  initials: "SC" },
];

const stylists = [
  { name: "Julian Vance",  role: "Master Stylist", phone: "+1 (555) 200-0001", email: "julian@theparlour.com", bookings: 42, revenue: "$14,200", status: "Active",   initials: "JV", specialties: ["Executive Cut", "Hot Towel Shave", "Beard Sculpting"] },
  { name: "Elias Thorne",  role: "Creative Lead",  phone: "+1 (555) 200-0002", email: "elias@theparlour.com",  bookings: 38, revenue: "$9,800",  status: "Active",   initials: "ET", specialties: ["Facial Detox", "Executive Cut", "Beard Sculpting"]   },
  { name: "Marcus Webb",   role: "Junior Stylist", phone: "+1 (555) 200-0003", email: "marcus@theparlour.com", bookings: 12, revenue: "$3,100",  status: "Active",   initials: "MW", specialties: ["Executive Cut", "Beard Sculpting"]                   },
  { name: "Dean Holloway", role: "Junior Stylist", phone: "+1 (555) 200-0004", email: "dean@theparlour.com",   bookings: 0,  revenue: "$0",      status: "Inactive", initials: "DH", specialties: ["Executive Cut"]                                       },
];

const inventory = [
  { name: "Matte Clay No. 04",    category: "STYLING",       price: "$42",  stock: 42, status: "in-stock"     },
  { name: "Sandalwood Balm",      category: "SHAVE & BEARD", price: "$38",  stock: 4,  status: "low-stock"    },
  { name: "Revitalizing Tonic",   category: "HAIR CARE",     price: "$55",  stock: 18, status: "in-stock"     },
  { name: "Heritage Shave Kit",   category: "EQUIPMENT",     price: "$185", stock: 12, status: "in-stock"     },
  { name: "Midnight Oud Splash",  category: "FRAGRANCE",     price: "$95",  stock: 2,  status: "low-stock"    },
  { name: "Black Seed Oil Serum", category: "HAIR CARE",     price: "$68",  stock: 0,  status: "out-of-stock" },
];

const transactions = [
  { txnId: "TXN-8821", client: "Alexander Reid",  service: "Executive Cut & Style", barber: "Julian Vance",  amount: "$85",  date: "Oct 14, 3:22 PM",  method: "Card", status: "Completed" },
  { txnId: "TXN-8820", client: "James Whitfield", service: "Royal Hot Towel Shave", barber: "Julian Vance",  amount: "$120", date: "Oct 14, 2:10 PM",  method: "Cash", status: "Completed" },
  { txnId: "TXN-8819", client: "Sebastian Cruz",  service: "Beard Sculpting",       barber: "Elias Thorne", amount: "$65",  date: "Oct 14, 1:05 PM",  method: "Card", status: "Completed" },
  { txnId: "TXN-8818", client: "Noah Sterling",   service: "Executive Cut & Style", barber: "Elias Thorne", amount: "$85",  date: "Oct 14, 11:30 AM", method: "Card", status: "Refunded"  },
  { txnId: "TXN-8817", client: "Marcus Chen",     service: "Charcoal Facial Detox", barber: "Julian Vance",  amount: "$140", date: "Oct 13, 4:55 PM",  method: "Card", status: "Completed" },
  { txnId: "TXN-8816", client: "Oliver Hayes",    service: "Executive Cut & Style", barber: "Julian Vance",  amount: "$85",  date: "Oct 13, 3:10 PM",  method: "Cash", status: "Completed" },
];

const stockMovement = [
  { product: "Matte Clay No. 04",   action: "Inventory Audit", date: "Oct 12, 2:45 PM", change: "+24", status: "Completed" },
  { product: "Sandalwood Balm",     action: "Sale (Walk-in)",  date: "Oct 12, 1:12 PM", change: "-1",  status: "Low Level" },
  { product: "Heritage Shave Kit",  action: "Damaged Goods",   date: "Oct 11, 4:30 PM", change: "-2",  status: "Adjusted"  },
  { product: "Midnight Oud Splash", action: "Restock Order",   date: "Oct 11, 9:00 AM", change: "+10", status: "Pending"   },
];

const seedCollection = async (name, rows) => {
  console.log(`Seeding ${name}…`);
  for (const row of rows) {
    await addDoc(collection(db, name), { ...row, createdAt: serverTimestamp() });
  }
  console.log(`✅ ${name} done (${rows.length} docs)`);
};

export const seedAll = async () => {
  try {
    await seedCollection("clients",       clients);
    await seedCollection("stylists",      stylists);
    await seedCollection("inventory",     inventory);
    await seedCollection("transactions",  transactions);
    await seedCollection("stockMovement", stockMovement);
    alert("✅ Firestore seeded successfully!");
  } catch (err) {
    console.error("Seed failed:", err);
    alert("❌ Seed failed — check the console.");
  }
};